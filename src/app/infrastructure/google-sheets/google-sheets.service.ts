import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '../../core/services/auth';
import { firstValueFrom } from 'rxjs';
import { ApplicationRow } from '../../../domain/application/application-row.model';
import { APPLICATION_SHEET_HEADERS, mergeApplicationRow } from '../../../domain/application/application-row.utils';
import { ChromeStorageService } from '../chrome/chrome-storage.service';

export type { ApplicationRow } from '../../../domain/application/application-row.model';

const APPLICATIONS_SHEET_TITLE = 'Applications';
const SPREADSHEET_ID_KEY = 'candidexSpreadsheetId';
const SHEET_NUMERIC_ID_KEY = 'candidexSheetNumericId';
const ROWS_CACHE_KEY = 'candidex_rows_cache';

interface RowsCache {
  data: string[][];
  timestamp: number;
}

/** Thrown when a row moves between locate and write (avoids silent corruption). */
export class StaleRowError extends Error {
  readonly applicationId: string;

  constructor(applicationId: string) {
    super(`Application row moved or changed while updating: ${applicationId}`);
    this.name = 'StaleRowError';
    this.applicationId = applicationId;
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleSheets {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private storage = inject(ChromeStorageService);

  private spreadsheetId: string | null = null;
  private sheetNumericId: number | null = null;
  /** Serializes append/update/delete so they never interleave. */
  private mutationQueue: Promise<unknown> = Promise.resolve();

  async getSpreadsheetId(): Promise<string> {
    if (this.spreadsheetId) return this.spreadsheetId;

    const stored = await this.storage.get<string>(SPREADSHEET_ID_KEY);
    if (stored) {
      this.spreadsheetId = stored;
      return stored;
    }

    try {
      const token = await this.auth.getToken();
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

      const found = await this.findExistingSpreadsheet(headers);
      if (found) {
        this.spreadsheetId = found;
        await this.storage.set({ [SPREADSHEET_ID_KEY]: found });
        return found;
      }

      const createRes: {
        spreadsheetId?: string;
        sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
      } = await firstValueFrom(
        this.http.post('https://sheets.googleapis.com/v4/spreadsheets', {
          properties: { title: 'Candidex - Job Applications' },
          sheets: [{ properties: { title: APPLICATIONS_SHEET_TITLE } }],
        }, { headers }),
      );

      this.spreadsheetId = createRes.spreadsheetId ?? null;
      if (!this.spreadsheetId) {
        throw new Error('Spreadsheet create response missing spreadsheetId');
      }

      const createdSheetId = createRes.sheets?.[0]?.properties?.sheetId;
      if (typeof createdSheetId === 'number') {
        this.sheetNumericId = createdSheetId;
        await this.storage.set({
          [SPREADSHEET_ID_KEY]: this.spreadsheetId,
          [SHEET_NUMERIC_ID_KEY]: createdSheetId,
        });
      } else {
        await this.storage.set({ [SPREADSHEET_ID_KEY]: this.spreadsheetId });
      }

      // Header write bypasses the public mutex (we are still inside getSpreadsheetId).
      await this.appendRowUnlocked([...APPLICATION_SHEET_HEADERS]);
      return this.spreadsheetId;
    } catch (error: unknown) {
      console.error('[Sheets] Failed to get spreadsheet:', error);
      throw new Error(`Failed to get spreadsheet: ${this.errorMessage(error)}`);
    }
  }

  /**
   * Numeric gid for the Applications tab (needed by deleteDimension).
   * Cached in memory and Chrome storage alongside the spreadsheet id.
   */
  async getSheetNumericId(): Promise<number> {
    if (typeof this.sheetNumericId === 'number') return this.sheetNumericId;

    const stored = await this.storage.get<number>(SHEET_NUMERIC_ID_KEY);
    if (typeof stored === 'number') {
      this.sheetNumericId = stored;
      return stored;
    }

    const spreadsheetId = await this.getSpreadsheetId();
    const token = await this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const meta: {
      sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
    } = await firstValueFrom(
      this.http.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
        { headers },
      ),
    );

    const sheet =
      meta.sheets?.find((s) => s.properties?.title === APPLICATIONS_SHEET_TITLE) ??
      meta.sheets?.[0];
    const gid = sheet?.properties?.sheetId;
    if (typeof gid !== 'number') {
      throw new Error('Applications sheet id not found');
    }

    this.sheetNumericId = gid;
    await this.storage.set({ [SHEET_NUMERIC_ID_KEY]: gid });
    return gid;
  }

  /**
   * Search Google Drive for existing "Candidex - Job Applications" spreadsheets.
   * If multiple are found, pick the one with the most data rows.
   */
  private async findExistingSpreadsheet(headers: HttpHeaders): Promise<string | null> {
    try {
      const query = encodeURIComponent(
        "name='Candidex - Job Applications' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      );
      const driveRes: { files?: Array<{ id: string }> } = await firstValueFrom(
        this.http.get(
          `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
          { headers },
        ),
      );

      const files = driveRes.files || [];
      if (files.length === 0) return null;
      if (files.length === 1) return files[0].id;

      let bestId = files[0].id;
      let bestCount = 0;

      for (const file of files) {
        try {
          const res: { values?: string[][] } = await firstValueFrom(
            this.http.get(
              `https://sheets.googleapis.com/v4/spreadsheets/${file.id}/values/${APPLICATIONS_SHEET_TITLE}!A:A`,
              { headers },
            ),
          );
          const rowCount = res.values ? res.values.length - 1 : 0;
          if (rowCount > bestCount) {
            bestCount = rowCount;
            bestId = file.id;
          }
        } catch {
          console.warn(`[Sheets] Could not read spreadsheet ${file.id}, skipping`);
        }
      }

      return bestId;
    } catch (error) {
      console.warn('[Sheets] Drive search failed, will create new spreadsheet:', error);
      return null;
    }
  }

  async appendRow(values: string[]): Promise<unknown> {
    return this.withMutation(() => this.appendRowUnlocked(values));
  }

  private async appendRowUnlocked(values: string[]): Promise<unknown> {
    const id = await this.getSpreadsheetId();
    const token = await this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    try {
      const result = await firstValueFrom(
        this.http.post(
          `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${APPLICATIONS_SHEET_TITLE}!A:A:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
          { values: [values] },
          { headers },
        ),
      );
      await this.clearCache();
      return result;
    } catch (error: unknown) {
      console.error('Failed to append row:', error);
      throw new Error(`Failed to append row: ${this.errorMessage(error)}`);
    }
  }

  async updateApplication(id: string, updates: Partial<ApplicationRow>): Promise<unknown> {
    return this.withMutation(async () => {
      const spreadsheetId = await this.getSpreadsheetId();
      const token = await this.auth.getToken();
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

      try {
        const { rowIndex, row } = await this.locateAndConfirmRow(
          spreadsheetId,
          id,
          headers,
          `${APPLICATIONS_SHEET_TITLE}!A:L`,
        );
        const updatedRow = mergeApplicationRow(row, updates);
        const range = `${APPLICATIONS_SHEET_TITLE}!A${rowIndex + 1}:L${rowIndex + 1}`;

        const result = await firstValueFrom(
          this.http.put(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
            { values: [updatedRow] },
            { headers },
          ),
        );
        await this.clearCache();
        return result;
      } catch (error: unknown) {
        if (error instanceof StaleRowError) throw error;
        console.error('Failed to update row:', error);
        throw new Error(`Failed to update row: ${this.errorMessage(error)}`);
      }
    });
  }

  async deleteApplication(id: string): Promise<unknown> {
    return this.withMutation(async () => {
      const spreadsheetId = await this.getSpreadsheetId();
      const token = await this.auth.getToken();
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

      try {
        const { rowIndex } = await this.locateAndConfirmRow(
          spreadsheetId,
          id,
          headers,
          `${APPLICATIONS_SHEET_TITLE}!A:A`,
        );
        const sheetId = await this.getSheetNumericId();

        const result = await firstValueFrom(
          this.http.post(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
            {
              requests: [
                {
                  deleteDimension: {
                    range: {
                      sheetId,
                      dimension: 'ROWS',
                      startIndex: rowIndex,
                      endIndex: rowIndex + 1,
                    },
                  },
                },
              ],
            },
            { headers },
          ),
        );
        await this.clearCache();
        return result;
      } catch (error: unknown) {
        if (error instanceof StaleRowError) throw error;
        console.error('Failed to delete row:', error);
        throw new Error(`Failed to delete row: ${this.errorMessage(error)}`);
      }
    });
  }

  /**
   * Locate a row by application id, then re-read column A at that index.
   * On mismatch, re-resolve once; still mismatched → StaleRowError.
   */
  private async locateAndConfirmRow(
    spreadsheetId: string,
    applicationId: string,
    headers: HttpHeaders,
    valuesRange: string,
  ): Promise<{ rowIndex: number; row: string[] }> {
    const locate = async (): Promise<{ rowIndex: number; row: string[] }> => {
      const res: { values?: string[][] } = await firstValueFrom(
        this.http.get(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${valuesRange}`,
          { headers },
        ),
      );
      const allRows: string[][] = res.values || [];
      const rowIndex = allRows.findIndex((r) => r && r[0] === applicationId);
      if (rowIndex === -1) {
        throw new Error(`Application with id ${applicationId} not found`);
      }
      return { rowIndex, row: allRows[rowIndex] };
    };

    let located = await locate();
    if (await this.confirmRowId(spreadsheetId, located.rowIndex, applicationId, headers)) {
      return located;
    }

    located = await locate();
    if (await this.confirmRowId(spreadsheetId, located.rowIndex, applicationId, headers)) {
      return located;
    }

    throw new StaleRowError(applicationId);
  }

  private async confirmRowId(
    spreadsheetId: string,
    rowIndex: number,
    applicationId: string,
    headers: HttpHeaders,
  ): Promise<boolean> {
    const cellRange = `${APPLICATIONS_SHEET_TITLE}!A${rowIndex + 1}`;
    const res: { values?: string[][] } = await firstValueFrom(
      this.http.get(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${cellRange}`,
        { headers },
      ),
    );
    return res.values?.[0]?.[0] === applicationId;
  }

  private withMutation<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.mutationQueue.then(fn, fn);
    this.mutationQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private clearCache(): Promise<void> {
    return this.storage.remove([ROWS_CACHE_KEY]);
  }

  private async clearSpreadsheetIdentity(): Promise<void> {
    this.spreadsheetId = null;
    this.sheetNumericId = null;
    await this.storage.remove([SPREADSHEET_ID_KEY, SHEET_NUMERIC_ID_KEY]);
  }

  clearSession(): void {
    this.spreadsheetId = null;
    this.sheetNumericId = null;
    // Leave mutationQueue intact so in-flight ops finish serially.
    void this.storage.remove([SPREADSHEET_ID_KEY, SHEET_NUMERIC_ID_KEY, ROWS_CACHE_KEY]);
  }

  async getRows(forceRefresh = false): Promise<string[][]> {
    if (!forceRefresh) {
      const cached = await this.storage.get<RowsCache>(ROWS_CACHE_KEY);
      if (cached?.timestamp && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.data;
      }
    }

    const id = await this.getSpreadsheetId();
    const token = await this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    try {
      const res: { values?: string[][] } = await firstValueFrom(
        this.http.get(
          `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${APPLICATIONS_SHEET_TITLE}!A:L`,
          { headers },
        ),
      );

      const rows = res.values ? res.values.slice(1) : [];
      await this.storage.set({
        [ROWS_CACHE_KEY]: {
          data: rows,
          timestamp: Date.now(),
        },
      });
      return rows;
    } catch (error: unknown) {
      const status =
        error && typeof error === 'object' && 'status' in error
          ? (error as { status?: number }).status
          : undefined;
      if (status === 404 || status === 403) {
        await this.clearSpreadsheetIdentity();
      }
      throw error;
    }
  }

  private errorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      const nested = (error as { error?: { error?: { message?: string } }; message?: string })
        .error?.error?.message;
      if (nested) return nested;
      if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
        return (error as { message: string }).message;
      }
    }
    return String(error);
  }
}
