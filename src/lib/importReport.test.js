import { describe, it, expect } from 'vitest';
import { groupRowErrors } from './importReport.js';

const rawRows = [
  { Person: 'Ada', Kind: 'height', Reading: '170', Units: 'cm', When: '2026-01-02' },
  { Person: '', Kind: 'height', Reading: 'abc', Units: 'cm', When: '2026-01-02' },
  { Person: 'Bo', Kind: 'weight', Reading: '65', Units: 'kg', When: '02/01/2026' },
];
const mapping = { name: 'Person', type: 'Kind', value: 'Reading', unit: 'Units', measured_at: 'When' };

describe('groupRowErrors', () => {
  it('returns an empty list when there are no row errors', () => {
    expect(groupRowErrors([], rawRows, mapping)).toEqual([]);
    expect(groupRowErrors(undefined, rawRows, mapping)).toEqual([]);
  });

  it('groups problems by row, sorted by row, with 1-based row numbers', () => {
    const out = groupRowErrors([
      { row: 2, field: 'measured_at', message: 'Date must be YYYY-MM-DD.' },
      { row: 1, field: 'name', message: 'Name is required.' },
      { row: 1, field: 'value', message: 'Value must be a number.' },
    ], rawRows, mapping);
    expect(out.map(r => r.rowNumber)).toEqual([2, 3]);
    expect(out[0].problems).toEqual([
      { field: 'name', message: 'Name is required.' },
      { field: 'value', message: 'Value must be a number.' },
    ]);
  });

  it("shows the row's original CSV text for each mapped field", () => {
    const [row] = groupRowErrors([{ row: 1, field: 'value', message: 'x' }], rawRows, mapping);
    expect(row.values).toEqual({ name: '', type: 'height', value: 'abc', unit: 'cm', measured_at: '2026-01-02' });
  });

  it('tolerates a row index outside the parsed rows', () => {
    const [row] = groupRowErrors([{ row: 99, field: null, message: 'Unexpected error.' }], rawRows, mapping);
    expect(row.rowNumber).toBe(100);
    expect(row.values).toEqual({});
    expect(row.problems).toEqual([{ field: null, message: 'Unexpected error.' }]);
  });
});
