import { describe, expect, it, vi } from 'vitest';
import { autoModelRoute } from './auto-model-route.js';

describe('autoModelRoute', () => {
  it('tries next model on 429', async () => {
    const callModel = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('rate'), { status: 429 }))
      .mockResolvedValueOnce({ ok: true });

    const result = await autoModelRoute(['a', 'b'], callModel);
    expect(result).toEqual({ ok: true });
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it('tries next model when primary model does not exist', async () => {
    const callModel = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('The model `old` does not exist or you do not have access to it.'), {
          status: 404
        })
      )
      .mockResolvedValueOnce({ ok: true });

    const result = await autoModelRoute(['old', 'new'], callModel);
    expect(result).toEqual({ ok: true });
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it('stops on 401', async () => {
    const callModel = vi.fn().mockRejectedValue(Object.assign(new Error('bad key'), { status: 401 }));
    await expect(autoModelRoute(['a', 'b'], callModel)).rejects.toMatchObject({ code: 'AUTH_FAILED' });
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it('marks exhaustion when every model is unavailable', async () => {
    const callModel = vi.fn().mockRejectedValue(Object.assign(new Error('The model `old` does not exist'), { status: 404 }));
    await expect(autoModelRoute(['old', 'older'], callModel)).rejects.toMatchObject({
      code: 'MODELS_EXHAUSTED',
      modelUnavailable: true
    });
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it('moves on when a model does not support generateContent', async () => {
    const callModel = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('models/imagen-4 is not supported for generateContent.'), { status: 400 }))
      .mockResolvedValueOnce('ok');
    await expect(autoModelRoute(['imagen-4', 'gemini-flash'], callModel)).resolves.toBe('ok');
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it('still stops on an unrelated 400', async () => {
    const callModel = vi.fn().mockRejectedValue(Object.assign(new Error('Invalid JSON payload received'), { status: 400 }));
    await expect(autoModelRoute(['a', 'b'], callModel)).rejects.toThrow('Invalid JSON payload');
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it('moves on when a model is no longer available to new users', async () => {
    const callModel = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('This model models/gemini-2.5-flash is no longer available to new users.'), { status: 400 }))
      .mockResolvedValueOnce('ok');
    await expect(autoModelRoute(['old', 'new'], callModel)).resolves.toBe('ok');
  });

  it('skips a model that exceeds its own deadline', async () => {
    const callModel = vi.fn((model, signal) =>
      model === 'slow'
        ? new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)))
        : Promise.resolve('ok')
    );
    await expect(autoModelRoute(['slow', 'fast'], callModel, { attemptTimeoutMs: 20 })).resolves.toBe('ok');
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it('stops when the whole request is cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    const callModel = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(autoModelRoute(['a', 'b'], callModel, { signal: controller.signal })).rejects.toThrow('aborted');
    expect(callModel).toHaveBeenCalledTimes(1);
  });
});