import { evalNonlinearDevice } from './devices';

// Stamps every nonlinear device's Newton-Raphson linearization for one
// iteration. Shared by dcSolve.js (a single operating-point solve) and
// transientSolve.js (one call per time step) so this exact logic - including
// the vUsed subtlety below - only exists once.
export function stampNonlinearDevices(builder, nonlinear, v, vPrev) {
  for (const el of nonlinear) {
    const termNames = Object.keys(el.terminals);
    const vNow = Object.fromEntries(termNames.map((t) => [t, v.get(el.terminals[t]) ?? 0]));
    const vAtPrev = Object.fromEntries(termNames.map((t) => [t, vPrev.get(el.terminals[t]) ?? 0]));
    const { currents, partials, vUsed } = evalNonlinearDevice(el, vNow, vAtPrev);

    for (const t of termNames) {
      const node = el.terminals[t];
      let offset = currents[t];
      for (const t2 of termNames) {
        const g = partials[t][t2];
        builder.stampPartial(node, el.terminals[t2], g);
        // Must use vUsed (the point currents/partials were actually
        // evaluated at, post any internal junction-voltage limiting), not
        // the raw vNow - otherwise the linearization offset is computed
        // against the wrong reference point and the iteration diverges.
        offset -= g * vUsed[t2];
      }
      builder.injectCurrent(node, -offset);
    }
  }
}
