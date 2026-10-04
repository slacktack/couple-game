import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useAnimate, useMotionValue } from 'motion/react';
import { Button, Finale, GameRules, GameShell, HintLadder, HowItWorks, Round, RoundProgress } from '../kit/Kit.jsx';
import { useClub, usePatch } from '../kit/club.js';
import { burstFrom } from '../kit/celebrate.js';
import {
  COLORS, CONTOUR_TABLE, DIAL, GLYPHS, MODULES, PIN_RULES, SCALE,
  checkCombo, checkGear, checkPin, dialStart, freshSeeds, gearConfig, melodyConfig, pinConfig, solveGears, solveMelody, solvePins,
} from './musicbox-rules.js';
import './MusicBox.css';

const INITIAL = { seeds: null, fixed: [], hints: {}, dust: {}, revealed: {}, finished: false };
const BRASS = ['#f3d58a', '#e2ad35', '#c8324a', '#f1e8dc'];
const NUMERALS = ['I', 'II', 'III', 'IV', 'V'];
const sym = s => `${s}︎`;

export function progress(data = {}) {
  const fixed = Array.isArray(data.fixed) ? data.fixed : [];
  return { done: fixed.length, total: 3, finished: Boolean(data.finished) };
}

// ---------- sound ----------
let ctx = null;
function audio() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  ctx ||= new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function chime(freq, at = 0, { gain = .16, length = 1.5, wobble = 0, bend = 0 } = {}) {
  const c = audio(); if (!c) return;
  const t = c.currentTime + at;
  const out = c.createGain();
  out.gain.setValueAtTime(.0001, t);
  out.gain.exponentialRampToValueAtTime(gain, t + .006);
  out.gain.exponentialRampToValueAtTime(.0001, t + length);
  out.connect(c.destination);
  const lfo = wobble ? c.createOscillator() : null;
  const depth = wobble ? c.createGain() : null;
  if (lfo) { lfo.frequency.value = 5.5; depth.gain.value = wobble; lfo.connect(depth); lfo.start(t); lfo.stop(t + length); }
  [[1, 1], [3.01, .16], [5.4, .04]].forEach(([ratio, level]) => {
    const osc = c.createOscillator(); const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * ratio, t);
    if (bend) osc.frequency.exponentialRampToValueAtTime(freq * ratio * bend, t + length);
    if (depth) depth.connect(osc.detune);
    g.gain.value = level;
    osc.connect(g); g.connect(out); osc.start(t); osc.stop(t + length + .05);
  });
}
const tune = (freqs, gap = .34, opts) => freqs.forEach((f, i) => chime(f, i * gap, opts));
const sour = () => tune([659.25, 622.25, 587.33, 554.37], .14, { gain: .12, length: .9, wobble: 70, bend: .94 });
const tick = () => chime(2400, 0, { gain: .035, length: .07 });
const buzz = () => navigator.vibrate?.(8);
const FLOURISH = [523.25, 659.25, 783.99, 1046.5];
const WALTZ = [659.25, 783.99, 880, 783.99, 659.25, 587.33, 659.25, 523.25, 587.33, 659.25];

// ---------- the box ----------
function Dust({ count }) {
  const n = Math.min(count, 14);
  return <div className="mb-dust" aria-hidden="true">
    {Array.from({ length: n }, (_, i) => <i key={i} style={{ left: `${(i * 37 + 11) % 92 + 3}%`, top: `${(i * 53 + 7) % 78 + 8}%`, '--s': `${3 + (i * 7) % 5}px` }} />)}
    {count >= 3 && <svg className="mb-web" viewBox="0 0 60 60"><path d="M0 0 L60 8 M0 0 L46 30 M0 0 L22 52 M0 0 L6 60 M0 0 L60 8 M14 2 Q12 12 10 16 Q4 14 2 12 M30 4 Q26 18 22 26 Q10 26 4 26 M48 6 Q40 22 34 40 Q18 40 6 42" /></svg>}
  </div>;
}

function Gauge() {
  return <svg className="mb-gauge" viewBox="0 0 64 40" aria-hidden="true">
    <path d="M8 34 A24 24 0 0 1 56 34" className="mb-gauge-arc" />
    {[-60, -30, 0, 30, 60].map(a => <line key={a} x1="32" y1="12" x2="32" y2="15" transform={`rotate(${a} 32 34)`} />)}
    <g className="mb-gauge-needle"><line x1="32" y1="34" x2="32" y2="15" /></g>
    <circle cx="32" cy="34" r="3.2" />
  </svg>;
}

function BoxCase({ plate, dust, solved, solvedNote, scope, children }) {
  return <div className="mb-case" ref={scope}>
    <div className="mb-lid">
      <span className="mb-plate"><small>No.</small>{plate}</span>
      <Gauge />
    </div>
    <div className="mb-well">{children}</div>
    <svg className="mb-sidekey" viewBox="0 0 40 60" aria-hidden="true"><g><path d="M20 30 C4 18 2 4 12 2 C18 1 20 10 20 18 C20 10 22 1 28 2 C38 4 36 18 20 30Z" /><rect x="17" y="28" width="6" height="30" rx="2" /></g></svg>
    <Dust count={dust} />
    <AnimatePresence>{solved && <motion.div className="mb-stamp" initial={{ scale: 2.4, opacity: 0, rotate: -24 }} animate={{ scale: 1, opacity: 1, rotate: -8 }} transition={{ type: 'spring', stiffness: 360, damping: 16, delay: .25 }}>
      <b>Fixed</b>{solvedNote && <small>{solvedNote}</small>}
    </motion.div>}</AnimatePresence>
  </div>;
}

// ---------- module 1: pin cylinder ----------
const LANES = [.15, .325, .5, .675, .85];
const DRUM_DOTS = Array.from({ length: 18 }, (_, i) => ({ x: 34 + ((i * 71) % 272), y: (i * 23) % 80 }));

function PinCylinder({ cfg, solved, reveal, onSolve, onWrong }) {
  const answer = solvePins(cfg).pin;
  const [pluck, setPluck] = useState({ i: -1, n: 0 });
  const ring = i => { chime(SCALE[4 - i]); setPluck(p => ({ i, n: p.n + 1 })); };
  const pull = i => { if (checkPin(cfg, i)) { tune(FLOURISH, .12); onSolve(); } else onWrong(); };
  return <div className={`mb-pins ${solved ? 'is-solved' : ''}`}>
    <svg className="mb-art" viewBox="0 0 340 220" aria-hidden="true">
      <defs>
        <linearGradient id="mbDrum" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a5220" /><stop offset=".22" stopColor="#f3d58a" /><stop offset=".5" stopColor="#d4a043" /><stop offset=".85" stopColor="#7d531c" /><stop offset="1" stopColor="#4d3110" /></linearGradient>
        <linearGradient id="mbSteel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8d8a86" /><stop offset=".45" stopColor="#f2efe9" /><stop offset="1" stopColor="#7b7873" /></linearGradient>
        <clipPath id="mbDrumClip"><rect x="20" y="112" width="300" height="86" rx="38" /></clipPath>
      </defs>
      <rect x="26" y="16" width="288" height="26" rx="6" className="mb-comb-bar" />
      {[0, 1, 2, 3, 4].map(i => <rect key={pluck.i === i ? `t${pluck.n}` : `t${i}`} x={LANES[i] * 340 - 6} y="38" width="12" height={50 - i * 3} rx="4" fill="url(#mbSteel)" className={`mb-tine ${pluck.i === i ? 'is-plucked' : ''}`} />)}
      <rect x="20" y="112" width="300" height="86" rx="38" fill="url(#mbDrum)" />
      <g clipPath="url(#mbDrumClip)"><g className={solved ? 'mb-drum-roll is-slow' : 'mb-drum-roll'}>
        {[0, 80].map(off => DRUM_DOTS.map((d, k) => <circle key={`${off}-${k}`} cx={d.x} cy={112 + d.y + off} r="2.4" className="mb-drum-dot" />))}
      </g></g>
      <rect x="20" y="112" width="300" height="86" rx="38" className="mb-drum-sheen" />
      {NUMERALS.map((n, i) => <text key={n} x={LANES[i] * 340} y="214" className="mb-numeral">{n}</text>)}
    </svg>
    {cfg.pins.map((c, i) => {
      const gone = solved && i === answer;
      return <motion.button type="button" key={i} className={`mb-peg ${reveal && !solved && i === answer ? 'is-hint' : ''}`}
        style={{ left: `${LANES[i] * 100}%`, '--pin': COLORS[c].hex }}
        drag={solved ? false : 'y'} dragConstraints={{ top: -90, bottom: 0 }} dragElastic={.18} dragSnapToOrigin
        onTap={() => !solved && ring(i)} onDragEnd={(_, info) => info.offset.y < -44 && pull(i)}
        animate={gone ? { y: -170, rotate: 30, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        whileTap={{ scale: 1.08 }} whileDrag={{ scale: 1.12 }}
        aria-label={`Pin ${i + 1}, ${COLORS[c].name}. Tap to hear it, drag up to pull it.`}>
        <span className="mb-peg-head" /><span className="mb-peg-stem" />
      </motion.button>;
    })}
  </div>;
}

// ---------- module 2: gear train ----------
const PITCH = 4.2;
function layoutGears(gears) {
  const r = gears.map(g => g.teeth * PITCH);
  const ys = gears.map((_, i) => (i % 2 ? 132 : 86));
  const xs = [r[0] + 14];
  for (let i = 1; i < 4; i++) { const d = r[i - 1] + r[i]; const dy = ys[i] - ys[i - 1]; xs[i] = xs[i - 1] + Math.sqrt(d * d - dy * dy); }
  const bases = [0];
  for (let i = 0; i < 3; i++) {
    const theta = Math.atan2(ys[i + 1] - ys[i], xs[i + 1] - xs[i]) * 180 / Math.PI;
    const p = 360 / gears[i].teeth; const pn = 360 / gears[i + 1].teeth;
    const t = ((((theta - bases[i]) % p) + p) % p) / p;
    bases[i + 1] = theta + 180 - (.5 - t) * pn;
  }
  const top = Math.min(...ys.map((y, i) => y - r[i])) - 12;
  const height = Math.max(...ys.map((y, i) => y + r[i])) + 26 - top;
  return { r, xs, ys: ys.map(y => y - top), bases, width: xs[3] + r[3] + 14, height };
}

function gearPath(n, r) {
  const p = (2 * Math.PI) / n; const root = r - 4.8; const tip = r + 4.8;
  const pt = (rad, a) => `${(Math.cos(a) * rad).toFixed(2)} ${(Math.sin(a) * rad).toFixed(2)}`;
  let d = '';
  for (let k = 0; k < n; k++) {
    const c = k * p;
    d += `${k ? 'L' : 'M'}${pt(root, c - .3 * p)} L${pt(tip, c - .15 * p)} L${pt(tip, c + .15 * p)} L${pt(root, c + .3 * p)} `;
  }
  return `${d}Z`;
}

function GearTrain({ cfg, solved, reveal, onSolve, onWrong }) {
  const L = useMemo(() => layoutGears(cfg.gears), [cfg]);
  const sol = useMemo(() => solveGears(cfg), [cfg]);
  const angles = [useMotionValue(0), useMotionValue(0), useMotionValue(0), useMotionValue(0)];
  const svgRef = useRef(null);
  const grab = useRef(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const teeth = cfg.gears.map(g => g.teeth);
  const spin = (g, deg) => angles.forEach((mv, i) => mv.set(deg * (Math.abs(i - g) % 2 ? -1 : 1) * teeth[g] / teeth[i]));

  useEffect(() => { spin(sol.gear, solved ? sol.dir * sol.turns * 90 : 0); }, [cfg, solved]);

  const angleAt = (e, g) => {
    const box = svgRef.current.getBoundingClientRect();
    const cx = box.left + (L.xs[g] / L.width) * box.width; const cy = box.top + (L.ys[g] / L.height) * box.height;
    return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
  };
  const down = (e, g) => {
    if (solved || busy) return;
    svgRef.current.setPointerCapture?.(e.pointerId);
    grab.current = { g, last: angleAt(e, g), total: 0, q: 0 };
    setActive(g);
  };
  const move = e => {
    const s = grab.current; if (!s) return;
    const a = angleAt(e, s.g);
    let delta = a - s.last; if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
    s.last = a; s.total = Math.max(-400, Math.min(400, s.total + delta));
    const q = Math.trunc(s.total / 90);
    if (q !== s.q) { s.q = q; tick(); buzz(); }
    spin(s.g, s.total);
  };
  const up = () => {
    const s = grab.current; if (!s) return;
    grab.current = null; setActive(-1);
    const q = Math.max(-4, Math.min(4, Math.round(s.total / 90)));
    const settle = (from, to, done) => animate(from, to, { type: 'spring', stiffness: 220, damping: 16, onUpdate: v => spin(s.g, v), onComplete: done });
    setBusy(true);
    settle(s.total, q * 90, () => {
      if (!q) return setBusy(false);
      if (checkGear(cfg, s.g, q)) { tune(FLOURISH, .12); setBusy(false); onSolve(); return; }
      onWrong();
      setTimeout(() => settle(q * 90, 0, () => setBusy(false)), 380);
    });
  };

  return <div className={`mb-gears ${solved ? 'is-solved' : ''}`}>
    <svg ref={svgRef} className="mb-art mb-gear-svg" viewBox={`0 0 ${L.width.toFixed(1)} ${L.height}`} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <defs>
        <radialGradient id="mbGearBrass" cx=".4" cy=".35" r=".75"><stop offset="0" stopColor="#f6dc95" /><stop offset=".55" stopColor="#d6a446" /><stop offset="1" stopColor="#8b5d1d" /></radialGradient>
        <radialGradient id="mbHub" cx=".4" cy=".35" r=".8"><stop offset="0" stopColor="#3e2a17" /><stop offset="1" stopColor="#1c120a" /></radialGradient>
      </defs>
      {cfg.gears.map((g, i) => <g key={i} transform={`translate(${L.xs[i].toFixed(2)} ${L.ys[i]})`} className={`mb-gear ${active === i ? 'is-active' : ''}`} onPointerDown={e => down(e, i)} role="img" aria-label={`Gear ${i + 1}: ${GLYPHS.find(x => x.glyph === g.glyph).name}, ${g.teeth} teeth`}>
        <g transform={`rotate(${L.bases[i].toFixed(2)})`}>
          <motion.g style={{ rotate: angles[i], transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
            <circle r={L.r[i] + 4.8} fill="transparent" />
            <path d={gearPath(g.teeth, L.r[i])} className="mb-gear-body" />
            <circle r={L.r[i] - 9} className="mb-gear-rim" />
            {[0, 1, 2, 3, 4].map(k => <circle key={k} r={L.r[i] * .13} cx={Math.cos(k * 1.2566) * L.r[i] * .55} cy={Math.sin(k * 1.2566) * L.r[i] * .55} className="mb-gear-hole" />)}
          </motion.g>
        </g>
        <circle r={L.r[i] * .34 + 3} className="mb-hub" />
        <text className="mb-hub-glyph" dy=".36em" style={{ fontSize: Math.max(16, L.r[i] * .44) }}>{sym(g.glyph)}</text>
        <text className="mb-gear-no" y={L.r[i] + 18}>{i + 1}</text>
        {reveal && !solved && sol.gear === i && <g className="mb-gear-hint">
          <circle r={L.r[i] + 9} />
          <path d={sol.dir > 0 ? `M${-L.r[i] * .2} ${-L.r[i] - 14} l10 -5 l-1 10` : `M${L.r[i] * .2} ${-L.r[i] - 14} l-10 -5 l1 10`} />
        </g>}
      </g>)}
    </svg>
    {reveal && !solved && <p className="mb-reveal-tag">Gear {sol.gear + 1} · {sol.turns} quarter turn{sol.turns > 1 ? 's' : ''} {sol.dir > 0 ? 'clockwise' : 'counter-clockwise'}</p>}
  </div>;
}

// ---------- module 3: melody dial ----------
const NOTE_X = [56, 122, 188, 254];
const noteY = p => 104 - p * 17;

function MelodyDial({ cfg, seed, solved, reveal, onSolve, onWrong }) {
  const sol = useMemo(() => solveMelody(cfg), [cfg]);
  const [dials, setDials] = useState(() => dialStart(cfg, seed));
  const [playing, setPlaying] = useState(-1);
  const [plays, setPlays] = useState(0);
  const [winds, setWinds] = useState(0);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const shown = solved ? sol.combo.map(s => DIAL.indexOf(s)) : dials;

  const play = (opts) => {
    timers.current.forEach(clearTimeout);
    setPlays(p => p + 1);
    tune(cfg.notes.map(n => SCALE[n]), .42, opts);
    timers.current = cfg.notes.map((_, i) => setTimeout(() => setPlaying(i), i * 420)).concat(setTimeout(() => setPlaying(-1), 4 * 420 + 200));
  };
  const turn = i => { if (solved) return; tick(); buzz(); setDials(d => d.map((v, k) => (k === i ? (v + 1) % DIAL.length : v))); };
  const wind = () => {
    if (solved) return;
    setWinds(w => w + 1);
    if (checkCombo(cfg, dials.map(i => DIAL[i]))) { play(); onSolve(); } else { play({ wobble: 80, bend: .93, gain: .12 }); onWrong(); }
  };

  const trail = cfg.notes.map((n, i) => `${i ? 'L' : 'M'}${NOTE_X[i]} ${noteY(n)}`).join(' ');
  return <div className={`mb-melody ${solved ? 'is-solved' : ''}`}>
    <button type="button" className="mb-staff" onClick={() => play()} aria-label="Play the tune">
      <svg className="mb-art" viewBox="0 0 300 130" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(k => <line key={k} x1="18" x2="290" y1={noteY(k)} y2={noteY(k)} className="mb-staff-line" />)}
        <motion.path key={plays} d={trail} className="mb-trail" initial={{ pathLength: plays ? 0 : 1 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: 'easeInOut' }} />
        {cfg.notes.map((n, i) => <motion.g key={i} initial={{ y: 30, opacity: 0 }} animate={{ y: playing === i ? -9 : 0, opacity: 1, scale: playing === i ? 1.25 : 1 }} transition={{ type: 'spring', stiffness: 420, damping: 14, delay: playing < 0 ? i * .08 : 0 }} style={{ transformBox: 'fill-box', transformOrigin: '50% 80%' }}>
          <ellipse cx={NOTE_X[i]} cy={noteY(n)} rx="10" ry="7.5" transform={`rotate(-20 ${NOTE_X[i]} ${noteY(n)})`} className={`mb-note ${playing === i ? 'is-on' : ''}`} />
          <line x1={NOTE_X[i] + 9} x2={NOTE_X[i] + 9} y1={noteY(n)} y2={noteY(n) - 34} className="mb-note-stem" />
        </motion.g>)}
        <text x="18" y="124" className="mb-staff-cue">▶ tap to play</text>
      </svg>
    </button>
    <div className="mb-dials">
      {shown.map((v, i) => <button type="button" key={i} className={`mb-dial ${reveal && !solved ? 'is-hint' : ''}`} onClick={() => turn(i)} aria-label={`Dial ${i + 1}: ${DIAL[v]}. Tap to turn.`}>
        {reveal && !solved && <span className="mb-dial-ghost">{sym(sol.combo[i])}</span>}
        <span className="mb-dial-window"><AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={v} initial={{ y: '-110%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '110%', opacity: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 26 }}>{sym(DIAL[v])}</motion.span>
        </AnimatePresence></span>
      </button>)}
      <motion.button type="button" className="mb-windkey" onClick={wind} disabled={solved} aria-label="Turn the winding key to try the dials"
        animate={{ rotate: winds * 180 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }} whileTap={{ scale: .9 }}>
        <svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 34 C8 22 6 4 18 3 C26 2 30 14 30 24 C30 14 34 2 42 3 C54 4 52 22 30 34Z" /><rect x="26" y="32" width="8" height="24" rx="3" /><circle cx="30" cy="34" r="5" /></svg>
      </motion.button>
    </div>
  </div>;
}

// ---------- the archivist's manual ----------
function CurlArrow({ dir }) {
  return <svg className="mb-curl" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: dir > 0 ? 'scaleX(-1)' : undefined }}>
    <path d="M5 13a7 7 0 1 0 3-7.4" /><path d="M8.5 1.8 8 6.2l4.3.8" />
  </svg>;
}

function Quarters({ n }) {
  return <span className="mb-quarters" aria-label={`${n} quarter turns`}>{Array.from({ length: n }, (_, i) => <svg key={i} viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.5" /><path d="M10 10V1.5A8.5 8.5 0 0 1 18.5 10Z" /></svg>)}</span>;
}

function PinsPage() {
  return <>
    <figure className="mb-plate-fig">
      <svg viewBox="0 0 300 92" aria-hidden="true">
        <rect x="14" y="40" width="272" height="40" rx="20" className="ink-fill" />
        {LANES.map((x, i) => <g key={i}><line x1={x * 300} x2={x * 300} y1="40" y2="18" className="ink" /><circle cx={x * 300} cy="14" r="8" className="ink-peg" /><text x={x * 300} y="66" className="ink-num">{i + 1}</text></g>)}
        <path d="M30 88 H270 m-8 -4 l8 4 l-8 4" className="ink" />
      </svg>
      <figcaption>Count pins from the winding key, left to right. Ask for the brass plate number too.</figcaption>
    </figure>
    <div className="mb-swatches">{Object.values(COLORS).map(c => <span key={c.name}><i style={{ '--pin': c.hex }} />{c.name}</span>)}</div>
    <ol className="mb-rules">{PIN_RULES.map((rule, i) => <li key={i}><span>{i + 1}</span><p>{rule}</p></li>)}</ol>
  </>;
}

function GearsPage() {
  return <>
    <p className="mb-lede">Gears are numbered 1 to 4 from the left. Each touches only its neighbours.</p>
    <div className="mb-glyph-table" role="table">
      {GLYPHS.map((g, i) => <div role="row" key={g.glyph} className="mb-glyph-row">
        <span className="mb-rank">{i + 1}</span>
        <span className="mb-glyph">{sym(g.glyph)}</span>
        <span className="mb-glyph-name">{g.name}</span>
        <span className="mb-glyph-dir"><CurlArrow dir={g.dir} />{g.dir > 0 ? 'clockwise' : 'counter'}</span>
        <Quarters n={g.turns} />
      </div>)}
    </div>
    <ol className="mb-flow">
      <li><span>A</span><p>Find the gear whose glyph sits highest in the table.</p></li>
      <li className="mb-flow-fork"><span>B</span><p>Does it have more teeth than every gear it touches?</p>
        <div className="mb-fork"><em>Yes</em> it is the drive gear. <em>No</em> the drive gear is the gear it touches with the most teeth.</div>
      </li>
      <li><span>C</span><p>Turn the drive gear the way its glyph says. If it is gear 2 or 4, turn it the other way.</p></li>
      <li><span>D</span><p>Turn it as many quarter turns as its glyph says. Add one if it has an odd number of teeth.</p></li>
    </ol>
  </>;
}

function MelodyPage() {
  const arrow = { up: 'M3 15 L15 5 m-6 0 h6 v6', same: 'M2 10 H16 m-5 -5 l5 5 l-5 5', down: 'M3 5 L15 15 m-6 0 h6 v-6' };
  return <>
    <figure className="mb-plate-fig">
      <svg viewBox="0 0 300 80" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(k => <line key={k} x1="10" x2="290" y1={14 + k * 12} y2={14 + k * 12} className="ink-thin" />)}
        {[[40, 50], [110, 26], [180, 26], [250, 62]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="8" ry="6" className="ink-peg" />)}
        {['step 1', 'step 2', 'step 3'].map((s, i) => <text key={s} x={75 + i * 70} y="78" className="ink-num">{s}</text>)}
      </svg>
      <figcaption>Four notes make three steps. Each step goes up, stays the same, or goes down.</figcaption>
    </figure>
    <div className="mb-contour" role="table">
      <div role="row" className="mb-contour-head"><span />{['up', 'same', 'down'].map(c => <span key={c}><svg viewBox="0 0 18 20"><path d={arrow[c]} /></svg>{c}</span>)}</div>
      {CONTOUR_TABLE.map((row, i) => <div role="row" key={i}><span>Dial {i + 1}<small>step {i + 1}</small></span>{['up', 'same', 'down'].map(c => <b key={c}>{sym(row[c])}</b>)}</div>)}
    </div>
    <p className="mb-swap"><b>☞</b> If the last note is higher than all three before it, swap dials 1 and 3.</p>
  </>;
}

const PAGES = [PinsPage, GearsPage, MelodyPage];

function Manual({ index, repaired }) {
  const Page = PAGES[index];
  return <motion.article className="mb-manual" style={{ transformPerspective: 1100 }} initial={{ rotateY: -70, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 110, damping: 17 }}>
    <header className="mb-manual-head"><span>Repair manual</span><span>p. {index + 1}</span></header>
    <h3>The {MODULES[index].label.toLowerCase()}</h3>
    <Page />
    {repaired && <motion.span className="mb-manual-stamp" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>Repaired</motion.span>}
  </motion.article>;
}

// ---------- finale ----------
function Dancer() {
  const [spins, setSpins] = useState(0);
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const twirl = () => { tune(WALTZ, .3); setSpins(s => s + 1); };
  return <button type="button" className="mb-finale-box" onClick={twirl} aria-label="Play the music box">
    <svg viewBox="0 0 240 200" aria-hidden="true">
      <defs>
        <linearGradient id="mbWalnut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a4a2a" /><stop offset="1" stopColor="#3a2111" /></linearGradient>
        <linearGradient id="mbVelvet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8d2238" /><stop offset="1" stopColor="#4a0f1d" /></linearGradient>
      </defs>
      <motion.g initial={{ scaleY: .08 }} animate={{ scaleY: 1 }} transition={{ type: 'spring', stiffness: 70, damping: 11, delay: .4 }} style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
        <path d="M40 108 L56 22 H184 L200 108Z" fill="url(#mbWalnut)" />
        <path d="M58 102 L69 34 H171 L182 102Z" fill="url(#mbVelvet)" />
        <ellipse cx="120" cy="66" rx="30" ry="24" className="mb-mirror" />
      </motion.g>
      <path d="M40 108 H200 L210 122 H30Z" fill="url(#mbVelvet)" />
      <ellipse cx="120" cy="114" rx="15" ry="4.5" className="mb-pedestal" />
      <motion.g initial={{ y: 46, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 90, damping: 12, delay: 1 }}>
        <motion.g key={spins} animate={still && !spins ? {} : { scaleX: [1, -1, 1, -1, 1] }} transition={{ duration: spins ? 1.2 : 2.4, ease: 'easeInOut', repeat: spins ? 1 : Infinity, repeatDelay: spins ? 0 : 1.6 }} style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
          <circle cx="120" cy="52" r="7" className="mb-porcelain" />
          <path d="M120 59 L120 84" className="mb-porcelain-line" />
          <path d="M120 64 Q104 52 100 40 M120 64 Q136 52 140 40" className="mb-porcelain-line" />
          <ellipse cx="120" cy="86" rx="22" ry="7" className="mb-tutu" />
          <path d="M116 92 L114 112 M124 92 L130 104 L122 110" className="mb-porcelain-line" />
        </motion.g>
      </motion.g>
      <path d="M30 122 H210 L202 188 H38Z" fill="url(#mbWalnut)" />
      <path d="M30 122 H210" className="mb-brass-line" />
      <rect x="96" y="146" width="48" height="16" rx="3" className="mb-finale-plate" />
    </svg>
  </button>;
}

// ---------- game ----------
export default function MusicBox({ data, update }) {
  const { me, nameOf } = useClub();
  const [state, patch] = usePatch(data, update, INITIAL);
  const fallback = useRef(null);
  const seeds = Array.isArray(state.seeds) ? state.seeds : (fallback.current ||= freshSeeds());
  useEffect(() => { if (!Array.isArray(state.seeds)) patch({ seeds }); }, []);
  const fixed = Array.isArray(state.fixed) ? state.fixed : [];
  const firstOpen = MODULES.findIndex((_, i) => !fixed.includes(i));
  const current = firstOpen < 0 ? 3 : firstOpen;
  const [view, setView] = useState(null);
  const shown = view ?? current;
  const linger = useRef(null);
  useEffect(() => () => clearTimeout(linger.current), []);
  const [scope, wobble] = useAnimate();

  const cfgs = useMemo(() => [pinConfig(seeds[0]), gearConfig(seeds[1]), melodyConfig(seeds[2])], [seeds[0], seeds[1], seeds[2]]);
  const A = nameOf('A'); const B = nameOf('B');

  const markFixed = i => patch(old => {
    const next = [...new Set([...(Array.isArray(old.fixed) ? old.fixed : []), i])];
    return { fixed: next, finished: next.length === 3 };
  });
  const solve = i => {
    burstFrom(scope.current, { shape: ['star', 'spark'], colors: BRASS, count: 60 });
    markFixed(i); setView(i);
    clearTimeout(linger.current);
    linger.current = setTimeout(() => setView(null), 2800);
  };
  const wrong = i => {
    sour(); buzz();
    if (scope.current) wobble(scope.current, { rotate: [0, -2.2, 2, -1.2, .6, 0], x: [0, -6, 6, -3, 2, 0] }, { duration: .55 });
    patch(old => ({ dust: { ...(old.dust || {}), [i]: ((old.dust || {})[i] || 0) + 1 } }));
  };
  const replay = () => { clearTimeout(linger.current); setView(null); patch({ ...INITIAL, seeds: freshSeeds() }); };

  const rules = <GameRules steps={[
    { title: 'Two phones, two jobs', text: 'One of you is the Tinkerer and holds the broken music box. The other is the Archivist and holds the only repair manual.' },
    { title: 'Talk it through', text: 'The Tinkerer describes what they see. The Archivist finds the rule that fits and says exactly what to do.' },
    { title: 'Swap every module', text: `${A} tinkers first, then ${B}, then ${A} again.` },
    { title: 'Fixing it', text: 'The right move makes the box sing. A wrong one sours the tune and lets a little dust settle. When it sings, the Archivist turns the page.' },
  ]} />;

  const rounds = MODULES.map(m => ({ id: m.id, label: m.label }));
  const doneIds = fixed.map(i => MODULES[i]?.id).filter(Boolean);
  const progressBar = <RoundProgress rounds={rounds} current={shown} done={doneIds} rewards={{ pins: sym('♪'), gears: sym('✦'), melody: sym('♡') }}
    onSelect={current < 3 ? i => setView(i === current ? null : i) : undefined} />;

  if (shown === 3) {
    return <GameShell title="The Music Box" number="Game 04" tone="amber" backdrop="gears" rules={rules}>
      {progressBar}
      <Finale eyebrow="The box plays again" title={<>Wound up and <em>singing</em></>} onReplay={replay} replayLabel="Start over with three new faults">
        <Dancer />
        <p>{A}, {B}: you rebuilt it with nothing but each other’s voices. Tap the dancer whenever the distance feels long. She plays the same little waltz on both of your phones.</p>
      </Finale>
    </GameShell>;
  }

  const mod = MODULES[shown];
  const tinkerer = mod.tinkerer;
  const archivist = tinkerer === 'A' ? 'B' : 'A';
  const role = me || 'A';
  const isTinkerer = role === tinkerer;
  const T = nameOf(tinkerer); const R = nameOf(archivist);
  const done = fixed.includes(shown);
  const cfg = cfgs[shown];
  const hintLevel = (state.hints || {})[shown] || 0;
  const setHint = n => patch(old => ({ hints: { ...(old.hints || {}), [shown]: n } }));
  const revealed = Boolean((state.revealed || {})[shown]);
  const reveal = () => patch(old => ({ revealed: { ...(old.revealed || {}), [shown]: true } }));

  const tinkerHints = [
    [
      `Read the five colours from left to right, starting next to the winding key, then the plate number.`,
      `Ask ${R} to stop at the first rule that is true. Only that one counts.`,
      `Tell ${R}: rule ${solvePins(cfgs[0]).rule} is the one that fits this box.`,
    ],
    [
      `Go left to right: each gear’s glyph, then how many teeth it has.`,
      `The gear clicks at every quarter turn. Let go to try the turn.`,
      `Tell ${R}: the drive gear is gear ${solveGears(cfgs[1]).gear + 1}.`,
    ],
    [
      `Play the tune and say up, down or same for each jump between notes.`,
      `Tell ${R} whether the last note is higher than all three before it.`,
      `The three steps go ${solveMelody(cfgs[2]).steps.join(', ')}.`,
    ],
  ][shown];
  const archiveHints = [
    ['Go down the list and stop at the first rule that is true. Ignore everything below it.', 'Pins are numbered from the winding-key side, so pin 1 is the leftmost.', 'The last ruby pin means the ruby pin furthest to the right.'],
    ['Start from the glyph that sits highest in the table, even if its gear is small.', 'A gear only touches the gears right beside it, so the end gears touch one gear each.', 'Reverse the direction for gears 2 and 4, then add a quarter turn if the drive gear has an odd tooth count.'],
    ['A step is one note to the next. Four notes, three steps, one dial each.', 'Step 1 reads from the first row, step 2 from the second, step 3 from the third.', 'Swap dials 1 and 3 only when the last note is higher than every note before it.'],
  ][shown];
  const howTinker = [
    `Describe the pins and the plate number to ${R}. Tap a pin to hear it, drag one up to pull it out.`,
    `Describe the gears to ${R}. Press a gear and drag it round to turn it; let go to try.`,
    `Tap the staff to play the tune and describe it to ${R}. Tap a dial to change it, then turn the winding key to try.`,
  ][shown];

  const board = isTinkerer
    ? <BoxCase plate={cfgs[0].plate} dust={(state.dust || {})[shown] || 0} solved={done} solvedNote={`Tell ${R}`} scope={scope}>
      {shown === 0 && <PinCylinder cfg={cfg} solved={done} reveal={revealed} onSolve={() => solve(0)} onWrong={() => wrong(0)} />}
      {shown === 1 && <GearTrain cfg={cfg} solved={done} reveal={revealed} onSolve={() => solve(1)} onWrong={() => wrong(1)} />}
      {shown === 2 && <MelodyDial cfg={cfg} seed={seeds[2]} solved={done} reveal={revealed} onSolve={() => solve(2)} onWrong={() => wrong(2)} />}
    </BoxCase>
    : <Manual key={shown} index={shown} repaired={done} />;

  return <GameShell title="The Music Box" number="Game 04" tone="amber" backdrop="gears" rules={rules}>
    {progressBar}
    <Round id={`${mod.id}-${isTinkerer ? 't' : 'a'}`} className="mb-round"
      eyebrow={`Module ${shown + 1} · ${mod.label}`}
      title={<>You’re the <em>{isTinkerer ? 'Tinkerer' : 'Archivist'}</em></>}
      intro={isTinkerer ? `${R} has the only repair manual. You have the box.` : `${T} has the box. You have the only repair manual.`}>
      {board}
      {!isTinkerer && !done && <Button className="mb-confirm" onClick={() => { markFixed(shown); setView(null); }}>{T} says it’s fixed</Button>}
      {!done && (isTinkerer
        ? <HintLadder hints={tinkerHints} level={hintLevel} onLevel={setHint} onReveal={reveal} revealLabel="Show me the fix" />
        : <HintLadder hints={archiveHints} level={hintLevel} onLevel={setHint} />)}
      {!done && <HowItWorks>{isTinkerer ? howTinker : `Ask ${T} what is on the box, find the rule on this page, and tell ${T} exactly what to do. When the box sings again, tap the button.`}</HowItWorks>}
    </Round>
  </GameShell>;
}
