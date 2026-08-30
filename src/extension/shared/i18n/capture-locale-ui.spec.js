/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { loadCaptureLocale } from './capture-messages.js';
import { CAPTURE_WORK_TYPES, getCaptureTextDirection, isolateCaptureHost } from './capture-locale-ui.js';

describe('capture locale UI', () => {
  it('derives text direction from extension locale, not host page', async () => {
    document.documentElement.dir = 'rtl';

    await loadCaptureLocale();
    // Default when storage is unavailable in tests.
    expect(getCaptureTextDirection()).toBe('ltr');
  });

  it('isolates host from page translation and sets direction', () => {
    const host = document.createElement('div');
    document.documentElement.dir = 'rtl';

    isolateCaptureHost(host);

    expect(host.getAttribute('translate')).toBe('no');
    expect(host.classList.contains('notranslate')).toBe(true);
    expect(host.dir).toBe('ltr');
  });

  it('keeps canonical work-type values for sheet storage', () => {
    expect(CAPTURE_WORK_TYPES).toEqual(['Remote', 'Hybrid', 'On-site']);
  });
});