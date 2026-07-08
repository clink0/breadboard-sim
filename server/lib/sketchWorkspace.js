import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let counter = 0;

// arduino-cli requires a sketch's containing folder name to match its .ino
// filename - generate both from a controlled, filesystem-safe identifier
// rather than trusting a temp-dir helper's random suffix charset.
export function createSketchWorkspace(source) {
  const sketchName = `bbsketch_${Date.now()}_${counter++}`;
  const dir = path.join(os.tmpdir(), sketchName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${sketchName}.ino`), source, 'utf8');
  return { dir, sketchName };
}

export function removeSketchWorkspace(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
