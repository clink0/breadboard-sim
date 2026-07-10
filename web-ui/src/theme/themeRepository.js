import { DEFAULT_THEME_ID, THEME_IDS } from './themes';

const STORAGE_PREFIX = 'bbsim:theme:';
const ANONYMOUS_KEY = `${STORAGE_PREFIX}local`;

// Same local-now/hosted-later shape as tutorialRepository.js: this is the
// only place that knows the color scheme currently lives in localStorage,
// keyed per signed-in user (falling back to a shared local key when signed
// out). Swapping in a real per-account backend later means changing the
// bodies of these two functions, not any of their callers.
function keyFor(uid) {
  return uid ? `${STORAGE_PREFIX}${uid}` : ANONYMOUS_KEY;
}

export function getStoredTheme(uid) {
  try {
    const raw = localStorage.getItem(keyFor(uid));
    return THEME_IDS.includes(raw) ? raw : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function saveTheme(uid, themeId) {
  localStorage.setItem(keyFor(uid), themeId);
}
