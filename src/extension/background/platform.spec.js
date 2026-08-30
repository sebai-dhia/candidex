import { describe, expect, it } from 'vitest';
import { inferPlatform } from './platform.js';

describe('inferPlatform', () => {
  it('maps known job board domains', () => {
    expect(inferPlatform('https://www.linkedin.com/jobs/view/123')).toBe('LinkedIn');
    expect(inferPlatform('https://jobs.lever.co/acme/role')).toBe('Lever');
  });

  it('capitalizes unknown domains', () => {
    expect(inferPlatform('https://www.examplecareers.com/jobs/123')).toBe('Examplecareers');
  });

  it('maps TanitJobs', () => {
    expect(inferPlatform('https://www.tanitjobs.com/jobs/123')).toBe('TanitJobs');
  });

  it('returns Other for empty or invalid input', () => {
    expect(inferPlatform('')).toBe('Other');
    expect(inferPlatform(null)).toBe('Other');
    expect(inferPlatform('not-a-url')).toBe('Other');
  });
});