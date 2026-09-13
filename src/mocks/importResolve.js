/**
 * Resolve a CSV row's free-text `type`/`unit` against an in-memory
 * MeasurementType[] list, auto-creating a type and/or unit when no
 * case-insensitive match exists. Mutates `types` in place. Mirrors the
 * backend import auto-creation rules documented in API_CONTRACT.md.
 *
 * Matching is case-insensitive after trimming:
 *  - a type matches an existing `MeasurementType.label`;
 *  - a unit matches an existing `Unit.abbreviation` OR its `Unit.label`
 *    (so a CSV cell of `"pounds"` resolves to the seeded `Pounds` / `lbs`
 *    unit). An abbreviation hit wins if a label hit points at a different
 *    unit.
 *
 * Returns the resolved `type`/`unit` (using canonical label/abbreviation,
 * not necessarily the input's casing) plus `created`, which holds the
 * newly-created type/unit summary (or null) for reporting back to the client.
 */
export function resolveTypeAndUnit(types, rawType, rawUnit, uid) {
  const typeInput = rawType.trim();
  const unitInput = rawUnit.trim();

  let type = types.find(t => t.label.toLowerCase() === typeInput.toLowerCase());
  let createdType = null;
  if (!type) {
    type = { id: uid(), label: typeInput, units: [] };
    types.push(type);
    createdType = { id: type.id, label: type.label };
  }

  const unitKey = unitInput.toLowerCase();
  let unit = type.units.find(u => u.abbreviation.toLowerCase() === unitKey)
    ?? type.units.find(u => u.label.toLowerCase() === unitKey);
  let createdUnit = null;
  if (!unit) {
    unit = { id: uid(), label: unitInput, abbreviation: unitInput };
    type.units.push(unit);
    createdUnit = {
      id: unit.id,
      label: unit.label,
      abbreviation: unit.abbreviation,
      typeId: type.id,
      typeLabel: type.label,
    };
  }

  return { type, unit, created: { type: createdType, unit: createdUnit } };
}
