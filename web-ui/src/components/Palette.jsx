import React from 'react';
import { useCircuitStore } from '../state/circuitStore';
import { TERMINALS } from 'shared/deviceTerminals.js';

const SECTIONS = [
  {
    title: 'Conductor',
    tools: [{ id: 'wire', label: 'Wire', hint: 'Ideal connection' }],
  },
  {
    title: 'Passive',
    tools: [
      { id: 'resistor',  label: 'Resistor',   hint: '220 Ω default' },
      { id: 'capacitor', label: 'Capacitor',   hint: '100 µF, DC open-circuit' },
      { id: 'inductor',  label: 'Inductor',    hint: '100 mH, DC short-circuit' },
    ],
  },
  {
    title: 'Source',
    tools: [{ id: 'battery', label: 'Battery', hint: '5 V, + at first click' }],
  },
  {
    title: 'Output',
    tools: [{ id: 'led', label: 'LED', hint: 'Lights with forward current' }],
  },
  {
    title: 'Actuators',
    tools: [
      { id: 'motor', label: 'DC Motor', hint: '15 Ω winding resistance' },
      { id: 'servo', label: 'Servo',    hint: '~5 V, 1 kΩ load' },
    ],
  },
  {
    title: 'Transistors',
    tools: [
      { id: 'bjt_npn',  label: 'NPN BJT',       hint: 'Collector, base, emitter' },
      { id: 'bjt_pnp',  label: 'PNP BJT',       hint: 'Collector, base, emitter' },
      { id: 'mosfet_n', label: 'N-Ch MOSFET',   hint: 'Drain, gate, source' },
      { id: 'mosfet_p', label: 'P-Ch MOSFET',   hint: 'Drain, gate, source' },
    ],
  },
  {
    title: 'Signal & Scope',
    tools: [
      { id: 'function_gen', label: 'Function Gen', hint: 'Sine, 1 kHz, 0-5 V default' },
      { id: 'probe',        label: 'Scope Probe',   hint: 'Zero-current voltmeter, dashed lead' },
    ],
  },
];

// Terminal names for a plain 2-lead part (resistor, wire, capacitor, ...) are
// just 'a'/'b' - not meaningful to show a user. Named roles (anode/cathode,
// collector/base/emitter, ...) are worth surfacing since they disambiguate
// placement order.
function terminalLabel(name, index) {
  if (name === 'a' || name === 'b') return index === 0 ? 'first lead' : 'second lead';
  return name;
}

export default function Palette() {
  const tool = useCircuitStore((s) => s.tool);
  const setTool = useCircuitStore((s) => s.setTool);
  const pendingHoles = useCircuitStore((s) => s.pendingHoles);

  const terminalNames = TERMINALS[tool];
  const nextTerminal = terminalLabel(terminalNames[pendingHoles.length], pendingHoles.length);

  return (
    <aside className="palette">
      <h2 className="panel-title">Place</h2>
      {SECTIONS.map((sec) => (
        <div key={sec.title}>
          <h3 className="panel-subtitle">{sec.title}</h3>
          <div className="tool-list">
            {sec.tools.map((t) => (
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
        </div>
      ))}
      <p className="palette-status">
        {pendingHoles.length > 0
          ? `${pendingHoles.length} of ${terminalNames.length} leads placed — click a hole for the ${nextTerminal}.`
          : `Click a hole for the ${terminalLabel(terminalNames[0], 0)}.`}
      </p>
    </aside>
  );
}
