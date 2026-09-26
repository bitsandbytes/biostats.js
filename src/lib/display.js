/**
 * Small presentation helpers shared by people/measurement components:
 * avatar initials and colours, and the icon + colour tone for a measurement
 * type. Icon names refer to `src/components/ui/Icon.svelte`.
 */

/** Avatar colour classes, defined in `src/app.css` as `.tone-*`. */
export const AVATAR_TONES = ['teal', 'violet', 'amber', 'coral', 'slate'];

/** "Maya Chen" → "MC"; single names give one letter; empty gives "?". */
export function initials(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words.at(-1)[0] : '';
  return (first + last).toUpperCase();
}

/** Pick a stable avatar tone for a name (simple string hash). */
export function avatarTone(name) {
  let hash = 0;
  for (const ch of String(name ?? '')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

// Matched in order against the lower-cased type label; first hit wins.
const TYPE_STYLES = [
  { match: 'height', icon: 'ruler', tone: 'body' },
  { match: 'weight', icon: 'scale', tone: 'body' },
  { match: 'heart', icon: 'heart', tone: 'vital' },
  { match: 'temp', icon: 'thermometer', tone: 'vital' },
  { match: 'pressure', icon: 'pulse', tone: 'vital' },
];

/**
 * Icon and colour tone for a measurement type label. `tone` is `body`
 * (teal — size/mass measurements) or `vital` (coral — vital signs).
 */
export function typeStyle(label) {
  const l = String(label ?? '').toLowerCase();
  const hit = TYPE_STYLES.find(s => l.includes(s.match));
  return hit ? { icon: hit.icon, tone: hit.tone } : { icon: 'pulse', tone: 'body' };
}

/** "heart rate" → "Heart rate" (type labels are stored lower-case by convention). */
export function capitalize(s) {
  const str = String(s ?? '');
  return str.charAt(0).toUpperCase() + str.slice(1);
}
