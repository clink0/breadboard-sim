import { describe, it, expect } from 'vitest';
import { validateCircuitPatch } from './validateCircuitPatch';

describe('validateCircuitPatch', () => {
  it('accepts a valid patch with components, wires, and a sketch', () => {
    const { valid, errors } = validateCircuitPatch({
      addComponents: [
        { type: 'resistor', value: 220, holes: { a: 'a-5', b: 'b-5' } },
      ],
      addWires: [{ fromHole: 'a-5', toHole: 'railTopPlus-5' }],
      arduinoSketch: 'void setup() {}\nvoid loop() {}\n',
    });
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });

  it('accepts an empty patch', () => {
    expect(validateCircuitPatch({}).valid).toBe(true);
  });

  it('rejects an unknown component type', () => {
    const { valid, errors } = validateCircuitPatch({
      addComponents: [{ type: 'flux-capacitor', holes: {} }],
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('not a known component type'))).toBe(true);
  });

  it('rejects a malformed hole id', () => {
    const { valid, errors } = validateCircuitPatch({
      addComponents: [{ type: 'resistor', value: 220, holes: { a: 'not-a-real-hole-99', b: 'b-5' } }],
    });
    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes('holes.a'))).toBe(true);
  });

  it('rejects an out-of-range column', () => {
    const { valid } = validateCircuitPatch({ addWires: [{ fromHole: 'a-99', toHole: 'b-5' }] });
    expect(valid).toBe(false);
  });

  it('accepts a valid arduino hole id', () => {
    const { valid } = validateCircuitPatch({ addWires: [{ fromHole: 'arduino-D13', toHole: 'arduino-GND' }] });
    expect(valid).toBe(true);
  });

  it('rejects a non-string arduinoSketch', () => {
    const { valid, errors } = validateCircuitPatch({ arduinoSketch: 42 });
    expect(valid).toBe(false);
    expect(errors).toContain('arduinoSketch must be a string or null');
  });

  it('rejects a non-object patch', () => {
    expect(validateCircuitPatch(null).valid).toBe(false);
    expect(validateCircuitPatch('nope').valid).toBe(false);
  });
});
