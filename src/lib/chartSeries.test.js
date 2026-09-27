import { describe, it, expect } from 'vitest';
import { buildSeries, toggleSeries, assignAxes, filterByRange, defaultSelection, seriesStyles, SERIES_COLORS, RANGES } from './chartSeries.js';

const m = (type, value, unit, measured_at) => ({ id: `${type}-${measured_at}`, type, value, unit, measured_at });

describe('buildSeries', () => {
  it('groups measurements by type and unit, points sorted ascending', () => {
    const series = buildSeries([
      m('weight', 58, 'kg', '2026-09-01'),
      m('weight', 60, 'kg', '2026-04-01'),
      m('height', 64, 'in', '2026-01-01'),
      m('height', 164, 'cm', '2026-02-01'),
    ]);
    expect(series.map(s => s.key)).toEqual(['weight|kg', 'height|cm', 'height|in']);
    const weight = series[0];
    expect(weight).toMatchObject({ type: 'weight', unit: 'kg' });
    expect(weight.points.map(p => p.value)).toEqual([60, 58]);
    expect(weight.latest).toMatchObject({ value: 58, measured_at: '2026-09-01' });
  });

  it('orders series by most recent entry first', () => {
    const series = buildSeries([
      m('height', 164, 'cm', '2026-01-01'),
      m('weight', 58, 'kg', '2026-09-01'),
    ]);
    expect(series[0].key).toBe('weight|kg');
  });
});

describe('toggleSeries', () => {
  const unitOf = (key) => key.split('|')[1];

  it('removes a selected key', () => {
    expect(toggleSeries(['weight|kg', 'heart rate|bpm'], 'weight|kg', unitOf)).toEqual(['heart rate|bpm']);
  });

  it('adds a key whose unit is already on an axis', () => {
    expect(toggleSeries(['bp sys|mmHg'], 'bp dia|mmHg', unitOf)).toEqual(['bp sys|mmHg', 'bp dia|mmHg']);
  });

  it('adds a second unit', () => {
    expect(toggleSeries(['weight|kg'], 'heart rate|bpm', unitOf)).toEqual(['weight|kg', 'heart rate|bpm']);
  });

  it('drops the oldest unit when a third unit is added', () => {
    expect(toggleSeries(['weight|kg', 'heart rate|bpm'], 'temperature|°C', unitOf))
      .toEqual(['heart rate|bpm', 'temperature|°C']);
  });
});

describe('assignAxes', () => {
  it('puts the first unit on the left and the second on the right', () => {
    const axes = assignAxes(['weight|kg', 'heart rate|bpm', 'other|kg'], (k) => k.split('|')[1]);
    expect(axes).toEqual({ left: 'kg', right: 'bpm' });
  });

  it('has no right axis with a single unit', () => {
    expect(assignAxes(['weight|kg'], (k) => k.split('|')[1])).toEqual({ left: 'kg', right: null });
  });
});

describe('filterByRange', () => {
  const points = [
    { measured_at: '2025-10-01' },
    { measured_at: '2026-04-01' },
    { measured_at: '2026-08-30' },
    { measured_at: '2026-09-20' },
  ];
  const today = '2026-09-26';

  it('keeps everything for "all"', () => {
    expect(filterByRange(points, 'all', today)).toHaveLength(4);
  });

  it('keeps entries on or after the cutoff', () => {
    expect(filterByRange(points, '1m', today).map(p => p.measured_at)).toEqual(['2026-08-30', '2026-09-20']);
    expect(filterByRange(points, '6m', today)).toHaveLength(3);
    expect(filterByRange(points, '1y', today)).toHaveLength(4);
  });

  it('exposes the range options in display order', () => {
    expect(RANGES.map(r => r.id)).toEqual(['1m', '3m', '6m', '1y', 'all']);
  });
});

describe('defaultSelection', () => {
  const s = (key) => ({ key, unit: key.split('|')[1] });

  it('picks the most recent series plus the next one with a different unit', () => {
    expect(defaultSelection([s('weight|kg'), s('other|kg'), s('heart rate|bpm'), s('temp|°C')]))
      .toEqual(['weight|kg', 'heart rate|bpm']);
  });

  it('returns what exists when there are fewer series', () => {
    expect(defaultSelection([s('weight|kg')])).toEqual(['weight|kg']);
    expect(defaultSelection([])).toEqual([]);
  });
});

describe('seriesStyles', () => {
  const unitOf = (k) => k.split('|')[1];

  it('gives left-axis series solid lines and right-axis series dashed lines', () => {
    const styles = seriesStyles(['weight|kg', 'heart rate|bpm'], unitOf);
    expect(styles['weight|kg']).toMatchObject({ axis: 'left', dashed: false });
    expect(styles['heart rate|bpm']).toMatchObject({ axis: 'right', dashed: true });
  });

  it('gives series sharing an axis different colours', () => {
    const styles = seriesStyles(['sys|mmHg', 'dia|mmHg'], unitOf);
    expect(styles['sys|mmHg'].color).not.toBe(styles['dia|mmHg'].color);
  });

  it('uses teal first on the left and coral first on the right', () => {
    const styles = seriesStyles(['weight|kg', 'heart rate|bpm'], unitOf);
    expect(styles['weight|kg'].color).toBe(SERIES_COLORS.left[0]);
    expect(styles['heart rate|bpm'].color).toBe(SERIES_COLORS.right[0]);
  });
});
