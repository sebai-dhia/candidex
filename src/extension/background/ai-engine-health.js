import { getAiEngineConfigFromStorage, setAiEngineConfigInStorage } from './ai/config-storage.js';

const DEGRADED_THRESHOLD = 3;

export async function incrementProviderFailures(error) {
  const config = (await getAiEngineConfigFromStorage()) || {};
  if (!config?.providerId || !config?.apiKey) {
    return config;
  }

  const consecutiveFailures = (config.consecutiveFailures || 0) + 1;
  const degraded = consecutiveFailures >= DEGRADED_THRESHOLD;

  const next = {
    ...config,
    consecutiveFailures,
    healthStatus: degraded ? 'degraded' : config.healthStatus || 'healthy',
    lastFailureAt: new Date().toISOString(),
    lastFailureMessage: String(error?.message || 'Provider request failed').slice(0, 200)
  };

  await setAiEngineConfigInStorage(next, config.persistKey === 'session' ? 'session' : 'local');
  return next;
}

export async function resetProviderFailures() {
  const config = await getAiEngineConfigFromStorage();
  if (!config?.providerId || !config?.apiKey) {
    return config;
  }

  const next = {
    ...config,
    consecutiveFailures: 0,
    healthStatus: 'healthy',
    lastFailureAt: undefined,
    lastFailureMessage: undefined
  };

  await setAiEngineConfigInStorage(next, config.persistKey === 'session' ? 'session' : 'local');
  return next;
}

/**
 * The toolbar icon carries no badge: engine health is shown by the dots in the panel.
 * Clears a "!" left behind by an earlier version.
 */
export function clearLegacyBadge() {
  try {
    chrome.action.setBadgeText({ text: '' });
  } catch {
    // ignore when action API unavailable in tests
  }
}
