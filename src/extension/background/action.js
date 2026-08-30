import { MSG } from '../shared/constants.js';

const RESTRICTED_PROTOCOLS = ['chrome:', 'edge:', 'opera:', 'about:', 'chrome-extension:'];

function injectContentScript(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });
}

function sendToTab(tabId, action) {
  return chrome.tabs.sendMessage(tabId, { action }).catch(() => {
    return injectContentScript(tabId).then(() => chrome.tabs.sendMessage(tabId, { action }));
  });
}

export function registerActionListener() {
  chrome.action.onClicked.addListener((tab) => {
    if (!tab.id || !tab.url) return;

    const isRestricted = RESTRICTED_PROTOCOLS.some((protocol) => tab.url.startsWith(protocol));
    if (isRestricted) {
      console.warn('Candidex cannot be opened on restricted browser pages. Please try on a normal website.');
      return;
    }

    sendToTab(tab.id, MSG.TOGGLE_OVERLAY).catch((error) => {
      console.error('Failed to open Candidex on this page:', error);
    });
  });
}