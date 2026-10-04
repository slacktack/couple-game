import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { CaretLeft, CaretRight, LockKeyOpen, PaperPlaneTilt, Sparkle } from '@phosphor-icons/react';
import { AnswerLock, Button, Finale, GameRules, GameShell, HintLadder, HowItWorks, PrivatePanel, Round, RoundProgress } from '../kit/Kit.jsx';
import { useClub, usePatch } from '../kit/club.js';
import { burstFrom } from '../kit/celebrate.js';
import './Observatory.css';

const ANSWERS = ['566', 'ORBIT', '9', 'COMET', 'SPACE'];
const SWITCH_KEYS = ['A', 'B', 'C', 'D', 'E'];
const INITIAL = { step: 0, completed: [], hints: {}, finished: false, switches: { A: false, B: false, C: false, D: false, E: false }, bonus: {} };

const CONSTELLATIONS = [
  { name: 'ORION', line: '14 44 29 18 40 36 56 13 68 37 84 28', points: [[14, 44], [29, 18], [40, 36], [56, 13], [68, 37], [84, 28]] },
  { name: 'LYRA', line: '18 30 39 48 56 19 79 36 56 19', points: [[18, 30], [39, 48], [56, 19], [79, 36]] },
  { name: 'CYGNUS', line: '17 48 34 25 51 45 68 20 85 39', points: [[17, 48], [34, 25], [51, 45], [68, 20], [85, 39]] },
  { name: 'DRACO', line: '12 23 31 40 49 25 65 48 83 28 92 53', points: [[12, 23], [31, 40], [49, 25], [65, 48], [83, 28], [92, 53]] },
  { name: 'TAURUS', line: '16 20 38 41 58 24 78 47 38 41 35 62', points: [[16, 20], [38, 41], [58, 24], [78, 47], [35, 62]] },
  { name: 'GEMINI', line: '27 15 31 35 35 55 68 15 64 35 60 55 31 35 64 35', points: [[27, 15], [31, 35], [35, 55], [68, 15], [64, 35], [60, 55]] },
];
const toPath = line => { const n = line.split(' ').map(Number); let d = ''; for (let i = 0; i < n.length; i += 2) d += `${i ? 'L' : 'M'}${n[i]} ${n[i + 1]} `; return d.trim(); };

const LOCKS = [
  {
    label: 'Stars', owner: 'A', title: <>The constellation <em>grid</em></>,
    intro: 'Six constellations on the chart. Three of them hold the archive code.',
    note: <><p>Find the constellations whose names have <b>exactly one repeated letter</b>. Focus on repeated letters anywhere in the name, not just side by side.</p><p>Count the letters in each of those names, then read the counts in sky order: left to right, top row first. That’s a three-digit code.</p></>,
    accept: ['566'], placeholder: 'Archive code',
    hints: ['Only three names have a single letter that shows up twice.', 'Those names are ORION, TAURUS and GEMINI.', 'Count their letters in sky order: 5, 6, 6.'],
    how: 'Tap a constellation to pin it and trace its lines. Talk it through, then type the code you agree on.',
  },
  {
    label: 'Mirror', owner: 'B', title: <>Mirror <em>transmission</em></>,
    intro: 'The receiver caught a reflected signal. A keyword is tucked inside it.',
    note: <><p>A scrap of paper taped to the receiver says: <i>“The signal was reflected before it arrived.”</i></p><p>Turn the glass so it reads the right way, then put the spaces back. It’s a four-word phrase, and the keyword is its last word.</p></>,
    accept: ['ORBIT', 'LOCK IN THE ORBIT'], placeholder: 'Keyword',
    hints: ['Tap the glass to turn it over.', 'With spaces back it reads LOCK IN THE ORBIT.', 'The keyword is ORBIT.'],
    how: 'Tap the glass slide to flip it over. Agree on the keyword, then type it.',
  },
  {
    label: 'Switches', owner: 'A', title: <>The five <em>switches</em></>,
    intro: 'The main bus is dark. Find the switches that bring it back.',
    note: <><ul className="obs-rules"><li>A is ON only when B is OFF.</li><li>C is the opposite of A.</li><li>D matches B.</li><li>E is the opposite of D.</li><li>Exactly three switches are ON.</li></ul><p>The code is the ON switches’ letters, or their alphabet places added up (A = 1 … E = 5).</p></>,
    accept: ['9', 'BCD'], placeholder: 'Switch code',
    hints: ['Try B as ON first, then follow each rule in turn.', 'If B is OFF, only A and E come on. That’s two, not three.', 'B, C and D are on: 2 + 3 + 4 = 9.'],
    how: 'Flip switches to test ideas. The panel shows what’s live; it never checks your logic.',
  },
  {
    label: 'Cipher', owner: 'B', title: <>The star-map <em>cipher</em></>,
    intro: 'A short transmission came through scrambled. The wheel can turn it back.',
    note: <><p className="obs-cipher-text" aria-label="L X V N C">LXVNC</p><p>That’s the scrambled transmission. Move each letter backward through the alphabet by the code that opened Lock 03, wrapping from A round to Z.</p></>,
    accept: ['COMET'], placeholder: 'Five letters',
    hints: ['The key is the code from Lock 03.', 'Turn the wheel back 9, then read L, X, V, N and C on the outer ring.', 'LXVNC becomes COMET.'],
    how: 'Drag the inner disc or use the arrows to set the shift. Tap a letter on the outer ring to light its partner on the disc.',
  },
  {
    label: 'Vault', title: <>The final <em>vault</em></>,
    intro: 'Two sky words, one destination. Send the archive there.',
    a: 'Your words so far: ORBIT and COMET.', b: 'Think of one place where both an orbit and a comet belong.',
    hints: ['Both live well beyond Earth.', 'Orbits and comets share one home, up past the sky.', 'The destination is SPACE.'],
    how: 'You each hold half of the last clue. Share yours, then tap the destination you agree on.',
  },
];

// Stable elements: PrivatePanel re-hides whenever its a/b identity changes.
const NOTES = LOCKS.map(l => l.note ? <div className="obs-note">{l.note}</div> : { a: <div className="obs-note"><p>{l.a}</p></div>, b: <div className="obs-note"><p>{l.b}</p></div> });

const RULES = [
  { title: 'Five locks, in order', text: 'Each lock opens the next. The answers you earn add up to the archive at the end.' },
  { title: 'One of you navigates', text: 'Tushar holds the notes for Locks 01 and 03, Riya for 02 and 04. The navigator reads their note aloud; the other solves out loud with them. Lock 05 is split between you.' },
  { title: 'Play with the room', text: 'The star chart, mirror glass, switchboard and cipher wheel all move. Poke at them while you talk.' },
  { title: 'Stuck is fine', text: 'Hints open one at a time. After the last one you can reveal the answer and keep going.' },
];

const seeded = (count, seed) => { let s = seed; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; return Array.from({ length: count }, (_, i) => ({ i, x: r() * 100, y: r() * 100, s: .6 + r() * 1.8, d: r() * 4 }));
};
const SKY = seeded(46, 7);

function useNarrow(query = '(max-width: 560px)') {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => { const m = window.matchMedia(query); const on = () => setNarrow(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on); }, [query]);
  return narrow;
}

function Sky() {
  return <div className="obs-sky" aria-hidden="true">{SKY.map(star => <i key={star.i} style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.s, height: star.s, animationDelay: `${star.d}s` }} />)}</div>;
}

function Unlocked({ lock }) {
  return <motion.div className="obs-unlocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.span className="obs-unlocked-seal" initial={{ scale: 2.4, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: -8, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 14 }}>
      <LockKeyOpen size={30} weight="duotone" /><b>Lock 0{lock + 1} open</b><span>{ANSWERS[lock]}</span>
    </motion.span>
  </motion.div>;
}

function StarChart() {
  const narrow = useNarrow();
  const [lit, setLit] = useState(null);
  const [pinned, setPinned] = useState([]);
  const cols = narrow ? 2 : 3;
  const cellW = 110, cellH = narrow ? 104 : 100;
  const toggle = name => setPinned(p => p.includes(name) ? p.filter(n => n !== name) : [...p, name]);
  return <div className="obs-chart">
    <svg viewBox={`0 0 ${cols * cellW} ${Math.ceil(6 / cols) * cellH}`} role="group" aria-label="Star chart with six constellations">
      {CONSTELLATIONS.map((c, index) => {
        const x = (index % cols) * cellW + 5, y = Math.floor(index / cols) * cellH + 6;
        const on = lit === c.name || pinned.includes(c.name);
        const isPinned = pinned.includes(c.name);
        return <g key={c.name} transform={`translate(${x} ${y})`} className={`obs-const ${on ? 'is-lit' : ''} ${isPinned ? 'is-pinned' : ''}`}
          role="button" tabIndex={0} aria-pressed={isPinned} aria-label={c.name}
          onPointerEnter={() => setLit(c.name)} onPointerLeave={() => setLit(l => l === c.name ? null : l)}
          onFocus={() => setLit(c.name)} onBlur={() => setLit(null)}
          onClick={() => toggle(c.name)} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle(c.name))}>
          <rect className="obs-const-hit" x="-4" y="-4" width="108" height={cellH - 4} rx="14" />
          <path className="obs-const-ghost" d={toPath(c.line)} />
          <motion.path className="obs-const-line" d={toPath(c.line)} initial={false} animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }} transition={{ duration: on ? .9 : .35, ease: [.22, 1, .36, 1] }} />
          {c.points.map(([cx, cy], i) => <motion.circle key={i} cx={cx} cy={cy} r={i === 0 ? 2.8 : 2.1} className="obs-const-star" style={{ animationDelay: `${(index + i) * .37}s` }}
            animate={{ scale: on ? 1.35 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 12, delay: on ? i * .06 : 0 }} />)}
          <text className="obs-const-num" x="2" y="80">0{index + 1}</text>
          <text className="obs-const-name" x="18" y="80">{c.name}</text>
          <AnimatePresence>{isPinned && <motion.g initial={{ scale: 0, y: -10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }}>
            <path className="obs-pin" d="M94 4 l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" />
          </motion.g>}</AnimatePresence>
        </g>;
      })}
    </svg>
  </div>;
}

function MirrorReceiver() {
  const [flipped, setFlipped] = useState(false);
  const letters = 'LOCKINTHEORBIT'.split('');
  return <div className="obs-receiver">
    <svg className="obs-orbit" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="16" className="obs-orbit-planet" />
      <ellipse cx="60" cy="60" rx="50" ry="20" className="obs-orbit-ring" transform="rotate(-18 60 60)" />
      <ellipse cx="60" cy="60" rx="36" ry="52" className="obs-orbit-ring is-faint" transform="rotate(30 60 60)" />
      <g className="obs-orbit-spin"><circle cx="60" cy="8" r="3.2" className="obs-orbit-comet" /><path d="M60 8 Q44 6 34 12" className="obs-orbit-tail" /></g>
    </svg>
    <span className="micro obs-receiver-label">Incoming · reflected</span>
    <div className="obs-glass-stage">
      <motion.button type="button" className="obs-glass" onClick={() => setFlipped(f => !f)} aria-label={flipped ? 'Turn the glass back' : 'Turn the glass over'}
        animate={{ rotateY: flipped ? 180 : 0 }} whileTap={{ scale: .96 }} transition={{ type: 'spring', stiffness: 140, damping: 13 }}>
        <span className="obs-glass-face is-front"><span className="obs-mirrored">{letters.map((l, i) => <span key={i} style={{ animationDelay: `${i * .12}s` }}>{l}</span>)}</span></span>
        <span className="obs-glass-face is-back"><span>{letters.map((l, i) => <span key={i} style={{ animationDelay: `${i * .12}s` }}>{l}</span>)}</span></span>
      </motion.button>
    </div>
  </div>;
}

function Switchboard({ switches, onFlip }) {
  const live = SWITCH_KEYS.filter(k => switches[k]);
  return <div className={`obs-panel ${live.length === 3 ? 'is-closed' : ''}`}>
    <div className="obs-panel-head">
      <span className="micro">Main bus</span>
      <span className="obs-readout" aria-live="polite">{live.length ? live.map(k => <motion.b key={k} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{k}</motion.b>) : <i>all dark</i>}</span>
    </div>
    <div className="obs-bus" aria-hidden="true"><motion.span className="obs-bus-fill" animate={{ scaleX: live.length / 5 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }} /></div>
    <div className="obs-switches">
      {SWITCH_KEYS.map(k => {
        const on = !!switches[k];
        return <button type="button" key={k} className={`obs-switch ${on ? 'is-on' : ''}`} aria-pressed={on} aria-label={`Switch ${k}`} onClick={() => onFlip(k)}>
          <span className="obs-wire" />
          <motion.span className="obs-lamp" animate={{ scale: on ? [1, 1.35, 1] : 1 }} transition={{ duration: .4 }} />
          <span className="obs-slot"><motion.span className="obs-lever" animate={{ rotate: on ? -32 : 32 }} transition={{ type: 'spring', stiffness: 520, damping: 13 }}><i /></motion.span></span>
          <b>{k}</b>
        </button>;
      })}
    </div>
  </div>;
}

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const STEP = 360 / 26;
const mod26 = n => ((n % 26) + 26) % 26;
const polar = (r, i) => { const a = (i * STEP - 90) * Math.PI / 180; return [r * Math.cos(a), r * Math.sin(a)]; };

function CipherWheel() {
  const [turn, setTurn] = useState(0);
  const [picked, setPicked] = useState(null);
  const svgRef = useRef(null);
  const drag = useRef(null);
  const shift = mod26(turn);
  const angleAt = e => { const b = svgRef.current.getBoundingClientRect(); return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI; };
  const down = e => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { last: angleAt(e), acc: 0, start: turn }; };
  const move = e => {
    if (!drag.current) return;
    const a = angleAt(e); let d = a - drag.current.last; if (d > 180) d -= 360; if (d < -180) d += 360;
    drag.current.last = a; drag.current.acc += d;
    setTurn(drag.current.start + Math.round(drag.current.acc / STEP));
  };
  const up = () => { drag.current = null; };
  const pickAt = e => { const b = svgRef.current.getBoundingClientRect(); const a = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI + 90; setPicked(p => { const i = mod26(Math.round(a / STEP)); return p === i ? null : i; }); };
  const pairInner = picked === null ? null : mod26(picked - shift);
  return <div className="obs-wheel">
    <svg ref={svgRef} viewBox="-150 -150 300 300" className="obs-wheel-svg" role="img" aria-label={`Cipher wheel turned back ${shift}`}>
      <circle r="148" className="obs-wheel-rim" />
      <path className="obs-wheel-hit" d="M0-146A146 146 0 1 1 0 146A146 146 0 1 1 0-146M0-112A112 112 0 1 0 0 112A112 112 0 1 0 0-112Z" onClick={pickAt} />
      {ALPHA.map((l, i) => { const [x, y] = polar(129, i); return <text key={l} x={x} y={y} transform={`rotate(${i * STEP} ${x} ${y})`} className={`obs-wheel-out ${picked === i ? 'is-picked' : ''}`}>{l}</text>; })}
      <AnimatePresence>{picked !== null && <motion.line key={picked} x1={polar(46, picked)[0]} y1={polar(46, picked)[1]} x2={polar(142, picked)[0]} y2={polar(142, picked)[1]} className="obs-wheel-beam" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>
      <motion.g className="obs-wheel-disc" animate={{ rotate: turn * STEP }} transition={{ type: 'spring', stiffness: 210, damping: 18 }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <circle r="110" className="obs-wheel-plate" />
        {ALPHA.map((l, i) => { const [x, y] = polar(94, i); const [tx, ty] = polar(108, i); return <g key={l}>
          <line x1={polar(76, i)[0]} y1={polar(76, i)[1]} x2={tx} y2={ty} className="obs-wheel-tick" />
          <text x={x} y={y} transform={`rotate(${i * STEP} ${x} ${y})`} className={`obs-wheel-in ${pairInner === i ? 'is-picked' : ''}`}>{l}</text>
        </g>; })}
        <circle r="70" className="obs-wheel-inner" />
        {[0, 1, 2, 3, 4, 5].map(i => <path key={i} className="obs-wheel-star" transform={`rotate(${i * 60}) translate(0 -52)`} d="M0-5 1.4-1.4 5 0 1.4 1.4 0 5-1.4 1.4-5 0-1.4-1.4z" />)}
      </motion.g>
      <g className="obs-wheel-hub" pointerEvents="none">
        <circle r="36" />
        <text y="-8" className="obs-wheel-hub-label">BACK</text>
        <AnimatePresence initial={false}><motion.text key={shift} y="17" className="obs-wheel-hub-num" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 26 }}>{shift}</motion.text></AnimatePresence>
      </g>
    </svg>
    <div className="obs-wheel-turn">
      <motion.button type="button" className="obs-turn" whileTap={{ scale: .85, rotate: -20 }} onClick={() => setTurn(t => t - 1)} aria-label="Turn back one fewer"><CaretLeft size={20} weight="bold" /></motion.button>
      <span className="micro">Turn the disc</span>
      <motion.button type="button" className="obs-turn" whileTap={{ scale: .85, rotate: 20 }} onClick={() => setTurn(t => t + 1)} aria-label="Turn back one more"><CaretRight size={20} weight="bold" /></motion.button>
    </div>
  </div>;
}

const DESTINATIONS = [
  { id: 'OCEAN', art: <><circle cx="40" cy="40" r="30" className="obs-dest-orb" /><path d="M12 44q7-6 14 0t14 0 14 0 14 0M14 54q7-6 13 0t13 0 13 0 13 0" className="obs-dest-wave" /></> },
  { id: 'SPACE', art: <><circle cx="40" cy="40" r="15" className="obs-dest-orb" /><ellipse cx="40" cy="40" rx="31" ry="10" transform="rotate(-20 40 40)" className="obs-dest-ring" /><g className="obs-dest-spin"><circle cx="40" cy="9" r="2.6" className="obs-dest-comet" /></g></> },
  { id: 'EARTH', art: <><circle cx="40" cy="40" r="28" className="obs-dest-orb" /><path d="M22 30q8-6 14 2t12-2 10 8-6 10-12 4-8 6-10-8z" className="obs-dest-land" /></> },
];

function Destination({ dest, tried, onPick }) {
  const [scope, animate] = useAnimate();
  const pick = () => { if (!onPick(dest.id)) animate(scope.current, { x: [0, -12, 11, -7, 5, 0], rotate: [0, -5, 4, -2, 1, 0] }, { duration: .55 }); };
  return <motion.button ref={scope} type="button" className={`obs-dest ${tried ? 'is-tried' : ''}`} onClick={pick} whileHover={{ y: -4 }} whileTap={{ scale: .93 }}>
    <svg viewBox="0 0 80 80" aria-hidden="true">{dest.art}</svg><b>{dest.id}</b>
  </motion.button>;
}

function Vault({ onSolve }) {
  const [tried, setTried] = useState([]);
  const ref = useRef(null);
  const pick = id => {
    if (id === 'SPACE') { burstFrom(ref.current, { shape: 'star' }); onSolve(); return true; }
    setTried(t => [...new Set([...t, id])]);
    return false;
  };
  return <div className="obs-vault" ref={ref}>
    <span className="micro">Send the archive to</span>
    <div className="obs-dests">{DESTINATIONS.map(d => <Destination key={d.id} dest={d} tried={tried.includes(d.id)} onPick={pick} />)}</div>
  </div>;
}

const MAP_STARS = [[40, 150], [96, 92], [168, 118], [230, 62], [290, 104]];
const BONUS_STARS = { A: [70, 46], B: [262, 160] };

function StarMap({ bonus }) {
  return <div className="obs-map">
    <Sky />
    <div className="obs-map-clock" aria-label="23:59"><span>23</span><i>:</i><span>59</span></div>
    <svg viewBox="0 0 330 200" role="img" aria-label="Your archive: 566, ORBIT, 9, COMET, SPACE">
      {MAP_STARS.slice(1).map(([x, y], i) => <motion.line key={i} x1={MAP_STARS[i][0]} y1={MAP_STARS[i][1]} x2={x} y2={y} className="obs-map-line"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: .9 + i * .45, duration: .6 }} />)}
      {MAP_STARS.map(([x, y], i) => <motion.g key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .5 + i * .45, type: 'spring', stiffness: 380, damping: 11 }}>
        <circle cx={x} cy={y} r="11" className="obs-map-halo" />
        <path transform={`translate(${x} ${y})`} className="obs-map-star" d="M0-7 1.9-1.9 7 0 1.9 1.9 0 7-1.9 1.9-7 0-1.9-1.9z" />
        <text x={x} y={y + 24} className="obs-map-label">{ANSWERS[i]}</text>
      </motion.g>)}
      {['A', 'B'].filter(r => bonus[r]).map(r => { const [x, y] = BONUS_STARS[r]; return <motion.g key={r} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 10 }}>
        <circle cx={x} cy={y} r="4" className="obs-map-bonus" />
        <text x={x} y={y - 9} className="obs-map-caption">{bonus[r].length > 26 ? `${bonus[r].slice(0, 25)}…` : bonus[r]}</text>
      </motion.g>; })}
      <path className="obs-map-comet" d="M-20 30 Q160 -10 360 40" />
    </svg>
  </div>;
}

function SignalFromHome({ bonus, onSend }) {
  const { me, otherName } = useClub();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const sent = me && bonus[me];
  if (!open) return <Button kind="soft" onClick={() => setOpen(true)}><Sparkle size={16} weight="duotone" /> Bonus round · signal from home</Button>;
  return <motion.div className="obs-bonus" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
    <h3>Signal from <em>home</em></h3>
    <p>Each pick one photo from your camera roll that feels like a night in this observatory. Show it on the call without a word. {otherName} gets 90 seconds to guess the story, then you tell the real one.</p>
    {sent ? <p className="obs-bonus-sent">Your story is up there now, a new star on the map.</p>
      : <form className="obs-bonus-form" onSubmit={e => { e.preventDefault(); if (text.trim()) onSend(text.trim()); }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="The real story, in one line" maxLength={80} aria-label="The real story, in one line" />
        <Button type="submit" disabled={!text.trim()}><PaperPlaneTilt size={16} weight="duotone" /> Send to the sky</Button>
      </form>}
  </motion.div>;
}

export function progress(data = {}) {
  const done = new Set((data.completed || []).filter(i => i >= 0 && i < 5)).size;
  return { done, total: 5, finished: !!data.finished };
}

export default function Observatory({ data, update }) {
  const { me, nameOf } = useClub();
  const [state, patch] = usePatch(data, update, INITIAL);
  const [opening, setOpening] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const completed = useMemo(() => [...new Set(state.completed || [])], [state.completed]);
  const reachable = Math.min(4, completed.length ? Math.max(...completed) + 1 : 0);
  const index = Math.max(0, Math.min(state.step || 0, reachable));
  const lock = LOCKS[index];
  const solved = completed.includes(index) || opening === index;
  const switches = { ...INITIAL.switches, ...(state.switches || {}) };

  const solve = i => {
    if (opening !== null) return;
    setOpening(i);
    timer.current = setTimeout(() => {
      setOpening(null);
      patch(old => ({ ...old, completed: [...new Set([...(old.completed || []), i])], step: Math.min(4, i + 1), finished: i === 4 || old.finished }));
    }, 1300);
  };
  const replay = () => { clearTimeout(timer.current); setOpening(null); patch({ ...INITIAL }); };
  const role = !lock.owner ? 'Shared clue' : me === lock.owner ? 'You navigate' : `${nameOf(lock.owner)} navigates`;

  const boards = [
    <StarChart key="0" />,
    <MirrorReceiver key="1" />,
    <Switchboard key="2" switches={switches} onFlip={k => patch(old => ({ ...old, switches: { ...INITIAL.switches, ...old.switches, [k]: !old.switches?.[k] } }))} />,
    <CipherWheel key="3" />,
    <Vault key="4" onSolve={() => solve(4)} />,
  ];

  return <GameShell title="The Observatory Lock" number="Game 03" tone="blue" backdrop="stars" rules={<GameRules steps={RULES} audioSrc="/audio/rules/observatory.mp3" />}>
    {state.finished ? <Finale eyebrow="The archive opens at 23:59" title={<>You unlocked the <em>star map</em></>} onReplay={replay} replayLabel="Reset all five locks and play again">
      <p>You found the orbit, caught the comet, and sent them both home. This patch of sky is yours to keep.</p>
      <StarMap bonus={state.bonus || {}} />
      <SignalFromHome bonus={state.bonus || {}} onSend={text => patch(old => ({ ...old, bonus: { ...(old.bonus || {}), [me || 'A']: text } }))} />
    </Finale> : <>
      <RoundProgress rounds={LOCKS.map((l, i) => ({ id: i, label: l.label }))} current={index} done={completed} rewards={Object.fromEntries(completed.map(i => [i, ANSWERS[i]]))} onSelect={i => i <= reachable && patch({ step: i })} />
      <Round id={`lock-${index}`} className="obs-round" eyebrow={`Lock 0${index + 1} · ${role}`} title={lock.title} intro={lock.intro}>
        <Sky />
        <div className="obs-stage">
          {boards[index]}
          <AnimatePresence>{opening === index && <Unlocked lock={index} />}</AnimatePresence>
        </div>
        {lock.owner
          ? <PrivatePanel {...{ [lock.owner.toLowerCase()]: NOTES[index] }} title="Navigator note" />
          : <PrivatePanel a={NOTES[4].a} b={NOTES[4].b} title="Your half" />}
        {lock.accept && <AnswerLock accept={lock.accept} onSolve={() => solve(index)} placeholder={lock.placeholder} label="Open the lock" solved={solved} solvedText={`Opened with ${ANSWERS[index]}`} />}
        {!solved && <HintLadder hints={lock.hints} level={state.hints?.[index] || 0} onLevel={n => patch(old => ({ ...old, hints: { ...(old.hints || {}), [index]: n } }))} onReveal={() => solve(index)} revealLabel="Reveal and open the lock" />}
        <HowItWorks>{lock.how}</HowItWorks>
      </Round>
    </>}
  </GameShell>;
}
