import { createTransientStepper } from './transientStepper';

// elements: dcSolve.js's R/V/nonlinear shapes plus C/L/probe/norton kinds
// (see transientStepper.js). V-kind elements carry `valueAt(t)` instead of
// a fixed `value`. groundNode/dt/numSteps: 0V reference node, fixed time
// step, step count.
// Returns { time: Float64Array, probeVoltages: Map<probeId, Float64Array>, converged, firstDivergedStep }
export function solveTransient(elements, groundNode, dt, numSteps) {
  const probes = elements.filter((el) => el.kind === 'probe');
  const time = new Float64Array(numSteps + 1);
  const probeVoltages = new Map(probes.map((p) => [p.id, new Float64Array(numSteps + 1)]));

  const recordProbes = (stepIdx, voltages) => {
    for (const p of probes) {
      const va = voltages.get(p.terminals.tip) ?? 0;
      const vb = voltages.get(p.terminals.ref) ?? 0;
      probeVoltages.get(p.id)[stepIdx] = va - vb;
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

    const { voltages, converged: stepOk } = stepper.step(elements, groundNode, dt, t);
    if (!stepOk) {
      converged = false;
      if (firstDivergedStep === null) firstDivergedStep = stepIdx;
    }
    recordProbes(stepIdx, voltages);
  }

  return { time, probeVoltages, converged, firstDivergedStep };
}
