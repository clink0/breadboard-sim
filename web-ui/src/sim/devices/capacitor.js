// Trapezoidal (SPICE-default, 2nd-order) companion model for a capacitor.
// `vPrev`/`iPrev` are this element's terminal voltage (nodeA-nodeB) and the
// current entering nodeA, both from the end of the previous time step.
// Returns a Norton equivalent: a conductance `geq` between the two
// terminals plus a history current source `ihist` capturing the previous
// step's state. The stamp itself (which terminal gets +ihist vs -ihist) is
// the caller's job (transientSolve.js) - see the sign note in the plan; this
// module only computes the two scalars.
export function capacitorCompanion(vPrev, iPrev, capacitance, dt) {
  const geq = (2 * capacitance) / dt;
  const ihist = geq * vPrev + iPrev;
  return { geq, ihist };
}
