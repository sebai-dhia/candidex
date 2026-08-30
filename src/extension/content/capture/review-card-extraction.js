import { runExtraction } from '../extraction/index.js';

/** Overall content-side budget for the capture → extraction pipeline. */
const EXTRACTION_TIMEOUT_MS = 50000;

const EMPTY_JOB_DATA = {
  company: null,
  role: null,
  country: null,
  workType: null,
  confidence: { company: 0, role: 0, country: 0, workType: 0 },
  source: 'error',
};

/**
 * Run `work` with an AbortController timeout.
 * Rejects as soon as the timeout (or external signal) aborts — does not leave
 * an uncancellable Promise.race timer hanging after success.
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} work
 * @param {number} ms
 * @param {string} timeoutMessage
 * @param {AbortSignal} [externalSignal]
 * @returns {Promise<T>}
 */
function withAbortTimeout(work, ms, timeoutMessage, externalSignal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      return Promise.reject(new Error(timeoutMessage));
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
      controller.signal.removeEventListener('abort', onAbort);
    };

    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };

    const onAbort = () => settle(reject, new Error(timeoutMessage));

    if (controller.signal.aborted) {
      onAbort();
      return;
    }

    controller.signal.addEventListener('abort', onAbort, { once: true });

    work(controller.signal).then(
      (value) => settle(resolve, value),
      (err) => {
        if (controller.signal.aborted) {
          settle(reject, new Error(timeoutMessage));
          return;
        }
        settle(reject, err);
      },
    );
  });
}

/**
 * Run the AI-first extraction pipeline and wait for completion.
 * @param {{ regionText?: string, pageMeta?: unknown, signal?: AbortSignal }} payload
 */
export async function extractJobDataFromCapture(payload) {
  try {
    const result = await withAbortTimeout(
      (signal) =>
        runExtraction({
          regionText: payload.regionText || '',
          pageMeta: payload.pageMeta || null,
          signal
        }),
      EXTRACTION_TIMEOUT_MS,
      'Extraction timed out waiting for AI response',
      payload.signal
    );

    const { extractionMeta, ...jobData } = result;
    return {
      jobData,
      extractionMeta: extractionMeta || { usedFallback: false, aiFailed: false, source: jobData.source },
      extractionError: null
    };
  } catch (error) {
    console.error('[AiCapture] Extraction error:', error);
    return {
      jobData: { ...EMPTY_JOB_DATA },
      extractionMeta: { usedFallback: true, source: 'error' },
      extractionError: error?.message || String(error)
    };
  }
}