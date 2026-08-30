import { getProviderDefinition } from '../../../contracts/ai-provider/ai-provider.catalog.js';
import { extractWithAnthropic, extractWithGemini, extractWithOpenAiCompatible, extractWithOpenRouterNative } from './cloud-adapters.js';

/**
 * Run extraction with the user's active cloud provider.
 * @param {string} providerId
 * @param {string} apiKey
 * @param {{ regionText: string, pageMeta?: unknown }} input
 * @param {string[]} [modelsOverride]
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function extractWithActiveProvider(providerId, apiKey, input, modelsOverride, options = {}) {
  const definition = getProviderDefinition(providerId);
  if (!definition) {
    throw new Error(`Unknown AI provider: ${providerId}`);
  }
  if (!apiKey) {
    throw new Error('Missing API key. Configure your Personal AI Engine.');
  }

  const models = Array.isArray(modelsOverride) && modelsOverride.length > 0
                      ? modelsOverride
                      : definition.models;

  const config = {
    endpoint: definition.endpoint,
    apiKey,
    models,
    source: definition.id,
    signal: options.signal
  };

  if (definition.id === 'openrouter' || definition.strategy === 'openrouter-native') {
    return extractWithOpenRouterNative(config, input);
  }

  if (definition.apiStyle === 'anthropic-messages') {
    return extractWithAnthropic(config, input);
  }

  if (definition.apiStyle === 'gemini-generate') {
    return extractWithGemini(config, input);
  }

  return extractWithOpenAiCompatible(config, input);
}