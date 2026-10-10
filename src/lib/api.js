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

// Paths whose 401 means something other than "the session has expired":
// a wrong password on login, and the session check at startup, which already
// treats 401 as "logged out".
const SESSION_401_EXEMPT = new Set(['/api/auth/login', '/api/auth/me']);

let unauthorizedHandler = null;

/**
 * Registers the function to call when a request gets a 401, meaning the
 * session has expired or the browser didn't send the cookie. The auth store
 * uses it to log the user out, so every page returns to the login screen
 * instead of failing in its own way. Pass null to clear it.
 */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

/**
 * Sends a request and returns the parsed JSON (null for 204).
 *
 * On a non-2xx response it throws the parsed error body with `status` added
 * (`{ error, message, status }`). If the body isn't JSON, for example a proxy's
 * HTML error page, it throws `{ status }`. A network failure, where no
 * response arrives, rejects with fetch's own TypeError.
 */
async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    if (res.status === 401 && !SESSION_401_EXEMPT.has(path)) unauthorizedHandler?.();
    throw { ...(errBody && typeof errBody === 'object' ? errBody : {}), status: res.status };
  }
  return res.status === 204 ? null : res.json();
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
