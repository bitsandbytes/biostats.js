import { describe, it, expect } from 'vitest';
import { validateImportRow } from './importValidate.js';

const good = { name: 'Ada', type: 'height', value: 170, unit: 'cm', measured_at: '2026-01-02' };

describe('validateImportRow', () => {
  it('returns no problems for a valid row', () => {
    expect(validateImportRow(good)).toEqual([]);
  });

  it('accepts a value of 0 and negative values', () => {
    expect(validateImportRow({ ...good, value: 0 })).toEqual([]);
    expect(validateImportRow({ ...good, value: -3.5 })).toEqual([]);
  });

  it.each(['name', 'type', 'unit'])('flags a missing or blank %s', field => {
    for (const bad of [undefined, null, '', '   ']) {
      const problems = validateImportRow({ ...good, [field]: bad });
      expect(problems).toEqual([{ field, message: expect.stringMatching(/required/i) }]);
    }
  });

  it('flags a missing or non-numeric value', () => {
    for (const bad of [undefined, null, 'abc', NaN, Infinity]) {
      const problems = validateImportRow({ ...good, value: bad });
      expect(problems).toEqual([{ field: 'value', message: expect.stringMatching(/number/i) }]);
    }
  });

  it('flags a missing date', () => {
    expect(validateImportRow({ ...good, measured_at: '' }))
      .toEqual([{ field: 'measured_at', message: expect.stringMatching(/required/i) }]);
  });

  it('flags a date not in YYYY-MM-DD form', () => {
    for (const bad of ['01/02/2026', '2026-1-2', '2026-01-02T00:00:00Z', 'yesterday']) {
      expect(validateImportRow({ ...good, measured_at: bad }))
        .toEqual([{ field: 'measured_at', message: expect.stringMatching(/YYYY-MM-DD/) }]);
    }
  });

  it('flags a well-formed but impossible calendar date', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '2026-00-10']) {
      expect(validateImportRow({ ...good, measured_at: bad }))
        .toEqual([{ field: 'measured_at', message: expect.stringMatching(/not a real date/i) }]);
    }
  });

  it('accepts a leap day in a leap year', () => {
    expect(validateImportRow({ ...good, measured_at: '2028-02-29' })).toEqual([]);
  });

  it('reports every problem on the row, in field order', () => {
    const problems = validateImportRow({ name: '', type: 'height', value: null, unit: '', measured_at: 'x' });
    expect(problems.map(p => p.field)).toEqual(['name', 'value', 'unit', 'measured_at']);
  });
});
