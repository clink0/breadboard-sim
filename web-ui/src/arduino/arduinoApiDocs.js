// Hand-authored Arduino API reference powering Monaco's completion + hover
// providers (see CodeEditor.jsx). Functions marked "not yet wired to
// hardware" compile and run correctly (avr8js executes the real compiled
// instructions either way) but don't yet affect anything outside the CPU -
// analogRead/analogWrite/Serial wiring are deferred to a later sub-phase.
export const ARDUINO_FUNCTIONS = [
  {
    name: 'pinMode',
    signature: 'void pinMode(uint8_t pin, uint8_t mode)',
    doc: 'Configures a digital pin to behave as INPUT, OUTPUT, or INPUT_PULLUP.',
  },
  {
    name: 'digitalWrite',
    signature: 'void digitalWrite(uint8_t pin, uint8_t value)',
    doc: 'Writes HIGH or LOW to a digital pin configured as OUTPUT.',
  },
  {
    name: 'digitalRead',
    signature: 'int digitalRead(uint8_t pin)',
    doc: 'Reads HIGH or LOW from a digital pin configured as INPUT.',
  },
  {
    name: 'analogWrite',
    signature: 'void analogWrite(uint8_t pin, int value)',
    doc: 'Writes a PWM duty cycle (0-255) to a PWM-capable pin. Not yet wired to hardware in this build.',
  },
  {
    name: 'analogRead',
    signature: 'int analogRead(uint8_t pin)',
    doc: 'Reads a 0-1023 value from an analog (A0-A5) pin. Not yet wired to hardware in this build.',
  },
  {
    name: 'delay',
    signature: 'void delay(unsigned long ms)',
    doc: 'Pauses the sketch for the given number of milliseconds.',
  },
  {
    name: 'delayMicroseconds',
    signature: 'void delayMicroseconds(unsigned int us)',
    doc: 'Pauses the sketch for the given number of microseconds.',
  },
  {
    name: 'millis',
    signature: 'unsigned long millis()',
    doc: 'Returns the number of milliseconds since the sketch started running.',
  },
  {
    name: 'micros',
    signature: 'unsigned long micros()',
    doc: 'Returns the number of microseconds since the sketch started running.',
  },
  {
    name: 'setup',
    signature: 'void setup()',
    doc: 'Called once when the sketch starts. Use it to configure pin modes and initial state.',
  },
  {
    name: 'loop',
    signature: 'void loop()',
    doc: 'Called repeatedly for as long as the sketch runs.',
  },
];

export const ARDUINO_CONSTANTS = [
  { name: 'HIGH', doc: 'Digital high logic level (~5V).' },
  { name: 'LOW', doc: 'Digital low logic level (0V).' },
  { name: 'INPUT', doc: 'Configures a pin to read a digital voltage.' },
  { name: 'OUTPUT', doc: 'Configures a pin to drive a digital voltage.' },
  { name: 'INPUT_PULLUP', doc: 'Configures a pin as input with its internal pull-up resistor enabled.' },
  { name: 'LED_BUILTIN', doc: "The Arduino Uno's built-in LED pin (13)." },
];
