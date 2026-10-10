import { describe, it, expect } from 'vitest';
import { resolveApiBase, isMockMode } from './apiBase.js';

describe('resolveApiBase', () => {
  it('returns an empty base (same-origin / dev proxy) when unset or blank', () => {
    expect(resolveApiBase(undefined)).toBe('');
    expect(resolveApiBase('')).toBe('');
    expect(resolveApiBase('   ')).toBe('');
  });

  it('returns an empty base in mock mode so MSW intercepts same-origin /api/*', () => {
    expect(resolveApiBase('mock')).toBe('');
  });

  it('keeps an absolute http(s) origin', () => {
    expect(resolveApiBase('https://api.example.com')).toBe('https://api.example.com');
    expect(resolveApiBase('http://localhost:8080')).toBe('http://localhost:8080');
  });

  it('trims whitespace and trailing slashes so paths do not become //api', () => {
    expect(resolveApiBase(' https://api.example.com/ ')).toBe('https://api.example.com');
    expect(resolveApiBase('https://api.example.com//')).toBe('https://api.example.com');
  });

  it('keeps a path prefix', () => {
    expect(resolveApiBase('https://example.com/backend/')).toBe('https://example.com/backend');
  });

  it('rejects a value without a scheme, which would otherwise be fetched as a relative path', () => {
    expect(() => resolveApiBase('api.example.com')).toThrow(/VITE_API_BASE_URL/);
  });

  it('rejects non-http(s) schemes', () => {
    expect(() => resolveApiBase('ftp://api.example.com')).toThrow(/VITE_API_BASE_URL/);
  });
});

describe('isMockMode', () => {
  it('is true only for the literal "mock"', () => {
    expect(isMockMode('mock')).toBe(true);
    expect(isMockMode(' mock ')).toBe(true);
    expect(isMockMode('')).toBe(false);
    expect(isMockMode(undefined)).toBe(false);
    expect(isMockMode('https://api.example.com')).toBe(false);
  });
});
