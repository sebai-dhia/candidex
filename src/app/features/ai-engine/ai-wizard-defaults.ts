import { AI_PROVIDER_CATALOG } from '../../core/services/ai/ai-provider.catalog';
import { AiProviderId } from '../../core/services/ai/ai-provider.types';

/** Default session-only storage when connecting paid providers. */
export function sessionOnlyDefaultForProvider(providerId: AiProviderId | null): boolean {
  const provider = AI_PROVIDER_CATALOG.find((entry) => entry.id === providerId);
  return provider?.badge === 'paid';
}