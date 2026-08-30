import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { discoverModels, filterChatModels, parseModelsResponse, rankModelsForExtraction } from '../../contracts/ai-provider/model-discovery.js';

describe('parseModelsResponse', () => {
  it('parses OpenAI-compatible data array', () => {
    expect(
      parseModelsResponse('groq', {
        data: [{ id: 'openai/gpt-oss-120b' }, { id: 'openai/gpt-oss-20b' }]
      })
    ).toEqual(['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
  });

  it('parses Gemini models with models/ prefix', () => {
    expect(
      parseModelsResponse('gemini', {
        models: [{ name: 'models/gemini-2.0-flash' }, { name: 'models/gemini-1.5-pro' }]
      })
    ).toEqual(['gemini-2.0-flash', 'gemini-1.5-pro']);
  });

  it('parses Anthropic data array', () => {
    expect(
      parseModelsResponse('anthropic', {
        data: [{ id: 'claude-3-5-haiku-latest' }, { id: 'claude-3-5-sonnet-latest' }]
      })
    ).toEqual(['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest']);
  });
});

describe('filterChatModels', () => {
  it('excludes embedding, whisper, and tts models', () => {
    const ids = [
      'text-embedding-3-small',
      'whisper-1',
      'tts-1',
      'gpt-4o-mini',
      'gemini-2.0-flash'
    ];
    expect(filterChatModels(ids)).toEqual(['gpt-4o-mini', 'gemini-2.0-flash']);
  });
});

describe('rankModelsForExtraction', () => {
  it('prefers balanced Groq mid-tier over the largest-only variant', () => {
    const ranked = rankModelsForExtraction(['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
    expect(ranked[0]).toBe('openai/gpt-oss-20b');
  });

  it('ranks free OpenRouter instruct models reasonably', () => {
    const ranked = rankModelsForExtraction([
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen-2.5-7b-instruct:free',
      'google/gemma-2-9b-it:free'
    ]);
    expect(ranked).toContain('meta-llama/llama-3.3-70b-instruct:free');
    expect(ranked.length).toBe(3);
  });

  it('boosts catalog hint models above equal-scoring peers', () => {
    const hints = ['model-b'];
    const ranked = rankModelsForExtraction(['model-a', 'model-b'], hints);
    expect(ranked[0]).toBe('model-b');
  });

  it('penalizes reasoner models', () => {
    const ranked = rankModelsForExtraction(['deepseek-chat', 'deepseek-reasoner']);
    expect(ranked[0]).toBe('deepseek-chat');
  });
});

describe('discoverModels', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('falls back to catalog models when API returns empty list', async () => {
    const result = await discoverModels('groq', 'gsk_test');
    expect(result.source).toBe('catalog-fallback');
    expect(result.models.length).toBeGreaterThan(0);
    expect(result.models).toContain('openai/gpt-oss-120b');
  });

  it('returns discovered models when API returns chat models', async () => {
    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            { id: 'openai/gpt-oss-120b' },
            { id: 'openai/gpt-oss-20b' },
            { id: 'text-embedding-3-small' }
          ]
        }),
        { status: 200 }
      )
    );

    const result = await discoverModels('groq', 'gsk_test');
    expect(result.source).toBe('discovered');
    expect(result.models).toContain('openai/gpt-oss-20b');
    expect(result.models).not.toContain('text-embedding-3-small');
  });
});