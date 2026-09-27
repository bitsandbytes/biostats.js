/**
 * Per-row validation for POST /api/import. Mirrors the rules documented under
 * "Row validation" in API_CONTRACT.md, which the Spring backend must match.
 *
 * `validateImportRow(row)` returns a list of `{ field, message }` problems
 * (empty when the row is valid), in import-field order, so the handler can
 * report every problem on a row at once rather than just the first.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isBlank(v) {
  return v == null || String(v).trim() === '';
}

/** `measured_at` problem message, or null if it is a real YYYY-MM-DD date. */
function dateProblem(v) {
  if (isBlank(v)) return 'Date is required.';
  const m = DATE_RE.exec(String(v));
  if (!m) return `Date "${v}" must be in YYYY-MM-DD form.`;
  const [y, mo, d] = m.slice(1).map(Number);
  // Round-trip through Date.UTC: an impossible date (Feb 30, month 13) rolls over.
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return `Date "${v}" is not a real date.`;
  }
  return null;
}

export function validateImportRow(row) {
  const problems = [];
  const required = (field, label) => {
    if (isBlank(row[field])) problems.push({ field, message: `${label} is required.` });
  };

  required('name', 'Name');
  required('type', 'Type');
  if (typeof row.value !== 'number' || !Number.isFinite(row.value)) {
    problems.push({ field: 'value', message: 'Value is missing or not a number.' });
  }
  required('unit', 'Unit');
  const date = dateProblem(row.measured_at);
  if (date) problems.push({ field: 'measured_at', message: date });

  return problems;
}
