import { validateComponentSpec, validateWireSpec } from './validateCircuitElements';

// Checks the shape of a circuit "patch" - what the AI tutor's modify_circuit
// tool call input, or anything else proposing components/wires/a sketch to
// add, must satisfy before it's ever applied to circuitStore/arduinoStore.
// This is the actual trust boundary: the patch arrives as structured data
// over the network (a chat API response), not from the user's own clicks.
export function validateCircuitPatch(patch) {
  const errors = [];

  if (!patch || typeof patch !== 'object') {
    return { valid: false, errors: ['patch must be an object'] };
  }

  if (patch.addComponents !== undefined) {
    if (!Array.isArray(patch.addComponents)) {
      errors.push('addComponents must be an array');
    } else {
      patch.addComponents.forEach((c, i) => validateComponentSpec(c, `addComponents[${i}]`, errors));
    }
  }

  if (patch.addWires !== undefined) {
    if (!Array.isArray(patch.addWires)) {
      errors.push('addWires must be an array');
    } else {
      patch.addWires.forEach((w, i) => validateWireSpec(w, `addWires[${i}]`, errors));
    }
  }

  if (patch.arduinoSketch !== undefined && patch.arduinoSketch !== null && typeof patch.arduinoSketch !== 'string') {
    errors.push('arduinoSketch must be a string or null');
  }

  return { valid: errors.length === 0, errors };
}
