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
  store.on('save', (status) => { for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('save:changed', status); });
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
  ipcMain.handle('app:info', () => ({ version: app.getVersion() }));
  ipcMain.handle('app:quit', () => app.quit());

  // ---- saving & loading ----
  // Files inside the app's own folder (e.g. the bundled sample) are loaded but never auto-written.
  const isInsideApp = (file) => { const rel = path.relative(__dirname, file); return !rel.startsWith('..') && !path.isAbsolute(rel); };
  const jsonFilter = [{ name: 'Quiz JSON', extensions: ['json'] }];
  const suggestName = () => path.join(app.getPath('documents'), `pubquiz-${new Date().toISOString().slice(0, 10)}.json`);

  ipcMain.handle('save:get', () => store.saveStatus());
  ipcMain.handle('data:saveAs', async (e) => {
    const r = await dialog.showSaveDialog(parentFor(e), { title: 'Save quiz as… (changes will autosave to this file)', defaultPath: store.saveStatus().path || suggestName(), filters: jsonFilter });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    const file = r.filePath.toLowerCase().endsWith('.json') ? r.filePath : r.filePath + '.json';
    const res = store.linkTo(file);
    return res.ok ? { ok: true, path: file } : res;
  });
  ipcMain.handle('data:export', async (e) => {
    const r = await dialog.showSaveDialog(parentFor(e), { title: 'Export a copy', defaultPath: suggestName(), filters: jsonFilter });
    if (r.canceled || !r.filePath) return { ok: false, canceled: true };
    const res = store.exportTo(r.filePath);
    return res.ok ? { ok: true, path: r.filePath } : res;
  });
  ipcMain.handle('data:load', async (e) => {
    const r = await dialog.showOpenDialog(parentFor(e), { properties: ['openFile'], filters: jsonFilter });
    if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
    return store.loadFrom(r.filePaths[0], { link: !isInsideApp(r.filePaths[0]) });
  });
  ipcMain.handle('data:unlink', () => { store.unlink(); return { ok: true }; });

  createWindow('launcher');
  if (process.env.PUBQUIZ_DEV_SCENARIO) {
    // Scripted run for docs media and CI smoke tests (see scripts/media, scripts/ci).
    require('./src/main/dev-capture').run(process.env.PUBQUIZ_DEV_SCENARIO, process.env.PUBQUIZ_DEV_OUT, { app, windows, createWindow, store, branding });
  }
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow('launcher'); });
});

app.on('second-instance', () => { const w = windows.launcher || Object.values(windows)[0]; if (w) { w.show(); w.focus(); } });
app.on('before-quit', () => { if (store) { try { store.flush(); } catch (e) { /* ignore */ } } });
app.on('window-all-closed', () => app.quit());
