// Shockley diode equation. Also the LED forward-conduction model - an LED is
// just a diode with a bigger bandgap (higher Vf), hence the much smaller Is
// (saturation current) than a small-signal silicon diode would need to reach
// the same forward current.
import { VT } from './constants';
import { limitJunctionVoltage } from './limiting';

export const DIODE_PRESETS = {
  LED_RED: { label: 'Red LED', Is: 5e-20, n: 1.8 },
};

// Generic nonlinear-device contract (shared with bjt.js/mosfet.js): given the
// terminal voltages at this iteration (`v`) and the previous iteration
// (`vPrev`, used only for step limiting), return the current drawn from each
// terminal plus the Jacobian (d(current drawn from terminal t)/d(v of t2)) -
// exactly what dcSolve.js needs to stamp a Norton-linearized companion model.
export function diodeEval(v, vPrev, { Is, n }) {
  const vte = n * VT;
  const vdRaw = v.anode - v.cathode;
  const vdPrev = vPrev.anode - vPrev.cathode;
  const vd = limitJunctionVoltage(vdRaw, vdPrev, Is, vte);

  const ex = Math.exp(vd / vte);
  const id = Is * (ex - 1);
  const gd = (Is / vte) * ex;

  // See the matching comment in bjt.js: when limitJunctionVoltage() clamps
  // vd, the offset dcSolve.js stamps must be computed against this same
  // (possibly limited) point, not the raw terminal voltages - otherwise the
  // Newton-Raphson linearization is inconsistent and can diverge.
  const vUsed = { cathode: v.cathode, anode: v.cathode + vd };

  return {
    currents: { anode: id, cathode: -id },
    partials: {
      anode: { anode: gd, cathode: -gd },
      cathode: { anode: -gd, cathode: gd },
    },
    vUsed,
    opInfo: { vd, id },
  };
}
