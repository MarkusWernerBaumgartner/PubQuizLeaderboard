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
  exportState: () => ipcRenderer.invoke('data:export'),
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
  quit: () => ipcRenderer.invoke('app:quit'),
});
