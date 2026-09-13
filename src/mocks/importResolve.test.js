import { describe, it, expect } from 'vitest';
import { resolveTypeAndUnit } from './importResolve.js';

function makeTypes() {
  return [
    { id: 'type-height', label: 'height', units: [
      { id: 'unit-cm', label: 'Centimeters', abbreviation: 'cm' },
    ] },
    { id: 'type-weight', label: 'weight', units: [
      { id: 'unit-lbs', label: 'Pounds', abbreviation: 'lbs' },
    ] },
  ];
}

let nextId = 0;
function uid() {
  return `gen-${nextId++}`;
}

describe('resolveTypeAndUnit', () => {
  it('creates a new type and unit when neither exists', () => {
    const types = makeTypes();
    const { type, unit, created } = resolveTypeAndUnit(types, 'BMI', 'kg/m2', uid);

    expect(type.label).toBe('BMI');
    expect(unit.abbreviation).toBe('kg/m2');
    expect(created.type).toEqual({ id: type.id, label: 'BMI' });
    expect(created.unit).toEqual({
      id: unit.id,
      label: 'kg/m2',
      abbreviation: 'kg/m2',
      typeId: type.id,
      typeLabel: 'BMI',
    });
    expect(types).toContain(type);
  });

  it('matches an existing type case-insensitively without creating a duplicate', () => {
    const types = makeTypes();
    const { type, created } = resolveTypeAndUnit(types, 'Height', 'cm', uid);

    expect(type.id).toBe('type-height');
    expect(created.type).toBeNull();
    expect(types).toHaveLength(2);
  });

  it('matches an existing unit case-insensitively within the resolved type', () => {
    const types = makeTypes();
    const { unit, created } = resolveTypeAndUnit(types, 'height', 'CM', uid);

    expect(unit.id).toBe('unit-cm');
    expect(created.unit).toBeNull();
  });

  it('matches an existing unit by its full label, not just its abbreviation', () => {
    const types = makeTypes();
    const { unit, created } = resolveTypeAndUnit(types, 'weight', 'Pounds', uid);

    expect(unit.id).toBe('unit-lbs');
    expect(unit.abbreviation).toBe('lbs');
    expect(created.unit).toBeNull();
  });

  it('matches an existing unit by label case-insensitively', () => {
    const types = makeTypes();
    const { unit, created } = resolveTypeAndUnit(types, 'weight', 'POUNDS', uid);

    expect(unit.id).toBe('unit-lbs');
    expect(created.unit).toBeNull();
  });

  it('prefers an abbreviation hit over a label hit on a different unit', () => {
    const types = [
      { id: 'type-weight', label: 'weight', units: [
        { id: 'unit-a', label: 'Stones', abbreviation: 'lbs' },
        { id: 'unit-b', label: 'lbs', abbreviation: 'st' },
      ] },
    ];
    const { unit } = resolveTypeAndUnit(types, 'weight', 'lbs', uid);

    expect(unit.id).toBe('unit-a');
  });

  it('creates a new unit when neither abbreviation nor label matches', () => {
    const types = makeTypes();
    const { unit, created } = resolveTypeAndUnit(types, 'weight', 'kg', uid);

    expect(unit.abbreviation).toBe('kg');
    expect(created.unit).not.toBeNull();
    expect(types.find(t => t.id === 'type-weight').units).toHaveLength(2);
  });

  it('creates a new unit under an existing type when the unit is new', () => {
    const types = makeTypes();
    const { type, unit, created } = resolveTypeAndUnit(types, 'height', 'in', uid);

    expect(type.id).toBe('type-height');
    expect(unit.abbreviation).toBe('in');
    expect(created.type).toBeNull();
    expect(created.unit).not.toBeNull();
    expect(type.units).toContain(unit);
  });

  it('trims whitespace before comparing and storing', () => {
    const types = makeTypes();
    const { type, unit } = resolveTypeAndUnit(types, '  height  ', '  cm  ', uid);

    expect(type.id).toBe('type-height');
    expect(unit.id).toBe('unit-cm');
  });

  it('returns the canonical label/abbreviation, not the raw casing, on a match', () => {
    const types = makeTypes();
    const { type, unit } = resolveTypeAndUnit(types, 'HEIGHT', 'Cm', uid);

    expect(type.label).toBe('height');
    expect(unit.abbreviation).toBe('cm');
  });

  it('does not create a type twice across repeated calls sharing the same types array', () => {
    const types = makeTypes();
    const first = resolveTypeAndUnit(types, 'BMI', 'kg/m2', uid);
    const second = resolveTypeAndUnit(types, 'bmi', 'kg/m2', uid);

    expect(second.type.id).toBe(first.type.id);
    expect(second.created.type).toBeNull();
    expect(second.created.unit).toBeNull();
    expect(types.filter(t => t.label.toLowerCase() === 'bmi')).toHaveLength(1);
  });
});
