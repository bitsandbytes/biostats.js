/**
 * Helpers for presenting a POST /api/import response on the Import page.
 */

/**
 * Turn the response's flat `rowErrors` list (`{ row, field, message }`, where
 * `row` is the 0-based index into the submitted `rows` array) into one entry
 * per failed row, sorted by row:
 *
 *   { rowNumber, values, problems: [{ field, message }] }
 *
 * `rowNumber` is 1-based and counts data rows (the header isn't a row), and
 * `values` holds that row's original CSV text for each mapped field, keyed by
 * canonical field key — so the user sees e.g. `"abc"` rather than the `null`
 * that was actually sent for an unparseable value.
 */
export function groupRowErrors(rowErrors, rawRows, mapping) {
  const byRow = new Map();
  for (const { row, field, message } of rowErrors ?? []) {
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push({ field, message });
  }
  return [...byRow.keys()]
    .sort((a, b) => a - b)
    .map(row => {
      const raw = rawRows[row];
      const values = {};
      if (raw) {
        for (const [key, header] of Object.entries(mapping)) {
          if (header) values[key] = raw[header] ?? '';
        }
      }
      return { rowNumber: row + 1, values, problems: byRow.get(row) };
    });
}
