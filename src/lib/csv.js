import Papa from 'papaparse';

/**
 * The fields POST /api/import expects on every row, in payload shape.
 *
 * - `key`     — the property name sent to the backend (see API_CONTRACT.md).
 *               Note the date field's key is `measured_at`, not `date`.
 * - `label`   — how the field is shown to the user in the column mapper.
 * - `aliases` — extra header spellings `guessMapping` will auto-match, on top
 *               of `key` and `label` themselves. Matching is normalized
 *               (trimmed, lower-cased, separators stripped) so `Measured At`,
 *               `measured_at` and `measuredat` are all equivalent.
 */
const IMPORT_FIELDS = [
  { key: 'name', label: 'name', aliases: ['person', 'subject', 'fullname', 'full name'] },
  { key: 'type', label: 'type', aliases: ['measurement', 'metric', 'kind'] },
  { key: 'value', label: 'value', aliases: ['amount', 'reading', 'measurement value', 'result'] },
  { key: 'unit', label: 'unit', aliases: ['units', 'uom'] },
  {
    key: 'measured_at',
    label: 'date',
    aliases: ['measured at', 'measurement date', 'date measured', 'taken at', 'date taken', 'timestamp', 'when'],
  },
];

/** Collapse a header/label to a comparison key: trimmed, lower-case, no spaces/_/-. */
function normalize(s) {
  return String(s ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Parse a CSV File object. Returns { columns, rows } where rows are raw objects
 * keyed by the CSV's own header names.
 */
export function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => resolve({ columns: meta.fields, rows: data }),
      error: reject,
    });
  });
}

/**
 * Best-effort auto-mapping of a CSV's headers to the import fields.
 *
 * Returns an object keyed by every field's canonical `key` (so the shape is
 * stable for the mapper UI and `mappingComplete` checks); the value is the
 * matching CSV header, or `''` when nothing matched. Matching is
 * case/whitespace/separator-insensitive against each field's key, label and
 * aliases — e.g. a `date` header resolves to `measured_at`.
 */
export function guessMapping(columns) {
  const mapping = {};
  for (const field of IMPORT_FIELDS) {
    const candidates = new Set([field.key, field.label, ...field.aliases].map(normalize));
    mapping[field.key] = columns.find(col => candidates.has(normalize(col))) ?? '';
  }
  return mapping;
}

/**
 * Apply a column mapping to raw rows, producing ImportPayload rows ready for
 * POST /api/import.
 *
 * `mapping` is keyed by canonical field key (`name`, `type`, `value`, `unit`,
 * `measured_at`) with the chosen CSV header as the value — the same shape
 * `guessMapping` returns. Fields whose mapped header is falsy are omitted.
 * `value` is coerced to a Number.
 */
export function applyMapping(rows, mapping) {
  return rows.map(row => {
    const out = {};
    for (const [key, csvHeader] of Object.entries(mapping)) {
      if (!csvHeader) continue;
      out[key] = row[csvHeader];
    }
    out.value = Number(out.value);
    return out;
  });
}

/**
 * Serialize one person's measurements to CSV (for the PersonDetail "Export"
 * button). Columns are the import field labels — name, type, value, unit,
 * date — so an exported file can be re-imported as-is. Rows are oldest first.
 */
export function measurementsToCsv(personName, measurements) {
  const rows = [...measurements]
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at))
    .map(m => [personName, m.type, m.value, m.unit, m.measured_at]);
  return Papa.unparse({ fields: IMPORT_FIELDS.map(f => f.label), data: rows });
}

export { IMPORT_FIELDS };
