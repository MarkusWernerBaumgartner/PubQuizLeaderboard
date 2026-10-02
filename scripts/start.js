#!/usr/bin/env node
// `npm start`: run the app. --no-sandbox is added on Linux only (the setuid chrome-sandbox helper is not
// available for locally installed Electron); on Windows and macOS the Chromium sandbox stays on.
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const args = [root, ...(process.platform === 'linux' ? ['--no-sandbox'] : []), ...process.argv.slice(2)];
const child = spawn(require(path.join(root, 'node_modules', 'electron')), args, { stdio: 'inherit' });
child.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 0));
