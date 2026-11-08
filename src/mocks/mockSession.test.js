import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionStore } from './mockSession.js';

describe('mock session store', () => {
  let now;
  let store;

  beforeEach(() => {
    now = 0;
    store = createSessionStore({ accessTtlMs: 1000, now: () => now });
  });

  it('issues an access token that authenticates until it expires', () => {
    const { accessToken } = store.login('u1');
    expect(store.authenticate(accessToken)).toBe('u1');
    now = 999;
    expect(store.authenticate(accessToken)).toBe('u1');
    now = 1000;
    expect(store.authenticate(accessToken)).toBeNull();
  });

  it('rejects missing and unknown access tokens', () => {
    expect(store.authenticate(undefined)).toBeNull();
    expect(store.authenticate('nope')).toBeNull();
  });

  it('refresh issues a new access token and rotates the refresh token', () => {
    const first = store.login('u1');
    now = 5000;
    const next = store.refresh(first.refreshToken);
    expect(next.userId).toBe('u1');
    expect(next.refreshToken).not.toBe(first.refreshToken);
    expect(store.authenticate(next.accessToken)).toBe('u1');
  });

  it('treats a reused refresh token as theft and revokes the whole session', () => {
    const first = store.login('u1');
    const second = store.refresh(first.refreshToken);
    expect(store.refresh(first.refreshToken)).toBeNull();
    // The rotated token from the same login is revoked too.
    expect(store.refresh(second.refreshToken)).toBeNull();
  });

  it('reuse in one session does not affect another login', () => {
    const a = store.login('u1');
    const b = store.login('u1');
    store.refresh(a.refreshToken);
    store.refresh(a.refreshToken);
    expect(store.refresh(b.refreshToken)).not.toBeNull();
  });

  it('logout revokes the session’s refresh token', () => {
    const { refreshToken } = store.login('u1');
    store.logout(refreshToken);
    expect(store.refresh(refreshToken)).toBeNull();
  });

  it('logout without a token is a no-op', () => {
    expect(() => store.logout(undefined)).not.toThrow();
  });

  it('expireAccessTokens() forces the next request to refresh', () => {
    const { accessToken, refreshToken } = store.login('u1');
    store.expireAccessTokens();
    expect(store.authenticate(accessToken)).toBeNull();
    expect(store.refresh(refreshToken)).not.toBeNull();
  });

  it('revokeAll() ends every session', () => {
    const { refreshToken } = store.login('u1');
    store.revokeAll();
    expect(store.refresh(refreshToken)).toBeNull();
  });

  it('persists its state so a new store (after a page reload) keeps the session', () => {
    let saved = null;
    const persist = { load: () => saved, save: (state) => { saved = JSON.parse(JSON.stringify(state)); } };
    const before = createSessionStore({ accessTtlMs: 1000, now: () => now, persist });
    const { accessToken, refreshToken } = before.login('u1');
    const after = createSessionStore({ accessTtlMs: 1000, now: () => now, persist });
    expect(after.authenticate(accessToken)).toBe('u1');
    const rotated = after.refresh(refreshToken);
    expect(rotated).not.toBeNull();
    // Rotation was saved too: the old token now counts as reuse.
    const again = createSessionStore({ accessTtlMs: 1000, now: () => now, persist });
    expect(again.refresh(refreshToken)).toBeNull();
    expect(again.refresh(rotated.refreshToken)).toBeNull();
  });

  it('starts empty when the persisted state is missing or unreadable', () => {
    const persist = { load: () => { throw new Error('blocked'); }, save: () => {} };
    const fresh = createSessionStore({ accessTtlMs: 1000, now: () => now, persist });
    expect(fresh.authenticate('access-1')).toBeNull();
    expect(fresh.login('u1').accessToken).toBeTruthy();
  });
});
