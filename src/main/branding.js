// Owns the branding config (identity: names, colours, images). Kept apart from quiz data so
// "Reset everything" never touches it and it never lives inside the repository.
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const B = require('../shared/branding');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp' };
const extOf = (f) => path.extname(f).slice(1).toLowerCase();

class BrandingStore extends EventEmitter {
  constructor(dir) {
    super();
    this.file = path.join(dir, 'branding.json');
    this.assets = path.join(dir, 'branding-assets');
    fs.mkdirSync(this.assets, { recursive: true });
    this.branding = this._load();
  }

  _load() {
    try { return B.normalizeBranding(JSON.parse(fs.readFileSync(this.file, 'utf8'))); } catch (e) { return B.defaultBranding(); }
  }

  _save() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.branding, null, 2));
    fs.renameSync(tmp, this.file);
    this._prune();
    this.emit('change', this.payload());
  }

  // Delete asset files no longer referenced.
  _prune() {
    const keep = new Set(Object.values(this.branding.images).filter(Boolean));
    for (const f of fs.readdirSync(this.assets)) if (!keep.has(f)) fs.rmSync(path.join(this.assets, f), { force: true });
  }

  _dataUri(file) {
    if (!file) return null;
    try { return `data:${MIME[extOf(file)]};base64,${fs.readFileSync(path.join(this.assets, file)).toString('base64')}`; } catch (e) { return null; }
  }

  // What renderers receive: the config plus ready-to-use image data URIs.
  payload() {
    const images = {};
    for (const k of B.IMAGE_KEYS) images[k] = this._dataUri(this.branding.images[k]);
    return { branding: this.branding, images };
  }

  iconPath() {
    const f = this.branding.images.icon;
    return f && fs.existsSync(path.join(this.assets, f)) ? path.join(this.assets, f) : null;
  }

  getDefaultTitle() { return this.branding.defaultTitle; }

  // Text and colour edits; merged then re-validated so bad values fall back to the previous/default.
  set(patch) {
    const cur = this.branding;
    const merged = {
      ...cur,
      ...(patch.appName !== undefined ? { appName: patch.appName } : {}),
      ...(patch.defaultTitle !== undefined ? { defaultTitle: patch.defaultTitle } : {}),
      colours: { ...cur.colours, ...(patch.colours || {}) },
    };
    this.branding = B.normalizeBranding(merged);
    this._save();
  }

  _checkImage(kind, src) {
    if (!B.IMAGE_KEYS.includes(kind)) throw new Error('Unknown image slot');
    const ext = extOf(src);
    if (!MIME[ext]) throw new Error('Use a PNG, JPG, SVG or WebP image');
    if (kind === 'icon' && !['png', 'jpg', 'jpeg'].includes(ext)) throw new Error('The window icon must be a PNG or JPG');
    const st = fs.statSync(src);
    if (!st.isFile()) throw new Error('Not a file');
    if (st.size > MAX_IMAGE_BYTES) throw new Error('Image is larger than 5 MB');
    return ext;
  }

  setImage(kind, src) {
    const ext = this._checkImage(kind, src);
    const name = `${kind}-${Date.now()}.${ext}`;
    fs.copyFileSync(src, path.join(this.assets, name));
    this.branding = { ...this.branding, images: { ...this.branding.images, [kind]: name } };
    this._save();
  }

  clearImage(kind) {
    if (!B.IMAGE_KEYS.includes(kind)) throw new Error('Unknown image slot');
    this.branding = { ...this.branding, images: { ...this.branding.images, [kind]: null } };
    this._save();
  }

  reset() {
    this.branding = B.defaultBranding();
    this._save();
  }

  // A preset is a folder holding branding.json plus the image files it names.
  importPreset(dir) {
    let raw;
    try { raw = JSON.parse(fs.readFileSync(path.join(dir, 'branding.json'), 'utf8')); } catch (e) { throw new Error('That folder has no valid branding.json'); }
    const next = B.normalizeBranding(raw);
    const stamp = Date.now();
    for (const kind of B.IMAGE_KEYS) {
      const f = next.images[kind];
      if (!f) continue;
      try {
        const src = path.join(dir, f);
        const ext = this._checkImage(kind, src);
        const name = `${kind}-${stamp}.${ext}`;
        fs.copyFileSync(src, path.join(this.assets, name));
        next.images[kind] = name;
      } catch (e) { next.images[kind] = null; }
    }
    this.branding = next;
    this._save();
  }

  exportPreset(parentDir) {
    const dir = path.join(parentDir, 'branding-preset');
    fs.mkdirSync(dir, { recursive: true });
    const out = { ...this.branding, images: { ...this.branding.images } };
    for (const kind of B.IMAGE_KEYS) {
      const f = this.branding.images[kind];
      if (!f) continue;
      const name = `${kind}.${extOf(f)}`;
      fs.copyFileSync(path.join(this.assets, f), path.join(dir, name));
      out.images[kind] = name;
    }
    fs.writeFileSync(path.join(dir, 'branding.json'), JSON.stringify(out, null, 2));
    return dir;
  }
}

module.exports = { BrandingStore };
