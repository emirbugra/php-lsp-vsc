// Writes .vscode/launch.json from `PROJECT_<n>=<folder>` settings, so local project paths never
// end up in a committed file. Each one becomes a "Run Extension (prj<n>)" entry, in the order of <n>.
// The settings come from the environment (`export PROJECT_1=/path/to/app`) and from .env; the
// environment wins when both set the same number.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const KEY = /^PROJECT_(\d+)$/;

/** `PROJECT_<n>` entries of a .env file: Map<n, folder>. */
function readEnvFile(file) {
  const out = new Map();
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?PROJECT_(\d+)\s*=\s*(.*?)\s*$/);
    if (m) out.set(Number(m[1]), m[2].replace(/^["']|["']$/g, ''));
  }
  return out;
}

function projects() {
  const all = readEnvFile(path.join(root, '.env'));
  for (const [key, value] of Object.entries(process.env)) {
    const m = key.match(KEY);
    if (m) all.set(Number(m[1]), value.trim());
  }
  return [...all.entries()]
    .filter(([, folder]) => folder)
    .sort((a, b) => a[0] - b[0])
    .map(([n, folder]) => ({ name: `prj${n}`, folder }));
}

function config(name, folder) {
  return {
    name: `Run Extension (${name})`,
    type: 'extensionHost',
    request: 'launch',
    args: ['--extensionDevelopmentPath=${workspaceFolder}', ...(folder ? [folder] : [])],
    outFiles: ['${workspaceFolder}/dist/**/*.js'],
    preLaunchTask: 'compile-extension',
  };
}

const list = projects();
for (const p of list) {
  if (!fs.existsSync(p.folder)) console.warn(`warning: ${p.name}: folder does not exist`);
}
const launch = {
  version: '0.2.0',
  configurations: [...list.map((p) => config(p.name, p.folder)), config('boş pencere')],
};
fs.mkdirSync(path.join(root, '.vscode'), { recursive: true });
fs.writeFileSync(path.join(root, '.vscode/launch.json'), JSON.stringify(launch, null, 2) + '\n');
console.log(`launch.json: ${list.map((p) => p.name).join(', ') || 'no projects'}`);
