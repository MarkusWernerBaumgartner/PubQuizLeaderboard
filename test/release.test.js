const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../scripts/check-release');

const LOG = `# Changelog

## [Unreleased]

### Added
- Something new

## [1.2.0] - 2026-01-02

### Fixed
- A bug

## [1.1.0] - 2026-01-01

- Older

[Unreleased]: https://example.invalid/compare
`;

test('repository version and changelog are consistent', () => {
  assert.deepEqual(R.check(), []);
});

test('notes extracts only the requested section', () => {
  assert.equal(R.notes('1.2.0', LOG), '### Fixed\n- A bug');
  assert.equal(R.notes('1.1.0', LOG), '- Older');
  assert.equal(R.notes('9.9.9', LOG), null);
});

test('check flags bad semver, missing/empty changelog entries and tag mismatch', () => {
  assert.match(R.check({ version: '1.2', changelog: LOG })[0], /not valid semver/);
  assert.match(R.check({ version: '2.0.0', changelog: LOG }).join(), /no "## \[2\.0\.0\]"/);
  assert.match(R.check({ version: '1.2.0', changelog: '## [1.2.0] - x\n\n## [1.1.0]\n- a' }).join(), /empty/);
  assert.deepEqual(R.check({ version: '1.2.0', changelog: LOG, tag: 'v1.2.0' }), []);
  assert.match(R.check({ version: '1.2.0', changelog: LOG, tag: 'v1.3.0' }).join(), /does not match/);
});

test('semver accepts pre-release and rejects garbage', () => {
  for (const ok of ['1.0.0', '10.20.30', '1.0.0-rc.1']) assert.ok(R.SEMVER.test(ok), ok);
  for (const bad of ['1.0', 'v1.0.0', '1.0.0.0', '']) assert.ok(!R.SEMVER.test(bad), bad);
});
