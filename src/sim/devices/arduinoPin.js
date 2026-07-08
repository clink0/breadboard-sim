// Digital pin electrical model for an Arduino Uno (ATmega328P) pin, used by
// src/sim/arduinoInterface.js. Pure math, no avr8js import - mirrors the
// diode.js/bjt.js style so it's independently testable.
export const PIN_RTH_OHMS = 25;      // ATmega328P output-driver ballpark
export const PULLUP_OHMS = 35_000;   // ATmega328P internal pull-up ballpark
export const VCC = 5;
export const VIH = 0.6 * VCC;        // simplified fixed thresholds, not temp/Vcc-compensated
export const VIL = 0.3 * VCC;

// mode: 'low' | 'high' | 'pullup' | 'input'. Returns the Norton-equivalent
// {geq, ieq} for a Thevenin(Vth, Rth) source between the pin and ground:
// stampConductance(pin, gnd, geq) + injectCurrent(pin, ieq) gives
// geq*v_pin = ieq => v_pin = ieq/geq = Vth when nothing else loads the node
// (verified against arduinoPin.test.js, not trusted from this comment alone).
// Returns null for pure high-Z input - no stamp beyond the solver's
// universal GMIN, same reasoning as a floating MOSFET gate.
export function pinNortonStamp(mode) {
  if (mode === 'low') return { geq: 1 / PIN_RTH_OHMS, ieq: 0 };
  if (mode === 'high') return { geq: 1 / PIN_RTH_OHMS, ieq: VCC / PIN_RTH_OHMS };
  if (mode === 'pullup') return { geq: 1 / PULLUP_OHMS, ieq: VCC / PULLUP_OHMS };
  return null;
}

// Schmitt-trigger-style hysteresis: needs both thresholds so a solved
// voltage sitting near the midpoint doesn't chatter read-to-read.
export function digitalReadFromVoltage(voltage, wasHigh) {
  return wasHigh ? voltage >= VIL : voltage > VIH;
}
