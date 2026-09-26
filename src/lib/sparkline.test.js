import { describe, it, expect } from 'vitest';
import { sparklinePoints } from './sparkline.js';

const parse = (s) => s.split(' ').map(p => p.split(',').map(Number));

describe('sparklinePoints', () => {
  it('returns an empty string for fewer than two values', () => {
    expect(sparklinePoints([], 80, 24)).toBe('');
    expect(sparklinePoints([5], 80, 24)).toBe('');
  });

  it('spans the full width, inset by the padding', () => {
    const pts = parse(sparklinePoints([1, 2, 3], 80, 24, 2));
    expect(pts[0][0]).toBe(2);
    expect(pts.at(-1)[0]).toBe(78);
  });

  it('puts the largest value at the top and the smallest at the bottom', () => {
    const pts = parse(sparklinePoints([10, 20], 80, 24, 2));
    expect(pts[0][1]).toBe(22); // min → bottom
    expect(pts[1][1]).toBe(2);  // max → top
  });

  it('draws a flat series through the vertical middle', () => {
    const pts = parse(sparklinePoints([5, 5, 5], 80, 24, 2));
    expect(pts.every(([, y]) => y === 12)).toBe(true);
  });
});
