import { describe, expect, it } from 'vitest';

import {
  computeGoogleApiBackoffMs,
  GOOGLE_API_BACKOFF_CAP_MS,
  GOOGLE_API_RETRY_MAX,
  isGoogleApisUrl,
  shouldRetryGoogleApiRequest,
} from './google-api-retry.policy';

describe('isGoogleApisUrl', () => {
  it('matches googleapis hosts', () => {
    expect(isGoogleApisUrl('https://sheets.googleapis.com/v4/spreadsheets')).toBe(true);
    expect(isGoogleApisUrl('https://www.googleapis.com/drive/v3/files')).toBe(true);
  });

  it('rejects non-Google hosts', () => {
    expect(isGoogleApisUrl('https://api.openai.com/v1/models')).toBe(false);
    expect(isGoogleApisUrl('/relative')).toBe(false);
  });
});

describe('shouldRetryGoogleApiRequest', () => {
  it('retries 429 on every method including POST', () => {
    expect(shouldRetryGoogleApiRequest('GET', 429)).toBe(true);
    expect(shouldRetryGoogleApiRequest('POST', 429)).toBe(true);
    expect(shouldRetryGoogleApiRequest('PUT', 429)).toBe(true);
  });

  it('retries 5xx on GET only (not on POST)', () => {
    expect(shouldRetryGoogleApiRequest('GET', 503)).toBe(true);
    expect(shouldRetryGoogleApiRequest('GET', 500)).toBe(true);
    expect(shouldRetryGoogleApiRequest('GET', 502)).toBe(true);
    expect(shouldRetryGoogleApiRequest('GET', 504)).toBe(true);
    expect(shouldRetryGoogleApiRequest('POST', 503)).toBe(false);
    expect(shouldRetryGoogleApiRequest('PUT', 500)).toBe(false);
  });

  it('does not retry client errors other than 429', () => {
    expect(shouldRetryGoogleApiRequest('GET', 403)).toBe(false);
    expect(shouldRetryGoogleApiRequest('POST', 400)).toBe(false);
  });
});

describe('computeGoogleApiBackoffMs', () => {
  it('uses truncated exponential backoff with jitter', () => {
    expect(computeGoogleApiBackoffMs(0, null, 100)).toBe(1100);
    expect(computeGoogleApiBackoffMs(1, null, 50)).toBe(2050);
    expect(computeGoogleApiBackoffMs(2, null, 0)).toBe(4000);
  });

  it('caps backoff at 32s', () => {
    expect(computeGoogleApiBackoffMs(10, null, 999)).toBe(GOOGLE_API_BACKOFF_CAP_MS);
  });

  it('honors Retry-After seconds', () => {
    expect(computeGoogleApiBackoffMs(0, '5', 0)).toBe(5000);
  });

  it('caps Retry-After at the backoff ceiling', () => {
    expect(computeGoogleApiBackoffMs(0, '120', 0)).toBe(GOOGLE_API_BACKOFF_CAP_MS);
  });

  it('honors Retry-After HTTP-date', () => {
    const target = Date.now() + 3000;
    const header = new Date(target).toUTCString();
    const delay = computeGoogleApiBackoffMs(0, header, 0);
    expect(delay).toBeGreaterThanOrEqual(2000);
    expect(delay).toBeLessThanOrEqual(3000);
  });

  it('documents the max retry count used by the interceptor', () => {
    expect(GOOGLE_API_RETRY_MAX).toBe(4);
  });
});