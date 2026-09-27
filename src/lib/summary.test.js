import { describe, it, expect } from 'vitest';
import { summarizeMeasurements, applyMeasurement, RECENT_LIMIT } from './summary.js';

const m = (type, value, unit, measured_at) => ({ type, value, unit, measured_at });

describe('summarizeMeasurements', () => {
  it('returns empty maps for no measurements', () => {
    expect(summarizeMeasurements([])).toEqual({ latestByType: {}, recentByType: {} });
  });

  it('picks the latest entry per type by measured_at', () => {
    const { latestByType } = summarizeMeasurements([
      m('weight', 60, 'kg', '2026-04-01'),
      m('weight', 58, 'kg', '2026-09-01'),
      m('weight', 59, 'kg', '2026-06-01'),
      m('height', 164, 'cm', '2026-01-01'),
    ]);
    expect(latestByType).toEqual({
      weight: { value: 58, unit: 'kg', measured_at: '2026-09-01' },
      height: { value: 164, unit: 'cm', measured_at: '2026-01-01' },
    });
  });

  it('lists recent entries per type in ascending date order', () => {
    const { recentByType } = summarizeMeasurements([
      m('weight', 58, 'kg', '2026-09-01'),
      m('weight', 60, 'kg', '2026-04-01'),
      m('weight', 59, 'kg', '2026-06-01'),
    ]);
    expect(recentByType.weight.map(e => e.measured_at)).toEqual(['2026-04-01', '2026-06-01', '2026-09-01']);
    expect(recentByType.weight[0]).toEqual({ value: 60, unit: 'kg', measured_at: '2026-04-01' });
  });

  it(`keeps only the ${RECENT_LIMIT} most recent entries per type`, () => {
    const many = Array.from({ length: RECENT_LIMIT + 5 }, (_, i) =>
      m('weight', i, 'kg', `2026-01-${String(i + 1).padStart(2, '0')}`));
    const { recentByType } = summarizeMeasurements(many);
    expect(recentByType.weight).toHaveLength(RECENT_LIMIT);
    expect(recentByType.weight.at(-1).value).toBe(RECENT_LIMIT + 4);
    expect(recentByType.weight[0].value).toBe(5);
  });
});

describe('applyMeasurement', () => {
  it('adds a first entry for a new type', () => {
    const summary = { latestByType: {}, recentByType: {} };
    applyMeasurement(summary, m('weight', 58, 'kg', '2026-09-01'));
    expect(summary.latestByType.weight.value).toBe(58);
    expect(summary.recentByType.weight).toHaveLength(1);
  });

  it('replaces latest only when the new entry is not older', () => {
    const summary = summarizeMeasurements([m('weight', 58, 'kg', '2026-09-01')]);
    applyMeasurement(summary, m('weight', 70, 'kg', '2026-01-01'));
    expect(summary.latestByType.weight.value).toBe(58);
    applyMeasurement(summary, m('weight', 57, 'kg', '2026-09-20'));
    expect(summary.latestByType.weight.value).toBe(57);
  });

  it('inserts into recent in date order and trims to the limit', () => {
    const summary = summarizeMeasurements(Array.from({ length: RECENT_LIMIT }, (_, i) =>
      m('weight', i, 'kg', `2026-02-${String(i + 1).padStart(2, '0')}`)));
    applyMeasurement(summary, m('weight', 99, 'kg', '2026-02-05T'));
    const dates = summary.recentByType.weight.map(e => e.measured_at);
    expect(dates).toEqual([...dates].sort());
    expect(summary.recentByType.weight).toHaveLength(RECENT_LIMIT);
  });

  it('tolerates a summary with no recentByType (older API)', () => {
    const summary = { latestByType: {} };
    applyMeasurement(summary, m('weight', 58, 'kg', '2026-09-01'));
    expect(summary.recentByType.weight).toHaveLength(1);
  });
});
