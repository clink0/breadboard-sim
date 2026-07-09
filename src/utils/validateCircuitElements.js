import { TERMINALS } from '../state/deviceTerminals';
import { isValidHoleId } from '../breadboard/holeValidation';

export const COMPONENT_TYPES = new Set(Object.keys(TERMINALS).filter((t) => t !== 'wire'));

// Shared shape checks for a single "add a component" / "add a wire" spec, as
// used by both tutorial steps (src/tutorials/validateTutorial.js) and AI
// tool-call input (src/utils/validateCircuitPatch.js) - anywhere a
// components/wires patch arrives from outside the app and needs checking
// before it's applied to circuitStore.
export function validateComponentSpec(c, prefix, errors) {
  if (!c || typeof c !== 'object') { errors.push(`${prefix} must be an object`); return; }
  if (!COMPONENT_TYPES.has(c.type)) errors.push(`${prefix}.type "${c.type}" is not a known component type`);
  if (!c.holes || typeof c.holes !== 'object') {
    errors.push(`${prefix}.holes must be an object`);
    return;
  }
  const terminalNames = TERMINALS[c.type] ?? [];
  for (const name of terminalNames) {
    if (!isValidHoleId(c.holes[name])) errors.push(`${prefix}.holes.${name} must be a valid hole id`);
  }
}

export function validateWireSpec(w, prefix, errors) {
  if (!w || typeof w !== 'object') { errors.push(`${prefix} must be an object`); return; }
  if (!isValidHoleId(w.fromHole)) errors.push(`${prefix}.fromHole must be a valid hole id`);
  if (!isValidHoleId(w.toHole)) errors.push(`${prefix}.toHole must be a valid hole id`);
}
