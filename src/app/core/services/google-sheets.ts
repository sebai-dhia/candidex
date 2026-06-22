import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from './auth';
import { firstValueFrom } from 'rxjs';

export interface ApplicationRow {
  id: string;
  role: string;
  company: string;
  platform: string;
  job_link: string;
  company_link: string;
  date_applied: string;
  status: string;
  interview_date: string;
  notes: string;
  country?: string;
  work_type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleSheets {
  private auth = inject(Auth);
  private http = inject(HttpClient);

  private spreadsheetId: string | null = null;

  async getSpreadsheetId(): Promise<string> {
    if (this.spreadsheetId) return this.spreadsheetId;

    // Check local storage for an existing spreadsheet ID
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['candidexSpreadsheetId'], async (result: { [key: string]: any }) => {
        if (result['candidexSpreadsheetId']) {
          this.spreadsheetId = result['candidexSpreadsheetId'];
          resolve(this.spreadsheetId!);
        } else {
          // If not found, create a new one
          try {
            const token = await this.auth.getToken();
            const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

            const createRes: any = await firstValueFrom(
              this.http.post('https://sheets.googleapis.com/v4/spreadsheets', {
                properties: { title: 'Candidex - Job Applications' },
                sheets: [
                  {
                    properties: { title: 'Applications' }
                  }
                ]
              }, { headers })
            );

            this.spreadsheetId = createRes.spreadsheetId;

            // Add header row to match PROJECT.md exactly
            await this.appendRow(['id', 'role', 'company', 'platform', 'job_link', 'company_link', 'date_applied', 'status', 'interview_date', 'notes', 'country', 'work_type']);

            // Save the ID so we don't recreate it
            chrome.storage.local.set({ candidexSpreadsheetId: this.spreadsheetId });
            resolve(this.spreadsheetId!);
          } catch (error: any) {
            console.error('Failed to create spreadsheet:', error);
            const msg = error?.error?.error?.message || error?.message || JSON.stringify(error);
            reject(new Error(`Failed to create spreadsheet: ${msg}`));
          }
        }
      });
    });
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

    const existingRow = allRows[rowIndex];
    // Fill in the existing data with the updates
    const updatedRow = [
      existingRow[0] || '', // id
      updates.role !== undefined ? updates.role : (existingRow[1] || ''),
      updates.company !== undefined ? updates.company : (existingRow[2] || ''),
      updates.platform !== undefined ? updates.platform : (existingRow[3] || ''),
      updates.job_link !== undefined ? updates.job_link : (existingRow[4] || ''),
      updates.company_link !== undefined ? updates.company_link : (existingRow[5] || ''),
      updates.date_applied !== undefined ? updates.date_applied : (existingRow[6] || ''),
      updates.status !== undefined ? updates.status : (existingRow[7] || ''),
      updates.interview_date !== undefined ? updates.interview_date : (existingRow[8] || ''),
      updates.notes !== undefined ? updates.notes : (existingRow[9] || ''),
      updates.country !== undefined ? updates.country : (existingRow[10] || ''),
      updates.work_type !== undefined ? updates.work_type : (existingRow[11] || ''),
    ];

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
        return cached.data;
      }
    }

    const id = await this.getSpreadsheetId();
    const token = await this.auth.getToken();
    const headers = new HttpHeaders({ 
      Authorization: `Bearer ${token}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const res: any = await firstValueFrom(
      this.http.get(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/Applications!A:L`, { headers })
    );

    const rows = res.values ? res.values.slice(1) : [];

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