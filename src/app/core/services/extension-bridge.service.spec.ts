import { describe, expect, it, vi, afterEach } from 'vitest';
import '@angular/compiler';

import { EXTENSION_MSG } from '../constants/extension-messages.constants';
import { ExtensionBridgeService } from './extension-bridge.service';

describe('ExtensionBridgeService security', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('ignores SAVE_AI_JOB arriving via window.parent postMessage', async () => {
    const parent = { __isParent: true };
    vi.stubGlobal('window', {
      parent,
      setTimeout: globalThis.setTimeout.bind(globalThis),
    });

    const createFromAiCapture = vi.fn();

    const parentHandled = await ExtensionBridgeService.prototype.handleParentMessage.call(
      {
        applications: { createFromAiCapture }
      },
      {
        source: parent,
        data: {
          action: EXTENSION_MSG.SAVE_AI_JOB,
          payload: { role: 'Hacker', company: 'Evil' }
        }
      } as unknown as MessageEvent
    );

    expect(parentHandled).toBe(true);
    expect(createFromAiCapture).not.toHaveBeenCalled();
  });
});