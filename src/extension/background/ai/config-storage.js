const AI_ENGINE_STORAGE_KEY = 'aiEngineConfig';

function readArea(area) {
  return new Promise((resolve, reject) => {
    area.get([AI_ENGINE_STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result[AI_ENGINE_STORAGE_KEY] || null);
    });
  });
}

function writeArea(area, config) {
  return new Promise((resolve, reject) => {
    area.set({ [AI_ENGINE_STORAGE_KEY]: config }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function removeArea(area) {
  return new Promise((resolve, reject) => {
    area.remove([AI_ENGINE_STORAGE_KEY], () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Read AI config from session storage first, then local.
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function getAiEngineConfigFromStorage() {
  if (chrome.storage?.session) {
    const sessionConfig = await readArea(chrome.storage.session);
    if (sessionConfig?.providerId && sessionConfig?.apiKey) {
      return sessionConfig;
    }
  }

  return readArea(chrome.storage.local);
}

/**
 * Persist AI config to the chosen storage area and clear the other.
 * @param {Record<string, unknown>} config
 * @param {'local' | 'session'} [persistKey='local']
 */
export async function setAiEngineConfigInStorage(config, persistKey = 'local') {
  const target =
    persistKey === 'session' && chrome.storage?.session
      ? chrome.storage.session
      : chrome.storage.local;
  const other =
    persistKey === 'session' && chrome.storage?.session
      ? chrome.storage.local
      : chrome.storage.session;

  if (other) {
    await removeArea(other);
  }
  await writeArea(target, config);
}

/**
 * Remove AI config from both storage areas.
 */
export async function clearAiEngineConfigFromStorage() {
  await removeArea(chrome.storage.local);
  if (chrome.storage?.session) {
    await removeArea(chrome.storage.session);
  }
}

export { AI_ENGINE_STORAGE_KEY };