/**
 * Per-person measurement summaries, as returned on each `PersonSummary` by
 * `GET /api/people` (see API_CONTRACT.md):
 *
 * - `latestByType`  — type → the most recent `{ value, unit, measured_at }`.
 * - `recentByType`  — type → up to RECENT_LIMIT most recent entries, oldest
 *                     first, used to draw the Dashboard trend lines.
 *
 * `summarizeMeasurements` is the reference implementation (the MSW mock uses
 * it directly); `applyMeasurement` keeps a summary current after a new
 * measurement is saved, so the Dashboard doesn't need to re-fetch.
 */

/** Max entries per type in `recentByType`. The backend must use the same limit. */
export const RECENT_LIMIT = 12;

const entry = (m) => ({ value: m.value, unit: m.unit, measured_at: m.measured_at });

/** Build `{ latestByType, recentByType }` from a person's full measurement list. */
export function summarizeMeasurements(measurements) {
  const summary = { latestByType: {}, recentByType: {} };
  const sorted = [...measurements].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  for (const m of sorted) applyMeasurement(summary, m);
  return summary;
}

/**
 * Fold one new measurement into an existing summary, in place. Tolerates a
 * summary with no `recentByType` (e.g. from a backend that predates it).
 */
export function applyMeasurement(summary, m) {
  const latest = summary.latestByType[m.type];
  if (!latest || m.measured_at >= latest.measured_at) {
    summary.latestByType[m.type] = entry(m);
  }

  summary.recentByType ??= {};
  const recent = [...(summary.recentByType[m.type] ?? [])];
  // Insert after any entries on or before this date, keeping ascending order.
  const at = recent.findIndex(e => e.measured_at > m.measured_at);
  recent.splice(at === -1 ? recent.length : at, 0, entry(m));
  summary.recentByType[m.type] = recent.slice(-RECENT_LIMIT);
}
