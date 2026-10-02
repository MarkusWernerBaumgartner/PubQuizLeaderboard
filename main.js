const { app, BrowserWindow, ipcMain, screen, dialog, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const { Store } = require('./src/main/store');
const { BrandingStore } = require('./src/main/branding');
const B = require('./src/shared/branding');
const L = require('./src/shared/logic');

app.setName('pubquiz-scoring');
if (!app.requestSingleInstanceLock()) app.quit();

let store;
let branding;
const DEFAULT_ICON = path.join(__dirname, 'build', 'icon.png');
const windows = {}; // kind -> BrowserWindow

const PAGES = { launcher: 'launcher.html', admin: 'admin.html', leaderboard: 'leaderboard.html' };

function createWindow(kind, opts = {}) {
  const existing = windows[kind];
  if (existing && !existing.isDestroyed()) {
    if (kind === 'leaderboard' && opts.displayId !== undefined) placeOnDisplay(existing, opts.displayId);
    if (kind === 'admin' && opts.section) existing.webContents.send('admin:section', opts.section);
    existing.show();
    existing.focus();
    return existing;
  }
  const win = new BrowserWindow({
    width: kind === 'launcher' ? 1000 : 1280,
    height: kind === 'launcher' ? 680 : 800,
    backgroundColor: '#002147',
    title: 'Pub Quiz',
    icon: branding.iconPath() || DEFAULT_ICON,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  windows[kind] = win;
  win.loadFile(path.join(__dirname, 'src', 'renderer', PAGES[kind]), kind === 'admin' && opts.section ? { query: { section: opts.section } } : undefined);
  win.once('ready-to-show', () => {
    if (kind === 'leaderboard' && opts.displayId !== undefined) placeOnDisplay(win, opts.displayId);
    else if (kind === 'admin') win.maximize();
    win.show();
  });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); event.preventDefault(); }
    else if (input.key === 'Escape' && win.isFullScreen()) { win.setFullScreen(false); event.preventDefault(); }
  });
  win.on('closed', () => { delete windows[kind]; });
  return win;
}

function placeOnDisplay(win, displayId) {
  const d = screen.getAllDisplays().find((x) => x.id === displayId) || screen.getPrimaryDisplay();
  if (win.isFullScreen()) win.setFullScreen(false);
  win.setBounds(d.bounds);
  win.setFullScreen(true);
}

function broadcast(state) {
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('state:changed', state);
}

function parentFor(e) { return BrowserWindow.fromWebContents(e.sender) || undefined; }

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  branding = new BrandingStore(app.getPath('userData'));
  store = new Store(app.getPath('userData'), () => branding.getDefaultTitle());
  store.on('change', broadcast);
  branding.on('change', (payload) => {
    for (const w of BrowserWindow.getAllWindows()) {
      if (w.isDestroyed()) continue;
      w.webContents.send('branding:changed', payload);
      w.setIcon(branding.iconPath() || DEFAULT_ICON);
    }
  });

  ipcMain.handle('state:get', () => store.getState());
  ipcMain.handle('state:dispatch', (_e, action) => store.dispatch(action));
  ipcMain.handle('window:open', (_e, kind, opts) => { if (PAGES[kind]) createWindow(kind, opts || {}); });
  ipcMain.handle('displays:list', () => {
    const primary = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((d, i) => ({
      id: d.id, label: `Display ${i + 1} (${d.size.width}×${d.size.height})${d.id === primary ? ' – primary' : ''}`, primary: d.id === primary,
    }));
  });
  ipcMain.handle('window:fullscreen', (e) => { const w = parentFor(e); if (w) w.setFullScreen(!w.isFullScreen()); });
  // ---- branding ----
  const brandingAction = (fn) => async (e, ...args) => {
    try { await fn(e, ...args); return { ok: true, payload: branding.payload() }; }
    catch (err) { return { ok: false, error: err.message }; }
  };
  ipcMain.handle('branding:get', () => branding.payload());
  ipcMain.handle('branding:set', brandingAction((_e, patch) => branding.set(patch || {})));
  ipcMain.handle('branding:clearImage', brandingAction((_e, kind) => branding.clearImage(kind)));
  ipcMain.handle('branding:reset', brandingAction(() => branding.reset()));
  ipcMain.handle('branding:pickImage', async (e, kind) => {
    if (!B.IMAGE_KEYS.includes(kind)) return { ok: false, error: 'Unknown image slot' };
    const r = await dialog.showOpenDialog(parentFor(e), {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: kind === 'icon' ? ['png', 'jpg', 'jpeg'] : ['png', 'jpg', 'jpeg', 'svg', 'webp'] }],
    });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    return brandingAction(() => branding.setImage(kind, r.filePaths[0]))(e);
  });
  ipcMain.handle('branding:importPreset', async (e) => {
    const r = await dialog.showOpenDialog(parentFor(e), { properties: ['openDirectory'], title: 'Choose a branding preset folder (contains branding.json)' });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    return brandingAction(() => branding.importPreset(r.filePaths[0]))(e);
  });
  ipcMain.handle('branding:exportPreset', async (e) => {
    const r = await dialog.showOpenDialog(parentFor(e), { properties: ['openDirectory', 'createDirectory'], title: 'Choose where to save the preset folder' });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    try { return { ok: true, path: branding.exportPreset(r.filePaths[0]) }; } catch (err) { return { ok: false, error: err.message }; }
  });
  ipcMain.handle('app:quit', () => app.quit());

  ipcMain.handle('data:export', async (e) => {
    const r = await dialog.showSaveDialog(parentFor(e), {
      defaultPath: `pubquiz-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Quiz JSON', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    try { fs.writeFileSync(r.filePath, JSON.stringify(store.getState(), null, 2)); return { ok: true, path: r.filePath }; }
    catch (err) { return { ok: false, error: err.message }; }
  });

  ipcMain.handle('data:load', async (e) => {
    const r = await dialog.showOpenDialog(parentFor(e), { properties: ['openFile'], filters: [{ name: 'Quiz JSON', extensions: ['json'] }] });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    try {
      const parsed = L.normalizeState(JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8')));
      return store.dispatch({ type: 'load', state: parsed });
    } catch (err) { return { ok: false, error: err.message }; }
  });

  createWindow('launcher');
  if (process.env.PUBQUIZ_DEV_SHOTS) devShots(process.env.PUBQUIZ_DEV_SHOTS);
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow('launcher'); });
});

app.on('second-instance', () => { const w = windows.launcher || Object.values(windows)[0]; if (w) { w.show(); w.focus(); } });
app.on('before-quit', () => { if (store) { try { store.flush(); } catch (e) { /* ignore */ } } });
app.on('window-all-closed', () => app.quit());

// Dev helper: PUBQUIZ_DEV_SHOTS=<dir>[:kinds] opens windows, saves screenshots, then quits.
// Optional PUBQUIZ_DEV_STEPS="act1;act2" runs JSON dispatch actions (between shots) to capture states.
function devShots(spec) {
  const [dir, kinds = 'launcher,admin,leaderboard'] = spec.split(':');
  fs.mkdirSync(dir, { recursive: true });
  const steps = (process.env.PUBQUIZ_DEV_STEPS || '').split(';').filter(Boolean).map((x) => JSON.parse(x));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    for (const k of kinds.split(',')) {
      const w = createWindow(k, k === 'admin' && process.env.PUBQUIZ_DEV_SECTION ? { section: process.env.PUBQUIZ_DEV_SECTION } : {});
      w.setBounds({ x: 0, y: 0, width: 1920, height: 1080 });
      w.webContents.on('console-message', (_e, _l, msg) => console.log(`[${k}]`, msg));
    }
    await wait(2500);
    const shot = async (tag) => {
      for (const [k, w] of Object.entries(windows)) {
        const img = await w.webContents.capturePage();
        fs.writeFileSync(path.join(dir, `${k}-${tag}.png`), img.toPNG());
      }
    };
    await shot('0');
    let i = 1;
    for (const a of steps) { if (a.branding) branding.set(a.branding); else store.dispatch(a); await wait(Number(process.env.PUBQUIZ_DEV_WAIT || 2200)); await shot(String(i++)); }
    app.quit();
  })();
}
