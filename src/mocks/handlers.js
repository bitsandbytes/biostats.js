import { http, HttpResponse } from 'msw';

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
      { id: 'unit-lb', label: 'Pounds', abbreviation: 'lb' },
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

let sessionUserId = null;
let nextId = 1;
const uid = () => `gen-${nextId++}`;

// --- helpers ---
function latestByType(personId) {
  const byType = {};
  for (const m of measurements) {
    if (m.person_id !== personId) continue;
    const cur = byType[m.type];
    if (!cur || m.measured_at > cur.measured_at) {
      byType[m.type] = { value: m.value, unit: m.unit, measured_at: m.measured_at };
    }
  }
  return byType;
}

function requireSession() {
  if (!sessionUserId) return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

function requireAdmin() {
  const denied = requireSession();
  if (denied) return denied;
  const user = users.find(u => u.id === sessionUserId);
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
    sessionUserId = user.id;
    const { password: _, ...safe } = user;
    return HttpResponse.json({ user: safe });
  }),

  http.post('/api/auth/logout', () => {
    sessionUserId = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/auth/me', () => {
    const denied = requireSession();
    if (denied) return denied;
    const user = users.find(u => u.id === sessionUserId);
    const { password: _, ...safe } = user;
    return HttpResponse.json(safe);
  }),

  // Users
  http.get('/api/users', () => {
    const denied = requireAdmin();
    if (denied) return denied;
    return HttpResponse.json(users.map(({ password: _, ...u }) => u));
  }),

  http.post('/api/users', async ({ request }) => {
    const denied = requireAdmin();
    if (denied) return denied;
    const { email, password, admin = false } = await request.json();
    const user = { id: uid(), email, password, admin, created_at: new Date().toISOString() };
    users.push(user);
    const { password: _, ...safe } = user;
    return HttpResponse.json(safe, { status: 201 });
  }),

  http.delete('/api/users/:id', ({ params }) => {
    const denied = requireAdmin();
    if (denied) return denied;
    const idx = users.findIndex(u => u.id === params.id);
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    users.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // People
  http.get('/api/people', () => {
    const denied = requireSession();
    if (denied) return denied;
    return HttpResponse.json(people.map(p => ({ ...p, latestByType: latestByType(p.id) })));
  }),

  http.post('/api/people', async ({ request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const { name, notes } = await request.json();
    const person = { id: uid(), name, notes: notes ?? '', created_at: new Date().toISOString() };
    people.push(person);
    return HttpResponse.json(person, { status: 201 });
  }),

  http.get('/api/people/:id', ({ params }) => {
    const denied = requireSession();
    if (denied) return denied;
    const person = people.find(p => p.id === params.id);
    if (!person) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const ms = measurements
      .filter(m => m.person_id === params.id)
      .sort((a, b) => b.measured_at.localeCompare(a.measured_at));
    return HttpResponse.json({ ...person, measurements: ms });
  }),

  http.delete('/api/people/:id', ({ params }) => {
    const denied = requireSession();
    if (denied) return denied;
    const idx = people.findIndex(p => p.id === params.id);
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    people.splice(idx, 1);
    const toRemove = measurements.filter(m => m.person_id === params.id).map(m => m.id);
    toRemove.forEach(id => measurements.splice(measurements.findIndex(m => m.id === id), 1));
    return new HttpResponse(null, { status: 204 });
  }),

  // Measurements
  http.post('/api/people/:id/measurements', async ({ params, request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const person = people.find(p => p.id === params.id);
    if (!person) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const { type, value, unit, measured_at } = await request.json();
    const m = { id: uid(), person_id: params.id, type, value, unit, measured_at, created_at: new Date().toISOString() };
    measurements.push(m);
    return HttpResponse.json(m, { status: 201 });
  }),

  http.delete('/api/people/:id/measurements/:entryId', ({ params }) => {
    const denied = requireSession();
    if (denied) return denied;
    const idx = measurements.findIndex(m => m.id === params.entryId && m.person_id === params.id);
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    measurements.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Measurement types
  http.get('/api/measurement-types', () => {
    const denied = requireSession();
    if (denied) return denied;
    return HttpResponse.json(measurementTypes);
  }),

  http.post('/api/measurement-types', async ({ request }) => {
    const denied = requireAdmin();
    if (denied) return denied;
    const { label } = await request.json();
    if (measurementTypes.some(t => t.label === label)) {
      return HttpResponse.json({ error: 'Conflict', message: 'A type with this label already exists.' }, { status: 409 });
    }
    const type = { id: uid(), label, units: [] };
    measurementTypes.push(type);
    return HttpResponse.json(type, { status: 201 });
  }),

  http.put('/api/measurement-types/:id', async ({ params, request }) => {
    const denied = requireAdmin();
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

  http.delete('/api/measurement-types/:id', ({ params }) => {
    const denied = requireAdmin();
    if (denied) return denied;
    const idx = measurementTypes.findIndex(t => t.id === params.id);
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    measurementTypes.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/measurement-types/:id/units', async ({ params, request }) => {
    const denied = requireAdmin();
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

  http.put('/api/measurement-types/:id/units/:unitId', async ({ params, request }) => {
    const denied = requireAdmin();
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

  http.delete('/api/measurement-types/:id/units/:unitId', ({ params }) => {
    const denied = requireAdmin();
    if (denied) return denied;
    const type = measurementTypes.find(t => t.id === params.id);
    if (!type) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    const idx = type.units.findIndex(u => u.id === params.unitId);
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    type.units.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // Import
  http.post('/api/import', async ({ request }) => {
    const denied = requireSession();
    if (denied) return denied;
    const { rows } = await request.json();
    let created = 0, skipped = 0;
    const errors = [];
    for (const row of rows) {
      try {
        let person = people.find(p => p.name === row.name);
        if (!person) {
          person = { id: uid(), name: row.name, notes: '', created_at: new Date().toISOString() };
          people.push(person);
        }
        measurements.push({
          id: uid(),
          person_id: person.id,
          type: row.type,
          value: row.value,
          unit: row.unit,
          measured_at: row.measured_at,
          created_at: new Date().toISOString(),
        });
        created++;
      } catch (e) {
        skipped++;
        errors.push(String(e));
      }
    }
    return HttpResponse.json({ created, skipped, errors });
  }),
];
