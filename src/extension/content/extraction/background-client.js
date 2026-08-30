import { MSG } from '../../shared/constants.js';
import { isTransportFailure } from '../../shared/extraction-errors.js';

/**
 * Content wait budget for a single EXTRACT_TEXT round-trip.
 * Must stay under review-card EXTRACTION_TIMEOUT_MS (50000) and align with
 * background EXTRACT_PROVIDER_TIMEOUT_MS (40000) in messages.js.
 */
const EXTRACT_MESSAGE_TIMEOUT_MS = 45000;
const TRANSPORT_RETRY_DELAY_MS = 400;

function rejectIfAborted(signal) {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Background extraction aborted', 'AbortError'));
  }
  return null;
}

function sendExtractOnce(input) {
  const aborted = rejectIfAborted(input?.signal);
  if (aborted) return aborted;

  return new Promise((resolve, reject) => {
    const signal = input?.signal;
    let settled = false;

    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onAbort);
      fn(value);
    };

    const onAbort = () => {
      settle(reject, new DOMException('Background extraction aborted', 'AbortError'));
    };

    const timeoutId = setTimeout(() => {
      settle(reject, new Error('Background extraction request timed out'));
    }, EXTRACT_MESSAGE_TIMEOUT_MS);

    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      chrome.runtime.sendMessage(
        {
          action: MSG.EXTRACT_TEXT,
          regionText: input.regionText || '',
          pageMeta: input.pageMeta || null
        },
        (response) => {
          if (chrome.runtime.lastError) {
            settle(reject, new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response?.success) {
            settle(resolve, response.result);
            return;
          }
          settle(reject, new Error(response?.error || 'Unknown background extraction error'));
        },
      );
    } catch (err) {
      settle(reject, err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Ask the background service worker to run the active cloud provider.
 * API keys stay in the background (chrome.storage) — never sent from content.
 * Retries once on MV3 message-port / SW wake failures.
 * @param {{ regionText: string, pageMeta?: unknown, signal?: AbortSignal }} input
 */
export async function extractWithActiveCloudProvider(input) {
  try {
    return await sendExtractOnce(input);
  } catch (err) {
    if (input?.signal?.aborted) {
      throw err;
    }
    if (!isTransportFailure(err)) {
      throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, TRANSPORT_RETRY_DELAY_MS));
    return sendExtractOnce(input);
  }
}

export { isTransportFailure, EXTRACT_MESSAGE_TIMEOUT_MS };