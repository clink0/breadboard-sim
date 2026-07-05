import { create } from 'zustand';
import { simulateCircuit } from '../sim/simulate';

let idCounter = 1;
const nextId = () => `el-${idCounter++}`;

export const COMPONENT_DEFAULTS = {
  resistor: { value: 220, label: 'Resistor' },
  led: { value: null, label: 'LED' },
  battery: { value: 5, label: 'Battery' },
  wire: { value: null, label: 'Wire' },
};

export const useCircuitStore = create((set, get) => ({
  tool: 'wire', // 'wire' | 'resistor' | 'led' | 'battery' | 'select'
  pendingHole: null, // first hole clicked, waiting for a second click to complete a placement
  components: [], // resistors, LEDs, batteries: { id, type, value, fromHole, toHole }
  wires: [], // { id, fromHole, toHole }
  selectedId: null,
  simResult: { voltages: new Map(), currents: new Map(), nodeFor: () => null },
  running: false,

  setTool: (tool) => set({ tool, pendingHole: null }),

  selectElement: (id) => set({ selectedId: id }),

  clickHole: (holeId) => {
    const { tool, pendingHole } = get();
    if (!pendingHole) {
      set({ pendingHole: holeId });
      return;
    }
    if (pendingHole === holeId) {
      set({ pendingHole: null }); // clicked the same hole twice, cancel
      return;
    }
    const id = nextId();
    if (tool === 'wire') {
      set((s) => ({ wires: [...s.wires, { id, fromHole: pendingHole, toHole: holeId }], pendingHole: null }));
    } else {
      const defaults = COMPONENT_DEFAULTS[tool];
      set((s) => ({
        components: [
          ...s.components,
          { id, type: tool, value: defaults.value, fromHole: pendingHole, toHole: holeId },
        ],
        pendingHole: null,
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

  reset: () => set({ components: [], wires: [], pendingHole: null, selectedId: null, running: false, simResult: { voltages: new Map(), currents: new Map(), nodeFor: () => null } }),

  runSimulation: () => {
    const { components, wires } = get();
    const result = simulateCircuit(components, wires);
    set({ simResult: result, running: true });
  },

  stopSimulation: () => set({ running: false }),
}));
