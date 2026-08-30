import { formatCanonicalCountry } from '../../domain/country/country-normalize.js';

export const EXTRACTION_FIELDS = ['company', 'role', 'country', 'workType'];
export const DEFAULT_WORK_TYPE = 'On-site';

/**
 * Normalize raw model / JSON-LD output into a JobExtractionResult.
 * @param {Record<string, unknown> | null | undefined} parsed
 * @param {{ source?: string, confidenceBoost?: number }} [options]
 */
export function normalizeExtractionResult(parsed, options = {}) {
  if (!parsed || typeof parsed !== 'object') {
    return emptyResult(options.source);
  }

  const company = cleanString(parsed.company);
  const role = cleanRoleTitle(cleanString(parsed.role));
  const rawLocation = normalizeCountryLocation(parsed);
  const country = formatCanonicalCountry(rawLocation) || rawLocation;
  const workType = normalizeWorkType(parsed.workType ?? parsed.work_type);
  const boost = typeof options.confidenceBoost === 'number' ? options.confidenceBoost : 0.9;

  return {
    company,
    role,
    country,
    workType,
    confidence: {
      company: company ? boost : 0,
      role: role ? boost : 0,
      country: country ? boost * 0.95 : 0,
      workType: workType ? boost : 0
    },
    source: options.source || null
  };
}

export function emptyResult(source = null) {
  return {
    company: null,
    role: null,
    country: null,
    workType: null,
    confidence: { company: 0, role: 0, country: 0, workType: 0 },
    source,
  };
}

/** @param {string} raw */
export function parseModelJson(raw) {
  const clean = String(raw || '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  return JSON.parse(clean);
}

function cleanString(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'null') return null;
  return text;
}

/**
 * Strip posting metadata commonly glued onto job titles.
 * Intentional: only trailing / parenthetical metadata — not title words like "Remote Sensing".
 * @param {string | null} value
 * @returns {string | null}
 */
export function cleanRoleTitle(value) {
  if (!value) return null;

  let text = String(value).trim();

  // Parenthetical or slash gender/inclusivity tags: (H/F), M/F, Homme/Femme, etc.
  text = text.replace(/\s*[\(\[\{]\s*[A-Za-zÀ-ÿ]{1,12}\s*\/\s*[A-Za-zÀ-ÿ]{1,12}\s*[\)\]\}]/g, ' ');
  text = text.replace(/\b(?:Homme\s*\/\s*Femme|Male\s*\/\s*Female|H\s*\/\s*F|F\s*\/\s*H|M\s*\/\s*F|F\s*\/\s*M)\b/gi, ' ');

  // Trailing experience requirements (any language pattern: N years / N ans …)
  text = text.replace(
    /\s*(?:[-–—,]?\s*)?(?:(?:avec|with)\s+)?\d+\s*[+àa-]?\s*\d*\s*\+?\s*(?:ans?|years?)\b(?:\s*(?:d['’]?\s*)?(?:exp[ée]rience|experience))?\s*.*$/i,
    ''
  );

  // Trailing work arrangement (belongs in workType): "100% remote", "hybride", etc.
  text = text.replace(
    /\s*(?:[-–—,]?\s*)?(?:\d+\s*%\s*)?(?:fully\s+|full[\s-]*)?(?:remote|hybrid|on[\s-]?site|t[ée]l[ée]travail|teletravail|hybride|pr[ée]sentiel|presentiel)\s*$/i,
    ''
  );

  // Trailing standalone contract codes / urgency fluff
  text = text.replace(
    /\s*(?:[-–—,]?\s*)?(?:\(?\s*(?:CDI|CDD|urgent|imm[ée]diat)\s*\)?)\s*$/i,
    ''
  );  

  text = text.replace(/\s{2,}/g, ' ').replace(/[\s,;:|/-]+$/g, '').trim();
  return text || null;
}

/**
 * Build a single country/location label from AI or JSON-LD fields.
 * @param {Record<string, unknown>} parsed
 */
export function normalizeCountryLocation(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;

  const city = cleanString(parsed.city ?? parsed.locality ?? parsed.addressLocality ?? parsed.town);
  const country = cleanString(parsed.country ?? parsed.addressCountry ?? parsed.nation);
  const location = cleanString(parsed.location ?? parsed.address ?? parsed.region);

  if (location?.includes(',')) {
    return location;
  }

  if (country?.includes(',')) {
    return country;
  }

  if (city && country) {
    if (country.toLowerCase().includes(city.toLowerCase())) {
      return country;
    }
    return `${city}, ${country}`;
  }

  return country || city || location || null;
}

function normalizeWorkType(value) {
  const text = cleanString(value);
  if (!text) return null;

  const lower = text.toLowerCase();
  if (lower.includes('remote') || lower.includes('télétravail') || lower.includes('teletravail')) {
    return 'Remote';
  }
  if (lower.includes('hybrid') || lower.includes('hybride')) {
    return 'Hybrid';
  }
  if (
    lower.includes('on-site') ||
    lower.includes('onsite') ||
    lower.includes('on site') ||
    lower.includes('présentiel') ||
    lower.includes('presentiel')
  ) {
    return 'On-site';
  }

  if (text === 'Remote' || text === 'Hybrid' || text === 'On-site') return text;
  return null;
}

/** Scan captured text for work mode labels (English + French job boards). */
export function extractWorkTypeFromText(text) {
  const source = String(text || '');
  if (!source.trim()) return null;

  const labeled = source.match(/mode\s+de\s+travail\s*[:\-–—]?\s*(hybride|hybrid|t[ée]l[ée]travail|remote|pr[ée]s(?:entiel)?|on-?\s*site)/i);
  if (labeled?.[1]) {
    return normalizeWorkType(labeled[1]);
  }

  const inline = source.match(/\b(hybride|hybrid|t[ée]l[ée]travail|teletravail|remote|pr[ée]s(?:entiel)?|presentiel|on-?\s*site)\b/i);
  if (inline?.[1]) {
    return normalizeWorkType(inline[1]);
  }

  return null;
}

/** Fill workType from region text when primary extraction missed it; default to On-site. */
export function enrichWorkTypeFromText(result, regionText) {
  if (!result) return result;

  let workType = result.workType;
  let workTypeConfidence = result.confidence?.workType ?? 0;

  if (!workType) {
    workType = extractWorkTypeFromText(regionText);
    if (workType) {
      workTypeConfidence = Math.max(workTypeConfidence, 0.75);
    }
  }

  if (!workType) {
    workType = DEFAULT_WORK_TYPE;
    workTypeConfidence = Math.max(workTypeConfidence, 0.4);
  }

  if (workType === result.workType && workTypeConfidence === (result.confidence?.workType ?? 0)) {
    return result;
  }

  return {
    ...result,
    workType,
    confidence: {
      ...result.confidence,
      workType: workTypeConfidence
    }
  }
}

export function hasAllCoreFields(result) {
  return Boolean(result?.role && result?.company && result?.country);
}

/** @deprecated use hasAllCoreFields */
export function isExtractionSufficient(result) {
  return hasAllCoreFields(result);
}

/**
 * Primary wins when non-null; secondary fills null fields only.
 * @param {ReturnType<typeof emptyResult>} primary
 * @param {ReturnType<typeof emptyResult>} fallback
 */
export function fillNullFieldsFromFallback(primary, fallback) {
  if (!primary) return fallback || emptyResult();
  if (!fallback) return primary;

  const merged = { ...primary, confidence: { ...primary.confidence } };

  for (const field of EXTRACTION_FIELDS) {
    if (!merged[field] && fallback[field]) {
      merged[field] = fallback[field];
      merged.confidence[field] = fallback.confidence?.[field] ?? 0;
    }
  }

  if (!merged.source && fallback.source) {
    merged.source = fallback.source;
  }

  return merged;
}

/**
 * Merge ordered sources; earlier entries win on non-null fields.
 * @param {ReturnType<typeof emptyResult>[]} sources
 */
export function mergeAllSources(sources) {
  return sources.reduce(
    (accumulator, source) => fillNullFieldsFromFallback(accumulator, source),
    emptyResult()
  );
}

/**
 * Prefer fields with higher confidence; fill gaps from secondary.
 * @param {ReturnType<typeof emptyResult>} primary
 * @param {ReturnType<typeof emptyResult>} secondary
 */
export function mergeExtractionResults(primary, secondary) {
  if (!primary) return secondary;
  if (!secondary) return primary;

  const merged = emptyResult(primary.source || secondary.source);

  for (const field of EXTRACTION_FIELDS) {
    const primaryConf = primary.confidence?.[field] ?? 0;
    const secondaryConf = secondary.confidence?.[field] ?? 0;
    if (primary[field] && primaryConf >= secondaryConf) {
      merged[field] = primary[field];
      merged.confidence[field] = primaryConf;
    } else if (secondary[field]) {
      merged[field] = secondary[field];
      merged.confidence[field] = secondaryConf;
    }
  }

  return merged;
}