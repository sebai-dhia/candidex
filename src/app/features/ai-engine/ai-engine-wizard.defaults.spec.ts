import { describe, expect, it } from 'vitest';

import { sessionOnlyDefaultForProvider } from './ai-wizard-defaults';

describe('sessionOnlyDefaultForProvider', () => {
  it('defaults session-only to true for paid providers', () => {
    expect(sessionOnlyDefaultForProvider('anthropic')).toBe(true);
    expect(sessionOnlyDefaultForProvider('openai')).toBe(true);
    expect(sessionOnlyDefaultForProvider('deepseek')).toBe(true);
  });

  it('defaults session-only to false for free providers', () => {
    expect(sessionOnlyDefaultForProvider('groq')).toBe(false);
    expect(sessionOnlyDefaultForProvider('openrouter')).toBe(false);
    expect(sessionOnlyDefaultForProvider('gemini')).toBe(false);
  });

  it('defaults session-only to false when no provider is selected', () => {
    expect(sessionOnlyDefaultForProvider(null)).toBe(false);
  });
});