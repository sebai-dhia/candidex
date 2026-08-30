import { CODE_TO_ENGLISH } from '../../../domain/country/country-normalize.js';

export type AppLocale = 'en' | 'fr' | 'ar' | 'zh';

/** Localized display names for known ISO codes (fallback: English). */
export const COUNTRY_DISPLAY_NAMES: Record<string, Partial<Record<AppLocale, string>>> = {
  TN: { en: 'Tunisia', fr: 'Tunisie', ar: 'تونس', zh: '突尼斯' },
  MA: { en: 'Morocco', fr: 'Maroc', ar: 'المغرب', zh: '摩洛哥' },
  DZ: { en: 'Algeria', fr: 'Algérie', ar: 'الجزائر', zh: '阿尔及利亚' },
  EG: { en: 'Egypt', fr: 'Égypte', ar: 'مصر', zh: '埃及' },
  FR: { en: 'France', fr: 'France', ar: 'فرنسا', zh: '法国' },
  DE: { en: 'Germany', fr: 'Allemagne', ar: 'ألمانيا', zh: '德国' },
  GB: { en: 'United Kingdom', fr: 'Royaume-Uni', ar: 'المملكة المتحدة', zh: '英国' },
  AE: { en: 'UAE', fr: 'Émirats arabes unis', ar: 'الإمارات', zh: '阿联酋' },
  SA: { en: 'Saudi Arabia', fr: 'Arabie saoudite', ar: 'السعودية', zh: '沙特阿拉伯' },
  QA: { en: 'Qatar', fr: 'Qatar', ar: 'قطر', zh: '卡塔尔' },
  CA: { en: 'Canada', fr: 'Canada', ar: 'كندا', zh: '加拿大' },
  US: { en: 'United States', fr: 'États-Unis', ar: 'الولايات المتحدة', zh: '美国' },
  PL: { en: 'Poland', fr: 'Pologne', ar: 'بولندا', zh: '波兰' },
  SG: { en: 'Singapore', fr: 'Singapour', ar: 'سنغافورة', zh: '新加坡' },
  UA: { en: 'Ukraine', fr: 'Ukraine', ar: 'أوكرانيا', zh: '乌克兰' },
  CN: { en: 'China', fr: 'Chine', ar: 'الصين', zh: '中国' },
  UZ: { en: 'Uzbekistan', fr: 'Ouzbékistan', ar: 'أوزبكستان', zh: '乌兹别克斯坦' },
  ES: { en: 'Spain', fr: 'Espagne', ar: 'إسبانيا', zh: '西班牙' },
  IT: { en: 'Italy', fr: 'Italie', ar: 'إيطاليا', zh: '意大利' },
  BE: { en: 'Belgium', fr: 'Belgique', ar: 'بلجيكا', zh: '比利时' },
  CH: { en: 'Switzerland', fr: 'Suisse', ar: 'سويسرا', zh: '瑞士' },
  NL: { en: 'Netherlands', fr: 'Pays-Bas', ar: 'هولندا', zh: '荷兰' },
  TR: { en: 'Turkey', fr: 'Turquie', ar: 'تركيا', zh: '土耳其' },
  AU: { en: 'Australia', fr: 'Australie', ar: 'أستراليا', zh: '澳大利亚' },
};

export function localizedCountryName(code: string | null | undefined, locale: AppLocale): string {
  if (!code) return '';
  const upper = code.toUpperCase();
  const entry = COUNTRY_DISPLAY_NAMES[upper];
  if (entry?.[locale]) return entry[locale]!;
  if (entry?.en) return entry.en;
  return CODE_TO_ENGLISH[upper] || upper;
}