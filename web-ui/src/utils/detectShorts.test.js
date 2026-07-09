import { describe, it, expect } from 'vitest';
import { findShortedComponents } from './detectShorts';

describe('findShortedComponents', () => {
  it('flags a resistor whose two leads are in the same column (different rows)', () => {
    const problems = findShortedComponents([], {
      addComponents: [{ type: 'resistor', value: 220, holes: { a: 'c-1', b: 'd-1' } }],
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/resistor/);
    expect(problems[0]).toMatch(/a and b/);
  });

  it('flags an LED shorted the same way (reproduces the reported bug)', () => {
    const problems = findShortedComponents([], {
      addComponents: [
        { type: 'resistor', value: 220, holes: { a: 'c-1', b: 'd-1' } },
        { type: 'led', value: null, holes: { anode: 'd-1', cathode: 'e-1' } },
      ],
    });
    expect(problems).toHaveLength(2);
  });

  it('does not flag a component correctly spanning two different columns', () => {
    const problems = findShortedComponents([], {
      addComponents: [{ type: 'resistor', value: 220, holes: { a: 'c-1', b: 'c-2' } }],
    });
    expect(problems).toEqual([]);
  });

  it('does not flag distinct rail vs terminal-strip holes', () => {
    const problems = findShortedComponents([], {
      addComponents: [{ type: 'resistor', value: 220, holes: { a: 'railTopPlus-5', b: 'a-5' } }],
    });
    expect(problems).toEqual([]);
  });

  it('accounts for existing wires that merge nodes', () => {
    const existingWires = [{ fromHole: 'a-1', toHole: 'a-2' }];
    const problems = findShortedComponents(existingWires, {
      addComponents: [{ type: 'resistor', value: 220, holes: { a: 'a-1', b: 'a-2' } }],
    });
    expect(problems).toHaveLength(1);
  });

  it('accounts for wires added in the same patch', () => {
    const problems = findShortedComponents([], {
      addWires: [{ fromHole: 'a-1', toHole: 'a-2' }],
      addComponents: [{ type: 'resistor', value: 220, holes: { a: 'a-1', b: 'a-2' } }],
    });
    expect(problems).toHaveLength(1);
  });

  it('flags a 3-terminal part with two leads on the same node', () => {
    const problems = findShortedComponents([], {
      addComponents: [{ type: 'bjt_npn', value: 'NPN_SMALL_SIGNAL', holes: { collector: 'a-1', base: 'a-2', emitter: 'a-1' } }],
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/collector and emitter/);
  });

  it('returns no problems for an empty patch', () => {
    expect(findShortedComponents([], {})).toEqual([]);
  });
});
