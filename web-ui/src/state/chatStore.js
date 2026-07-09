import { create } from 'zustand';
import { useCircuitStore } from './circuitStore';
import { useArduinoStore } from './arduinoStore';
import { buildCircuitContext } from '../utils/circuitContext';
import { validateCircuitPatch } from '../utils/validateCircuitPatch';
import { findShortedComponents } from '../utils/detectShorts';
import { API_BASE } from '../utils/apiBase';

// Only {role, content} is meaningful to the API - assistant messages also
// carry a local-only `applied` summary (see applyActions below) for the
// TutorChat badge, which must not be replayed back into the conversation.
function toApiMessages(messages) {
  return messages.map(({ role, content }) => ({ role, content }));
}

// Executes every valid modify_circuit action the model returned against the
// real stores (reusing circuitStore.applyElements, the same bulk-add path
// the tutorial engine's "Place for me" uses) and reports what actually
// landed, for the chat UI to show as a small badge. Invalid actions are
// skipped rather than surfaced in chat - the model's structured tool input
// arrives over the network, so it's validated here before ever touching
// app state (see src/utils/validateCircuitPatch.js).
//
// Beyond structural validity, a patch's components/wires are also checked
// for self-shorts (see src/utils/detectShorts.js) - a resistor/LED placed
// with both leads on the same node isn't a solver error, it's a silently
// wrong circuit, which is worse. A patch with a short is withheld entirely
// (nothing half-built) and reported in `problems`; the sketch half of the
// same action still applies independently, since code has no such failure
// mode.
function applyActions(actions) {
  let components = 0;
  let wires = 0;
  let sketch = false;
  const problems = [];

  for (const action of actions) {
    if (action.name !== 'modify_circuit') continue;
    const { valid, errors } = validateCircuitPatch(action.input);
    if (!valid) {
      console.warn('Ignoring invalid modify_circuit action from AI tutor:', errors);
      continue;
    }

    const { addComponents = [], addWires = [], arduinoSketch } = action.input;
    if (addComponents.length > 0 || addWires.length > 0) {
      const shortProblems = findShortedComponents(useCircuitStore.getState().wires, { addComponents, addWires });
      if (shortProblems.length > 0) {
        problems.push(...shortProblems);
      } else {
        useCircuitStore.getState().applyElements({ components: addComponents, wires: addWires });
        components += addComponents.length;
        wires += addWires.length;
      }
    }
    if (typeof arduinoSketch === 'string') {
      useArduinoStore.getState().setSketch(arduinoSketch);
      sketch = true;
    }
  }

  const applied = components === 0 && wires === 0 && !sketch ? null : { components, wires, sketch };
  return { applied, problems };
}

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
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: toApiMessages(messages), circuitContext }),
      });
      const result = await res.json();

      if (!result.success) {
        set({ sending: false, error: result.message || 'The AI tutor hit an unexpected error.' });
        return;
      }

      const { applied, problems } = applyActions(result.actions ?? []);
      // The model is instructed to always pair a tool call with explanatory
      // text, but that's a prompt-level nudge, not a guarantee - fall back
      // to something better than a blank bubble if it skips the text.
      const content = result.reply?.trim() || (applied ? "Done — check the board." : '(no response)');
      set({
        messages: [...messages, { role: 'assistant', content, applied, problems: problems.length > 0 ? problems : null }],
        sending: false,
      });
    } catch (err) {
      set({ sending: false, error: `Could not reach the AI tutor: ${err.message}` });
    }
  },
}));
