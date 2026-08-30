import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyProviderApiKey } from './ai-key-verify';

describe('verifyProviderApiKey', () => {
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

  it('throws a clear rejection on HTTP 401', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('unauthorized', { status: 401 })
    );

    await expect(verifyProviderApiKey('groq', 'gsk_bad')).rejects.toThrow(/Key rejected by Groq/);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/models',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer gsk_bad' })
      })
    );
  });

  it('accepts a successful probe', async () => {
    await expect(verifyProviderApiKey('openai', 'sk-good')).resolves.toBeUndefined();
  });
});