const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Store } = require('../src/main/store');
const L = require('../src/shared/logic');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pubquiz-store-'));
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const withTeam = (store, name = 'Quizzy') => store.dispatch({ type: 'addTeam', name });
const SAMPLE_SRC = path.join(__dirname, '..', 'examples', 'sample-quiz.json');
// Tests must never write to the tracked sample, so always work on a temp copy.
const sampleCopy = () => { const f = path.join(tmp(), 'sample.json'); fs.copyFileSync(SAMPLE_SRC, f); return f; };

test('every accepted change is on disk immediately (no debounce window)', () => {
  const dir = tmp();
  const s = new Store(dir);
  withTeam(s);
  assert.equal(read(path.join(dir, 'quiz.json')).teams[0].name, 'Quizzy');
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')), [], 'no temp files left behind');
});

test('state survives a restart (save → new Store → same state)', () => {
  const dir = tmp();
  const a = new Store(dir);
  a.dispatch({ type: 'setTitle', title: 'Friday Quiz' });
  withTeam(a, 'Alpha'); withTeam(a, 'Beta');
  a.dispatch({ type: 'setScore', teamId: a.getState().teams[0].id, roundId: a.getState().rounds[0].id, value: 7 });
  const b = new Store(dir);
  assert.deepEqual(b.getState(), a.getState());
});

test('rejected actions do not touch the disk', () => {
  const dir = tmp();
  const s = new Store(dir);
  withTeam(s);
  const before = fs.statSync(path.join(dir, 'quiz.json')).mtimeMs;
  const r = s.dispatch({ type: 'setScore', teamId: 'nope', roundId: 'nope', value: 1 });
  assert.equal(r.ok, false);
  assert.equal(fs.statSync(path.join(dir, 'quiz.json')).mtimeMs, before);
});

test('corrupt save is preserved aside and the app starts fresh', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'quiz.json'), '{ not json');
  const s = new Store(dir);
  assert.equal(s.getState().teams.length, 0);
  assert.ok(fs.readdirSync(dir).some((f) => f.startsWith('quiz.corrupt-')));
});

test('destructive actions write a backup of the previous state first', () => {
  const dir = tmp();
  const s = new Store(dir);
  withTeam(s, 'Keep me');
  s.dispatch({ type: 'resetAll' });
  const backups = fs.readdirSync(path.join(dir, 'backups'));
  assert.equal(backups.length, 1);
  assert.equal(read(path.join(dir, 'backups', backups[0])).teams[0].name, 'Keep me');
  assert.equal(s.getState().teams.length, 0);
});

test('resetAll seeds the host-configured default title', () => {
  const s = new Store(tmp(), () => 'Seeded Title');
  assert.equal(s.getState().title, 'Seeded Title');
  s.dispatch({ type: 'setTitle', title: 'Changed' });
  s.dispatch({ type: 'resetAll' });
  assert.equal(s.getState().title, 'Seeded Title');
});

test('saveAs links a file: written immediately, then autosaved on every change', () => {
  const dir = tmp(), file = path.join(tmp(), 'night.json');
  const s = new Store(dir);
  withTeam(s, 'One');
  assert.deepEqual(s.linkTo(file), { ok: true });
  assert.equal(read(file).teams[0].name, 'One');
  withTeam(s, 'Two');
  assert.deepEqual(read(file).teams.map((t) => t.name), ['One', 'Two']);
  assert.equal(s.saveStatus().path, file);
  assert.ok(s.saveStatus().savedAt);
  assert.equal(s.saveStatus().error, null);
});

test('the link survives a restart and keeps autosaving', () => {
  const dir = tmp(), file = path.join(tmp(), 'night.json');
  const a = new Store(dir);
  a.linkTo(file);
  const b = new Store(dir);
  assert.equal(b.saveStatus().path, file);
  withTeam(b, 'After restart');
  assert.equal(read(file).teams[0].name, 'After restart');
});

test('unlink stops mirroring but keeps the local working copy saving', () => {
  const dir = tmp(), file = path.join(tmp(), 'night.json');
  const s = new Store(dir);
  s.linkTo(file);
  s.unlink();
  withTeam(s, 'Later');
  assert.equal(read(file).teams.length, 0, 'linked file no longer updated');
  assert.equal(read(path.join(dir, 'quiz.json')).teams[0].name, 'Later');
  assert.equal(new Store(dir).saveStatus().path, null);
});

test('loadFrom replaces the quiz and links the file; the old quiz is backed up', () => {
  const dir = tmp();
  const s = new Store(dir);
  withTeam(s, 'Old team');
  const SAMPLE = sampleCopy();
  const r = s.loadFrom(SAMPLE);
  assert.equal(r.ok, true);
  assert.equal(r.linked, true);
  assert.equal(s.getState().title, 'Sample Pub Quiz');
  assert.equal(s.getState().teams.length, 8);
  assert.equal(s.saveStatus().path, SAMPLE);
  assert.equal(fs.readdirSync(path.join(dir, 'backups')).length, 1);
});

test('loadFrom with link:false loads without autosaving back to the file', () => {
  const file = sampleCopy();
  const before = fs.readFileSync(file, 'utf8');
  const s = new Store(tmp());
  assert.deepEqual(s.loadFrom(file, { link: false }), { ok: true, linked: false });
  withTeam(s, 'Extra');
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'source file untouched');
  assert.equal(s.saveStatus().path, null);
});

test('loadFrom rejects bad files and leaves state and link untouched', () => {
  const dir = tmp();
  const s = new Store(dir);
  withTeam(s, 'Safe');
  const before = s.getState();
  const bad = path.join(tmp(), 'bad.json');
  for (const content of ['{ nope', '[]', '{"title": 5}', '{"title":"x","rounds":[],"teams":[{}]}']) {
    fs.writeFileSync(bad, content);
    const r = s.loadFrom(bad);
    assert.equal(r.ok, false, content);
    assert.match(r.error, /./);
  }
  assert.equal(s.loadFrom(path.join(tmp(), 'missing.json')).ok, false);
  assert.equal(s.getState(), before);
  assert.equal(s.saveStatus().path, null);
});

test('save → load round trip through a file is lossless', () => {
  const a = new Store(tmp());
  a.loadFrom(sampleCopy());
  const file = path.join(tmp(), 'copy.json');
  a.linkTo(file);
  const b = new Store(tmp());
  assert.equal(b.loadFrom(file).ok, true);
  assert.deepEqual(b.getState(), a.getState());
});

test('exportTo writes a copy without linking', () => {
  const s = new Store(tmp());
  withTeam(s, 'Exported');
  const file = path.join(tmp(), 'export.json');
  assert.deepEqual(s.exportTo(file), { ok: true });
  assert.equal(read(file).teams[0].name, 'Exported');
  withTeam(s, 'Not in export');
  assert.equal(read(file).teams.length, 1);
  assert.equal(s.saveStatus().path, null);
});

test('an unwritable linked file never blocks play: local copy saves, error is reported, recovery works', () => {
  const dir = tmp(), parent = tmp(), file = path.join(parent, 'gone', 'night.json');
  fs.mkdirSync(path.dirname(file));
  const s = new Store(dir);
  s.linkTo(file);
  fs.rmSync(path.dirname(file), { recursive: true });        // e.g. USB stick pulled out
  const r = withTeam(s, 'Still works');
  assert.equal(r.ok, true);
  assert.equal(read(path.join(dir, 'quiz.json')).teams[0].name, 'Still works');
  assert.match(s.saveStatus().error, /./);
  fs.mkdirSync(path.dirname(file));                         // plugged back in
  withTeam(s, 'Recovered');
  assert.equal(s.saveStatus().error, null);
  assert.equal(read(file).teams.length, 2);
});

test('linkTo rejects relative paths, non-json files and the working copy itself', () => {
  const dir = tmp();
  const s = new Store(dir);
  assert.equal(s.linkTo('relative.json').ok, false);
  assert.equal(s.linkTo(path.join(tmp(), 'x.txt')).ok, false);
  assert.equal(s.linkTo(path.join(dir, 'quiz.json')).ok, false);
  assert.equal(s.saveStatus().path, null);
});

test('save status events fire so windows can show "saved"', () => {
  const s = new Store(tmp());
  const seen = [];
  s.on('save', (st) => seen.push(st));
  withTeam(s);
  assert.equal(seen.length, 1);
  assert.ok(seen[0].local.savedAt);
});
