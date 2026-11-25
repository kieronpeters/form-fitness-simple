import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const mode = process.argv[2] ?? 'dev';
const tmp = resolve('.tmp');
mkdirSync(tmp, { recursive: true });
const env = { ...process.env, TMP: tmp, TEMP: tmp, TMPDIR: tmp };
const bin = (name) => resolve('node_modules', name);

function runNode(script, args) {
  return spawnSync(process.execPath, [script, ...args], { stdio: 'inherit', env });
}

if (mode === 'build') {
  const tsc = runNode(bin('typescript/bin/tsc'), ['-b']);
  if (tsc.status !== 0) process.exit(tsc.status ?? 1);
  const vite = runNode(bin('vite/bin/vite.js'), ['build']);
  process.exit(vite.status ?? 0);
}

if (mode === 'preview') {
  const child = spawn(process.execPath, [bin('vite/bin/vite.js'), 'preview'], { stdio: 'inherit', env });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  const child = spawn(process.execPath, [bin('vite/bin/vite.js'), '--host'], { stdio: 'inherit', env });
  child.on('exit', (code) => process.exit(code ?? 0));
}
