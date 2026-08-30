import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PORT_CONTENT, PORT_PANEL } from '../../contracts/extension-messaging/ports.js';
import messages from '../../contracts/extension-messaging/messages.json';

describe('registerPortRelay', () => {
  /** @type {Map<string, Function[]>} */
  let connectListeners;
  /** @type {Array<{ name: string, onMessage: { addListener: Function }, onDisconnect: { addListener: Function }, postMessage: Function, _fireMessage: Function, _fireDisconnect: Function }>} */
  let ports;

  beforeEach(async () => {
    vi.resetModules();
    connectListeners = new Map();
    ports = [];

    vi.stubGlobal('chrome', {
      runtime: {
        onConnect: {
          addListener: (fn) => {
            const list = connectListeners.get('connect') || [];
            list.push(fn);
            connectListeners.set('connect', list);
          }
        }
      }
    });

    const { registerPortRelay } = await import('./port-relay.js');
    registerPortRelay();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  function createPort(name) {
    /** @type {Function[]} */
    const messageListeners = [];
    /** @type {Function[]} */
    const disconnectListeners = [];
    const port = {
      name,
      postMessage: vi.fn(),
      onMessage: {
        addListener: (fn) => messageListeners.push(fn),
      },
      onDisconnect: {
        addListener: (fn) => disconnectListeners.push(fn),
      },
      _fireMessage: (msg) => messageListeners.forEach((fn) => fn(msg)),
      _fireDisconnect: () => disconnectListeners.forEach((fn) => fn()),
    };
    ports.push(port);
    for (const fn of connectListeners.get('connect') || []) {
      fn(port);
    }
    return port;
  }

  it('relays validated SAVE_AI_JOB from content to panel only', () => {
    const panel = createPort(PORT_PANEL);
    const content = createPort(PORT_CONTENT);

    content._fireMessage({
      action: messages.SAVE_AI_JOB,
      payload: { role: 'Engineer', company: 'Acme' },
    });

    expect(panel.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: messages.SAVE_AI_JOB,
        payload: expect.objectContaining({ role: 'Engineer', company: 'Acme' }),
      }),
    );
  });

  it('drops malformed SAVE_AI_JOB from content', () => {
    const panel = createPort(PORT_PANEL);
    const content = createPort(PORT_CONTENT);
    panel.postMessage.mockClear();

    content._fireMessage({
      action: messages.SAVE_AI_JOB,
      payload: { role: 'Engineer' },
    });

    expect(panel.postMessage).not.toHaveBeenCalled();
  });

  it('rejects unknown host-style actions', () => {
    const panel = createPort(PORT_PANEL);
    const content = createPort(PORT_CONTENT);
    panel.postMessage.mockClear();

    content._fireMessage({ action: 'INJECT_SHEET_ROW', payload: { role: 'x', company: 'y' } });
    expect(panel.postMessage).not.toHaveBeenCalled();
  });
});