#!/usr/bin/env node
// Verifies the output of the headless smoke scenario (scripts/ci/smoke.json):
// no console/renderer errors were reported and every window produced a non-trivial screenshot.
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || 'smoke-out');
const problems = [];
try {
  const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
  if (!report.ok) problems.push(...report.errors);
} catch (e) { problems.push('no report.json – the app did not finish the scenario'); }
for (const name of ['launcher', 'leaderboard', 'admin', 'leaderboard-after']) {
  const file = path.join(dir, `${name}.png`);
  const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
  if (size < 5000) problems.push(`${name}.png missing or blank (${size} bytes)`);
}
if (problems.length) { console.error('Smoke test failed:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log('Smoke test passed.');
