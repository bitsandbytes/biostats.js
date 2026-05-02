const BASE = import.meta.env.VITE_API_BASE_URL;

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
export const importData             = (payload)    => request('POST',   '/api/import', payload);

export const getUsers               = ()           => request('GET',    '/api/users');
export const createUser             = (data)       => request('POST',   '/api/users', data);
export const deleteUser             = (id)         => request('DELETE', `/api/users/${id}`);
