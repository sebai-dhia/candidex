import { describe, expect, it } from 'vitest';

import { parseCountryLocation } from '../../../domain/country/country-normalize.js';
import { localizedCountryName } from '../../core/i18n/country-display-names';

describe('dashboard country ISO grouping', () => {
  it('merges Tunisia aliases into one ISO code', () => {
    const rows = ['Tunisia', 'Tunisie', 'Sousse, Tunisie', 'TN', 'Ariana, Tunisia'];
    const map = new Map<string, number>();

    for (const country of rows) {
      const parsed = parseCountryLocation(country);
      const code = parsed.countryCode || 'UNKNOWN';
      map.set(code, (map.get(code) || 0) + 1);
    }

    expect(map.get('TN')).toBe(5);
    expect(map.size).toBe(1);
    expect(localizedCountryName('TN', 'fr')).toBe('Tunisie');
    expect(localizedCountryName('TN', 'en')).toBe('Tunisia');
  });
});