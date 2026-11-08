import { http, HttpResponse } from 'msw';
import { resolveTypeAndUnit } from './importResolve.js';
import { validateImportRow } from './importValidate.js';
import { summarizeMeasurements } from '../lib/summary.js';
import { seedPeople } from './seed.js';
import { createSessionStore } from './mockSession.js';

// --- seed data ---
const users = [
  { id: 'user-1', email: 'timbitsandbytes@gmail.com', password: 'pw', admin: true, created_at: '2025-01-01T00:00:00Z' },
];

const people = [];
const measurements = [];

const measurementTypes = [
  { id: 'type-height', label: 'height', units: [
      { id: 'unit-cm', label: 'Centimeters', abbreviation: 'cm' },
      { id: 'unit-in', label: 'Inches', abbreviation: 'in' },
    ] },
  { id: 'type-weight', label: 'weight', units: [
      { id: 'unit-kg', label: 'Kilograms', abbreviation: 'kg' },
      { id: 'unit-lb', label: 'Pounds', abbreviation: 'lbs' },
    ] },
  { id: 'type-temperature', label: 'temperature', units: [
      { id: 'unit-c', label: 'Celsius', abbreviation: '°C' },
      { id: 'unit-f', label: 'Fahrenheit', abbreviation: '°F' },
    ] },
  { id: 'type-heart-rate', label: 'heart rate', units: [
      { id: 'unit-bpm', label: 'Beats per minute', abbreviation: 'bpm' },
    ] },
  { id: 'type-bp-systolic', label: 'blood pressure systolic', units: [
      { id: 'unit-mmhg-sys', label: 'Millimeters of mercury', abbreviation: 'mmHg' },
    ] },
  { id: 'type-bp-diastolic', label: 'blood pressure diastolic', units: [
      { id: 'unit-mmhg-dia', label: 'Millimeters of mercury', abbreviation: 'mmHg' },
    ] },
];

// Access/refresh tokens, carried in `token` / `refresh_token` cookies like the
// real backend (MSW writes mocked Set-Cookie headers to document.cookie, so
// they can't be HttpOnly here, and both use Path=/ for simplicity).
// Access tokens last 15 minutes; add `?accessttl=<seconds>` to the URL on load
// to shorten that. `window.mockAuth` (see browser.js) can expire them now.
// Sessions are kept in sessionStorage so a reload keeps you logged in (and
// exercises the startup refresh), as with the real backend.
const ACCESS_TTL_MS = accessTtlFromUrl() ?? 15 * 60 * 1000;
const SESSION_STORAGE_KEY = 'biostats-mock-sessions';
export const sessions = createSessionStore({
  accessTtlMs: ACCESS_TTL_MS,
  persist: {
    load: () => JSON.parse(globalThis.sessionStorage?.getItem(SESSION_STORAGE_KEY) ?? 'null'),
    save: (state) => globalThis.sessionStorage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(state)),
  },
});

function accessTtlFromUrl() {
  if (typeof location === 'undefined') return null;
  const seconds = Number(new URLSearchParams(location.search).get('accessttl'));
  return seconds > 0 ? seconds * 1000 : null;
}

/** Response headers that set (or, with null tokens, clear) both cookies. */
function sessionCookies(tokens) {
  const headers = new Headers();
  const cookie = (name, value) =>
    `${name}=${value ?? ''}; Path=/; SameSite=Lax${value ? '' : '; Max-Age=0'}`;
  headers.append('Set-Cookie', cookie('token', tokens?.accessToken));
  headers.append('Set-Cookie', cookie('refresh_token', tokens?.refreshToken));
  return headers;
}

const publicUser = (user) => { const { password: _, ...safe } = user; return safe; };
let nextId = 1;
const uid = () => `gen-${nextId++}`;

// Demo people + ~6 months of measurements so the Dashboard trend lines and
// PersonDetail chart have something to show in mock mode.
seedPeople(people, measurements);

// --- helpers ---
/** PersonSummary fields (`latestByType`, `recentByType`) for one person. */
function summaryFor(personId) {
  return summarizeMeasurements(measurements.filter(m => m.person_id === personId));
}

/** A 401 response unless the request's access token cookie is valid. */
function requireSession(cookies) {
  if (!sessions.authenticate(cookies.token)) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

function requireAdmin(cookies) {
  const denied = requireSession(cookies);
  if (denied) return denied;
  const user = users.find(u => u.id === sessions.authenticate(cookies.token));
  if (!user?.admin) return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

// --- handlers ---
export const handlers = [

  // Auth
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    const tokens = sessions.login(user.id);
    return HttpResponse.json({ token: tokens.accessToken, user: publicUser(user) }, { headers: sessionCookies(tokens) });
  }),

  http.post('/api/auth/refresh', ({ cookies }) => {
    const tokens = sessions.refresh(cookies.refresh_token);
    const user = tokens && users.find(u => u.id === tokens.userId);
    if (!user) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401, headers: sessionCookies(null) });
    }
    return HttpResponse.json({ token: tokens.accessToken, user: publicUser(user) }, { headers: sessionCookies(tokens) });
  }),

  http.post('/api/auth/logout', ({ cookies }) => {
    sessions.logout(cookies.refresh_token);
    return new HttpResponse(null, { status: 204, headers: sessionCookies(null) });
  }),

  http.get('/api/auth/me', ({ cookies }) => {
    const denied = requireSession(cookies);
    if (denied) return denied;
    const user = users.find(u => u.id === sessions.authenticate(cookies.token));
    if (!user) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json(publicUser(user));
  }),

  // Users
  http.get('/api/users', ({ cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;
    return HttpResponse.json(users.map(({ password: _, ...u }) => u));
  }),

  http.post('/api/users', async ({ request, cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;
    const { email, password, admin = false } = await request.json();
    const user = { id: uid(), email, password, admin, created_at: new Date().toISOString() };
    users.push(user);
    const { password: _, ...safe } = user;
    return HttpResponse.json(safe, { status: 201 });
  }),

  http.delete('/api/users/:id', ({ params, cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;
    const idx = users.findIndex(u => u.id === params.id);
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    users.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // People
  http.get('/api/people', ({ cookies }) => {
    const denied = requireSession(cookies);
    if (denied) return denied;
    return HttpResponse.json(people.map(p => ({ ...p, ...summaryFor(p.id) })));
  }),

  http.post('/api/people', async ({ request, cookies }) => {
    const denied = requireSession(cookies);
    if (denied) return denied;
    const { name, notes } = await request.json();
    const person = { id: uid(), name, notes: notes ?? '', created_at: new Date().toISOString() };
    people.push(person);
    return HttpResponse.json(person, { status: 201 });
  }),

  http.get('/api/people/:id', ({ params, cookies }) => {
    const denied = requireSession(cookies);
    if (denied) return denied;
    const person = people.find(p => p.id === params.id);
    if (!person) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const ms = measurements
      .filter(m => m.person_id === params.id)
      .sort((a, b) => b.measured_at.localeCompare(a.measured_at));
    return HttpResponse.json({ ...person, measurements: ms });
  }),

  http.delete('/api/people/:id', ({ params, cookies }) => {
    const denied = requireSession(cookies);
    if (denied) return denied;
    const idx = people.findIndex(p => p.id === params.id);
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    people.splice(idx, 1);
    const toRemove = measurements.filter(m => m.person_id === params.id).map(m => m.id);
    toRemove.forEach(id => measurements.splice(measurements.findIndex(m => m.id === id), 1));
    return new HttpResponse(null, { status: 204 });
  }),

  // Measurements
  http.post('/api/people/:id/measurements', async ({ params, request, cookies }) => {
    const denied = requireSession(cookies);
    if (denied) return denied;
    const person = people.find(p => p.id === params.id);
    if (!person) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const { type, value, unit, measured_at } = await request.json();
    const m = { id: uid(), person_id: params.id, type, value, unit, measured_at, created_at: new Date().toISOString() };
    measurements.push(m);
    return HttpResponse.json(m, { status: 201 });
  }),

  http.delete('/api/people/:id/measurements/:entryId', ({ params, cookies }) => {
    const denied = requireSession(cookies);
    if (denied) return denied;
    const idx = measurements.findIndex(m => m.id === params.entryId && m.person_id === params.id);
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    measurements.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Measurement types
  http.get('/api/measurement-types', ({ cookies }) => {
    const denied = requireSession(cookies);
    if (denied) return denied;
    return HttpResponse.json(measurementTypes);
  }),

  http.post('/api/measurement-types', async ({ request, cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;
    const { label } = await request.json();
    if (measurementTypes.some(t => t.label === label)) {
      return HttpResponse.json({ error: 'Conflict', message: 'A type with this label already exists.' }, { status: 409 });
    }
    const type = { id: uid(), label, units: [] };
    measurementTypes.push(type);
    return HttpResponse.json(type, { status: 201 });
  }),

  http.put('/api/measurement-types/:id', async ({ params, request, cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;
    const type = measurementTypes.find(t => t.id === params.id);
    if (!type) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const { label } = await request.json();
    if (measurementTypes.some(t => t.id !== params.id && t.label === label)) {
      return HttpResponse.json({ error: 'Conflict', message: 'A type with this label already exists.' }, { status: 409 });
    }
    type.label = label;
    return HttpResponse.json(type);
  }),

  http.delete('/api/measurement-types/:id', ({ params, cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;
    const idx = measurementTypes.findIndex(t => t.id === params.id);
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    measurementTypes.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/measurement-types/:id/units', async ({ params, request, cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;
    const type = measurementTypes.find(t => t.id === params.id);
    if (!type) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const { label, abbreviation } = await request.json();
    if (type.units.some(u => u.abbreviation === abbreviation)) {
      return HttpResponse.json({ error: 'Conflict', message: 'This type already has a unit with this abbreviation.' }, { status: 409 });
    }
    const unit = { id: uid(), label, abbreviation };
    type.units.push(unit);
    return HttpResponse.json(unit, { status: 201 });
  }),

  http.put('/api/measurement-types/:id/units/:unitId', async ({ params, request, cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;
    const type = measurementTypes.find(t => t.id === params.id);
    if (!type) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const unit = type.units.find(u => u.id === params.unitId);
    if (!unit) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const { label, abbreviation } = await request.json();
    if (type.units.some(u => u.id !== params.unitId && u.abbreviation === abbreviation)) {
      return HttpResponse.json({ error: 'Conflict', message: 'This type already has a unit with this abbreviation.' }, { status: 409 });
    }
    unit.label = label;
    unit.abbreviation = abbreviation;
    return HttpResponse.json(unit);
  }),

  http.delete('/api/measurement-types/:id/units/:unitId', ({ params, cookies }) => {
    const denied = requireAdmin(cookies);
    if (denied) return denied;
    const type = measurementTypes.find(t => t.id === params.id);
    if (!type) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const idx = type.units.findIndex(u => u.id === params.unitId);
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    type.units.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Import
  // Each row is validated first (see importValidate.js); an invalid row is not
  // inserted and never creates a person/type/unit. Every problem is reported
  // in `rowErrors` as { row: <0-based index into `rows`>, field, message }.
  http.post('/api/import', async ({ request, cookies }) => {
    const denied = requireSession(cookies);
    if (denied) return denied;
    const { rows } = await request.json();
    let created = 0, skipped = 0, errors = 0;
    const createdTypes = [];
    const createdUnits = [];
    const rowErrors = [];
    rows.forEach((row, index) => {
      const problems = validateImportRow(row);
      if (problems.length) {
        errors++;
        problems.forEach(p => rowErrors.push({ row: index, ...p }));
        return;
      }
      try {
        const name = row.name.trim();
        let person = people.find(p => p.name === name);
        if (!person) {
          person = { id: uid(), name, notes: '', created_at: new Date().toISOString() };
          people.push(person);
        }
        const { type, unit, created: newlyCreated } = resolveTypeAndUnit(
          measurementTypes, row.type, row.unit, uid
        );
        if (newlyCreated.type) createdTypes.push(newlyCreated.type);
        if (newlyCreated.unit) createdUnits.push(newlyCreated.unit);
        measurements.push({
          id: uid(),
          person_id: person.id,
          type: type.label,
          value: row.value,
          unit: unit.abbreviation,
          measured_at: row.measured_at,
          created_at: new Date().toISOString(),
        });
        created++;
      } catch (err) {
        errors++;
        rowErrors.push({ row: index, field: null, message: err?.message ?? 'Unexpected error.' });
      }
    });
    return HttpResponse.json({ created, skipped, errors, rowErrors, createdTypes, createdUnits });
  }),
];
