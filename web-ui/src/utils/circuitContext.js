import { formatOhms, formatFarads, formatHenry, formatFrequency, formatCurrent } from './formatUnits';
import { DEVICE_TYPES } from '../sim/devices';

const TRANSISTOR_TYPES = ['bjt_npn', 'bjt_pnp', 'mosfet_n', 'mosfet_p'];

function componentValueSuffix(c) {
  switch (c.type) {
    case 'resistor':  return ` (${formatOhms(c.value)})`;
    case 'battery':   return ` (${c.value}V)`;
    case 'capacitor': return ` (${formatFarads(c.value)})`;
    case 'inductor':  return ` (${formatHenry(c.value)})`;
    case 'motor':     return ` (${formatOhms(c.value)} winding)`;
    case 'servo':     return ` (${formatOhms(c.value)} load)`;
    case 'function_gen':
      return ` (${c.value.waveform}, ${formatFrequency(c.value.freqHz)}, ±${c.value.amplitudeV}V @ ${c.value.offsetV}V)`;
    default:
      if (TRANSISTOR_TYPES.includes(c.type)) {
        return ` (${DEVICE_TYPES[c.type]?.presets?.[c.value]?.label ?? c.value})`;
      }
      return '';
  }
}

// Builds a plain-text description of the current circuit state to hand to
// the AI tutor as context alongside its system prompt - kept in the same
// netlist-line shape already shown in Inspector's netlist list so the
// tutor is talking about exactly what the student sees on screen.
export function buildCircuitContext({
  components = [],
  wires = [],
  running = false,
  liveSource = null,
  simResult = null,
  scopeResult = null,
  view = 'breadboard',
  arduino = null,
} = {}) {
  const lines = [];
  lines.push(`Active tab: ${view === 'arduino' ? 'Arduino IDE' : 'Breadboard'}`);

  lines.push('');
  lines.push('Netlist:');
  if (wires.length === 0 && components.length === 0) {
    lines.push('  (nothing placed on the breadboard yet)');
  } else {
    for (const w of wires) lines.push(`  wire  ${w.fromHole} - ${w.toHole}`);
    for (const c of components) {
      lines.push(`  ${c.type}  ${Object.values(c.holes).join(' - ')}${componentValueSuffix(c)}`);
    }
  }

  if (running && simResult) {
    const sourceLabel = liveSource === 'arduino' ? 'driven live by the running Arduino sketch' : 'DC operating point';
    const convergenceNote = simResult.converged === false ? ' - DID NOT CONVERGE, readings may be inaccurate' : '';
    lines.push('');
    lines.push(`Simulation: running (${sourceLabel})${convergenceNote}`);
    for (const c of components) {
      const current = simResult.currents?.get(c.id);
      if (current !== undefined) {
        lines.push(`  ${c.type} (${Object.values(c.holes).join(' - ')}): ${formatCurrent(current)}`);
      }
    }
  } else {
    lines.push('');
    lines.push('Simulation: not running - the student has not pressed Simulate yet.');
  }

  const hasCapture = scopeResult?.probeVoltages?.size > 0 && (scopeResult.time?.length ?? 0) > 1;
  if (hasCapture) {
    const span = scopeResult.time[scopeResult.time.length - 1] - scopeResult.time[0];
    const convergenceNote = scopeResult.converged === false ? ' (transient solve did not converge)' : '';
    lines.push('');
    lines.push(`Oscilloscope: captured ${scopeResult.probeVoltages.size} probe channel(s) over ${(span * 1000).toFixed(2)}ms${convergenceNote}`);
  }

  if (view === 'arduino' && arduino) {
    const src = arduino.sketch ?? '';
    const truncated = src.length > 4000 ? `${src.slice(0, 4000)}\n... (truncated)` : src;
    lines.push('');
    lines.push(`Arduino sketch (compile status: ${arduino.compileStatus}, ${arduino.running ? 'currently running' : 'not running'}):`);
    lines.push(truncated);
  }

  return lines.join('\n');
}
