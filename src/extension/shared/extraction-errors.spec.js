import { describe, expect, it } from 'vitest';
import {createExtractionError, isProviderHttpFailure, isRetryableHttpStatus, shouldCountTowardDegraded } from './extraction-errors.js';

describe('extraction-errors', () => {
  it('detects provider http failures', () => {
    expect(isProviderHttpFailure(createExtractionError('AUTH_FAILED', 'bad key', 401))).toBe(true);
    expect(isProviderHttpFailure(new Error('Empty model response'))).toBe(true);
    expect(isProviderHttpFailure(new Error('parsed ok'))).toBe(false);
  });

  it('flags retryable statuses', () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(401)).toBe(false);
  });

  it('counts failures toward degraded health', () => {
    expect(shouldCountTowardDegraded(new Error('The message port closed before a response was received.'))).toBe(
      true,
    );
  });
});