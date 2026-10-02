// Scenario runner for generating docs media (screenshots, GIF frames) and for headless smoke tests.
// Activated only via PUBQUIZ_DEV_SCENARIO=<scenario.json> (and PUBQUIZ_DEV_OUT=<dir>); never used in normal runs.
//
// Scenario: { "size": [w, h], "windows": ["leaderboard", ...], "actions": [ ... ] } where an action is one of
//   { "wait": ms }                         { "dispatch": <quiz action> }          { "branding": <patch> | "reset" }
//   { "open": kind, "section"?, "size"? }  { "shot": name, "window": kind, "width"? }
//   { "record": name, "window": kind, "fps"?, "width"? }   { "stop": true }
//   { "linkTo": "file.json" }  autosave link (relative to the output dir)      { "crash": true }  SIGKILL, no cleanup
//   { "expect": "teams.length", "equals": 9 }   assert on the quiz state     { "expectLinked": true|false }
// In dispatched actions, "@team:N" / "@round:N" are replaced by the id of the Nth (0-based) team / round.
const fs = require('fs');
const path = require('path');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function resolveRefs(value, state) {
  if (typeof value === 'string') {
    const m = /^@(team|round):(\d+)$/.exec(value);
    if (!m) return value;
    const item = (m[1] === 'team' ? state.teams : state.rounds)[Number(m[2])];
    if (!item) throw new Error(`Scenario reference ${value} does not exist`);
    return item.id;
  }
  if (Array.isArray(value)) return value.map((v) => resolveRefs(v, state));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveRefs(v, state)]));
  return value;
}

async function run(scenarioFile, outDir, ctx) {
  const { app, windows, createWindow, store, branding } = ctx;
  const scenario = JSON.parse(fs.readFileSync(scenarioFile, 'utf8'));
  outDir = path.resolve(outDir || 'media-out');
  fs.mkdirSync(outDir, { recursive: true });
  const [W, H] = scenario.size || [1600, 900];
  const errors = [];
  const watched = new WeakSet();
  let recording = null;

  const open = (kind, opts = {}) => {
    const w = createWindow(kind, opts);
    const [ww, wh] = opts.size || scenario.size || [W, H];
    if (w.isFullScreen()) w.setFullScreen(false);
    w.setBounds({ x: 0, y: 0, width: ww, height: wh });
    if (!watched.has(w)) {
      watched.add(w);
      // Scripted runs must be deterministic: ignore stray keyboard input from a live desktop
      // (the leaderboard treats arrow keys and Space as slideshow controls).
      w.webContents.on('before-input-event', (e) => e.preventDefault());
      w.webContents.on('console-message', (e) => { if (e.level === 'error') errors.push(`[${kind}] ${e.message}`); });
      w.webContents.on('render-process-gone', (_e, d) => errors.push(`[${kind}] renderer gone: ${d.reason}`));
    }
    return w;
  };
  const target = (kind) => {
    const w = windows[kind];
    if (!w || w.isDestroyed()) throw new Error(`No ${kind} window`);
    return w;
  };
  const grab = async (kind, width) => {
    const img = await target(kind).webContents.capturePage();
    return (width ? img.resize({ width, quality: 'good' }) : img).toPNG();
  };

  async function startRecording(name, kind, fps = 10, width = 800) {
    const dir = path.join(outDir, name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const rec = { name, dir, frames: [], stop: false };
    rec.loop = (async () => {
      while (!rec.stop) {
        const t0 = Date.now();
        const png = await grab(kind, width);
        rec.frames.push({ t: t0, png });
        await wait(Math.max(0, 1000 / fps - (Date.now() - t0)));
      }
    })();
    recording = rec;
  }
  async function stopRecording() {
    const rec = recording;
    if (!rec) return;
    rec.stop = true;
    await rec.loop;
    recording = null;
    // concat-demuxer list with real inter-frame durations so playback speed matches real time
    const lines = [];
    rec.frames.forEach((f, i) => {
      const file = `f${String(i).padStart(4, '0')}.png`;
      fs.writeFileSync(path.join(rec.dir, file), f.png);
      const next = rec.frames[i + 1];
      lines.push(`file '${file}'`, `duration ${(((next ? next.t : f.t + 100) - f.t) / 1000).toFixed(3)}`);
    });
    lines.push(`file 'f${String(rec.frames.length - 1).padStart(4, '0')}.png'`);
    fs.writeFileSync(path.join(rec.dir, 'concat.txt'), lines.join('\n') + '\n');
  }

  try {
    if (windows.launcher) windows.launcher.hide();
    for (const kind of scenario.windows || []) open(kind);
    await wait(2000);
    for (const a of scenario.actions || []) {
      if (a.wait !== undefined) await wait(a.wait);
      else if (a.dispatch) { const r = store.dispatch(resolveRefs(a.dispatch, store.getState())); if (!r.ok) errors.push(`[scenario] action rejected: ${JSON.stringify(a.dispatch)}`); }
      else if (a.branding) { if (a.branding === 'reset') branding.reset(); else branding.set(a.branding); }
      else if (a.open) { open(a.open, { section: a.section, size: a.size }); await wait(a.settle || 1200); }
      else if (a.shot) fs.writeFileSync(path.join(outDir, `${a.shot}.png`), await grab(a.window, a.width));
      else if (a.linkTo) { const r = store.linkTo(path.resolve(outDir, a.linkTo)); if (!r.ok) errors.push(`[scenario] linkTo failed: ${r.error}`); }
      else if (a.crash) process.kill(process.pid, 'SIGKILL');
      else if (a.expect) {
        const got = a.expect.split('.').reduce((o, k) => (o == null ? o : o[k]), store.getState());
        if (JSON.stringify(got) !== JSON.stringify(a.equals)) errors.push(`[expect] ${a.expect} = ${JSON.stringify(got)}, wanted ${JSON.stringify(a.equals)}`);
      } else if ('expectLinked' in a) { if (!!store.saveStatus().path !== a.expectLinked) errors.push(`[expect] linked = ${!!store.saveStatus().path}, wanted ${a.expectLinked}`); }
      else if (a.record) await startRecording(a.record, a.window, a.fps, a.width);
      else if (a.stop) await stopRecording();
    }
    await stopRecording();
  } catch (e) {
    errors.push(`[scenario] ${e.message}`);
  }
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ ok: errors.length === 0, errors }, null, 2));
  app.exit(errors.length ? 1 : 0);
}

module.exports = { run };
