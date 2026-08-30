export type ParsedCountryLocation = {
  countryCode: string | null;
  city: string | null;
  englishName: string | null;
};

export const CODE_TO_ENGLISH: Record<string, string>;

export function titleCaseWords(text: string): string;
export function parseCountryLocation(raw: string | null | undefined): ParsedCountryLocation;
export function formatCanonicalCountry(raw: string | null | undefined): string | null;
export function codeToFlagEmoji(code: string): string;