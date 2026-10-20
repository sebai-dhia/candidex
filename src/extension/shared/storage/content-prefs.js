import { MSG } from '../constants.js';

/**
 * Read allowlisted prefs via the background worker.
 * Content scripts cannot use chrome.storage.local when access is TRUSTED_CONTEXTS.
 * @returns {Promise<{ aiConsentGiven: boolean, candidexLocale: string | null }>}
 */
export function getContentPrefs() {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: MSG.GET_CONTENT_PREFS }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          resolve({ aiConsentGiven: false, candidexLocale: null });
          return;
        }
        resolve({
          aiConsentGiven: !!response.aiConsentGiven,
          candidexLocale: typeof response.candidexLocale === 'string' ? response.candidexLocale : null
        });
      });
    } catch {
      resolve({ aiConsentGiven: false, candidexLocale: null });
    }
  });
}

/**
 * Persist AI capture consent via the background worker. `frameOrigins` are the page's
 * cross-origin iframe sites: the worker asks Chrome for access to them in the same click.
 * @param {string[]} [frameOrigins]
 * @returns {Promise<boolean>}
 */
export function setAiConsentGiven(frameOrigins = []) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: MSG.SET_AI_CONSENT, frameOrigins }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          resolve(false);
          return;
        }
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}