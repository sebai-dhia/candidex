import { getAiProviderCatalogEntry } from './ai-provider.catalog';
import { AiProviderId } from './ai-provider.types';

import catalog from '../../../../contracts/ai-provider/ai-provider.catalog.json';

type CatalogEntry = (typeof catalog)[number];

function modelsUrlFromChatEndpoint(chatEndpoint: string): string {
  const trimmed = chatEndpoint.replace(/\/$/, '');
  if (trimmed.endsWith('/chat/completions')) {
    return `${trimmed.slice(0, -'/chat/completions'.length)}/models`;
  }
  return `${trimmed}/models`;
}

function rejectionError(displayName: string, status: number, bodyText = ''): Error {
  if (status === 401 || status === 403) {
    return new Error(`Key rejected by ${displayName}. Check the key and API access.`);
  }
  if (status >= 500) {
    return new Error(`${displayName} is temporarily unavailable (${status}). Try again in a moment.`);
  }
  const snippet = bodyText.slice(0, 160).trim();
  return new Error(
    snippet
      ? `Could not verify key with ${displayName}: ${snippet}`
      : `Could not verify key with ${displayName} (HTTP ${status}).`
  );
}

async function assertOk(response: Response, displayName: string): Promise<void> {
  if (response.ok) return;
  const bodyText = await response.text().catch(() => '');
  throw rejectionError(displayName, response.status, bodyText);
}

async function verifyOpenAiCompatible(definition: CatalogEntry, apiKey: string): Promise<void> {
  const url = modelsUrlFromChatEndpoint(definition.endpoint);
  const headers: Record<string, string> = {Authorization: `Bearer ${apiKey}`};
  if (definition.id === 'openrouter') {
    headers['HTTP-Referer'] = 'https://candidex.app';
    headers['X-Title'] = 'Candidex';
  }

  let response: Response;
  try {
    response = await fetch(url, { method: 'GET', headers });
  } catch {
    throw new Error(`Could not reach ${definition.displayName}. Check your network and try again.`);
  }
  await assertOk(response, definition.displayName);
}

async function verifyAnthropic(definition: CatalogEntry, apiKey: string): Promise<void> {
  const model = definition.models?.[0];
  if (!model) {
    throw new Error(`No models configured for ${definition.displayName}`);
  }

  let response: Response;
  try {
    response = await fetch(definition.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }]
      })
    });
  } catch {
    throw new Error(`Could not reach ${definition.displayName}. Check your network and try again.`);
  }
  await assertOk(response, definition.displayName);
}

async function verifyGemini(definition: CatalogEntry, apiKey: string): Promise<void> {
  const url = `${definition.endpoint}/models?key=${encodeURIComponent(apiKey)}`;
  let response: Response;
  try {
    response = await fetch(url, { method: 'GET' });
  } catch {
    throw new Error(`Could not reach ${definition.displayName}. Check your network and try again.`);
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    const lower = bodyText.toLowerCase();
    if (
      response.status === 400 &&
      (lower.includes('api key') || lower.includes('api_key') || lower.includes('invalid'))
    ) {
      throw rejectionError(definition.displayName, 401, bodyText);
    }
    throw rejectionError(definition.displayName, response.status, bodyText);
  }
}

/**
 * Live-probe a provider key from the extension page (host_permissions).
 * Avoids MV3 service-worker message-port races during connect.
 */
export async function verifyProviderApiKey(providerId: AiProviderId, apiKey: string): Promise<void> {
  const definition = getAiProviderCatalogEntry(providerId);
  const full = catalog.find((entry) => entry.id === providerId);
  if (!definition || !full) {
    throw new Error('Unknown provider');
  }

  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error('API key is required');
  }

  if (full.apiStyle === 'anthropic-messages') {
    await verifyAnthropic(full, trimmed);
    return;
  }
  if (full.apiStyle === 'gemini-generate') {
    await verifyGemini(full, trimmed);
    return;
  }
  await verifyOpenAiCompatible(full, trimmed);
}