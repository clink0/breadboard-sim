import { create } from 'zustand';
import { simulateCircuit, captureTransient } from '../sim/simulate';
import { TERMINALS } from './deviceTerminals';
import { DEVICE_TYPES } from '../sim/devices';

const EMPTY_SCOPE_RESULT = { time: new Float64Array([0]), probeVoltages: new Map(), converged: true, firstDivergedStep: null };

let idCounter = 1;
const nextId = () => `el-${idCounter++}`;

export const COMPONENT_DEFAULTS = {
  resistor:  { value: 220,    label: 'Resistor' },
  led:       { value: null,   label: 'LED' },
  battery:   { value: 5,     label: 'Battery' },
  wire:      { value: null,   label: 'Wire' },
  capacitor: { value: 100e-6, label: 'Capacitor' }, // 100 µF, stored in Farads
  inductor:  { value: 0.1,   label: 'Inductor' },   // 100 mH, stored in Henrys
  motor:     { value: 15,    label: 'DC Motor' },    // 15 Ω winding resistance
  servo:     { value: 1000,  label: 'Servo' },       // ~1 kΩ load
  bjt_npn:   { value: DEVICE_TYPES.bjt_npn.defaultPreset,   label: 'NPN Transistor' },
  bjt_pnp:   { value: DEVICE_TYPES.bjt_pnp.defaultPreset,   label: 'PNP Transistor' },
  mosfet_n:  { value: DEVICE_TYPES.mosfet_n.defaultPreset,  label: 'N-Channel MOSFET' },
  mosfet_p:  { value: DEVICE_TYPES.mosfet_p.defaultPreset,  label: 'P-Channel MOSFET' },
  function_gen: { value: { waveform: 'sine', freqHz: 1000, amplitudeV: 2.5, offsetV: 2.5 }, label: 'Function Gen' },
  probe:        { value: null, label: 'Scope Probe' },
};

export const useCircuitStore = create((set, get) => ({
  view: 'breadboard', // 'breadboard' | 'arduino'
  tool: 'wire', // 'wire' | 'resistor' | 'led' | 'battery' | ...
  pendingHoles: [], // holes clicked so far, waiting for the tool's remaining terminals
  components: [], // { id, type, value, holes: { [terminalName]: holeId } }
  wires: [], // { id, fromHole, toHole }
  selectedId: null,
  simResult: { voltages: new Map(), currents: new Map(), deviceInfo: new Map(), converged: true, nodeFor: () => null },
  running: false,
  liveSource: null, // null | 'dc' | 'arduino' - which of DC Simulate / Arduino live-run is currently driving `running`/`simResult`
  scopeResult: EMPTY_SCOPE_RESULT,

  setView: (view) => set({ view }),

  setTool: (tool) => set({ tool, pendingHoles: [] }),

  selectElement: (id) => set({ selectedId: id }),

  clickHole: (holeId) => {
    const { tool, pendingHoles } = get();
    if (pendingHoles.includes(holeId)) {
      set({ pendingHoles: [] }); // clicked an already-pending hole again, cancel
      return;
    }

    const terminalNames = TERMINALS[tool];
    const clicked = [...pendingHoles, holeId];
    if (clicked.length < terminalNames.length) {
      set({ pendingHoles: clicked });
      return;
    }

    const id = nextId();
    if (tool === 'wire') {
      set((s) => ({ wires: [...s.wires, { id, fromHole: clicked[0], toHole: clicked[1] }], pendingHoles: [] }));
    } else {
      const defaults = COMPONENT_DEFAULTS[tool];
      const holes = Object.fromEntries(terminalNames.map((name, i) => [name, clicked[i]]));
      set((s) => ({
        components: [...s.components, { id, type: tool, value: defaults.value, holes }],
        pendingHoles: [],
      }));
    }
  },

  updateComponentValue: (id, value) =>
    set((s) => ({
      components: s.components.map((c) => (c.id === id ? { ...c, value } : c)),
    })),

  removeElement: (id) =>
    set((s) => ({
      components: s.components.filter((c) => c.id !== id),
      wires: s.wires.filter((w) => w.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  reset: () => set({
    components: [],
    wires: [],
    pendingHoles: [],
    selectedId: null,
    running: false,
    liveSource: null,
    simResult: { voltages: new Map(), currents: new Map(), deviceInfo: new Map(), converged: true, nodeFor: () => null },
    scopeResult: EMPTY_SCOPE_RESULT,
  }),

  runSimulation: () => {
    const { components, wires } = get();
    const result = simulateCircuit(components, wires);
    set({ simResult: result, running: true, liveSource: 'dc' });
  },

  stopSimulation: () => set({ running: false, liveSource: null }),

  runCapture: () => {
    const { components, wires } = get();
    set({ scopeResult: captureTransient(components, wires) });
  },
}));
