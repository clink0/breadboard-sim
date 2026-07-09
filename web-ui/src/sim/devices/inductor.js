// Trapezoidal companion model for an inductor - the dual of capacitor.js.
// Same `vPrev`/`iPrev`/return-shape convention; see that file's comment.
export function inductorCompanion(vPrev, iPrev, inductance, dt) {
  const geq = dt / (2 * inductance);
  const ihist = geq * vPrev + iPrev;
  return { geq, ihist };
}
