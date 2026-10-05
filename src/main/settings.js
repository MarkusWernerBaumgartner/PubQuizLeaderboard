// App-wide preferences (per machine): which animations/celebrations are enabled.
// Kept separate from the quiz and from branding, so "Reset everything" never touches it.
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const E = require('../shared/effects');
const { writeAtomic, attempt } = require('./fsutil');

// Page zoom per window, like a browser's Ctrl +/-. 1 = 100%.
const ZOOM_KINDS = ['launcher', 'admin', 'leaderboard'];
const ZOOM_MIN = 0.5, ZOOM_MAX = 3;
const clampZoom = (z) => (typeof z === 'number' && Number.isFinite(z) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 20) / 20)) : 1);
const normalizeZoom = (raw) => Object.fromEntries(ZOOM_KINDS.map((k) => [k, clampZoom(raw && typeof raw === 'object' ? raw[k] : 1)]));

class SettingsStore extends EventEmitter {
  constructor(dir) {
    super();
    this.file = path.join(dir, 'settings.json');
    let raw = null;
    try { raw = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch (e) { /* first run or unreadable: use defaults */ }
    this.settings = { version: 1, effects: E.normalizeEffects(raw && typeof raw === 'object' ? raw.effects : null), zoom: normalizeZoom(raw && typeof raw === 'object' ? raw.zoom : null) };
  }

  get() { return this.settings; }

  _commit(effects, zoom = this.settings.zoom) {
    this.settings = { version: 1, effects, zoom };
    attempt(() => writeAtomic(this.file, JSON.stringify(this.settings, null, 2))); // a failed write must not break the show
    this.emit('change', this.settings);
  }

  setEffects(patch) { this._commit(E.patchEffects(this.settings.effects, patch)); }
  applyPreset(name) { this._commit(E.applyPreset(this.settings.effects, name)); }
  getZoom(kind) { return this.settings.zoom[kind] || 1; }
  setZoom(kind, factor) {
    if (!ZOOM_KINDS.includes(kind)) return;
    this._commit(this.settings.effects, { ...this.settings.zoom, [kind]: clampZoom(factor) });
  }
  reset() { this._commit(E.defaultEffects()); }
}

module.exports = { SettingsStore, ZOOM_KINDS, clampZoom };
