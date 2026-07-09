import { PinState } from 'avr8js';

// Standard, non-uncertain Arduino Uno pin-to-port-bit mapping:
// D0-D7=PORTD bits 0-7, D8-D13=PORTB bits 0-5, A0-A5=PORTC bits 0-5.
export const ARDUINO_PINS = [
  { name: 'D0', port: 'portD', bit: 0 },
  { name: 'D1', port: 'portD', bit: 1 },
  { name: 'D2', port: 'portD', bit: 2 },
  { name: 'D3', port: 'portD', bit: 3 },
  { name: 'D4', port: 'portD', bit: 4 },
  { name: 'D5', port: 'portD', bit: 5 },
  { name: 'D6', port: 'portD', bit: 6 },
  { name: 'D7', port: 'portD', bit: 7 },
  { name: 'D8', port: 'portB', bit: 0 },
  { name: 'D9', port: 'portB', bit: 1 },
  { name: 'D10', port: 'portB', bit: 2 },
  { name: 'D11', port: 'portB', bit: 3 },
  { name: 'D12', port: 'portB', bit: 4 },
  { name: 'D13', port: 'portB', bit: 5 },
  { name: 'A0', port: 'portC', bit: 0 },
  { name: 'A1', port: 'portC', bit: 1 },
  { name: 'A2', port: 'portC', bit: 2 },
  { name: 'A3', port: 'portC', bit: 3 },
  { name: 'A4', port: 'portC', bit: 4 },
  { name: 'A5', port: 'portC', bit: 5 },
];

export function pinModeFromState(state) {
  switch (state) {
    case PinState.Low: return 'low';
    case PinState.High: return 'high';
    case PinState.InputPullUp: return 'pullup';
    default: return 'input';
  }
}
