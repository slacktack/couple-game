const TARGETS = 'button, .btn, [role="button"], summary, a.card-link';

// One delegated listener gives every pressable a soft liquid ripple from the touch point.
export function installLiquidClicks() {
  if (typeof document === 'undefined' || window.__liquid) return;
  window.__liquid = true;
  document.addEventListener('pointerdown', event => {
    const el = event.target.closest?.(TARGETS);
    if (!el || el.disabled || el.closest('[data-no-ripple]')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = el.getBoundingClientRect();
    const size = Math.max(box.width, box.height) * 2.2;
    const drop = document.createElement('span');
    drop.className = 'liquid-drop';
    drop.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - box.left - size / 2}px;top:${event.clientY - box.top - size / 2}px`;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.classList.add('liquid-host');
    el.appendChild(drop);
    drop.addEventListener('animationend', () => drop.remove(), { once: true });
  }, { passive: true });
}
