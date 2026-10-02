#!/usr/bin/env node
// Syntax-checks every JavaScript file (cross-platform replacement for `find … | xargs node --check`).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', 'dist', 'dist-local', '.git', 'smoke-out', 'local']);
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) files.push(p);
  }
})(root);

let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) { bad++; console.error(`${path.relative(root, f)}\n${r.stderr}`); }
}
console.log(`Syntax-checked ${files.length} files.`);
process.exit(bad ? 1 : 0);
