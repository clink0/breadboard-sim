import React, { useMemo } from 'react';
import { generateHoles, boardDimensions, HOLE_PITCH } from '../breadboard/layout';
import { useCircuitStore } from '../state/circuitStore';
import ComponentLayer from './ComponentLayer';

const RAIL_ROWS = new Set(['railTopPlus', 'railTopMinus', 'railBotPlus', 'railBotMinus']);

export default function Breadboard() {
  const holes = useMemo(() => generateHoles(), []);
  const { width, height } = useMemo(() => boardDimensions(), []);
  const pendingHole = useCircuitStore((s) => s.pendingHole);
  const clickHole = useCircuitStore((s) => s.clickHole);

  const pad = 24;

  return (
    <svg
      viewBox={`0 0 ${width + pad * 2} ${height + pad * 2}`}
      className="breadboard-svg"
      role="img"
      aria-label="Virtual breadboard"
    >
      <g transform={`translate(${pad}, ${pad})`}>
        <rect x={-10} y={-10} width={width + 20} height={height + 20} rx={10} className="board-body" />

        {/* rail stripes for visual read-ability, like the red/blue lines on a real board */}
        {holes
          .filter((h) => h.row === 'railTopPlus' || h.row === 'railBotPlus')
          .map((h) => (
            <line key={`stripe-plus-${h.row}`} x1={h.x - HOLE_PITCH / 2} x2={holes.filter((x) => x.row === h.row).slice(-1)[0].x + HOLE_PITCH / 2} y1={h.y - 6} y2={h.y - 6} className="rail-stripe rail-stripe-plus" />
          ))}
        {holes
          .filter((h) => h.row === 'railTopMinus' || h.row === 'railBotMinus')
          .map((h) => (
            <line key={`stripe-minus-${h.row}`} x1={h.x - HOLE_PITCH / 2} x2={holes.filter((x) => x.row === h.row).slice(-1)[0].x + HOLE_PITCH / 2} y1={h.y + 6} y2={h.y + 6} className="rail-stripe rail-stripe-minus" />
          ))}

        <ComponentLayer holes={holes} />

        {holes.map((h) => (
          <circle
            key={h.id}
            cx={h.x}
            cy={h.y}
            r={h.row.startsWith('rail') ? 2.6 : 3}
            className={`hole ${RAIL_ROWS.has(h.row) ? 'hole-rail' : 'hole-strip'} ${pendingHole === h.id ? 'hole-pending' : ''}`}
            onClick={() => clickHole(h.id)}
          />
        ))}
      </g>
    </svg>
  );
}
