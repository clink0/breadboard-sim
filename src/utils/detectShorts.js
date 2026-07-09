import { resolveTopology } from '../breadboard/topology';
import { TERMINALS } from '../state/deviceTerminals';

// Flags any component in a proposed patch whose terminals resolve to the
// same electrical node - e.g. a resistor placed with both leads in the same
// breadboard column (node identity depends only on column, not row, so this
// is an easy mistake to make from prose alone). A component like that isn't
// a solver error - the MNA solver happily solves a self-loop as "no current
// flows" - it's just silently not doing what was asked, which is worse than
// an error because nothing looks obviously wrong until you check the
// simulation. Resolves against the *existing* circuit's wires plus any
// wires the same patch is adding, so a patch that shorts itself via its own
// new wiring is caught too.
export function findShortedComponents(existingWires, patch) {
  const allWires = [...existingWires, ...(patch.addWires ?? [])];
  const { resolve } = resolveTopology(allWires);
  const problems = [];

  for (const c of patch.addComponents ?? []) {
    const terminalNames = TERMINALS[c.type] ?? [];
    const terminalsByNode = new Map(); // node -> [terminal names]
    for (const name of terminalNames) {
      const hole = c.holes?.[name];
      if (typeof hole !== 'string') continue;
      const node = resolve(hole);
      if (!terminalsByNode.has(node)) terminalsByNode.set(node, []);
      terminalsByNode.get(node).push(name);
    }

    for (const names of terminalsByNode.values()) {
      if (names.length < 2) continue;
      const holeList = names.map((n) => c.holes[n]).join(', ');
      problems.push(
        `${c.type}: its ${names.join(' and ')} leads (holes ${holeList}) are on the same electrical node, so it's shorted and won't behave as a real ${c.type} - both ends need to land in different columns.`,
      );
    }
  }

  return problems;
}
