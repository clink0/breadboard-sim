import { HOLE_PITCH } from './layout';

// Two real Arduino Uno-style header rows (split into clusters with a gap,
// matching the board's actual look), rather than a plain 4-row grid: the
// digital pins run along the top edge, power+analog along the bottom edge.
// Kept in ascending order within each cluster (rather than mirroring the
// real silkscreen's exact left-right order) since that's easier to scan for
// a pin by name.
const TOP_ROW = [
  ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'],
  ['D8', 'D9', 'D10', 'D11', 'D12', 'D13'],
];
const BOTTOM_ROW = [
  ['GND', '5V'],
  ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'],
];

export const ARDUINO_PIN_NAMES = [...TOP_ROW.flat(), ...BOTTOM_ROW.flat()];

const CLUSTER_GAP = HOLE_PITCH * 1.6;
const ROW_SPACING = 132; // vertical distance between the top and bottom header rows

function layoutRow(clusters, offsetX, y) {
  const holes = [];
  let x = offsetX;
  for (const cluster of clusters) {
    for (const name of cluster) {
      holes.push({ id: `arduino-${name}`, row: 'arduino', col: name, x, y });
      x += HOLE_PITCH;
    }
    x += CLUSTER_GAP;
  }
  return holes;
}

// A hole id is `arduino-${pinName}`. One hole per pin - including one shared
// 5V and one shared GND hole, not one per real header pin - nothing stops
// multiple wires terminating on the same hole id, exactly like a breadboard
// strip already works.
export function generateArduinoHoles(offsetX, offsetY) {
  return [
    ...layoutRow(TOP_ROW, offsetX, offsetY),
    ...layoutRow(BOTTOM_ROW, offsetX, offsetY + ROW_SPACING),
  ];
}

export function arduinoBoardDimensions() {
  const holes = generateArduinoHoles(0, 0);
  const maxX = Math.max(...holes.map((h) => h.x));
  const maxY = Math.max(...holes.map((h) => h.y));
  return { width: maxX, height: maxY };
}
