import { create } from 'zustand';
import { getStoredTheme, saveTheme } from '../theme/themeRepository';
import { DEFAULT_THEME_ID } from '../theme/themes';
import { useAuthStore } from './authStore';

let unsubscribeAuth = null;

function applyThemeAttr(themeId) {
  document.documentElement.setAttribute('data-theme', themeId);
}

export const useThemeStore = create((set) => ({
  theme: DEFAULT_THEME_ID,

  // Wires up once (see App.jsx), same "mount once at the top" pattern
  // authStore.init() uses. Re-reads the saved theme whenever the signed-in
  // account changes, so each account keeps its own preference.
  init: () => {
    const uid = useAuthStore.getState().user?.uid ?? null;
    const theme = getStoredTheme(uid);
    applyThemeAttr(theme);
    set({ theme });

    if (unsubscribeAuth) return; // already wired (e.g. React StrictMode double-invoke)
    let prevUid = uid;
    unsubscribeAuth = useAuthStore.subscribe((state) => {
      const nextUid = state.user?.uid ?? null;
      if (nextUid === prevUid) return;
      prevUid = nextUid;
      const nextTheme = getStoredTheme(nextUid);
      applyThemeAttr(nextTheme);
      set({ theme: nextTheme });
    });
  },

  setTheme: (themeId) => {
    const uid = useAuthStore.getState().user?.uid ?? null;
    saveTheme(uid, themeId);
    applyThemeAttr(themeId);
    set({ theme: themeId });
  },
}));
