import { describe, expect, it } from 'vitest';

import {
  aggregatePlatformCounts,
  canonicalizePlatformLabel,
  insertPlatformBeforeCompanySite,
  pickTopFrequentPlatform,
  platformIdentityKey,
  preferPlatformLabel
} from './platform.utils';

describe('platform.utils', () => {
  describe('platformIdentityKey', () => {
    it('normalizes case and whitespace', () => {
      expect(platformIdentityKey('  TanitJobs ')).toBe('tanitjobs');
      expect(platformIdentityKey('Tanit  jobs')).toBe('tanit jobs');
      expect(platformIdentityKey('')).toBe('');
      expect(platformIdentityKey(null)).toBe('');
    });
  });

  describe('canonicalizePlatformLabel', () => {
    it('uses known brand casing', () => {
      expect(canonicalizePlatformLabel('linkedin')).toBe('LinkedIn');
      expect(canonicalizePlatformLabel('GLASSDOOR')).toBe('Glassdoor');
      expect(canonicalizePlatformLabel('company site')).toBe('Company Site');
    });

    it('title-cases uniform free text', () => {
      expect(canonicalizePlatformLabel('we work remotely')).toBe('We Work Remotely');
      expect(canonicalizePlatformLabel('TANITJOBS')).toBe('Tanitjobs');
    });

    it('preserves intentional mixed case', () => {
      expect(canonicalizePlatformLabel('TanitJobs')).toBe('TanitJobs');
    });
  });

  describe('preferPlatformLabel', () => {
    it('prefers known brands and richer casing', () => {
      expect(preferPlatformLabel('linkedin', 'LinkedIn')).toBe('LinkedIn');
      expect(preferPlatformLabel('Tanitjobs', 'TanitJobs')).toBe('TanitJobs');
    });
  });

  describe('aggregatePlatformCounts', () => {
    it('merges case variants into one chip', () => {
      expect(
        aggregatePlatformCounts([
          'LinkedIn',
          'Tanitjobs',
          'TanitJobs',
          'Tanitjobs',
          'we work remotely',
          'Tanitjobs',
          'Tanitjobs',
          'Tanitjobs'
        ]),
      ).toEqual([
        { name: 'TanitJobs', count: 6 },
        { name: 'LinkedIn', count: 1 },
        { name: 'We Work Remotely', count: 1 }
      ]);
    });

    it('skips empty platforms', () => {
      expect(aggregatePlatformCounts(['', '  ', null, undefined, 'Indeed'])).toEqual([
        { name: 'Indeed', count: 1 }
      ]);
    });
  });

  describe('pickTopFrequentPlatform', () => {
    it('returns the top non-built-in platform with enough applications', () => {
      expect(
        pickTopFrequentPlatform([
          { name: 'LinkedIn', count: 8 },
          { name: 'TanitJobs', count: 7 },
          { name: 'We Work Remotely', count: 1 }
        ])
      ).toBe('TanitJobs');
    });

    it('returns null when no non-built-in platform reaches the threshold', () => {
      expect(
        pickTopFrequentPlatform([
          { name: 'LinkedIn', count: 8 },
          { name: 'TanitJobs', count: 4 }
        ])
      ).toBeNull();
    });
  });

  describe('insertPlatformBeforeCompanySite', () => {
    it('inserts before Company Site and removes duplicates', () => {
      expect(
        insertPlatformBeforeCompanySite(
          ['LinkedIn', 'Indeed', 'Glassdoor', 'Company Site', 'TanitJobs', 'Other'],
          'TanitJobs'
        )
      ).toEqual(['LinkedIn', 'Indeed', 'Glassdoor', 'TanitJobs', 'Company Site', 'Other']);
    });
  });
});