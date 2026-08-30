import { afterEach, describe, expect, it, vi } from 'vitest';
import { MSG } from '../../shared/constants.js';
import { extractWithActiveCloudProvider, isTransportFailure } from './background-client.js';

describe('isTransportFailure', () => {
  it('detects MV3 port-closed errors', () => {
    expect(
      isTransportFailure(new Error('The message port closed before a response was received.')),
    ).toBe(true);
    expect(isTransportFailure(new Error('Receiving end does not exist'))).toBe(true);
    expect(isTransportFailure(new Error('rate limited'))).toBe(false);
  });
});

describe('extractWithActiveCloudProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retries once when the message port closes', async () => {
    const sendMessage = vi
      .fn()
      .mockImplementationOnce((_payload, cb) => {
        globalThis.chrome.runtime.lastError = {
          message: 'The message port closed before a response was received.'
        };
        cb(undefined);
      })
      .mockImplementationOnce((_payload, cb) => {
        globalThis.chrome.runtime.lastError = undefined;
        cb({
          success: true,
          result: {
            company: 'SATELIANCE',
            role: 'QA Senior',
            country: 'Tunis, Tunisie',
            workType: 'On-site',
            source: 'groq'
          }
        });
      });

    vi.stubGlobal('chrome', {
      runtime: {
        lastError: undefined,
        sendMessage
      }
    });

    const result = await extractWithActiveCloudProvider({regionText: 'QA Senior\nSATELIANCE\nTunis, Tunisie'});

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage.mock.calls[0][0].action).toBe(MSG.EXTRACT_TEXT);
    expect(result.company).toBe('SATELIANCE');
    expect(result.role).toBe('QA Senior');
  });
});