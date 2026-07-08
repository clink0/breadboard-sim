import { parseIntelHex } from './intelHexParser';
import {
  CPU,
  AVRIOPort,
  portBConfig,
  portCConfig,
  portDConfig,
  AVRTimer,
  timer0Config,
  timer1Config,
  timer2Config,
  avrInstruction,
} from 'avr8js';

const FLASH_WORDS = 16384; // ATmega328P: 32KB flash = 16384 words
const FLASH_BYTES = FLASH_WORDS * 2;

// Builds a running AVR CPU + peripheral set from a compiled Intel HEX
// string. AVRADC/AVRUSART are deliberately not instantiated yet - nothing
// in this sub-phase's sketches calls analogRead/Serial.
export function createAvrRuntime(hexString) {
  const progMem = new Uint16Array(FLASH_WORDS);
  const cpu = new CPU(progMem);

  const parsed = parseIntelHex(hexString, FLASH_BYTES);
  cpu.progBytes.set(parsed.data);

  const portB = new AVRIOPort(cpu, portBConfig);
  const portC = new AVRIOPort(cpu, portCConfig);
  const portD = new AVRIOPort(cpu, portDConfig);
  // Required even for plain digitalWrite()+delay() sketches: the Arduino
  // core's millis()/delay() are themselves implemented via Timer0 interrupts
  // in the compiled-in library.
  new AVRTimer(cpu, timer0Config);
  new AVRTimer(cpu, timer1Config);
  new AVRTimer(cpu, timer2Config);

  return {
    cpu,
    portB,
    portC,
    portD,
    // Runs instructions until the CPU's cycle counter reaches targetCycles.
    // cpu.tick() must be called after every instruction - it fires any
    // clock-scheduled event (timer overflow/compare-match interrupts) whose
    // target cycle count has now been reached; without it, Timer0 never
    // interrupts and millis()/delay() would hang.
    runCycles(targetCycles) {
      while (cpu.cycles < targetCycles) {
        avrInstruction(cpu);
        cpu.tick();
      }
    },
  };
}
