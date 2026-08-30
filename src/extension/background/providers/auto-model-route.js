export function isModelUnavailableError(error) {
  const status = error?.status;
  const message = String(error?.message || '').toLowerCase();
  return (
    status === 404 ||
    (status === 400 && /does not exist|not found|model.*unavailable|invalid model/i.test(message))
  );
}

/**
 * Try models in order. Retry on 429/503 and unavailable model IDs. Stop on 401.
 * @param {string[]} models
 * @param {(model: string) => Promise<unknown>} callModel
 * @param {{ maxAttempts?: number }} [options]
 */
export async function autoModelRoute(models, callModel, options = {}) {
  const maxAttempts = Math.min(options.maxAttempts ?? 3, models.length);
  const list = models.slice(0, maxAttempts);
  let lastError = null;

  for (const model of list) {
    try {
      return await callModel(model);
    } catch (error) {
      lastError = error;
      const status = error?.status ?? error?.httpStatus;
      if (status === 401 || status === 403) {
        const authError = new Error(error?.message || 'Invalid API key. Reconfigure your Personal AI Engine.')
        authError.status = status;
        authError.code = 'AUTH_FAILED';
        throw authError;
      }
      if (status === 429 || status === 503 || isModelUnavailableError(error)) {
        continue;
      }
      throw error;
    }
  }

  const exhausted = Object.assign(
    new Error(lastError?.message || 'All models exhausted for this provider'),
    {
      code: 'MODELS_EXHAUSTED',
      modelUnavailable: isModelUnavailableError(lastError),
      cause: lastError
    }
  );
  throw exhausted;
}

/**
 * Attach HTTP status onto Error for routing decisions.
 * @param {Response} response
 * @param {string} bodyText
 */
export function httpErrorFromResponse(response, bodyText) {
  let message = `HTTP ${response.status}`;
  try {
    const parsed = JSON.parse(bodyText);
    message =
      parsed?.error?.message ||
      parsed?.message ||
      parsed?.error ||
      message;
  } catch {
    if (bodyText) message = bodyText.slice(0, 200);
  }

  const error = new Error(typeof message === 'string' ? message : `HTTP ${response.status}`);
  error.status = response.status;
  return error;
}