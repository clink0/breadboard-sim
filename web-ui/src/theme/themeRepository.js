import { DEFAULT_THEME_ID } from './themes';

const ACTIVE_THEME_PREFIX = 'bbsim:theme:';
const CUSTOM_THEMES_PREFIX = 'bbsim:customThemes:';
const ANONYMOUS_SUFFIX = 'local';

// Same local-now/hosted-later shape as tutorialRepository.js: this is the
// only place that knows the color scheme (built-in selection + any
// user-created themes) currently lives in localStorage, keyed per
// signed-in user (falling back to a shared local key when signed out).
// Swapping in a real per-account backend later means changing the bodies
// of these functions, not any of their callers.
function activeKeyFor(uid) {
  return `${ACTIVE_THEME_PREFIX}${uid || ANONYMOUS_SUFFIX}`;
}

function customThemesKeyFor(uid) {
  return `${CUSTOM_THEMES_PREFIX}${uid || ANONYMOUS_SUFFIX}`;
}

export function getStoredTheme(uid) {
  try {
    return localStorage.getItem(activeKeyFor(uid)) || DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function saveTheme(uid, themeId) {
  localStorage.setItem(activeKeyFor(uid), themeId);
}

export function listCustomThemes(uid) {
  try {
    const raw = localStorage.getItem(customThemesKeyFor(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCustomThemes(uid, themes) {
  localStorage.setItem(customThemesKeyFor(uid), JSON.stringify(themes));
}

export function saveCustomTheme(uid, theme) {
  const existing = listCustomThemes(uid);
  const idx = existing.findIndex((t) => t.id === theme.id);
  const next = idx >= 0 ? existing.map((t, i) => (i === idx ? theme : t)) : [...existing, theme];
  writeCustomThemes(uid, next);
  return theme;
}

export function deleteCustomTheme(uid, id) {
  writeCustomThemes(uid, listCustomThemes(uid).filter((t) => t.id !== id));
}
