import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXTRACTION_PROMPT } from '../../shared/prompts.js';
import { extractWithOpenAiCompatible, extractWithOpenRouterNative } from '../../background/providers/cloud-adapters.js';

describe('extractWithOpenAiCompatible', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    company: 'Acme',
                    role: 'Engineer',
                    country: 'France',
                    workType: 'Remote'
                  })
                }
              }
            ]
          }),
          { status: 200 }
        )
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends Authorization and the strict EXTRACTION_PROMPT', async () => {
    const result = await extractWithOpenAiCompatible(
      {
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: 'gsk_live',
        models: ['llama-3.3-70b-versatile'],
        source: 'groq'
      },
      { regionText: 'Acme hiring Engineer in France' }
    );

    expect(result.company).toBe('Acme');
    expect(result.role).toBe('Engineer');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer gsk_live',
        })
      })
    );

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.messages[0]).toEqual({ role: 'system', content: EXTRACTION_PROMPT });
    expect(body.messages[1].content).toContain('Acme hiring Engineer in France');
  });

  it('includes optional page hints in the user message', async () => {
    await extractWithOpenAiCompatible(
      {
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: 'gsk_live',
        models: ['llama-3.3-70b-versatile'],
        source: 'groq'
      },
      {
        regionText: 'Engineer at Acme',
        pageMeta: { title: 'Acme Careers', ogTitle: 'Acme Jobs' },
      }
    );

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.messages[1].content).toContain('Optional page hints');
    expect(body.messages[1].content).toContain('Acme Careers');
  });

  it('surfaces 401 as auth failure without succeeding', async () => {
    fetch.mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));

    await expect(
      extractWithOpenAiCompatible(
        {
          endpoint: 'https://api.groq.com/openai/v1/chat/completions',
          apiKey: 'gsk_bad',
          models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
          source: 'groq'
        },
        { regionText: 'text' }
      ),
    ).rejects.toMatchObject({ code: 'AUTH_FAILED', status: 401 });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('extractWithOpenRouterNative', () => {
  it('sends at most 3 models, the limit OpenRouter enforces', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ company: 'Acme', role: 'Engineer', country: 'France', workType: 'Remote' }) } }]
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await extractWithOpenRouterNative(
      { endpoint: 'https://openrouter.ai/api/v1/chat/completions', apiKey: 'sk-or-test', models: ['a', 'b', 'c', 'd', 'e'], source: 'openrouter' },
      { regionText: 'Engineer at Acme' }
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('a');
    expect(body.models).toEqual(['a', 'b', 'c']);
    expect(body.max_tokens).toBe(1024);
    vi.unstubAllGlobals();
  });
});
