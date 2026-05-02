import * as api from '../lib/api.js';

export const store = $state({ people: [] }); // people: PersonSummary[]

export async function loadPeople() {
  store.people = await api.getPeople();
}

export async function addPerson(data) {
  const p = await api.createPerson(data);
  store.people.push(p);
}

export async function removePerson(id) {
  await api.deletePerson(id);
  store.people = store.people.filter(p => p.id !== id);
}

export async function addMeasurement(personId, data) {
  const m = await api.addMeasurement(personId, data);
  const person = store.people.find(p => p.id === personId);
  if (!person) return;
  const existing = person.latestByType[data.type];
  if (!existing || data.measured_at >= existing.measured_at) {
    person.latestByType[data.type] = { value: m.value, unit: m.unit, measured_at: m.measured_at };
  }
}
