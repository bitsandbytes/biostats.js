import { describe, it, expect } from 'vitest';
import { guessMapping, applyMapping, IMPORT_FIELDS } from './csv.js';

describe('IMPORT_FIELDS', () => {
  it('uses the payload key measured_at for the date field', () => {
    const dateField = IMPORT_FIELDS.find(f => f.label === 'date');
    expect(dateField.key).toBe('measured_at');
  });
});

describe('guessMapping', () => {
  it('matches headers that equal a field label exactly', () => {
    const m = guessMapping(['name', 'type', 'value', 'unit', 'date']);
    expect(m).toEqual({
      name: 'name',
      type: 'type',
      value: 'value',
      unit: 'unit',
      measured_at: 'date',
    });
  });

  it('matches a "date" header to the measured_at field (regression)', () => {
    const m = guessMapping(['Person', 'Metric', 'Reading', 'Units', 'date']);
    expect(m.measured_at).toBe('date');
  });

  it('matches case-insensitively', () => {
    const m = guessMapping(['NAME', 'Type', 'VALUE', 'Unit', 'Date']);
    expect(m.measured_at).toBe('Date');
    expect(m.name).toBe('NAME');
  });

  it('ignores surrounding whitespace and separator style', () => {
    const m = guessMapping([' name ', 'measured_at', 'value', 'unit', 'type']);
    expect(m.measured_at).toBe('measured_at');
    expect(m.name).toBe(' name ');
  });

  it('resolves known aliases', () => {
    const m = guessMapping(['subject', 'measurement', 'amount', 'uom', 'taken at']);
    expect(m).toEqual({
      name: 'subject',
      type: 'measurement',
      value: 'amount',
      unit: 'uom',
      measured_at: 'taken at',
    });
  });

  it('leaves a field empty when no column matches', () => {
    const m = guessMapping(['name', 'type', 'value', 'unit']);
    expect(m.measured_at).toBe('');
  });
});

describe('applyMapping', () => {
  const rows = [
    { Person: 'Ada', Kind: 'height', Reading: '170', Units: 'cm', When: '2026-01-02' },
    { Person: 'Ada', Kind: 'weight', Reading: '65', Units: 'kg', When: '2026-01-02' },
  ];
  const mapping = {
    name: 'Person',
    type: 'Kind',
    value: 'Reading',
    unit: 'Units',
    measured_at: 'When',
  };

  it('rewrites each row into the API payload shape', () => {
    expect(applyMapping(rows, mapping)).toEqual([
      { name: 'Ada', type: 'height', value: 170, unit: 'cm', measured_at: '2026-01-02' },
      { name: 'Ada', type: 'weight', value: 65, unit: 'kg', measured_at: '2026-01-02' },
    ]);
  });

  it('always emits measured_at, never date (regression)', () => {
    const out = applyMapping(rows, mapping)[0];
    expect(out.measured_at).toBe('2026-01-02');
    expect('date' in out).toBe(false);
  });

  it('coerces value to a number', () => {
    expect(applyMapping(rows, mapping)[0].value).toBe(170);
    expect(typeof applyMapping(rows, mapping)[0].value).toBe('number');
  });

  it('skips fields with no mapped column', () => {
    const out = applyMapping(rows, { name: 'Person', value: 'Reading' })[0];
    expect(out).toEqual({ name: 'Ada', value: 170 });
  });
});
