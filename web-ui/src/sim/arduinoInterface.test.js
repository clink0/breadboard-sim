import { describe, it, expect } from 'vitest';
import { PinState } from 'avr8js';
import { arduinoPinElements, readbackArduinoPins } from './arduinoInterface';
import { createTransientStepper } from './transientStepper';
import { DIODE_PRESETS } from './devices';

// A minimal stand-in for the real avr8js AVRIOPort objects createAvrRuntime
// produces - only pinState()/setPin() are used by arduinoInterface.js.
// Every port defaults every bit to plain Input unless overridden, since
// arduinoPinElements() queries all 20 pins across all 3 ports regardless of
// which ones a given test cares about.
function makeMockRuntime(states) {
  const ports = {};
  for (const portName of ['portB', 'portC', 'portD']) {
    const bits = states[portName] ?? {};
    ports[portName] = {
      setPins: {},
      pinState: (bit) => bits[bit] ?? PinState.Input,
      setPin(bit, value) {
        this.setPins[bit] = value;
      },
    };
  }
  return ports;
}

const identityResolve = (id) => id;

describe('arduinoInterface - end to end through the real transient stepper', () => {
  it('D13 driven HIGH lights an LED wired to GND through a resistor', () => {
    const runtime = makeMockRuntime({ portB: { 5: PinState.High } }); // D13 = portB bit 5
    const stepper = createTransientStepper();

    let voltages;
    for (let i = 0; i <= 5; i++) {
      const elements = [
        ...arduinoPinElements(runtime, identityResolve),
        { kind: 'R', id: 'r1', nodeA: 'arduino-D13', nodeB: 'anode', value: 220 },
        { kind: 'diode', id: 'led1', terminals: { anode: 'anode', cathode: 'arduino-GND' }, params: DIODE_PRESETS.LED_RED },
      ];
      ({ voltages } = stepper.step(elements, 'arduino-GND', 1e-3, i * 1e-3));
    }

    const current = (voltages.get('arduino-D13') - voltages.get('anode')) / 220;
    expect(current * 1000).toBeGreaterThan(5); // plausible forward current, mA
    expect(current * 1000).toBeLessThan(20);
  });

  it('readbackArduinoPins reads a pulled-up floating pin as HIGH', () => {
    const runtime = makeMockRuntime({ portC: { 0: PinState.InputPullUp } }); // A0
    const stepper = createTransientStepper();
    const elements = arduinoPinElements(runtime, identityResolve);
    const { voltages } = stepper.step(elements, 'arduino-GND', 1e-3, 0);

    readbackArduinoPins(runtime, voltages, identityResolve, new Map());
    expect(runtime.portC.setPins[0]).toBe(true);
  });

  it('readbackArduinoPins reads a pulled-up pin shorted to GND (button pressed) as LOW', () => {
    const runtime = makeMockRuntime({ portC: { 0: PinState.InputPullUp } });
    const stepper = createTransientStepper();
    const elements = [
      ...arduinoPinElements(runtime, identityResolve),
      { kind: 'R', id: 'button', nodeA: 'arduino-A0', nodeB: 'arduino-GND', value: 200 },
    ];
    const { voltages } = stepper.step(elements, 'arduino-GND', 1e-3, 0);

    readbackArduinoPins(runtime, voltages, identityResolve, new Map());
    expect(runtime.portC.setPins[0]).toBe(false);
  });
});
