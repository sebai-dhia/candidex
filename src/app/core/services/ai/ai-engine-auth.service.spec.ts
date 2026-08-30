import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { WritableSignal } from '@angular/core';
import type {
  AiEngineHealthStatus,
  AiEnginePersistKey,
  AiModelsSource,
  AiProviderId,
} from './ai-provider.types';

type StorageArea = 'local' | 'session';

class MockChromeStorageService {
  localStore = new Map<string, unknown>();
  sessionStore = new Map<string, unknown>();

  get(key: string, area: StorageArea = 'local'): Promise<unknown> {
    const store = area === 'session' ? this.sessionStore : this.localStore;
    return Promise.resolve(store.get(key));
  }

  getMany(keys: string[], area: StorageArea = 'local'): Promise<Record<string, unknown>> {
    const store = area === 'session' ? this.sessionStore : this.localStore;
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      if (store.has(key)) out[key] = store.get(key);
    }
    return Promise.resolve(out);
  }

  set(items: Record<string, unknown>, area: StorageArea = 'local'): Promise<void> {
    const store = area === 'session' ? this.sessionStore : this.localStore;
    for (const [key, value] of Object.entries(items)) store.set(key, value);
    return Promise.resolve();
  }

  remove(keys: string | string[], area: StorageArea = 'local'): Promise<void> {
    const store = area === 'session' ? this.sessionStore : this.localStore;
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) store.delete(key);
    return Promise.resolve();
  }

  async getFromEither(key: string): Promise<unknown> {
    return (await this.get(key, 'session')) ?? (await this.get(key, 'local'));
  }

  async setExclusive(key: string, value: unknown, area: StorageArea): Promise<void> {
    const other: StorageArea = area === 'session' ? 'local' : 'session';
    await this.remove(key, other);
    await this.set({ [key]: value }, area);
  }

  async removeFromBoth(key: string): Promise<void> {
    await this.remove(key, 'local');
    await this.remove(key, 'session');
  }
}

type ModelDiscovery = {
  models: string[];
  resolvedAt: number;
  source: AiModelsSource;
};

const verifyProviderApiKey: Mock<(providerId: AiProviderId, apiKey: string) => Promise<void>> = vi.fn(async () => undefined);

const discoverProviderModels: Mock<(providerId: AiProviderId, apiKey: string) => Promise<ModelDiscovery>> =
  vi.fn(async () => ({
    models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
    resolvedAt: 1234567890,
    source: 'discovered',
  }));

vi.mock('../../../infrastructure/chrome/chrome-storage.service', () => ({
  ChromeStorageService: MockChromeStorageService,
}));

vi.mock('./ai-key-verify', () => ({
  verifyProviderApiKey: (providerId: AiProviderId, apiKey: string) => verifyProviderApiKey(providerId, apiKey)
}));

vi.mock('./discover-models', () => ({
  discoverProviderModels: (providerId: AiProviderId, apiKey: string) =>discoverProviderModels(providerId, apiKey)
}));

type TestableAuthService = {
  storage: MockChromeStorageService;
  isConnected: WritableSignal<boolean>;
  isInitializing: WritableSignal<boolean>;
  activeProviderId: WritableSignal<AiProviderId | null>;
  healthStatus: WritableSignal<AiEngineHealthStatus>;
  lastFailureMessage: WritableSignal<string | null>;
  persistKey: WritableSignal<AiEnginePersistKey>;
  connect: (
    providerId: AiProviderId,
    apiKey: string,
    persistKey?: AiEnginePersistKey
  ) => Promise<void>;
};

describe('AiEngineAuthService.connect', () => {
  let storage: MockChromeStorageService;
  let service: TestableAuthService;

  beforeEach(async () => {
    vi.resetModules();
    verifyProviderApiKey.mockReset();
    verifyProviderApiKey.mockResolvedValue(undefined);
    discoverProviderModels.mockReset();
    discoverProviderModels.mockResolvedValue({
      models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
      resolvedAt: 1234567890,
      source: 'discovered'
    });

    const { ChromeStorageService } = await import('../../../infrastructure/chrome/chrome-storage.service');
    const { AiEngineAuthService: AuthService } = await import('./ai-engine-auth.service');
    const { signal } = await import('@angular/core');

    storage = new ChromeStorageService() as unknown as MockChromeStorageService;
    service = Object.create(AuthService.prototype) as unknown as TestableAuthService;
    service.storage = storage;
    service.isConnected = signal(false);
    service.isInitializing = signal(false);
    service.activeProviderId = signal(null);
    service.healthStatus = signal('healthy');
    service.lastFailureMessage = signal(null);
    service.persistKey = signal('local');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not write storage when verification fails', async () => {
    verifyProviderApiKey.mockRejectedValueOnce(
      new Error('Key rejected by Groq. Check the key and API access.')
    );

    await expect(service.connect('groq', 'gsk_bad')).rejects.toThrow(/Key rejected by Groq/);
    expect(await storage.get('aiEngineConfig')).toBeUndefined();
    expect(service.isConnected()).toBe(false);
    expect(service.activeProviderId()).toBeNull();
  });

  it('saves config after a successful verification', async () => {
    await service.connect('groq', 'gsk_good');

    expect(verifyProviderApiKey).toHaveBeenCalledWith('groq', 'gsk_good');
    expect(discoverProviderModels).toHaveBeenCalledWith('groq', 'gsk_good');

    const saved = await storage.get('aiEngineConfig');
    expect(saved).toMatchObject({
      providerId: 'groq',
      apiKey: 'gsk_good',
      persistKey: 'local',
      healthStatus: 'healthy',
      consecutiveFailures: 0,
      resolvedModels: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
      modelsResolvedAt: 1234567890,
      modelsSource: 'discovered',
    });
    expect(service.isConnected()).toBe(true);
    expect(service.activeProviderId()).toBe('groq');
  });

  it('stores session-only keys in session storage', async () => {
    await service.connect('groq', 'gsk_session', 'session');

    expect(await storage.get('aiEngineConfig', 'session')).toMatchObject({
      providerId: 'groq',
      apiKey: 'gsk_session',
      persistKey: 'session',
    });
    expect(await storage.get('aiEngineConfig', 'local')).toBeUndefined();
    expect(service.persistKey()).toBe('session');
  });
});

describe('AiEngineConfig storage shape', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('stores a single provider config', async () => {
    const { ChromeStorageService } = await import('../../../infrastructure/chrome/chrome-storage.service');
    const storage = new ChromeStorageService() as unknown as MockChromeStorageService;
    const config = {
      providerId: 'groq',
      apiKey: 'gsk_test',
      connectedAt: 1
    };
    await storage.set({ aiEngineConfig: config });
    const loaded = await storage.get('aiEngineConfig');
    expect(loaded).toEqual(config);
    await storage.remove('aiEngineConfig');
    expect(await storage.get('aiEngineConfig')).toBeUndefined();
  });
});