import { describe, it, expect } from 'vitest';
import { solveDCOperatingPoint } from '../dcSolve';
import { DIODE_PRESETS } from './index';

describe('diode/LED model', () => {
  it('produces a plausible forward voltage and current for 5V + 220ohm + red LED', () => {
    const elements = [
      { kind: 'V', id: 'batt', nodeA: 'vcc', nodeB: 'gnd', value: 5 },
      { kind: 'R', nodeA: 'vcc', nodeB: 'anode', value: 220 },
      { kind: 'diode', id: 'led1', terminals: { anode: 'anode', cathode: 'gnd' }, params: DIODE_PRESETS.LED_RED },
    ];
    const { voltages, converged } = solveDCOperatingPoint(elements, 'gnd');

    expect(converged).toBe(true);
    const vf = voltages.get('anode');
    expect(vf).toBeGreaterThan(1.5);
    expect(vf).toBeLessThan(2.3);

    const current = (5 - vf) / 220;
    expect(current * 1000).toBeGreaterThan(5); // mA
    expect(current * 1000).toBeLessThan(20);
  });
});
