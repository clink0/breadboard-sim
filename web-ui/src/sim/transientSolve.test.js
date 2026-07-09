import { describe, it, expect } from 'vitest';
import { solveTransient } from './transientSolve';
import { functionGenValueAt } from './devices/functionSource';

function sampleAt(time, trace, targetT) {
  let idx = 0;
  for (let i = 0; i < time.length; i++) if (time[i] <= targetT) idx = i;
  return trace[idx];
}

describe('solveTransient - RC charging', () => {
  it('matches V0*(1-exp(-t/RC)) for a battery charging a capacitor through a resistor', () => {
    const V0 = 9;
    const R = 1000;
    const C = 100e-6;
    const RC = R * C; // 0.1s
    const dt = RC / 500;
    const numSteps = Math.round((5 * RC) / dt);

    const elements = [
      { kind: 'V', id: 'batt', nodeA: 'vcc', nodeB: 'gnd', valueAt: () => V0 },
      { kind: 'R', id: 'r1', nodeA: 'vcc', nodeB: 'cap', value: R },
      { kind: 'C', id: 'c1', nodeA: 'cap', nodeB: 'gnd', value: C },
      { kind: 'probe', id: 'p1', terminals: { tip: 'cap', ref: 'gnd' } },
    ];

    const { time, voltages, currents, converged } = solveTransient(elements, 'gnd', dt, numSteps);
    expect(converged).toBe(true);

    const trace = voltages.get('p1');
    expect(sampleAt(time, trace, RC)).toBeCloseTo(V0 * (1 - Math.exp(-1)), 1);
    expect(sampleAt(time, trace, 2 * RC)).toBeCloseTo(V0 * (1 - Math.exp(-2)), 1);
    expect(sampleAt(time, trace, 5 * RC)).toBeCloseTo(V0 * (1 - Math.exp(-5)), 1);

    // Series loop: charging current I(t) = (V0/R)*exp(-t/RC), and by KCL the
    // same current flows into the capacitor - both should be tracked and
    // agree with each other and with the resistor's own analytic formula.
    const iR = currents.get('r1');
    const iC = currents.get('c1');
    const expectedI = (t) => (V0 / R) * Math.exp(-t / RC);
    expect(sampleAt(time, iR, RC)).toBeCloseTo(expectedI(RC), 2);
    expect(sampleAt(time, iC, RC)).toBeCloseTo(expectedI(RC), 2);
    expect(sampleAt(time, iR, 2 * RC)).toBeCloseTo(expectedI(2 * RC), 2);
  });
});

describe('solveTransient - RL charging', () => {
  it('matches V0*(1-exp(-t*R/L)) probed across the resistor, and I(t)=(V0/R)*(1-exp(-tR/L)) through it', () => {
    const V0 = 9;
    const R = 100;
    const L = 0.1;
    const tau = L / R; // 0.001s
    const dt = tau / 500;
    const numSteps = Math.round((5 * tau) / dt);

    const elements = [
      { kind: 'V', id: 'batt', nodeA: 'vcc', nodeB: 'gnd', valueAt: () => V0 },
      { kind: 'R', id: 'r1', nodeA: 'vcc', nodeB: 'mid', value: R },
      { kind: 'L', id: 'l1', nodeA: 'mid', nodeB: 'gnd', value: L },
      { kind: 'probe', id: 'p1', terminals: { tip: 'vcc', ref: 'mid' } }, // v_R(t)
    ];

    const { time, voltages, currents, converged } = solveTransient(elements, 'gnd', dt, numSteps);
    expect(converged).toBe(true);

    const trace = voltages.get('p1');
    expect(sampleAt(time, trace, tau)).toBeCloseTo(V0 * (1 - Math.exp(-1)), 1);
    expect(sampleAt(time, trace, 2 * tau)).toBeCloseTo(V0 * (1 - Math.exp(-2)), 1);
    expect(sampleAt(time, trace, 5 * tau)).toBeCloseTo(V0 * (1 - Math.exp(-5)), 1);

    // Series loop again: the resistor's and inductor's currents must agree
    // (same loop current) and match the textbook RL step-response formula.
    const iR = currents.get('r1');
    const iL = currents.get('l1');
    const expectedI = (t) => (V0 / R) * (1 - Math.exp((-t * R) / L));
    expect(sampleAt(time, iR, tau)).toBeCloseTo(expectedI(tau), 2);
    expect(sampleAt(time, iL, tau)).toBeCloseTo(expectedI(tau), 2);
    expect(sampleAt(time, iR, 5 * tau)).toBeCloseTo(expectedI(5 * tau), 2);
  });
});

describe('solveTransient - function generator + probe', () => {
  it('records a sine source directly with no load', () => {
    const params = { waveform: 'sine', freqHz: 1000, amplitudeV: 2, offsetV: 1 };
    const period = 1 / params.freqHz;
    const dt = period / 200;
    const numSteps = 400; // 2 periods

    const elements = [
      { kind: 'V', id: 'gen', nodeA: 'sig', nodeB: 'gnd', valueAt: (t) => functionGenValueAt(t, params) },
      { kind: 'probe', id: 'p1', terminals: { tip: 'sig', ref: 'gnd' } },
    ];

    const { time, voltages, converged } = solveTransient(elements, 'gnd', dt, numSteps);
    expect(converged).toBe(true);

    const trace = voltages.get('p1');
    for (let i = 0; i <= numSteps; i++) {
      expect(trace[i]).toBeCloseTo(functionGenValueAt(time[i], params), 6);
    }
  });
});

describe('solveTransient - RC low-pass filter', () => {
  it('attenuates a sine source by the textbook 1/sqrt(1+(wRC)^2) at steady state', () => {
    const R = 1000;
    const C = 100e-9;
    const RC = R * C;
    const freqHz = 1 / (2 * Math.PI * RC); // omega*RC = 1 -> |H| = 1/sqrt(2)
    const params = { waveform: 'sine', freqHz, amplitudeV: 2, offsetV: 2.5 };

    const stepsPerPeriod = 200;
    const period = 1 / freqHz;
    const dt = period / stepsPerPeriod;
    const settlePeriods = 8;
    const displayPeriods = 3;
    const numSteps = Math.round(((settlePeriods + displayPeriods) * period) / dt);

    const elements = [
      { kind: 'V', id: 'gen', nodeA: 'in', nodeB: 'gnd', valueAt: (t) => functionGenValueAt(t, params) },
      { kind: 'R', nodeA: 'in', nodeB: 'out', value: R },
      { kind: 'C', id: 'c1', nodeA: 'out', nodeB: 'gnd', value: C },
      { kind: 'probe', id: 'p1', terminals: { tip: 'out', ref: 'gnd' } },
    ];

    const { time, voltages, converged } = solveTransient(elements, 'gnd', dt, numSteps);
    expect(converged).toBe(true);

    const trace = voltages.get('p1');
    const settleSteps = Math.round((settlePeriods * period) / dt);
    let min = Infinity, max = -Infinity, sum = 0, count = 0;
    for (let i = settleSteps; i <= numSteps; i++) {
      min = Math.min(min, trace[i]);
      max = Math.max(max, trace[i]);
      sum += trace[i];
      count++;
    }
    const settledAmplitude = (max - min) / 2;
    const settledMean = sum / count;

    const expectedH = 1 / Math.sqrt(2);
    expect(settledAmplitude).toBeCloseTo(params.amplitudeV * expectedH, 1);
    expect(settledMean).toBeCloseTo(params.offsetV, 1);
  });
});
