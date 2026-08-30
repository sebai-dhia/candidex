import { ApplicationRow } from '../../../domain/application/application-row.model';
import { compareApplicationsByRecency } from '../../../domain/application/application-row.utils';

export type TrackingSortOrder = 'desc' | 'asc';

/** Filter applications by status (no-op when filter is `All`). */
export function filterApplicationsByStatus(
  apps: ApplicationRow[],
  filter: string,
): ApplicationRow[] {
  if (filter === 'All') return apps;
  return apps.filter((a) => a.status === filter);
}

/** Case-insensitive search across company and role. */
export function filterApplicationsBySearch(apps: ApplicationRow[], query: string): ApplicationRow[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return apps;
  return apps.filter(
    (app) =>
      (app.company && app.company.toLowerCase().includes(normalized)) ||
      (app.role && app.role.toLowerCase().includes(normalized))
  );
}

/** Sort by date, then by id so same-day saves keep newest on top. */
export function sortApplicationsByRecency(apps: ApplicationRow[], sortOrder: TrackingSortOrder): ApplicationRow[] {
  return [...apps].sort((a, b) => compareApplicationsByRecency(a, b, sortOrder));
}

/** Apply status filter, search, and sort in the same order as the tracking list. */
export function queryTrackingApplications(
  apps: ApplicationRow[],
  options: {
    searchQuery: string;
    activeFilter: string;
    sortOrder: TrackingSortOrder;
  }
): ApplicationRow[] {
  let result = [...apps];
  result = filterApplicationsByStatus(result, options.activeFilter);
  result = filterApplicationsBySearch(result, options.searchQuery);
  return sortApplicationsByRecency(result, options.sortOrder);
}