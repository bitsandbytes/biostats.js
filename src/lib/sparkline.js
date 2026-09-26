/**
 * Compute the `points` attribute for a small inline SVG `<polyline>` trend
 * line (the Dashboard's per-type sparklines).
 *
 * Values are spread evenly across the width (dates are ignored — this shows
 * shape, not timing) and scaled so the min sits at the bottom and the max at
 * the top, inset by `pad`. A flat series is drawn through the middle. Returns
 * '' when there are fewer than two values, so callers can skip rendering.
 */
export function sparklinePoints(values, width, height, pad = 2) {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const round = (n) => Math.round(n * 10) / 10;

  return values
    .map((v, i) => {
      const x = pad + (innerW * i) / (values.length - 1);
      const y = max === min ? height / 2 : pad + innerH * (1 - (v - min) / (max - min));
      return `${round(x)},${round(y)}`;
    })
    .join(' ');
}
