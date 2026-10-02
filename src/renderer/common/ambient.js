// Fills a .ambient container with drifting coloured blobs.
(function () {
  const el = document.querySelector('.ambient');
  if (!el) return;
  const colours = ['var(--accent-1)', 'var(--accent-2)', 'var(--accent-3)', 'var(--accent-4)', 'var(--line)'];
  for (let i = 0; i < 14; i++) {
    const b = document.createElement('i');
    const size = 60 + Math.random() * 220;
    b.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;` +
      `background:${colours[i % colours.length]};--d:${18 + Math.random() * 20}s;--x:${(Math.random() - .5) * 240}px;--y:${(Math.random() - .5) * 240}px;`;
    el.appendChild(b);
  }
})();
