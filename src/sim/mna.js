// A small, from-scratch Modified Nodal Analysis solver.
// This is the same family of technique falstad's circuit simulator uses
// under the hood for its DC/transient solves. `MnaBuilder` assembles the
// linear system for one solve (or one Newton-Raphson iteration, for
// nonlinear devices - see dcSolve.js); `solveLinearSystem` is the plain
// dense linear-algebra kernel underneath, agnostic to where the matrix
// came from.

// Gaussian elimination with partial pivoting.
export function solveLinearSystem(A, b) {
  const n = b.length;
  const M = A.map((row) => row.slice());
  const rhs = b.slice();

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivotRow][col])) pivotRow = row;
    }
    if (Math.abs(M[pivotRow][col]) < 1e-12) continue; // singular direction, e.g. isolated node
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
    [rhs[col], rhs[pivotRow]] = [rhs[pivotRow], rhs[col]];

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      if (factor === 0) continue;
      for (let k = col; k < n; k++) M[row][k] -= factor * M[col][k];
      rhs[row] -= factor * rhs[col];
    }
  }

  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = rhs[row];
    for (let k = row + 1; k < n; k++) sum -= M[row][k] * x[k];
    x[row] = Math.abs(M[row][row]) < 1e-12 ? 0 : sum / M[row][row];
  }
  return x;
}

// Assembles one MNA linear system: unknowns are [nodeVoltages..., sourceCurrents...].
// `nodes` excludes the ground node. `numVoltageSources` reserves the aux rows/columns
// used for ideal voltage sources (including VCCS-adjacent devices that need a current
// unknown - none do here, but the row count is fixed up front like real MNA).
export class MnaBuilder {
  constructor(nodes, groundNode, numVoltageSources) {
    this.nodes = nodes;
    this.groundNode = groundNode;
    this.nodeIndex = new Map(nodes.map((n, i) => [n, i]));
    this.n = nodes.length;
    this.m = numVoltageSources;
    const size = this.n + this.m;
    this.A = Array.from({ length: size }, () => new Array(size).fill(0));
    this.b = new Array(size).fill(0);
  }

  index(node) {
    return node === this.groundNode ? -1 : this.nodeIndex.get(node);
  }

  // Conductance g between two nodes (a resistor, or a device's own-terminal
  // linearized conductance).
  stampConductance(nodeA, nodeB, g) {
    const a = this.index(nodeA);
    const b = this.index(nodeB);
    if (a >= 0) this.A[a][a] += g;
    if (b >= 0) this.A[b][b] += g;
    if (a >= 0 && b >= 0) {
      this.A[a][b] -= g;
      this.A[b][a] -= g;
    }
  }

  // Independent (or Norton-equivalent) current source, `value` amps flowing
  // from nodeMinus to nodePlus through the external circuit.
  stampCurrentSource(nodePlus, nodeMinus, value) {
    const p = this.index(nodePlus);
    const m = this.index(nodeMinus);
    if (p >= 0) this.b[p] -= value;
    if (m >= 0) this.b[m] += value;
  }

  // Raw Jacobian entry: "current drawn from `node` increases by `g` amps per
  // volt at `controlNode`". A 2-terminal device's Jacobian happens to be
  // expressible as a symmetric pair of these (which is what stampConductance
  // is), but a 3-terminal nonlinear device (BJT/MOSFET) does not decompose
  // that way in general - e.g. a BJT's emitter current depends on both the
  // base-emitter *and* base-collector junctions, so its row can't be built
  // from a single two-terminal admittance. This is the general primitive the
  // Newton-Raphson device stamping in dcSolve.js is built on.
  stampPartial(node, controlNode, g) {
    const r = this.index(node);
    const c = this.index(controlNode);
    if (r >= 0 && c >= 0) this.A[r][c] += g;
  }

  // Injects `amps` of current into `node` from an independent source (the
  // constant term of a device's linearized current, after the `stampPartial`
  // calls above have accounted for its voltage-dependent part).
  injectCurrent(node, amps) {
    const idx = this.index(node);
    if (idx >= 0) this.b[idx] += amps;
  }

  // Ideal voltage source aux row/column (ith source, 0-indexed).
  stampVoltageSourceRow(sourceIndex, nodeA, nodeB, value) {
    const row = this.n + sourceIndex;
    const a = this.index(nodeA);
    const b = this.index(nodeB);
    if (a >= 0) {
      this.A[a][row] += 1;
      this.A[row][a] += 1;
    }
    if (b >= 0) {
      this.A[b][row] -= 1;
      this.A[row][b] -= 1;
    }
    this.b[row] = value;
  }

  getSystem() {
    return { A: this.A, b: this.b };
  }
}
