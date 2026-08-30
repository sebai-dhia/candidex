import { EXTRACTION_PROMPT, buildExtractionUserMessage } from '../../shared/prompts.js';
import { logHttpAttempt } from '../../shared/extraction-logger.js';
import { parseModelJson, normalizeExtractionResult } from '../../shared/normalize-result.js';
import { autoModelRoute, httpErrorFromResponse } from './auto-model-route.js';

async function readResponse(config, model, response) {
  const startedAt = Date.now();
  const raw = await response.text();
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    const error = httpErrorFromResponse(response, raw);
    logHttpAttempt({
      providerId: config.source,
      model,
      status: response.status,
      ok: false,
      durationMs,
      errorMessage: error.message
    });
    throw error;
  }

  logHttpAttempt({
    providerId: config.source,
    model,
    status: response.status,
    ok: true,
    durationMs
  });

  return raw;
}

/**
 * OpenAI-compatible chat completions (Groq, OpenAI, OpenRouter sequential).
 * @param {{ endpoint: string, apiKey: string, models: string[], source: string, headers?: Record<string, string>, bodyExtras?: Record<string, unknown>, signal?: AbortSignal }} config
 * @param {{ regionText: string }} input
 */
export async function extractWithOpenAiCompatible(config, input) {
  const userContent = buildExtractionUserMessage(input);

  return autoModelRoute(config.models, async (model) => {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        ...(config.headers || {})
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: userContent }
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
        ...(config.bodyExtras || {})
      }),
      signal: config.signal
    });

    const raw = await readResponse(config, model, response);
    const data = JSON.parse(raw);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty model response');
    }

    const parsed = parseModelJson(content);
    return normalizeExtractionResult(parsed, { source: config.source, confidenceBoost: 0.95 });
  });
}

/**
 * OpenRouter native models-array fallback in one request.
 */
export async function extractWithOpenRouterNative(config, input) {
  const userContent = buildExtractionUserMessage(input);
  const [primary, ...fallbacks] = config.models;

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'HTTP-Referer': 'https://candidex.app',
      'X-Title': 'Candidex'
    },
    body: JSON.stringify({
      model: primary,
      models: fallbacks.length ? [primary, ...fallbacks] : undefined,
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: userContent }
      ],
      temperature: 0,
      response_format: { type: 'json_object' }
    }),
    signal: config.signal
  });

  const raw = await response.text();
  if (!response.ok) {
    throw httpErrorFromResponse(response, raw);
  }

  const data = JSON.parse(raw);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty OpenRouter response');
  }

  const parsed = parseModelJson(content);
  return normalizeExtractionResult(parsed, { source: 'openrouter', confidenceBoost: 0.95 });
}

/**
 * Anthropic Messages API.
 */
export async function extractWithAnthropic(config, input) {
  const userContent = buildExtractionUserMessage(input);

  return autoModelRoute(config.models, async (model) => {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: EXTRACTION_PROMPT,
        messages: [{ role: 'user', content: userContent }]
      }),
      signal: config.signal
    });

    const raw = await response.text();
    if (!response.ok) {
      throw httpErrorFromResponse(response, raw);
    }

    const data = JSON.parse(raw);
    const content = data?.content?.find((block) => block.type === 'text')?.text;
    if (!content) {
      throw new Error('Empty Anthropic response');
    }

    const parsed = parseModelJson(content);
    return normalizeExtractionResult(parsed, { source: 'anthropic', confidenceBoost: 0.95 });
  });
}

/**
 * Google Gemini generateContent API.
 */
export async function extractWithGemini(config, input) {
  const userContent = buildExtractionUserMessage(input);

  return autoModelRoute(config.models, async (model) => {
    const url = `${config.endpoint}/models/${model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${EXTRACTION_PROMPT}\n\n${userContent}` }]
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        }
      }),
      signal: config.signal
    });

    const raw = await response.text();
    if (!response.ok) {
      throw httpErrorFromResponse(response, raw);
    }

    const data = JSON.parse(raw);
    const content = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    if (!content) {
      throw new Error('Empty Gemini response');
    }

    const parsed = parseModelJson(content);
    return normalizeExtractionResult(parsed, { source: 'gemini', confidenceBoost: 0.95 });
  });
}