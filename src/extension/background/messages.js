import { MSG } from '../shared/constants.js';
import { cropScreenshot } from './screenshot-cropper.js';
import { extractWithActiveProvider } from './providers/registry.js';
import { inferPlatform } from './platform.js';
import { incrementProviderFailures, resetProviderFailures } from './ai-engine-health.js';
import { isModelsCacheStale } from '../../contracts/ai-provider/model-discovery.js';
import { getAiEngineConfigFromStorage } from './ai/config-storage.js';
import { refreshResolvedModels, shouldRediscoverAfterFailure, shouldRetryAfterRediscovery } from './ai/model-refresh.js';

const CAPTURE_TIMEOUT_MS = 15000;

/**
 * Timeout budgets (content + background):
 * - Content overall capture pipeline: EXTRACTION_TIMEOUT_MS = 50000 (review-card-extraction)
 * - Content EXTRACT_TEXT wait: EXTRACT_MESSAGE_TIMEOUT_MS = 45000 (background-client)
 * - Background provider fetch abort: EXTRACT_PROVIDER_TIMEOUT_MS (below)
 */
const EXTRACT_PROVIDER_TIMEOUT_MS = 40000;

export function registerMessageListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === MSG.CAPTURE_AREA) {
      if (rejectUntrustedContentSender(sender, sendResponse)) return true;
      handleCaptureArea(request, sender, sendResponse);
      return true;
    }

    if (request.action === MSG.EXTRACT_TEXT) {
      if (rejectUntrustedContentSender(sender, sendResponse)) return true;
      handleExtractText(request)
        .then((result) => {
          safeSendResponse(sendResponse, { success: true, result });
          void resetProviderFailures().catch(() => {});
        })
        .catch((err) => {
          safeSendResponse(sendResponse, {
            success: false,
            error: err?.message || String(err)
          });
          void incrementProviderFailures(err).catch(() => {});
        });
      return true;
    }

    if (request.action === MSG.GET_CONTENT_PREFS) {
      if (rejectUntrustedContentSender(sender, sendResponse)) return true;
      handleGetContentPrefs(sendResponse);
      return true;
    }

    if (request.action === MSG.SET_AI_CONSENT) {
      if (rejectUntrustedContentSender(sender, sendResponse)) return true;
      handleSetAiConsent(sendResponse);
      return true;
    }

    return false;
  });
}

const AI_CONSENT_KEY = 'aiConsentGiven';
const CAPTURE_LOCALE_KEY = 'candidexLocale';

function rejectUntrustedContentSender(sender, sendResponse) {
  if (sender?.id !== chrome.runtime.id) {
    safeSendResponse(sendResponse, { success: false, error: 'Unauthorized sender' });
    return true;
  }
  if (!sender?.tab?.id) {
    safeSendResponse(sendResponse, { success: false, error: 'Missing sender tab context' });
    return true;
  }
  return false;
}

function handleGetContentPrefs(sendResponse) {
  chrome.storage.local.get([AI_CONSENT_KEY, CAPTURE_LOCALE_KEY], (result) => {
    if (chrome.runtime.lastError) {
      safeSendResponse(sendResponse, {
        success: false,
        error: chrome.runtime.lastError.message
      });
      return;
    }
    safeSendResponse(sendResponse, {
      success: true,
      aiConsentGiven: !!result?.[AI_CONSENT_KEY],
      candidexLocale:
        typeof result?.[CAPTURE_LOCALE_KEY] === 'string' ? result[CAPTURE_LOCALE_KEY] : null
    });
  });
}

function handleSetAiConsent(sendResponse) {
  chrome.storage.local.set({ [AI_CONSENT_KEY]: true }, () => {
    if (chrome.runtime.lastError) {
      safeSendResponse(sendResponse, {
        success: false,
        error: chrome.runtime.lastError.message
      });
      return;
    }
    safeSendResponse(sendResponse, { success: true });
  });
}

function safeSendResponse(sendResponse, payload) {
  try {
    sendResponse(payload);
  } catch {
    // Message channel may already be closed in MV3 service workers.
  }
}

async function notifyTab(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    console.error('[Candidex] Failed to notify content script:', err);
  }
}

function captureTabImage(tabId) {
  return new Promise((resolve, reject) => {
    const options = { format: 'jpeg', quality: 100 };

    if (typeof chrome.tabs.captureTab === 'function') {
      chrome.tabs.captureTab(tabId, options, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          reject(new Error(chrome.runtime.lastError?.message || 'Failed to capture tab'));
          return;
        }
        resolve(dataUrl);
      });
      return;
    }

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab?.windowId) {
        reject(new Error(chrome.runtime.lastError?.message || 'Failed to resolve capture tab'));
        return;
      }

      chrome.tabs.captureVisibleTab(tab.windowId, options, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          reject(new Error(chrome.runtime.lastError?.message || 'Failed to capture visible tab'));
          return;
        }
        resolve(dataUrl);
      });
    });
  });
}

async function handleCaptureArea(request, sender, sendResponse) {
  const tabId = sender.tab?.id;
  const tabUrl = sender.tab?.url;

  if (!tabId || !tabUrl) {
    safeSendResponse(sendResponse, { success: false, error: 'Missing sender tab context' });
    return;
  }

  let timedOut = false;
  const timeoutId = setTimeout(async () => {
    timedOut = true;
    await notifyTab(tabId, {
      action: MSG.CAPTURE_AREA_FAILED,
      error: 'Screenshot capture timed out. Reload the page and try again.',
    });
    safeSendResponse(sendResponse, { success: false, error: 'Capture timed out' });
  }, CAPTURE_TIMEOUT_MS);

  try {
    const dataUrl = await captureTabImage(tabId);
    if (timedOut) return;

    const croppedDataUrl = await cropScreenshot(dataUrl, request.rect);
    if (timedOut) return;

    const platform = inferPlatform(tabUrl);
    const resolvedJobLink =
      typeof request.jobLink === 'string' && request.jobLink.trim()
        ? request.jobLink.trim()
        : tabUrl;
    const payload = {
      screenshotDataUrl: croppedDataUrl,
      regionText: request.regionText || '',
      pageMeta: request.pageMeta || null,
      platform,
      jobLink: resolvedJobLink
    };

    await notifyTab(tabId, {
      action: MSG.AI_SCREENSHOT_READY,
      payload
    });

    safeSendResponse(sendResponse, { success: true });
  } catch (err) {
    console.error('[Candidex] Error processing screenshot:', err);
    const errorMessage = err.message || String(err);

    await notifyTab(tabId, {
      action: MSG.CAPTURE_AREA_FAILED,
      error: errorMessage
    });

    safeSendResponse(sendResponse, { success: false, error: errorMessage });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Long provider fetches can idle the MV3 service worker. Periodic chrome API
 * calls keep the worker alive until sendResponse completes.
 */
function startServiceWorkerKeepAlive() {
  const tick = () => {
    try {
      chrome.runtime.getPlatformInfo(() => {});
    } catch {
      // ignore
    }
  };
  tick();
  return setInterval(tick, 20000);
}

async function handleExtractText(request) {
  const keepAliveId = startServiceWorkerKeepAlive();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXTRACT_PROVIDER_TIMEOUT_MS);

  try {
    const config = await getAiEngineConfigFromStorage();
    if (!config?.providerId || !config?.apiKey) {
      throw new Error('Personal AI Engine is not configured. Connect a provider in Candidex.');
    }

    let models = config.resolvedModels;
    if (!Array.isArray(models) || models.length === 0 || isModelsCacheStale(config.modelsResolvedAt)) {
      const discovery = await refreshResolvedModels(config);
      models = discovery.models;
    }

    const input = {
      regionText: request.regionText || request.text || '',
      pageMeta: request.pageMeta || null
    };
    const options = { signal: controller.signal };

    try {
      return await extractWithActiveProvider(
        config.providerId,
        config.apiKey,
        input,
        models,
        options
      );
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error('Background AI extraction timed out');
      }

      if (!shouldRediscoverAfterFailure(error)) {
        throw error;
      }

      const discovery = await refreshResolvedModels(config);
      if (!shouldRetryAfterRediscovery(models, discovery)) {
        throw error;
      }

      return await extractWithActiveProvider(
        config.providerId,
        config.apiKey,
        input,
        discovery.models,
        options
      );
    }
  } finally {
    clearTimeout(timeoutId);
    clearInterval(keepAliveId);
  }
}