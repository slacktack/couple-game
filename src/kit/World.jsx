import { createContext, useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';

export const WorldContext = createContext(null);
export const useWorld = () => useContext(WorldContext);

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Full-bleed scene: painted backdrop, the game's animated world layer, then a colour grade.
export function WorldScene({ game }) {
  const [fallback, setFallback] = useState(false);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const px = useSpring(rawX, { stiffness: 50, damping: 18 });
  const py = useSpring(rawY, { stiffness: 50, damping: 18 });
  const reduced = reducedMotion();

  useEffect(() => {
    if (reduced || !window.matchMedia('(pointer: fine)').matches) return undefined;
    const move = e => { rawX.set(e.clientX / window.innerWidth * 2 - 1); rawY.set(e.clientY / window.innerHeight * 2 - 1); };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [reduced, rawX, rawY]);

  const base = `/worlds/${game.id}`;
  const Layer = game.world;
  return <div className="world-scene" aria-hidden="true">
    <motion.div className="world-art" style={{ x: useSpringOffset(px, -16), y: useSpringOffset(py, -10) }}>
      <picture>
        {!fallback && <source media="(orientation: portrait)" srcSet={`${base}/bg-portrait.jpg`} />}
        <img src={fallback ? game.image : `${base}/bg-landscape.jpg`} alt="" onError={() => !fallback && setFallback(true)} />
      </picture>
    </motion.div>
    {Layer && <div className="world-layer"><Layer px={px} py={py} reduced={reduced} /></div>}
    <div className="world-grade" />
  </div>;
}

function useSpringOffset(value, amount) {
  const out = useMotionValue(0);
  useEffect(() => value.on('change', v => out.set(v * amount)), [value, out, amount]);
  return out;
}

// Entry portal: title card, then an iris opens onto the world. Tap skips.
export function WorldPortal({ game }) {
  const [open, setOpen] = useState(() => !reducedMotion() && !document.hidden);
  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(() => setOpen(false), 1900);
    return () => clearTimeout(id);
  }, [open]);
  const [first, ...rest] = game.title.split(' ');
  return <AnimatePresence>{open && <motion.div className="world-portal" onClick={() => setOpen(false)}
    initial={{ clipPath: 'circle(150% at 50% 50%)' }} animate={{ clipPath: 'circle(150% at 50% 50%)' }} exit={{ clipPath: 'circle(0% at 50% 50%)' }}
    transition={{ duration: .9, ease: [.7, 0, .2, 1] }}>
    <img className="world-portal-art" src={game.image} alt="" />
    <motion.div className="world-portal-copy" initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 1.08 }} transition={{ duration: .7, ease: [.22, 1, .36, 1] }}>
      <span className="micro">Game {game.number} · {game.tag}</span>
      <h1>{first} <em>{rest.join(' ')}</em></h1>
      <p>{game.tagline}</p>
    </motion.div>
    <motion.span className="world-portal-line" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.6, ease: 'linear' }} />
  </motion.div>}</AnimatePresence>;
}
