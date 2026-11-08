/**
 * All REST calls to the backend. This file is the source of truth for the
 * REST contract (see API_CONTRACT.md).
 *
 * BASE is the backend origin from VITE_API_BASE_URL (see apiBase.js), or ''
 * for same-origin calls. Every request sends cookies (`credentials: 'include'`),
 * which also works cross-origin as long as the backend's CORS allows it.
 */
import { resolveApiBase } from './apiBase.js';

const BASE = resolveApiBase(import.meta.env.VITE_API_BASE_URL);

const REFRESH_PATH = '/api/auth/refresh';

// Paths whose 401 is never answered with a refresh: a wrong password on login,
// the refresh call itself (no recursion), and logout, which needs no access
// token (refreshing just to log out would be pointless).
const NO_REFRESH = new Set(['/api/auth/login', REFRESH_PATH, '/api/auth/logout']);

// Paths whose final 401 must not trigger the "session expired" handler: the
// three above, plus the startup session check, where 401 just means "show the
// login screen" and initSession() handles it.
const SESSION_401_EXEMPT = new Set([...NO_REFRESH, '/api/auth/me']);

let unauthorizedHandler = null;
let refreshedHandler = null;

/**
 * Registers the function to call when the session is gone for good: a request
 * still gets a 401 after a refresh, or the refresh itself is refused. The auth
 * store uses it to log the user out, so every page returns to the login screen
 * instead of failing in its own way. Pass null to clear it.
 */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

/**
 * Registers the function to call with the `user` from each successful refresh,
 * so the auth store can pick up changes such as the `admin` flag. Pass null to
 * clear it.
 */
export function onSessionRefreshed(handler) {
  refreshedHandler = handler;
}

/**
 * One HTTP round trip, no refresh logic. Returns the parsed JSON (null for
 * 204). On a non-2xx response it throws the parsed error body with `status`
 * added (`{ error, message, status }`); if the body isn't JSON (for example a
 * proxy's HTML error page) it throws `{ status }`. A network failure, where no
 * response arrives, rejects with fetch's own TypeError.
 */
async function send(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw { ...(errBody && typeof errBody === 'object' ? errBody : {}), status: res.status };
  }
  return res.status === 204 ? null : res.json();
}

// The refresh in progress, shared by every request that gets a 401 while it
// runs: `{ promise, notified }`. Refresh tokens rotate, so two parallel
// refreshes would present the same token twice; the server treats that as
// token theft and revokes the whole session. `notified` makes sure a failed
// shared refresh calls the unauthorized handler only once.
let inflightRefresh = null;

function sharedRefresh() {
  if (!inflightRefresh) {
    const flight = { notified: false };
    flight.promise = refreshSession().finally(() => {
      if (inflightRefresh === flight) inflightRefresh = null;
    });
    inflightRefresh = flight;
  }
  return inflightRefresh;
}

function notifyUnauthorized(path, flight) {
  if (SESSION_401_EXEMPT.has(path)) return;
  if (flight) {
    if (flight.notified) return;
    flight.notified = true;
  }
  unauthorizedHandler?.();
}

/**
 * Sends a request, transparently renewing an expired access token.
 *
 * On a 401 (except from login, refresh and logout) it calls
 * `POST /api/auth/refresh` once, shared with any other request that hit a 401
 * at the same time, then retries the original request once. Retrying is safe
 * because a 401 means the server rejected the request before acting on it.
 *
 * - Refresh refused (401): the session is over. The unauthorized handler runs
 *   (once per refresh) and the original 401 is thrown.
 * - Refresh failed some other way (5xx, network): the session may still be
 *   fine, so the user is not logged out and the refresh's error is thrown.
 * - Retry also gets a 401: no second refresh; the handler runs and the 401 is
 *   thrown.
 *
 * Errors have the same shape as `send()`'s.
 */
async function request(method, path, body) {
  try {
    return await send(method, path, body);
  } catch (err) {
    if (err?.status !== 401) throw err;
    if (NO_REFRESH.has(path)) {
      notifyUnauthorized(path);
      throw err;
    }
    const flight = sharedRefresh();
    try {
      await flight.promise;
    } catch (refreshErr) {
      if (refreshErr?.status !== 401) throw refreshErr;
      notifyUnauthorized(path, flight);
      throw err;
    }
    try {
      return await send(method, path, body);
    } catch (retryErr) {
      if (retryErr?.status === 401) notifyUnauthorized(path);
      throw retryErr;
    }
  }
}

/**
 * Exchanges the `refresh_token` cookie for a new access token (and a rotated
 * refresh token). Resolves to `{ token, user }` and passes `user` to the
 * session-refreshed listener. Never refreshes recursively: a 401 here is
 * thrown as is. Prefer letting `request()` call this; calling it directly
 * while another refresh is in flight would trigger reuse detection.
 */
export async function refreshSession() {
  const data = await send('POST', REFRESH_PATH);
  if (data?.user) refreshedHandler?.(data.user);
  return data;
}

/**
 * Turns anything `request()` can throw into text to show the user: the
 * backend's `message`, then its `error`, then `fallback`. A network failure
 * gets its own explanation, because "Load failed" / "Failed to fetch" means
 * nothing to a user.
 */
export function errorMessage(err, fallback) {
  if (err instanceof TypeError) return 'Could not reach the server. Check your connection and try again.';
  return err?.message || err?.error || fallback;
}

export const login                  = (data)       => request('POST',   '/api/auth/login', data);
export const logout                 = ()           => request('POST',   '/api/auth/logout');
export const getMe                  = ()           => request('GET',    '/api/auth/me');

export const getPeople              = ()           => request('GET',    '/api/people');
export const createPerson           = (data)       => request('POST',   '/api/people', data);
export const getPersonDetail        = (id)         => request('GET',    `/api/people/${id}`);
export const deletePerson           = (id)         => request('DELETE', `/api/people/${id}`);

export const addMeasurement         = (id, data)   => request('POST',   `/api/people/${id}/measurements`, data);
export const deleteMeasurement      = (id, eid)    => request('DELETE', `/api/people/${id}/measurements/${eid}`);

export const getMeasurementTypes    = ()           => request('GET',    '/api/measurement-types');
export const createMeasurementType  = (data)       => request('POST',   '/api/measurement-types', data);
export const updateMeasurementType  = (id, data)   => request('PUT',    `/api/measurement-types/${id}`, data);
export const deleteMeasurementType  = (id)         => request('DELETE', `/api/measurement-types/${id}`);

export const createUnit             = (typeId, data)       => request('POST',   `/api/measurement-types/${typeId}/units`, data);
export const updateUnit             = (typeId, unitId, data) => request('PUT',  `/api/measurement-types/${typeId}/units/${unitId}`, data);
export const deleteUnit             = (typeId, unitId)      => request('DELETE', `/api/measurement-types/${typeId}/units/${unitId}`);

export const importData             = (payload)    => request('POST',   '/api/import', payload);

export const getUsers               = ()           => request('GET',    '/api/users');
export const createUser             = (data)       => request('POST',   '/api/users', data);
export const deleteUser             = (id)         => request('DELETE', `/api/users/${id}`);
