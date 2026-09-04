import { describe, expect, it } from 'vitest';
import { codeToFlagEmoji, formatCanonicalCountry, parseCountryLocation } from './country-normalize.js';

describe('parseCountryLocation', () => {
  it('maps Tunisie / Tunisia / TN to TN', () => {
    expect(parseCountryLocation('Tunisie').countryCode).toBe('TN');
    expect(parseCountryLocation('Tunisia').countryCode).toBe('TN');
    expect(parseCountryLocation('TN').countryCode).toBe('TN');
    expect(parseCountryLocation('تونس').countryCode).toBe('TN');
  });

  it('parses City, Country and rolls city separately', () => {
    const parsed = parseCountryLocation('Sousse, Tunisie');
    expect(parsed.countryCode).toBe('TN');
    expect(parsed.city).toBe('Sousse');
    expect(parsed.englishName).toBe('Tunisia');
  });

  it('parses City Country without comma', () => {
    const parsed = parseCountryLocation('Ariana Tunisie');
    expect(parsed.countryCode).toBe('TN');
    expect(parsed.city).toBe('Ariana');
  });

  it('title-cases poland', () => {
    const parsed = parseCountryLocation('poland');
    expect(parsed.countryCode).toBe('PL');
    expect(parsed.englishName).toBe('Poland');
  });

  it('returns empty for unknown city-only', () => {
    const parsed = parseCountryLocation('SomeUnknownPlace');
    expect(parsed.countryCode).toBeNull();
  });

  it('maps worldwide remote phrases to ANYWHERE, not a country', () => {
    expect(parseCountryLocation('Remote').countryCode).toBe('ANYWHERE');
    expect(parseCountryLocation('Work from anywhere').countryCode).toBe('ANYWHERE');
    expect(parseCountryLocation('Worldwide').countryCode).toBe('ANYWHERE');
    expect(parseCountryLocation('100% remote').countryCode).toBe('ANYWHERE');
    expect(parseCountryLocation('Télétravail').countryCode).toBe('ANYWHERE');
  });

  it('keeps a real country when remote is only a qualifier', () => {
    expect(parseCountryLocation('Remote, France').countryCode).toBe('FR');
    expect(parseCountryLocation('Paris, France').countryCode).toBe('FR');
  });
});

describe('formatCanonicalCountry', () => {
  it('formats city with English country', () => {
    expect(formatCanonicalCountry('Sousse, Tunisie')).toBe('Sousse, Tunisia');
  });

  it('formats country-only English', () => {
    expect(formatCanonicalCountry('tunisie')).toBe('Tunisia');
  });

  it('canonicalizes worldwide remote as Anywhere', () => {
    expect(formatCanonicalCountry('Remote')).toBe('Anywhere');
    expect(formatCanonicalCountry('worldwide')).toBe('Anywhere');
  });
});

describe('codeToFlagEmoji', () => {
  it('returns Tunisia flag for TN', () => {
    expect(codeToFlagEmoji('TN')).toBe('🇹🇳');
  });

  it('returns globe for worldwide remote', () => {
    expect(codeToFlagEmoji('ANYWHERE')).toBe('🌐');
  });
});