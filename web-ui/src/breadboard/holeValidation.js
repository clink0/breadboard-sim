import { ROWS, COLS } from './layout';
import { ARDUINO_PIN_NAMES } from './arduinoLayout';

// Checks a hole id is a real, addressable hole on the board - either a
// breadboard `${row}-${col}` id or an `arduino-${PIN}` id - without needing
// to actually generate the hole list. Used to validate hole ids arriving
// from untrusted-ish sources (an imported tutorial file, an AI tool call)
// before they're ever applied to circuitStore.
export function isValidHoleId(id) {
  if (typeof id !== 'string') return false;

  if (id.startsWith('arduino-')) {
    return ARDUINO_PIN_NAMES.includes(id.slice('arduino-'.length));
  }

  const idx = id.lastIndexOf('-');
  if (idx < 0) return false;
  const row = id.slice(0, idx);
  const col = Number(id.slice(idx + 1));
  return ROWS.includes(row) && Number.isInteger(col) && col >= 1 && col <= COLS;
}
