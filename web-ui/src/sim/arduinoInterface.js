import { ARDUINO_PINS, pinModeFromState } from '../arduino/pinMapping';
import { pinNortonStamp, digitalReadFromVoltage, VCC } from './devices/arduinoPin';

// Builds the transient-solver elements representing the Arduino board's own
// power pin and every digital pin's current drive state - called fresh
// every simulation step since pinMode()/digitalWrite() calls can change
// what's true frame to frame. Not used by the DC "Simulate" button or the
// Oscilloscope's "Capture" (they never call this), so anything wired to an
// Arduino pin is simply floating (GMIN only) from their point of view -
// physically correct for an unpowered board.
export function arduinoPinElements(runtime, resolve) {
  const gnd = resolve('arduino-GND');
  const elements = [
    { kind: 'V', id: 'arduino-5V', nodeA: resolve('arduino-5V'), nodeB: gnd, valueAt: () => VCC },
  ];
  for (const pin of ARDUINO_PINS) {
    const mode = pinModeFromState(runtime[pin.port].pinState(pin.bit));
    const stamp = pinNortonStamp(mode);
    if (stamp) {
      elements.push({
        kind: 'norton',
        id: `pin-${pin.name}`,
        nodeA: resolve(`arduino-${pin.name}`),
        nodeB: gnd,
        ...stamp,
      });
    }
  }
  return elements;
}

// After a step, feeds the solved circuit voltage back into every pin
// currently in an INPUT mode (digitalRead() sees this). `lastHighMap`
// (a plain Map, persisted by the caller across steps) drives the
// Schmitt-trigger hysteresis in digitalReadFromVoltage.
export function readbackArduinoPins(runtime, voltages, resolve, lastHighMap) {
  const vGnd = voltages.get(resolve('arduino-GND')) ?? 0;
  for (const pin of ARDUINO_PINS) {
    const mode = pinModeFromState(runtime[pin.port].pinState(pin.bit));
    if (mode === 'low' || mode === 'high') continue; // OUTPUT: nothing to read back
    const v = (voltages.get(resolve(`arduino-${pin.name}`)) ?? 0) - vGnd;
    const isHigh = digitalReadFromVoltage(v, lastHighMap.get(pin.name) ?? false);
    lastHighMap.set(pin.name, isHigh);
    runtime[pin.port].setPin(pin.bit, isHigh);
  }
}
