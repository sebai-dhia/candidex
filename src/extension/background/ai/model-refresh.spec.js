import { describe, expect, it } from 'vitest';
import { shouldRediscoverAfterFailure, shouldRetryAfterRediscovery } from './model-refresh.js';

describe('model refresh helpers', () => {
  it('flags model exhaustion for rediscovery when models were unavailable', () => {
    expect(
      shouldRediscoverAfterFailure({
        code: 'MODELS_EXHAUSTED',
        modelUnavailable: true
      })
    ).toBe(true);
  });

  it('does not rediscover when exhaustion was caused by rate limits', () => {
    expect(
      shouldRediscoverAfterFailure({
        code: 'MODELS_EXHAUSTED',
        modelUnavailable: false,
        cause: Object.assign(new Error('rate limit'), { status: 429 })
      })
    ).toBe(false);
  });

  it('flags direct unavailable-model errors', () => {
    expect(
      shouldRediscoverAfterFailure(
        Object.assign(new Error('The model `old` does not exist'), { status: 404 })
      )
    ).toBe(true);
  });

  it('does not rediscover on auth failures', () => {
    expect(
      shouldRediscoverAfterFailure(
        Object.assign(new Error('Invalid API key'), { status: 401, code: 'AUTH_FAILED' })
      )
    ).toBe(false);
  });

  it('retries when discovery returns a fresh provider list', () => {
    expect(
      shouldRetryAfterRediscovery(['old-model'], {
        source: 'discovered',
        models: ['new-model']
      })
    ).toBe(true);
  });

  it('skips retry when catalog fallback is unchanged', () => {
    const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
    expect(
      shouldRetryAfterRediscovery(models, {
        source: 'catalog-fallback',
        models: [...models]
      })
    ).toBe(false);
  });
});