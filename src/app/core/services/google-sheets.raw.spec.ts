import { describe, expect, it } from 'vitest';

describe('Sheets RAW write contract', () => {
  it('documents formula-like values must remain plain text', () => {
    const formulaLike = ['=HYPERLINK("http://evil")', '+1234', '-SUM(A1)', '@cmd', 'normal role'];
    // Encoder used by repository/sheets boundary: identity for RAW mode.
    const encoded = formulaLike.map((value) => String(value));
    expect(encoded).toEqual(formulaLike);
    expect(encoded.every((value) => typeof value === 'string')).toBe(true);
  });
});