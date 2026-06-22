import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from './auth';
import { firstValueFrom } from 'rxjs';
import { ApplicationRow } from '../models/application-row.model';
import { APPLICATION_SHEET_HEADERS, mergeApplicationRow } from '../utils/application-row.utils';

export type { ApplicationRow } from '../models/application-row.model';

@Injectable({
  providedIn: 'root'
})
export class GoogleSheets {
  private auth = inject(Auth);
  private http = inject(HttpClient);

  private spreadsheetId: string | null = null;

  async getSpreadsheetId(): Promise<string> {
    if (this.spreadsheetId) return this.spreadsheetId;

    // Step 1: Check local storage for an existing spreadsheet ID
    const stored = await new Promise<string | null>((resolve) => {
      chrome.storage.local.get(['candidexSpreadsheetId'], (result: { [key: string]: any }) => {
        resolve(result['candidexSpreadsheetId'] || null);
      });
    });

    if (stored) {
      this.spreadsheetId = stored;
      console.log('[Sheets] Using stored spreadsheet ID:', stored);
      return stored;
    }

    // Step 2: Search Google Drive for an existing "Candidex - Job Applications" spreadsheet
    try {
      const token = await this.auth.getToken();
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

      const found = await this.findExistingSpreadsheet(headers);
      if (found) {
        this.spreadsheetId = found;
        chrome.storage.local.set({ candidexSpreadsheetId: found });
        console.log('[Sheets] Found existing spreadsheet on Drive:', found);
        return found;
      }

      // Step 3: No existing spreadsheet found — create a new one
      console.log('[Sheets] No existing spreadsheet found, creating new one...');
      const createRes: any = await firstValueFrom(
        this.http.post('https://sheets.googleapis.com/v4/spreadsheets', {
          properties: { title: 'Candidex - Job Applications' },
          sheets: [{ properties: { title: 'Applications' } }]
        }, { headers })
      );

      this.spreadsheetId = createRes.spreadsheetId;

      // Add header row
      await this.appendRow([...APPLICATION_SHEET_HEADERS]);

      chrome.storage.local.set({ candidexSpreadsheetId: this.spreadsheetId });
      console.log('[Sheets] Created new spreadsheet:', this.spreadsheetId);
      return this.spreadsheetId!;
    } catch (error: any) {
      console.error('[Sheets] Failed to get spreadsheet:', error);
      const msg = error?.error?.error?.message || error?.message || JSON.stringify(error);
      throw new Error(`Failed to get spreadsheet: ${msg}`);
    }
  }

  /**
   * Search Google Drive for existing "Candidex - Job Applications" spreadsheets.
   * If multiple are found, pick the one with the most data rows.
   */
  private async findExistingSpreadsheet(headers: HttpHeaders): Promise<string | null> {
    try {
      const query = encodeURIComponent("name='Candidex - Job Applications' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
      const driveRes: any = await firstValueFrom(
        this.http.get(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, { headers })
      );

      const files = driveRes.files || [];
      console.log(`[Sheets] Found ${files.length} existing spreadsheet(s) on Drive`);

      if (files.length === 0) return null;
      if (files.length === 1) return files[0].id;

      // Multiple found — pick the one with the most data rows
      let bestId = files[0].id;
      let bestCount = 0;

      for (const file of files) {
        try {
          const res: any = await firstValueFrom(
            this.http.get(`https://sheets.googleapis.com/v4/spreadsheets/${file.id}/values/Applications!A:A`, { headers })
          );
          const rowCount = res.values ? res.values.length - 1 : 0; // minus header
          console.log(`[Sheets] Spreadsheet ${file.id} has ${rowCount} data rows`);
          if (rowCount > bestCount) {
            bestCount = rowCount;
            bestId = file.id;
          }
        } catch {
          // Skip spreadsheets we can't read
          console.warn(`[Sheets] Could not read spreadsheet ${file.id}, skipping`);
        }
      }

      console.log(`[Sheets] Selected spreadsheet with most data: ${bestId} (${bestCount} rows)`);
      return bestId;
    } catch (error) {
      console.warn('[Sheets] Drive search failed, will create new spreadsheet:', error);
      return null;
    }
  }

  async appendRow(values: string[]): Promise<any> {
    const id = await this.getSpreadsheetId();
    const token = await this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    try {
      const result = await firstValueFrom(
        this.http.post(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/Applications!A:A:append?valueInputOption=USER_ENTERED`, {
          values: [values]
        }, { headers })
      );
      this.clearCache();
      return result;
    } catch (error: any) {
      console.error('Failed to append row:', error);
      const msg = error?.error?.error?.message || error?.message || JSON.stringify(error);
      throw new Error(`Failed to append row: ${msg}`);
    }
  }

  async updateApplication(id: string, updates: Partial<ApplicationRow>): Promise<any> {
    const sheetId = await this.getSpreadsheetId();
    const token = await this.auth.getToken();
    const headers = new HttpHeaders({ 
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // Fetch all rows to find the correct row index
    const res: any = await firstValueFrom(
      this.http.get(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Applications!A:L`, { headers })
    );

    const allRows: string[][] = res.values || [];
    // allRows[0] is header
    const rowIndex = allRows.findIndex(r => r[0] === id);
    if (rowIndex === -1) {
      throw new Error(`Application with id ${id} not found`);
    }

    const updatedRow = mergeApplicationRow(allRows[rowIndex], updates);

    // +1 because sheet rows are 1-based index (e.g. A1, A2)
    const range = `Applications!A${rowIndex + 1}:L${rowIndex + 1}`;
    
    try {
      const result = await firstValueFrom(
        this.http.put(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
          values: [updatedRow]
        }, { headers })
      );
      this.clearCache();
      return result;
    } catch (error: any) {
      console.error('Failed to update row:', error);
      const msg = error?.error?.error?.message || error?.message || JSON.stringify(error);
      throw new Error(`Failed to update row: ${msg}`);
    }
  }

  async deleteApplication(id: string): Promise<any> {
    const sheetId = await this.getSpreadsheetId();
    const token = await this.auth.getToken();
    const headers = new HttpHeaders({ 
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const res: any = await firstValueFrom(
      this.http.get(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Applications!A:L`, { headers })
    );

    const allRows: string[][] = res.values || [];
    const rowIndex = allRows.findIndex(r => r && r[0] === id);
    if (rowIndex === -1) {
      throw new Error(`Application with id ${id} not found`);
    }

    const range = `Applications!A${rowIndex + 1}:L${rowIndex + 1}`;
    
    try {
      const result = await firstValueFrom(
        this.http.post(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:clear`, {}, { headers })
      );
      this.clearCache();
      return result;
    } catch (error: any) {
      console.error('Failed to delete row:', error);
      const msg = error?.error?.error?.message || error?.message || JSON.stringify(error);
      throw new Error(`Failed to delete row: ${msg}`);
    }
  }

  private clearCache() {
    chrome.storage.local.remove(['candidex_rows_cache']);
  }

  async getRows(forceRefresh = false): Promise<string[][]> {
    if (!forceRefresh) {
      const cached = await new Promise<any>((resolve) => {
        chrome.storage.local.get(['candidex_rows_cache'], (result) => resolve(result['candidex_rows_cache']));
      });

      // Cache TTL: 5 minutes
      if (cached && cached.timestamp && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
        console.log('[Sheets] Returning cached rows:', cached.data.length);
        return cached.data;
      }
    }

    const id = await this.getSpreadsheetId();
    console.log('[Sheets] Spreadsheet ID:', id);
    
    const token = await this.auth.getToken();
    console.log('[Sheets] Token received:', token ? `${token.substring(0, 10)}...` : 'NULL');
    
    const headers = new HttpHeaders({ 
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const res: any = await firstValueFrom(
      this.http.get(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/Applications!A:L`, { headers })
    );

    console.log('[Sheets] API response:', JSON.stringify(res).substring(0, 200));
    const rows = res.values ? res.values.slice(1) : [];
    console.log('[Sheets] Rows after slicing header:', rows.length);

    // Save to cache
    chrome.storage.local.set({
      candidex_rows_cache: {
        data: rows,
        timestamp: Date.now()
      }
    });

    return rows;
  }
}
