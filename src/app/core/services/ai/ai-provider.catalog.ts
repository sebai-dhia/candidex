import catalog from '../../../../contracts/ai-provider/ai-provider.catalog.json';

import { AiProviderCatalogEntry, AiProviderId } from './ai-provider.types';

/** Free-first provider catalog for the Personal AI Engine wizard. */
export const AI_PROVIDER_CATALOG: AiProviderCatalogEntry[] = catalog.map((entry) => ({
  id: entry.id as AiProviderId,
  displayName: entry.displayName,
  badge: entry.badge as AiProviderCatalogEntry['badge'],
  top: entry.top,
  consoleUrl: entry.consoleUrl,
  keyPlaceholder: entry.keyPlaceholder
}));

export function getAiProviderCatalogEntry(id: AiProviderId): AiProviderCatalogEntry | undefined {
  return AI_PROVIDER_CATALOG.find((entry) => entry.id === id);
}

export function badgeLabel(badge: AiProviderCatalogEntry['badge']): string {
  if (badge === 'free') return 'Free';
  if (badge === 'free-billing') return 'Free (Billing Required)';
  return 'Paid';
}