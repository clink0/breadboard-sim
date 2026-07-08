import { describe, it, expect } from 'vitest';
import { solveDCOperatingPoint } from '../dcSolve';
import { MOSFET_PRESETS } from './mosfet';

describe('MOSFET model - Shichman-Hodges', () => {
  it('matches the hand-calculated square-law saturation current for a common-source stage', () => {
    // Vdd=9V, gate divider biases Vgs ~300mV above Vth (a realistic bias
    // point for analog use of this part - biasing at the near-4.5V "logic"
    // level this preset can also switch would drive it deep into triode with
    // any kOhm-range drain resistor, since Kp=0.2 already yields amps of
    // current at that overdrive).
    const elements = [
      { kind: 'V', id: 'vdd', nodeA: 'vdd', nodeB: 'gnd', value: 9 },
      { kind: 'R', nodeA: 'vdd', nodeB: 'gate', value: 6.6e6 },
      { kind: 'R', nodeA: 'gate', nodeB: 'gnd', value: 2.4e6 },
      { kind: 'R', nodeA: 'vdd', nodeB: 'drain', value: 560 },
      {
        kind: 'mosfet',
        id: 'm1',
        polarity: 'n',
        terminals: { drain: 'drain', gate: 'gate', source: 'gnd' },
        params: MOSFET_PRESETS.N_SMALL_SIGNAL,
      },
    ];
    const { voltages, converged } = solveDCOperatingPoint(elements, 'gnd');
    expect(converged).toBe(true);

    const { Vth, Kp, lambda } = MOSFET_PRESETS.N_SMALL_SIGNAL;
    const vg = voltages.get('gate');
    const vd = voltages.get('drain');
    const id = (9 - vd) / 560;
    const vov = vg - Vth;

    expect(vov).toBeGreaterThan(0); // confirms it's actually on, not cutoff
    expect(vd).toBeGreaterThan(vov); // confirms saturation (Vds > Vov), not triode

    const idHandCalc = (Kp / 2) * vov * vov * (1 + lambda * vd);
    const gmHandCalc = Kp * vov * (1 + lambda * vd); // dId/dVgs in saturation

    expect(id).toBeCloseTo(idHandCalc, 3);
    expect(id * 1000).toBeGreaterThan(5);
    expect(id * 1000).toBeLessThan(15);
    expect(gmHandCalc).toBeGreaterThan(0);
  });
});
