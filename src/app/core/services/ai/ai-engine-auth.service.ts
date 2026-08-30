import { Injectable, computed, inject, signal } from '@angular/core';

import { ChromeStorageService } from '../../../infrastructure/chrome/chrome-storage.service';
import { AI_PROVIDER_CATALOG, getAiProviderCatalogEntry } from './ai-provider.catalog';
import { discoverProviderModels } from './discover-models';
import { verifyProviderApiKey } from './ai-key-verify';
import {AiEngineConfig, AiEngineHealthStatus, AiEnginePersistKey, AiProviderCatalogEntry, AiProviderId} from './ai-provider.types';

const STORAGE_KEY = 'aiEngineConfig';

@Injectable({ providedIn: 'root' })
export class AiEngineAuthService {
  private readonly storage = inject(ChromeStorageService);

  readonly isConnected = signal(false);
  readonly isInitializing = signal(true);
  readonly activeProviderId = signal<AiProviderId | null>(null);
  readonly healthStatus = signal<AiEngineHealthStatus>('healthy');
  readonly lastFailureMessage = signal<string | null>(null);
  readonly persistKey = signal<AiEnginePersistKey>('local');

  readonly isDegraded = computed(() => this.healthStatus() === 'degraded');
  readonly isSessionOnly = computed(() => this.persistKey() === 'session');

  constructor() {
    void this.hydrate();
  }

  get catalog(): AiProviderCatalogEntry[] {
    return AI_PROVIDER_CATALOG;
  }

  get activeProvider(): AiProviderCatalogEntry | null {
    const id = this.activeProviderId();
    return id ? getAiProviderCatalogEntry(id) ?? null : null;
  }

  async hydrate(): Promise<void> {
    this.isInitializing.set(true);
    try {
      const config = await this.storage.getFromEither<AiEngineConfig>(STORAGE_KEY);
      if (config?.providerId && config?.apiKey) {
        this.activeProviderId.set(config.providerId);
        this.isConnected.set(true);
        this.persistKey.set(config.persistKey === 'session' ? 'session' : 'local');
        this.healthStatus.set(config.healthStatus === 'degraded' ? 'degraded' : 'healthy');
        this.lastFailureMessage.set(config.lastFailureMessage ?? null);
      } else {
        this.resetSessionState();
      }
    } catch {
      this.resetSessionState();
    } finally {
      this.isInitializing.set(false);
    }
  }

  async connect(
    providerId: AiProviderId,
    apiKey: string,
    persistKey: AiEnginePersistKey = 'local',
  ): Promise<void> {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      throw new Error('API key is required');
    }
    if (!getAiProviderCatalogEntry(providerId)) {
      throw new Error('Unknown provider');
    }

    await verifyProviderApiKey(providerId, trimmed);

    const discovery = await discoverProviderModels(providerId, trimmed);

    const config: AiEngineConfig = {
      providerId,
      apiKey: trimmed,
      connectedAt: Date.now(),
      persistKey,
      healthStatus: 'healthy',
      consecutiveFailures: 0,
      lastFailureAt: undefined,
      lastFailureMessage: undefined,
      resolvedModels: discovery.models,
      modelsResolvedAt: discovery.resolvedAt,
      modelsSource: discovery.source,
    };

    await this.storage.setExclusive(STORAGE_KEY, config, persistKey);
    this.activeProviderId.set(providerId);
    this.isConnected.set(true);
    this.persistKey.set(persistKey);
    this.healthStatus.set('healthy');
    this.lastFailureMessage.set(null);
  }

  async disconnect(): Promise<void> {
    await this.storage.removeFromBoth(STORAGE_KEY);
    this.resetSessionState();
  }

  private resetSessionState(): void {
    this.activeProviderId.set(null);
    this.isConnected.set(false);
    this.persistKey.set('local');
    this.healthStatus.set('healthy');
    this.lastFailureMessage.set(null);
  }
}