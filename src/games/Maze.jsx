import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useAnimationControls } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, HandGrabbing } from '@phosphor-icons/react';
import { Finale, GameRules, GameShell, HintLadder, HowItWorks, Round, RoundProgress } from '../kit/Kit.jsx';
import { useClub, usePatch } from '../kit/club.js';
import { burstFrom } from '../kit/celebrate.js';
import { LANDMARKS, LEVELS, RUNES, parse, solve, startState, step } from './maze-levels.js';
import './Maze.css';

const INITIAL = { level: 0, cleared: [], pos: {}, pings: {}, hints: {}, finished: false };

export function progress(data = {}) {
  const done = LEVELS.filter(l => (data.cleared || []).includes(l.id)).length;
  return { done, total: LEVELS.length, finished: Boolean(data.finished) };
}

const spring = { type: 'spring', stiffness: 260, damping: 26 };
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const rnd = (x, y, i) => {
  let h = Math.imul(x + 97, 374761393) ^ Math.imul(y + 31, 668265263) ^ Math.imul(i + 7, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

// Tiny synth so bumps and chimes need no audio files.
let audio;
function tone(freq, dur, { type = 'sine', gain = .06, to } = {}) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime; const osc = audio.createOscillator(); const g = audio.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(g).connect(audio.destination); osc.start(t); osc.stop(t + dur);
  } catch {
    // Audio is optional.
  }
}
const sfx = {
  step: () => tone(420 + Math.random() * 60, .07, { type: 'triangle', gain: .02 }),
  thud: () => { tone(110, .22, { gain: .22, to: 46 }); navigator.vibrate?.(14); },
  cold: () => { tone(1500, .35, { gain: .025, to: 900 }); tone(80, .25, { gain: .2, to: 40 }); navigator.vibrate?.([10, 30, 10]); },
  chime: (notes = [660, 880, 1320]) => notes.forEach((f, i) => setTimeout(() => tone(f, .6, { gain: .045 }), i * 90)),
  fade: () => tone(520, .5, { gain: .04, to: 180 }),
};

const SAY = {
  hedge: 'Leaves, thick and scratchy. No way through.',
  gate: 'Something solid… and cold.',
  sealed: 'The garden gate won’t budge. Not yet.',
  key: 'A small iron key. You pocket it, and somewhere a lock gives.',
  rune: 'The rune drinks your light and glows.',
  fade: 'The rune flickers and goes dark.',
  reset: 'Every rune fades at once. Start the order again.',
  runes: 'All four runes burn. Far off, a latch clicks.',
  exit: 'Out of the hedge.',
};

function compass(dx, dy) {
  if (!dx && !dy) return 'right under you';
  const ns = dy < 0 ? 'north' : dy > 0 ? 'south' : '';
  const ew = dx < 0 ? 'west' : dx > 0 ? 'east' : '';
  return `to the ${ns && ew ? `${ns}-${ew}` : ns || ew}`;
}
const joinList = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

function sightings(map, pos) {
  const out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cell = map.at(pos.x + dx, pos.y + dy);
    if (!cell || cell.wall) continue;
    const where = compass(dx, dy);
    if (cell.landmark) out.push(`${LANDMARKS[cell.landmark]} ${where}`);
    if (cell.key && !pos.key) out.push(`a glint of iron ${where}`);
    if (cell.rune) out.push(`${pos.lit.includes(cell.rune) ? 'a glowing' : 'a carved'} rune ${where}`);
    if (cell.exit) out.push(`a garden gate ${where}`);
  }
  return out.length ? `Your light touches ${joinList(out)}.` : 'Only hedge and gravel in your light.';
}

// Drawn pieces (all in a -10..10 box)

const ICONS = {
  a: <g><rect x="-9" y="7" width="18" height="2.6" rx="1.3" fill="#8d8576" /><path d="M-6.5 8V0a6.5 6.5 0 0 1 8.4-6.2" fill="none" stroke="#c9c1b1" strokeWidth="3.2" strokeLinecap="round" /><path d="M6.5 8V2" stroke="#c9c1b1" strokeWidth="3.2" strokeLinecap="round" /><path d="M4.6-4.4l1.6 1.8" stroke="#c9c1b1" strokeWidth="2.6" strokeLinecap="round" /><circle cx="8.2" cy="8" r="1.2" fill="#a59d8e" /></g>,
  b: <g><rect x="-8.5" y="-6" width="17" height="2.6" rx="1.3" fill="#c48b52" /><rect x="-8.5" y="-1.4" width="17" height="3.2" rx="1.3" fill="#b07a45" /><path d="M-6.5 2v6M6.5 2v6M-6.5-3.4v2M6.5-3.4v2" stroke="#6e4a2a" strokeWidth="2" strokeLinecap="round" /></g>,
  d: <g><circle r="8.4" fill="#d8cfb8" stroke="#8d8576" strokeWidth="1.4" />{[0, 45, 90, 135, 180, 225, 270, 315].map(a => <path key={a} d="M0-7v1.8" stroke="#8d8576" strokeWidth="1" transform={`rotate(${a})`} />)}<path d="M0 .8L-5.6 2.6 0-6.4z" fill="#5f594d" /></g>,
  f: <g><ellipse cy="5.2" rx="9.2" ry="3.8" fill="#8d8576" /><ellipse cy="4.4" rx="7.4" ry="2.4" fill="#7cc6e0" /><path d="M0 4.4V-4.6" stroke="#a59d8e" strokeWidth="2.2" /><path className="ml-spray" d="M0-5c-3 0-5 3-5.6 7.4M0-5c3 0 5 3 5.6 7.4" fill="none" stroke="#a9e3f4" strokeWidth="1.4" strokeLinecap="round" /><circle cy="-6" r="1.7" fill="#a9e3f4" /></g>,
  h: <g><rect x="-1.2" y="7.6" width="2.6" height="2.4" fill="#7a5532" /><ellipse cy="3" rx="7.4" ry="5.4" fill="#4f9a5e" /><circle cx="4.6" cy="-2" r="3.8" fill="#5aab69" /><ellipse cx="3.2" cy="-8" rx="1.4" ry="3.8" fill="#5aab69" /><ellipse cx="6.3" cy="-7.6" rx="1.4" ry="3.6" fill="#4f9a5e" transform="rotate(16 6.3 -7.6)" /><circle cx="-7.2" cy="2" r="2.1" fill="#e4f0df" /><circle cx="5.8" cy="-2.6" r=".7" fill="#1d3a26" /></g>,
  l: <g><circle className="ml-glowpulse" cy="-6" r="7" fill="#f3c86a" opacity=".28" /><path d="M0 9V-3" stroke="#545a60" strokeWidth="2" /><path d="M-3.2-3h6.4l-1.2-5.4h-4z" fill="#f8db96" stroke="#545a60" strokeWidth="1.2" strokeLinejoin="round" /><path d="M-2.6-8.4h5.2l-2.6-2z" fill="#545a60" /><rect x="-3.6" y="8" width="7.2" height="2" rx="1" fill="#545a60" /></g>,
  m: <g><path d="M-4.4 8v-4.6M3.6 8V1.4M-7.6 8v-2.2" stroke="#efe6d6" strokeWidth="2.3" strokeLinecap="round" /><path d="M-9 3.8a4.6 4.6 0 0 1 9.2 0z" fill="#d9534f" /><path d="M-1.6 1.6a5.2 5.2 0 0 1 10.4 0z" fill="#e86a5a" /><path d="M-10 6.4a2.4 2.4 0 0 1 4.8 0z" fill="#e86a5a" /><circle cx="-5.6" cy="1.4" r=".8" fill="#fff" /><circle cx="2" cy="-1.6" r=".9" fill="#fff" /><circle cx="5.4" cy="-.6" r=".7" fill="#fff" /></g>,
  o: <g><rect x="-1.7" y="3" width="3.4" height="7" fill="#7a5532" /><ellipse cy="-1" rx="5.6" ry="6.2" fill="#a07a52" /><ellipse cy="1" rx="3.4" ry="3.6" fill="#c9a77e" /><circle cx="-2.3" cy="-2.6" r="2.1" fill="#fff6d8" /><circle cx="2.3" cy="-2.6" r="2.1" fill="#fff6d8" /><circle className="ml-blink" cx="-2.3" cy="-2.6" r=".95" fill="#2b2118" /><circle className="ml-blink" cx="2.3" cy="-2.6" r=".95" fill="#2b2118" /><path d="M-4.4-6l-1-3.2 3 1.6M4.4-6l1-3.2-3 1.6" fill="#a07a52" /><path d="M-.8-.6L0 .9.8-.6z" fill="#f3c86a" /></g>,
  p: <g><ellipse rx="9.4" ry="6.2" fill="#4f93ad" /><ellipse rx="7.4" ry="4.4" fill="#7cc6e0" /><circle cx="-3" r="2.7" fill="#5aab69" /><path d="M-3 0l2.6-1.2" stroke="#7cc6e0" strokeWidth=".9" /><circle cx="3.2" cy="1.2" r="1.4" fill="#f2a5c0" /><circle cx="4" cy="-2" r="1.6" fill="#5aab69" /></g>,
  r: <g><circle r="8.2" fill="#3f7a50" /><circle cx="2" cy="-2" r="6" fill="#4b8a5c" /><circle cx="-3" cy="-2" r="2.3" fill="#e0607e" /><circle cx="3.2" cy="-3.4" r="2.1" fill="#ef8da1" /><circle cx="1" cy="3" r="2.4" fill="#d94f6f" /><circle cx="-4.4" cy="3.6" r="1.5" fill="#ef8da1" /></g>,
  s: <g><rect x="-6.4" y="5" width="12.8" height="4.2" rx="1" fill="#8d8576" /><path d="M-3.2 5l1-7.4h4.4l1 7.4z" fill="#d6cfc2" /><circle cy="-5.4" r="2.9" fill="#d6cfc2" /><path d="M2-1.4l4.4-4" stroke="#d6cfc2" strokeWidth="1.9" strokeLinecap="round" /><circle cx="6.8" cy="-6" r="1.4" fill="#f3c86a" /></g>,
  u: <g><path d="M-1-8c-2-4 2-4 1-1M2-8c1-3 4-2 2 0" stroke="#5aab69" strokeWidth="1.4" fill="none" /><path d="M-5-6h10l-1 2c3 2 3 7 0 10h-8c-3-3-3-8 0-10z" fill="#c8754a" /><rect x="-6.2" y="-7.6" width="12.4" height="2.3" rx="1" fill="#a85f3a" /><path d="M-4.2 1h8.4" stroke="#e79a6b" strokeWidth="1.3" /><rect x="-3.6" y="6" width="7.2" height="2.6" rx=".8" fill="#a85f3a" /></g>,
  w: <g><path d="M-8.6-4L0-10.4 8.6-4z" fill="#b0603b" /><path d="M-6-4v7M6-4v7" stroke="#7a5532" strokeWidth="1.7" /><path d="M0-4v4.4" stroke="#7a5532" strokeWidth=".8" /><rect x="-7.4" y="2" width="14.8" height="7.4" rx="2" fill="#9b9282" /><path d="M-7.4 5.6h14.8M-2 2v3.6M3 5.6v3.8" stroke="#7c7466" strokeWidth="1" /><ellipse cy="2" rx="7.4" ry="2.1" fill="#304b56" /></g>,
};

const Key = () => <g className="ml-key"><circle cx="-4.6" r="3.8" fill="none" stroke="#f3c86a" strokeWidth="2.4" /><path d="M-.8 0H8.4M5 0v3.4M7.6 0v2.6" stroke="#f3c86a" strokeWidth="2.4" strokeLinecap="round" /></g>;
const Gate = () => <g><rect x="-9" y="-8.6" width="18" height="17.2" rx="2" fill="#2d3b43" opacity=".35" />{[-6, -2, 2, 6].map(x => <path key={x} d={`M${x}-8.4v16.8`} stroke="#9fb3bf" strokeWidth="1.8" strokeLinecap="round" />)}<path d="M-8.6-3h17.2M-8.6 3h17.2" stroke="#9fb3bf" strokeWidth="1.6" /><circle cy="0" r="2.4" fill="#f3c86a" /><path d="M-7-9l1.4 1.6M5.6-8.4l1.6-1" stroke="#e8f6ff" strokeWidth=".9" strokeLinecap="round" /></g>;
const Exit = ({ open = true }) => <g className={open ? 'ml-exit is-open' : 'ml-exit'}><circle r="9.6" fill="#f3c86a" opacity={open ? .28 : .08} className="ml-glowpulse" /><path d="M-7 9V-1a7 7 0 0 1 14 0v10" fill="none" stroke="#2c5a3c" strokeWidth="3.4" /><path d="M-5.4 9V0M-1.8 9V-4.6M1.8 9V-4.6M5.4 9V0" stroke={open ? '#f3c86a' : '#7f8a7d'} strokeWidth="1.4" strokeLinecap="round" /><path d="M-5.6 3h11.2" stroke={open ? '#f3c86a' : '#7f8a7d'} strokeWidth="1.2" /></g>;
const Rune = ({ n, lit }) => <g className={`ml-rune ${lit ? 'is-lit' : ''}`}><circle r="8.6" fill={lit ? '#5a4720' : '#4d544a'} stroke={lit ? '#f3c86a' : '#6c7568'} strokeWidth="1.2" /><path d={RUNES[n]} transform="translate(-6.4 -8) scale(1.6)" fill="none" stroke={lit ? '#ffe3a0' : '#aeb6a6'} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /></g>;
const Glyph = ({ n }) => <svg viewBox="0 0 8 10" className="ml-glyph" aria-hidden="true"><path d={RUNES[n]} fill="none" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function Hedge({ x, y, size, lush }) {
  const s = size / 20;
  const blobs = [0, 1, 2, 3].map(i => ({ cx: (rnd(x, y, i) - .5) * 9, cy: (rnd(x, y, i + 9) - .5) * 9, r: 4.2 + rnd(x, y, i + 4) * 2.6 }));
  return <g transform={`translate(${x * size + size / 2} ${y * size + size / 2}) scale(${s})`}>
    <rect x="-11" y="-11" width="22" height="22" rx="7" fill="#1f4430" />
    {blobs.map((b, i) => <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={i % 2 ? '#2f6243' : '#376f4b'} />)}
    {lush && blobs.map((b, i) => <circle key={`l${i}`} cx={b.cx - 1.4} cy={b.cy - 1.6} r={b.r * .42} fill="#4f8d5e" />)}
    {rnd(x, y, 20) > .72 && <g transform={`translate(${(rnd(x, y, 21) - .5) * 10} ${(rnd(x, y, 22) - .5) * 10})`}><circle r="1.3" fill="#f2b8c6" /><circle r=".5" fill="#f3c86a" /></g>}
  </g>;
}

function Lantern({ bright }) {
  return <svg className={`ml-lantern-svg ${bright ? 'is-bright' : ''}`} viewBox="-20 -30 40 56" aria-hidden="true">
    <path d="M-6-21a6 6 0 0 1 12 0" fill="none" stroke="#2e2a22" strokeWidth="2.2" />
    <path d="M-8-15h16l-2.4-5h-11.2z" fill="#3e3a2e" />
    <rect x="-9" y="-15" width="18" height="26" rx="5" fill="#ffd98a" opacity=".92" />
    <rect x="-9" y="-15" width="18" height="26" rx="5" fill="none" stroke="#2e2a22" strokeWidth="2" />
    <path d="M-3-15v26M3-15v26" stroke="#2e2a22" strokeWidth="1.1" opacity=".5" />
    <path className="ml-flame" d="M0 6c-4 0-4.6-4.4-1.2-8.4.6 1.8 1.6 2.2 2.4.6 2.6 3 2.6 7.8-1.2 7.8z" fill="#ff9d3c" />
    <path d="M-10 11h20l-2 4h-16z" fill="#3e3a2e" />
  </svg>;
}

// Lantern view

const C = 100;
const HEADING = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function LanternView({ level, saved, onSave, onExit, trailUntil }) {
  const map = parse(level);
  const pos = saved || startState(level);
  const posRef = useRef(pos); posRef.current = pos;
  const [say, setSay] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [flash, setFlash] = useState(0);
  const sprite = useAnimationControls();
  const boardRef = useRef(null);
  const swipe = useRef(null);
  const sayTimer = useRef(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (trailUntil <= Date.now()) return undefined;
    setNow(Date.now());
    const id = setTimeout(() => setNow(Date.now()), trailUntil - Date.now() + 20);
    return () => clearTimeout(id);
  }, [trailUntil]);
  const trail = useMemo(() => trailUntil > now ? solve(level, pos) : null, [trailUntil, now, level, pos]);

  const speak = event => { clearTimeout(sayTimer.current); setSay(SAY[event]); sayTimer.current = setTimeout(() => setSay(null), 2600); };
  useEffect(() => () => clearTimeout(sayTimer.current), []);

  const move = dir => {
    if (leaving) return;
    const [dx, dy] = HEADING[dir];
    const { state, event, bump } = step(level, posRef.current, dir);
    if (bump) {
      event === 'gate' ? sfx.cold() : sfx.thud();
      if (event !== 'hedge') speak(event); else if (Math.random() < .35) speak(event);
      sprite.start({ x: [0, dx * 16, 0], y: [0, dy * 16, 0], scaleX: dx ? [1, .78, 1.06, 1] : [1, 1.16, .96, 1], scaleY: dy ? [1, .78, 1.06, 1] : [1, 1.16, .96, 1], transition: { duration: .38, ease: 'easeOut' } });
      return;
    }
    posRef.current = state;
    onSave(state);
    sprite.start({ y: [0, -7, 0], rotate: [0, dx * -6, 0], transition: { duration: .3 } });
    if (event === 'move') { sfx.step(); return; }
    speak(event);
    if (event === 'key') { sfx.chime([520, 780]); setFlash(f => f + 1); }
    if (event === 'rune') { sfx.chime([440, 660]); setFlash(f => f + 1); }
    if (event === 'runes') { sfx.chime([440, 554, 660, 880]); setFlash(f => f + 1); }
    if (event === 'fade' || event === 'reset') sfx.fade();
    if (event === 'exit') {
      setLeaving(true); sfx.chime([523, 659, 784, 1046]);
      burstFrom(boardRef.current, { shape: ['star', 'spark'], count: 60 });
      setTimeout(onExit, 1500);
    }
  };
  const moveRef = useRef(move); moveRef.current = move;

  useEffect(() => {
    const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const onKey = e => {
      if (e.target.closest?.('input, textarea, select')) return;
      const dir = keys[e.key];
      if (!dir) return;
      e.preventDefault(); moveRef.current(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const down = e => { swipe.current = { x: e.clientX, y: e.clientY }; };
  const up = e => {
    const s = swipe.current; swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x; const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  const cells = [];
  for (let y = pos.y - 2; y <= pos.y + 2; y++) for (let x = pos.x - 2; x <= pos.x + 2; x++) {
    const cell = map.at(x, y);
    const near = Math.max(Math.abs(x - pos.x), Math.abs(y - pos.y)) <= 1;
    cells.push({ x, y, cell, near });
  }
  const camera = { x: -(pos.x * C + C / 2), y: -(pos.y * C + C / 2) };
  const allLit = pos.lit.length >= map.runes;

  return <div className="ml">
    <div ref={boardRef} className={`ml-board ${leaving ? 'is-leaving' : ''}`} onPointerDown={down} onPointerUp={up} onPointerCancel={() => { swipe.current = null; }}>
      <svg className="ml-world" viewBox="-250 -250 500 500" aria-hidden="true">
        <motion.g initial={false} animate={camera} transition={spring}>
          {cells.map(({ x, y, cell, near }) => <g key={`${x},${y}`} className="ml-cell" style={{ opacity: near ? 1 : 0 }}>
            {!cell || cell.wall ? <Hedge x={x} y={y} size={C} lush /> : <g transform={`translate(${x * C + C / 2} ${y * C + C / 2})`}>
              <rect x="-52" y="-52" width="104" height="104" fill="#4a4636" />
              {[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx={(rnd(x, y, i) - .5) * 84} cy={(rnd(x, y, i + 30) - .5) * 84} r={2 + rnd(x, y, i + 60) * 3} fill="#6b6650" opacity=".7" />)}
              {cell.landmark && <g transform="scale(3.3)">{ICONS[cell.landmark]}</g>}
              {cell.key && !pos.key && <g transform="scale(3)"><Key /></g>}
              {cell.rune && <g transform="scale(3.6)"><Rune n={cell.rune} lit={pos.lit.includes(cell.rune)} /></g>}
              {cell.exit && <g transform="scale(4)"><Exit open={allLit} /></g>}
            </g>}
          </g>)}
        </motion.g>
      </svg>
      <div className="ml-glow" />
      <AnimatePresence>{flash > 0 && <motion.div key={flash} className="ml-flash" initial={{ opacity: .9, scale: .4 }} animate={{ opacity: 0, scale: 1.6 }} transition={{ duration: .9 }} />}</AnimatePresence>
      <FogCanvas />
      <div className="ml-fog" />
      <AnimatePresence>{trail && <motion.svg key="trail" className="ml-trail" viewBox="-250 -250 500 500" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: .8 } }}>
        <motion.g initial={false} animate={camera} transition={spring}>
          <polyline points={trail.map(([x, y]) => `${x * C + C / 2},${y * C + C / 2}`).join(' ')} fill="none" stroke="#ffe3a0" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 22" />
          {trail.slice(0, -1).map(([x, y], i) => {
            const [nx, ny] = trail[i + 1];
            return <path key={i} d="M-10-12L6 0-10 12" fill="none" stroke="#ffe3a0" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${(x + nx) / 2 * C + C / 2} ${(y + ny) / 2 * C + C / 2}) rotate(${Math.atan2(ny - y, nx - x) * 180 / Math.PI})`} />;
          })}
        </motion.g>
      </motion.svg>}</AnimatePresence>
      <motion.div className="ml-lantern" animate={sprite}><Lantern bright={leaving} /></motion.div>
      <span className="ml-north" aria-hidden="true">N</span>
    </div>

    <AnimatePresence mode="wait" initial={false}>
      <motion.p key={say || sightings(map, pos)} className={`ml-caption ${say ? 'is-event' : ''}`} aria-live="polite" initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .25 }}>
        {say || sightings(map, pos)}
      </motion.p>
    </AnimatePresence>

    <div className="ml-pad" role="group" aria-label="Walk">
      {[['up', ArrowUp, 'north'], ['left', ArrowLeft, 'west'], ['right', ArrowRight, 'east'], ['down', ArrowDown, 'south']].map(([dir, Icon, name]) => <motion.button key={dir} type="button" className={`ml-pad-${dir}`} onClick={() => move(dir)} whileTap={{ scale: .86 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} aria-label={`Walk ${name}`} disabled={leaving}><Icon size={22} weight="bold" /></motion.button>)}
      <span className="ml-pad-hub" aria-hidden="true" />
    </div>
  </div>;
}

function FogCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; const ctx = canvas?.getContext('2d');
    if (!ctx) return undefined;
    const still = reducedMotion();
    let raf = 0; let w = 0; let h = 0;
    const resize = () => {
      const box = canvas.getBoundingClientRect(); const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = box.width; h = box.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const puffs = Array.from({ length: 14 }, (_, i) => ({ x: rnd(i, 1, 1), y: rnd(i, 2, 2), r: .2 + rnd(i, 3, 3) * .24, vx: (rnd(i, 4, 4) - .5) * .0022, vy: (rnd(i, 5, 5) - .5) * .0012, a: .05 + rnd(i, 6, 6) * .08 }));
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of puffs) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -.4) p.x = 1.4; if (p.x > 1.4) p.x = -.4; if (p.y < -.4) p.y = 1.4; if (p.y > 1.4) p.y = -.4;
        const cx = p.x * w; const cy = p.y * h; const r = p.r * w;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(206, 226, 214, ${p.a})`); g.addColorStop(1, 'rgba(206, 226, 214, 0)');
        ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      if (!still) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} className="ml-fogfx" aria-hidden="true" />;
}

// Mapkeeper view

const M = 20;

function MapSheet({ level, ping, onPing, reveal = false }) {
  const map = parse(level);
  const pid = useId().replace(/:/g, '');
  const tap = e => {
    if (!onPing) return;
    const svg = e.currentTarget; const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const x = Math.floor(p.x / M); const y = Math.floor(p.y / M);
    const cell = map.at(x, y);
    if (!cell || cell.wall) return;
    onPing(ping === `${x},${y}` ? null : `${x},${y}`);
  };
  const [px, py] = ping ? ping.split(',').map(Number) : [];
  const hedges = [];
  for (let y = -1; y <= map.h; y++) for (let x = -1; x <= map.w; x++) if (!map.at(x, y) || map.at(x, y).wall) hedges.push([x, y]);
  return <div className="mk-sheet">
    <svg className="mk-map" viewBox={`${-M - 6} ${-M - 14} ${(map.w + 2) * M + 12} ${(map.h + 2) * M + 20}`} onClick={tap} role={onPing ? 'img' : undefined} aria-label={`Map of the hedge maze, ${map.w} by ${map.h}`}>
      <defs>
        <pattern id={`g${pid}`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="#b8a27c" /><circle cx="5.5" cy="5" r=".5" fill="#c7b38f" /></pattern>
      </defs>
      <rect x={-M - 6} y={-M - 14} width={(map.w + 2) * M + 12} height={(map.h + 2) * M + 20} rx="10" fill="#efe2c4" />
      <rect x="0" y="0" width={map.w * M} height={map.h * M} fill={`url(#g${pid})`} />
      {hedges.map(([x, y]) => <Hedge key={`${x},${y}`} x={x} y={y} size={M} />)}
      {map.cells.flat().filter(c => !c.wall).map(c => <g key={`${c.x},${c.y}`} transform={`translate(${c.x * M + M / 2} ${c.y * M + M / 2}) scale(.78)`}>
        {c.landmark && ICONS[c.landmark]}
        {c.key && <Key />}
        {c.gate && <Gate />}
        {c.rune && reveal && <Rune n={c.rune} lit />}
        {c.exit && <Exit />}
      </g>)}
      <g transform={`translate(${map.w * M / 2} ${-M - 4})`} className="mk-compass"><path d="M0-6l3 6h-6z" fill="#7a5532" /><text y="9" textAnchor="middle">N</text></g>
      <AnimatePresence>{ping && <motion.g key={ping} initial={{ opacity: 0, y: -14, scale: 1.4 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .6 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
        <circle className="mk-ping-ring" cx={px * M + M / 2} cy={py * M + M / 2} r="9" fill="none" stroke="#e0a43c" strokeWidth="1.6" />
        <g transform={`translate(${px * M + M / 2} ${py * M + M / 2 - 3}) scale(.42)`}><circle r="14" fill="#f3c86a" opacity=".35" /><path d="M-6-14h12l-2-4h-8z" fill="#3e3a2e" /><rect x="-7" y="-14" width="14" height="20" rx="4" fill="#ffd98a" stroke="#3e3a2e" strokeWidth="2" strokeDasharray="4 3" /></g>
      </motion.g>}</AnimatePresence>
    </svg>
  </div>;
}

function HoldButton({ children, onDone }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef(0);
  const start = () => { setHolding(true); timer.current = setTimeout(() => { setHolding(false); onDone(); }, 900); };
  const stop = () => { clearTimeout(timer.current); setHolding(false); };
  useEffect(() => () => clearTimeout(timer.current), []);
  return <button type="button" className={`mk-hold ${holding ? 'is-holding' : ''}`} onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={e => e.preventDefault()} onClick={e => { if (e.detail === 0) onDone(); }}>
    <span className="mk-hold-fill" aria-hidden="true" />
    <HandGrabbing size={20} weight="duotone" /><span>{children}</span><small>hold</small>
  </button>;
}

function MapView({ level, ping, onPing, onOut, bearer }) {
  const map = parse(level);
  const ref = useRef(null);
  const pinned = ping && map.at(...ping.split(',').map(Number));
  const caption = !ping ? `Tap where you think ${bearer} is to drop a pin.`
    : pinned?.landmark ? `Pinned by ${LANDMARKS[pinned.landmark]}.`
      : pinned?.key ? 'Pinned on the key.' : pinned?.gate ? 'Pinned on the locked gate.' : pinned?.exit ? 'Pinned at the garden gate out.' : 'Pinned on a bare stretch of path.';
  const out = () => { burstFrom(ref.current, { shape: ['star', 'spark'], count: 60 }); sfx.chime([523, 659, 784, 1046]); setTimeout(onOut, 700); };
  return <div className="mk" ref={ref}>
    <MapSheet level={level} ping={ping} onPing={onPing} />
    <AnimatePresence mode="wait" initial={false}>
      <motion.p key={caption} className="ml-caption" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .22 }}>{caption}</motion.p>
    </AnimatePresence>
    {level.order && <div className="mk-plaque">
      <span className="micro">Light the runes in this order</span>
      <ol>{level.order.map((n, i) => <motion.li key={n} initial={{ opacity: 0, y: 10, rotate: -8 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ ...spring, delay: .15 + i * .12 }}><em>{i + 1}</em><Glyph n={n} /></motion.li>)}</ol>
    </div>}
    <HoldButton onDone={out}>{bearer} made it out</HoldButton>
  </div>;
}

// Copy

const HINTS = {
  l1: [
    'Lantern, start with the landmark you can see first, then say which sides are open.',
    'Mapkeeper, count turns, not steps: “right at the well, then left” travels better than numbers.',
    'The way out runs past the little well and then the fountain.',
  ],
  l2: [
    'Lantern, describe every side of your light, corners included.',
    'Mapkeeper, the cold thing is a locked gate. The key hides in the far north-east corner, up the east side past the broken arch.',
    'Key first, then walk the long corridor west past the statue to the gate.',
  ],
  l3: [
    'Lantern, describe each rune by its shape: strokes, hooks, which way the arms point.',
    'Mapkeeper, count turns, not steps, and keep the fountain as home base.',
    'Each rune sits in a different corner of the garden, a short walk from the fountain.',
  ],
};

function howTo(level, role, bearer, keeper) {
  if (role === 'lantern') {
    if (level.id === 'l2') return `Something in this hedge is solid and cold. There is a key out there, and only you can pick it up. Tell ${keeper} what your light touches.`;
    if (level.id === 'l3') return `Four runes glow on your screen only. ${keeper} knows the order. Step on them in that order; a wrong one fades them all.`;
    return `Your light reaches one step in every direction, corners too. Name what is in it and ${keeper} will find you on the map.`;
  }
  if (level.id === 'l2') return `The bars on your map are a locked gate ${bearer} can’t see. Only ${bearer} can pick up the key, and then the gate opens for them.`;
  if (level.id === 'l3') return `${bearer} can see the runes on the ground and you can’t, but only you know the order. Describe the shapes, they find the stones.`;
  return `Landmarks look the same on both screens. Pin one and its name appears under the map, so you both call it the same thing.`;
}

// Finale

const SKY = Array.from({ length: 16 }, (_, i) => ({ x: 6 + rnd(i, 8, 1) * 88, s: .5 + rnd(i, 8, 2) * .6, d: rnd(i, 8, 3) * 7, t: 9 + rnd(i, 8, 4) * 6, sway: (rnd(i, 8, 5) - .5) * 30 }));

function SkyRelease({ a, b }) {
  return <div className="mz-sky" aria-hidden="true">
    {Array.from({ length: 22 }, (_, i) => <i key={i} className="mz-star" style={{ left: `${rnd(i, 3, 1) * 100}%`, top: `${rnd(i, 3, 2) * 70}%`, animationDelay: `${rnd(i, 3, 3) * 3}s` }} />)}
    {SKY.map((l, i) => <span key={i} className="mz-sky-lantern" style={{ left: `${l.x}%`, '--s': l.s, '--sway': `${l.sway}px`, animationDelay: `${l.d}s`, animationDuration: `${l.t}s` }}><Lantern /></span>)}
    {[a, b].map((name, i) => <motion.span key={name} className="mz-ours" style={{ left: `${38 + i * 18}%` }} initial={{ y: 60, opacity: 0 }} animate={{ y: -150, opacity: [0, 1, 1, .85] }} transition={{ duration: 6, delay: .6 + i * .5, ease: [.3, 0, .2, 1] }}>
      <Lantern bright /><b>{name}</b>
    </motion.span>)}
    <svg className="mz-hedgeline" viewBox="0 0 400 40" preserveAspectRatio="none"><path d="M0 40V22c20-14 34 4 52-6s30-10 46 2 30-12 50-4 26 10 44-2 34-8 52 4 32-10 50-2 34 6 52-4 22 4 54 2v28z" fill="#1f4430" /></svg>
  </div>;
}

// Game

export default function Maze({ data, update }) {
  const { me, nameOf } = useClub();
  const [state, patch] = usePatch(data, update, INITIAL);
  const [trailUntil, setTrailUntil] = useState(0);
  const index = Math.max(0, Math.min(LEVELS.length - 1, state.level || 0));
  const level = LEVELS[index];
  const cleared = state.cleared || [];
  const keeperRole = level.mapkeeper; const lanternRole = keeperRole === 'A' ? 'B' : 'A';
  const keeper = nameOf(keeperRole); const bearer = nameOf(lanternRole);
  const role = (me || 'A') === keeperRole ? 'map' : 'lantern';
  const isCleared = cleared.includes(level.id);
  const hintLevel = state.hints?.[level.id] || 0;

  useEffect(() => setTrailUntil(0), [level.id]);

  const clear = () => patch(old => {
    const done = old.cleared.includes(level.id) ? old.cleared : [...old.cleared, level.id];
    const finished = LEVELS.every(l => done.includes(l.id));
    return { cleared: done, finished, level: finished ? index : Math.min(index + 1, LEVELS.length - 1) };
  });
  const replay = () => { setTrailUntil(0); update(() => ({ ...INITIAL })); };
  const rules = <GameRules steps={[
    { title: 'Two phones, two jobs', text: `Each level one of you keeps the map and the other carries the lantern. ${nameOf('A')} keeps the first map, then you swap every level.` },
    { title: 'The Lantern', text: 'Sees only a small circle of light. Walk with swipes, the arrows or the keyboard, and say what your light touches.' },
    { title: 'The Mapkeeper', text: 'Sees the whole hedge but not the lantern. Work out where it is, pin your guess on the map and talk it to the garden gate.' },
    { title: 'Getting out', text: 'The Lantern’s phone opens the next level at the gate. The Mapkeeper holds the button once their partner is out.' },
  ]} />;

  return <MotionConfig reducedMotion="user">
    <GameShell title="Fog Lantern Maze" number="Game 05" tone="moss" backdrop="fog" rules={rules}>
      {state.finished ? <Finale eyebrow="Three hedges, all by voice" title={<>Every lantern <em>home</em></>} onReplay={replay} replayLabel="Start over from the first hedge">
        <SkyRelease a={nameOf('A')} b={nameOf('B')} />
        <p>{nameOf('A')}, {nameOf('B')}: you crossed three hedges in the dark with nothing but each other’s voices. One of you could always see, one of you always trusted. Same sky tonight, two windows.</p>
      </Finale> : <>
        <RoundProgress rounds={LEVELS.map(l => ({ id: l.id, label: l.label }))} current={index} done={cleared} onSelect={i => patch({ level: i })} />
        <Round id={`${level.id}-${role}-${isCleared ? 'out' : 'in'}`} className="maze-round"
          title={isCleared ? <>Out of the <em>hedge</em></> : <>You’re the <em>{role === 'map' ? 'Mapkeeper' : 'Lantern'}</em> this level</>}
          intro={isCleared ? `${keeper} kept the map, ${bearer} carried the light.` : role === 'map' ? `${bearer} is somewhere in the fog. Ask what they see, find them, talk them home.` : `${keeper} has the map but can’t see you. Say what your light touches.`}>
          {isCleared ? <div className="mk mk-cleared"><MapSheet level={level} reveal /><span className="mk-stamp">Out</span></div>
            : role === 'lantern' ? <LanternView key={level.id} level={level} saved={state.pos?.[level.id]} onSave={s => patch(old => ({ pos: { ...old.pos, [level.id]: s } }))} onExit={clear} trailUntil={trailUntil} />
              : <MapView key={level.id} level={level} bearer={bearer} ping={state.pings?.[level.id] || null} onPing={p => patch(old => ({ pings: { ...old.pings, [level.id]: p } }))} onOut={clear} />}
          {!isCleared && <HintLadder hints={HINTS[level.id]} level={hintLevel} onLevel={n => patch(old => ({ hints: { ...old.hints, [level.id]: n } }))}
            onReveal={role === 'lantern' ? () => setTrailUntil(Date.now() + 5000) : undefined} revealLabel="Light a trail for five seconds" />}
          {!isCleared && <HowItWorks>{howTo(level, role, bearer, keeper)}</HowItWorks>}
        </Round>
      </>}
    </GameShell>
  </MotionConfig>;
}

