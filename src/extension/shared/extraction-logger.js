import { candidexDevInfo } from './candidex-env.js';

const LOG_PREFIX = '[Candidex][AiExtract]';

export function maskApiKey(apiKey) {
  const key = String(apiKey || '').trim();
  if (!key) return '(empty)';
  if (key.length <= 10) return `${key.slice(0, 3)}***`;
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

export function logExtractionConfig({
  providerId,
  apiKey,
  models,
  modelsSource,
  regionTextLength,
  pageMeta,
  refreshedAfterModelError
}) {
  candidexDevInfo(`${LOG_PREFIX} 1/3 Config`, {
    providerId,
    apiKey: maskApiKey(apiKey),
    models,
    modelsSource: modelsSource || null,
    regionTextChars: regionTextLength,
    pageTitle: pageMeta?.title || null,
    refreshedAfterModelError: refreshedAfterModelError || false
  });
}

export function logHttpAttempt({ providerId, model, status, ok, durationMs, errorMessage }) {
  const payload = {
    providerId,
    model,
    httpStatus: status,
    ok,
    durationMs
  };
  if (errorMessage) payload.error = errorMessage;
  candidexDevInfo(`${LOG_PREFIX} 2/3 HTTP ${ok ? 'OK' : 'FAIL'}`, payload);
}

export function logExtractionResult({ providerId, source, fields, confidence, durationMs }) {
  candidexDevInfo(`${LOG_PREFIX} 3/3 Result`, {
    providerId,
    source,
    durationMs,
    fields,
    confidence
  });
}

export function logExtractionFailure({ providerId, message, durationMs }) {
  console.warn(`${LOG_PREFIX} Failed`, {
    providerId,
    message,
    durationMs
  });
}