import { describe, expect, it } from 'vitest';

import { cleanRoleTitle, normalizeExtractionResult } from './normalize-result.js';

describe('cleanRoleTitle', () => {
  it('strips gender and experience metadata from titles', () => {
    expect(
      cleanRoleTitle(
        "Développeur Full Stack Java / ReactJS Confirmé (H/F) 5+ ans d'expérience",
      ),
    ).toBe('Développeur Full Stack Java / ReactJS Confirmé');
  });

  it('strips trailing work arrangement from titles', () => {
    expect(cleanRoleTitle('Développeur Full Stack Java / Angular 100% remote')).toBe('Développeur Full Stack Java / Angular');
    expect(cleanRoleTitle('Product Designer — Hybrid')).toBe('Product Designer');
  });

  it('strips M/F and English experience suffixes', () => {
    expect(cleanRoleTitle('Senior Engineer (M/F)')).toBe('Senior Engineer');
    expect(cleanRoleTitle('Backend Developer with 3+ years experience')).toBe('Backend Developer');
  });

  it('keeps occupation words that look like metadata when they are the title', () => {
    expect(cleanRoleTitle('Java Developer')).toBe('Java Developer');
    expect(cleanRoleTitle('Remote Sensing Engineer')).toBe('Remote Sensing Engineer');
  });
});

describe('normalizeExtractionResult role cleaning', () => {
  it('cleans role during normalization', () => {
    const result = normalizeExtractionResult({
      company: 'BHCT',
      role: "Développeur Full Stack Java / ReactJS Confirmé (H/F) 5+ ans d'expérience",
    });
    expect(result.role).toBe('Développeur Full Stack Java / ReactJS Confirmé');
  });
});
