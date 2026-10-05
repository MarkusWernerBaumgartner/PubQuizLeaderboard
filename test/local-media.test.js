const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/shared/logic');
test('local quiz images are accepted; unsafe file types and remote file hosts are rejected', () => {
  const src = 'file:///home/markus/Documents/BMCR-Quiz/media/E02.png';
  assert.deepEqual(L.parseMedia(src), {kind:'image', src});
  assert.equal(L.parseMedia('file:///tmp/answer%20image.svg').kind, 'image');
  for (const value of ['file:///tmp/page.html', 'file:///tmp/script.js', 'file://remote/share/pic.png', 'javascript:alert(1)']) assert.equal(L.parseMedia(value), null);
  assert.equal(L.parseMedia('https://www.youtube.com/watch?v=mt2qCjL6-n4').kind, 'youtube');
});
