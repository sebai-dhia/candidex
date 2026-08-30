import { ApplicationRow } from './application-row.model';

/** Query params that change between shares of the same posting. */
const TRACKING_PARAM = /^(utm_|fbclid|gclid|mc_|li_|msclkid|ref|source|campaign|si$)/i;

export class DuplicateApplicationError extends Error {
  readonly existing: ApplicationRow;

  constructor(existing: ApplicationRow) {
    super('DUPLICATE_APPLICATION');
    this.name = 'DuplicateApplicationError';
    this.existing = existing;
  }
}

export function isDuplicateApplicationError(error: unknown): error is DuplicateApplicationError {
  return error instanceof DuplicateApplicationError;
}

/** Case-insensitive identity for company / role / platform text. */
export function textIdentityKey(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Normalize a job posting URL for equality checks:
 * strip hash, www, trailing slash, and common tracking params.
 */
export function normalizeJobLink(url: string | null | undefined): string {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    let path = parsed.pathname || '/';
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    const params = [...parsed.searchParams.entries()]
      .filter(([key]) => !isTrackingParam(key))
      .sort(([a], [b]) => a.localeCompare(b));

    const query = params.length
      ? `?${params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`
      : '';

    return `${host}${path}${query}`;
  } catch {
    return raw.replace(/\/+$/, '').toLowerCase();
  }
}

function isTrackingParam(key: string): boolean {
  return TRACKING_PARAM.test(key) || key.toLowerCase().startsWith('utm_');
}

export type DuplicateCandidate =
  | Pick<ApplicationRow, 'job_link' | 'company' | 'role' | 'platform'>
  | {
      job_link?: string;
      company?: string;
      role?: string;
      platform?: string;
    };

/**
 * Find an existing application that likely represents the same job posting.
 * Tier 1: normalized job_link (when present).
 * Tier 2: company + role + platform when job_link is empty.
 */
export function findDuplicateApplication(
  existing: readonly ApplicationRow[],
  candidate: DuplicateCandidate,
): ApplicationRow | null {
  const link = normalizeJobLink(candidate.job_link);
  if (link) {
    return existing.find((row) => normalizeJobLink(row.job_link) === link) ?? null;
  }

  const company = textIdentityKey(candidate.company);
  const role = textIdentityKey(candidate.role);
  if (!company || !role) return null;

  const platform = textIdentityKey(candidate.platform);

  return (
    existing.find(
      (row) =>
        textIdentityKey(row.company) === company &&
        textIdentityKey(row.role) === role &&
        textIdentityKey(row.platform) === platform
    ) ?? null
  );
}