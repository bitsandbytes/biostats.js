import * as api from '../lib/api.js';

export const store = $state({ types: [] }); // types: MeasurementType[] = { id, label, units: [{ id, label, abbreviation }] }

export async function loadTypes() {
  store.types = await api.getMeasurementTypes();
}

export async function createType(label) {
  const type = await api.createMeasurementType({ label });
  store.types.push({ ...type, units: type.units ?? [] });
  return type;
}

export async function renameType(id, label) {
  const updated = await api.updateMeasurementType(id, { label });
  const type = store.types.find(t => t.id === id);
  if (type) type.label = updated.label;
}

export async function removeType(id) {
  await api.deleteMeasurementType(id);
  store.types = store.types.filter(t => t.id !== id);
}

export async function addUnit(typeId, data) {
  const unit = await api.createUnit(typeId, data);
  const type = store.types.find(t => t.id === typeId);
  if (type) type.units.push(unit);
  return unit;
}

export async function renameUnit(typeId, unitId, data) {
  const updated = await api.updateUnit(typeId, unitId, data);
  const type = store.types.find(t => t.id === typeId);
  const unit = type?.units.find(u => u.id === unitId);
  if (unit) Object.assign(unit, updated);
}

export async function removeUnit(typeId, unitId) {
  await api.deleteUnit(typeId, unitId);
  const type = store.types.find(t => t.id === typeId);
  if (type) type.units = type.units.filter(u => u.id !== unitId);
}
