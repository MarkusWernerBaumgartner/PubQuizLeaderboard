// Number count-up helper shared by renderers.
(function () {
  const fmt = (n) => (Math.round(n * 100) / 100).toString();
  const running = new WeakMap();
  function countTo(el, to, ms = 900) {
    const from = Number(el.dataset.v ?? 0);
    el.dataset.v = String(to);
    if (running.has(el)) cancelAnimationFrame(running.get(el));
    if (from === to || !Effects.on('scores.countUp')) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) running.set(el, requestAnimationFrame(step)); else running.delete(el);
    };
    running.set(el, requestAnimationFrame(step));
  }
  window.Anim = { countTo, fmt };
})();
