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
      permissions: { request: vi.fn().mockResolvedValue(true) },
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

  it('persists AI consent', async () => {
    const sendResponse = vi.fn();
    const keptOpen = listener({ action: MSG.SET_AI_CONSENT }, { id: 'candidex-test', tab: { id: 1 } }, sendResponse);

    expect(keptOpen).toBe(true);
    expect(chrome.storage.local.data.aiConsentGiven).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ success: true }));
    expect(chrome.permissions.request).not.toHaveBeenCalled();
  });

  it('asks Chrome for valid iframe sites in the same click and ignores anything else', async () => {
    const sendResponse = vi.fn();
    listener(
      {
        action: MSG.SET_AI_CONSENT,
        frameOrigins: ['https://revolutpeople.com/*', '<all_urls>', 'https://*/*', 42]
      },
      { id: 'candidex-test', tab: { id: 1 } },
      sendResponse
    );

    expect(chrome.permissions.request).toHaveBeenCalledWith({ origins: ['https://revolutpeople.com/*'] });
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ success: true }));
  });

  it('still saves consent when Chrome refuses the site permission', async () => {
    chrome.permissions.request.mockRejectedValueOnce(new Error('This function must be called during a user gesture'));
    const sendResponse = vi.fn();
    listener(
      { action: MSG.SET_AI_CONSENT, frameOrigins: ['https://revolutpeople.com/*'] },
      { id: 'candidex-test', tab: { id: 1 } },
      sendResponse
    );

    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith({ success: true }));
    expect(chrome.storage.local.data.aiConsentGiven).toBe(true);
  });
});