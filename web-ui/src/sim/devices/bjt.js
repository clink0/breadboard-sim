// Ebers-Moll (transport form) BJT model with the standard SPICE-Level-1
// Early-effect correction. Only the DC/forward-conduction terms are modeled
// (no junction capacitances/charge storage yet - that's transient-analysis
// territory for a later phase). Body-effect-style refinements don't apply to
// a 3-terminal BJT; the simplifications here are: fixed room temperature (see
// constants.js) and no explicit base/collector/emitter series resistance.
import { VT } from './constants';
import { limitJunctionVoltage } from './limiting';

export const BJT_PRESETS = {
  NPN_SMALL_SIGNAL: { label: 'Small-signal NPN (2N3904-like)', Is: 1e-14, BF: 200, BR: 1, Va: 100 },
  NPN_HIGH_BETA: { label: 'High-beta NPN (BC547-like)', Is: 5e-15, BF: 400, BR: 1, Va: 120 },
  PNP_SMALL_SIGNAL: { label: 'Small-signal PNP (2N3906-like)', Is: 1e-14, BF: 180, BR: 1, Va: 80 },
  PNP_HIGH_BETA: { label: 'High-beta PNP (BC557-like)', Is: 5e-15, BF: 350, BR: 1, Va: 100 },
};

// Core math assuming NPN orientation: v = { collector, base, emitter }
// (absolute node voltages). Returns terminal currents (amps drawn from each
// terminal into the device) and the full 3x3 Jacobian w.r.t. those same
// absolute voltages (via chain rule through the two junction voltages
// vbe = base-emitter, vbc = base-collector).
function evalNpnCore(v, vPrev, { Is, BF, BR, Va }) {
  const vbeRaw = v.base - v.emitter;
  const vbcRaw = v.base - v.collector;
  const vbePrev = vPrev.base - vPrev.emitter;
  const vbcPrev = vPrev.base - vPrev.collector;
  const vbe = limitJunctionVoltage(vbeRaw, vbePrev, Is, VT);
  const vbc = limitJunctionVoltage(vbcRaw, vbcPrev, Is, VT);

  const expBe = Math.exp(vbe / VT);
  const expBc = Math.exp(vbc / VT);
  const If = Is * (expBe - 1);
  const Ir = Is * (expBc - 1);
  const gif = (Is / VT) * expBe; // dIf/dVbe
  const gir = (Is / VT) * expBc; // dIr/dVbc

  const Vce = vbe - vbc;
  const early = 1 + Vce / Va;

  const Ic = If * early - Ir / BR;
  const Ib = If / BF + Ir / BR;
  const Ie = Ib + Ic;

  const dIc_dVbe = gif * early + If / Va;
  const dIc_dVbc = -gir / BR - If / Va;
  const dIb_dVbe = gif / BF;
  const dIb_dVbc = gir / BR;

  // Chain rule: vbe = base - emitter, vbc = base - collector.
  const dIb = { base: dIb_dVbe + dIb_dVbc, emitter: -dIb_dVbe, collector: -dIb_dVbc };
  const dIc = { base: dIc_dVbe + dIc_dVbc, emitter: -dIc_dVbe, collector: -dIc_dVbc };
  const dIe = {
    base: dIb.base + dIc.base,
    emitter: dIb.emitter + dIc.emitter,
    collector: dIb.collector + dIc.collector,
  };

  const currents = { base: Ib, collector: Ic, emitter: -Ie };
  const partials = {
    base: dIb,
    collector: dIc,
    emitter: { base: -dIe.base, emitter: -dIe.emitter, collector: -dIe.collector },
  };

  // The Newton-Raphson linearization I(v) ~= I(v0) + J(v0).(v-v0) is only
  // valid if the "v0" used for the offset term is the SAME point where I and
  // J were evaluated above - but when limitJunctionVoltage() clamps vbe/vbc,
  // that point is no longer the raw v passed in. Reconstruct a consistent
  // absolute-voltage v0 by holding emitter fixed and deriving base/collector
  // from the (possibly limited) junction voltages, so dcSolve.js can use it
  // for the offset instead of the raw (unlimited) terminal voltages. Without
  // this, deep-saturation circuits (large forced base current) diverge:
  // the offset would be computed against an inconsistent reference point,
  // and the resulting Norton current source is wrong by exactly the gap
  // between the raw and limited junction voltage - which can be huge.
  const vUsed = {
    emitter: v.emitter,
    base: v.emitter + vbe,
    collector: v.emitter + vbe - vbc,
  };

  const gm = dIc_dVbe;
  const rpi = dIb_dVbe > 1e-15 ? 1 / dIb_dVbe : Infinity;
  const ro = Ic > 1e-12 ? Va / Math.max(Ic, 1e-12) : Infinity;

  let region = 'cutoff';
  if (vbe > 0.4 && vbc <= 0.4) region = 'active';
  else if (vbe > 0.4 && vbc > 0.4) region = 'saturation';
  else if (vbe <= 0.4 && vbc > 0.4) region = 'reverse-active';

  return {
    currents,
    partials,
    vUsed,
    opInfo: { region, ib: Ib, ic: Ic, ie: Ie, vbe, vce: Vce, gm, rpi, ro },
  };
}

// PNP is the NPN math run with every terminal voltage negated and the
// resulting currents negated back - a standard mirroring trick (the
// Jacobian is unchanged by the double sign flip; see plan notes).
export function bjtEval(v, vPrev, params, polarity) {
  if (polarity === 'npn') return evalNpnCore(v, vPrev, params);

  const negate = (t) => ({ collector: -t.collector, base: -t.base, emitter: -t.emitter });
  const core = evalNpnCore(negate(v), negate(vPrev), params);
  const currents = {
    base: -core.currents.base,
    collector: -core.currents.collector,
    emitter: -core.currents.emitter,
  };
  const vUsed = negate(core.vUsed);
  return { ...core, currents, vUsed };
}
