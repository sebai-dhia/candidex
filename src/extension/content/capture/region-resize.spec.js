import { describe, expect, it } from 'vitest';

import { applyHandleResize } from './region-resize.js';

describe('applyHandleResize', () => {
  const rect = { left: 100, top: 100, width: 200, height: 120 };

  it('resizes from bottom-right handle', () => {
    const result = applyHandleResize('br', rect, 20, 30);
    expect(result).toEqual({ left: 100, top: 100, width: 220, height: 150 });
  });

  it('resizes from top-left handle', () => {
    const result = applyHandleResize('tl', rect, 20, 15);
    expect(result).toEqual({ left: 120, top: 115, width: 180, height: 105 });
  });
});