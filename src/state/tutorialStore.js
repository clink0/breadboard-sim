import { create } from 'zustand';
import { useCircuitStore } from './circuitStore';
import { useArduinoStore } from './arduinoStore';
import {
  listBuiltInTutorials, listUserTutorials, saveUserTutorial, deleteUserTutorial,
  exportTutorialToFile, importTutorialFromFile, listFavoriteIds, setFavorite,
} from '../tutorials/tutorialRepository';
import { createEmptyTutorial, createEmptyStep, slugify } from '../tutorials/schema';
import { validateTutorial } from '../tutorials/validateTutorial';

function holesEqual(a, b) {
  const keysA = Object.keys(a ?? {});
  const keysB = Object.keys(b ?? {});
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

function componentSatisfied(expected, placed) {
  return placed.some((p) => p.type === expected.type && holesEqual(p.holes, expected.holes));
}

function wireSatisfied(expected, placed) {
  return placed.some((w) => w.fromHole === expected.fromHole && w.toHole === expected.toHole);
}

function cumulativeSteps(tutorial, uptoIndex) {
  return tutorial.steps.slice(0, uptoIndex + 1);
}

function uniqueSlug(base, library) {
  const taken = new Set(library.map((t) => t.id));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export const useTutorialStore = create((set, get) => ({
  library: [],
  favoriteIds: new Set(),
  mode: 'browse', // 'browse' | 'play' | 'create'
  activeTutorial: null,
  stepIndex: 0,
  lastCheckResult: null, // { ok, message } | null
  draft: null,
  recordingBaseline: null, // { components, wires, sketch }
  importError: null,
  saveError: null,

  refreshLibrary: () => {
    set({ library: [...listBuiltInTutorials(), ...listUserTutorials()] });
  },

  refreshFavorites: () => set({ favoriteIds: new Set(listFavoriteIds()) }),

  toggleFavorite: (id) => {
    const isFavorite = get().favoriteIds.has(id);
    setFavorite(id, !isFavorite);
    get().refreshFavorites();
  },

  // Starting a tutorial (from anywhere - the Tutorials page or elsewhere)
  // always means "go look at the board": jump to the workspace page and the
  // Inspector's Tutorials tab so the player is immediately visible next to
  // the live circuit it's about to reset and drive.
  startTutorial: (id) => {
    const tutorial = get().library.find((t) => t.id === id);
    if (!tutorial) return;
    useCircuitStore.getState().reset();
    useCircuitStore.getState().setPage('workspace');
    useCircuitStore.getState().setInspectorTab('tutorials');
    set({ mode: 'play', activeTutorial: tutorial, stepIndex: 0, lastCheckResult: null });
  },

  exitTutorial: () => set({ mode: 'browse', activeTutorial: null, stepIndex: 0, lastCheckResult: null }),

  nextStep: () => set((s) => {
    if (!s.activeTutorial) return {};
    const max = s.activeTutorial.steps.length - 1;
    return { stepIndex: Math.min(s.stepIndex + 1, max), lastCheckResult: null };
  }),

  prevStep: () => set((s) => ({ stepIndex: Math.max(s.stepIndex - 1, 0), lastCheckResult: null })),

  placeStepForMe: () => {
    const { activeTutorial, stepIndex } = get();
    if (!activeTutorial) return;
    const step = activeTutorial.steps[stepIndex];
    useCircuitStore.getState().applyElements({ components: step.addComponents, wires: step.addWires });
    if (step.sketch !== null && step.sketch !== undefined) {
      useArduinoStore.getState().setSketch(step.sketch);
    }
  },

  checkStep: () => {
    const { activeTutorial, stepIndex } = get();
    if (!activeTutorial) return;
    const expectedSteps = cumulativeSteps(activeTutorial, stepIndex);
    const { components, wires } = useCircuitStore.getState();

    const missingComponents = [];
    const missingWires = [];
    for (const step of expectedSteps) {
      for (const c of step.addComponents) if (!componentSatisfied(c, components)) missingComponents.push(c);
      for (const w of step.addWires) if (!wireSatisfied(w, wires)) missingWires.push(w);
    }

    const ok = missingComponents.length === 0 && missingWires.length === 0;
    const message = ok
      ? 'Looks right so far!'
      : `Not quite yet — missing ${missingComponents.length} component(s) and ${missingWires.length} wire(s) from this tutorial so far.`;
    set({ lastCheckResult: { ok, message } });
    return ok;
  },

  importFromFile: async (file) => {
    set({ importError: null });
    try {
      const tutorial = await importTutorialFromFile(file);
      saveUserTutorial(tutorial);
      get().refreshLibrary();
    } catch (err) {
      set({ importError: err.message });
    }
  },

  exportTutorial: (id) => {
    const tutorial = get().library.find((t) => t.id === id);
    if (tutorial) exportTutorialToFile(tutorial);
  },

  deleteTutorial: (id) => {
    deleteUserTutorial(id);
    get().refreshLibrary();
  },

  startCreating: ({ title, description, difficulty, requiresArduino }) => {
    const { components, wires } = useCircuitStore.getState();
    const { sketch } = useArduinoStore.getState();
    const draft = {
      ...createEmptyTutorial(),
      id: uniqueSlug(slugify(title), get().library),
      title,
      description,
      difficulty,
      author: 'You',
      requiresArduino,
    };
    useCircuitStore.getState().setPage('workspace');
    useCircuitStore.getState().setInspectorTab('tutorials');
    set({
      mode: 'create',
      draft,
      recordingBaseline: { components, wires, sketch },
      saveError: null,
    });
  },

  captureStep: (instructions) => {
    const { draft, recordingBaseline } = get();
    if (!draft || !recordingBaseline) return;
    const { components, wires } = useCircuitStore.getState();
    const { sketch } = useArduinoStore.getState();

    const baselineComponentIds = new Set(recordingBaseline.components.map((c) => c.id));
    const baselineWireIds = new Set(recordingBaseline.wires.map((w) => w.id));
    const addComponents = components
      .filter((c) => !baselineComponentIds.has(c.id))
      .map(({ type, value, holes }) => ({ type, value, holes }));
    const addWires = wires
      .filter((w) => !baselineWireIds.has(w.id))
      .map(({ fromHole, toHole }) => ({ fromHole, toHole }));
    const sketchChanged = sketch !== recordingBaseline.sketch;

    const step = {
      ...createEmptyStep(),
      instructions,
      addComponents,
      addWires,
      sketch: sketchChanged ? sketch : null,
    };

    set({
      draft: { ...draft, steps: [...draft.steps, step] },
      recordingBaseline: { components, wires, sketch },
    });
  },

  removeDraftStep: (index) => set((s) => {
    if (!s.draft) return {};
    return { draft: { ...s.draft, steps: s.draft.steps.filter((_, i) => i !== index) } };
  }),

  finishAndSaveDraft: () => {
    const { draft } = get();
    if (!draft) return { success: false, errors: ['No draft in progress.'] };
    const { valid, errors } = validateTutorial(draft);
    if (!valid) {
      set({ saveError: errors.join('; ') });
      return { success: false, errors };
    }
    saveUserTutorial(draft);
    get().refreshLibrary();
    set({ mode: 'browse', draft: null, recordingBaseline: null, saveError: null });
    return { success: true, errors: [] };
  },

  cancelCreating: () => set({ mode: 'browse', draft: null, recordingBaseline: null, saveError: null }),
}));
