import { describe, expect, it } from 'vitest';

import { extractWithRegexPipeline } from './index.js';

describe('regex registry', () => {
  it('detects English Hybrid work type', () => {
    const result = extractWithRegexPipeline({regionText: 'Software Engineer\nAcme Corp\nHybrid'});
    expect(result.workType).toBe('Hybrid');
  });

  it('detects French Hybride work type', () => {
    const result = extractWithRegexPipeline({regionText: 'Data Engineer\nBestlab - Ariana, Tunisie\nMode de travail : Hybride'});
    expect(result.workType).toBe('Hybrid');
  });
});