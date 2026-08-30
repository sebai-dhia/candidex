/**
 * Platform-specific job URL resolution.
 *
 * TanitJobs has two surfaces:
 * - Completed offer page (`/job/{id}/…`) — tab URL is already the real link.
 * - Intermediate list/search (`/jobs/?…`) — address bar is shared; the real
 *   posting is behind the in-page "Voir l'offre complète" link.
 */

const TANIT_OFFER_LINK_RE = /voir(?:e)?\s+(?:l['’]?\s*)?offre\s+compl[eè]te/i;

/** Real posting: /job/2040736/slug/ */
const TANIT_JOB_OFFER_PATH_RE = /^\/job\/\d+(?:\/|$)/i;

/**
 * @param {string} hostname
 * @returns {boolean}
 */
export function isTanitJobsHost(hostname) {
  const host = String(hostname || '')
    .toLowerCase()
    .replace(/^www\./, '');
  return host === 'tanitjobs.com' || host.endsWith('.tanitjobs.com');
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isTanitJobsOfferLinkText(text) {
  const normalized = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  return TANIT_OFFER_LINK_RE.test(normalized);
}

/**
 * Completed job offer page — safe to use the tab URL as-is.
 * @param {string} url
 * @returns {boolean}
 */
export function isTanitJobsJobOfferUrl(url) {
  try {
    const parsed = new URL(url);
    if (!isTanitJobsHost(parsed.hostname)) return false;
    return TANIT_JOB_OFFER_PATH_RE.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * Intermediate list/search (and similar) — not a specific posting URL.
 * @param {string} url
 * @returns {boolean}
 */
export function isTanitJobsIntermediateUrl(url) {
  try {
    const parsed = new URL(url);
    if (!isTanitJobsHost(parsed.hostname)) return false;
    if (isTanitJobsJobOfferUrl(url)) return false;
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    // Search/browse surface: /jobs, /jobs/, or home
    return path === '/jobs' || path === '/';
  } catch {
    return false;
  }
}

/** @deprecated Prefer isTanitJobsIntermediateUrl — kept for callers/tests. */
export function isGenericTanitJobsListUrl(url) {
  return isTanitJobsIntermediateUrl(url);
}

/**
 * @param {Array<{ text?: string, href?: string | null }>} links
 * @param {string} baseUrl
 * @returns {string | null}
 */
export function pickTanitJobsOfferHref(links, baseUrl) {
  if (!Array.isArray(links) || !baseUrl) return null;

  for (const link of links) {
    if (!link?.href || !isTanitJobsOfferLinkText(link.text || '')) continue;
    try {
      const absolute = new URL(link.href, baseUrl).href;
      // Only accept a real /job/{id}/… posting — never the shared /jobs/?… list.
      if (isTanitJobsJobOfferUrl(absolute)) {
        return absolute;
      }
    } catch {
      // ignore invalid hrefs
    }
  }
  return null;
}

/**
 * Resolve a canonical job posting URL when the tab URL is the intermediate
 * TanitJobs list/search. Returns null when the tab URL is already fine
 * (completed offer page, or any non-TanitJobs host).
 *
 * @param {string} pageUrl
 * @param {ParentNode | null | undefined} root
 * @returns {string | null}
 */
export function resolveJobLink(pageUrl, root = typeof document !== 'undefined' ? document : null) {
  if (!pageUrl || !root) return null;

  let hostname;
  try {
    hostname = new URL(pageUrl).hostname;
  } catch {
    return null;
  }

  if (!isTanitJobsHost(hostname)) return null;

  // Completed offer page — keep tab URL; do not rewrite.
  if (isTanitJobsJobOfferUrl(pageUrl)) return null;

  // Intermediate list/search only — pull the real link from the CTA.
  if (!isTanitJobsIntermediateUrl(pageUrl)) return null;

  const links = [...root.querySelectorAll('a[href]')].map((anchor) => ({
    text: anchor.textContent || '',
    href: anchor.getAttribute('href')
  }));

  return pickTanitJobsOfferHref(links, pageUrl);
}