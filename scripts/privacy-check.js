#!/usr/bin/env node
// Fails if any file git would add contains a term listed in local/privacy-terms.txt
// (a gitignored file, one case-insensitive term per line; '#' starts a comment).
// The LICENSE file, package-lock.json (hashes) and package.json's "author" line are exempt. Does not commit or push.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const termsFile = path.join(root, 'local', 'privacy-terms.txt');
if (!fs.existsSync(termsFile)) {
  console.error('No local/privacy-terms.txt found. Create it with one term per line (names, college, email, home path…).');
  process.exit(2);
}
const terms = fs.readFileSync(termsFile, 'utf8').split('\n').map((t) => t.trim()).filter((t) => t && !t.startsWith('#')).map((t) => t.toLowerCase());
const files = execSync('git ls-files -co --exclude-standard', { cwd: root }).toString().split('\n').filter(Boolean);
const BINARY = /\.(png|jpe?g|webp|woff2?|ico|7z|zip)$/i;

const hits = [];
for (const f of files) {
  if (f === 'LICENSE' || f === 'package-lock.json' || BINARY.test(f) || !fs.existsSync(path.join(root, f))) continue;
  fs.readFileSync(path.join(root, f), 'utf8').split('\n').forEach((line, i) => {
    if (f === 'package.json' && line.includes('"author"')) return;
    const low = line.toLowerCase();
    for (const t of terms) if (low.includes(t)) hits.push(`${f}:${i + 1}: contains "${t}"`);
  });
}
console.log(`Checked ${files.length} files against ${terms.length} terms.`);
if (hits.length) { console.error(hits.join('\n')); console.error(`\n${hits.length} privacy hit(s).`); process.exit(1); }
console.log('Privacy check passed.');
