// Owns the authoritative quiz state: reduce, persist (atomic, debounced), back up, notify.
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
    this.backupDir = path.join(dir, 'backups');
    this.timer = null;
    fs.mkdirSync(this.backupDir, { recursive: true });
    this.state = this._load();
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
    this._scheduleSave();
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

  _scheduleSave() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 250);
  }

  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    fs.renameSync(tmp, this.file);
  }
}

function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }

module.exports = { Store };
