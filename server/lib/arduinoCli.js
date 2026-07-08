import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { createSketchWorkspace, removeSketchWorkspace } from './sketchWorkspace.js';

const execFileAsync = promisify(execFile);

async function probe(args) {
  try {
    const { stdout } = await execFileAsync('arduino-cli', args, { timeout: 15000 });
    return { installed: true, stdout };
  } catch (err) {
    return { installed: false, stdout: '', error: err.code === 'ENOENT' ? 'not-found' : String(err) };
  }
}

export async function getToolchainStatus() {
  const cli = await probe(['version']);
  if (!cli.installed) {
    return {
      ready: false,
      arduinoCli: { installed: false },
      avrCore: { installed: false },
      instructions: [
        'Install arduino-cli: brew install arduino-cli',
        'Then install the AVR core: arduino-cli core install arduino:avr',
      ],
    };
  }
  const core = await probe(['core', 'list']);
  const avrInstalled = core.stdout?.includes('arduino:avr') ?? false;
  return {
    ready: avrInstalled,
    arduinoCli: { installed: true, version: cli.stdout.trim() },
    avrCore: { installed: avrInstalled },
    instructions: avrInstalled ? [] : ['Install the AVR core: arduino-cli core install arduino:avr'],
  };
}

// Finds the plain (non-bootloader) hex file arduino-cli produces, e.g.
// "bbsketch_....ino.hex" - explicitly excluding the "*.with_bootloader.hex"
// variant, which real hardware flashing wants but our emulator does not
// (avr8js loads program memory directly, no bootloader involved).
function findHexFile(outDir) {
  const hex = fs.readdirSync(outDir).find((f) => f.endsWith('.ino.hex'));
  if (!hex) throw new Error('arduino-cli did not produce a .hex file');
  return path.join(outDir, hex);
}

export async function compileSketch({ source, fqbn = 'arduino:avr:uno' }) {
  const { dir } = createSketchWorkspace(source);
  try {
    const outDir = path.join(dir, 'out');
    const { stdout, stderr } = await execFileAsync(
      'arduino-cli',
      ['compile', '--fqbn', fqbn, '--output-dir', outDir, dir],
      { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
    );
    const hexPath = findHexFile(outDir);
    return { success: true, hex: fs.readFileSync(hexPath, 'utf8'), stdout, stderr };
  } catch (err) {
    if (err.stdout !== undefined || err.stderr !== undefined) {
      // A sketch-level compile error (bad user code) - not a server fault.
      return { success: false, hex: null, stdout: err.stdout ?? '', stderr: err.stderr ?? String(err) };
    }
    throw err;
  } finally {
    removeSketchWorkspace(dir);
  }
}
