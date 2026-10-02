#!/usr/bin/env node
// Fails if files that must never be committed are tracked or about to be added:
// brand artwork (EPS), personal presets (local/), saved quiz or branding data.
const { execSync } = require('child_process');
const path = require('path');

const FORBIDDEN = [
  [/\.eps$/i, 'EPS artwork'],
  [/^local\//, 'local/ personal presets'],
  [/^private\//, 'private/ files'],
  [/(^|\/)branding\.json$/, 'saved branding config'],
  [/(^|\/)quiz[^/]*\.json$/, 'saved quiz data (only examples/sample-quiz.json is allowed)'],
  [/^\.remember\//, 'tooling state'],
  [/\.(AppImage|dmg|exe|msi)$/i, 'build output'],
  [/^dist(-local)?\//, 'build output'],
];
const ALLOWED = new Set(['examples/sample-quiz.json']);

const files = execSync('git ls-files -co --exclude-standard', { cwd: path.join(__dirname, '..') }).toString().split('\n').filter(Boolean);
const bad = [];
for (const f of files) {
  if (ALLOWED.has(f)) continue;
  for (const [re, why] of FORBIDDEN) if (re.test(f)) bad.push(`${f}  (${why})`);
}
console.log(`Checked ${files.length} files.`);
if (bad.length) { console.error('Forbidden files:\n' + bad.join('\n')); process.exit(1); }
console.log('Repository hygiene OK.');
