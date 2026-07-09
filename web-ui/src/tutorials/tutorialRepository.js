import { validateTutorial } from './validateTutorial';

const USER_TUTORIALS_KEY = 'bbsim:userTutorials:v1';
const FAVORITE_IDS_KEY = 'bbsim:favoriteTutorialIds:v1';

// Bundled default tutorials, shipped with the app. Eager-loaded so the
// library is available synchronously (no loading state needed for the
// common case of just browsing the built-in set).
const builtInModules = import.meta.glob('./library/*.json', { eager: true });
const BUILT_IN_TUTORIALS = Object.values(builtInModules).map((mod) => mod.default ?? mod);

// This module is the only place that knows tutorials currently live in
// bundled JSON + localStorage. Swapping in a real backend later (once there
// are accounts to own "community" tutorials) means changing the bodies of
// these functions, not any of their callers.
export function listBuiltInTutorials() {
  return BUILT_IN_TUTORIALS;
}

export function listUserTutorials() {
  try {
    const raw = localStorage.getItem(USER_TUTORIALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeUserTutorials(tutorials) {
  localStorage.setItem(USER_TUTORIALS_KEY, JSON.stringify(tutorials));
}

export function saveUserTutorial(tutorial) {
  const { valid, errors } = validateTutorial(tutorial);
  if (!valid) throw new Error(`Invalid tutorial: ${errors.join('; ')}`);

  const existing = listUserTutorials();
  const idx = existing.findIndex((t) => t.id === tutorial.id);
  const next = idx >= 0
    ? existing.map((t, i) => (i === idx ? tutorial : t))
    : [...existing, tutorial];
  writeUserTutorials(next);
  return tutorial;
}

export function deleteUserTutorial(id) {
  writeUserTutorials(listUserTutorials().filter((t) => t.id !== id));
}

export function listFavoriteIds() {
  try {
    const raw = localStorage.getItem(FAVORITE_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setFavorite(id, isFavorite) {
  const current = new Set(listFavoriteIds());
  if (isFavorite) current.add(id); else current.delete(id);
  localStorage.setItem(FAVORITE_IDS_KEY, JSON.stringify([...current]));
}

export function exportTutorialToFile(tutorial) {
  const blob = new Blob([JSON.stringify(tutorial, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tutorial.id || 'tutorial'}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importTutorialFromFile(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const { valid, errors } = validateTutorial(parsed);
  if (!valid) throw new Error(`Invalid tutorial file:\n${errors.join('\n')}`);
  return parsed;
}
