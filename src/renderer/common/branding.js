// Applies the active branding (colours, crest, wordmark, names) to the current page and keeps it live.
(function () {
  const B = window.QuizBranding;
  const page = document.documentElement.dataset.page || '';
  let current = null;
  const listeners = [];

  function apply(payload) {
    const { branding, images } = payload;
    current = payload;
    const root = document.documentElement;
    for (const [k, v] of Object.entries(B.cssVars(branding))) root.style.setProperty(k, v);
    document.querySelectorAll('[data-brand="crest"]').forEach((img) => { img.src = images.crest || 'assets/default-crest.svg'; });
    document.querySelectorAll('[data-brand="wordmark"]').forEach((img) => {
      img.hidden = !images.wordmark;
      if (images.wordmark) img.src = images.wordmark;
    });
    document.querySelectorAll('[data-brand="wordmark-fallback"]').forEach((el) => { el.hidden = !!images.wordmark; el.textContent = branding.appName; });
    document.querySelectorAll('[data-brand="appname"]').forEach((el) => { el.textContent = branding.appName; });
    document.title = page ? `${branding.appName} – ${page}` : branding.appName;
    root.classList.add('branded');
    listeners.forEach((cb) => cb(payload));
  }

  window.Branding = {
    get current() { return current; },
    onApply(cb) { listeners.push(cb); if (current) cb(current); },
  };
  window.quiz.getBranding().then(apply);
  window.quiz.onBrandingChange(apply);
  setTimeout(() => document.documentElement.classList.add('branded'), 1500); // never leave the page hidden
})();
