import { describe, expect, it } from 'vitest';

import { APPLICATION_SHEET_HEADERS, mapSheetRowToApplication } from '../domain/application/application-row.utils';
import { routes } from '../app/app.routes';
import sheetFixture from './sheet-row.fixture.json';
import storageFixture from './user-storage.fixture.json';
import messages from '../contracts/extension-messaging/messages.json';

describe('migration baseline contracts', () => {
  it('keeps Google Sheet column order stable', () => {
    expect([...APPLICATION_SHEET_HEADERS]).toEqual(sheetFixture.headers);
    const mapped = mapSheetRowToApplication(sheetFixture.sampleRow);
    expect(mapped.id).toBe('m1fixture');
    expect(mapped.company).toBe('SATELIANCE');
    expect(mapped.work_type).toBe('On-site');
  });

  it('keeps storage key shapes for existing users', () => {
    expect(storageFixture).toHaveProperty('candidexSpreadsheetId');
    expect(storageFixture).toHaveProperty('candidexSetupStatus');
    expect(storageFixture).toHaveProperty('candidexLocale');
    expect(storageFixture.aiEngineConfig).toMatchObject({
      providerId: 'groq',
      apiKey: expect.any(String),
      healthStatus: 'healthy'
    });
  });

  it('keeps application routes available', () => {
    const paths = routes.map((route) => route.path);
    expect(paths).toEqual(expect.arrayContaining(['', 'dashboard', 'new', 'track']));
    expect(sheetFixture.routes).toContain('/dashboard');
  });

  it('keeps critical extension message actions', () => {
    expect(messages.SAVE_AI_JOB).toBe('SAVE_AI_JOB');
    expect(messages.EXTRACT_TEXT).toBe('EXTRACT_TEXT');
    expect(messages.TOGGLE_OVERLAY).toBe('TOGGLE_OVERLAY');
    expect(messages.NAVIGATE).toBe('NAVIGATE');
  });
});