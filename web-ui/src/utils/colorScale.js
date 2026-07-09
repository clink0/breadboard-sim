// Maps a voltage (relative to the circuit's ground reference) to a color.
// Falstad-style spectrum: vivid red for negative, a dark near-void gray at
// 0V (reads as "nothing interesting here" against the darkened canvas - see
// global.css), vivid green for positive. An earlier version deliberately
// used a different blue/amber palette to avoid reading as a clone - the
// user explicitly asked for this to look like Falstad, which supersedes
// that choice.
const LOW = [217, 58, 58]; // vivid red
const MID = [46, 50, 58]; // dark neutral, close to the darkened canvas void
const HIGH = [64, 214, 96]; // vivid green

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mix(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// voltage assumed roughly in [-vMax, vMax]; clamps outside that range.
export function voltageToColor(voltage, vMax = 5) {
  const t = Math.max(-1, Math.min(1, voltage / vMax));
  const [r, g, b] = t < 0 ? mix(MID, LOW, -t) : mix(MID, HIGH, t);
  return `rgb(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)})`;
}
