import { describe, expect, it } from 'vitest';

import { parseAiCapturePayload, parseNavigatePath, parseRuntimeMessage } from './validate.js';
import messages from './messages.json';

describe('parseAiCapturePayload', () => {
  it('accepts a normal capture payload', () => {
    expect(
      parseAiCapturePayload({
        role: 'Engineer',
        company: 'Acme',
        country: 'France',
        workType: 'Remote',
        platform: 'LinkedIn',
        notes: 'hi',
        jobLink: 'https://jobs.example/1'
      })
    ).toMatchObject({
      role: 'Engineer',
      company: 'Acme',
      allowDuplicate: false,
    });
  });

  it('rejects missing role/company and oversize fields', () => {
    expect(parseAiCapturePayload({ role: '', company: 'Acme' })).toBeNull();
    expect(parseAiCapturePayload({ role: 'x', company: 'y'.repeat(5000) })?.company.length).toBe(4000);
  });
});

describe('parseNavigatePath', () => {
  it('accepts internal paths only', () => {
    expect(parseNavigatePath('/track?focus=abc')).toBe('/track?focus=abc');
    expect(parseNavigatePath('https://evil.example')).toBeNull();
    expect(parseNavigatePath('../escape')).toBeNull();
  });
});

describe('parseRuntimeMessage', () => {
  it('accepts SAVE_AI_JOB with valid payload', () => {
    const parsed = parseRuntimeMessage({
      action: messages.SAVE_AI_JOB,
      payload: { role: 'QA', company: 'Sateliance' }
    });
    expect(parsed?.action).toBe(messages.SAVE_AI_JOB);
  });

  it('rejects unknown actions and malformed SAVE_AI_JOB', () => {
    expect(parseRuntimeMessage({ action: 'HACK_ME' })).toBeNull();
    expect(parseRuntimeMessage({ action: messages.SAVE_AI_JOB, payload: { role: 'only' } })).toBeNull();
  });
});