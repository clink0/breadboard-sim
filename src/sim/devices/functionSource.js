// Waveform generators for the function-generator component. Pure functions
// of absolute time - no phase parameter and a fixed 50% duty cycle for the
// square wave (kept out of scope for v1).
export function sineValue(t, { freqHz, amplitudeV, offsetV }) {
  return offsetV + amplitudeV * Math.sin(2 * Math.PI * freqHz * t);
}

export function squareValue(t, { freqHz, amplitudeV, offsetV }) {
  const phase = (t * freqHz) % 1;
  return offsetV + (phase < 0.5 ? amplitudeV : -amplitudeV);
}

export function triangleValue(t, { freqHz, amplitudeV, offsetV }) {
  const phase = (t * freqHz) % 1;
  const shape = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase; // in [-1, 1]
  return offsetV + amplitudeV * shape;
}

export function sawtoothValue(t, { freqHz, amplitudeV, offsetV }) {
  const phase = (t * freqHz) % 1;
  return offsetV + amplitudeV * (2 * phase - 1);
}

export const WAVEFORMS = {
  sine: sineValue,
  square: squareValue,
  triangle: triangleValue,
  sawtooth: sawtoothValue,
};

export function functionGenValueAt(t, params) {
  const fn = WAVEFORMS[params.waveform] ?? sineValue;
  return fn(t, params);
}
