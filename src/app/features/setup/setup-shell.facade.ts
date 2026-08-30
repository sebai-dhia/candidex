import { Injectable, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { Auth } from '../../core/services/auth';
import { AiEngineAuthService } from '../../core/services/ai/ai-engine-auth.service';
import { ChromeStorageService } from '../../infrastructure/chrome/chrome-storage.service';
import { LocaleService, SUPPORTED_LOCALES } from '../../core/services/i18n/locale.service';
import { AppLocale } from '../../core/i18n/country-display-names';

export type SetupStatus = 'pending' | 'complete';

const SETUP_STATUS_KEY = 'candidexSetupStatus';

/**
 * Setup/onboarding + connections/language menu state for the root shell.
 * Keeps App thin without changing template UX.
 */
@Injectable()
export class SetupShellFacade {
  private readonly auth = inject(Auth);
  private readonly aiEngine = inject(AiEngineAuthService);
  private readonly storage = inject(ChromeStorageService);
  private readonly locale = inject(LocaleService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly supportedLocales = SUPPORTED_LOCALES;

  readonly setupStatus = signal<SetupStatus>('pending');
  readonly setupHydrated = signal(false);
  readonly connectionsOpen = signal(false);
  readonly languageMenuOpen = signal(false);

  /** True when Google is connected and first-run setup is finished. */
  readonly showMainApp = computed(
    () => this.auth.isConnected() && this.setupStatus() === 'complete'
  );

  /** Setup shell: step 1 (Google) or step 2 (AI) while not complete. */
  readonly setupStep = computed(() => {
    if (!this.auth.isConnected()) return 1 as const;
    if (this.setupStatus() !== 'complete') return 2 as const;
    return null;
  });

  /** First-run funnel only — hide step UI when user is just reconnecting Google. */
  readonly showSetupProgress = computed(() => this.setupStatus() !== 'complete');

  readonly isGoogleReconnect = computed(
    () => this.setupStatus() === 'complete' && !this.auth.isConnected()
  );

  async hydrateSetupStatus(): Promise<void> {
    try {
      const stored = await this.storage.get<SetupStatus>(SETUP_STATUS_KEY);

      if (stored === 'complete') {
        this.setupStatus.set('complete');
      } else if (this.auth.isConnected() && this.aiEngine.isConnected()) {
        // Existing Google+AI users: don't trap them on step 2
        await this.completeSetup();
      } else if (this.auth.isConnected()) {
        // Google-only (or missing status): prompt AI step once
        this.setupStatus.set('pending');
      } else {
        this.setupStatus.set('pending');
      }
    } catch {
      this.setupStatus.set('pending');
    } finally {
      this.setupHydrated.set(true);
      this.cdr.detectChanges();
    }
  }

  async completeSetup(): Promise<void> {
    await this.storage.set({ [SETUP_STATUS_KEY]: 'complete' satisfies SetupStatus });
    this.setupStatus.set('complete');
  }

  markSetupPending(): void {
    this.setupStatus.set('pending');
  }

  skipAiSetup(): void {
    void this.completeSetup().then(() => this.cdr.detectChanges());
  }

  toggleConnections(event: Event): void {
    event.stopPropagation();
    const next = !this.connectionsOpen();
    this.connectionsOpen.set(next);
    if (!next) this.languageMenuOpen.set(false);
  }

  closeConnections(): void {
    this.connectionsOpen.set(false);
    this.languageMenuOpen.set(false);
  }

  toggleLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.languageMenuOpen.update((open) => !open);
  }

  async selectLocale(next: AppLocale, event: Event): Promise<void> {
    event.stopPropagation();
    this.languageMenuOpen.set(false);
    await this.locale.setLocale(next);
    this.cdr.detectChanges();
  }

  /**
   * Confirm and disconnect Personal AI Engine. Returns true if disconnected.
   */
  async confirmDisconnectAiEngine(): Promise<boolean> {
    const ok = window.confirm(this.locale.t('connections.disconnectAiBody'));
    if (!ok) return false;

    await this.aiEngine.disconnect();
    this.closeConnections();
    this.cdr.detectChanges();
    return true;
  }
}