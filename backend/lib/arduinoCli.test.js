import { describe, it, expect } from 'vitest';
import { compileSketch, getToolchainStatus } from './arduinoCli.js';
import { STARTER_SKETCH } from 'shared/starterSketch.js';

describe('arduino-cli compile server', () => {
  it('compiles the default Blink sketch into a non-empty Intel HEX file', async () => {
    const toolchain = await getToolchainStatus();
    if (!toolchain.ready) {
      console.warn('Skipping: arduino-cli/arduino:avr core not installed in this environment.');
      return;
    }

    const result = await compileSketch({ source: STARTER_SKETCH });

    expect(result.success).toBe(true);
    expect(result.hex).toBeTruthy();
    expect(result.hex.trim().split('\n')[0]).toMatch(/^:/);
  });

  it('reports a sketch-level compile error without throwing', async () => {
    const toolchain = await getToolchainStatus();
    if (!toolchain.ready) {
      console.warn('Skipping: arduino-cli/arduino:avr core not installed in this environment.');
      return;
    }

    const result = await compileSketch({ source: 'this is not valid C++ at all {{{' });

    expect(result.success).toBe(false);
    expect(result.hex).toBeNull();
    expect(result.stderr.length > 0 || result.stdout.length > 0).toBe(true);
  });
});
