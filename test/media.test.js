const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/shared/logic');

const q = (text, correct = null) => ({ text, options: ['a', 'b', 'c', 'd'], correct });

test('parseMedia recognises images and YouTube links', () => {
  assert.deepEqual(L.parseMedia('https://example.com/a/b.GIF?x=1'), { kind: 'image', src: 'https://example.com/a/b.GIF?x=1' });
  assert.equal(L.parseMedia('https://example.com/pic.png').kind, 'image');
  for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?t=43',
    'https://youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x']) {
    const m = L.parseMedia(u);
    assert.equal(m.kind, 'youtube', u);
    assert.match(m.src, /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
  }
  assert.match(L.parseMedia('https://youtu.be/dQw4w9WgXcQ?t=43').src, /start=43/);
  for (const bad of ['', '   ', null, undefined, 'javascript:alert(1)', 'http://evil.com/x.png', 'https://example.com/page', 'ftp://x/y.png', 'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/short'])
    assert.equal(L.parseMedia(bad), null, String(bad));
});

test('questions keep an optional media link', () => {
  let s = L.reduce(L.defaultState(), { type: 'setRounds', rounds: [{ name: 'R1', maxScore: 10 }] });
  const r = s.rounds[0].id;
  s = L.reduce(s, { type: 'setQuestions', roundId: r, questions: [{ ...q('x', 1), media: '  https://example.com/a.gif ' }, q('y')] });
  assert.equal(s.rounds[0].questions[0].media, 'https://example.com/a.gif');
  assert.equal(s.rounds[0].questions[1].media, '');
  assert.equal(L.reduce(s, { type: 'setQuestions', roundId: r, questions: [{ ...q('x'), media: 5 }] }), s);
  assert.equal(L.normalizeState(JSON.parse(JSON.stringify(s))).rounds[0].questions[0].media, 'https://example.com/a.gif');
});
