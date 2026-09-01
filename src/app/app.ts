import { Component, ChangeDetectionStrategy, HostListener, inject, signal, effect, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from './core/services/auth';
import { ApplicationRepository } from './core/repositories/application.repository';
import { ExtensionBridgeService } from './core/services/extension-bridge.service';
import { AiEngineAuthService } from './core/services/ai/ai-engine-auth.service';
import { AiProviderId } from './core/services/ai/ai-provider.types';
import { AiEngineWizardComponent } from './features/ai-engine/ai-engine-wizard.component';
import { PROVIDER_ICON_SVG } from './features/ai-engine/provider-icons';
import { LocaleService } from './core/services/i18n/locale.service';
import { AppLocale } from './core/i18n/country-display-names';
import { TooltipDirective } from './shared/tooltip/tooltip.directive';
import { SetupShellFacade } from './features/setup/setup-shell.facade';

type AiWizardSource = 'onboarding' | 'capture' | 'menu';
type AiWizardMode = 'onboarding' | 'manage';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AiEngineWizardComponent, TooltipDirective],
  providers: [SetupShellFacade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class App {
  auth = inject(Auth);
  aiEngine = inject(AiEngineAuthService);
  applications = inject(ApplicationRepository);
  bridge = inject(ExtensionBridgeService);
  locale = inject(LocaleService);
  private setup = inject(SetupShellFacade);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);
  private readonly providerIconCache = new Map<AiProviderId, SafeHtml>();

  readonly supportedLocales = this.setup.supportedLocales;

  isConnecting = signal(false);
  showAiWizard = signal(false);
  aiWizardMode = signal<AiWizardMode>('manage');
  aiWizardSource = signal<AiWizardSource>('capture');

  // Delegated setup / connections / language state (template-compatible)
  readonly setupStatus = this.setup.setupStatus;
  readonly setupHydrated = this.setup.setupHydrated;
  readonly connectionsOpen = this.setup.connectionsOpen;
  readonly languageMenuOpen = this.setup.languageMenuOpen;
  readonly showMainApp = this.setup.showMainApp;
  readonly setupStep = this.setup.setupStep;
  readonly showSetupProgress = this.setup.showSetupProgress;
  readonly isGoogleReconnect = this.setup.isGoogleReconnect;

  constructor() {
    effect(() => {
      const googleReady = !this.auth.isInitializing();
      const aiReady = !this.aiEngine.isInitializing();
      if (googleReady && aiReady && !this.setupHydrated()) {
        void this.setup.hydrateSetupStatus();
      }
    });

    effect(() => {
      this.locale.locale();
      this.locale.ready();
      this.cdr.markForCheck();
    });
  }

  async completeSetup(): Promise<void> {
    await this.setup.completeSetup();
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(event: Event) {
    if (this.showAiWizard()) {
      event.preventDefault();
      event.stopPropagation();
      this.showAiWizard.set(false);
      return;
    }
    if (this.languageMenuOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.setup.languageMenuOpen.set(false);
      return;
    }
    if (this.connectionsOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.closeConnections();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.bridge.handleEscapeKey();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onSetupEnter(event: Event): void {
    if (this.showMainApp() || this.showAiWizard()) return;

    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'A') return;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

    const step = this.setupStep();
    if (step === 1) {
      if (this.isConnecting()) return;
      event.preventDefault();
      void this.connectGoogle();
      return;
    }

    if (step === 2) {
      event.preventDefault();
      this.openAiWizard('onboarding');
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.connectionsOpen()) {
      this.closeConnections();
    }
  }

  @HostListener('window:message', ['$event'])
  async onMessage(event: MessageEvent) {
    const handled = await this.bridge.handleParentMessage(event);
    if (handled) this.cdr.detectChanges();
  }

  async connectGoogle() {
    this.isConnecting.set(true);
    try {
      await this.auth.connect();
      // Advance to setup step 2 (AI); do not enter main app yet
      if (this.setupStatus() !== 'complete') {
        this.setup.markSetupPending();
      }
    } catch (error: unknown) {
      const errorMsg = typeof error === 'string' ? error : (error as Error)?.message || '';
      if (errorMsg.includes('did not approve access') || errorMsg.includes('cancel')) {
        console.warn('Google Sign-in was cancelled by the user.');
      } else {
        console.error('Connection failed:', error);
      }
    } finally {
      this.isConnecting.set(false);
      this.cdr.detectChanges();
    }
  }

  skipAiSetup(): void {
    this.setup.skipAiSetup();
  }

  openAiWizard(source: AiWizardSource): void {
    this.aiWizardSource.set(source);
    this.aiWizardMode.set(source === 'onboarding' ? 'onboarding' : 'manage');
    this.showAiWizard.set(true);
    this.closeConnections();
  }

  startAiCapture(): void {
    if (!this.auth.isConnected() || this.setupStatus() !== 'complete') return;

    if (!this.aiEngine.isConnected()) {
      this.openAiWizard('capture');
      return;
    }

    this.bridge.startAiCapture();
  }

  async onAiEngineConnected(): Promise<void> {
    const source = this.aiWizardSource();
    this.showAiWizard.set(false);

    if (source === 'onboarding') {
      await this.completeSetup();
      this.cdr.detectChanges();
      return;
    }

    if (source === 'capture') {
      this.bridge.startAiCapture();
    }

    this.cdr.detectChanges();
  }

  onAiWizardClosed(): void {
    this.showAiWizard.set(false);
  }

  toggleConnections(event: Event): void {
    this.setup.toggleConnections(event);
  }

  closeConnections(): void {
    this.setup.closeConnections();
  }

  toggleLanguageMenu(event: Event): void {
    this.setup.toggleLanguageMenu(event);
  }

  async selectLocale(next: AppLocale, event: Event): Promise<void> {
    await this.setup.selectLocale(next, event);
  }

  providerIcon(id: AiProviderId | null | undefined): SafeHtml {
    if (!id) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    const cached = this.providerIconCache.get(id);
    if (cached) return cached;
    const safe = this.sanitizer.bypassSecurityTrustHtml(PROVIDER_ICON_SVG[id] ?? '');
    this.providerIconCache.set(id, safe);
    return safe;
  }

  stopMenuPropagation(event: Event): void {
    event.stopPropagation();
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.locale.t(key, params);
  }

  aiEngineStatusLabel(): string {
    if (!this.aiEngine.isConnected()) {
      return this.t('connections.notConfigured');
    }
    if (this.aiEngine.isDegraded()) {
      const message = this.aiEngine.lastFailureMessage()?.trim();
      return message
        ? this.t('connections.extractionFailed', { message })
        : this.t('connections.apiIssues');
    }
    return this.aiEngine.isSessionOnly()
      ? this.t('connections.keyStoredSession')
      : this.t('connections.keyStored');
  }

  isActiveProviderPaid(): boolean {
    return this.aiEngine.activeProvider?.badge === 'paid';
  }

  async disconnectAiEngine(): Promise<void> {
    await this.setup.confirmDisconnectAiEngine();
  }

  updateAiKey(): void {
    this.openAiWizard('menu');
  }

  setupAiFromMenu(): void {
    this.openAiWizard('menu');
  }

  toggleFullscreen() {
    this.bridge.toggleFullscreen();
    this.cdr.detectChanges();
  }

  closeOverlay() {
    this.bridge.closeOverlay();
  }

  async disconnectGoogle() {
    const message = this.aiEngine.isConnected()
      ? this.t('connections.disconnectGoogleOnlyBody')
      : this.t('connections.disconnectGoogleSimpleBody');
    if (!window.confirm(message)) return;

    this.closeConnections();
    await this.auth.disconnect();
    this.applications.clearSession();
    this.cdr.detectChanges();
  }
}