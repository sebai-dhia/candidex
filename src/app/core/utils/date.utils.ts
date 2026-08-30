import { AppLocale } from '../i18n/country-display-names';

export function parseLocalDate(dateStr: string): Date {
  const value = dateStr?.trim() || '';
  if (!value) return new Date(NaN);

  const parts = value.split('-');
  if (parts.length >= 3) {
    const dayPart = parts[2].split(/[T\s]/)[0];
    return new Date(+parts[0], +parts[1] - 1, +dayPart);
  }

  return new Date(value);
}

const LOCALE_TAGS: Record<AppLocale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  ar: 'ar',
  zh: 'zh-CN'
};

export function toBcp47(locale: AppLocale | string = 'en'): string {
  return LOCALE_TAGS[locale as AppLocale] || 'en-US';
}

export function formatApplicationDate(dateStr: string, locale: AppLocale | string = 'en'): string {
  if (!dateStr) return '';

  const date = parseLocalDate(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  if (date.getFullYear() !== today.getFullYear()) {
    options.year = 'numeric';
  }

  return date.toLocaleDateString(toBcp47(locale), options);
}

export type RelativeDateKind =
  | { kind: 'tbd' }
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'daysAgo'; days: number }
  | { kind: 'inDays'; days: number };

export function getRelativeDateKind(dateStr: string): RelativeDateKind {
  if (!dateStr) return { kind: 'tbd' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = parseLocalDate(dateStr);
  if (Number.isNaN(target.getTime())) return { kind: 'tbd' };

  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return { kind: 'today' };
  if (diff === 1) return { kind: 'tomorrow' };
  if (diff < 0) return { kind: 'daysAgo', days: Math.abs(diff) };
  return { kind: 'inDays', days: diff };
}

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

const DEFAULT_RELATIVE_EN: TranslateFn = (key, params) => {
  switch (key) {
    case 'date.tbd':
      return 'Date TBD';
    case 'date.today':
      return 'Today!';
    case 'date.tomorrow':
      return 'Tomorrow';
    case 'date.daysAgo':
      return `${params?.['count'] ?? 0}d ago`;
    case 'date.inDays':
      return `In ${params?.['count'] ?? 0} days`;
    default:
      return key;
  }
};

export function getRelativeDateLabel(dateStr: string, t: TranslateFn = DEFAULT_RELATIVE_EN): string {
  const kind = getRelativeDateKind(dateStr);
  switch (kind.kind) {
    case 'tbd':
      return t('date.tbd');
    case 'today':
      return t('date.today');
    case 'tomorrow':
      return t('date.tomorrow');
    case 'daysAgo':
      return t('date.daysAgo', { count: kind.days });
    case 'inDays':
      return t('date.inDays', { count: kind.days });
  }
}