import React from 'react';
import { useCircuitStore } from '../state/circuitStore';
import { channelColorForIndex } from '../utils/channelColors';

const WIDTH = 640;
const HEIGHT = 160;
const MARGIN = { top: 10, right: 12, bottom: 20, left: 44 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

function formatTime(seconds) {
  if (Math.abs(seconds) >= 1) return `${seconds.toFixed(2)}s`;
  if (Math.abs(seconds) >= 1e-3) return `${(seconds * 1e3).toFixed(2)}ms`;
  return `${(seconds * 1e6).toFixed(1)}µs`;
}

export default function Oscilloscope() {
  const components = useCircuitStore((s) => s.components);
  const scopeResult = useCircuitStore((s) => s.scopeResult);
  const runCapture = useCircuitStore((s) => s.runCapture);

  const probes = components.filter((c) => c.type === 'probe');
  const { time, probeVoltages, converged, firstDivergedStep } = scopeResult;

  const tMin = time[0];
  const tMax = time[time.length - 1] || 1;
  const tSpan = tMax - tMin || 1;

  let vMin = Infinity;
  let vMax = -Infinity;
  for (const probe of probes) {
    const arr = probeVoltages.get(probe.id);
    if (!arr) continue;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] < vMin) vMin = arr[i];
      if (arr[i] > vMax) vMax = arr[i];
    }
  }
  if (!isFinite(vMin) || !isFinite(vMax)) {
    vMin = 0;
    vMax = 5;
  } else if (vMin === vMax) {
    vMin -= 0.5;
    vMax += 0.5;
  } else {
    const pad = (vMax - vMin) * 0.15;
    vMin -= pad;
    vMax += pad;
  }
  const vSpan = vMax - vMin;

  const x = (t) => MARGIN.left + ((t - tMin) / tSpan) * PLOT_W;
  const y = (v) => MARGIN.top + PLOT_H - ((v - vMin) / vSpan) * PLOT_H;

  const gridRows = 4;
  const gridCols = 6;

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
          <button className="run-button" onClick={runCapture}>Capture</button>
        </div>
      </div>

      {probes.length === 0 ? (
        <p className="empty-hint">Place a scope probe to capture a trace here.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="oscilloscope-svg" role="img" aria-label="Oscilloscope trace">
            {Array.from({ length: gridRows + 1 }, (_, i) => {
              const gy = MARGIN.top + (i * PLOT_H) / gridRows;
              const v = vMax - (i * vSpan) / gridRows;
              return (
                <g key={`row-${i}`}>
                  <line x1={MARGIN.left} y1={gy} x2={MARGIN.left + PLOT_W} y2={gy} className="scope-grid-line" />
                  <text x={MARGIN.left - 6} y={gy} className="scope-axis-label" textAnchor="end" dominantBaseline="middle">
                    {v.toFixed(2)}V
                  </text>
                </g>
              );
            })}
            {Array.from({ length: gridCols + 1 }, (_, i) => {
              const gx = MARGIN.left + (i * PLOT_W) / gridCols;
              const t = tMin + (i * tSpan) / gridCols;
              return (
                <g key={`col-${i}`}>
                  <line x1={gx} y1={MARGIN.top} x2={gx} y2={MARGIN.top + PLOT_H} className="scope-grid-line" />
                  <text x={gx} y={HEIGHT - 4} className="scope-axis-label" textAnchor="middle">
                    {formatTime(t)}
                  </text>
                </g>
              );
            })}

            {probes.map((probe, i) => {
              const arr = probeVoltages.get(probe.id);
              if (!arr) return null;
              const points = Array.from(arr, (v, idx) => `${x(time[idx]).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
              return (
                <polyline key={probe.id} points={points} className="scope-trace" style={{ stroke: channelColorForIndex(i) }} />
              );
            })}
          </svg>
          <div className="oscilloscope-legend">
            {probes.map((probe, i) => (
              <span key={probe.id} className="scope-legend-item">
                <span className="channel-swatch" style={{ background: channelColorForIndex(i) }} />
                ch {i + 1}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
