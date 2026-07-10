import { describe, it, expect } from 'vitest';
import { nearestHole, computeComponentMove, holeRow, holeCol } from './useElementDrag';
import { generateHoles } from './layout';

describe('holeRow / holeCol', () => {
  it('splits a hole id into its row and column', () => {
    expect(holeRow('c-5')).toBe('c');
    expect(holeCol('c-5')).toBe(5);
    expect(holeRow('railTopPlus-12')).toBe('railTopPlus');
    expect(holeCol('railTopPlus-12')).toBe(12);
  });
});

describe('nearestHole', () => {
  const holes = generateHoles();

  it('finds the closest hole to a point', () => {
    const target = holes.find((h) => h.id === 'a-10');
    const hit = nearestHole(holes, target.x + 1, target.y - 1);
    expect(hit.id).toBe('a-10');
  });

  it('excludes arduino holes when asked, even if empty holes array is passed', () => {
    // breadboard holes never include row 'arduino', so this is really just
    // confirming the exclusion flag doesn't throw / behaves as a no-op here
    const target = holes.find((h) => h.id === 'j-3');
    const hit = nearestHole(holes, target.x, target.y, { excludeArduino: true });
    expect(hit.id).toBe('j-3');
  });

  it('returns null for an empty hole list', () => {
    expect(nearestHole([], 0, 0)).toBeNull();
  });
});

describe('computeComponentMove', () => {
  it('shifts every terminal by the same column delta, keeping each row', () => {
    const entries = [['a', 'a-5'], ['b', 'c-5']];
    const result = computeComponentMove(entries, 'a-5', 8); // anchor a-5 moves from col 5 to col 8, delta +3
    expect(result).toEqual({ a: 'a-8', b: 'c-8' });
  });

  it('supports terminals starting in different rows and rails', () => {
    const entries = [['pos', 'railTopPlus-2'], ['neg', 'railTopMinus-2']];
    const result = computeComponentMove(entries, 'railTopPlus-2', 5); // delta +3
    expect(result).toEqual({ pos: 'railTopPlus-5', neg: 'railTopMinus-5' });
  });

  it('returns null when the shift would push a terminal below column 1', () => {
    const entries = [['a', 'a-2'], ['b', 'c-2']];
    const result = computeComponentMove(entries, 'a-2', -3); // delta -5, b would land at col -3
    expect(result).toBeNull();
  });

  it('returns null when the shift would push a terminal past the last column', () => {
    const entries = [['a', 'a-29'], ['b', 'c-29']];
    const result = computeComponentMove(entries, 'a-29', 30); // delta +1, b would land at col 30... still valid
    expect(result).toEqual({ a: 'a-30', b: 'c-30' });
    const overflow = computeComponentMove(entries, 'a-29', 31); // delta +2, b would land at col 31, out of bounds
    expect(overflow).toBeNull();
  });

  it('is a no-op (identity) when the target column matches the anchor column', () => {
    const entries = [['a', 'd-7'], ['b', 'b-7']];
    const result = computeComponentMove(entries, 'd-7', 7);
    expect(result).toEqual({ a: 'd-7', b: 'b-7' });
  });
});
