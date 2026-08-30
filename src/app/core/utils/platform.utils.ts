import { APPLICATION_PLATFORMS, CUSTOM_OPTION } from '../constants/application-options.constants';
import { titleCaseWords } from '../../../domain/country/country-normalize.js';

/** Well-known platform spellings (case-correct brands + built-in options). */
const KNOWN_PLATFORMS: readonly string[] = [
  ...APPLICATION_PLATFORMS.filter((p) => p !== CUSTOM_OPTION),
  'Greenhouse',
  'Lever',
  'Ashby',
  'Wellfound',
  'Google Careers'
];

/** Case-insensitive identity key for grouping (trim + collapse spaces). */
export function platformIdentityKey(platform: string | null | undefined): string {
  return String(platform || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Canonical display label for a platform name.
 * Known brands keep official casing; all-lower/all-upper free text becomes Title Case;
 * mixed-case brands (e.g. TanitJobs) are preserved after trim.
 */
export function canonicalizePlatformLabel(platform: string | null | undefined): string {
  const cleaned = String(platform || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!cleaned) return '';

  const known = KNOWN_PLATFORMS.find((p) => p.toLowerCase() === cleaned.toLowerCase());
  if (known) return known;

  if (cleaned === cleaned.toLowerCase() || cleaned === cleaned.toUpperCase()) {
    return titleCaseWords(cleaned);
  }

  return cleaned;
}

/** Prefer the stronger brand-looking label when merging case variants. */
export function preferPlatformLabel(current: string, candidate: string): string {
  const a = canonicalizePlatformLabel(current);
  const b = canonicalizePlatformLabel(candidate);
  if (!a) return b;
  if (!b) return a;

  const known = KNOWN_PLATFORMS.find((p) => p.toLowerCase() === a.toLowerCase());
  if (known) return known;

  const upperScore = (value: string) => (value.match(/[A-Z]/g) || []).length;
  return upperScore(b) > upperScore(a) ? b : a;
}

/** Aggregate platform counts with case-insensitive dedupe. */
export function aggregatePlatformCounts(platforms: Iterable<string | null | undefined>): { name: string; count: number }[] {
  const map = new Map<string, { name: string; count: number }>();

  for (const platform of platforms) {
    const key = platformIdentityKey(platform);
    if (!key) continue;

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.name = preferPlatformLabel(existing.name, String(platform));
    } else {
      map.set(key, { name: canonicalizePlatformLabel(platform), count: 1 });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Min applications before a non-built-in platform is promoted into the New App list. */
export const FREQUENT_PLATFORM_MIN_COUNT = 5;

const COMPANY_SITE = 'Company Site';

/**
 * Highest-count platform that is not in the built-in list and has at least `minCount` apps.
 * Sorted counts are assumed (highest first), e.g. from aggregatePlatformCounts.
 */
export function pickTopFrequentPlatform(
  counts: readonly { name: string; count: number }[],
  builtInPlatforms: readonly string[] = APPLICATION_PLATFORMS,
  minCount = FREQUENT_PLATFORM_MIN_COUNT
): string | null {
  const builtIn = new Set(
    builtInPlatforms.map((p) => platformIdentityKey(p)).filter(Boolean)
  );

  const top = counts.find(
    (entry) =>
      entry.count >= minCount && !builtIn.has(platformIdentityKey(entry.name))
  );

  return top ? canonicalizePlatformLabel(top.name) : null;
}

/** Insert a platform just before "Company Site" (or before Other if Company Site is missing). */
export function insertPlatformBeforeCompanySite(platforms: readonly string[], platformToInsert: string | null | undefined): string[] {
  const insert = canonicalizePlatformLabel(platformToInsert);
  if (!insert) return [...platforms];

  const insertKey = platformIdentityKey(insert);
  const without = platforms.filter((p) => platformIdentityKey(p) !== insertKey);

  const companyIdx = without.findIndex(
    (p) => platformIdentityKey(p) === platformIdentityKey(COMPANY_SITE)
  );
  if (companyIdx !== -1) {
    return [...without.slice(0, companyIdx), insert, ...without.slice(companyIdx)];
  }

  const otherIdx = without.findIndex((p) => p === CUSTOM_OPTION);
  if (otherIdx !== -1) {
    return [...without.slice(0, otherIdx), insert, ...without.slice(otherIdx)];
  }

  return [...without, insert];
}