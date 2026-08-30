/** Max retries after the initial attempt (Google guidance: truncated exponential backoff). */
export const GOOGLE_API_RETRY_MAX = 4;

/** Cap wait between retries at 32s. */
export const GOOGLE_API_BACKOFF_CAP_MS = 32_000;

const SERVER_ERROR_STATUSES = new Set([500, 502, 503, 504]);

export function isGoogleApisUrl(url: string): boolean {
  try {
    const host = new URL(url, 'https://example.com').hostname;
    return host === 'googleapis.com' || host.endsWith('.googleapis.com');
  } catch {
    return false;
  }
}

/**
 * Retry 429 on every method (rejected before processing).
 * Retry 5xx only on GET (writes may have partially applied).
 */
export function shouldRetryGoogleApiRequest(method: string, status: number): boolean {
  if (status === 429) return true;
  if (method.toUpperCase() === 'GET' && SERVER_ERROR_STATUSES.has(status)) return true;
  return false;
}

/**
 * Truncated exponential backoff: min(2^n * 1000 + jitter, 32000).
 * `attempt` is 0-based (0 = first retry). Honors Retry-After when present.
 */
export function computeGoogleApiBackoffMs(
  attempt: number,
  retryAfterHeader: string | null,
  randomMs: number = Math.random() * 1000,
): number {
  if (retryAfterHeader != null && retryAfterHeader !== '') {
    const asSeconds = Number(retryAfterHeader);
    if (Number.isFinite(asSeconds) && asSeconds >= 0) {
      return Math.min(asSeconds * 1000, GOOGLE_API_BACKOFF_CAP_MS);
    }
    const asDate = Date.parse(retryAfterHeader);
    if (!Number.isNaN(asDate)) {
      return Math.min(Math.max(0, asDate - Date.now()), GOOGLE_API_BACKOFF_CAP_MS);
    }
  }

  const n = Math.max(0, attempt);
  return Math.min(2 ** n * 1000 + randomMs, GOOGLE_API_BACKOFF_CAP_MS);
}