import { emptyResult, normalizeExtractionResult } from '../../shared/normalize-result.js';

/**
 * Extract from JSON-LD JobPosting when available (fallback-only).
 * @param {{ pageMeta?: { jsonLd?: Record<string, unknown> } | null }} input
 */
export function extractWithJsonLd(input) {
  const schema = input?.pageMeta?.jsonLd;
  if (!schema || schema['@type'] !== 'JobPosting') {
    return emptyResult('json-ld');
  }

  const company =
    schema.hiringOrganization?.name ||
    (typeof schema.hiringOrganization === 'string' ? schema.hiringOrganization : null);

  let country = null;
  const loc = schema.jobLocation;
  if (loc) {
    const address = Array.isArray(loc) ? loc[0]?.address : loc.address || loc;
    const locality = address?.addressLocality || null;
    const addressCountry = address?.addressCountry || null;

    if (locality && addressCountry) {
      country = `${locality}, ${addressCountry}`;
    } else {
      country =
        addressCountry ||
        locality ||
        (typeof address === 'string' ? address : null) ||
        (typeof loc === 'string' ? loc : null);
    }
  }

  let workType = null;
  if (schema.jobLocationType === 'TELECOMMUTE') {
    workType = 'Remote';
  }

  return normalizeExtractionResult(
    {
      company,
      role: schema.title || null,
      country,
      workType
    },
    { source: 'json-ld', confidenceBoost: 0.92 }
  );
}