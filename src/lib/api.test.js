import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as api from './api.js';

function respond(status, body, { json = true } = {}) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => (json ? Promise.resolve(body) : Promise.reject(new SyntaxError('Unexpected token'))),
  });
}

describe('request errors', () => {
  let unauthorized;

  beforeEach(() => {
    unauthorized = vi.fn();
    api.onUnauthorized(unauthorized);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    api.onUnauthorized(null);
  });

  it('throws the parsed error body with the HTTP status attached', async () => {
    vi.stubGlobal('fetch', () => respond(409, { error: 'Conflict', message: 'Email exists' }));
    await expect(api.createUser({})).rejects.toEqual({ error: 'Conflict', message: 'Email exists', status: 409 });
  });

  it('still throws an object with the status when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', () => respond(502, null, { json: false }));
    await expect(api.getPeople()).rejects.toEqual({ status: 502 });
  });

  it('calls the unauthorized handler on a 401 from a data endpoint', async () => {
    vi.stubGlobal('fetch', () => respond(401, { error: 'Unauthorized' }));
    await expect(api.getPeople()).rejects.toMatchObject({ status: 401 });
    expect(unauthorized).toHaveBeenCalledOnce();
  });

  it('does not treat a failed login (wrong password) as an expired session', async () => {
    vi.stubGlobal('fetch', () => respond(401, { error: 'Unauthorized' }));
    await expect(api.login({ email: 'a', password: 'b' })).rejects.toMatchObject({ status: 401 });
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('does not call the handler for the session check, which handles 401 itself', async () => {
    vi.stubGlobal('fetch', () => respond(401, { error: 'Unauthorized' }));
    await expect(api.getMe()).rejects.toMatchObject({ status: 401 });
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('does not call the handler for other errors', async () => {
    vi.stubGlobal('fetch', () => respond(403, { error: 'Forbidden' }));
    await expect(api.getUsers()).rejects.toMatchObject({ status: 403 });
    expect(unauthorized).not.toHaveBeenCalled();
  });
});

describe('errorMessage', () => {
  it('prefers the body message, then error, then the fallback', () => {
    expect(api.errorMessage({ message: 'Bad', error: 'X' }, 'fb')).toBe('Bad');
    expect(api.errorMessage({ error: 'Forbidden' }, 'fb')).toBe('Forbidden');
    expect(api.errorMessage({ status: 502 }, 'fb')).toBe('fb');
    expect(api.errorMessage(undefined, 'fb')).toBe('fb');
  });

  it('explains a network failure (fetch rejected, no response)', () => {
    expect(api.errorMessage(new TypeError('Load failed'), 'fb')).toMatch(/reach the server/);
  });
});
