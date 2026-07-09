import React from 'react';
import { useCircuitStore } from '../state/circuitStore';
import { HOLE_PITCH } from '../breadboard/layout';

const TOP_CLUSTER_SIZES = [8, 6]; // D0-D7 | D8-D13
const BOTTOM_CLUSTER_SIZES = [2, 6]; // GND,5V | A0-A5
const CLUSTER_GAP = HOLE_PITCH * 1.6;
const ROW_SPACING = 132;

// Computes the [x1,x2] pixel span (in the same offset-relative coordinate
// space as generateArduinoHoles) covered by each pin cluster, so the header
// connector strips can be drawn behind the right holes without duplicating
// arduinoLayout.js's own column-walking logic.
function clusterSpans(clusterSizes) {
  const spans = [];
  let x = 0;
  for (const size of clusterSizes) {
    const start = x;
    x += size * HOLE_PITCH;
    spans.push([start - HOLE_PITCH / 2, x - HOLE_PITCH / 2]);
    x += CLUSTER_GAP;
  }
  return spans;
}

// A fixed fixture (not a placeable component) representing the Arduino Uno's
// pin header, always present in the Breadboard view so its pins can be
// wired to like any other hole. Renders as a <g>, not its own <svg>, so its
// holes share one coordinate space with the breadboard - required for
// ComponentLayer's single-<line> wire rendering to draw a wire between the
// two without any cross-SVG coordinate math.
export default function ArduinoBoard({ holes, offsetX, offsetY, width, height }) {
  const pendingHoles = useCircuitStore((s) => s.pendingHoles);
  const clickHole = useCircuitStore((s) => s.clickHole);

  const pad = 18;
  const boardX = offsetX - pad;
  const boardY = offsetY - pad;
  const boardW = width + pad * 2;
  const boardH = height + pad * 2;
  const chipW = 60;
  const chipH = 46;
  const chipX = offsetX + width / 2 - chipW / 2;
  const chipY = offsetY + ROW_SPACING / 2 - chipH / 2;

  return (
    <g>
      <rect x={boardX} y={boardY} width={boardW} height={boardH} rx={8} className="arduino-board-body" />

      {/* mounting holes, like a real board's 4 corner screw holes */}
      {[
        [boardX + 12, boardY + 12],
        [boardX + boardW - 12, boardY + 12],
        [boardX + 12, boardY + boardH - 12],
        [boardX + boardW - 12, boardY + boardH - 12],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.5} className="arduino-mount-hole" />
      ))}

      {/* USB connector, protruding from the left edge */}
      <rect
        x={boardX - 14}
        y={offsetY + ROW_SPACING / 2 - 12}
        width={16}
        height={24}
        rx={2}
        className="arduino-usb-connector"
      />

      {/* header connector strips (the black plastic sockets), one per pin cluster */}
      {clusterSpans(TOP_CLUSTER_SIZES).map(([x1, x2]) => (
        <rect
          key={`top-${x1}`}
          x={offsetX + x1}
          y={offsetY - 6}
          width={x2 - x1}
          height={12}
          rx={2}
          className="arduino-header-strip"
        />
      ))}
      {clusterSpans(BOTTOM_CLUSTER_SIZES).map(([x1, x2]) => (
        <rect
          key={`bottom-${x1}`}
          x={offsetX + x1}
          y={offsetY + ROW_SPACING - 6}
          width={x2 - x1}
          height={12}
          rx={2}
          className="arduino-header-strip"
        />
      ))}

      {/* the microcontroller chip */}
      <rect x={chipX} y={chipY} width={chipW} height={chipH} rx={2} className="arduino-chip" />
      <text x={chipX + chipW / 2} y={chipY + chipH / 2} className="arduino-chip-label" textAnchor="middle" dominantBaseline="middle">
        ATMEGA328P
      </text>

      <text x={offsetX + width / 2} y={offsetY + ROW_SPACING / 2 + chipH / 2 + 14} className="arduino-board-label" textAnchor="middle">
        ARDUINO UNO
      </text>

      {holes.map((h) => (
        <g key={h.id}>
          <text
            x={h.x}
            y={h.y < offsetY + ROW_SPACING / 2 ? h.y - 9 : h.y + 15}
            className="arduino-pin-label"
            textAnchor="middle"
          >
            {h.col}
          </text>
          <circle
            cx={h.x}
            cy={h.y}
            r={3}
            className={`hole hole-arduino ${pendingHoles.includes(h.id) ? 'hole-pending' : ''}`}
            onClick={() => clickHole(h.id)}
          />
        </g>
      ))}
    </g>
  );
}
