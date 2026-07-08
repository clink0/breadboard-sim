import { describe, it, expect } from 'vitest';
import { resolveTopology } from './topology';

describe('resolveTopology - breadboard holes (regression)', () => {
  it('merges holes in the same terminal-strip column without any wires', () => {
    const { resolve } = resolveTopology([]);
    expect(resolve('a-5')).toBe(resolve('c-5')); // same top-strip column
    expect(resolve('a-5')).not.toBe(resolve('a-6')); // different column
  });

  it('merges rail holes across the whole board', () => {
    const { resolve } = resolveTopology([]);
    expect(resolve('railTopPlus-1')).toBe(resolve('railBotPlus-20'));
    expect(resolve('railTopMinus-1')).toBe(resolve('railBotMinus-20'));
    expect(resolve('railTopPlus-1')).not.toBe(resolve('railTopMinus-1'));
  });

  it('merges two holes connected by an explicit wire', () => {
    const { resolve } = resolveTopology([{ fromHole: 'a-1', toHole: 'f-1' }]);
    expect(resolve('a-1')).toBe(resolve('f-1'));
  });
});

describe('resolveTopology - Arduino pin holes', () => {
  it('gives each unwired Arduino pin its own distinct node', () => {
    const { resolve } = resolveTopology([]);
    expect(resolve('arduino-D13')).not.toBe(resolve('arduino-D12'));
    expect(resolve('arduino-GND')).not.toBe(resolve('arduino-5V'));
  });

  it('merges an Arduino pin wired to a breadboard hole', () => {
    const { resolve } = resolveTopology([{ fromHole: 'arduino-D13', toHole: 'a-10' }]);
    expect(resolve('arduino-D13')).toBe(resolve('a-10'));
    expect(resolve('arduino-D13')).toBe(resolve('c-10')); // same breadboard column too
  });
});
