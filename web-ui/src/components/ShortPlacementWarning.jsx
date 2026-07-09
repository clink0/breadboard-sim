import React from 'react';
import { useCircuitStore } from '../state/circuitStore';
import { useChatStore } from '../state/chatStore';

function buildHelpPrompt({ type, holes, problems }) {
  const holeList = Object.entries(holes).map(([name, hole]) => `${name}: ${hole}`).join(', ');
  return `I tried to manually place a ${type} at holes {${holeList}} but that would short it: ${problems.join(' ')} Can you place a ${type} correctly for me, ideally near those same holes? Use the modify_circuit tool.`;
}

// Mirrors the AI tutor's own self-short guardrail (see chatStore.js /
// detectShorts.js) but for manual clicks: circuitStore.clickHole withholds
// a component placement that would short its own leads and records
// `shortWarning` instead of adding it. This modal surfaces that, and offers
// a one-click handoff to the AI tutor to place it correctly.
export default function ShortPlacementWarning() {
  const shortWarning = useCircuitStore((s) => s.shortWarning);
  const dismissShortWarning = useCircuitStore((s) => s.dismissShortWarning);
  const setInspectorTab = useCircuitStore((s) => s.setInspectorTab);
  const sendMessage = useChatStore((s) => s.sendMessage);

  if (!shortWarning) return null;

  const askAi = () => {
    sendMessage(buildHelpPrompt(shortWarning));
    setInspectorTab('tutor');
    dismissShortWarning();
  };

  return (
    <div className="modal-backdrop" onClick={dismissShortWarning}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">That placement would short the {shortWarning.type}</h3>
        <ul className="modal-problem-list">
          {shortWarning.problems.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
        <p className="modal-body">Nothing was placed. Want the AI tutor to help place it correctly?</p>
        <div className="modal-actions">
          <button className="reset-button" onClick={dismissShortWarning}>No, I&rsquo;ll try again</button>
          <button className="run-button" onClick={askAi}>Yes, ask AI</button>
        </div>
      </div>
    </div>
  );
}
