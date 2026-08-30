import { describe, expect, it } from 'vitest';
import { filterApplicationsBySearch, filterApplicationsByStatus, queryTrackingApplications, sortApplicationsByRecency } from './tracking-query';
import { ApplicationRow } from '../../../domain/application/application-row.model';

function row(partial: Partial<ApplicationRow> & Pick<ApplicationRow, 'id'>): ApplicationRow {
  return {
    company: '',
    role: '',
    status: 'Applied',
    date_applied: '2024-01-01',
    interview_date: '',
    country: '',
    work_type: '',
    platform: '',
    job_link: '',
    company_link: '',
    notes: '',
    ...partial
  };
}

describe('tracking-query', () => {
  const apps = [
    row({ id: '1', company: 'Acme', role: 'Engineer', status: 'Applied', date_applied: '2024-03-01' }),
    row({ id: '2', company: 'Beta', role: 'Designer', status: 'Interview', date_applied: '2024-02-01' }),
    row({ id: '3', company: 'Acme Labs', role: 'PM', status: 'Applied', date_applied: '2024-04-01' })
  ];

  it('filters by status', () => {
    expect(filterApplicationsByStatus(apps, 'All')).toHaveLength(3);
    expect(filterApplicationsByStatus(apps, 'Interview').map((a) => a.id)).toEqual(['2']);
  });

  it('filters by search across company and role', () => {
    expect(filterApplicationsBySearch(apps, 'acme').map((a) => a.id)).toEqual(['1', '3']);
    expect(filterApplicationsBySearch(apps, 'design').map((a) => a.id)).toEqual(['2']);
    expect(filterApplicationsBySearch(apps, '  ')).toHaveLength(3);
  });

  it('sorts by recency', () => {
    expect(sortApplicationsByRecency(apps, 'desc').map((a) => a.id)).toEqual(['3', '1', '2']);
    expect(sortApplicationsByRecency(apps, 'asc').map((a) => a.id)).toEqual(['2', '1', '3']);
  });

  it('applies filter, search, and sort together', () => {
    const result = queryTrackingApplications(apps, {
      searchQuery: 'acme',
      activeFilter: 'Applied',
      sortOrder: 'desc'
    });
    expect(result.map((a) => a.id)).toEqual(['3', '1']);
  });
});