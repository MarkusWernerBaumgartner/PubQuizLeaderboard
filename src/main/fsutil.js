// Small filesystem helpers shared by the stores.
const fs = require('fs');

// Write to a temp file in the same directory, flush it to disk, then rename over the target,
// so a crash can never leave a half-written file.
function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    const fd = fs.openSync(tmp, 'w');
    try { fs.writeSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(tmp, file);
  } catch (e) {
    try { fs.rmSync(tmp, { force: true }); } catch (_) { /* ignore */ }
    throw e;
  }
}

// Run a write and report { savedAt, error } instead of throwing.
function attempt(fn) {
  try { fn(); return { savedAt: Date.now(), error: null }; } catch (e) { return { savedAt: null, error: e.message }; }
}

module.exports = { writeAtomic, attempt };
