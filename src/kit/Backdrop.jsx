import { useMemo } from 'react';

const rand = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const GLYPHS = { stars: '✦', petals: '❀', hearts: '♡', paper: '✉', case: '✕', gears: '✻', fog: '', train: '' };

// Fixed, decorative ambient layer behind a page. Deterministic so it never jumps between renders.
export default function Backdrop({ kind = 'stars', count = 26 }) {
  const items = useMemo(() => {
    const r = rand(kind.length * 977 + 13);
    return Array.from({ length: count }, (_, i) => ({ i, x: r() * 100, y: r() * 100, s: .6 + r() * 1.2, d: r() * 8, t: 5 + r() * 9 }));
  }, [kind, count]);
  return <div className={`backdrop backdrop-${kind}`} aria-hidden="true">
    <div className="backdrop-glow" />
    {kind === 'fog' && <><div className="fog-layer fog-1" /><div className="fog-layer fog-2" /></>}
    {kind === 'train' && <div className="train-lights">{items.slice(0, 12).map(p => <i key={p.i} style={{ top: `${20 + p.y * .6}%`, animationDelay: `-${p.d}s`, animationDuration: `${p.t * .5}s` }} />)}</div>}
    {GLYPHS[kind] && items.map(p => <span key={p.i} className="bd-mote" style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: `${p.s}rem`, animationDelay: `-${p.d}s`, animationDuration: `${p.t}s` }}>{GLYPHS[kind]}</span>)}
  </div>;
}
