import { MnaBuilder, solveLinearSystem } from './mna';
import { NONLINEAR_KINDS } from './devices';
import { stampNonlinearDevices } from './nonlinearStamp';
import { GMIN, VOLTAGE_TOL, MAX_ITERS } from './dcSolve';
import { capacitorCompanion } from './devices/capacitor';
import { inductorCompanion } from './devices/inductor';

function collectNodes(elements) {
  const nodeSet = new Set();
  for (const el of elements) {
    if (el.kind === 'R' || el.kind === 'V' || el.kind === 'C' || el.kind === 'L' || el.kind === 'norton') {
      nodeSet.add(el.nodeA);
      nodeSet.add(el.nodeB);
    } else {
      for (const node of Object.values(el.terminals)) nodeSet.add(node);
    }
  }
  return nodeSet;
}

// Reusable incremental stepper for transient (time-domain) circuit
// simulation - shared by the batch solveTransient() (oscilloscope capture)
// and the Arduino live co-simulation loop (useAvrLiveRun.js). Owns
// companion-model state for reactive (C/L) elements, persisted across
// step() calls and keyed by element id (not node name), so it survives
// topology changes to unrelated parts of the circuit.
//
// In addition to dcSolve.js's element kinds, this understands:
//   { kind: 'norton', id, nodeA, nodeB, geq, ieq }  - a fixed linear Norton
//     source (used for Arduino pin drivers/pull-ups - see devices/arduinoPin.js)
export function createTransientStepper() {
  const reactiveState = new Map(); // id -> {v, i}
  let v = new Map();
  let lastKey = null;

  function step(elements, groundNode, dt, t) {
    const nodeSet = collectNodes(elements);
    nodeSet.delete(groundNode);
    const nodes = [...nodeSet];

    // groundNode is folded into the key, not fixed at stepper creation: in
    // the live loop, resolve()'s canonical node name for "ground" can shift
    // between frames purely because the union-find's arbitrary root choice
    // changes when unrelated wires are added elsewhere. Treating that
    // exactly like any other topology change (flat-zero warm-start reset
    // for this one step only) is safe by construction; reactiveState -
    // keyed by element id, not node name - is untouched, so an unrelated
    // capacitor elsewhere doesn't lose its charge.
    const key = `${groundNode}|${nodes.slice().sort().join(',')}`;
    if (key !== lastKey) {
      v = new Map(nodes.map((n) => [n, 0]));
      v.set(groundNode, 0);
      lastKey = key;
    } else {
      for (const n of nodes) if (!v.has(n)) v.set(n, 0);
    }

    const sources = elements.filter((el) => el.kind === 'V');
    const nonlinear = elements.filter((el) => NONLINEAR_KINDS.has(el.kind));
    const reactive = elements.filter((el) => el.kind === 'C' || el.kind === 'L');
    const nortons = elements.filter((el) => el.kind === 'norton');

    for (const el of reactive) {
      if (!reactiveState.has(el.id)) reactiveState.set(el.id, { v: 0, i: 0 });
    }

    const companion = new Map();
    for (const el of reactive) {
      const st = reactiveState.get(el.id);
      companion.set(
        el.id,
        el.kind === 'C'
          ? capacitorCompanion(st.v, st.i, el.value, dt)
          : inductorCompanion(st.v, st.i, el.value, dt),
      );
    }

    let vIter = v;
    let vPrevIter = v;
    let stepConverged = false;
    let sourceCurrents = new Map();

    for (let iter = 0; iter < MAX_ITERS; iter++) {
      const builder = new MnaBuilder(nodes, groundNode, sources.length);

      for (const el of elements) {
        if (el.kind === 'R') builder.stampConductance(el.nodeA, el.nodeB, 1 / el.value);
      }
      for (const el of reactive) {
        const { geq, ihist } = companion.get(el.id);
        builder.stampConductance(el.nodeA, el.nodeB, geq);
        if (el.kind === 'C') {
          builder.injectCurrent(el.nodeA, ihist);
          builder.injectCurrent(el.nodeB, -ihist);
        } else {
          builder.injectCurrent(el.nodeA, -ihist);
          builder.injectCurrent(el.nodeB, ihist);
        }
      }
      for (const el of nortons) {
        builder.stampConductance(el.nodeA, el.nodeB, el.geq);
        builder.injectCurrent(el.nodeA, el.ieq);
        builder.injectCurrent(el.nodeB, -el.ieq);
      }
      sources.forEach((src, k) => builder.stampVoltageSourceRow(k, src.nodeA, src.nodeB, src.valueAt(t)));

      stampNonlinearDevices(builder, nonlinear, vIter, vPrevIter);

      for (const node of nodes) builder.stampConductance(node, groundNode, GMIN);

      const { A, b } = builder.getSystem();
      const x = solveLinearSystem(A, b);

      const newV = new Map();
      newV.set(groundNode, 0);
      nodes.forEach((node, i) => newV.set(node, x[i]));
      sourceCurrents = new Map(sources.map((src, k) => [src.id, x[nodes.length + k]]));

      let maxDelta = 0;
      for (const node of nodes) maxDelta = Math.max(maxDelta, Math.abs(newV.get(node) - vIter.get(node)));

      vPrevIter = vIter;
      vIter = newV;

      if (maxDelta < VOLTAGE_TOL) {
        stepConverged = true;
        break;
      }
    }

    v = vIter;

    // Commit companion state from the just-solved v - an exact identity
    // given this step's {geq, ihist}, not an approximation.
    for (const el of reactive) {
      const { geq, ihist } = companion.get(el.id);
      const vNow = (v.get(el.nodeA) ?? 0) - (v.get(el.nodeB) ?? 0);
      const iNow = el.kind === 'C' ? geq * vNow - ihist : geq * vNow + ihist;
      reactiveState.set(el.id, { v: vNow, i: iNow });
    }

    return { voltages: v, converged: stepConverged, sourceCurrents };
  }

  return { step };
}
