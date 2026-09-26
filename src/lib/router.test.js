import { describe, it, expect } from 'vitest';
import { matchPath } from './router.js';

describe('matchPath', () => {
  it('matches a static pattern with no params', () => {
    expect(matchPath('/', '/')).toEqual({});
    expect(matchPath('/import', '/import')).toEqual({});
  });

  it('returns null for a static pattern that does not match', () => {
    expect(matchPath('/import', '/admin')).toBeNull();
  });

  it('extracts a single dynamic segment', () => {
    expect(matchPath('/person/:id', '/person/42')).toEqual({ id: '42' });
  });

  it('returns null when segment counts differ', () => {
    expect(matchPath('/person/:id', '/person')).toBeNull();
    expect(matchPath('/person/:id', '/person/42/extra')).toBeNull();
  });

  it('ignores a trailing slash on either side', () => {
    expect(matchPath('/person/:id', '/person/42/')).toEqual({ id: '42' });
    expect(matchPath('/import/', '/import')).toEqual({});
  });

  it('decodes URI-encoded param values', () => {
    expect(matchPath('/person/:id', '/person/a%20b')).toEqual({ id: 'a b' });
  });
});
