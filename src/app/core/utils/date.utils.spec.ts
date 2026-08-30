import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatApplicationDate, getRelativeDateLabel, parseLocalDate } from './date.utils';

describe('date.utils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseLocalDate', () => {
    it('parses YYYY-MM-DD as local date', () => {
      const date = parseLocalDate('2026-07-06');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(6);
      expect(date.getDate()).toBe(6);
    });

    it('returns invalid date for empty input', () => {
      expect(Number.isNaN(parseLocalDate('').getTime())).toBe(true);
    });
  });

  describe('formatApplicationDate', () => {
    it('formats a valid date', () => {
      expect(formatApplicationDate('2026-07-06')).toMatch(/Jul/);
      expect(formatApplicationDate('2026-07-06')).toMatch(/6/);
    });

    it('returns empty string for invalid input', () => {
      expect(formatApplicationDate('')).toBe('');
      expect(formatApplicationDate('invalid')).toBe('');
    });
  });

  describe('getRelativeDateLabel', () => {
    it('returns Date TBD for missing or invalid dates', () => {
      expect(getRelativeDateLabel('')).toBe('Date TBD');
      expect(getRelativeDateLabel('invalid')).toBe('Date TBD');
    });

    it('returns Today for the current date', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-06T12:00:00'));
      expect(getRelativeDateLabel('2026-07-06')).toBe('Today!');
    });

    it('returns Tomorrow for the next day', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-06T12:00:00'));
      expect(getRelativeDateLabel('2026-07-07')).toBe('Tomorrow');
    });

    it('returns past and future day counts', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-06T12:00:00'));
      expect(getRelativeDateLabel('2026-07-04')).toBe('2d ago');
      expect(getRelativeDateLabel('2026-07-09')).toBe('In 3 days');
    });
  });
});
