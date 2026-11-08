/**
 * In-memory access/refresh token store for the MSW mock backend, following
 * the "Session lifetime and refresh" rules in API_CONTRACT.md closely enough
 * to exercise the frontend's refresh path in the browser:
 *
 * - access tokens expire after `accessTtlMs`;
 * - each refresh rotates the refresh token (the old one becomes "used");
 * - presenting a used refresh token revokes every token from that login.
 *
 * Idle/absolute refresh-token lifetimes are not modelled; use `revokeAll()`
 * to simulate a session that has run out. Tokens are opaque strings; the
 * handlers carry them in cookies.
 *
 * MSW runs its handlers in the page, so in-memory state is lost on reload.
 * Pass `persist` (e.g. backed by sessionStorage) to keep sessions across
 * reloads, like a real server would.
 */

/**
 * @param {{
 *   accessTtlMs: number,
 *   now?: () => number,
 *   persist?: { load: () => object | null, save: (state: object) => void },
 * }} options
 */
export function createSessionStore({ accessTtlMs, now = Date.now, persist }) {
  const state = loadState(persist);
  const accessTokens = new Map(Object.entries(state.access));   // token -> { userId, expiresAt }
  const refreshTokens = new Map(Object.entries(state.refresh)); // token -> { userId, family, used }
  const revokedFamilies = new Set(state.revoked);
  let counter = state.counter;

  function save() {
    try {
      persist?.save({
        access: Object.fromEntries(accessTokens),
        refresh: Object.fromEntries(refreshTokens),
        revoked: [...revokedFamilies],
        counter,
      });
    } catch {
      // Storage full or blocked: carry on in memory.
    }
  }

  const newToken = (kind) => `${kind}-${++counter}-${Math.random().toString(36).slice(2, 10)}`;

  // A "family" is one login: the original refresh token and all its rotations.
  function issue(userId, family) {
    const accessToken = newToken('access');
    const refreshToken = newToken('refresh');
    accessTokens.set(accessToken, { userId, expiresAt: now() + accessTtlMs });
    refreshTokens.set(refreshToken, { userId, family, used: false });
    save();
    return { userId, accessToken, refreshToken };
  }

  return {
    /** Starts a session. Returns `{ userId, accessToken, refreshToken }`. */
    login(userId) {
      return issue(userId, newToken('family'));
    },

    /** The user id for a valid, unexpired access token, else null. */
    authenticate(accessToken) {
      const entry = accessToken && accessTokens.get(accessToken);
      if (!entry || now() >= entry.expiresAt) return null;
      return entry.userId;
    },

    /**
     * Rotates a refresh token. Returns new tokens, or null if the token is
     * unknown or revoked. Reusing an already-rotated token revokes its family.
     */
    refresh(refreshToken) {
      const entry = refreshToken && refreshTokens.get(refreshToken);
      if (!entry || revokedFamilies.has(entry.family)) return null;
      if (entry.used) {
        revokedFamilies.add(entry.family);
        save();
        return null;
      }
      entry.used = true; // saved by issue()
      return issue(entry.userId, entry.family);
    },

    /** Revokes the login that `refreshToken` belongs to, if any. */
    logout(refreshToken) {
      const entry = refreshToken && refreshTokens.get(refreshToken);
      if (entry) revokedFamilies.add(entry.family);
      save();
    },

    /** Dev helper: expire every access token now, as if 15 minutes passed. */
    expireAccessTokens() {
      for (const entry of accessTokens.values()) entry.expiresAt = 0;
      save();
    },

    /** Dev helper: revoke every session, as if the refresh token ran out. */
    revokeAll() {
      for (const entry of refreshTokens.values()) revokedFamilies.add(entry.family);
      save();
    },
  };
}

/** Saved state from `persist`, or an empty store if there is none or it can't be read. */
function loadState(persist) {
  const empty = { access: {}, refresh: {}, revoked: [], counter: 0 };
  try {
    const saved = persist?.load();
    return saved ? { ...empty, ...saved } : empty;
  } catch {
    return empty;
  }
}
