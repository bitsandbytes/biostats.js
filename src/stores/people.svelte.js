import * as api from '../lib/api.js';
import { applyMeasurement } from '../lib/summary.js';

/**
 * Dashboard state: `store.people` is `PersonSummary[]` from `GET /api/people`,
 * each with `latestByType` and `recentByType` (see API_CONTRACT.md).
 */
export const store = $state({ people: [] });

export async function loadPeople() {
  store.people = await api.getPeople();
}

export async function addPerson(data) {
  const p = await api.createPerson(data);
  store.people.push({ ...p, latestByType: {}, recentByType: {} });
}

export async function removePerson(id) {
  await api.deletePerson(id);
  store.people = store.people.filter(p => p.id !== id);
}

/**
 * Save a measurement and fold it into that person's summary in place, so the
 * Dashboard's latest values and trend lines update without a re-fetch.
 */
export async function addMeasurement(personId, data) {
  const m = await api.addMeasurement(personId, data);
  const person = store.people.find(p => p.id === personId);
  if (person) applyMeasurement(person, m);
  return m;
}
