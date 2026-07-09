// Models a standard "half+" breadboard: a top power rail (+/-), a bottom
// power rail (+/-), and two terminal-strip groups (A-E and F-J) split by a
// center gap. Each vertical strip of 5 holes in a terminal group is one
// electrical node. Each rail row is one electrical node that runs the full
// width of the board (real boards sometimes split rails at the middle -
// we simplify to one node per rail for the MVP).
//
// Coordinate system: columns are 1..COLS, rows are named strings below.
// Hole spacing is uniform (HOLE_PITCH) so this also drives the SVG layout.

export const COLS = 30; // number of columns - trimmed down from a full 60+ board for a readable demo
export const HOLE_PITCH = 18; // px between adjacent holes
export const ROW_GAP = 26; // extra px gap at the center split and rail breaks

// Row keys, top to bottom
export const ROWS = ['railTopPlus', 'railTopMinus', 'e', 'd', 'c', 'b', 'a', 'f', 'g', 'h', 'i', 'j', 'railBotPlus', 'railBotMinus'];

const TERMINAL_TOP = ['e', 'd', 'c', 'b', 'a'];
const TERMINAL_BOT = ['f', 'g', 'h', 'i', 'j'];

// A hole id is `${row}-${col}`. Returns the *base* node id that hole belongs
// to before any wires/components are placed (rails + per-column strips).
export function baseNodeForHole(row, col) {
  if (row === 'arduino') return `ARDUINO_${col}`; // each pin is already its own unique node
  if (row === 'railTopPlus' || row === 'railBotPlus') return 'RAIL_PLUS';
  if (row === 'railTopMinus' || row === 'railBotMinus') return 'RAIL_MINUS';
  if (TERMINAL_TOP.includes(row)) return `T${col}`; // top strip node for this column
  if (TERMINAL_BOT.includes(row)) return `B${col}`; // bottom strip node for this column
  throw new Error(`Unknown row ${row}`);
}

// Generates every hole with its pixel position, for rendering.
export function generateHoles() {
  const holes = [];
  let y = HOLE_PITCH;
  for (const row of ROWS) {
    if (row === 'e') y += ROW_GAP; // gap below top rails before terminal strips
    if (row === 'f') y += ROW_GAP; // center gap between the two terminal groups
    if (row === 'railBotPlus') y += ROW_GAP; // gap below terminal strips before bottom rails
    for (let col = 1; col <= COLS; col++) {
      holes.push({
        id: `${row}-${col}`,
        row,
        col,
        x: col * HOLE_PITCH,
        y,
        node: baseNodeForHole(row, col),
      });
    }
    y += HOLE_PITCH;
  }
  return holes;
}

export function boardDimensions() {
  const holes = generateHoles();
  const maxX = Math.max(...holes.map((h) => h.x)) + HOLE_PITCH;
  const maxY = Math.max(...holes.map((h) => h.y)) + HOLE_PITCH;
  return { width: maxX, height: maxY };
}
