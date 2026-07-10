import React, { useMemo, useRef } from 'react';
import { generateHoles, boardDimensions, HOLE_PITCH } from '../breadboard/layout';
import { generateArduinoHoles, arduinoBoardDimensions } from '../breadboard/arduinoLayout';
import { useCircuitStore } from '../state/circuitStore';
import { useElementDrag } from '../breadboard/useElementDrag';
import ComponentLayer from './ComponentLayer';
import ArduinoBoard from './ArduinoBoard';

const RAIL_ROWS = new Set(['railTopPlus', 'railTopMinus', 'railBotPlus', 'railBotMinus']);
const BOARD_GAP = 75;

export default function Breadboard() {
  const breadboardHoles = useMemo(() => generateHoles(), []);
  const { width: bbWidth, height: bbHeight } = useMemo(() => boardDimensions(), []);
  const { width: arduinoWidth, height: arduinoHeight } = useMemo(() => arduinoBoardDimensions(), []);
  const arduinoOffsetX = bbWidth + BOARD_GAP;
  const arduinoOffsetY = (bbHeight - arduinoHeight) / 2;
  const arduinoHoles = useMemo(
    () => generateArduinoHoles(arduinoOffsetX, arduinoOffsetY),
    [arduinoOffsetX, arduinoOffsetY],
  );
  const holes = useMemo(() => [...breadboardHoles, ...arduinoHoles], [breadboardHoles, arduinoHoles]);

  const width = arduinoOffsetX + arduinoWidth;
  const height = bbHeight;

  const pendingHoles = useCircuitStore((s) => s.pendingHoles);
  const clickHole = useCircuitStore((s) => s.clickHole);

  const groupRef = useRef(null);
  const { ghost, onComponentMouseDown, onWireMouseDown } = useElementDrag({ holes, groupRef });

  const pad = 24;

  return (
    <svg
      viewBox={`0 0 ${width + pad * 2} ${height + pad * 2}`}
      width={width + pad * 2}
      height={height + pad * 2}
      className="breadboard-svg"
      role="img"
      aria-label="Virtual breadboard"
    >
      <g ref={groupRef} transform={`translate(${pad}, ${pad})`}>
        <rect x={-10} y={-10} width={bbWidth + 20} height={bbHeight + 20} rx={10} className="board-body" />

        {/* rail stripes for visual read-ability, like the red/blue lines on a real board */}
        {breadboardHoles
          .filter((h) => h.row === 'railTopPlus' || h.row === 'railBotPlus')
          .map((h) => (
            <line key={`stripe-plus-${h.row}`} x1={h.x - HOLE_PITCH / 2} x2={breadboardHoles.filter((x) => x.row === h.row).slice(-1)[0].x + HOLE_PITCH / 2} y1={h.y - 6} y2={h.y - 6} className="rail-stripe rail-stripe-plus" />
          ))}
        {breadboardHoles
          .filter((h) => h.row === 'railTopMinus' || h.row === 'railBotMinus')
          .map((h) => (
            <line key={`stripe-minus-${h.row}`} x1={h.x - HOLE_PITCH / 2} x2={breadboardHoles.filter((x) => x.row === h.row).slice(-1)[0].x + HOLE_PITCH / 2} y1={h.y + 6} y2={h.y + 6} className="rail-stripe rail-stripe-minus" />
          ))}

        <ComponentLayer holes={holes} ghost={ghost} onComponentMouseDown={onComponentMouseDown} onWireMouseDown={onWireMouseDown} />

        {breadboardHoles.map((h) => (
          <circle
            key={h.id}
            cx={h.x}
            cy={h.y}
            r={h.row.startsWith('rail') ? 2.6 : 3}
            className={`hole ${RAIL_ROWS.has(h.row) ? 'hole-rail' : 'hole-strip'} ${pendingHoles.includes(h.id) ? 'hole-pending' : ''}`}
            onClick={() => clickHole(h.id)}
          />
        ))}

        <ArduinoBoard
          holes={arduinoHoles}
          offsetX={arduinoOffsetX}
          offsetY={arduinoOffsetY}
          width={arduinoWidth}
          height={arduinoHeight}
        />
      </g>
    </svg>
  );
}
