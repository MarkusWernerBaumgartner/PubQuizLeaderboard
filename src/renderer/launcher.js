(async function () {
  const state = await window.quiz.getState();
  document.getElementById('title').textContent = state.title;
  window.quiz.onChange((s) => { document.getElementById('title').textContent = s.title; });

  const displays = await window.quiz.displays();
  const sel = document.getElementById('display');
  if (displays.length > 1) {
    document.getElementById('display-pick').hidden = false;
    for (const d of displays) {
      const o = document.createElement('option');
      o.value = d.id; o.textContent = d.label;
      sel.appendChild(o);
    }
    // Default to a non-primary display (the projector) when there is one.
    const other = displays.find((d) => !d.primary);
    if (other) sel.value = other.id;
  }

  document.getElementById('open-board').onclick = () =>
    window.quiz.openWindow('leaderboard', displays.length > 1 ? { displayId: Number(sel.value) } : {});
  document.getElementById('open-admin').onclick = () => window.quiz.openWindow('admin');
  document.getElementById('open-branding').onclick = () => window.quiz.openWindow('admin', { section: 'branding' });
})();
