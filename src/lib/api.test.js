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

/**
 * A fake fetch that answers by path. `routes[path]` is a list of responses
 * consumed in order (the last one repeats). Every call is recorded in `calls`.
 */
function routedFetch(routes) {
  const calls = [];
  const fetch = vi.fn((url, init) => {
    const path = new URL(url, 'http://test').pathname;
    calls.push(`${init.method} ${path}`);
    const queue = routes[path];
    if (!queue) return respond(404, { error: 'Not found' });
    const next = queue.length > 1 ? queue.shift() : queue[0];
    return typeof next === 'function' ? next() : respond(next.status, next.body);
  });
  return { fetch, calls };
}

const ok = (body = {}) => ({ status: 200, body });
const unauth = { status: 401, body: { error: 'Unauthorized' } };
const user = { id: 'u1', email: 'a@b.c', admin: false };

describe('access token refresh', () => {
  let unauthorized;

  beforeEach(() => {
    unauthorized = vi.fn();
    api.onUnauthorized(unauthorized);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    api.onUnauthorized(null);
  });

  it('refreshes on a 401 and retries the original request once', async () => {
    const { fetch, calls } = routedFetch({
      '/api/people': [unauth, ok([{ id: 'p1' }])],
      '/api/auth/refresh': [ok({ user })],
    });
    vi.stubGlobal('fetch', fetch);
    await expect(api.getPeople()).resolves.toEqual([{ id: 'p1' }]);
    expect(calls).toEqual(['GET /api/people', 'POST /api/auth/refresh', 'GET /api/people']);
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('retries a request with a body, sending the same body', async () => {
    const { fetch } = routedFetch({
      '/api/people': [unauth, ok({ id: 'p1' })],
      '/api/auth/refresh': [ok({ user })],
    });
    vi.stubGlobal('fetch', fetch);
    await api.createPerson({ name: 'Ann' });
    const bodies = fetch.mock.calls.filter(([url]) => url.endsWith('/api/people')).map(([, init]) => init.body);
    expect(bodies).toEqual(['{"name":"Ann"}', '{"name":"Ann"}']);
  });

  it('logs out once, without retrying, when the refresh itself gets a 401', async () => {
    const { fetch, calls } = routedFetch({
      '/api/people': [unauth],
      '/api/auth/refresh': [unauth],
    });
    vi.stubGlobal('fetch', fetch);
    await expect(api.getPeople()).rejects.toMatchObject({ status: 401 });
    expect(calls).toEqual(['GET /api/people', 'POST /api/auth/refresh']);
    expect(unauthorized).toHaveBeenCalledOnce();
  });

  it('sends one refresh for several requests that get a 401 at the same time', async () => {
    const { fetch, calls } = routedFetch({
      '/api/people': [unauth, ok([])],
      '/api/measurement-types': [unauth, ok([])],
      '/api/users': [unauth, ok([])],
      '/api/auth/refresh': [ok({ user })],
    });
    vi.stubGlobal('fetch', fetch);
    await Promise.all([api.getPeople(), api.getMeasurementTypes(), api.getUsers()]);
    expect(calls.filter(c => c === 'POST /api/auth/refresh')).toHaveLength(1);
    expect(calls.filter(c => c.startsWith('GET'))).toHaveLength(6);
  });

  it('calls the handler only once when a shared refresh fails', async () => {
    const { fetch } = routedFetch({
      '/api/people': [unauth],
      '/api/measurement-types': [unauth],
      '/api/auth/refresh': [unauth],
    });
    vi.stubGlobal('fetch', fetch);
    const results = await Promise.allSettled([api.getPeople(), api.getMeasurementTypes()]);
    expect(results.map(r => r.status)).toEqual(['rejected', 'rejected']);
    expect(unauthorized).toHaveBeenCalledOnce();
  });

  it('starts a new refresh for a 401 after the previous refresh finished', async () => {
    const { fetch, calls } = routedFetch({
      '/api/people': [unauth, ok([]), unauth, ok([])],
      '/api/auth/refresh': [ok({ user })],
    });
    vi.stubGlobal('fetch', fetch);
    await api.getPeople();
    await api.getPeople();
    expect(calls.filter(c => c === 'POST /api/auth/refresh')).toHaveLength(2);
  });

  it('does not refresh again when the retried request also gets a 401', async () => {
    const { fetch, calls } = routedFetch({
      '/api/people': [unauth],
      '/api/auth/refresh': [ok({ user })],
    });
    vi.stubGlobal('fetch', fetch);
    await expect(api.getPeople()).rejects.toMatchObject({ status: 401 });
    expect(calls).toEqual(['GET /api/people', 'POST /api/auth/refresh', 'GET /api/people']);
    expect(unauthorized).toHaveBeenCalledOnce();
  });

  it('does not refresh on a 401 from the refresh endpoint itself', async () => {
    const { fetch, calls } = routedFetch({ '/api/auth/refresh': [unauth] });
    vi.stubGlobal('fetch', fetch);
    await expect(api.refreshSession()).rejects.toMatchObject({ status: 401 });
    expect(calls).toEqual(['POST /api/auth/refresh']);
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('does not refresh on a failed login or logout', async () => {
    const { fetch, calls } = routedFetch({
      '/api/auth/login': [unauth],
      '/api/auth/logout': [unauth],
    });
    vi.stubGlobal('fetch', fetch);
    await expect(api.login({ email: 'a', password: 'b' })).rejects.toMatchObject({ status: 401 });
    await expect(api.logout()).rejects.toMatchObject({ status: 401 });
    expect(calls).toEqual(['POST /api/auth/login', 'POST /api/auth/logout']);
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('refreshes and retries the startup session check (me)', async () => {
    const { fetch, calls } = routedFetch({
      '/api/auth/me': [unauth, ok(user)],
      '/api/auth/refresh': [ok({ user })],
    });
    vi.stubGlobal('fetch', fetch);
    await expect(api.getMe()).resolves.toEqual(user);
    expect(calls).toEqual(['GET /api/auth/me', 'POST /api/auth/refresh', 'GET /api/auth/me']);
  });

  it('does not call the handler when me fails after a refresh (startup shows login itself)', async () => {
    const { fetch } = routedFetch({
      '/api/auth/me': [unauth],
      '/api/auth/refresh': [unauth],
    });
    vi.stubGlobal('fetch', fetch);
    await expect(api.getMe()).rejects.toMatchObject({ status: 401 });
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('keeps the session when the refresh fails for a non-auth reason, and throws that error', async () => {
    const { fetch } = routedFetch({
      '/api/people': [unauth],
      '/api/auth/refresh': [{ status: 503, body: null }],
    });
    vi.stubGlobal('fetch', fetch);
    await expect(api.getPeople()).rejects.toMatchObject({ status: 503 });
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('passes a network failure during the refresh through without logging out', async () => {
    const { fetch } = routedFetch({
      '/api/people': [unauth],
      '/api/auth/refresh': [() => Promise.reject(new TypeError('Failed to fetch'))],
    });
    vi.stubGlobal('fetch', fetch);
    await expect(api.getPeople()).rejects.toBeInstanceOf(TypeError);
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('tells the session-refreshed listener about the user from a refresh', async () => {
    const refreshed = vi.fn();
    api.onSessionRefreshed(refreshed);
    const { fetch } = routedFetch({
      '/api/people': [unauth, ok([])],
      '/api/auth/refresh': [ok({ token: 't', user })],
    });
    vi.stubGlobal('fetch', fetch);
    await api.getPeople();
    expect(refreshed).toHaveBeenCalledWith(user);
    api.onSessionRefreshed(null);
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
