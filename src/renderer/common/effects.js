// Applies the user's animation/celebration preferences to the current page and keeps them live.
// CSS is gated through fx-off-* classes on <html>; JavaScript effects ask Effects.on('flag').
(function () {
  const E = window.QuizEffects;
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false, addEventListener() {} };
  let settings = E.defaultEffects();
  let resolved = E.resolveEffects(settings, {});
  const listeners = [];

  function apply(s) {
    settings = E.normalizeEffects(s && s.effects);
    resolved = E.resolveEffects(settings, { systemReducedMotion: reduced.matches });
    const html = document.documentElement;
    for (const c of [...html.classList]) if (c.startsWith('fx-off-')) html.classList.remove(c);
    E.htmlClasses(resolved).forEach((c) => html.classList.add(c));
    listeners.forEach((cb) => cb(settings));
  }

  window.Effects = {
    on: (flag) => resolved.flags[flag] !== false,
    confettiScale: () => E.confettiScale(resolved),
    get settings() { return settings; },
    onChange(cb) { listeners.push(cb); },
  };
  if (reduced.addEventListener) reduced.addEventListener('change', () => apply({ effects: settings }));
  window.quiz.getSettings().then(apply);
  window.quiz.onSettingsChange(apply);
})();
