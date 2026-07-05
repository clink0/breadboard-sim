import React from 'react';
import { useCircuitStore } from '../state/circuitStore';

const RESISTOR_PRESETS = [100, 220, 330, 1000, 4700, 10000];
const BATTERY_PRESETS = [1.5, 3.3, 5, 9];

function formatOhms(v) {
  if (v >= 1000) return `${v / 1000}kΩ`;
  return `${v}Ω`;
}

export default function Inspector() {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const selectedId = useCircuitStore((s) => s.selectedId);
  const updateComponentValue = useCircuitStore((s) => s.updateComponentValue);
  const removeElement = useCircuitStore((s) => s.removeElement);
  const running = useCircuitStore((s) => s.running);
  const simResult = useCircuitStore((s) => s.simResult);

  const selected = components.find((c) => c.id === selectedId);

  return (
    <aside className="inspector">
      <h2 className="panel-title">Inspector</h2>

      {selected ? (
        <div className="selected-panel">
          <div className="selected-type">{selected.type}</div>
          {selected.type === 'resistor' && (
            <div className="preset-row">
              {RESISTOR_PRESETS.map((v) => (
                <button key={v} className={`preset-chip ${selected.value === v ? 'is-active' : ''}`} onClick={() => updateComponentValue(selected.id, v)}>
                  {formatOhms(v)}
                </button>
              ))}
            </div>
          )}
          {selected.type === 'battery' && (
            <div className="preset-row">
              {BATTERY_PRESETS.map((v) => (
                <button key={v} className={`preset-chip ${selected.value === v ? 'is-active' : ''}`} onClick={() => updateComponentValue(selected.id, v)}>
                  {v}V
                </button>
              ))}
            </div>
          )}
          {running && (
            <div className="reading">
              current: {(simResult.currents.get(selected.id) * 1000).toFixed(2)} mA
            </div>
          )}
          <button className="remove-button" onClick={() => removeElement(selected.id)}>Remove</button>
        </div>
      ) : (
        <p className="empty-hint">Select a component on the board to edit its value.</p>
      )}

      <h3 className="panel-subtitle">Netlist</h3>
      <ul className="netlist-list">
        {wires.map((w) => (
          <li key={w.id}>wire &nbsp; {w.fromHole} &ndash; {w.toHole}</li>
        ))}
        {components.map((c) => (
          <li key={c.id} className={selectedId === c.id ? 'is-selected' : ''}>
            {c.type} &nbsp; {c.fromHole} &ndash; {c.toHole}
            {c.type === 'resistor' && ` (${formatOhms(c.value)})`}
            {c.type === 'battery' && ` (${c.value}V)`}
          </li>
        ))}
        {wires.length === 0 && components.length === 0 && <li className="empty-hint">Nothing placed yet.</li>}
      </ul>
    </aside>
  );
}
