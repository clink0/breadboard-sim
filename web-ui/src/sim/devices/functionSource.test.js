import { describe, it, expect } from 'vitest';
import { sineValue, squareValue, triangleValue, sawtoothValue } from './functionSource';

const params = { freqHz: 10, amplitudeV: 2, offsetV: 1 }; // T = 0.1s
const T = 1 / params.freqHz;

describe('function generator waveforms', () => {
  it('sine matches offset + amplitude*sin(2*pi*f*t) at quarter-period points', () => {
    expect(sineValue(0, params)).toBeCloseTo(1, 10);
    expect(sineValue(T / 4, params)).toBeCloseTo(3, 10);
    expect(sineValue(T / 2, params)).toBeCloseTo(1, 10);
    expect(sineValue((3 * T) / 4, params)).toBeCloseTo(-1, 10);
  });

  it('square is a 50% duty two-level wave', () => {
    expect(squareValue(0, params)).toBeCloseTo(3, 10);
    expect(squareValue(T / 4, params)).toBeCloseTo(3, 10);
    expect(squareValue(T / 2, params)).toBeCloseTo(-1, 10);
    expect(squareValue((3 * T) / 4, params)).toBeCloseTo(-1, 10);
  });

  it('triangle ramps linearly between peaks', () => {
    expect(triangleValue(0, params)).toBeCloseTo(-1, 10);
    expect(triangleValue(T / 4, params)).toBeCloseTo(1, 10);
    expect(triangleValue(T / 2, params)).toBeCloseTo(3, 10);
    expect(triangleValue((3 * T) / 4, params)).toBeCloseTo(1, 10);
  });

  it('sawtooth ramps and resets', () => {
    expect(sawtoothValue(0, params)).toBeCloseTo(-1, 10);
    expect(sawtoothValue(T / 4, params)).toBeCloseTo(0, 10);
    expect(sawtoothValue(T / 2, params)).toBeCloseTo(1, 10);
    expect(sawtoothValue((3 * T) / 4, params)).toBeCloseTo(2, 10);
  });
});
