export type AiProviderId = 'groq' | 'openrouter' | 'gemini' | 'deepseek' | 'anthropic' | 'openai';
export type AiProviderBadge = 'free' | 'free-billing' | 'paid';
export type AiEngineHealthStatus = 'healthy' | 'degraded';
export type AiEnginePersistKey = 'local' | 'session';
export type AiModelsSource = 'discovered' | 'catalog-fallback';
export type AiEngineConfig = {
  providerId: AiProviderId;
  apiKey: string;
  connectedAt: number;
  persistKey?: AiEnginePersistKey;
  healthStatus?: AiEngineHealthStatus;
  consecutiveFailures?: number;
  lastFailureAt?: string;
  lastFailureMessage?: string;
  resolvedModels?: string[];
  modelsResolvedAt?: number;
  modelsSource?: AiModelsSource
};

export type AiProviderCatalogEntry = {
  id: AiProviderId;
  displayName: string;
  badge: AiProviderBadge;
  top: boolean;
  consoleUrl: string;
  keyPlaceholder: string
};