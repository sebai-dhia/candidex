import {
  Component,
  ChangeDetectionStrategy,
  output,
  input,
  inject,
  signal,
  effect,
  ChangeDetectorRef,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { AiEngineAuthService } from '../../core/services/ai/ai-engine-auth.service';
import { AI_PROVIDER_CATALOG, badgeLabel } from '../../core/services/ai/ai-provider.catalog';
import { AiProviderId } from '../../core/services/ai/ai-provider.types';
import { LocaleService } from '../../core/services/i18n/locale.service';
import { PROVIDER_ICON_SVG } from './provider-icons';
import { sessionOnlyDefaultForProvider } from './ai-wizard-defaults';

export type AiEngineWizardMode = 'onboarding' | 'manage';
type WizardPhase = 'form' | 'validating' | 'success' | 'exiting';

const ERROR_DISMISS_MS = 5000;

@Component({
  selector: 'app-ai-engine-wizard',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-engine-wizard.component.html',
  styleUrl: './ai-engine-wizard.component.scss',
})
export class AiEngineWizardComponent {
  readonly mode = input<AiEngineWizardMode>('manage');
  readonly closed = output<void>();
  readonly connected = output<void>();

  private readonly aiAuth = inject(AiEngineAuthService);
  private readonly locale = inject(LocaleService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly catalog = AI_PROVIDER_CATALOG;
  readonly badgeLabel = badgeLabel;

  step = signal<1 | 2>(1);
  selectedProviderId = signal<AiProviderId | null>(null);
  apiKey = signal('');
  sessionOnlyKey = signal(false);
  phase = signal<WizardPhase>('form');
  error = signal('');

  private readonly iconCache = new Map<AiProviderId, SafeHtml>();
  private errorDismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const mode = this.mode();
      const activeId = this.aiAuth.activeProviderId();
      if (mode === 'manage' && activeId) {
        this.selectedProviderId.set(activeId);
      }
    });

    this.destroyRef.onDestroy(() => this.clearErrorDismissTimer());
  }

  get selectedProvider() {
    const id = this.selectedProviderId();
    return this.catalog.find((entry) => entry.id === id) ?? null;
  }

  get headerSubtitle(): string {
    if (this.step() === 2) {
      return `Configure your ${this.selectedProvider?.displayName ?? 'provider'} connection`;
    }
    if (this.mode() === 'manage' && this.aiAuth.isConnected()) {
      return 'Update your API key or switch provider.';
    }
    return 'Link your own API key to bypass shared limits.';
  }

  get isBusy(): boolean {
    const p = this.phase();
    return p === 'validating' || p === 'success' || p === 'exiting';
  }

  get isProviderDegraded(): boolean {
    return this.aiAuth.isDegraded();
  }

  get isSelectedProviderPaid(): boolean {
    return this.selectedProvider?.badge === 'paid';
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.locale.t(key, params);
  }

  providerIcon(id: AiProviderId): SafeHtml {
    const cached = this.iconCache.get(id);
    if (cached) return cached;

    const html = PROVIDER_ICON_SVG[id];
    const safe = this.sanitizer.bypassSecurityTrustHtml(html);
    this.iconCache.set(id, safe);
    return safe;
  }

  selectProvider(id: AiProviderId): void {
    if (this.isBusy) return;
    this.selectedProviderId.set(id);
    this.sessionOnlyKey.set(sessionOnlyDefaultForProvider(id));
    this.clearError();
  }

  goNext(): void {
    if (this.isBusy) return;
    if (!this.selectedProviderId()) {
      this.showError('Select a provider to continue.');
      return;
    }
    this.clearError();
    this.step.set(2);
  }

  goBack(): void {
    if (this.isBusy) return;
    this.clearError();
    this.apiKey.set('');
    this.phase.set('form');
    this.step.set(1);
  }

  goToStep(target: 1 | 2): void {
    if (this.isBusy || this.step() === target) return;

    if (target === 1) {
      this.goBack();
      return;
    }

    if (!this.selectedProviderId()) {
      this.showError('Select a provider to continue.');
      return;
    }

    this.clearError();
    this.step.set(2);
  }

  close(): void {
    if (this.isBusy) return;
    this.closed.emit();
  }

  openConsole(): void {
    if (this.isBusy) return;
    const url = this.selectedProvider?.consoleUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  async secureConnection(): Promise<void> {
    if (this.isBusy) return;

    const providerId = this.selectedProviderId();
    const key = this.apiKey().trim();
    if (!providerId) {
      this.showError('Select a provider first.');
      return;
    }
    if (!key) {
      this.showError('Paste your API key to continue.');
      return;
    }

    this.phase.set('validating');
    this.clearError();
    this.cdr.detectChanges();

    try {
      await this.aiAuth.connect(
        providerId,
        key,
        this.sessionOnlyKey() ? 'session' : 'local',
      );
      this.phase.set('success');
      this.cdr.detectChanges();

      const reducedMotion =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const holdMs = reducedMotion ? 300 : 800;
      const exitMs = reducedMotion ? 0 : 220;

      await this.delay(holdMs);

      if (exitMs > 0) {
        this.phase.set('exiting');
        this.cdr.detectChanges();
        await this.delay(exitMs);
      }

      this.connected.emit();
    } catch (err: unknown) {
      this.phase.set('form');
      this.showError(err instanceof Error ? err.message : 'Failed to validate API key');
      this.cdr.detectChanges();
    }
  }

  private showError(message: string): void {
    this.clearErrorDismissTimer();
    this.error.set(message);
    if (!message) return;

    this.errorDismissTimer = setTimeout(() => {
      this.errorDismissTimer = null;
      this.error.set('');
      this.cdr.detectChanges();
    }, ERROR_DISMISS_MS);
  }

  private clearError(): void {
    this.clearErrorDismissTimer();
    this.error.set('');
  }

  private clearErrorDismissTimer(): void {
    if (this.errorDismissTimer != null) {
      clearTimeout(this.errorDismissTimer);
      this.errorDismissTimer = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
