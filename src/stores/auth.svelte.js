/**
 * Auth state: who is logged in. `auth.session` is null when logged out, which
 * makes App.svelte show <Login>.
 *
 * Access tokens are short-lived (15 min by default); `api.js` renews them with
 * the refresh cookie behind the scenes, so this store only hears about the end
 * of a session (refresh refused) and about refreshed user details.
 */
import * as api from '../lib/api.js';

export const auth = $state({ session: null }); // session: null | { id, email, admin }

// The session is over: a request still got a 401 after a refresh, or the
// refresh was refused (expired, revoked, or reused token). Back to <Login>.
api.onUnauthorized(() => { auth.session = null; });

// Every refresh returns the current user; keep details such as `admin` fresh.
api.onSessionRefreshed((user) => { if (auth.session) auth.session = user; });

/**
 * Restores the session on app load. `getMe()` refreshes an expired access
 * token and retries by itself, so a failure here means "not logged in".
 */
export async function initSession() {
  try {
    auth.session = await api.getMe();
  } catch {
    auth.session = null;
  }
}

export async function login(email, password) {
  const { user } = await api.login({ email, password });
  auth.session = user;
}

export async function logout() {
  await api.logout();
  auth.session = null;
}
