import { AiProviderId, AiModelsSource } from './ai-provider.types';

export type ModelDiscoveryResult = {
  models: string[];
  resolvedAt: number;
  source: AiModelsSource
};

type DiscoverModelsFn = (providerId: string, apiKey: string, options?: { force?: boolean }) => Promise<ModelDiscoveryResult>;

let discoverModelsImpl: DiscoverModelsFn | null = null;

async function loadDiscoverModels(): Promise<DiscoverModelsFn> {
  if (!discoverModelsImpl) {
    const module = await import('../../../../contracts/ai-provider/model-discovery.js');
    discoverModelsImpl = module.discoverModels as DiscoverModelsFn;
  }
  return discoverModelsImpl!;
}

export async function discoverProviderModels(
  providerId: AiProviderId,
  apiKey: string,
  options?: { force?: boolean }
): Promise<ModelDiscoveryResult> {
  const discoverModels = await loadDiscoverModels();
  return discoverModels(providerId, apiKey, options);
}