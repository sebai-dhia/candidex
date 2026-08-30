import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';

vi.mock('../../infrastructure/google-sheets/google-sheets.service', () => ({GoogleSheets: class {},}));

import { ApplicationRepository } from './application.repository';

describe('ApplicationRepository.loadApplications', () => {const sheets = {getRows: vi.fn()};

  let repository: ApplicationRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = Object.create(ApplicationRepository.prototype) as ApplicationRepository;
    Object.assign(repository, {
      sheets,
      fetchGeneration: 0,
      hydrated: signal(false),
      applications: signal([]),
      isRefreshing: signal(false),
    });
  });

  it('returns memory immediately and refreshes in the background when hydrated', async () => {
    sheets.getRows.mockResolvedValueOnce([['id1', 'Engineer', 'Acme']]);
    await repository.refreshApplications();

    sheets.getRows.mockClear();
    sheets.getRows.mockResolvedValueOnce([['id2', 'Designer', 'Beta']]);

    const result = await repository.loadApplications();

    expect(result.length).toBeGreaterThan(0);
    expect(sheets.getRows).toHaveBeenCalledTimes(1);
    expect(sheets.getRows).toHaveBeenCalledWith(true);

    await vi.waitFor(() => {
      expect(repository.applications().some((row) => row.id === 'id2')).toBe(true);
    });
  });

  it('hydrates from storage cache then revalidates in the background', async () => {
    sheets.getRows
      .mockResolvedValueOnce([['id1', 'Engineer', 'Acme']])
      .mockResolvedValueOnce([['id1', 'Engineer', 'Acme']]);

    const result = await repository.loadApplications();

    expect(result.length).toBe(1);
    expect(sheets.getRows).toHaveBeenNthCalledWith(1, false);
    expect(sheets.getRows).toHaveBeenNthCalledWith(2, true);
  });
});