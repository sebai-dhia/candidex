import messages from '../../../contracts/extension-messaging/messages.json';
import { PORT_CONTENT } from '../../../contracts/extension-messaging/ports.js';
import { parseRuntimeMessage } from '../../../contracts/extension-messaging/validate.js';

/** @type {chrome.runtime.Port | null} */
let contentPort = null;

/** @type {Array<(message: Record<string, unknown>) => void>} */
const listeners = [];

function ensureContentPort() {
  if (contentPort) return contentPort;
  if (typeof chrome === 'undefined' || !chrome?.runtime?.connect) return null;

  try {
    contentPort = chrome.runtime.connect({ name: PORT_CONTENT });
    contentPort.onMessage.addListener((raw) => {
      const message = parseRuntimeMessage(raw);
      if (!message) return;
      for (const listener of listeners) {
        listener(message);
      }
    });
    contentPort.onDisconnect.addListener(() => {
      contentPort = null;
      window.setTimeout(() => ensureContentPort(), 500);
    });
  } catch (error) {
    console.error('[Candidex] Failed to open content port:', error);
    contentPort = null;
  }

  return contentPort;
}

/**
 * @param {(message: Record<string, unknown>) => void} listener
 */
export function onPanelMessage(listener) {
  listeners.push(listener);
  ensureContentPort();
}

/**
 * @param {Record<string, unknown>} message
 */
export function postToPanel(message) {
  const port = ensureContentPort();
  if (!port) {
    throw new Error('Content port unavailable');
  }
  port.postMessage(message);
}

/**
 * Notify the Angular panel that the overlay opened (refresh apps).
 */
export function notifyOverlayOpened() {
  try {
    postToPanel({ action: messages.OVERLAY_OPENED });
  } catch (error) {
    console.warn('[Candidex] Failed to notify overlay opened:', error);
  }
}

/**
 * @param {boolean} isFullscreen
 */
export function notifyFullscreenState(isFullscreen) {
  try {
    postToPanel({
      action: messages.FULLSCREEN_STATE_CHANGED,
      isFullscreen: !!isFullscreen
    });
  } catch (error) {
    console.warn('[Candidex] Failed to notify fullscreen state:', error);
  }
}

/**
 * @param {Record<string, unknown>} payload
 */
export function requestSaveAiJob(payload) {
  postToPanel({ action: messages.SAVE_AI_JOB, payload });
}

/**
 * @param {string} path
 */
export function requestNavigate(path) {
  postToPanel({ action: messages.NAVIGATE, path });
}

export { messages as MSG };