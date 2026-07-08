import { resolveTopology } from '../breadboard/topology';
import { solveDCOperatingPoint } from './dcSolve';
import { solveTransient } from './transientSolve';
import { evalNonlinearDevice, DEVICE_TYPES, DIODE_PRESETS } from './devices';
import { functionGenValueAt } from './devices/functionSource';

const CAP_DC_RESISTANCE = 1e9;   // open circuit at DC
const IND_DC_RESISTANCE = 0.001; // short circuit at DC

function dcResistance(c) {
  switch (c.type) {
    case 'capacitor': return CAP_DC_RESISTANCE;
    case 'inductor':  return IND_DC_RESISTANCE;
    default:          return c.value; // resistor, motor, servo
  }
}

function deviceParams(c) {
  const presets = DEVICE_TYPES[c.type].presets;
  return presets[c.value] ?? presets[DEVICE_TYPES[c.type].defaultPreset];
}

// Shared by both the DC and transient builders - led/bjt/mosfet behave
// identically on either path (only R/V/C/L differ between a steady-state
// bias check and a real dynamic simulation).
function buildNonlinearElement(c, resolve) {
  if (c.type === 'led') {
    return {
      kind: 'diode',
      id: c.id,
      terminals: { anode: resolve(c.holes.anode), cathode: resolve(c.holes.cathode) },
      params: DIODE_PRESETS.LED_RED,
    };
  }
  if (c.type === 'bjt_npn' || c.type === 'bjt_pnp') {
    const def = DEVICE_TYPES[c.type];
    return {
      kind: 'bjt',
      id: c.id,
      polarity: def.polarity,
      terminals: { collector: resolve(c.holes.collector), base: resolve(c.holes.base), emitter: resolve(c.holes.emitter) },
      params: deviceParams(c),
    };
  }
  // mosfet_n, mosfet_p
  const def = DEVICE_TYPES[c.type];
  return {
    kind: 'mosfet',
    id: c.id,
    polarity: def.polarity,
    terminals: { drain: resolve(c.holes.drain), gate: resolve(c.holes.gate), source: resolve(c.holes.source) },
    params: deviceParams(c),
  };
}

const NONLINEAR_TYPES = new Set(['led', 'bjt_npn', 'bjt_pnp', 'mosfet_n', 'mosfet_p']);

function buildElement(c, resolve) {
  if (c.type === 'battery') {
    return { kind: 'V', id: c.id, nodeA: resolve(c.holes.pos), nodeB: resolve(c.holes.neg), value: c.value };
  }
  if (c.type === 'function_gen') {
    // DC operating point: use the waveform's true (phase-independent) time
    // average, i.e. its offset - not valueAt(0), which would differ across
    // waveform shapes (triangle/sawtooth start at offset-amplitude, square
    // at offset+amplitude, sine at offset) for no physical reason.
    return { kind: 'V', id: c.id, nodeA: resolve(c.holes.pos), nodeB: resolve(c.holes.neg), value: c.value.offsetV };
  }
  if (c.type === 'probe') {
    return { kind: 'probe', id: c.id, terminals: { tip: resolve(c.holes.tip), ref: resolve(c.holes.ref) } };
  }
  if (NONLINEAR_TYPES.has(c.type)) return buildNonlinearElement(c, resolve);
  // resistor, capacitor, inductor, motor, servo
  return { kind: 'R', id: c.id, nodeA: resolve(c.holes.a), nodeB: resolve(c.holes.b), value: dcResistance(c) };
}

export function buildTransientElement(c, resolve) {
  if (c.type === 'battery') {
    return { kind: 'V', id: c.id, nodeA: resolve(c.holes.pos), nodeB: resolve(c.holes.neg), valueAt: () => c.value };
  }
  if (c.type === 'function_gen') {
    return {
      kind: 'V',
      id: c.id,
      nodeA: resolve(c.holes.pos),
      nodeB: resolve(c.holes.neg),
      valueAt: (t) => functionGenValueAt(t, c.value),
    };
  }
  if (c.type === 'probe') {
    return { kind: 'probe', id: c.id, terminals: { tip: resolve(c.holes.tip), ref: resolve(c.holes.ref) } };
  }
  if (c.type === 'capacitor') {
    return { kind: 'C', id: c.id, nodeA: resolve(c.holes.a), nodeB: resolve(c.holes.b), value: c.value };
  }
  if (c.type === 'inductor') {
    return { kind: 'L', id: c.id, nodeA: resolve(c.holes.a), nodeB: resolve(c.holes.b), value: c.value };
  }
  if (NONLINEAR_TYPES.has(c.type)) return buildNonlinearElement(c, resolve);
  // resistor, motor, servo
  return { kind: 'R', id: c.id, nodeA: resolve(c.holes.a), nodeB: resolve(c.holes.b), value: c.value };
}

function firstNodeOf(el) {
  if (el.kind === 'R' || el.kind === 'V' || el.kind === 'C' || el.kind === 'L') return el.nodeA;
  return Object.values(el.terminals)[0];
}

function pickGroundNode(elements) {
  const source = elements.find((e) => e.kind === 'V');
  if (source) return source.nodeB;
  return firstNodeOf(elements[0]);
}

function emptyResult(resolve) {
  return { voltages: new Map(), currents: new Map(), deviceInfo: new Map(), converged: true, iterations: 0, nodeFor: resolve };
}

// Shared by the DC solver and the Arduino live loop: reads off a
// per-component dominant-lead current (and, for transistors, small-signal
// operating-point info) from a set of solved voltages. Iterates
// `components` (not `elements`) so extra elements with no corresponding
// placed component (e.g. the Arduino's own pin/5V elements, appended after
// the component-derived ones) are safely ignored rather than indexed
// out-of-bounds.
export function deriveCurrents(elements, components, voltages, sourceCurrents) {
  const currents = new Map();
  const deviceInfo = new Map();

  components.forEach((c, i) => {
    const el = elements[i];
    if (!el) return;
    if (el.kind === 'V') {
      currents.set(c.id, sourceCurrents.get(c.id) ?? 0);
    } else if (el.kind === 'R') {
      const vA = voltages.get(el.nodeA) ?? 0;
      const vB = voltages.get(el.nodeB) ?? 0;
      currents.set(c.id, (vA - vB) / el.value);
    } else if (el.kind === 'probe') {
      // Ideal voltmeter: zero current, by construction.
      currents.set(c.id, 0);
    } else {
      // Nonlinear device: re-evaluate once at the converged operating point
      // to read off its dominant-lead current and (for transistors) the
      // small-signal/operating-point info the Inspector shows.
      const termNames = Object.keys(el.terminals);
      const v = Object.fromEntries(termNames.map((t) => [t, voltages.get(el.terminals[t]) ?? 0]));
      const { currents: termCurrents, opInfo } = evalNonlinearDevice(el, v, v);

      if (el.kind === 'diode') {
        currents.set(c.id, termCurrents.anode);
      } else if (el.kind === 'bjt') {
        currents.set(c.id, opInfo.ic);
        deviceInfo.set(c.id, opInfo);
      } else if (el.kind === 'mosfet') {
        currents.set(c.id, opInfo.id);
        deviceInfo.set(c.id, opInfo);
      }
    }
  });

  return { currents, deviceInfo };
}

export function simulateCircuit(components, wires) {
  const { resolve } = resolveTopology(wires);

  const elements = components.map((c) => buildElement(c, resolve));
  if (elements.length === 0) return emptyResult(resolve);

  const groundNode = pickGroundNode(elements);
  const { voltages, sourceCurrents, converged, iterations } = solveDCOperatingPoint(elements, groundNode);
  const { currents, deviceInfo } = deriveCurrents(elements, components, voltages, sourceCurrents);

  return { voltages, currents, deviceInfo, converged, iterations, nodeFor: resolve };
}

// Auto-windowing policy for the oscilloscope capture: resolution is driven
// by the fastest function generator present, settle/display window by the
// slowest - see the phase-2 plan for the reasoning behind these numbers.
const STEPS_PER_PERIOD_FAST = 200;
const SETTLE_PERIODS_SLOW = 8;
const DISPLAY_PERIODS_SLOW = 3;
const FALLBACK_FREQ_HZ = 10;
const MAX_STEPS = 20000;

function emptyScopeResult() {
  return { time: new Float64Array([0]), probeVoltages: new Map(), converged: true, firstDivergedStep: null };
}

export function captureTransient(components, wires) {
  const { resolve } = resolveTopology(wires);
  const elements = components.map((c) => buildTransientElement(c, resolve));
  if (elements.length === 0) return emptyScopeResult();

  const groundNode = pickGroundNode(elements);

  const genFreqs = components
    .filter((c) => c.type === 'function_gen')
    .map((c) => c.value.freqHz)
    .filter((f) => f > 0);
  const minFreq = genFreqs.length ? Math.min(...genFreqs) : FALLBACK_FREQ_HZ;
  const maxFreq = genFreqs.length ? Math.max(...genFreqs) : FALLBACK_FREQ_HZ;

  let dt = 1 / (maxFreq * STEPS_PER_PERIOD_FAST);
  const totalTime = (SETTLE_PERIODS_SLOW + DISPLAY_PERIODS_SLOW) / minFreq;
  let numSteps = Math.round(totalTime / dt);
  if (numSteps > MAX_STEPS) {
    numSteps = MAX_STEPS;
    dt = totalTime / numSteps;
  }

  const result = solveTransient(elements, groundNode, dt, numSteps);

  // Keep only the final DISPLAY_PERIODS_SLOW/minFreq seconds (letting the
  // power-on transient settle out first), re-zeroing the time axis.
  const displayWindow = DISPLAY_PERIODS_SLOW / minFreq;
  const endTime = result.time[result.time.length - 1];
  let startIdx = 0;
  for (let i = 0; i < result.time.length; i++) {
    if (result.time[i] >= endTime - displayWindow) {
      startIdx = i;
      break;
    }
  }
  const startTime = result.time[startIdx];

  const time = result.time.slice(startIdx).map((t) => t - startTime);
  const probeVoltages = new Map();
  for (const [id, arr] of result.probeVoltages) probeVoltages.set(id, arr.slice(startIdx));

  return { time, probeVoltages, converged: result.converged, firstDivergedStep: result.firstDivergedStep };
}
