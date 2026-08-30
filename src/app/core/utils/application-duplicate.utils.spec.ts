import { describe, expect, it } from 'vitest';

import { ApplicationRow } from '../../../domain/application/application-row.model';
import { findDuplicateApplication, normalizeJobLink, textIdentityKey } from '../../../domain/application/application-duplicate.utils';

function row(partial: Partial<ApplicationRow> & Pick<ApplicationRow, 'id'>): ApplicationRow {
  return {
    role: '',
    company: '',
    platform: '',
    job_link: '',
    company_link: '',
    date_applied: '2026-01-01',
    status: 'Applied',
    interview_date: '',
    notes: '',
    country: '',
    work_type: '',
    ...partial
  };
}

describe('application-duplicate.utils', () => {
  describe('textIdentityKey', () => {
    it('trims, collapses spaces, and lowercases', () => {
      expect(textIdentityKey('  Senior  Engineer ')).toBe('senior engineer');
      expect(textIdentityKey(null)).toBe('');
    });
  });

  describe('normalizeJobLink', () => {
    it('returns empty for blank input', () => {
      expect(normalizeJobLink('')).toBe('');
      expect(normalizeJobLink('   ')).toBe('');
      expect(normalizeJobLink(null)).toBe('');
    });

    it('strips www, hash, trailing slash, and tracking params', () => {
      expect(
        normalizeJobLink('https://www.linkedin.com/jobs/view/123/?utm_source=share&utm_medium=ios&fbclid=abc#section')
      ).toBe('linkedin.com/jobs/view/123');
    });

    it('keeps meaningful query params in stable order', () => {
      expect(normalizeJobLink('https://example.com/job?b=2&a=1')).toBe('example.com/job?a=1&b=2');
      expect(normalizeJobLink('https://example.com/job?a=1&b=2')).toBe('example.com/job?a=1&b=2');
    });

    it('treats equivalent URLs as equal', () => {
      const a = normalizeJobLink('https://WWW.Indeed.com/viewjob?jk=abc&utm_campaign=x');
      const b = normalizeJobLink('https://indeed.com/viewjob/?jk=abc');
      expect(a).toBe(b);
    });
  });

  describe('findDuplicateApplication', () => {
    const existing = [
      row({
        id: '1',
        role: 'Frontend Engineer',
        company: 'Acme',
        platform: 'LinkedIn',
        job_link: 'https://www.linkedin.com/jobs/view/999/?utm_source=feed'
      }),
      row({
        id: '2',
        role: 'Backend Engineer',
        company: 'Acme',
        platform: 'Indeed',
        job_link: ''
      }),
    ];

    it('matches by normalized job_link first', () => {
      const match = findDuplicateApplication(existing, {
        job_link: 'https://linkedin.com/jobs/view/999',
        company: 'Other',
        role: 'Other',
        platform: 'Other'
      });
      expect(match?.id).toBe('1');
    });

    it('does not fall back to company+role when job_link is present but unmatched', () => {
      const match = findDuplicateApplication(existing, {
        job_link: 'https://linkedin.com/jobs/view/other',
        company: 'Acme',
        role: 'Frontend Engineer',
        platform: 'LinkedIn'
      });
      expect(match).toBeNull();
    });

    it('falls back to company + role + platform when job_link is empty', () => {
      const match = findDuplicateApplication(existing, {
        job_link: '',
        company: 'acme',
        role: 'Backend  Engineer',
        platform: 'indeed'
      });
      expect(match?.id).toBe('2');
    });

    it('requires platform match on fallback', () => {
      const match = findDuplicateApplication(existing, {
        job_link: '',
        company: 'Acme',
        role: 'Backend Engineer',
        platform: 'LinkedIn'
      });
      expect(match).toBeNull();
    });

    it('returns null when company or role is missing on fallback', () => {
      expect(
        findDuplicateApplication(existing, {
          job_link: '',
          company: 'Acme',
          role: '',
          platform: 'Indeed'
        })
      ).toBeNull();
    });
  });
});