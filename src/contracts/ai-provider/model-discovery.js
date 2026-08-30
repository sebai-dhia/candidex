import { getProviderDefinition } from './ai-provider.catalog.js';

const STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MODELS = 5;

const NON_CHAT_PATTERNS =
  /embed|embedding|whisper|tts|dall-e|dalle|image|audio|moderation|realtime|transcribe|vision-preview|code-search|text-search|rerank|batch/i;

const QUALITY_SIGNALS = [
  {
    pattern:
      /(?<![0-9])120b(?![0-9])|(?<![0-9])70b(?![0-9])|(?<![0-9])72b(?![0-9])|(?<![0-9])405b(?![0-9])/i,
    score: 4,
  },
  { pattern: /pro|sonnet|opus|gpt-4(?!o-mini)/i, score: 3 },
  { pattern: /instruct|chat|oss|gpt-4o(?!-mini)/i, score: 2 },
  {
    pattern:
      /(?<![0-9])8b(?![0-9])|(?<![0-9])9b(?![0-9])|(?<![0-9])14b(?![0-9])|(?<![0-9])32b(?![0-9])/i,
    score: 1,
  }
];

const SPEED_SIGNALS = [
  { pattern: /flash|instant|turbo|fast|lite/i, score: 4 },
  {
    pattern:
      /mini|haiku|(?<![0-9])7b(?![0-9])|(?<![0-9])8b(?![0-9])|(?<![0-9])9b(?![0-9])|(?<![0-9])20b(?![0-9])/i,
    score: 3
  },
  { pattern: /gpt-4o-mini|gpt-3\.5/i, score: 2 }
];

const PENALTY_PATTERNS = [
  {
    pattern: /reasoner|thinking|preview|exp-|experimental|deprecated|legacy|alpha|beta-test/i,
    score: 3
  }
];

/**
 * Derive OpenAI-compatible models list URL from a chat completions endpoint.
 * @param {string} chatEndpoint
 */
export function modelsUrlFromChatEndpoint(chatEndpoint) {
  const trimmed = chatEndpoint.replace(/\/$/, '');
  if (trimmed.endsWith('/chat/completions')) {
    return `${trimmed.slice(0, -'/chat/completions'.length)}/models`;
  }
  return `${trimmed}/models`;
}

/**
 * @param {string} id
 */
function normalizeModelId(id) {
  const raw = String(id || '').trim();
  if (!raw) return '';
  return raw.startsWith('models/') ? raw.slice('models/'.length) : raw;
}

/**
 * Provider-specific JSON → model ID list.
 * @param {string} providerId
 * @param {unknown} json
 */
export function parseModelsResponse(providerId, json) {
  const body = /** @type {Record<string, unknown>} */ (json || {});

  if (providerId === 'gemini') {
    const models = /** @type {{ name?: string }[]} */ (body.models || []);
    return models.map((entry) => normalizeModelId(entry.name || '')).filter(Boolean);
  }

  if (providerId === 'anthropic') {
    const data = /** @type {{ id?: string }[]} */ (body.data || []);
    return data.map((entry) => normalizeModelId(entry.id || '')).filter(Boolean);
  }

  const data = /** @type {{ id?: string }[]} */ (body.data || []);
  return data.map((entry) => normalizeModelId(entry.id || '')).filter(Boolean);
}

/**
 * Exclude non-chat / non-text-generation models.
 * @param {string[]} ids
 */
export function filterChatModels(ids) {
  return ids.filter((id) => id && !NON_CHAT_PATTERNS.test(id));
}

/**
 * @param {string} id
 * @param {{ pattern: RegExp, score: number }[]} rules
 */
function scoreByRules(id, rules) {
  let score = 0;
  for (const rule of rules) {
    if (rule.pattern.test(id)) score += rule.score;
  }
  return score;
}

/**
 * Rank models for balanced quality + speed extraction.
 * @param {string[]} ids
 * @param {string[]} [preferredHints]
 */
export function rankModelsForExtraction(ids, preferredHints = []) {
  const hintSet = new Set(preferredHints.map((id) => id.toLowerCase()));
  const unique = [...new Set(ids.filter(Boolean))];

  const scored = unique.map((id) => {
    const qualityScore = scoreByRules(id, QUALITY_SIGNALS);
    const speedScore = scoreByRules(id, SPEED_SIGNALS);
    const penalty = scoreByRules(id, PENALTY_PATTERNS);
    const hintBoost = hintSet.has(id.toLowerCase()) ? 5 : 0;
    const sweetSpotBonus = qualityScore > 0 && speedScore > 0 ? 3 : 0;
    const largeOnlyPenalty = qualityScore >= 4 && speedScore === 0 ? 2 : 0;
    const balanced = (qualityScore + speedScore) / 2 + sweetSpotBonus + hintBoost - penalty - largeOnlyPenalty;
    return { id, balanced, hintBoost };
  });

  scored.sort((a, b) => {
    if (b.balanced !== a.balanced) return b.balanced - a.balanced;
    if (b.hintBoost !== a.hintBoost) return b.hintBoost - a.hintBoost;
    return a.id.localeCompare(b.id);
  });

  return scored.map((entry) => entry.id);
}

/**
 * @param {string} providerId
 * @param {string} apiKey
 */
async function fetchModelList(providerId, apiKey) {
  const definition = getProviderDefinition(providerId);
  if (!definition) {
    throw new Error(`Unknown AI provider: ${providerId}`);
  }

  const trimmedKey = apiKey.trim();
  let response;

  if (definition.apiStyle === 'anthropic-messages') {
    try {
      response = await fetch('https://api.anthropic.com/v1/models', {
        method: 'GET',
        headers: {
          'x-api-key': trimmedKey,
          'anthropic-version': '2023-06-01'
        }
      });
    } catch {
      return null;
    }
    if (!response.ok) return null;
    const json = await response.json().catch(() => ({}));
    return parseModelsResponse(providerId, json);
  }

  if (definition.apiStyle === 'gemini-generate') {
    const url = `${definition.endpoint}/models?key=${encodeURIComponent(trimmedKey)}`;
    try {
      response = await fetch(url, { method: 'GET' });
    } catch {
      return null;
    }
    if (!response.ok) return null;
    const json = await response.json().catch(() => ({}));
    return parseModelsResponse(providerId, json);
  }

  const url = modelsUrlFromChatEndpoint(definition.endpoint);
  const headers = { Authorization: `Bearer ${trimmedKey}` };
  if (providerId === 'openrouter') {
    headers['HTTP-Referer'] = 'https://candidex.app';
    headers['X-Title'] = 'Candidex';
  }

  try {
    response = await fetch(url, { method: 'GET', headers });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const json = await response.json().catch(() => ({}));
  return parseModelsResponse(providerId, json);
}

/**
 * @param {string[]} discovered
 * @param {string[]} catalogHints
 */
function finalizeModels(discovered, catalogHints) {
  const filtered = filterChatModels(discovered);
  const ranked = rankModelsForExtraction(filtered, catalogHints);
  const top = ranked.slice(0, MAX_MODELS);
  if (top.length > 0) return top;
  return catalogHints.slice(0, MAX_MODELS);
}

/**
 * Discover chat-capable models for a provider.
 * Falls back to catalog.models on fetch/parse failure.
 * @param {string} providerId
 * @param {string} apiKey
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<{ models: string[], resolvedAt: number, source: 'discovered' | 'catalog-fallback' }>}
 */
export async function discoverModels(providerId, apiKey, options = {}) {
  const definition = getProviderDefinition(providerId);
  const catalogHints = definition?.models?.slice() ?? [];
  const resolvedAt = Date.now();

  if (!definition || !apiKey?.trim()) {
    return { models: catalogHints.slice(0, MAX_MODELS), resolvedAt, source: 'catalog-fallback' };
  }

  const rawList = await fetchModelList(providerId, apiKey);
  if (!rawList?.length) {
    return { models: catalogHints.slice(0, MAX_MODELS), resolvedAt, source: 'catalog-fallback' };
  }

  const models = finalizeModels(rawList, catalogHints);
  const filtered = filterChatModels(rawList);
  const source = filtered.length > 0 ? 'discovered' : 'catalog-fallback';

  return { models, resolvedAt, source };
}

/** @param {number | undefined} modelsResolvedAt */
export function isModelsCacheStale(modelsResolvedAt) {
  if (!modelsResolvedAt) return true;
  return Date.now() - modelsResolvedAt > STALE_TTL_MS;
}

export { STALE_TTL_MS, MAX_MODELS };