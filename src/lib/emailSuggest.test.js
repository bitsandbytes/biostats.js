import { describe, it, expect } from 'vitest';
import { emailSuggestions, COMMON_EMAIL_DOMAINS } from './emailSuggest.js';

describe('emailSuggestions', () => {
  it('suggests nothing before an @ is typed', () => {
    expect(emailSuggestions('')).toEqual([]);
    expect(emailSuggestions('jane')).toEqual([]);
  });

  it('suggests nothing when there is no local part', () => {
    expect(emailSuggestions('@')).toEqual([]);
    expect(emailSuggestions('@gm')).toEqual([]);
  });

  it('offers every common domain right after the @', () => {
    expect(emailSuggestions('jane@')).toEqual(COMMON_EMAIL_DOMAINS.map((d) => `jane@${d}`));
  });

  it('filters domains by the typed prefix, case-insensitively', () => {
    expect(emailSuggestions('jane@g')).toEqual(['jane@gmail.com']);
    expect(emailSuggestions('jane@OUT')).toEqual(['jane@outlook.com']);
  });

  it('suggests nothing once the domain is complete', () => {
    expect(emailSuggestions('jane@gmail.com')).toEqual([]);
  });

  it('suggests nothing for an unknown domain', () => {
    expect(emailSuggestions('jane@example.org')).toEqual([]);
  });

  it('ignores surrounding whitespace', () => {
    expect(emailSuggestions('  jane@gm')).toEqual(['jane@gmail.com']);
  });

  it('suggests nothing for input with more than one @', () => {
    expect(emailSuggestions('a@b@g')).toEqual([]);
  });
});
