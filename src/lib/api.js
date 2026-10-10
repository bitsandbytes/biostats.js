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

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await res.json();
  return res.status === 204 ? null : res.json();
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
