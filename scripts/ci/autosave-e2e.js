#!/usr/bin/env node
// End-to-end check of the "never lose a score" guarantee, against the real app:
//   run 1: link a save file, make changes, then SIGKILL the app (no shutdown hooks run);
//   run 2: restart on the same profile - the changes must be there and the link restored;
//   finally the linked file itself must contain the latest change, and must load into a fresh Store.
// Needs a display (use xvfb-run in CI).
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'pubquiz-e2e-'));
const profile = path.join(work, 'profile');
const out = path.join(work, 'out');
fs.mkdirSync(profile);
fs.copyFileSync(path.join(root, 'examples', 'sample-quiz.json'), path.join(profile, 'quiz.json'));

function runApp(scenario) {
  return spawnSync(require(path.join(root, 'node_modules', 'electron')),   // the real binary, so a SIGKILL is observable
    [root, ...(process.platform === 'linux' ? ['--no-sandbox'] : []), '--disable-gpu', `--user-data-dir=${profile}`],
    { env: { ...process.env, PUBQUIZ_DEV_SCENARIO: path.join(__dirname, scenario), PUBQUIZ_DEV_OUT: out }, encoding: 'utf8', timeout: 90000 });
}
const fail = (msg) => { console.error('Autosave e2e FAILED: ' + msg); process.exit(1); };

const first = runApp('autosave-write.json');
// A killed Windows process reports no signal, only a non-zero exit status.
const killed = first.signal === 'SIGKILL' || (process.platform === 'win32' && first.status !== 0);
if (!killed) fail(`run 1 should have been killed (got signal=${first.signal}, status=${first.status})`);
console.log('run 1: app killed with SIGKILL as intended');

const linked = path.join(out, 'linked.json');
if (!fs.existsSync(linked)) fail('linked save file was never written');
const afterCrash = JSON.parse(fs.readFileSync(linked, 'utf8'));
if (afterCrash.title !== 'Survives a crash' || afterCrash.teams.length !== 9) fail('linked file is missing changes made just before the crash');

const second = runApp('autosave-verify.json');
if (second.status !== 0) {
  const report = fs.existsSync(path.join(out, 'report.json')) ? fs.readFileSync(path.join(out, 'report.json'), 'utf8') : second.stderr;
  fail('run 2 could not see the saved changes:\n' + report);
}
console.log('run 2: state, team and autosave link restored after restart');

const final = JSON.parse(fs.readFileSync(linked, 'utf8'));
if (final.title !== 'Still autosaving after restart') fail('linked file stopped autosaving after the restart');

const { Store } = require(path.join(root, 'src', 'main', 'store'));
const s = new Store(fs.mkdtempSync(path.join(os.tmpdir(), 'pubquiz-e2e-load-')));
const loaded = s.loadFrom(linked, { link: false });
if (!loaded.ok || s.getState().teams.length !== 9) fail('linked file does not load back into a fresh app');
console.log('linked file loads back into a fresh app');
console.log('Autosave e2e passed.');
fs.rmSync(work, { recursive: true, force: true });
