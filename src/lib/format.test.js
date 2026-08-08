import { describe, it, expect } from 'vitest';
import { formatValue, formatDate, today } from './format.js';

describe('formatValue', () => {
  it('strips trailing zeros beyond 2 decimal places', () => {
    expect(formatValue(72.5)).toBe('72.5');
    expect(formatValue(72)).toBe('72');
  });

  it('rounds to at most 2 decimal places', () => {
    expect(formatValue(72.12345)).toBe('72.12');
  });

  it('coerces numeric strings', () => {
    expect(formatValue('180')).toBe('180');
  });
});

describe('formatDate', () => {
  it('formats an ISO date as a short human-readable date', () => {
    expect(formatDate('2026-03-05')).toBe('Mar 5, 2026');
  });

  it('returns an empty string for falsy input', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
  });
});

describe('today', () => {
  it('returns the current date in YYYY-MM-DD form', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
