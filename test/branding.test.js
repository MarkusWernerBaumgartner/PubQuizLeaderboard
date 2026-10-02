const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../src/shared/branding');
const L = require('../src/shared/logic');

test('defaults are neutral and complete', () => {
  const d = B.defaultBranding();
  assert.equal(d.appName, 'Pub Quiz Scoring');
  assert.equal(d.defaultTitle, 'Pub Quiz Night');
  for (const k of B.COLOUR_KEYS) assert.match(d.colours[k], /^#[0-9a-f]{6}$/);
  assert.deepEqual(d.images, { crest: null, wordmark: null, icon: null });
});

test('normalizeBranding never throws and falls back per field', () => {
  const d = B.defaultBranding();
  for (const bad of [null, undefined, 5, 'x', [], {}]) assert.deepEqual(B.normalizeBranding(bad), d);
  const n = B.normalizeBranding({ appName: '  My Quiz ', colours: { bg: '#112233', accent1: 'red', text: '#FFF', bogus: '#000000' }, extra: 1 });
  assert.equal(n.appName, 'My Quiz');
  assert.equal(n.colours.bg, '#112233');
  assert.equal(n.colours.accent1, d.colours.accent1, 'invalid colour falls back');
  assert.equal(n.colours.text, d.colours.text, '3-digit hex is not accepted');
  assert.equal(n.colours.bogus, undefined);
  assert.equal(n.extra, undefined);
});

test('blank names fall back; long names are capped', () => {
  const n = B.normalizeBranding({ appName: '   ', defaultTitle: 'x'.repeat(500) });
  assert.equal(n.appName, 'Pub Quiz Scoring');
  assert.equal(n.defaultTitle.length, 80);
});

test('image filenames are validated (no paths, only image types)', () => {
  const n = B.normalizeBranding({ images: { crest: 'crest.png', wordmark: '../../etc/passwd', icon: 'x.exe' } });
  assert.equal(n.images.crest, 'crest.png');
  assert.equal(n.images.wordmark, null);
  assert.equal(n.images.icon, null);
});

test('cssVars maps every colour to a custom property', () => {
  const v = B.cssVars(B.defaultBranding());
  assert.equal(v['--bg'], B.defaultBranding().colours.bg);
  assert.ok(v['--accent-1'] && v['--line'] && v['--bg-deep'] && v['--bg-mid'] && v['--text'] && v['--muted']);
});

test('contrastRatio', () => {
  assert.ok(Math.abs(B.contrastRatio('#000000', '#ffffff') - 21) < 0.01);
  assert.equal(B.contrastRatio('#123456', '#123456'), 1);
  assert.equal(B.contrastRatio('nope', '#ffffff'), 1);
});

test('default quiz title is seedable and resetAll uses the supplied title', () => {
  assert.equal(L.defaultState().title, 'Pub Quiz Night');
  assert.equal(L.defaultState({ title: 'Custom' }).title, 'Custom');
  assert.equal(L.defaultState({ title: '  ' }).title, 'Pub Quiz Night');
  const s = L.reduce(L.defaultState(), { type: 'setTitle', title: 'Changed' });
  assert.equal(L.reduce(s, { type: 'resetAll', title: 'Seeded' }).title, 'Seeded');
  assert.equal(L.reduce(s, { type: 'resetAll' }).title, 'Pub Quiz Night');
});
