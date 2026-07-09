import { describe, it, expect } from 'vitest';
import { MnaBuilder, solveLinearSystem } from '../mna';
import { pinNortonStamp, digitalReadFromVoltage, VCC, PIN_RTH_OHMS } from './arduinoPin';

// Directly exercises the already-verified MnaBuilder primitives
// (stampConductance/injectCurrent - the same pair capacitorCompanion's
// proven-correct companion model uses) to empirically confirm
// pinNortonStamp's sign convention, rather than trusting the derivation
// in arduinoPin.js's comment alone.
function solveSingleNode(stamp, loadOhms) {
  const builder = new MnaBuilder(['pin'], 'gnd', 0);
  builder.stampConductance('pin', 'gnd', stamp.geq);
  builder.injectCurrent('pin', stamp.ieq);
  if (loadOhms !== undefined) builder.stampConductance('pin', 'gnd', 1 / loadOhms);
  const { A, b } = builder.getSystem();
  const [vPin] = solveLinearSystem(A, b);
  return vPin;
}

describe('pinNortonStamp', () => {
  it('open-circuit HIGH settles at VCC', () => {
    expect(solveSingleNode(pinNortonStamp('high'))).toBeCloseTo(VCC, 5);
  });

  it('open-circuit LOW settles at 0V', () => {
    expect(solveSingleNode(pinNortonStamp('low'))).toBeCloseTo(0, 5);
  });

  it('a HIGH pin loaded by a resistor is pulled down from the open-circuit 5V', () => {
    const vOpen = solveSingleNode(pinNortonStamp('high'));
    const vLoaded = solveSingleNode(pinNortonStamp('high'), 220);
    expect(vLoaded).toBeLessThan(vOpen);
    expect(vLoaded).toBeCloseTo((5 * 220) / (220 + PIN_RTH_OHMS), 3);
  });

  it('pullup alone reads back HIGH', () => {
    const v = solveSingleNode(pinNortonStamp('pullup'));
    expect(digitalReadFromVoltage(v, false)).toBe(true);
  });

  it('pullup loaded by a low-value resistor to ground reads back LOW (button pressed)', () => {
    const v = solveSingleNode(pinNortonStamp('pullup'), 200); // button to GND
    expect(digitalReadFromVoltage(v, true)).toBe(false);
  });
});
