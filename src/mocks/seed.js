/**
 * Demo data for MSW mock mode: a few people with roughly eight months of
 * fortnightly measurements ending today, so the Dashboard sparklines and the
 * PersonDetail chart/ranges have realistic-looking content. Values follow a
 * gentle trend plus deterministic wobble (no Math.random), so reloads match.
 */

const PEOPLE = [
  {
    name: 'Maya Chen',
    notes: 'Annual check-ups and clinic visits.',
    series: [
      { type: 'weight', unit: 'kg', start: 59.8, end: 58.2, wobble: 0.25, digits: 1 },
      { type: 'heart rate', unit: 'bpm', start: 72, end: 68, wobble: 2.5, digits: 0 },
      { type: 'temperature', unit: '°C', start: 36.8, end: 36.8, wobble: 0.2, digits: 1 },
      { type: 'height', unit: 'cm', start: 164, end: 164, wobble: 0, digits: 0, every: 4 },
    ],
  },
  {
    name: 'Jordan Ellis',
    notes: '',
    series: [
      { type: 'weight', unit: 'lbs', start: 176, end: 182, wobble: 1.2, digits: 0 },
      { type: 'height', unit: 'in', start: 71, end: 71, wobble: 0, digits: 0, every: 6 },
    ],
  },
  {
    name: 'Rosa Patel',
    notes: 'Blood pressure follow-up.',
    series: [
      { type: 'blood pressure systolic', unit: 'mmHg', start: 132, end: 124, wobble: 3, digits: 0 },
      { type: 'blood pressure diastolic', unit: 'mmHg', start: 86, end: 82, wobble: 2, digits: 0 },
      { type: 'heart rate', unit: 'bpm', start: 76, end: 74, wobble: 2, digits: 0 },
    ],
  },
  { name: 'Sam Okafor', notes: '', series: [] },
];

const STEPS = 17;      // fortnightly readings ≈ 8 months
const STEP_DAYS = 14;

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Push the demo people and their measurements into the mock's arrays. */
export function seedPeople(people, measurements) {
  PEOPLE.forEach((p, pi) => {
    const personId = `seed-person-${pi + 1}`;
    people.push({ id: personId, name: p.name, notes: p.notes, created_at: '2026-01-01T00:00:00Z' });
    p.series.forEach((s, si) => {
      for (let i = 0; i < STEPS; i += s.every ?? 1) {
        const t = i / (STEPS - 1);
        const wobble = Math.sin(i * 1.7 + si * 2.3 + pi) * s.wobble;
        const value = Number((s.start + (s.end - s.start) * t + wobble).toFixed(s.digits));
        measurements.push({
          id: `seed-m-${pi}-${si}-${i}`,
          person_id: personId,
          type: s.type,
          value,
          unit: s.unit,
          measured_at: isoDaysAgo((STEPS - 1 - i) * STEP_DAYS),
          created_at: '2026-01-01T00:00:00Z',
        });
      }
    });
  });
}
