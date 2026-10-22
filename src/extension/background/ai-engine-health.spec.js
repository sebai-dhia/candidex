import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { incrementProviderFailures, resetProviderFailures } from './ai-engine-health.js';

function createStorageArea() {
  return {
    data: {},
    get(keys, cb) {
      const key = keys[0];
      cb(this.data[key] ? { [key]: this.data[key] } : {});
    },
    set(payload, cb) {
      Object.assign(this.data, payload);
      cb();
    },
    remove(keys, cb) {
      for (const key of keys) delete this.data[key];
      cb();
    }
  };
}

describe('ai-engine-health', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: { lastError: undefined },
      storage: {
        local: createStorageArea(),
        session: createStorageArea()
      },
      action: {
        setBadgeText: vi.fn(),
        setBadgeBackgroundColor: vi.fn()
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('marks degraded after three consecutive failures', async () => {
    chrome.storage.local.data.aiEngineConfig = {
      providerId: 'groq',
      apiKey: 'test-key'
    };

    await incrementProviderFailures(new Error('401 unauthorized'));
    await incrementProviderFailures(new Error('401 unauthorized'));
    const state = await incrementProviderFailures(new Error('401 unauthorized'));

    expect(state.consecutiveFailures).toBe(3);
    expect(state.healthStatus).toBe('degraded');
    expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
  });

  it('degrades at once when the key is rejected', async () => {
    chrome.storage.local.data.aiEngineConfig = { providerId: 'groq', apiKey: 'bad-key' };

    const state = await incrementProviderFailures(Object.assign(new Error('Invalid API key'), { code: 'AUTH_FAILED', status: 401 }));

    expect(state.consecutiveFailures).toBe(1);
    expect(state.healthStatus).toBe('degraded');
    expect(state.lastFailureKind).toBe('auth');
  });

  it('does not degrade on a single non-auth failure', async () => {
    chrome.storage.local.data.aiEngineConfig = { providerId: 'groq', apiKey: 'key' };

    const state = await incrementProviderFailures(new Error('HTTP 500'));

    expect(state.healthStatus).toBe('healthy');
    expect(state.lastFailureKind).toBe('other');
  });

  it('resets health on success', async () => {
    chrome.storage.local.data.aiEngineConfig = {
      providerId: 'groq',
      apiKey: 'test',
      consecutiveFailures: 3,
      healthStatus: 'degraded'
    };

    const state = await resetProviderFailures();
    expect(state.consecutiveFailures).toBe(0);
    expect(state.healthStatus).toBe('healthy');
    expect(state.lastFailureKind).toBeUndefined();
    expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
  });
});