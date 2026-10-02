const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { SettingsStore } = require('../src/main/settings');
const E = require('../src/shared/effects');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pubquiz-settings-'));

test('fresh install gets the Party defaults', () => {
  assert.deepEqual(new SettingsStore(tmp()).get().effects, E.defaultEffects());
});

test('changes persist across restarts and are written immediately', () => {
  const dir = tmp();
  const s = new SettingsStore(dir);
  s.setEffects({ flags: { 'scores.pulse': false }, confettiAmount: 'lots' });
  const file = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'));
  assert.equal(file.effects.flags['scores.pulse'], false);
  const again = new SettingsStore(dir).get().effects;
  assert.equal(again.flags['scores.pulse'], false);
  assert.equal(again.confettiAmount, 'lots');
  assert.equal(again.preset, 'custom');
});

test('patches merge; presets replace flags; reset restores defaults; change events fire', () => {
  const s = new SettingsStore(tmp());
  const seen = [];
  s.on('change', (v) => seen.push(v.effects.preset));
  s.setEffects({ flags: { 'ambient.background': false } });
  s.setEffects({ flags: { 'scores.pulse': false } });
  assert.equal(s.get().effects.flags['ambient.background'], false, 'earlier patch kept');
  s.applyPreset('off');
  assert.equal(s.get().effects.preset, 'off');
  s.reset();
  assert.deepEqual(s.get().effects, E.defaultEffects());
  assert.deepEqual(seen, ['custom', 'custom', 'off', 'party']);
});

test('a corrupt or hostile settings file falls back to defaults', () => {
  for (const content of ['{ nope', '[]', '{"effects": 5}', '{"effects":{"flags":{"scores.pulse":"no"}}}']) {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, 'settings.json'), content);
    const eff = new SettingsStore(dir).get().effects;
    assert.deepEqual(eff, E.defaultEffects(), content);
  }
});

test('an unwritable settings location never throws; the change still applies in memory', () => {
  const dir = tmp();
  const s = new SettingsStore(dir);
  fs.rmSync(dir, { recursive: true });
  assert.doesNotThrow(() => s.setEffects({ flags: { 'scores.pulse': false } }));
  assert.equal(s.get().effects.flags['scores.pulse'], false);
});
