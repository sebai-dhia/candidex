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
});