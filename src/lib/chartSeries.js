/**
 * Pure data helpers behind the PersonDetail trend chart and its series tiles.
 *
 * A "series" is every measurement sharing a type AND unit (so height in cm and
 * height in inches are separate lines). Its `key` is `"<type>|<unit>"`.
 * The chart shows at most two units at once — one per y-axis.
 */

/** Time-range buttons above the chart. `months: null` means no cutoff. */
export const RANGES = [
  { id: '1m', label: '1M', months: 1 },
  { id: '3m', label: '3M', months: 3 },
  { id: '6m', label: '6M', months: 6 },
  { id: '1y', label: '1Y', months: 12 },
  { id: 'all', label: 'All', months: null },
];

/**
 * Group measurements into series, each `{ key, type, unit, points, latest }`
 * with `points` sorted oldest → newest and `latest` the newest point.
 * Series are ordered by their latest entry, most recent first.
 */
export function buildSeries(measurements) {
  const byKey = new Map();
  for (const m of measurements) {
    const key = `${m.type}|${m.unit}`;
    if (!byKey.has(key)) byKey.set(key, { key, type: m.type, unit: m.unit, points: [] });
    byKey.get(key).points.push(m);
  }
  const series = [...byKey.values()];
  for (const s of series) {
    s.points.sort((a, b) => a.measured_at.localeCompare(b.measured_at));
    s.latest = s.points.at(-1);
  }
  return series.sort((a, b) => b.latest.measured_at.localeCompare(a.latest.measured_at));
}

/**
 * Toggle `key` in the `selected` list. Adding a series whose unit isn't
 * already charted, when two units already are, drops every series of the
 * oldest-selected unit so the chart never needs a third axis.
 */
export function toggleSeries(selected, key, unitOf) {
  if (selected.includes(key)) return selected.filter(k => k !== key);
  const units = [...new Set(selected.map(unitOf))];
  const unit = unitOf(key);
  if (!units.includes(unit) && units.length >= 2) {
    return [...selected.filter(k => unitOf(k) !== units[0]), key];
  }
  return [...selected, key];
}

/** Which unit goes on each y-axis: first selected unit left, second right. */
export function assignAxes(selected, unitOf) {
  const units = [...new Set(selected.map(unitOf))];
  return { left: units[0] ?? null, right: units[1] ?? null };
}

/** Keep points on or after `today` minus the range's months (YYYY-MM-DD strings). */
export function filterByRange(points, rangeId, today) {
  const range = RANGES.find(r => r.id === rangeId);
  if (!range?.months) return points;
  const [y, m, d] = today.split('-').map(Number);
  const cutoff = new Date(Date.UTC(y, m - 1 - range.months, d)).toISOString().slice(0, 10);
  return points.filter(p => p.measured_at >= cutoff);
}

/**
 * Initial chart selection: the most recently measured series plus the next
 * one with a different unit (so both y-axes are used when possible).
 */
export function defaultSelection(series) {
  if (series.length === 0) return [];
  const first = series[0];
  const second = series.find(s => s.unit !== first.unit);
  return second ? [first.key, second.key] : [first.key];
}

/**
 * Line colours per axis. Left starts teal, right starts coral (the brand's
 * body/vital colours); extra series sharing an axis take the next colour.
 * Right-axis lines are also dashed so the axes differ by more than hue.
 */
export const SERIES_COLORS = {
  left: ['#0f766e', '#5b4b9a', '#2458c6'],
  right: ['#b4441f', '#8a5a0b', '#9d2f63'],
};

/** Map each selected key → `{ axis, color, dashed }` for the chart and tiles. */
export function seriesStyles(selected, unitOf) {
  const { left } = assignAxes(selected, unitOf);
  const used = { left: 0, right: 0 };
  const styles = {};
  for (const key of selected) {
    const axis = unitOf(key) === left ? 'left' : 'right';
    const palette = SERIES_COLORS[axis];
    styles[key] = { axis, color: palette[used[axis]++ % palette.length], dashed: axis === 'right' };
  }
  return styles;
}
