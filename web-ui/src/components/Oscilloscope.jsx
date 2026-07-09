import React, { useState } from 'react';
import { useCircuitStore } from '../state/circuitStore';
import { componentValueSuffix } from '../utils/circuitContext';

const PANEL_W = 220;
const PANEL_H = 90;
const PAD = 6;

function formatTime(seconds) {
  if (Math.abs(seconds) >= 1) return `${seconds.toFixed(2)}s`;
  if (Math.abs(seconds) >= 1e-3) return `${(seconds * 1e3).toFixed(2)}ms`;
  return `${(seconds * 1e6).toFixed(1)}µs`;
}

// Maps a trace to its own [min,max] within the panel's plot height - each
// trace (voltage/current) is normalized independently so both stay legible
// regardless of unit/magnitude difference, matching Falstad's per-trace
// auto-scaling rather than sharing one axis.
function traceToPoints(time, arr, x) {
  if (!arr || arr.length === 0) return { points: '', max: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < min) min = arr[i];
    if (arr[i] > max) max = arr[i];
  }
  if (min === max) { min -= 0.5; max += 0.5; }
  const span = max - min;
  const y = (v) => PAD + (PANEL_H - 2 * PAD) - ((v - min) / span) * (PANEL_H - 2 * PAD);
  const points = Array.from(arr, (v, i) => `${x(time[i]).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return { points, max };
}

function ScopePanel({ item, time, voltages, currents, onRemove }) {
  const [showCurrent, setShowCurrent] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const vArr = voltages.get(item.id);
  const iArr = currents.get(item.id);
  const x = (t) => PAD + (t / (time[time.length - 1] || 1)) * (PANEL_W - 2 * PAD);

  const { points: vPoints, max: vMax } = traceToPoints(time, vArr, x);
  const { points: iPoints, max: iMax } = traceToPoints(time, iArr, x);

  return (
    <div className="scope-panel">
      <div className="scope-panel-header">
        <span className="scope-panel-max">
          Max={vArr ? vMax.toFixed(3) : '—'} V
          {showCurrent && iArr ? ` / ${(iMax * 1000).toFixed(3)} mA` : ''}
        </span>
        <div className="scope-panel-controls">
          <button className="scope-panel-icon-button" onClick={() => setShowSettings((v) => !v)} title="Settings" aria-label="Settings">⚙</button>
          <button className="scope-panel-icon-button" onClick={onRemove} title="Remove from scope" aria-label="Remove from scope">×</button>
        </div>
      </div>
      <div className="scope-panel-label">{item.type}{componentValueSuffix(item)}</div>

      {showSettings && (
        <label className="scope-panel-settings">
          <input type="checkbox" checked={showCurrent} onChange={(e) => setShowCurrent(e.target.checked)} />
          Show current trace
        </label>
      )}

      <svg viewBox={`0 0 ${PANEL_W} ${PANEL_H}`} className="scope-panel-svg" role="img" aria-label={`${item.type} trace`}>
        <line x1={0} y1={PANEL_H / 2} x2={PANEL_W} y2={PANEL_H / 2} className="scope-panel-zero-line" />
        {vPoints && <polyline points={vPoints} className="scope-panel-trace scope-panel-trace-voltage" />}
        {showCurrent && iPoints && <polyline points={iPoints} className="scope-panel-trace scope-panel-trace-current" />}
      </svg>
    </div>
  );
}

export default function Oscilloscope() {
  const components = useCircuitStore((s) => s.components);
  const scopedComponentIds = useCircuitStore((s) => s.scopedComponentIds);
  const scopeResult = useCircuitStore((s) => s.scopeResult);
  const runCapture = useCircuitStore((s) => s.runCapture);
  const toggleScope = useCircuitStore((s) => s.toggleScope);
  const removeElement = useCircuitStore((s) => s.removeElement);

  const { time, voltages, currents, converged, firstDivergedStep } = scopeResult;
  const scopedItems = components.filter((c) => c.type === 'probe' || scopedComponentIds.includes(c.id));

  const tSpan = time.length > 1 ? time[time.length - 1] - time[0] : 0;
  const dt = time.length > 1 ? time[1] - time[0] : 0;

  return (
    <div className="oscilloscope">
      <div className="oscilloscope-header">
        <h3 className="panel-subtitle" style={{ margin: 0 }}>Oscilloscope</h3>
        <div className="oscilloscope-actions">
          {!converged && (
            <span className="convergence-warning" title={`Transient solve did not converge (first at step ${firstDivergedStep}) - trace may be inaccurate.`}>
              ⚠ did not converge
            </span>
          )}
          {tSpan > 0 && (
            <span className="oscilloscope-readout">t = {formatTime(tSpan)} &middot; step = {formatTime(dt)}</span>
          )}
          <button className="run-button" onClick={runCapture}>Capture</button>
        </div>
      </div>

      {scopedItems.length === 0 ? (
        <p className="empty-hint">Place a scope probe, or select a component and hit "Add to Scope", to see a trace here.</p>
      ) : (
        <div className="scope-panel-grid">
          {scopedItems.map((item) => (
            <ScopePanel
              key={item.id}
              item={item}
              time={time}
              voltages={voltages}
              currents={currents}
              onRemove={() => (item.type === 'probe' ? removeElement(item.id) : toggleScope(item.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
