import { validateComponentSpec, validateWireSpec } from '../utils/validateCircuitElements';

const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim() !== '';
}

function validateStep(step, index, errors) {
  const prefix = `steps[${index}]`;
  if (!step || typeof step !== 'object') {
    errors.push(`${prefix} must be an object`);
    return;
  }
  if (!isNonEmptyString(step.id)) errors.push(`${prefix}.id must be a non-empty string`);
  if (typeof step.instructions !== 'string') errors.push(`${prefix}.instructions must be a string`);

  if (step.addComponents !== undefined) {
    if (!Array.isArray(step.addComponents)) {
      errors.push(`${prefix}.addComponents must be an array`);
    } else {
      step.addComponents.forEach((c, i) => validateComponentSpec(c, `${prefix}.addComponents[${i}]`, errors));
    }
  }

  if (step.addWires !== undefined) {
    if (!Array.isArray(step.addWires)) {
      errors.push(`${prefix}.addWires must be an array`);
    } else {
      step.addWires.forEach((w, i) => validateWireSpec(w, `${prefix}.addWires[${i}]`, errors));
    }
  }

  if (step.sketch !== undefined && step.sketch !== null && typeof step.sketch !== 'string') {
    errors.push(`${prefix}.sketch must be a string or null`);
  }
}

// Checks a plain object against the tutorial shape (see schema.js). Returns
// { valid, errors } rather than throwing so callers (import, draft-save) can
// show every problem at once instead of stopping at the first one.
export function validateTutorial(obj) {
  const errors = [];

  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['tutorial must be an object'] };
  }

  if (!isNonEmptyString(obj.id)) errors.push('id must be a non-empty string');
  if (!isNonEmptyString(obj.title)) errors.push('title must be a non-empty string');
  if (typeof obj.description !== 'string') errors.push('description must be a string');
  if (!DIFFICULTIES.has(obj.difficulty)) errors.push(`difficulty must be one of ${[...DIFFICULTIES].join(', ')}`);
  if (typeof obj.requiresArduino !== 'boolean') errors.push('requiresArduino must be a boolean');
  if (obj.featured !== undefined && typeof obj.featured !== 'boolean') errors.push('featured must be a boolean');
  if (!Array.isArray(obj.steps) || obj.steps.length === 0) {
    errors.push('steps must be a non-empty array');
  } else {
    obj.steps.forEach((s, i) => validateStep(s, i, errors));
  }

  return { valid: errors.length === 0, errors };
}
