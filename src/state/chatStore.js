import { create } from 'zustand';
import { useCircuitStore } from './circuitStore';
import { useArduinoStore } from './arduinoStore';
import { buildCircuitContext } from '../utils/circuitContext';

export const useChatStore = create((set, get) => ({
  messages: [], // { role: 'user' | 'assistant', content: string }
  sending: false,
  error: null,

  resetChat: () => set({ messages: [], sending: false, error: null }),

  sendMessage: async (text) => {
    const content = text.trim();
    if (!content) return;

    const userMessage = { role: 'user', content };
    const messages = [...get().messages, userMessage];
    set({ messages, sending: true, error: null });

    const circuitState = useCircuitStore.getState();
    const arduinoState = useArduinoStore.getState();
    const circuitContext = buildCircuitContext({
      components: circuitState.components,
      wires: circuitState.wires,
      running: circuitState.running,
      liveSource: circuitState.liveSource,
      simResult: circuitState.simResult,
      scopeResult: circuitState.scopeResult,
      view: circuitState.view,
      arduino: arduinoState,
    });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, circuitContext }),
      });
      const result = await res.json();

      if (!result.success) {
        set({ sending: false, error: result.message || 'The AI tutor hit an unexpected error.' });
        return;
      }

      set({ messages: [...messages, { role: 'assistant', content: result.reply }], sending: false });
    } catch (err) {
      set({ sending: false, error: `Could not reach the AI tutor: ${err.message}` });
    }
  },
}));
