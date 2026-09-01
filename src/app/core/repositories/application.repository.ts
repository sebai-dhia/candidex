import { Injectable, inject, signal } from '@angular/core';

import {
  AiCapturedApplicationInput,
  ApplicationRow,
  CreateApplicationInput,
  CreateApplicationOptions,
} from '../../../domain/application/application-row.model';
import { APPLICATION_STATUS } from '../constants/application-options.constants';
import {DuplicateApplicationError, findDuplicateApplication} from '../../../domain/application/application-duplicate.utils';
import {mapApplicationToSheetRow, mapSheetRowsToApplications} from '../../../domain/application/application-row.utils';
import { canonicalizePlatformLabel } from '../utils/platform.utils';
import { GoogleSheets } from '../../infrastructure/google-sheets/google-sheets.service';

@Injectable({providedIn: 'root'})
export class ApplicationRepository {
  private readonly sheets = inject(GoogleSheets);
  private fetchGeneration = 0;
  private readonly hydrated = signal(false);

  /** Shared in-memory list used by Dashboard / Track (avoids stale sheet reads). */
  readonly applications = signal<ApplicationRow[]>([]);

  /** True while a background Sheets refresh is in flight (stale-while-revalidate). */
  readonly isRefreshing = signal(false);

  async listApplications(forceRefresh = false): Promise<ApplicationRow[]> {
    if (!forceRefresh && this.hydrated()) {
      return this.applications();
    }
    return this.refreshApplications();
  }

  /**
   * Show cached data immediately when available, then refresh from Sheets in the background.
   */
  async loadApplications(): Promise<ApplicationRow[]> {
    if (this.hydrated() && this.applications().length > 0) {
      this.revalidateInBackground();
      return this.applications();
    }

    try {
      const rows = await this.sheets.getRows(false);
      this.publishRows(rows);
    } catch (error) {
      if (!this.hydrated()) {
        return this.refreshApplications();
      }
      console.error('[Applications] Failed to load cached rows:', error);
    }

    this.revalidateInBackground();
    return this.applications();
  }

  /** Force a network refresh and publish into the shared signal. */
  async refreshApplications(): Promise<ApplicationRow[]> {
    const generation = ++this.fetchGeneration;
    const rows = await this.sheets.getRows(true);
    if (generation !== this.fetchGeneration) {
      return this.applications();
    }

    this.publishRows(rows);
    return this.applications();
  }

  private readonly inFlightSaves = new Set<string>();

  async createApplication(input: CreateApplicationInput, options: CreateApplicationOptions = {}): Promise<void> {
    const application: ApplicationRow = {
      id: input.id || this.createApplicationId(),
      role: input.role || '',
      company: input.company || '',
      platform: canonicalizePlatformLabel(input.platform),
      job_link: input.job_link || '',
      company_link: input.company_link || '',
      date_applied: input.date_applied || this.getDateInputValue(),
      status: input.status || APPLICATION_STATUS.APPLIED,
      interview_date: input.interview_date || '',
      notes: input.notes || '',
      country: input.country || '',
      work_type: input.work_type || ''
    };

    const inFlightKey = `${application.role.toLowerCase().trim()}|${application.company.toLowerCase().trim()}`;
    if (!options.allowDuplicate && this.inFlightSaves.has(inFlightKey)) {
      console.warn('[Applications] Duplicate creation already in-flight:', inFlightKey);
      return;
    }

    if (!options.allowDuplicate) {
      this.inFlightSaves.add(inFlightKey);
    }

    try {
      if (!options.allowDuplicate) {
        const existing = await this.listApplications();
        const duplicate = findDuplicateApplication(existing, application);
        if (duplicate) {
          throw new DuplicateApplicationError(duplicate);
        }
      }

      await this.sheets.appendRow(mapApplicationToSheetRow(application));
      this.applications.update((list) =>
        list.some((row) => row.id === application.id) ? list : [application, ...list]
      );
      this.hydrated.set(true);

      // Background reconcile with Sheets (ignore stale overlapping responses via generation).
      void this.refreshApplications();
    } finally {
      this.inFlightSaves.delete(inFlightKey);
    }
  }

  async createFromAiCapture(input: AiCapturedApplicationInput): Promise<void> {
    await this.createApplication(
      {
        role: input.role || '',
        company: input.company || '',
        platform: input.platform || '',
        job_link: input.jobLink || '',
        company_link: '',
        date_applied: this.getDateInputValue(),
        status: APPLICATION_STATUS.APPLIED,
        notes: input.notes || '',
        country: input.country || '',
        work_type: input.workType || '',
      },
      { allowDuplicate: !!input.allowDuplicate }
    );
  }

  async updateApplication(id: string, updates: Partial<ApplicationRow>): Promise<unknown> {
    const result = await this.sheets.updateApplication(id, updates);
    this.applications.update((list) =>
      list.map((row) => (row.id === id ? { ...row, ...updates } : row)),
    );
    return result;
  }

  async deleteApplication(id: string): Promise<unknown> {
    const result = await this.sheets.deleteApplication(id);
    this.applications.update((list) => list.filter((row) => row.id !== id));
    return result;
  }

  clearSession(): void {
    this.sheets.clearSession();
    this.applications.set([]);
    this.hydrated.set(false);
    this.fetchGeneration += 1;
  }

  private publishRows(rows: string[][]): void {
    const fetched = mapSheetRowsToApplications(rows);
    this.applications.update((current) => this.mergeFetchedApps(fetched, current));
    this.hydrated.set(true);
  }

  private revalidateInBackground(): void {
    this.isRefreshing.set(true);
    void this.refreshApplications()
      .catch((error: unknown) => {
        console.error('[Applications] Background refresh failed:', error);
      })
      .finally(() => {
        this.isRefreshing.set(false);
      });
  }

  /**
   * Keep optimistic rows that a stale Sheets read has not returned yet.
   */
  private mergeFetchedApps(fetched: ApplicationRow[], current: ApplicationRow[]): ApplicationRow[] {
    const fetchedIds = new Set(fetched.map((row) => row.id));
    const pending = current.filter((row) => !fetchedIds.has(row.id));
    return pending.length > 0 ? [...pending, ...fetched] : fetched;
  }

  private createApplicationId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  }

  private getDateInputValue(): string {
    return new Date().toISOString().split('T')[0];
  }
}