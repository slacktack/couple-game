const SHAPES = {
  petal(ctx, s) { ctx.beginPath(); ctx.ellipse(0, 0, s * .55, s, 0, 0, Math.PI * 2); ctx.fill(); },
  star(ctx, s) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? s * .42 : s; const a = (i * Math.PI) / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  },
  heart(ctx, s) {
    ctx.beginPath(); ctx.moveTo(0, s * .35);
    ctx.bezierCurveTo(s, -s * .4, s * .45, -s * 1.1, 0, -s * .45);
    ctx.bezierCurveTo(-s * .45, -s * 1.1, -s, -s * .4, 0, s * .35); ctx.fill();
  },
  spark(ctx, s) { ctx.fillRect(-s * .18, -s, s * .36, s * 2); },
};

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Fire a short particle burst over the page; origin defaults to screen centre.
export function celebrate({ shape = 'heart', colors, x, y, count = 70 } = {}) {
  if (typeof document === 'undefined' || reduced()) return;
  const root = getComputedStyle(document.documentElement);
  const palette = colors || ['--rose', '--lilac', '--amber', '--blue', '--sage'].map(v => root.getPropertyValue(v).trim() || '#c9506d');
  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999 });
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const ox = x ?? innerWidth / 2; const oy = y ?? innerHeight * .45;
  const shapes = Array.isArray(shape) ? shape : [shape];
  const parts = Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2; const v = 4 + Math.random() * 9;
    return { x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, r: Math.random() * 6, vr: (Math.random() - .5) * .3, s: 5 + Math.random() * 7, c: palette[Math.floor(Math.random() * palette.length)], f: SHAPES[shapes[Math.floor(Math.random() * shapes.length)]] || SHAPES.heart };
  });
  const start = performance.now();
  const tick = now => {
    const t = (now - start) / 1400;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += .32; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t); ctx.fillStyle = p.c; ctx.translate(p.x, p.y); ctx.rotate(p.r); p.f(ctx, p.s); ctx.restore();
    }
    if (t < 1) requestAnimationFrame(tick); else canvas.remove();
  };
  requestAnimationFrame(tick);
}

export function burstFrom(element, options) {
  const box = element?.getBoundingClientRect?.();
  celebrate({ ...options, ...(box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : {}) });
}
