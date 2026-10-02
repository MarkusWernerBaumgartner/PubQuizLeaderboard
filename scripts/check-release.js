#!/usr/bin/env node
// Version & changelog consistency.
//   node scripts/check-release.js            -> package.json version is valid semver and has a CHANGELOG entry
//   node scripts/check-release.js v1.2.3     -> additionally, the git tag must equal v<package.json version>
//   node scripts/check-release.js --notes 1.2.3 -> print that version's changelog section (used for release notes)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

const readVersion = () => JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const readChangelog = () => fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');

function notes(version, changelog = readChangelog()) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
  if (start === -1) return null;
  let end = lines.findIndex((l, i) => i > start && (l.startsWith('## [') || /^\[[^\]]+\]: /.test(l)));
  if (end === -1) end = lines.length;
  return lines.slice(start + 1, end).join('\n').trim();
}

// Returns a list of problems (empty when everything is consistent).
function check({ version = readVersion(), changelog = readChangelog(), tag } = {}) {
  const problems = [];
  if (!SEMVER.test(version)) problems.push(`package.json version "${version}" is not valid semver`);
  const body = notes(version, changelog);
  if (body === null) problems.push(`CHANGELOG.md has no "## [${version}]" section`);
  else if (!body) problems.push(`CHANGELOG.md section for ${version} is empty`);
  if (tag !== undefined && tag !== `v${version}`) problems.push(`git tag "${tag}" does not match package.json version "v${version}"`);
  return problems;
}

module.exports = { SEMVER, notes, check };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--notes') {
    const body = notes(args[1] || readVersion());
    if (!body) { console.error('No changelog notes found'); process.exit(1); }
    console.log(body);
  } else {
    const problems = check({ tag: args[0] });
    if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
    console.log(`Version ${readVersion()} OK`);
  }
}
