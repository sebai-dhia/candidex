import { Injectable, inject, signal, computed, effect } from '@angular/core';

import { ChromeStorageService } from '../../../infrastructure/chrome/chrome-storage.service';
import { MESSAGES_EN, MessageCatalog } from '../../i18n/messages.en';
import { MESSAGES_FR } from '../../i18n/messages.fr';
import { MESSAGES_AR } from '../../i18n/messages.ar';
import { MESSAGES_ZH } from '../../i18n/messages.zh';
import { AppLocale } from '../../i18n/country-display-names';

const STORAGE_KEY = 'candidexLocale';

const CATALOGS: Record<AppLocale, MessageCatalog> = {
  en: MESSAGES_EN,
  fr: MESSAGES_FR,
  ar: MESSAGES_AR,
  zh: MESSAGES_ZH
};

export const SUPPORTED_LOCALES: { id: AppLocale; labelKey: string }[] = [
  { id: 'en', labelKey: 'lang.en' },
  { id: 'fr', labelKey: 'lang.fr' },
  { id: 'ar', labelKey: 'lang.ar' },
  { id: 'zh', labelKey: 'lang.zh' }
];

/** Native language names for the locale picker (not translated). */
export const LOCALE_NATIVE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
  zh: '中文'
};

function detectDefaultLocale(): AppLocale {
  const lang = (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
  const lower = lang.toLowerCase();
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('ar')) return 'ar';
  if (lower.startsWith('zh')) return 'zh';
  return 'en';
}

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly storage = inject(ChromeStorageService);

  readonly locale = signal<AppLocale>(detectDefaultLocale());
  readonly isRtl = computed(() => this.locale() === 'ar');
  readonly ready = signal(false);
  readonly displayLabel = computed(() => LOCALE_NATIVE_LABELS[this.locale()]);

  constructor() {
    void this.hydrate();

    effect(() => {
      const rtl = this.isRtl();
      if (typeof document === 'undefined') return;
      document.documentElement.lang = this.locale();
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    });
  }

  async hydrate(): Promise<void> {
    try {
      const stored = await this.storage.get<AppLocale>(STORAGE_KEY);
      if (stored && CATALOGS[stored]) {
        this.locale.set(stored);
      }
    } catch {
      // keep browser default
    } finally {
      this.ready.set(true);
    }
  }

  nativeLabel(id: AppLocale): string {
    return LOCALE_NATIVE_LABELS[id];
  }

  async setLocale(next: AppLocale): Promise<void> {
    if (!CATALOGS[next]) return;
    this.locale.set(next);
    await this.storage.set({ [STORAGE_KEY]: next });
  }

  t(key: string, params?: Record<string, string | number>): string {
    const catalog = CATALOGS[this.locale()] || MESSAGES_EN;
    let text = catalog[key] ?? MESSAGES_EN[key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
      }
    }
    return text;
  }
}