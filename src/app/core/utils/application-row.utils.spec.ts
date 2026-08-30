import { describe, expect, it } from 'vitest';

import {
  compareApplicationsByRecency,
  mapApplicationToSheetRow,
  mapSheetRowToApplication,
  mapSheetRowsToApplications,
  mergeApplicationRow
} from '../../../domain/application/application-row.utils';

describe('application-row.utils', () => {
  const sampleRow = [
    'abc123',
    'Engineer',
    'Acme',
    'LinkedIn',
    'https://jobs.example/1',
    'https://acme.example',
    '2026-07-06',
    'Applied',
    '',
    'Notes',
    'France',
    'Remote'
  ];

  it('maps sheet rows to applications', () => {
    expect(mapSheetRowToApplication(sampleRow)).toEqual({
      id: 'abc123',
      role: 'Engineer',
      company: 'Acme',
      platform: 'LinkedIn',
      job_link: 'https://jobs.example/1',
      company_link: 'https://acme.example',
      date_applied: '2026-07-06',
      status: 'Applied',
      interview_date: '',
      notes: 'Notes',
      country: 'France',
      work_type: 'Remote'
    });
  });

  it('filters rows without an id', () => {
    expect(mapSheetRowsToApplications([sampleRow, ['', 'Role', 'Co']])).toHaveLength(1);
  });

  it('round-trips through sheet row mapping', () => {
    const application = mapSheetRowToApplication(sampleRow);
    expect(mapApplicationToSheetRow(application)).toEqual(sampleRow);
  });

  it('merges partial updates onto an existing row', () => {
    const merged = mergeApplicationRow(sampleRow, { status: 'Interview', interview_date: '2026-07-10' });

    expect(merged[7]).toBe('Interview');
    expect(merged[8]).toBe('2026-07-10');
    expect(merged[1]).toBe('Engineer');
  });

  it('orders same-day applications by id so newer saves rank first', () => {
    const older = mapSheetRowToApplication([
      'm1older',
      'Old Role',
      'Acme',
      'LinkedIn',
      '',
      '',
      '2026-08-27',
      'Applied',
      '',
      '',
      '',
      ''
    ]);
    const newer = mapSheetRowToApplication([
      'm2newer',
      'New Role',
      'Acme',
      'LinkedIn',
      '',
      '',
      '2026-08-27',
      'Applied',
      '',
      '',
      '',
      ''
    ]);

    expect(compareApplicationsByRecency(newer, older, 'desc')).toBeLessThan(0);
    expect([older, newer].sort((a, b) => compareApplicationsByRecency(a, b, 'desc')).map((a) => a.role)).toEqual([
      'New Role',
      'Old Role'
    ]);
  });
});
