export function formatOhms(v) {
  if (!isFinite(v)) return '∞';
  if (v >= 1e6) return `${parseFloat((v / 1e6).toFixed(2))}MΩ`;
  if (v >= 1000) return `${parseFloat((v / 1000).toFixed(2))}kΩ`;
  return `${parseFloat(v.toFixed(1))}Ω`;
}

export function formatFarads(v) {
  if (v >= 1)    return `${v}F`;
  if (v >= 1e-3) return `${(v * 1e3).toFixed(0)}mF`;
  if (v >= 1e-6) return `${(v * 1e6).toFixed(0)}µF`;
  return `${(v * 1e9).toFixed(0)}nF`;
}

export function formatHenry(v) {
  if (v >= 1)    return `${v}H`;
  if (v >= 1e-3) return `${(v * 1e3).toFixed(0)}mH`;
  return `${(v * 1e6).toFixed(0)}µH`;
}

export function formatCurrent(amps) {
  const mA = amps * 1000;
  return `${mA.toFixed(2)} mA`;
}

export function formatVoltage(v) {
  return `${v.toFixed(2)}V`;
}

export function formatSiemens(s) {
  if (!isFinite(s)) return '∞';
  const mS = s * 1000;
  if (mS >= 1) return `${mS.toFixed(2)} mS`;
  return `${(s * 1e6).toFixed(1)} µS`;
}

export function formatFrequency(hz) {
  if (hz >= 1000) return `${parseFloat((hz / 1000).toFixed(2))}kHz`;
  return `${hz}Hz`;
}
