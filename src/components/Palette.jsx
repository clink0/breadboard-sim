import React from 'react';
import { useCircuitStore } from '../state/circuitStore';

const TOOLS = [
  { id: 'wire', label: 'Wire', hint: 'Ideal connection' },
  { id: 'resistor', label: 'Resistor', hint: '220Ω default' },
  { id: 'led', label: 'LED', hint: 'Lights when forward current flows' },
  { id: 'battery', label: 'Battery', hint: '5V default, + at first click' },
];

export default function Palette() {
  const tool = useCircuitStore((s) => s.tool);
  const setTool = useCircuitStore((s) => s.setTool);
  const pendingHole = useCircuitStore((s) => s.pendingHole);

  return (
    <aside className="palette">
      <h2 className="panel-title">Place</h2>
      <div className="tool-list">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tool-button ${tool === t.id ? 'is-active' : ''}`}
            onClick={() => setTool(t.id)}
          >
            <span className="tool-label">{t.label}</span>
            <span className="tool-hint">{t.hint}</span>
          </button>
        ))}
      </div>
      <p className="palette-status">
        {pendingHole ? `First lead set on ${pendingHole} - click a second hole to complete it.` : 'Click a hole to start a connection.'}
      </p>
    </aside>
  );
}
