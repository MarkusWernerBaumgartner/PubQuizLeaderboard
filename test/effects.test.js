const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const E = require('../src/shared/effects');

const root = path.join(__dirname, '..');
const allOn = () => Object.fromEntries(E.FLAGS.map((f) => [f.key, true]));

test('every flag has a unique key, a group, a label and a boolean default', () => {
  const keys = E.FLAGS.map((f) => f.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const f of E.FLAGS) {
    assert.match(f.key, /^[a-z]+(\.[a-zA-Z]+)+$/);
    assert.ok(f.group && f.label, f.key);
  }
  assert.ok(E.FLAGS.length >= 20);
});

test('defaults are the Party preset: everything on, normal confetti', () => {
  const d = E.defaultEffects();
  assert.deepEqual(d.flags, allOn());
  assert.equal(d.confettiAmount, 'normal');
  assert.equal(d.followSystemReducedMotion, true);
  assert.equal(d.preset, 'party');
});

test('presets: calm / minimal / off disable progressively more', () => {
  const on = (name) => Object.values(E.applyPreset(E.defaultEffects(), name).flags).filter(Boolean).length;
  assert.ok(on('party') > on('calm'));
  assert.ok(on('calm') > on('minimal'));
  assert.ok(on('minimal') > on('off'));
  assert.equal(on('off'), 0);
  const calm = E.applyPreset(E.defaultEffects(), 'calm');
  assert.equal(calm.flags['celebrate.leadChange.confetti'], false);
  assert.equal(calm.flags['scores.reorder'], true);
  assert.equal(calm.preset, 'calm');
  assert.equal(E.applyPreset(E.defaultEffects(), 'bogus').preset, 'party', 'unknown preset ignored');
});

test('applyPreset keeps the reduced-motion preference', () => {
  const s = E.patchEffects(E.defaultEffects(), { followSystemReducedMotion: false });
  assert.equal(E.applyPreset(s, 'off').followSystemReducedMotion, false);
});

test('normalizeEffects never throws and repairs bad input per field', () => {
  const d = E.defaultEffects();
  for (const bad of [null, undefined, 5, 'x', [], {}]) assert.deepEqual(E.normalizeEffects(bad), d);
  const n = E.normalizeEffects({ flags: { 'scores.pulse': false, 'scores.countUp': 'yes', 'nope.nothing': true }, confettiAmount: 'huge', followSystemReducedMotion: 'maybe' });
  assert.equal(n.flags['scores.pulse'], false);
  assert.equal(n.flags['scores.countUp'], true, 'non-boolean falls back to default');
  assert.equal(n.flags['nope.nothing'], undefined, 'unknown flag dropped');
  assert.equal(n.confettiAmount, 'normal');
  assert.equal(n.followSystemReducedMotion, true);
});

test('preset is derived from the flags, "custom" when they match none', () => {
  assert.equal(E.patchEffects(E.defaultEffects(), { flags: { 'scores.pulse': false } }).preset, 'custom');
  const off = E.applyPreset(E.defaultEffects(), 'off');
  assert.equal(E.normalizeEffects(JSON.parse(JSON.stringify(off))).preset, 'off');
  assert.equal(E.patchEffects(off, { confettiAmount: 'lots' }).preset, 'custom');
  assert.equal(E.normalizeEffects({ preset: 'off', flags: allOn() }).preset, 'party', 'stored preset name cannot lie');
});

test('patchEffects merges flags without touching others', () => {
  const s = E.patchEffects(E.defaultEffects(), { flags: { 'ambient.background': false } });
  assert.equal(s.flags['ambient.background'], false);
  assert.equal(s.flags['scores.pulse'], true);
});

test('system reduced motion resolves to the minimal preset only when followed', () => {
  const party = E.defaultEffects();
  assert.deepEqual(E.resolveEffects(party, { systemReducedMotion: false }).flags, party.flags);
  const reduced = E.resolveEffects(party, { systemReducedMotion: true });
  assert.equal(reduced.flags['celebrate.leadChange.confetti'], false);
  assert.equal(reduced.flags['ambient.background'], false);
  assert.equal(reduced.flags['scores.countUp'], true);
  const ignore = E.patchEffects(party, { followSystemReducedMotion: false });
  assert.deepEqual(E.resolveEffects(ignore, { systemReducedMotion: true }).flags, party.flags);
});

test('htmlClasses lists fx-off-* only for disabled flags, kebab-cased', () => {
  assert.deepEqual(E.htmlClasses(E.resolveEffects(E.defaultEffects(), {})), []);
  const s = E.patchEffects(E.defaultEffects(), { flags: { 'celebrate.leadChange.confetti': false, 'ambient.crestWobble': false } });
  assert.deepEqual(E.htmlClasses(E.resolveEffects(s, {})).sort(), ['fx-off-ambient-crest-wobble', 'fx-off-celebrate-lead-change-confetti']);
});

test('confettiScale', () => {
  const scale = (amount) => E.confettiScale(E.resolveEffects(E.patchEffects(E.defaultEffects(), { confettiAmount: amount }), {}));
  assert.ok(scale('low') < scale('normal'));
  assert.equal(scale('normal'), 1);
  assert.ok(scale('lots') > 1);
});

// Guards against "dead" switches: each flag must actually be honoured somewhere in the renderer.
test('every flag is referenced by CSS (fx-off-…) or JS (Effects.on)', () => {
  const dir = path.join(root, 'src', 'renderer');
  const files = [];
  (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (f.name !== 'assets') walk(p); } else if (/\.(css|js)$/.test(f.name)) files.push(p); } })(dir);
  const source = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const kebab = (k) => k.replace(/\./g, '-').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  const dead = E.FLAGS.filter((f) => !source.includes(`fx-off-${kebab(f.key)}`) && !source.includes(`Effects.on('${f.key}')`)).map((f) => f.key);
  assert.deepEqual(dead, []);
});
