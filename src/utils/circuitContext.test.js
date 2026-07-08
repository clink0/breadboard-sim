import { describe, it, expect } from 'vitest';
import { buildCircuitContext } from './circuitContext';

describe('buildCircuitContext', () => {
  it('describes an empty circuit', () => {
    const text = buildCircuitContext({});
    expect(text).toContain('Active tab: Breadboard');
    expect(text).toContain('(nothing placed on the breadboard yet)');
    expect(text).toContain('Simulation: not running');
  });

  it('describes a resistor + battery + wire netlist with formatted values', () => {
    const text = buildCircuitContext({
      wires: [{ id: 'w1', fromHole: 'a-1', toHole: 'b-1' }],
      components: [
        { id: 'c1', type: 'resistor', value: 220, holes: { a: 'a-2', b: 'b-2' } },
        { id: 'c2', type: 'battery', value: 5, holes: { pos: 'a-3', neg: 'b-3' } },
      ],
    });
    expect(text).toContain('wire  a-1 - b-1');
    expect(text).toContain('resistor  a-2 - b-2 (220Ω)');
    expect(text).toContain('battery  a-3 - b-3 (5V)');
  });

  it('includes per-component current readouts while a simulation is running', () => {
    const text = buildCircuitContext({
      components: [{ id: 'c1', type: 'resistor', value: 220, holes: { a: 'a-2', b: 'b-2' } }],
      running: true,
      liveSource: 'dc',
      simResult: { currents: new Map([['c1', 0.01364]]), converged: true },
    });
    expect(text).toContain('Simulation: running (DC operating point)');
    expect(text).toContain('resistor (a-2 - b-2): 13.64 mA');
  });

  it('flags a non-converged simulation', () => {
    const text = buildCircuitContext({
      components: [],
      running: true,
      simResult: { currents: new Map(), converged: false },
    });
    expect(text).toContain('DID NOT CONVERGE');
  });

  it('notes an Arduino-live simulation source', () => {
    const text = buildCircuitContext({
      components: [],
      running: true,
      liveSource: 'arduino',
      simResult: { currents: new Map(), converged: true },
    });
    expect(text).toContain('driven live by the running Arduino sketch');
  });

  it('mentions a captured oscilloscope trace', () => {
    const text = buildCircuitContext({
      scopeResult: {
        time: new Float64Array([0, 0.01, 0.02]),
        probeVoltages: new Map([['p1', new Float64Array([0, 1, 2])]]),
        converged: true,
      },
    });
    expect(text).toContain('Oscilloscope: captured 1 probe channel(s) over 20.00ms');
  });

  it('omits the oscilloscope line when nothing has been captured', () => {
    const text = buildCircuitContext({
      scopeResult: { time: new Float64Array([0]), probeVoltages: new Map(), converged: true },
    });
    expect(text).not.toContain('Oscilloscope:');
  });

  it('includes the Arduino sketch source when on the arduino tab', () => {
    const text = buildCircuitContext({
      view: 'arduino',
      arduino: { sketch: 'void setup() {}\nvoid loop() {}', compileStatus: 'success', running: true },
    });
    expect(text).toContain('Active tab: Arduino IDE');
    expect(text).toContain('void setup() {}');
    expect(text).toContain('compile status: success, currently running');
  });

  it('truncates very long sketches', () => {
    const longSketch = 'x'.repeat(5000);
    const text = buildCircuitContext({
      view: 'arduino',
      arduino: { sketch: longSketch, compileStatus: 'success', running: false },
    });
    expect(text).toContain('(truncated)');
    expect(text.length).toBeLessThan(longSketch.length + 500);
  });
});
