// Pure branding model: defaults, validation and CSS variable mapping.
// UMD so it loads in Node (main process, tests) and in renderers via <script>.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QuizBranding = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const COLOUR_KEYS = ['bg', 'bgDeep', 'bgMid', 'line', 'accent1', 'accent2', 'accent3', 'accent4', 'text', 'muted'];
  const IMAGE_KEYS = ['crest', 'wordmark', 'icon'];
  const CSS_NAMES = {
    bg: '--bg', bgDeep: '--bg-deep', bgMid: '--bg-mid', line: '--line',
    accent1: '--accent-1', accent2: '--accent-2', accent3: '--accent-3', accent4: '--accent-4',
    text: '--text', muted: '--muted',
  };
  const HEX = /^#[0-9a-f]{6}$/i;
  const IMAGE_FILE = /^[A-Za-z0-9._-]{1,80}\.(png|jpe?g|svg|webp)$/i;
  const MAX_TEXT = 80;

  function defaultBranding() {
    return {
      version: 1,
      appName: 'Pub Quiz Scoring',
      defaultTitle: 'Pub Quiz Night',
      colours: {
        bg: '#1a1b4b', bgDeep: '#0c0d2b', bgMid: '#2d2f7a', line: '#4c54c9',
        accent1: '#ffc83d', accent2: '#ff6b6b', accent3: '#4ecdc4', accent4: '#a78bfa',
        text: '#f6f8ff', muted: '#a9b0e0',
      },
      images: { crest: null, wordmark: null, icon: null },
    };
  }

  const text = (v, fallback) => {
    const t = typeof v === 'string' ? v.trim().slice(0, MAX_TEXT) : '';
    return t || fallback;
  };

  // Accepts anything (e.g. parsed from disk or a preset file); always returns a complete, valid object.
  function normalizeBranding(obj) {
    const d = defaultBranding();
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return d;
    const colours = {};
    const src = obj.colours && typeof obj.colours === 'object' ? obj.colours : {};
    for (const k of COLOUR_KEYS) colours[k] = typeof src[k] === 'string' && HEX.test(src[k]) ? src[k].toLowerCase() : d.colours[k];
    const images = {};
    const isrc = obj.images && typeof obj.images === 'object' ? obj.images : {};
    for (const k of IMAGE_KEYS) images[k] = typeof isrc[k] === 'string' && IMAGE_FILE.test(isrc[k]) ? isrc[k] : null;
    return { version: 1, appName: text(obj.appName, d.appName), defaultTitle: text(obj.defaultTitle, d.defaultTitle), colours, images };
  }

  function cssVars(b) {
    const out = {};
    for (const k of COLOUR_KEYS) out[CSS_NAMES[k]] = b.colours[k];
    return out;
  }

  function luminance(hex) {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  // WCAG contrast ratio; returns 1 for invalid input.
  function contrastRatio(a, b) {
    if (!HEX.test(a) || !HEX.test(b)) return 1;
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }

  return { COLOUR_KEYS, IMAGE_KEYS, CSS_NAMES, IMAGE_FILE, defaultBranding, normalizeBranding, cssVars, contrastRatio };
});
