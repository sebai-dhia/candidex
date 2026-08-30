import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MSG } from '../shared/constants.js';
import { registerMessageListener } from './messages.js';

describe('content prefs messaging', () => {
  /** @type {((request: any, sender: any, sendResponse: any) => boolean) | null} */
  let listener = null;

  beforeEach(() => {
    listener = null;
    vi.stubGlobal('chrome', {
      runtime: {
        id: 'candidex-test',
        lastError: undefined,
        onMessage: {
          addListener(fn) {
            listener = fn;
          }
        }
      },
      storage: {
        local: {
          data: {},
          get(keys, cb) {
            const out = {};
            for (const key of keys) {
              if (key in this.data) out[key] = this.data[key];
            }
            cb(out);
          },
          set(payload, cb) {
            Object.assign(this.data, payload);
            cb();
          }
        }
      }
    });
    registerMessageListener();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns allowlisted prefs only', () => {
    chrome.storage.local.data = {
      aiConsentGiven: true,
      candidexLocale: 'fr',
      aiEngineConfig: { apiKey: 'secret' }
    };

    const sendResponse = vi.fn();
    const keptOpen = listener({ action: MSG.GET_CONTENT_PREFS }, { id: 'candidex-test', tab: { id: 1 } }, sendResponse);

    expect(keptOpen).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      aiConsentGiven: true,
      candidexLocale: 'fr'
    });
    expect(JSON.stringify(sendResponse.mock.calls[0][0])).not.toContain('secret');
  });

  it('persists AI consent', () => {
    const sendResponse = vi.fn();
    const keptOpen = listener({ action: MSG.SET_AI_CONSENT }, { id: 'candidex-test', tab: { id: 1 } }, sendResponse);

    expect(keptOpen).toBe(true);
    expect(chrome.storage.local.data.aiConsentGiven).toBe(true);
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });
});