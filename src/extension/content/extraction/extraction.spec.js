import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WORK_TYPE,
  enrichWorkTypeFromText,
  extractWorkTypeFromText,
  fillNullFieldsFromFallback,
  hasAllCoreFields,
  isExtractionSufficient,
  mergeExtractionResults,
  normalizeCountryLocation,
  normalizeExtractionResult,
  parseModelJson,
} from '../../shared/normalize-result.js';
import { extractWithJsonLd } from './json-ld.provider.js';
import { extractWithRegexPipeline } from './regex/index.js';

describe('normalizeExtractionResult', () => {
  it('normalizes fields and confidence', () => {
    const result = normalizeExtractionResult(
      { company: 'Acme', role: 'Engineer', country: 'France', workType: 'Remote' },
      { source: 'test' }
    );

    expect(result.company).toBe('Acme');
    expect(result.role).toBe('Engineer');
    expect(result.country).toBe('France');
    expect(result.workType).toBe('Remote');
    expect(result.confidence.company).toBeGreaterThan(0);
    expect(result.source).toBe('test');
  });

  it('combines separate city and country into one country label', () => {
    const result = normalizeExtractionResult({
      company: 'Bestlab',
      role: 'Data Engineer',
      city: 'Ariana',
      country: 'Tunisie'
    });

    expect(result.country).toBe('Ariana, Tunisia');
  });

  it('keeps city and country together when already combined', () => {
    const result = normalizeExtractionResult({
      company: 'Bestlab',
      role: 'Data Engineer',
      country: 'Ariana, Tunisie'
    });

    expect(result.country).toBe('Ariana, Tunisia');
  });

  it('returns only country when city is missing', () => {
    const result = normalizeExtractionResult({
      company: 'Bestlab',
      role: 'Data Engineer',
      country: 'France'
    });

    expect(result.country).toBe('France');
  });
});

describe('normalizeCountryLocation', () => {
  it('prefers a combined location string when present', () => {
    expect(normalizeCountryLocation({ location: 'Paris, France' })).toBe('Paris, France');
  });
});

describe('parseModelJson', () => {
  it('parses fenced json', () => {
    const parsed = parseModelJson('```json\n{"company":"Acme","role":"Dev"}\n```');
    expect(parsed.company).toBe('Acme');
  });
});

describe('fillNullFieldsFromFallback', () => {
  it('keeps primary values and fills nulls only', () => {
    const primary = normalizeExtractionResult({ company: 'Acme', role: 'Engineer' }, { confidenceBoost: 0.95 });
    const fallback = normalizeExtractionResult(
      { company: 'Other', role: 'Other', country: 'France', workType: 'Hybrid' },
      { confidenceBoost: 0.3, source: 'regex-en' },
    );

    const merged = fillNullFieldsFromFallback(primary, fallback);
    expect(merged.company).toBe('Acme');
    expect(merged.role).toBe('Engineer');
    expect(merged.country).toBe('France');
    expect(merged.workType).toBe('Hybrid');
  });
});

describe('mergeExtractionResults', () => {
  it('fills gaps from secondary', () => {
    const primary = normalizeExtractionResult({ company: 'Acme', role: null }, { confidenceBoost: 0.9 });
    const secondary = normalizeExtractionResult(
      { company: null, role: 'Engineer', country: 'Tunisia' },
      { confidenceBoost: 0.5 },
    );
    const merged = mergeExtractionResults(primary, secondary);
    expect(merged.company).toBe('Acme');
    expect(merged.role).toBe('Engineer');
    expect(merged.country).toBe('Tunisia');
  });
});

describe('hasAllCoreFields', () => {
  it('requires role, company, and country', () => {
    expect(hasAllCoreFields({ role: 'A', company: 'B', country: 'TN' })).toBe(true);
    expect(hasAllCoreFields({ role: 'A', company: 'B', country: null })).toBe(false);
    expect(isExtractionSufficient({ role: 'A', company: null, country: 'TN' })).toBe(false);
  });
});

describe('extractWithJsonLd', () => {
  it('reads JobPosting schema', () => {
    const result = extractWithJsonLd({
      pageMeta: {
        jsonLd: {
          '@type': 'JobPosting',
          title: 'Developer',
          hiringOrganization: { name: 'Soca' },
          jobLocation: { address: { addressCountry: 'TN' } },
          jobLocationType: 'TELECOMMUTE'
        },
      },
    });

    expect(result.role).toBe('Developer');
    expect(result.company).toBe('Soca');
    expect(result.country).toBe('Tunisia');
    expect(result.workType).toBe('Remote');
  });

  it('stores Anywhere for TELECOMMUTE jobs with no geographic location', () => {
    const result = extractWithJsonLd({
      pageMeta: {
        jsonLd: {
          '@type': 'JobPosting',
          title: 'Developer',
          hiringOrganization: { name: 'Soca' },
          jobLocationType: 'TELECOMMUTE'
        }
      }
    });

    expect(result.country).toBe('Anywhere');
    expect(result.workType).toBe('Remote');
  });

  it('combines city and country from JobPosting address', () => {
    const result = extractWithJsonLd({
      pageMeta: {
        jsonLd: {
          '@type': 'JobPosting',
          title: 'Developer',
          hiringOrganization: { name: 'Soca' },
          jobLocation: {
            address: {
              addressLocality: 'Ariana',
              addressCountry: 'Tunisie'
            }
          }
        }
      }
    });

    expect(result.country).toBe('Ariana, Tunisia');
  });
});

describe('extractWithRegexPipeline', () => {
  it('splits company and location', () => {
    const result = extractWithRegexPipeline({regionText: 'Développeur Odoo H/F\nSoca International - Nabeul, Tunisie'});
    expect(result.role).toBe('Développeur Odoo H/F');
    expect(result.company).toBe('Soca International');
    expect(result.country).toBe('Nabeul, Tunisie');
  });

  it('detects French Hybride work mode', () => {
    const result = extractWithRegexPipeline({regionText: 'Data Engineer\nBestlab - Ariana, Tunisie\nMode de travail\nHybride'});
    expect(result.workType).toBe('Hybrid');
    expect(result.confidence.workType).toBe(0.8);
  });
});

describe('extractWorkTypeFromText', () => {
  it('maps French Hybride to Hybrid', () => {
    expect(extractWorkTypeFromText('Mode de travail : Hybride')).toBe('Hybrid');
    expect(extractWorkTypeFromText('Mode de travail\nHybride')).toBe('Hybrid');
  });
});

describe('enrichWorkTypeFromText', () => {
  it('defaults to On-site when work type is missing', () => {
    const result = enrichWorkTypeFromText(
      {
        company: 'Acme',
        role: 'Engineer',
        country: 'France',
        workType: null,
        confidence: { company: 0.9, role: 0.9, country: 0.9, workType: 0 },
        source: 'groq'
      },
      'Engineer at Acme in Paris'
    );

    expect(result.workType).toBe(DEFAULT_WORK_TYPE);
    expect(result.confidence.workType).toBe(0.4);
  });

  it('keeps extracted work type from region text', () => {
    const result = enrichWorkTypeFromText(
      {
        company: 'Acme',
        role: 'Engineer',
        country: 'France',
        workType: null,
        confidence: { company: 0.9, role: 0.9, country: 0.9, workType: 0 },
        source: 'groq'
      },
      'Mode de travail : Hybride'
    );

    expect(result.workType).toBe('Hybrid');
    expect(result.confidence.workType).toBe(0.75);
  });
});