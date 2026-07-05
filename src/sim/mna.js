// A small, from-scratch Modified Nodal Analysis solver.
// This is the same family of technique falstad's circuit simulator uses
// under the hood for its DC/transient solves - we start with just the DC
// case here (resistors + independent voltage sources), which is enough to
// drive the current-flow/voltage visualization. Adding capacitors/inductors
// later means stepping this in time (companion models) rather than
// replacing the solver.

// Gaussian elimination with partial pivoting.
function solveLinearSystem(A, b) {
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

// elements: array of
//   { type: 'R', nodeA, nodeB, value }              resistor, ohms
//   { type: 'V', nodeA, nodeB, value }               ideal voltage source, volts (+ at nodeA)
// groundNode: the node name treated as 0V reference.
// Returns { voltages: Map<node, volts>, sourceCurrents: Map<sourceIndex, amps> }
export function solveDC(elements, groundNode) {
  const nodeSet = new Set();
  for (const el of elements) {
    nodeSet.add(el.nodeA);
    nodeSet.add(el.nodeB);
  }
  nodeSet.delete(groundNode);
  const nodes = [...nodeSet];
  const nodeIndex = new Map(nodes.map((n, i) => [n, i]));

  const sources = elements.filter((el) => el.type === 'V');
  const n = nodes.length;
  const m = sources.length;
  const size = n + m;

  const A = Array.from({ length: size }, () => new Array(size).fill(0));
  const b = new Array(size).fill(0);

  const idx = (node) => (node === groundNode ? -1 : nodeIndex.get(node));

  for (const el of elements) {
    if (el.type === 'R') {
      const g = 1 / el.value;
      const a = idx(el.nodeA);
      const bIdx = idx(el.nodeB);
      if (a >= 0) A[a][a] += g;
      if (bIdx >= 0) A[bIdx][bIdx] += g;
      if (a >= 0 && bIdx >= 0) {
        A[a][bIdx] -= g;
        A[bIdx][a] -= g;
      }
    }
  }

  sources.forEach((src, k) => {
    const row = n + k;
    const a = idx(src.nodeA);
    const bIdx = idx(src.nodeB);
    if (a >= 0) {
      A[a][row] += 1;
      A[row][a] += 1;
    }
    if (bIdx >= 0) {
      A[bIdx][row] -= 1;
      A[row][bIdx] -= 1;
    }
    b[row] = src.value;
  });

  const x = solveLinearSystem(A, b);

  const voltages = new Map();
  voltages.set(groundNode, 0);
  nodes.forEach((node, i) => voltages.set(node, x[i]));

  const sourceCurrents = new Map();
  sources.forEach((src, k) => sourceCurrents.set(src.id, x[n + k]));

  return { voltages, sourceCurrents };
}
