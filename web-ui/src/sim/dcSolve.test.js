import { describe, it, expect } from 'vitest';
import { solveDCOperatingPoint } from './dcSolve';

describe('solveDCOperatingPoint - linear circuits', () => {
  it('matches the hand-calculated answer for a resistor voltage divider', () => {
    const elements = [
      { kind: 'V', id: 'batt', nodeA: 'n1', nodeB: 'gnd', value: 9 },
      { kind: 'R', nodeA: 'n1', nodeB: 'n2', value: 1000 },
      { kind: 'R', nodeA: 'n2', nodeB: 'gnd', value: 2000 },
    ];
    const { voltages, sourceCurrents, converged, iterations } = solveDCOperatingPoint(elements, 'gnd');

    expect(converged).toBe(true);
    expect(iterations).toBeLessThanOrEqual(3);
    expect(voltages.get('n1')).toBeCloseTo(9, 5);
    expect(voltages.get('n2')).toBeCloseTo(6, 5); // 2k/(1k+2k) * 9V
    expect(sourceCurrents.get('batt')).toBeCloseTo(-0.003, 5); // 9V / 3k
  });
});
