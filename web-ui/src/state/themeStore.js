import { create } from 'zustand';
import {
  getStoredTheme, saveTheme, listCustomThemes,
  saveCustomTheme as persistCustomTheme, deleteCustomTheme as removeCustomTheme,
} from '../theme/themeRepository';
import { BUILT_IN_THEME_IDS, DEFAULT_THEME_ID, THEME_VARS } from '../theme/themes';
import { buildCustomThemeVars } from '../theme/customTheme';
import { useAuthStore } from './authStore';

let unsubscribeAuth = null;

function clearInlineThemeVars() {
  THEME_VARS.forEach((v) => document.documentElement.style.removeProperty(v));
}

// Built-in themes are pinned CSS ([data-theme='sand'] etc, see global.css);
// a custom theme instead computes its full variable set and applies it as
// inline styles, which win over any stylesheet rule regardless of the
// [data-theme] attribute also present.
function applyTheme(themeId, customThemes) {
  const custom = customThemes.find((t) => t.id === themeId);
  if (custom) {
    document.documentElement.setAttribute('data-theme', 'custom');
    const vars = buildCustomThemeVars(custom.colors);
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
    return;
  }
  clearInlineThemeVars();
  document.documentElement.setAttribute('data-theme', BUILT_IN_THEME_IDS.includes(themeId) ? themeId : DEFAULT_THEME_ID);
}

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'theme';
}

function loadForUid(uid) {
  const customThemes = listCustomThemes(uid);
  const theme = getStoredTheme(uid);
  applyTheme(theme, customThemes);
  return { theme, customThemes };
}

export const useThemeStore = create((set, get) => ({
  theme: DEFAULT_THEME_ID,
  customThemes: [],

  // Wires up once (see App.jsx), same "mount once at the top" pattern
  // authStore.init() uses. Re-reads the saved theme and custom theme list
  // whenever the signed-in account changes, so each account keeps its own.
  init: () => {
    const uid = useAuthStore.getState().user?.uid ?? null;
    set(loadForUid(uid));

    if (unsubscribeAuth) return; // already wired (e.g. React StrictMode double-invoke)
    let prevUid = uid;
    unsubscribeAuth = useAuthStore.subscribe((state) => {
      const nextUid = state.user?.uid ?? null;
      if (nextUid === prevUid) return;
      prevUid = nextUid;
      set(loadForUid(nextUid));
    });
  },

  setTheme: (themeId) => {
    const uid = useAuthStore.getState().user?.uid ?? null;
    saveTheme(uid, themeId);
    applyTheme(themeId, get().customThemes);
    set({ theme: themeId });
  },

  // Creates a new custom theme, or updates one the user already owns when
  // `id` is passed, then switches to it immediately.
  saveCustomTheme: ({ id, label, colors }) => {
    const uid = useAuthStore.getState().user?.uid ?? null;
    const themeId = id || `custom-${slugify(label)}-${Date.now().toString(36)}`;
    const theme = { id: themeId, label, colors };
    persistCustomTheme(uid, theme);
    const customThemes = listCustomThemes(uid);
    saveTheme(uid, themeId);
    applyTheme(themeId, customThemes);
    set({ customThemes, theme: themeId });
    return theme;
  },

  deleteCustomTheme: (id) => {
    const uid = useAuthStore.getState().user?.uid ?? null;
    removeCustomTheme(uid, id);
    const customThemes = listCustomThemes(uid);
    set((s) => {
      if (s.theme !== id) return { customThemes };
      saveTheme(uid, DEFAULT_THEME_ID);
      applyTheme(DEFAULT_THEME_ID, customThemes);
      return { customThemes, theme: DEFAULT_THEME_ID };
    });
  },
}));
