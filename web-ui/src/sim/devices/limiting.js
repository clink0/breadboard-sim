// Newton-Raphson damping for nonlinear junctions, following the classic SPICE
// `pnjlim` technique (see Vladimirescu, "The SPICE Book", or ngspice's
// DEVpnjlim): an unconstrained NR step on an exponential diode/BJT junction
// can propose a voltage swing large enough for exp() to overflow or for the
// iteration to diverge outright. Instead of accepting the raw step, we cap it
// at a "critical voltage" beyond which the exponential's slope makes further
// linear extrapolation meaningless, and re-derive a bounded step from the
// diode equation itself rather than just clamping blindly.
export function limitJunctionVoltage(vNew, vOld, Is, vte) {
  const vcrit = vte * Math.log(vte / (Math.SQRT2 * Is));
  if (vNew > vcrit && Math.abs(vNew - vOld) > vte + vte) {
    if (vOld > 0) {
      const arg = 1 + (vNew - vOld) / vte;
      vNew = arg > 0 ? vOld + vte * Math.log(arg) : vcrit;
    } else {
      vNew = vcrit;
    }
  }
  return vNew;
}
