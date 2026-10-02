#!/usr/bin/env node
// Build a distributable that uses the app icon from a LOCAL (gitignored) preset instead of the neutral one:
//   npm run dist:local                       -> local/preset/icon.png, Linux AppImage
//   npm run dist:local -- <preset-dir>       -> use another preset folder
//   npm run dist:local -- --win | --mac      -> pass platform flags through to electron-builder
// Output goes to dist-local/ (gitignored). Public and CI builds (`npm run dist`) keep the neutral icon.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const presetArg = args.find((a) => !a.startsWith('-'));
const preset = path.resolve(root, presetArg || path.join('local', 'preset'));
const flags = args.filter((a) => a.startsWith('-'));
const icon = path.join(preset, 'icon.png');

if (!fs.existsSync(icon)) { console.error(`No icon.png in ${preset}. Pass a preset folder that contains one.`); process.exit(1); }
const head = fs.readFileSync(icon).subarray(0, 24);
const w = head.readUInt32BE(16), h = head.readUInt32BE(20);
if (head.toString('latin1', 1, 4) !== 'PNG' || w < 256 || h < 256) { console.error(`icon.png must be a PNG of at least 256×256 (got ${w}×${h}).`); process.exit(1); }

const platform = flags.length ? flags : ['--linux', 'AppImage'];
const r = spawnSync(process.execPath, [
  path.join(root, 'node_modules', 'electron-builder', 'cli.js'), ...platform, '--publish', 'never',
  `-c.linux.icon=${icon}`, `-c.mac.icon=${icon}`, `-c.win.icon=${icon}`, '-c.directories.output=dist-local',
], { stdio: 'inherit', cwd: root });
if (r.status === 0) console.log(`\nBuilt with icon ${path.relative(root, icon)} → dist-local/`);
process.exit(r.status ?? 1);
