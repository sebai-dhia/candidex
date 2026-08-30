import { extractWithActiveCloudProvider } from './background-client.js';
import { extractWithJsonLd } from './json-ld.provider.js';
import { extractWithRegexPipeline } from './regex/index.js';
import { candidexDevLog } from '../../shared/candidex-env.js';
import { emptyResult, enrichWorkTypeFromText, fillNullFieldsFromFallback, hasAllCoreFields } from '../../shared/normalize-result.js';
import { formatCanonicalCountry } from '../../../domain/country/country-normalize.js';

function normalizeInput(input) {
  if (typeof input === 'string') {
    return { regionText: input, pageMeta: null, signal: undefined };
  }
  return {
    regionText: input?.regionText || '',
    pageMeta: input?.pageMeta || null,
    signal: input?.signal
  };
}

function finalizeExtraction(result, context, aiFailed, aiError = null) {
  const enriched = enrichWorkTypeFromText(result, context.regionText);
  const country = formatCanonicalCountry(enriched.country) || enriched.country;

  return {
    ...enriched,
    country,
    extractionMeta: {
      aiFailed,
      aiError,
      usedFallback: aiFailed,
      source: enriched.source
    }
  };
}

async function extractWithPrimaryAi(context) {
  try {
    const result = await extractWithActiveCloudProvider(context);
    return { result, aiFailed: false, aiError: null };
  } catch (error) {
    const message = error?.message || String(error);
    console.warn('[AiCapture] Primary AI extraction failed:', message);
    return { result: emptyResult('ai-failed'), aiFailed: true, aiError: message };
  }
}

/**
 * AI-first extraction: cloud provider (via background) → regex i18n → JsonLd fallback.
 * API keys are never read in the content script; extraction runs in the service worker.
 * @param {{ regionText?: string, pageMeta?: unknown, signal?: AbortSignal } | string} input
 */
export async function runExtraction(input) {
  const context = normalizeInput(input);

  candidexDevLog('[AiCapture] Running primary AI extraction...');
  const { result: aiResult, aiFailed, aiError } = await extractWithPrimaryAi(context);
  let result = aiResult;

  if (!hasAllCoreFields(result)) {
    candidexDevLog('[AiCapture] Applying regex fallback...');
    result = fillNullFieldsFromFallback(result, extractWithRegexPipeline(context));
  }

  if (!hasAllCoreFields(result)) {
    candidexDevLog('[AiCapture] Applying JsonLd fallback...');
    result = fillNullFieldsFromFallback(result, extractWithJsonLd(context));
  }

  return finalizeExtraction(result, context, aiFailed, aiError);
}