import { create } from 'zustand';
import { simulateCircuit, captureTransient } from '../sim/simulate';
import { TERMINALS } from 'shared/deviceTerminals.js';
import { DEVICE_TYPES } from '../sim/devices';
import { findShortedComponents } from '../utils/detectShorts';

const EMPTY_SCOPE_RESULT = { time: new Float64Array([0]), voltages: new Map(), currents: new Map(), converged: true, firstDivergedStep: null };

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
  page: 'workspace', // 'workspace' | 'tutorials' - top-level app page, set via the BrandMenu hover dropdown. Distinct from `view` below (that's the breadboard/arduino sub-view *within* the workspace page).
  view: 'breadboard', // 'breadboard' | 'arduino'
  inspectorTab: 'inspector', // 'inspector' | 'tutor' | 'tutorials' - lifted out of Inspector's own state so other UI (e.g. ShortPlacementWarning) can jump to the AI Tutor tab
  tool: 'wire', // 'wire' | 'resistor' | 'led' | 'battery' | ...
  pendingHoles: [], // holes clicked so far, waiting for the tool's remaining terminals
  components: [], // { id, type, value, holes: { [terminalName]: holeId } }
  wires: [], // { id, fromHole, toHole }
  selectedId: null,
  shortWarning: null, // { type, holes, problems } when a just-attempted manual placement would short itself - see clickHole
  simResult: { voltages: new Map(), currents: new Map(), deviceInfo: new Map(), converged: true, nodeFor: () => null },
  running: false,
  liveSource: null, // null | 'dc' | 'arduino' - which of DC Simulate / Arduino live-run is currently driving `running`/`simResult`
  scopeResult: EMPTY_SCOPE_RESULT,
  scopedComponentIds: [], // non-probe component ids explicitly added to the oscilloscope via Inspector's "Add to Scope" - probes are auto-included regardless, see Oscilloscope.jsx

  setPage: (page) => set({ page }),

  setView: (view) => set({ view }),

  setInspectorTab: (inspectorTab) => set({ inspectorTab }),

  setTool: (tool) => set({ tool, pendingHoles: [] }),

  selectElement: (id) => set({ selectedId: id }),

  dismissShortWarning: () => set({ shortWarning: null }),

  toggleScope: (id) =>
    set((s) => ({
      scopedComponentIds: s.scopedComponentIds.includes(id)
        ? s.scopedComponentIds.filter((x) => x !== id)
        : [...s.scopedComponentIds, id],
    })),

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

    if (tool === 'wire') {
      const id = nextId();
      set((s) => ({ wires: [...s.wires, { id, fromHole: clicked[0], toHole: clicked[1] }], pendingHoles: [] }));
      return;
    }

    const defaults = COMPONENT_DEFAULTS[tool];
    const holes = Object.fromEntries(terminalNames.map((name, i) => [name, clicked[i]]));
    const candidate = { type: tool, value: defaults.value, holes };

    // Same self-short check the AI tutor's proposed placements go through
    // (src/utils/detectShorts.js) - a component whose own leads land on the
    // same node isn't a solver error, it silently does nothing, so it's
    // worth catching here too rather than only for AI-driven placement.
    const problems = findShortedComponents(get().wires, { addComponents: [candidate] });
    if (problems.length > 0) {
      set({ pendingHoles: [], shortWarning: { type: tool, holes, problems } });
      return;
    }

    const id = nextId();
    set((s) => ({
      components: [...s.components, { id, ...candidate }],
      pendingHoles: [],
    }));
  },

  // Bulk-appends prebuilt components/wires (e.g. a tutorial step's expected
  // circuit), minting fresh ids via the same counter click-placement uses so
  // they never collide with elements the user placed by hand.
  applyElements: ({ components = [], wires = [] } = {}) =>
    set((s) => ({
      components: [...s.components, ...components.map((c) => ({ ...c, id: nextId() }))],
      wires: [...s.wires, ...wires.map((w) => ({ ...w, id: nextId() }))],
    })),

  updateComponentValue: (id, value) =>
    set((s) => ({
      components: s.components.map((c) => (c.id === id ? { ...c, value } : c)),
    })),

  // Drag-to-reposition commits - see breadboard/useElementDrag.js for the
  // column-delta math and short-circuit guard that run before these are called.
  moveComponent: (id, newHoles) =>
    set((s) => ({
      components: s.components.map((c) => (c.id === id ? { ...c, holes: newHoles } : c)),
    })),

  moveWireEndpoint: (id, endpoint, newHoleId) =>
    set((s) => ({
      wires: s.wires.map((w) => (w.id === id ? { ...w, [endpoint]: newHoleId } : w)),
    })),

  removeElement: (id) =>
    set((s) => ({
      components: s.components.filter((c) => c.id !== id),
      wires: s.wires.filter((w) => w.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      scopedComponentIds: s.scopedComponentIds.filter((x) => x !== id),
    })),

  reset: () => set({
    components: [],
    wires: [],
    pendingHoles: [],
    selectedId: null,
    shortWarning: null,
    running: false,
    liveSource: null,
    simResult: { voltages: new Map(), currents: new Map(), deviceInfo: new Map(), converged: true, nodeFor: () => null },
    scopeResult: EMPTY_SCOPE_RESULT,
    scopedComponentIds: [],
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
