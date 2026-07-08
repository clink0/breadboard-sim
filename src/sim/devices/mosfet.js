// Shichman-Hodges square-law MOSFET model (SPICE Level-1) with channel-length
// modulation. Source is tied to body (no separate bulk terminal, so no body
// effect) - a documented simplification appropriate for a 3-terminal part in
// this app. No gate capacitance yet (that's transient-analysis territory for
// a later phase); the gate draws exactly zero DC current, which is why the
// solver's GMIN stamp is mandatory rather than an optimization.
export const MOSFET_PRESETS = {
  N_SMALL_SIGNAL: { label: 'N-channel MOSFET (2N7000-like)', Vth: 2.1, Kp: 0.2, lambda: 0.02 },
  LOGIC_LEVEL_N: { label: 'Logic-level N-MOSFET', Vth: 1.0, Kp: 0.5, lambda: 0.01 },
  P_SMALL_SIGNAL: { label: 'P-channel MOSFET (BS250-like)', Vth: 2.1, Kp: 0.2, lambda: 0.02 },
};

// Core math assuming NMOS orientation: v = { drain, gate, source }. `Vth` is
// always a positive magnitude - PMOS polarity is handled by mirroring (see
// mosfetEval below), same trick as bjt.js.
function evalNmosCore(v, _vPrev, { Vth, Kp, lambda }) {
  // Unlike the diode/BJT exponential junctions, the square-law I-V curve is
  // smooth and bounded, so plain Newton-Raphson converges without needing
  // per-iteration step limiting - and limiting it turned out actively harmful
  // here: clamping a large flat-start jump in Vgs let the rest of the circuit
  // settle (unclamped) around the device before the device itself ever saw
  // enough Vgs to turn on, so the solver falsely reported convergence at a
  // spurious cutoff-like operating point.
  const vgs = v.gate - v.source;
  const vds = v.drain - v.source;

  const vov = vgs - Vth;
  let id, gm, gds, region;

  if (vov <= 0) {
    region = 'cutoff';
    id = 0;
    gm = 0;
    gds = 0;
  } else if (vds < vov) {
    region = 'triode';
    id = Kp * (vov * vds - (vds * vds) / 2) * (1 + lambda * vds);
    gm = Kp * vds * (1 + lambda * vds);
    gds = Kp * (vov - vds) * (1 + lambda * vds) + Kp * (vov * vds - (vds * vds) / 2) * lambda;
  } else {
    region = 'saturation';
    id = (Kp / 2) * vov * vov * (1 + lambda * vds);
    gm = Kp * vov * (1 + lambda * vds);
    gds = (Kp / 2) * vov * vov * lambda;
  }

  // Chain rule: vgs = gate - source, vds = drain - source.
  const dId_dDrain = gds;
  const dId_dGate = gm;
  const dId_dSource = -gm - gds;

  const currents = { drain: id, source: -id, gate: 0 };
  const partials = {
    drain: { drain: dId_dDrain, gate: dId_dGate, source: dId_dSource },
    source: { drain: -dId_dDrain, gate: -dId_dGate, source: -dId_dSource },
    gate: { drain: 0, gate: 0, source: 0 },
  };

  const ro = gds > 1e-15 ? 1 / gds : Infinity;

  // No internal limiting happens here (see note above), so the point used
  // to evaluate currents/partials is exactly the raw `v` passed in - unlike
  // diode.js/bjt.js, there's no discrepancy for dcSolve.js's offset term to
  // correct for.
  return { currents, partials, vUsed: v, opInfo: { region, id, vgs, vds, gm, gds, ro } };
}

export function mosfetEval(v, vPrev, params, polarity) {
  if (polarity === 'n') return evalNmosCore(v, vPrev, params);

  const negate = (t) => ({ drain: -t.drain, gate: -t.gate, source: -t.source });
  const core = evalNmosCore(negate(v), negate(vPrev), params);
  const currents = { drain: -core.currents.drain, source: -core.currents.source, gate: 0 };
  return { ...core, currents, vUsed: v };
}
