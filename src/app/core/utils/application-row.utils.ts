import { ApplicationRow } from '../models/application-row.model';

export const APPLICATION_SHEET_HEADERS = [
  'id',
  'role',
  'company',
  'platform',
  'job_link',
  'company_link',
  'date_applied',
  'status',
  'interview_date',
  'notes',
  'country',
  'work_type',
] as const;

export function mapSheetRowToApplication(row: readonly string[]): ApplicationRow {
  return {
    id: row[0] || '',
    role: row[1] || '',
    company: row[2] || '',
    platform: row[3] || '',
    job_link: row[4] || '',
    company_link: row[5] || '',
    date_applied: row[6] || '',
    status: row[7] || '',
    interview_date: row[8] || '',
    notes: row[9] || '',
    country: row[10] || '',
    work_type: row[11] || '',
  };
}

export function mapSheetRowsToApplications(rows: readonly string[][]): ApplicationRow[] {
  return rows.map(mapSheetRowToApplication).filter((application) => application.id);
}

export function mapApplicationToSheetRow(application: ApplicationRow): string[] {
  return [
    application.id,
    application.role,
    application.company,
    application.platform,
    application.job_link,
    application.company_link,
    application.date_applied,
    application.status,
    application.interview_date,
    application.notes,
    application.country,
    application.work_type,
  ];
}

export function mergeApplicationRow(
  existingRow: readonly string[],
  updates: Partial<ApplicationRow>,
): string[] {
  const existingApplication = mapSheetRowToApplication(existingRow);

  return mapApplicationToSheetRow({
    ...existingApplication,
    ...updates,
  });
}
