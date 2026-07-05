import { resolveTopology } from '../breadboard/topology';
import { solveDC } from './mna';

// NOTE for future work (flagged for whoever picks this up in Claude Code):
// LEDs are modeled here as a fixed "on resistance" - not a real diode I-V
// curve. That's fine for making current flow/direction visible, but a
// proper build should replace this with a piecewise-linear or Newton
// iteration diode model so forward-voltage behavior is physically accurate.
const LED_ON_RESISTANCE = 40; // ohms, placeholder

export function simulateCircuit(components, wires) {
  const { resolve } = resolveTopology(wires);

  const elements = [];
  for (const c of components) {
    const nodeA = resolve(c.fromHole);
    const nodeB = resolve(c.toHole);
    if (c.type === 'resistor') {
      elements.push({ id: c.id, type: 'R', nodeA, nodeB, value: c.value });
    } else if (c.type === 'led') {
      elements.push({ id: c.id, type: 'R', nodeA, nodeB, value: LED_ON_RESISTANCE });
    } else if (c.type === 'battery') {
      elements.push({ id: c.id, type: 'V', nodeA, nodeB, value: c.value });
    }
  }

  if (elements.length === 0) {
    return { voltages: new Map(), currents: new Map(), nodeFor: resolve };
  }

  // Ground reference: prefer the rail explicitly used as "-" by any battery,
  // otherwise just pick the first node we see.
  const groundNode = elements.find((e) => e.type === 'V')?.nodeB ?? elements[0].nodeA;

  const { voltages, sourceCurrents } = solveDC(elements, groundNode);

  const currents = new Map();
  for (const c of components) {
    const nodeA = resolve(c.fromHole);
    const nodeB = resolve(c.toHole);
    const vA = voltages.get(nodeA) ?? 0;
    const vB = voltages.get(nodeB) ?? 0;
    if (c.type === 'battery') {
      currents.set(c.id, sourceCurrents.get(c.id) ?? 0);
    } else {
      const r = c.type === 'led' ? LED_ON_RESISTANCE : c.value;
      currents.set(c.id, (vA - vB) / r);
    }
  }

  return { voltages, currents, nodeFor: resolve };
}
