import { afterEach, describe, expect, it, vi } from 'vitest';
import { candidexDevInfo, candidexDevLog, isCandidexDev } from './candidex-env.js';
import { logHttpAttempt, maskApiKey } from './extraction-logger.js';

describe('extraction-logger', () => {
  it('masks api keys for safe logging', () => {
    expect(maskApiKey('gsk_1234567890abcdef')).toBe('gsk_1234...cdef');
    expect(maskApiKey('')).toBe('(empty)');
  });
});

describe('candidex-env', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('defaults to non-dev when the build flag is unset', () => {
    expect(isCandidexDev()).toBe(false);
  });

  it('skips info/log helpers when not in dev', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    candidexDevInfo('should not appear');
    candidexDevLog('should not appear');
    logHttpAttempt({
      providerId: 'groq',
      model: 'test',
      status: 200,
      ok: true,
      durationMs: 1,
    });

    expect(info).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('emits info/log helpers when the build flag is true', () => {
    vi.stubGlobal('__CANDIDEX_DEV__', true);
    // Re-import would be needed if the flag were cached; isCandidexDev reads it live.
    expect(isCandidexDev()).toBe(true);

    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    candidexDevInfo('dev info');
    candidexDevLog('dev log');

    expect(info).toHaveBeenCalledWith('dev info');
    expect(log).toHaveBeenCalledWith('dev log');
  });
});