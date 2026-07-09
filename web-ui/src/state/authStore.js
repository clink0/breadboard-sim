import { create } from 'zustand';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

let unsubscribe = null;

export const useAuthStore = create((set) => ({
  user: null, // Firebase User | null
  initializing: true, // true until the first onAuthStateChanged callback fires
  error: null,

  // Wires the auth-state listener once. Called from App.jsx via useEffect,
  // same "mount once at the top" pattern useAvrLiveRun already uses.
  init: () => {
    if (unsubscribe) return; // already wired (e.g. React StrictMode double-invoke)
    unsubscribe = onAuthStateChanged(auth, (user) => set({ user, initializing: false }));
  },

  signInWithGoogle: async () => {
    set({ error: null });
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      set({ error: err.message });
    }
  },

  signInWithEmail: async (email, password) => {
    set({ error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      set({ error: err.message });
    }
  },

  signUpWithEmail: async (email, password) => {
    set({ error: null });
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      set({ error: err.message });
    }
  },

  signOutUser: () => signOut(auth),
}));
