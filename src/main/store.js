// Owns the authoritative quiz state: reduce, persist, back up, notify.
//
// Persistence model:
//   * the working copy  <userData>/quiz.json   is rewritten after EVERY accepted change (synchronously, atomically);
//   * an optional "linked" save file (chosen with Save as… or Load) is mirrored on every change as well,
//     so closing the app, a crash or a pulled plug loses nothing;
//   * a failing linked file (e.g. USB stick removed) never blocks the quiz: the working copy still saves
//     and the error is surfaced via saveStatus() / the 'save' event until the file is writable again.
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const L = require('../shared/logic');

const DESTRUCTIVE = new Set(['clearScores', 'resetAll', 'load']);

class Store extends EventEmitter {
  // getTitle() supplies the host-configured default quiz title (branding.defaultTitle).
  constructor(dir, getTitle = () => undefined) {
    super();
    this.getTitle = getTitle;
    this.dir = dir;
    this.file = path.join(dir, 'quiz.json');
    this.sessionFile = path.join(dir, 'session.json');
    this.backupDir = path.join(dir, 'backups');
    fs.mkdirSync(this.backupDir, { recursive: true });
    this.local = { savedAt: null, error: null };
    this.link = { path: null, savedAt: null, error: null };
    try {
      const p = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8')).saveFile;
      if (typeof p === 'string' && validLinkPath(p, this.file) === null) this.link.path = p;
    } catch (e) { /* no session yet */ }
    this.state = this._load();
    if (this.link.path) this._saveAll(); // bring the linked file up to date after a restart
  }

  _load() {
    let raw;
    try { raw = fs.readFileSync(this.file, 'utf8'); } catch (e) { return L.defaultState({ title: this.getTitle() }); }
    try {
      return L.normalizeState(JSON.parse(raw));
    } catch (e) {
      // Keep the unreadable file for inspection and start fresh.
      try { fs.writeFileSync(path.join(this.dir, `quiz.corrupt-${stamp()}.json`), raw); } catch (_) { /* ignore */ }
      return L.defaultState({ title: this.getTitle() });
    }
  }

  getState() { return this.state; }

  // Returns { ok, state }. ok=false when the reducer rejected the action (state unchanged).
  dispatch(action) {
    if (action && action.type === 'resetAll') action = { ...action, title: this.getTitle() };
    const next = L.reduce(this.state, action);
    if (next === this.state) return { ok: false, state: this.state };
    if (action && DESTRUCTIVE.has(action.type)) this.backup(action.type);
    this.state = next;
    this._saveAll();
    this.emit('change', this.state);
    return { ok: true, state: this.state };
  }

  backup(reason) {
    try {
      const name = `quiz-${stamp()}-${reason}.json`;
      fs.writeFileSync(path.join(this.backupDir, name), JSON.stringify(this.state, null, 2));
      return name;
    } catch (e) { return null; }
  }

  // ---- saving ---------------------------------------------------------------------
  _saveAll() {
    const data = JSON.stringify(this.state, null, 2);
    this.local = attempt(() => writeAtomic(this.file, data));
    if (this.link.path) this.link = { path: this.link.path, ...attempt(() => writeAtomic(this.link.path, data)) };
    this.emit('save', this.saveStatus());
  }

  /** Kept for callers that want to force a write (e.g. on quit). Saves are already immediate. */
  flush() { this._saveAll(); }

  saveStatus() {
    return { path: this.link.path, savedAt: this.link.savedAt, error: this.link.error, local: { ...this.local } };
  }

  /** Save as…: write the quiz to `file` now and keep it up to date on every change. */
  linkTo(file) {
    const why = validLinkPath(file, this.file);
    if (why) return { ok: false, error: why };
    const result = attempt(() => writeAtomic(file, JSON.stringify(this.state, null, 2)));
    if (result.error) return { ok: false, error: result.error };
    this.link = { path: file, ...result };
    this._persistSession();
    this.emit('save', this.saveStatus());
    return { ok: true };
  }

  /** Stop mirroring to a file. The working copy keeps autosaving. */
  unlink() {
    this.link = { path: null, savedAt: null, error: null };
    this._persistSession();
    this.emit('save', this.saveStatus());
  }

  /**
   * Load: validate `file`, replace the quiz (the previous one is backed up) and, unless opts.link is false,
   * keep autosaving back to that file.
   */
  loadFrom(file, opts = {}) {
    let parsed;
    try {
      parsed = L.normalizeState(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch (e) {
      return { ok: false, error: e instanceof SyntaxError ? 'That file is not valid JSON' : e.message };
    }
    const r = this.dispatch({ type: 'load', state: parsed });
    if (!r.ok) return { ok: false, error: 'Nothing was loaded' };
    if (opts.link === false) { this.unlink(); return { ok: true, linked: false }; }
    const linked = this.linkTo(file);
    return linked.ok ? { ok: true, linked: true } : { ok: true, linked: false, warning: `Loaded, but cannot autosave to that file: ${linked.error}` };
  }

  /** Write a standalone copy; does not change the autosave link. */
  exportTo(file) {
    const r = attempt(() => writeAtomic(file, JSON.stringify(this.state, null, 2)));
    return r.error ? { ok: false, error: r.error } : { ok: true };
  }

  _persistSession() {
    try { writeAtomic(this.sessionFile, JSON.stringify({ saveFile: this.link.path })); } catch (e) { /* non-fatal */ }
  }
}

// ---- helpers --------------------------------------------------------------------------
function validLinkPath(p, workingCopy) {
  if (typeof p !== 'string' || !path.isAbsolute(p)) return 'Choose a full file path';
  if (path.extname(p).toLowerCase() !== '.json') return 'Save files must end in .json';
  if (path.resolve(p) === path.resolve(workingCopy)) return 'That is the app\'s own working copy – pick another file';
  return null;
}

// Write to a temp file in the same directory, flush it to disk, then rename over the target,
// so a crash can never leave a half-written save file.
function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    const fd = fs.openSync(tmp, 'w');
    try { fs.writeSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(tmp, file);
  } catch (e) {
    try { fs.rmSync(tmp, { force: true }); } catch (_) { /* ignore */ }
    throw e;
  }
}

// Run a write and report { savedAt, error } instead of throwing.
function attempt(fn) {
  try { fn(); return { savedAt: Date.now(), error: null }; } catch (e) { return { savedAt: null, error: e.message }; }
}

function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }

module.exports = { Store };
