import React from 'react';
import { useCircuitStore } from '../state/circuitStore';
import { TERMINALS } from 'shared/deviceTerminals.js';
import InfoTooltip from './InfoTooltip';

const SECTIONS = [
  {
    title: 'Conductor',
    tools: [{
      id: 'wire', label: 'Wire', hint: 'Ideal connection',
      blurb: "An ideal, zero-resistance connection between two holes. Use it to bridge nodes that aren't already on the same row or rail - for example, tying a component's lead to the Arduino or to a power rail.",
    }],
  },
  {
    title: 'Passive',
    tools: [
      {
        id: 'resistor', label: 'Resistor', hint: '220 Ω default',
        blurb: "Limits current through whatever it's connected to. Almost every circuit with an LED needs one in series so the LED doesn't draw too much current and burn out.",
        tutorialId: 'led-blink-basic',
      },
      {
        id: 'capacitor', label: 'Capacitor', hint: '100 µF, DC open-circuit',
        blurb: 'Stores charge and blocks steady DC once fully charged (it behaves like an open circuit at DC). Used for filtering, timing, and smoothing voltage.',
      },
      {
        id: 'inductor', label: 'Inductor', hint: '100 mH, DC short-circuit',
        blurb: 'Stores energy in a magnetic field and resists sudden changes in current. At steady DC it settles into acting like a plain wire (a short circuit).',
      },
    ],
  },
  {
    title: 'Source',
    tools: [{
      id: 'battery', label: 'Battery', hint: '5 V, + at first click',
      blurb: 'A DC voltage source. Click its two leads in order - the first click is +, the second is −. This is what powers everything else in the circuit.',
      tutorialId: 'led-blink-basic',
    }],
  },
  {
    title: 'Output',
    tools: [{
      id: 'led', label: 'LED', hint: 'Lights with forward current',
      blurb: 'Lights up when current flows from its anode to its cathode, and blocks current the other way. Always pair it with a resistor so it draws a safe amount of current.',
      tutorialId: 'led-blink-basic',
    }],
  },
  {
    title: 'Actuators',
    tools: [
      {
        id: 'motor', label: 'DC Motor', hint: '15 Ω winding resistance',
        blurb: 'A simple DC motor, modeled as a coil with winding resistance. Usually needs more current than an Arduino pin can supply directly, so it is typically driven through a transistor.',
        tutorialId: 'transistor-switch',
      },
      {
        id: 'servo', label: 'Servo', hint: '~5 V, 1 kΩ load',
        blurb: 'A position-controlled actuator normally driven by a PWM signal, not raw voltage. Modeled here as a voltage-controlled load for circuit-level testing.',
      },
    ],
  },
  {
    title: 'Transistors',
    tools: [
      {
        id: 'bjt_npn', label: 'NPN BJT', hint: 'Collector, base, emitter',
        blurb: 'A small current into the base lets a much larger current flow from collector to emitter. Great for switching things (like a motor or LED) that need more current than an Arduino pin can supply directly.',
        tutorialId: 'transistor-switch',
      },
      {
        id: 'bjt_pnp', label: 'PNP BJT', hint: 'Collector, base, emitter',
        blurb: 'The mirror image of an NPN transistor - a small current pulled out of the base lets a larger current flow from emitter to collector, useful for high-side switching.',
      },
      {
        id: 'mosfet_n', label: 'N-Ch MOSFET', hint: 'Drain, gate, source',
        blurb: 'A voltage on the gate (not a continuous current, unlike a BJT) switches a larger current from drain to source. A common choice for efficiently switching higher-power loads.',
      },
      {
        id: 'mosfet_p', label: 'P-Ch MOSFET', hint: 'Drain, gate, source',
        blurb: 'Switches current from source to drain when the gate is pulled low relative to the source. Common for high-side switching.',
      },
    ],
  },
  {
    title: 'Signal & Scope',
    tools: [
      {
        id: 'function_gen', label: 'Function Gen', hint: 'Sine, 1 kHz, 0-5 V default',
        blurb: 'A signal source that outputs a repeating waveform (sine, square, etc.) instead of a fixed DC voltage - useful for testing how a circuit responds to a changing input.',
      },
      {
        id: 'probe', label: 'Scope Probe', hint: 'Zero-current voltmeter, dashed lead',
        blurb: "A zero-current voltmeter with a dashed lead - measures voltage without disturbing the circuit. Add it to a component to watch that node on the oscilloscope.",
      },
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
              <div key={t.id} className="tool-row">
                <button
                  className={`tool-button ${tool === t.id ? 'is-active' : ''}`}
                  onClick={() => setTool(t.id)}
                >
                  <span className="tool-label">{t.label}</span>
                  <span className="tool-hint">{t.hint}</span>
                </button>
                <InfoTooltip blurb={t.blurb} tutorialId={t.tutorialId} />
              </div>
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
