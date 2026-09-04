export type ParsedCountryLocation = {
  countryCode: string | null;
  city: string | null;
  englishName: string | null;
};

export type LocationGroup = 'country' | 'anywhere' | 'unknown';

export const CODE_TO_ENGLISH: Record<string, string>;
export const ANYWHERE_CODE: 'ANYWHERE';
export const UNKNOWN_CODE: 'UNKNOWN';

export function titleCaseWords(text: string): string;
export function isAnywhereLocation(raw: string | null | undefined): boolean;
export function classifyLocationGroup(
  country: string | null | undefined,
  workType?: string | null
): { code: string; group: LocationGroup } | null;
export function parseCountryLocation(raw: string | null | undefined): ParsedCountryLocation;
export function formatCanonicalCountry(raw: string | null | undefined): string | null;
export function codeToFlagEmoji(code: string): string;