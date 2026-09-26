import { describe, it, expect } from 'vitest';
import { initials, avatarTone, typeStyle, capitalize, AVATAR_TONES } from './display.js';

describe('initials', () => {
  it('uses the first letters of the first and last words', () => {
    expect(initials('Maya Chen')).toBe('MC');
    expect(initials('Mary Anne van Dyke')).toBe('MD');
  });

  it('handles single names and extra whitespace', () => {
    expect(initials('  cher ')).toBe('C');
  });

  it('returns ? for an empty name', () => {
    expect(initials('')).toBe('?');
    expect(initials(undefined)).toBe('?');
  });
});

describe('avatarTone', () => {
  it('is deterministic for a given name', () => {
    expect(avatarTone('Maya Chen')).toBe(avatarTone('Maya Chen'));
  });

  it('always returns one of the defined tones', () => {
    for (const name of ['A', 'Jordan Ellis', 'Sam Okafor', 'zz top']) {
      expect(AVATAR_TONES).toContain(avatarTone(name));
    }
  });
});

describe('typeStyle', () => {
  it('maps known body measurements to teal icons', () => {
    expect(typeStyle('height')).toEqual({ icon: 'ruler', tone: 'body' });
    expect(typeStyle('Weight')).toEqual({ icon: 'scale', tone: 'body' });
  });

  it('maps vital signs to the vital tone', () => {
    expect(typeStyle('heart rate')).toEqual({ icon: 'heart', tone: 'vital' });
    expect(typeStyle('temperature')).toEqual({ icon: 'thermometer', tone: 'vital' });
    expect(typeStyle('blood pressure systolic')).toEqual({ icon: 'pulse', tone: 'vital' });
  });

  it('falls back to a generic icon', () => {
    expect(typeStyle('grip strength')).toEqual({ icon: 'pulse', tone: 'body' });
  });
});

describe('capitalize', () => {
  it('upper-cases only the first character', () => {
    expect(capitalize('heart rate')).toBe('Heart rate');
    expect(capitalize('BMI')).toBe('BMI');
  });

  it('handles empty input', () => {
    expect(capitalize('')).toBe('');
    expect(capitalize(undefined)).toBe('');
  });
});
