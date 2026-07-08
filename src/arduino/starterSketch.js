// Default sketch shown in a fresh Arduino IDE view. Blinks the built-in LED
// on D13 - the same pin avr8js's own reference demo uses, which is also
// what src/arduino/avrRuntime.test.js's fixture hex was compiled from.
export const STARTER_SKETCH = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
`;
