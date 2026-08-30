import { discoverModels } from '../../../contracts/ai-provider/model-discovery.js';
import { isModelUnavailableError } from '../providers/auto-model-route.js';
import { setAiEngineConfigInStorage } from './config-storage.js';

/**
 * Whether a failed extraction likely means the cached model list is stale.
 * @param {unknown} error
 */
export function shouldRediscoverAfterFailure(error) {
  const err = /** @type {{ modelUnavailable?: boolean; cause?: unknown }} */ (error);
  if (err?.modelUnavailable) return true;
  if (isModelUnavailableError(err)) return true;
  if (isModelUnavailableError(err?.cause)) return true;
  return false;
}

/**
 * @param {string[] | undefined} previous
 * @param {{ models?: string[]; source?: string }} discovery
 */
export function shouldRetryAfterRediscovery(previous, discovery) {
  const next = discovery?.models;
  if (!Array.isArray(next) || next.length === 0) return false;
  if (discovery.source === 'discovered') return true;
  return JSON.stringify(previous || []) !== JSON.stringify(next);
}

/**
 * Fetch fresh models from the provider and persist them.
 * @param {Record<string, unknown>} config
 */
export async function refreshResolvedModels(config) {
  const discovery = await discoverModels(config.providerId, config.apiKey);
  const persistKey = config.persistKey === 'session' ? 'session' : 'local';

  await setAiEngineConfigInStorage(
    {
      ...config,
      resolvedModels: discovery.models,
      modelsResolvedAt: discovery.resolvedAt,
      modelsSource: discovery.source
    },
    persistKey
  );

  return discovery;
}