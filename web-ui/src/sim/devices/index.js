import { diodeEval, DIODE_PRESETS } from './diode';
import { bjtEval, BJT_PRESETS } from './bjt';
import { mosfetEval, MOSFET_PRESETS } from './mosfet';

export const NONLINEAR_KINDS = new Set(['diode', 'bjt', 'mosfet']);

// Dispatches to the right device module's `eval(v, vPrev, params[, polarity])`.
// `v`/`vPrev` are objects keyed by terminal role name (e.g. {anode, cathode}
// or {collector, base, emitter}) holding absolute node voltages for the
// current and previous Newton-Raphson iteration.
export function evalNonlinearDevice(el, v, vPrev) {
  switch (el.kind) {
    case 'diode':
      return diodeEval(v, vPrev, el.params);
    case 'bjt':
      return bjtEval(v, vPrev, el.params, el.polarity);
    case 'mosfet':
      return mosfetEval(v, vPrev, el.params, el.polarity);
    default:
      throw new Error(`unknown nonlinear device kind: ${el.kind}`);
  }
}

// Palette component type -> device metadata, consulted by simulate.js (to
// build the nonlinear element list) and Inspector.jsx (to render preset
// buttons). LED reuses the diode model directly with a fixed preset (see
// simulate.js) and isn't listed here since it has no user-selectable presets.
export const DEVICE_TYPES = {
  bjt_npn: {
    kind: 'bjt',
    polarity: 'npn',
    terminals: ['collector', 'base', 'emitter'],
    presets: { NPN_SMALL_SIGNAL: BJT_PRESETS.NPN_SMALL_SIGNAL, NPN_HIGH_BETA: BJT_PRESETS.NPN_HIGH_BETA },
    defaultPreset: 'NPN_SMALL_SIGNAL',
  },
  bjt_pnp: {
    kind: 'bjt',
    polarity: 'pnp',
    terminals: ['collector', 'base', 'emitter'],
    presets: { PNP_SMALL_SIGNAL: BJT_PRESETS.PNP_SMALL_SIGNAL, PNP_HIGH_BETA: BJT_PRESETS.PNP_HIGH_BETA },
    defaultPreset: 'PNP_SMALL_SIGNAL',
  },
  mosfet_n: {
    kind: 'mosfet',
    polarity: 'n',
    terminals: ['drain', 'gate', 'source'],
    presets: { N_SMALL_SIGNAL: MOSFET_PRESETS.N_SMALL_SIGNAL, LOGIC_LEVEL_N: MOSFET_PRESETS.LOGIC_LEVEL_N },
    defaultPreset: 'N_SMALL_SIGNAL',
  },
  mosfet_p: {
    kind: 'mosfet',
    polarity: 'p',
    terminals: ['drain', 'gate', 'source'],
    presets: { P_SMALL_SIGNAL: MOSFET_PRESETS.P_SMALL_SIGNAL },
    defaultPreset: 'P_SMALL_SIGNAL',
  },
};

export { DIODE_PRESETS };
