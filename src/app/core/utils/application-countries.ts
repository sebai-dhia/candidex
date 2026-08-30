import { CODE_TO_ENGLISH } from '../../../domain/country/country-normalize.js';
import { CUSTOM_OPTION } from '../constants/application-options.constants';
import { AppLocale, localizedCountryName } from '../i18n/country-display-names';

/** ISO codes used in the application form country dropdown. */
export const APPLICATION_COUNTRY_CODES = [
  'TN',
  'FR',
  'DE',
  'AE',
  'SA',
  'QA',
  'CA',
  'US',
  'MA',
  'GB',
  'AU'
] as const;

export function applicationCountryLabels(locale: AppLocale): string[] {
  const labels = APPLICATION_COUNTRY_CODES.map((code) => localizedCountryName(code, locale));
  return [...labels, CUSTOM_OPTION];
}

export function englishNameForCode(code: string): string {
  return CODE_TO_ENGLISH[code.toUpperCase()] || code;
}