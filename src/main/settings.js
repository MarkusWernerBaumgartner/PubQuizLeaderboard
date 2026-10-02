// App-wide preferences (per machine): which animations/celebrations are enabled.
// Kept separate from the quiz and from branding, so "Reset everything" never touches it.
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const E = require('../shared/effects');
const { writeAtomic, attempt } = require('./fsutil');

class SettingsStore extends EventEmitter {
  constructor(dir) {
    super();
    this.file = path.join(dir, 'settings.json');
    let raw = null;
    try { raw = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch (e) { /* first run or unreadable: use defaults */ }
    this.settings = { version: 1, effects: E.normalizeEffects(raw && typeof raw === 'object' ? raw.effects : null) };
  }

  get() { return this.settings; }

  _commit(effects) {
    this.settings = { version: 1, effects };
    attempt(() => writeAtomic(this.file, JSON.stringify(this.settings, null, 2))); // a failed write must not break the show
    this.emit('change', this.settings);
  }

  setEffects(patch) { this._commit(E.patchEffects(this.settings.effects, patch)); }
  applyPreset(name) { this._commit(E.applyPreset(this.settings.effects, name)); }
  reset() { this._commit(E.defaultEffects()); }
}

module.exports = { SettingsStore };
