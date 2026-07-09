import { create } from 'zustand';
import { STARTER_SKETCH } from 'shared/starterSketch.js';
import { API_BASE } from '../utils/apiBase';
import { getAuthHeaders } from '../utils/authFetch';

export const useArduinoStore = create((set, get) => ({
  sketch: STARTER_SKETCH,
  compileStatus: 'idle', // 'idle' | 'compiling' | 'success' | 'error'
  hex: null,
  compileOutput: { stdout: '', stderr: '' },
  toolchain: null,
  running: false,

  setSketch: (sketch) => set({ sketch }),

  setRunning: (running) => set({ running }),

  fetchToolchainStatus: async () => {
    const res = await fetch(`${API_BASE}/api/toolchain-status`);
    const toolchain = await res.json();
    set({ toolchain });
    return toolchain;
  },

  compile: async () => {
    const { sketch } = get();
    set({ compileStatus: 'compiling', running: false });
    try {
      const res = await fetch(`${API_BASE}/api/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ source: sketch }),
      });
      const result = await res.json();
      if (result.success) {
        set({
          compileStatus: 'success',
          hex: result.hex,
          compileOutput: { stdout: result.stdout ?? '', stderr: result.stderr ?? '' },
          toolchain: null,
        });
      } else {
        set({
          compileStatus: 'error',
          hex: null,
          compileOutput: {
            stdout: result.stdout ?? '',
            stderr: result.stderr || result.message || 'Compile failed.',
          },
          toolchain: result.error === 'toolchain-not-ready' ? result.toolchain : null,
        });
      }
    } catch (err) {
      set({
        compileStatus: 'error',
        hex: null,
        compileOutput: { stdout: '', stderr: `Could not reach the compile server: ${err.message}` },
      });
    }
  },
}));
