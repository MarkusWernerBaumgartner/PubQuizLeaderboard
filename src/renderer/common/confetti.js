// Tiny canvas confetti. Window.Confetti.burst({x,y,count,spread}) with x,y as 0..1 viewport fractions.
(function () {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:500';
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(canvas));
  const ctx = canvas.getContext('2d');
  // Accent colours follow the active branding; a few fixed extras keep it lively.
  function palette() {
    const cs = getComputedStyle(document.documentElement);
    return ['--accent-1', '--accent-2', '--accent-3', '--accent-4'].map((v) => cs.getPropertyValue(v).trim() || '#ffffff').concat(['#54a0ff', '#f368e0', '#ffffff']);
  }
  let parts = [], running = false, dpr = 1;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  }
  addEventListener('resize', resize); resize();

  function burst({ x = 0.5, y = 0.4, count = 140, spread = Math.PI * 2, angle = -Math.PI / 2, power = 1 } = {}) {
    const COLOURS = palette();
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - .5) * spread;
      const v = (6 + Math.random() * 14) * power * dpr;
      parts.push({
        x: x * canvas.width, y: y * canvas.height, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: (7 + Math.random() * 9) * dpr, h: (4 + Math.random() * 6) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .4,
        c: COLOURS[(Math.random() * COLOURS.length) | 0], life: 0, max: 110 + Math.random() * 70,
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter((p) => p.life < p.max && p.y < canvas.height + 50);
    for (const p of parts) {
      p.life++; p.vy += .38 * dpr; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = Math.min(1, (p.max - p.life) / 30);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    if (parts.length) requestAnimationFrame(tick); else running = false;
  }
  // Two cannons from the bottom corners plus a central pop.
  function celebrate() {
    burst({ x: 0.08, y: 1, angle: -Math.PI / 3, spread: 1, count: 90, power: 1.5 });
    burst({ x: 0.92, y: 1, angle: -Math.PI * 2 / 3, spread: 1, count: 90, power: 1.5 });
    burst({ x: 0.5, y: 0.35, count: 120 });
  }
  window.Confetti = { burst, celebrate };
})();
