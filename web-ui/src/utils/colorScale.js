// Maps a voltage (relative to the circuit's ground reference) to a color.
// Cool blue for low/negative, neutral slate at 0V, warm amber/red for high.
// This is deliberately a *different* palette than falstad's red/green so it
// doesn't just read as a clone - but the concept (color = potential) is the
// same idea.
const LOW = [86, 148, 214]; // #5694D6 cool blue
const MID = [148, 155, 168]; // #949BA8 neutral slate
const HIGH = [232, 122, 46]; // #E87A2E warm amber

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
