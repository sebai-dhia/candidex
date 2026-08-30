import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MSG } from '../shared/constants.js';
import { registerMessageListener } from './messages.js';

describe('background message security', () => {
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
            cb({});
          },
          set(_payload, cb) {
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

  it('rejects EXTRACT_TEXT from another extension', () => {
    const sendResponse = vi.fn();
    listener(
      { action: MSG.EXTRACT_TEXT, regionText: 'hello' },
      { id: 'other-extension', tab: { id: 1 } },
      sendResponse
    );

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'Unauthorized sender'
    });
  });

  it('rejects privileged messages without a sender tab', () => {
    const sendResponse = vi.fn();
    listener({ action: MSG.GET_CONTENT_PREFS }, { id: 'candidex-test' }, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'Missing sender tab context'
    });
  });
});