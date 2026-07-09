// Shape of a tutorial JSON object. See src/tutorials/validateTutorial.js for
// the runtime check and src/tutorials/tutorialRepository.js for where these
// objects are read from/written to - the storage backend can change (local
// files/localStorage today, a real API later) without this shape changing.
export const TUTORIAL_SCHEMA_VERSION = 1;

export function createEmptyStep() {
  return {
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    instructions: '',
    addComponents: [],
    addWires: [],
    sketch: null,
  };
}

export function createEmptyTutorial() {
  return {
    id: '',
    schemaVersion: TUTORIAL_SCHEMA_VERSION,
    title: '',
    description: '',
    difficulty: 'beginner',
    author: '',
    requiresArduino: false,
    featured: false, // curator-only flag (see src/tutorials/library/*.json) - user-created tutorials can't self-declare this
    steps: [],
  };
}

export function slugify(title) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `tutorial-${Date.now()}`;
}
