import * as api from '../lib/api.js';

export const store = $state({ types: [] }); // types: TypeSuggestion[]

export async function loadTypes() {
  store.types = await api.getMeasurementTypes();
}

export function suggestUnits(typeName) {
  return store.types.find(t => t.type === typeName)?.units ?? [];
}

export function typeNames() {
  return store.types.map(t => t.type);
}
