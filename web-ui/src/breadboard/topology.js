import { baseNodeForHole } from './layout';

// Simple union-find (disjoint set) so we can merge nodes that a wire
// connects directly - a wire is an ideal (zero-resistance) connection, so
// both ends really are the *same* electrical node once placed.
class UnionFind {
  constructor() {
    this.parent = new Map();
  }
  find(x) {
    if (!this.parent.has(x)) this.parent.set(x, x);
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)));
    }
    return this.parent.get(x);
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

function holeNode(holeId) {
  const [row, col] = holeId.split('-');
  // col stays a string here - baseNodeForHole only ever interpolates it into
  // a template string (`T${col}`), which is behavior-identical whether col
  // is a number or numeric string; keeping it a string lets non-numeric
  // "columns" (e.g. an Arduino pin name like "D13") work the same way.
  return baseNodeForHole(row, col);
}

// Given the list of placed wires (each { fromHole, toHole }), returns:
//  - resolve(holeId) -> canonical node name, after wire merges
//  - nodeIds -> the set of distinct canonical nodes in use
export function resolveTopology(wires) {
  const uf = new UnionFind();
  for (const wire of wires) {
    uf.union(holeNode(wire.fromHole), holeNode(wire.toHole));
  }
  return {
    resolve: (holeId) => uf.find(holeNode(holeId)),
  };
}
