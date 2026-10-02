#!/usr/bin/env node
// Headless-friendly end-to-end checks against the real app, on any OS:
//   1. smoke scenario  (all windows open, no console errors, non-blank screenshots)
//   2. effects scenarios (switches really turn animations/celebrations on and off)
//   3. autosave kill/restart test
// On Linux run it under `xvfb-run -a`. Output goes to ./smoke-out.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const out = path.join(root, 'smoke-out');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function scenario(name) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `pubquiz-${name}-`));
  fs.copyFileSync(path.join(root, 'examples', 'sample-quiz.json'), path.join(profile, 'quiz.json'));
  const dir = path.join(out, name);
  const args = [root, ...(process.platform === 'linux' ? ['--no-sandbox'] : []), '--disable-gpu', `--user-data-dir=${profile}`];
  const r = spawnSync(require(path.join(root, 'node_modules', 'electron')), args, {
    env: { ...process.env, PUBQUIZ_DEV_SCENARIO: path.join(__dirname, `${name}.json`), PUBQUIZ_DEV_OUT: dir },
    encoding: 'utf8', timeout: 120000,
  });
  const reportFile = path.join(dir, 'report.json');
  const report = fs.existsSync(reportFile) ? fs.readFileSync(reportFile, 'utf8') : `(no report) ${r.stderr}`;
  if (r.status !== 0) { console.error(`Scenario "${name}" failed:\n${report}`); process.exit(1); }
  console.log(`scenario ${name}: ok`);
}

scenario('smoke');
const check = spawnSync(process.execPath, [path.join(__dirname, 'check-smoke.js'), path.join(out, 'smoke')], { stdio: 'inherit' });
if (check.status !== 0) process.exit(1);
scenario('effects-on');
scenario('effects-off');
const e2e = spawnSync(process.execPath, [path.join(__dirname, 'autosave-e2e.js')], { stdio: 'inherit' });
process.exit(e2e.status ?? 1);
