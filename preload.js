const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('quiz', {
  getState: () => ipcRenderer.invoke('state:get'),
  dispatch: (action) => ipcRenderer.invoke('state:dispatch', action),
  onChange: (cb) => {
    const handler = (_e, state) => cb(state);
    ipcRenderer.on('state:changed', handler);
    return () => ipcRenderer.removeListener('state:changed', handler);
  },
  openWindow: (kind, opts) => ipcRenderer.invoke('window:open', kind, opts),
  displays: () => ipcRenderer.invoke('displays:list'),
  toggleFullscreen: () => ipcRenderer.invoke('window:fullscreen'),
  saveAs: () => ipcRenderer.invoke('data:saveAs'),
  exportState: () => ipcRenderer.invoke('data:export'),
  unlinkSave: () => ipcRenderer.invoke('data:unlink'),
  getSaveStatus: () => ipcRenderer.invoke('save:get'),
  onSaveChange: (cb) => {
    const handler = (_e, status) => cb(status);
    ipcRenderer.on('save:changed', handler);
    return () => ipcRenderer.removeListener('save:changed', handler);
  },
  loadState: () => ipcRenderer.invoke('data:load'),
  getBranding: () => ipcRenderer.invoke('branding:get'),
  setBranding: (patch) => ipcRenderer.invoke('branding:set', patch),
  pickBrandingImage: (kind) => ipcRenderer.invoke('branding:pickImage', kind),
  clearBrandingImage: (kind) => ipcRenderer.invoke('branding:clearImage', kind),
  resetBranding: () => ipcRenderer.invoke('branding:reset'),
  importBrandingPreset: () => ipcRenderer.invoke('branding:importPreset'),
  exportBrandingPreset: () => ipcRenderer.invoke('branding:exportPreset'),
  onBrandingChange: (cb) => {
    const handler = (_e, payload) => cb(payload);
    ipcRenderer.on('branding:changed', handler);
    return () => ipcRenderer.removeListener('branding:changed', handler);
  },
  onAdminSection: (cb) => ipcRenderer.on('admin:section', (_e, section) => cb(section)),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  applyEffectsPreset: (name) => ipcRenderer.invoke('settings:preset', name),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  previewEffect: (kind) => ipcRenderer.invoke('effects:preview', kind),
  onSettingsChange: (cb) => {
    const handler = (_e, v) => cb(v);
    ipcRenderer.on('settings:changed', handler);
    return () => ipcRenderer.removeListener('settings:changed', handler);
  },
  onEffectPreview: (cb) => ipcRenderer.on('effects:preview', (_e, kind) => cb(kind)),
  timerGet: () => ipcRenderer.invoke('timer:get'),
  timerStart: (seconds) => ipcRenderer.invoke('timer:start', seconds),
  timerStop: () => ipcRenderer.invoke('timer:stop'),
  onTimer: (cb) => {
    const handler = (_e, t) => cb(t);
    ipcRenderer.on('timer:changed', handler);
    return () => ipcRenderer.removeListener('timer:changed', handler);
  },
  appInfo: () => ipcRenderer.invoke('app:info'),
  quit: () => ipcRenderer.invoke('app:quit'),
});
