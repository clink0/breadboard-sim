import React from 'react';
import { useCircuitStore } from '../state/circuitStore';
import { voltageToColor } from '../utils/colorScale';

function holePos(holes, id) {
  return holes.find((h) => h.id === id);
}

// Turns a current (amps, signed) into an <animateMotion> duration + direction.
// Bigger |current| -> faster dots. Sign flips the path traversal direction.
function currentToAnim(current) {
  if (!current || Math.abs(current) < 1e-6) return null;
  const speed = Math.min(4, Math.max(0.4, Math.abs(current) * 40)); // px-ish scaling, tuned for demo values
  const duration = `${(1.4 / speed).toFixed(2)}s`;
  const keyPoints = current >= 0 ? '0;1' : '1;0';
  return { duration, keyPoints };
}

function ResistorGlyph({ x1, y1, x2, y2, color }) {
  // Simple zigzag along the line between the two leads.
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bodyLen = Math.min(len * 0.5, 26);
  const ux = dx / len;
  const uy = dy / len;
  const startX = midX - (ux * bodyLen) / 2;
  const startY = midY - (uy * bodyLen) / 2;
  const zigzags = 5;
  let d = `M ${startX} ${startY}`;
  for (let i = 1; i <= zigzags; i++) {
    const t = i / (zigzags + 1);
    const px = startX + ux * bodyLen * t + nx * (i % 2 === 0 ? -6 : 6);
    const py = startY + uy * bodyLen * t + ny * (i % 2 === 0 ? -6 : 6);
    d += ` L ${px} ${py}`;
  }
  d += ` L ${startX + ux * bodyLen} ${startY + uy * bodyLen}`;
  return <path d={d} className="component-glyph" style={{ stroke: color }} />;
}

function LedGlyph({ x1, y1, x2, y2, color, lit }) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <circle cx={midX} cy={midY} r={8} className={`led-body ${lit ? 'led-lit' : ''}`} style={{ stroke: color }} />
      {lit && <circle cx={midX} cy={midY} r={12} className="led-glow" />}
    </g>
  );
}

function BatteryGlyph({ x1, y1, x2, y2, color }) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return (
    <g style={{ stroke: color }}>
      <line x1={midX - nx * 9} y1={midY - ny * 9} x2={midX + nx * 9} y2={midY + ny * 9} className="component-glyph battery-long" />
      <line x1={midX - nx * 5 + dx * 0.06} y1={midY - ny * 5 + dy * 0.06} x2={midX + nx * 5 + dx * 0.06} y2={midY + ny * 5 + dy * 0.06} className="component-glyph battery-short" />
    </g>
  );
}

export default function ComponentLayer({ holes }) {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const running = useCircuitStore((s) => s.running);
  const simResult = useCircuitStore((s) => s.simResult);
  const selectedId = useCircuitStore((s) => s.selectedId);
  const selectElement = useCircuitStore((s) => s.selectElement);

  const voltageAt = (holeId) => {
    if (!running) return null;
    const node = simResult.nodeFor(holeId);
    return simResult.voltages.get(node);
  };

  return (
    <g>
      {wires.map((w) => {
        const a = holePos(holes, w.fromHole);
        const b = holePos(holes, w.toHole);
        if (!a || !b) return null;
        const vA = voltageAt(w.fromHole);
        const color = running && vA !== null ? voltageToColor(vA) : 'var(--wire-idle)';
        return (
          <g key={w.id} onClick={() => selectElement(w.id)}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`wire-line ${selectedId === w.id ? 'is-selected' : ''}`} style={{ stroke: color }} />
          </g>
        );
      })}

      {components.map((c) => {
        const a = holePos(holes, c.fromHole);
        const b = holePos(holes, c.toHole);
        if (!a || !b) return null;
        const current = running ? simResult.currents.get(c.id) : 0;
        const vA = voltageAt(c.fromHole);
        const vB = voltageAt(c.toHole);
        const avgV = vA !== null && vB !== null ? (vA + vB) / 2 : null;
        const color = running && avgV !== null ? voltageToColor(avgV) : 'var(--wire-idle)';
        const anim = currentToAnim(current);
        const lit = c.type === 'led' && current > 0.005;

        return (
          <g key={c.id} onClick={() => selectElement(c.id)} className={selectedId === c.id ? 'is-selected' : ''}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="lead-line" style={{ stroke: color }} />
            {c.type === 'resistor' && <ResistorGlyph x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={color} />}
            {c.type === 'led' && <LedGlyph x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={color} lit={lit} />}
            {c.type === 'battery' && <BatteryGlyph x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={color} />}

            {anim && (
              <circle r={2.6} className="current-dot">
                <animateMotion
                  dur={anim.duration}
                  repeatCount="indefinite"
                  keyPoints={anim.keyPoints}
                  keyTimes="0;1"
                  path={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
                />
              </circle>
            )}
          </g>
        );
      })}
    </g>
  );
}
