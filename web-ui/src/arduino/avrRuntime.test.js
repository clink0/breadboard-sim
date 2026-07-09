import { describe, it, expect } from 'vitest';
import { createAvrRuntime } from './avrRuntime';
import { BLINK_HEX_FIXTURE } from './blinkHexFixture';

describe('avrRuntime - real compiled Blink hex', () => {
  it('toggles D13 (portB bit 5) roughly every ~1s of simulated CPU time', () => {
    const runtime = createAvrRuntime(BLINK_HEX_FIXTURE);
    const CLOCK_HZ = 16_000_000; // Arduino Uno's crystal frequency

    const toggles = [];
    runtime.portB.addListener((value, oldValue) => {
      if (((value >> 5) & 1) !== ((oldValue >> 5) & 1)) toggles.push(runtime.cpu.cycles);
    });

    runtime.runCycles(3.5 * CLOCK_HZ);

    expect(toggles.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < toggles.length; i++) {
      const deltaSeconds = (toggles[i] - toggles[i - 1]) / CLOCK_HZ;
      expect(deltaSeconds).toBeCloseTo(1, 1);
    }
  });
});
