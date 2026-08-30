const TRANSPORT_PATTERN = /message port closed|Receiving end does not exist|Extension context invalidated|timed out/i;

export function createExtractionError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  if (status != null) error.status = status;
  return error;
}

export function isProviderHttpFailure(error) {
  const status = error?.status;
  if (typeof status === 'number' && (status >= 400 || status === 0)) {
    return true;
  }
  const message = String(error?.message || '');
  return (
    /empty model response|empty openrouter response|empty anthropic response|empty gemini response|malformed|invalid json|failed to fetch/i.test(
      message,
    ) || TRANSPORT_PATTERN.test(message)
  );
}

export function isRetryableHttpStatus(status) {
  return status === 429 || status === 502 || status === 503;
}

export function isTransportFailure(error) {
  return TRANSPORT_PATTERN.test(String(error?.message || ''));
}

export function shouldCountTowardDegraded(error) {
  return isProviderHttpFailure(error) || isTransportFailure(error);
}

export function sanitizeFailureMessage(error) {
  const message = String(error?.message || 'Provider request failed').slice(0, 200);
  return message.replace(/sk-[a-zA-Z0-9]+/g, '[redacted]');
}