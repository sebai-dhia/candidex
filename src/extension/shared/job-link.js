/**
 * Platform-specific job URL resolution.
 *
 * Converts search/list intermediate URLs with job IDs into direct canonical job links:
 * - LinkedIn: /jobs/search/?currentJobId=12345 → https://www.linkedin.com/jobs/view/12345/
 * - Indeed: /jobs?q=...&vjk=abc123def → https://www.indeed.com/viewjob?jk=abc123def
 * - Glassdoor: /Job/...jl=12345 → https://www.glassdoor.com/job-listing?jl=12345
 * - TanitJobs: /jobs/?... with in-page CTA → /job/{id}/{slug}/
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
 * Resolve LinkedIn search or direct URL into a clean canonical job view URL.
 * e.g. https://www.linkedin.com/jobs/search/?currentJobId=4461592016 → https://www.linkedin.com/jobs/view/4461592016/
 * @param {URL} parsed
 * @param {ParentNode | null} [root]
 * @returns {string | null}
 */
function resolveLinkedInJobLink(parsed, root) {
  const host = parsed.hostname.toLowerCase();
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) {
    return null;
  }

  // 1. Direct view path: /jobs/view/4461592016/...
  const viewMatch = parsed.pathname.match(/\/jobs\/view\/(\d+)/i);
  if (viewMatch) {
    return `https://www.linkedin.com/jobs/view/${viewMatch[1]}/`;
  }

  // 2. Query param currentJobId (search mode or collections)
  const currentJobId = parsed.searchParams.get('currentJobId');
  if (currentJobId && /^\d+$/.test(currentJobId.trim())) {
    return `https://www.linkedin.com/jobs/view/${currentJobId.trim()}/`;
  }

  // 3. Check DOM anchor tags for selected job view links
  if (root) {
    const jobLinkAnchor = root.querySelector?.('a[href*="/jobs/view/"]');
    if (jobLinkAnchor) {
      const href = jobLinkAnchor.getAttribute('href') || '';
      const anchorMatch = href.match(/\/jobs\/view\/(\d+)/i);
      if (anchorMatch) {
        return `https://www.linkedin.com/jobs/view/${anchorMatch[1]}/`;
      }
    }
  }

  return null;
}

/**
 * Resolve Indeed search or direct URL into a clean canonical job view URL.
 * e.g. https://www.indeed.com/jobs?q=...&vjk=7d4b6ef12a3 → https://www.indeed.com/viewjob?jk=7d4b6ef12a3
 * @param {URL} parsed
 * @returns {string | null}
 */
function resolveIndeedJobLink(parsed) {
  const host = parsed.hostname.toLowerCase();
  if (host !== 'indeed.com' && !host.endsWith('.indeed.com')) {
    return null;
  }

  const jk =
    parsed.searchParams.get('vjk') ||
    parsed.searchParams.get('jk') ||
    parsed.searchParams.get('vjs');
  if (jk && /^[a-zA-Z0-9]+$/.test(jk.trim())) {
    return `https://${parsed.hostname}/viewjob?jk=${jk.trim()}`;
  }

  return null;
}

/**
 * Resolve Glassdoor search or direct URL into a clean canonical job view URL.
 * e.g. https://www.glassdoor.com/Job/...jl=10089234 → https://www.glassdoor.com/job-listing?jl=10089234
 * @param {URL} parsed
 * @returns {string | null}
 */
function resolveGlassdoorJobLink(parsed) {
  const host = parsed.hostname.toLowerCase();
  if (host !== 'glassdoor.com' && !host.endsWith('.glassdoor.com')) {
    return null;
  }

  const jl = parsed.searchParams.get('jl') || parsed.searchParams.get('jobListingId');
  if (jl && /^\d+$/.test(jl.trim())) {
    return `https://${parsed.hostname}/job-listing?jl=${jl.trim()}`;
  }

  return null;
}

/**
 * Resolve a canonical direct job posting URL from a page URL.
 * Works across LinkedIn, Indeed, Glassdoor, and TanitJobs.
 * Returns null if the URL cannot be resolved or is already canonical.
 *
 * @param {string} pageUrl
 * @param {ParentNode | null | undefined} root
 * @returns {string | null}
 */
export function resolveJobLink(pageUrl, root = typeof document !== 'undefined' ? document : null) {
  if (!pageUrl) return null;

  let parsed;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return null;
  }

  // 1. LinkedIn
  const linkedInLink = resolveLinkedInJobLink(parsed, root);
  if (linkedInLink) return linkedInLink;

  // 2. Indeed
  const indeedLink = resolveIndeedJobLink(parsed);
  if (indeedLink) return indeedLink;

  // 3. Glassdoor
  const glassdoorLink = resolveGlassdoorJobLink(parsed);
  if (glassdoorLink) return glassdoorLink;

  // 4. TanitJobs
  if (isTanitJobsHost(parsed.hostname)) {
    if (isTanitJobsJobOfferUrl(pageUrl)) return null;
    if (!isTanitJobsIntermediateUrl(pageUrl)) return null;

    const links = [...(root?.querySelectorAll?.('a[href]') || [])].map((anchor) => ({
      text: anchor.textContent || '',
      href: anchor.getAttribute('href')
    }));

    return pickTanitJobsOfferHref(links, pageUrl);
  }

  return null;
}