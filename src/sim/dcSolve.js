import { MnaBuilder, solveLinearSystem } from './mna';
import { NONLINEAR_KINDS } from './devices';
import { stampNonlinearDevices } from './nonlinearStamp';

// SPICE-standard values: a tiny conductance from every node to ground so the
// matrix can never be singular (e.g. a MOSFET gate carries exactly zero DC
// current, so a node touched only by gates would otherwise leave an
// all-zero row/column), plus flat-start Newton-Raphson tolerances.
export const GMIN = 1e-12;
export const VOLTAGE_TOL = 1e-6;
export const MAX_ITERS = 100;

// elements: array of
//   { kind: 'R', nodeA, nodeB, value }
//   { kind: 'V', id, nodeA, nodeB, value }
//   { kind: 'diode'|'bjt'|'mosfet', id, terminals: {roleName: node}, polarity?, params }
// groundNode: node name treated as the 0V reference.
// Returns { voltages: Map<node, volts>, sourceCurrents: Map<sourceId, amps>, converged, iterations }
export function solveDCOperatingPoint(elements, groundNode) {
  const nodeSet = new Set();
  for (const el of elements) {
    if (el.kind === 'R' || el.kind === 'V') {
      nodeSet.add(el.nodeA);
      nodeSet.add(el.nodeB);
    } else {
      for (const node of Object.values(el.terminals)) nodeSet.add(node);
    }
  }
  nodeSet.delete(groundNode);
  const nodes = [...nodeSet];

  const sources = elements.filter((el) => el.kind === 'V');
  const nonlinear = elements.filter((el) => NONLINEAR_KINDS.has(el.kind));

  // Flat start: every node begins at 0V.
  let v = new Map(nodes.map((n) => [n, 0]));
  v.set(groundNode, 0);
  let vPrev = new Map(v);
  let sourceCurrents = new Map();
  let converged = false;
  let iterations = 0;

  for (; iterations < MAX_ITERS; iterations++) {
    const builder = new MnaBuilder(nodes, groundNode, sources.length);

    for (const el of elements) {
      if (el.kind === 'R') builder.stampConductance(el.nodeA, el.nodeB, 1 / el.value);
    }
    sources.forEach((src, k) => builder.stampVoltageSourceRow(k, src.nodeA, src.nodeB, src.value));

    stampNonlinearDevices(builder, nonlinear, v, vPrev);

    // Convergence-and-singularity aid: minimum conductance to ground at every node.
    for (const node of nodes) builder.stampConductance(node, groundNode, GMIN);

    const { A, b } = builder.getSystem();
    const x = solveLinearSystem(A, b);

    const newV = new Map();
    newV.set(groundNode, 0);
    nodes.forEach((node, i) => newV.set(node, x[i]));
    sourceCurrents = new Map(sources.map((src, k) => [src.id, x[nodes.length + k]]));

    let maxDelta = 0;
    for (const node of nodes) maxDelta = Math.max(maxDelta, Math.abs(newV.get(node) - v.get(node)));

    vPrev = v;
    v = newV;

    if (maxDelta < VOLTAGE_TOL) {
      converged = true;
      iterations++;
      break;
    }
  }

  return { voltages: v, sourceCurrents, converged, iterations };
}
