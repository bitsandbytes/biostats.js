/**
 * Format a numeric measurement value for display.
 * Strips trailing zeros after up to 2 decimal places.
 */
export function formatValue(value) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

/**
 * Format an ISO date string (YYYY-MM-DD) to a human-readable short date.
 */
export function formatDate(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Return today's date as YYYY-MM-DD.
 */
export function today() {
  return new Date().toISOString().slice(0, 10);
}
