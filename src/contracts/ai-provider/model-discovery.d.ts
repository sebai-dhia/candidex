export type ModelDiscoverySource = 'discovered' | 'catalog-fallback';

export type ModelDiscoveryResult = {
  models: string[];
  resolvedAt: number;
  source: ModelDiscoverySource;
};

export function modelsUrlFromChatEndpoint(chatEndpoint: string): string;
export function parseModelsResponse(providerId: string, json: unknown): string[];
export function filterChatModels(ids: string[]): string[];
export function rankModelsForExtraction(ids: string[], preferredHints?: string[]): string[];
export function discoverModels(
  providerId: string,
  apiKey: string,
  options?: { force?: boolean },
): Promise<ModelDiscoveryResult>;
export function isModelsCacheStale(modelsResolvedAt: number | undefined): boolean;

export const STALE_TTL_MS: number;
export const MAX_MODELS: number;