import messages from '../../contracts/extension-messaging/messages.json';
import { PORT_CONTENT, PORT_PANEL } from '../../contracts/extension-messaging/ports.js';
import { parseRuntimeMessage } from '../../contracts/extension-messaging/validate.js';

const MSG = messages;

/** @type {Set<chrome.runtime.Port>} */
const panelPorts = new Set();

/** @type {Set<chrome.runtime.Port>} */
const contentPorts = new Set();

/**
 * @param {chrome.runtime.Port} port
 * @returns {number | undefined}
 */
function getTabId(port) {
  return port.sender?.tab?.id;
}

/**
 * Relay a message to the target port set, targeting the matching tab ID when available.
 * @param {chrome.runtime.Port} sourcePort
 * @param {Set<chrome.runtime.Port>} targetPorts
 * @param {Record<string, unknown>} message
 */
function relayMessage(sourcePort, targetPorts, message) {
  const sourceTabId = getTabId(sourcePort);

  if (sourceTabId !== undefined) {
    const matching = Array.from(targetPorts).filter(
      (p) => getTabId(p) === sourceTabId
    );
    if (matching.length > 0) {
      // Send to the active port(s) for this specific tab only
      for (const target of matching) {
        try {
          target.postMessage(message);
        } catch {
          targetPorts.delete(target);
        }
      }
      return;
    }
  }

  // Fallback if tabId is not available (e.g. untabbed context or test harness)
  for (const port of targetPorts) {
    try {
      port.postMessage(message);
    } catch {
      targetPorts.delete(port);
    }
  }
}

/**
 * Relay validated panel↔content messages through the privileged background worker.
 * Host pages cannot open these ports without externally_connectable.
 */
export function registerPortRelay() {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === PORT_PANEL) {
      panelPorts.add(port);
      port.onDisconnect.addListener(() => panelPorts.delete(port));
      port.onMessage.addListener((raw) => {
        const message = parseRuntimeMessage(raw);
        if (!message) return;

        if (
          message.action === MSG.CLOSE_OVERLAY ||
          message.action === MSG.TOGGLE_FULLSCREEN ||
          message.action === MSG.START_AI_CAPTURE ||
          message.action === MSG.ESCAPE_PRESSED ||
          message.action === MSG.SAVE_AI_JOB_RESPONSE
        ) {
          relayMessage(port, contentPorts, message);
        }
      });
      try {
        port.postMessage({ action: MSG.PANEL_HELLO });
      } catch {
        panelPorts.delete(port);
      }
      return;
    }

    if (port.name === PORT_CONTENT) {
      contentPorts.add(port);
      port.onDisconnect.addListener(() => contentPorts.delete(port));
      port.onMessage.addListener((raw) => {
        const message = parseRuntimeMessage(raw);
        if (!message) return;

        if (
          message.action === MSG.SAVE_AI_JOB ||
          message.action === MSG.NAVIGATE ||
          message.action === MSG.FULLSCREEN_STATE_CHANGED ||
          message.action === MSG.OVERLAY_OPENED
        ) {
          relayMessage(port, panelPorts, message);
        }
      });
      try {
        port.postMessage({ action: MSG.CONTENT_HELLO });
      } catch {
        contentPorts.delete(port);
      }
    }
  });
}