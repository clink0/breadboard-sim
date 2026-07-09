import { createTransientStepper } from './transientStepper';

const TRACEABLE_KINDS = new Set(['R', 'V', 'C', 'L', 'probe']);

function voltageAcross(el, voltages) {
  if (el.kind === 'probe') {
    return (voltages.get(el.terminals.tip) ?? 0) - (voltages.get(el.terminals.ref) ?? 0);
  }
  return (voltages.get(el.nodeA) ?? 0) - (voltages.get(el.nodeB) ?? 0);
}

function currentThrough(el, voltages, sourceCurrents, reactiveCurrents) {
  switch (el.kind) {
    case 'V': return sourceCurrents.get(el.id) ?? 0;
    case 'R': return ((voltages.get(el.nodeA) ?? 0) - (voltages.get(el.nodeB) ?? 0)) / el.value;
    case 'C':
    case 'L': return reactiveCurrents.get(el.id) ?? 0;
    default: return 0; // probe: ideal voltmeter, zero current by construction
  }
}

// elements: dcSolve.js's R/V/nonlinear shapes plus C/L/probe/norton kinds
// (see transientStepper.js). V-kind elements carry `valueAt(t)` instead of
// a fixed `value`. groundNode/dt/numSteps: 0V reference node, fixed time
// step, step count.
//
// Returns { time, voltages, currents, converged, firstDivergedStep }, where
// voltages/currents are Map<elementId, Float64Array> covering every
// R/V/C/L/probe element's voltage-across / current-through at each step -
// not just probes - so the oscilloscope can show a panel for any of them,
// not only ones with an explicit probe placed (see simulate.js's
// captureTransient and Oscilloscope.jsx). Nonlinear devices (LED/BJT/
// MOSFET) aren't tracked here - out of scope for the oscilloscope this pass.
export function solveTransient(elements, groundNode, dt, numSteps) {
  const traceable = elements.filter((el) => TRACEABLE_KINDS.has(el.kind));
  const time = new Float64Array(numSteps + 1);
  const voltages = new Map(traceable.map((el) => [el.id, new Float64Array(numSteps + 1)]));
  const currents = new Map(traceable.map((el) => [el.id, new Float64Array(numSteps + 1)]));

  const record = (stepIdx, stepVoltages, sourceCurrents, reactiveCurrents) => {
    for (const el of traceable) {
      voltages.get(el.id)[stepIdx] = voltageAcross(el, stepVoltages);
      currents.get(el.id)[stepIdx] = currentThrough(el, stepVoltages, sourceCurrents, reactiveCurrents);
    }
  };

  const stepper = createTransientStepper();
  let converged = true;
  let firstDivergedStep = null;

  // step 0 (t=0) is solved too, not just left at a flat-zero guess: a
  // source's value at t=0 (e.g. a sine starting mid-swing via its offset)
  // must actually be applied, using the declared rest initial conditions as
  // if they held for the instant just before t=0.
  for (let stepIdx = 0; stepIdx <= numSteps; stepIdx++) {
    const t = stepIdx * dt;
    time[stepIdx] = t;

    const { voltages: stepVoltages, converged: stepOk, sourceCurrents, reactiveCurrents } = stepper.step(elements, groundNode, dt, t);
    if (!stepOk) {
      converged = false;
      if (firstDivergedStep === null) firstDivergedStep = stepIdx;
    }
    record(stepIdx, stepVoltages, sourceCurrents, reactiveCurrents);
  }

  return { time, voltages, currents, converged, firstDivergedStep };
}
