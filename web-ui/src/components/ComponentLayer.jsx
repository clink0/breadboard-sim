import React from 'react';
import { useCircuitStore } from '../state/circuitStore';
import { voltageToColor } from '../utils/colorScale';

const TYPE_IDLE_COLOR = {
  wire:      'var(--wire-idle)',
  resistor:  'var(--resistor-idle)',
  led:       'var(--led-idle)',
  battery:   'var(--battery-idle)',
  capacitor: 'var(--capacitor-idle)',
  inductor:  'var(--inductor-idle)',
  motor:     'var(--motor-idle)',
  servo:     'var(--servo-idle)',
  bjt_npn:   'var(--bjt-idle)',
  bjt_pnp:   'var(--bjt-idle)',
  mosfet_n:  'var(--mosfet-idle)',
  mosfet_p:  'var(--mosfet-idle)',
  function_gen: 'var(--function-gen-idle)',
  probe:        'var(--probe-idle)',
};

const TRANSISTOR_TERMINALS = {
  bjt_npn: ['collector', 'base', 'emitter'],
  bjt_pnp: ['collector', 'base', 'emitter'],
  mosfet_n: ['drain', 'gate', 'source'],
  mosfet_p: ['drain', 'gate', 'source'],
};

function holePos(holes, id) {
  return holes.find((h) => h.id === id);
}

function currentToAnim(current) {
  if (!current || Math.abs(current) < 1e-6) return null;
  const speed = Math.min(4, Math.max(0.4, Math.abs(current) * 40));
  const durationSeconds = 1.4 / speed;
  const keyPoints = current >= 0 ? '0;1' : '1;0';
  return { durationSeconds, duration: `${durationSeconds.toFixed(2)}s`, keyPoints };
}

const DOT_COUNT = 3;

// Falstad-style "flowing" look: several dots per energized path instead of
// one, each started partway through the same animation (negative `begin`
// starts a SMIL animation already in progress) so they read as an evenly
// spaced train rather than a single blip.
function CurrentDots({ anim, path }) {
  if (!anim) return null;
  return (
    <>
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <circle key={i} r={3.2} className="current-dot">
          <animateMotion
            dur={anim.duration}
            begin={`${(-(i / DOT_COUNT) * anim.durationSeconds).toFixed(2)}s`}
            repeatCount="indefinite"
            keyPoints={anim.keyPoints}
            keyTimes="0;1"
            path={path}
          />
        </circle>
      ))}
    </>
  );
}

function centroid(points) {
  const x = points.reduce((s, p) => s + p.x, 0) / points.length;
  const y = points.reduce((s, p) => s + p.y, 0) / points.length;
  return { x, y };
}

// A small triangular polarity marker placed partway along the segment from
// (x1,y1) to (x2,y2). `inward` flips whether it points back toward (x1,y1)
// (PNP/PMOS convention: conventional current flows into that lead) or away
// from it (NPN/NMOS: current flows out).
function polarityArrow(x1, y1, x2, y2, inward) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const t = 0.62;
  const cx = x1 + ux * len * t, cy = y1 + uy * len * t;
  const size = 5;
  const dir = inward ? -1 : 1;
  const tipX = cx + ux * size * dir, tipY = cy + uy * size * dir;
  const backX = cx - ux * size * 0.3 * dir, backY = cy - uy * size * 0.3 * dir;
  const leftX = backX + nx * size * 0.55, leftY = backY + ny * size * 0.55;
  const rightX = backX - nx * size * 0.55, rightY = backY - ny * size * 0.55;
  return `${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`;
}

function ResistorGlyph({ x1, y1, x2, y2, color }) {
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const bodyLen = Math.min(len * 0.5, 26);
  const ux = dx / len, uy = dy / len;
  const sx = midX - (ux * bodyLen) / 2;
  const sy = midY - (uy * bodyLen) / 2;
  const zigzags = 5;
  let d = `M ${sx} ${sy}`;
  for (let i = 1; i <= zigzags; i++) {
    const t = i / (zigzags + 1);
    const px = sx + ux * bodyLen * t + nx * (i % 2 === 0 ? -6 : 6);
    const py = sy + uy * bodyLen * t + ny * (i % 2 === 0 ? -6 : 6);
    d += ` L ${px} ${py}`;
  }
  d += ` L ${sx + ux * bodyLen} ${sy + uy * bodyLen}`;
  return <path d={d} className="component-glyph" style={{ stroke: color }} />;
}

function LedGlyph({ x1, y1, x2, y2, color, lit }) {
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  return (
    <g>
      <circle cx={midX} cy={midY} r={8} className={`led-body ${lit ? 'led-lit' : ''}`} style={{ stroke: color }} />
      {lit && <circle cx={midX} cy={midY} r={12} className="led-glow" />}
    </g>
  );
}

function BatteryGlyph({ x1, y1, x2, y2, color }) {
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  return (
    <g style={{ stroke: color }}>
      <line x1={midX - nx * 9}  y1={midY - ny * 9}  x2={midX + nx * 9}  y2={midY + ny * 9}  className="component-glyph battery-long" />
      <line x1={midX - nx * 5 + dx * 0.06} y1={midY - ny * 5 + dy * 0.06}
            x2={midX + nx * 5 + dx * 0.06} y2={midY + ny * 5 + dy * 0.06} className="component-glyph battery-short" />
    </g>
  );
}

function CapacitorGlyph({ x1, y1, x2, y2, color }) {
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const ux = dx / len, uy = dy / len;
  const gap = 5, plateLen = 13;
  return (
    <g className="component-glyph" style={{ stroke: color }}>
      <line
        x1={midX - ux * gap - nx * plateLen} y1={midY - uy * gap - ny * plateLen}
        x2={midX - ux * gap + nx * plateLen} y2={midY - uy * gap + ny * plateLen}
        strokeWidth={3}
      />
      <line
        x1={midX + ux * gap - nx * plateLen} y1={midY + uy * gap - ny * plateLen}
        x2={midX + ux * gap + nx * plateLen} y2={midY + uy * gap + ny * plateLen}
        strokeWidth={3}
      />
    </g>
  );
}

function InductorGlyph({ x1, y1, x2, y2, color }) {
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const ux = dx / len, uy = dy / len;
  const bodyLen = Math.min(len * 0.6, 32);
  const numLoops = 4;
  const loopW = bodyLen / numLoops;
  const sx = midX - (ux * bodyLen) / 2;
  const sy = midY - (uy * bodyLen) / 2;
  let d = `M ${sx.toFixed(2)} ${sy.toFixed(2)}`;
  for (let i = 0; i < numLoops; i++) {
    const ex = sx + ux * loopW * (i + 1);
    const ey = sy + uy * loopW * (i + 1);
    const cx = sx + ux * loopW * (i + 0.5) + nx * 8;
    const cy = sy + uy * loopW * (i + 0.5) + ny * 8;
    d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  }
  return <path d={d} className="component-glyph" style={{ stroke: color }} fill="none" />;
}

function MotorGlyph({ x1, y1, x2, y2, color, current }) {
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  const r = 11;
  const active = current && Math.abs(current) > 1e-5;
  const speed = active ? Math.min(4, Math.max(0.5, Math.abs(current) * 40)) : 0;
  const dur = active ? `${(2 / speed).toFixed(2)}s` : null;
  return (
    <g>
      <circle cx={midX} cy={midY} r={r} className="motor-body" strokeWidth={2} style={{ stroke: color }} />
      <text x={midX} y={midY} className="motor-label" style={{ fill: color }}>M</text>
      {active && (
        <line x1={midX} y1={midY} x2={midX} y2={midY - r + 2} strokeWidth={2.5} style={{ stroke: color }}>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${midX} ${midY}`}
            to={`360 ${midX} ${midY}`}
            dur={dur}
            repeatCount="indefinite"
          />
        </line>
      )}
    </g>
  );
}

function ServoGlyph({ x1, y1, x2, y2, color, current }) {
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  const w = 22, h = 16;
  const active = current && Math.abs(current) > 1e-5;
  // arm angle: idle=0°, active=−50° (swings left)
  const armRad = (active ? -50 : 0) * (Math.PI / 180);
  const armX = midX + Math.sin(armRad) * 9;
  const armY = midY - h / 2 - Math.cos(armRad) * 9;
  return (
    <g>
      <rect x={midX - w / 2} y={midY - h / 2} width={w} height={h} rx={3}
        className="servo-body" strokeWidth={2} style={{ stroke: color }} />
      <text x={midX} y={midY} className="servo-label" style={{ fill: color }}>SRV</text>
      <line x1={midX} y1={midY - h / 2} x2={armX} y2={armY}
        strokeWidth={2.5} strokeLinecap="round" style={{ stroke: color }} />
    </g>
  );
}

function FunctionGenGlyph({ x1, y1, x2, y2, color }) {
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  const r = 9;
  // A small sine squiggle inside the body circle, independent of lead angle.
  const d = `M ${midX - r * 0.6} ${midY} Q ${midX - r * 0.3} ${midY - r * 0.7} ${midX} ${midY} Q ${midX + r * 0.3} ${midY + r * 0.7} ${midX + r * 0.6} ${midY}`;
  return (
    <g>
      <circle cx={midX} cy={midY} r={r} className="function-gen-body" strokeWidth={2} style={{ stroke: color }} />
      <path d={d} className="function-gen-wave" style={{ stroke: color }} />
    </g>
  );
}

function ProbeGlyph({ x1, y1, x2, y2, color }) {
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  const w = 7, h = 9;
  const points = `${midX},${midY - h} ${midX + w},${midY} ${midX},${midY + h} ${midX - w},${midY}`;
  return <polygon points={points} className="probe-marker" style={{ stroke: color, fill: 'var(--panel)' }} />;
}

// Generic 3-lead symbol: straight leads converging on a centroid, with a
// polarity arrowhead on the "current-defining" lead (emitter/source). Holes
// are placed at arbitrary breadboard positions with no fixed footprint, so
// this reads as "a 3-lead part with a polarity marker" rather than an
// attempt at the textbook schematic symbol shape.
function ThreeLeadGlyph({ points, order, color, arrowLead, inward }) {
  const c = centroid(order.map((name) => points[name]));
  const arrowPoint = points[arrowLead];
  const arrowPoints = polarityArrow(c.x, c.y, arrowPoint.x, arrowPoint.y, inward);
  return (
    <g className="component-glyph" style={{ stroke: color }}>
      {order.map((name) => (
        <line key={name} x1={c.x} y1={c.y} x2={points[name].x} y2={points[name].y} className="lead-line" style={{ stroke: color }} />
      ))}
      <circle cx={c.x} cy={c.y} r={3.5} style={{ fill: color, stroke: 'none' }} />
      <polygon points={arrowPoints} style={{ fill: color, stroke: 'none' }} />
    </g>
  );
}

export default function ComponentLayer({ holes }) {
  const components = useCircuitStore((s) => s.components);
  const wires      = useCircuitStore((s) => s.wires);
  const running    = useCircuitStore((s) => s.running);
  const simResult  = useCircuitStore((s) => s.simResult);
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
        const energized = running && vA !== null && Math.abs(vA) > 0.05;
        return (
          <g key={w.id} onClick={() => selectElement(w.id)} className={energized ? 'is-energized' : ''}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              className={`wire-line ${selectedId === w.id ? 'is-selected' : ''}`}
              style={{ stroke: color }} />
          </g>
        );
      })}

      {components.map((c) => {
        const holeIds = Object.values(c.holes);
        const positions = holeIds.map((id) => holePos(holes, id));
        if (positions.some((p) => !p)) return null;

        const current = running ? (simResult.currents.get(c.id) ?? 0) : 0;
        const vs = holeIds.map((id) => voltageAt(id));
        const avgV = vs.every((v) => v !== null) ? vs.reduce((s, v) => s + v, 0) / vs.length : null;
        const idleColor = TYPE_IDLE_COLOR[c.type] ?? 'var(--wire-idle)';
        const color = running && avgV !== null ? voltageToColor(avgV) : idleColor;
        const anim = currentToAnim(current);
        const lit = c.type === 'led' && current > 0.005;

        const transistorTerminals = TRANSISTOR_TERMINALS[c.type];
        if (transistorTerminals) {
          const points = Object.fromEntries(transistorTerminals.map((name) => [name, holePos(holes, c.holes[name])]));
          const isBjt = c.type.startsWith('bjt_');
          const arrowLead = isBjt ? 'emitter' : 'source';
          const inward = c.type === 'bjt_pnp' || c.type === 'mosfet_p';
          // Dominant-current path used for the animated current dot: C->E for
          // a BJT, D->S for a MOSFET (the main channel/collector current).
          const [dotFrom, dotTo] = isBjt
            ? [points[transistorTerminals[0]], points.emitter]
            : [points[transistorTerminals[0]], points.source];

          return (
            <g key={c.id} onClick={() => selectElement(c.id)} className={`${selectedId === c.id ? 'is-selected' : ''} ${anim ? 'is-energized' : ''}`}>
              <ThreeLeadGlyph points={points} order={transistorTerminals} color={color} arrowLead={arrowLead} inward={inward} />
              <CurrentDots anim={anim} path={`M ${dotFrom.x} ${dotFrom.y} L ${dotTo.x} ${dotTo.y}`} />
            </g>
          );
        }

        const [a, b] = positions;

        return (
          <g key={c.id} onClick={() => selectElement(c.id)} className={`${selectedId === c.id ? 'is-selected' : ''} ${anim ? 'is-energized' : ''}`}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              className={`lead-line ${c.type === 'probe' ? 'is-probe-lead' : ''}`}
              style={{ stroke: color }} />

            {c.type === 'resistor'  && <ResistorGlyph  x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={color} />}
            {c.type === 'led'       && <LedGlyph        x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={color} lit={lit} />}
            {c.type === 'battery'   && <BatteryGlyph    x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={color} />}
            {c.type === 'capacitor' && <CapacitorGlyph  x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={color} />}
            {c.type === 'inductor'  && <InductorGlyph   x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={color} />}
            {c.type === 'motor'     && <MotorGlyph      x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={color} current={current} />}
            {c.type === 'servo'     && <ServoGlyph      x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={color} current={current} />}
            {c.type === 'function_gen' && <FunctionGenGlyph x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={color} />}
            {c.type === 'probe'     && <ProbeGlyph      x1={a.x} y1={a.y} x2={b.x} y2={b.y} color={color} />}

            <CurrentDots anim={anim} path={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} />
          </g>
        );
      })}
    </g>
  );
}
