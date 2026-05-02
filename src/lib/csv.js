import Papa from 'papaparse';

const REQUIRED_COLUMNS = ['name', 'type', 'value', 'unit', 'date'];

/**
 * Parse a CSV File object. Returns { columns, rows } where rows are raw objects.
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
 * Apply a column mapping { csvHeader: canonicalName } to raw rows,
 * returning ImportPayload rows ready for POST /api/import.
 */
export function applyMapping(rows, mapping) {
  return rows.map(row => {
    const out = {};
    for (const [csv, canonical] of Object.entries(mapping)) {
      out[canonical] = row[csv];
    }
    out.value = Number(out.value);
    return out;
  });
}

export { REQUIRED_COLUMNS };
