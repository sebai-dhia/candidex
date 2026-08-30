import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./background-client.js', () => ({
  extractWithActiveCloudProvider: vi.fn()
}));

vi.mock('./regex/index.js', () => ({
  extractWithRegexPipeline: vi.fn(() => ({
    company: 'RegexCo',
    role: 'Dev',
    country: 'TN',
    workType: 'Hybrid',
    confidence: { company: 0.4, role: 0.4, country: 0.4, workType: 0.8 },
    source: 'regex-en'
  })),
}));

vi.mock('./json-ld.provider.js', () => ({
  extractWithJsonLd: vi.fn(() => ({
    company: 'JsonLdCo',
    role: 'JsonLd Role',
    country: 'France',
    workType: null,
    confidence: { company: 0.92, role: 0.92, country: 0.92, workType: 0 },
    source: 'json-ld'
  })),
}));

import { extractWithActiveCloudProvider } from './background-client.js';
import { extractWithJsonLd } from './json-ld.provider.js';
import { extractWithRegexPipeline } from './regex/index.js';
import { runExtraction } from './orchestrator.js';

describe('runExtraction', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('always calls AI even when JsonLd would be sufficient', async () => {
    extractWithActiveCloudProvider.mockResolvedValueOnce({
      company: 'CloudCo',
      role: 'Engineer',
      country: 'France',
      workType: 'Remote',
      confidence: { company: 0.95, role: 0.95, country: 0.95, workType: 0.95 },
      source: 'groq'
    });

    const result = await runExtraction({
      regionText: 'Engineer at CloudCo',
      pageMeta: {
        jsonLd: {
          '@type': 'JobPosting',
          title: 'Engineer',
          hiringOrganization: { name: 'CloudCo' },
          jobLocation: { address: { addressCountry: 'FR' } },
        }
      }
    });

    expect(extractWithActiveCloudProvider).toHaveBeenCalled();
    expect(extractWithRegexPipeline).not.toHaveBeenCalled();
    expect(extractWithJsonLd).not.toHaveBeenCalled();
    expect(result.country).toBe('France');
    expect(result.extractionMeta.usedFallback).toBe(false);
  });

  it('merges regex when AI returns partial data', async () => {
    extractWithActiveCloudProvider.mockResolvedValueOnce({
      company: 'CloudCo',
      role: 'Engineer',
      country: null,
      workType: null,
      confidence: { company: 0.95, role: 0.95, country: 0, workType: 0 },
      source: 'groq'
    });

    const result = await runExtraction({
      regionText: 'Engineer\nCloudCo\nTunis, Tunisie\nHybride',
      pageMeta: null
    });

    expect(extractWithRegexPipeline).toHaveBeenCalled();
    expect(result.company).toBe('CloudCo');
    expect(result.country).toBe('Tunisia');
    expect(result.workType).toBe('Hybrid');
    expect(result.extractionMeta.usedFallback).toBe(false);
  });

  it('falls back to regex when AI fails', async () => {
    extractWithActiveCloudProvider.mockRejectedValueOnce(
      Object.assign(new Error('Invalid API key'), { status: 401 })
    );

    const result = await runExtraction({
      regionText: 'Some job text',
      pageMeta: null
    });

    expect(extractWithRegexPipeline).toHaveBeenCalled();
    expect(result.extractionMeta.usedFallback).toBe(true);
    expect(result.extractionMeta.aiError).toMatch(/Invalid API key/i);
    expect(result.company).toBe('RegexCo');
    expect(result.country).toBe('Tunisia');
  });

  it('uses JsonLd when AI and regex lack core fields', async () => {
    extractWithActiveCloudProvider.mockRejectedValueOnce(new Error('Provider unavailable'));
    extractWithRegexPipeline.mockReturnValueOnce({
      company: null,
      role: null,
      country: null,
      workType: null,
      confidence: { company: 0, role: 0, country: 0, workType: 0 },
      source: 'regex-en'
    });

    const result = await runExtraction({
      regionText: 'x',
      pageMeta: {
        jsonLd: {
          '@type': 'JobPosting',
          title: 'JsonLd Role',
          hiringOrganization: { name: 'JsonLdCo' },
          jobLocation: { address: { addressCountry: 'FR' } },
        }
      }
    });

    expect(result.company).toBe('JsonLdCo');
    expect(result.country).toBe('France');
    expect(result.workType).toBe('On-site');
  });
});