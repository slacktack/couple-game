import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { Check, Heart, PaperPlaneTilt } from '@phosphor-icons/react';
import { AnswerLock, Button, Finale, GameRules, GameShell, HintLadder, HowItWorks, Round, RoundProgress } from '../kit/Kit.jsx';
import { useClub, usePatch } from '../kit/club.js';
import { BLANK, COLOURS, GRID, HEART, NOTE_MAX, PAGES, PETALS, cellOf, decodeFlower, describe, encodeNote, noteFromHash, parseNote, sanitizeNote } from './herbarium-cipher.js';
import './Herbarium.css';

const INITIAL = { page: 0, done: [], hints: {}, pressed: {}, finished: false };
const IDS = PAGES.map(p => p.id);
const NUM = ['three', 'four', 'five', 'six', 'seven'];
const spring = { type: 'spring', stiffness: 520, damping: 18 };

export function progress(data = {}) {
  const done = (data.done || []).filter(id => IDS.includes(id)).length;
  return { done, total: PAGES.length, finished: Boolean(data.finished) };
}

const SMOOTH_LEAF = 'M0,0 Q13,-11 28,0 Q13,11 0,0Z';
const SERRATED_LEAF = (() => {
  const top = [], bottom = [];
  for (let i = 1; i < 14; i++) {
    const t = i / 14, w = 7.5 * Math.sin(Math.PI * t) ** .8 + (i % 2 ? 2.4 : -.5);
    top.push(`${(28 * t).toFixed(1)},${(-w).toFixed(1)}`);
    bottom.unshift(`${(28 * t).toFixed(1)},${w.toFixed(1)}`);
  }
  return `M0,0 L${top.join(' L')} L28,0 L${bottom.join(' L')}Z`;
})();

function petalPath(n) {
  const L = 25, w = [12, 10.5, 9, 7.6, 6.6][n - 3];
  return `M50,42 C${50 - w},${42 - L * .35} ${50 - w * .85},${42 - L} 50,${41 - L} C${50 + w * .85},${42 - L} ${50 + w},${42 - L * .35} 50,42Z`;
}

function FlowerArt({ f, delay = 0 }) {
  const col = COLOURS[f.c];
  const s = f.curl === 'left' ? -1 : 1;
  const leaf = f.leaf === 'serrated' ? SERRATED_LEAF : SMOOTH_LEAF;
  return <svg viewBox="0 0 100 140" className="herb-flower" style={{ '--d': `${delay}ms` }} aria-hidden="true">
    <g className="herb-sway">
      <path className="herb-stem" pathLength="1" d={`M50,136 C50,112 ${50 + s * 12},84 50,46`} />
      <path className="herb-tendril" pathLength="1" d={`M${50 + s * 2},124 c${s * 8},-1 ${s * 15},-7 ${s * 14},-15 c${-s},-6 ${-s * 8},-6 ${-s * 8},-1 c0,3 ${s * 3},4 ${s * 5},2`} />
      <g transform={`translate(${50 + s * 3} 104) rotate(-152)`}><path className="herb-leaf" d={leaf} /></g>
      <g transform={`translate(${50 + s * 5} 88) rotate(-28)`}><path className="herb-leaf" d={leaf} /></g>
      {Array.from({ length: f.p }, (_, i) => <g key={i} transform={`rotate(${(i * 360) / f.p} 50 42)`}>
        <path className="herb-petal" d={petalPath(f.p)} fill={col.fill} stroke={col.deep} style={{ '--i': i }} />
      </g>)}
      <circle className="herb-eye" cx="50" cy="42" r="5.4" fill={col.deep} />
      <circle className="herb-eye" cx="50" cy="42" r="2.2" fill="#f6e3a4" />
    </g>
  </svg>;
}

function PetalGlyph({ n }) {
  return <svg viewBox="22 14 56 56" aria-hidden="true">
    {Array.from({ length: n }, (_, i) => <path key={i} d={petalPath(n)} transform={`rotate(${(i * 360) / n} 50 42)`} />)}
    <circle cx="50" cy="42" r="5" />
  </svg>;
}

const Sprig = () => <svg className="herb-sprig" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V6M12 14c-3-1-5-3-5-6M12 11c3-1 4-3 4-6M12 17c2 0 4-1 5-3" /></svg>;

const FALL = [[6, 0, 13], [27, 4, 16], [51, 8, 12], [73, 2, 15], [91, 10, 14]];
const Fall = () => <div className="herb-fall" aria-hidden="true">{FALL.map(([x, d, t], i) => <i key={i} style={{ left: `${x}%`, animationDelay: `${d}s`, animationDuration: `${t}s`, '--c': COLOURS[i].fill }} />)}</div>;

function Plate({ page, pressed, onPress, solved, collector }) {
  const glowLeft = solved && page.id === 'p3';
  return <div className="herb-plate">
    <Fall />
    <header className="herb-head"><span className="micro">Hortus siccus</span><span className="herb-hand">coll. {collector}</span></header>
    <div className="herb-specimens">
      {page.flowers.map((f, i) => <motion.button type="button" key={i}
        className={`herb-specimen ${pressed.includes(i) ? 'is-pressed' : ''} ${glowLeft && f.curl === 'left' ? 'is-glow' : ''}`}
        whileTap={{ scale: .88, rotate: i % 2 ? 3 : -3 }} transition={spring}
        onClick={() => onPress(i)} aria-pressed={pressed.includes(i)} aria-label={`Flower ${i + 1}: ${describe(f)}`}>
        <FlowerArt f={f} delay={i * 70} />
        <i className="herb-tape" />
        <span className="herb-no">N° {String(i + 1).padStart(2, '0')}</span>
      </motion.button>)}
    </div>
    <AnimatePresence>{solved && <motion.span className="herb-seal" initial={{ scale: 2.6, rotate: -40, opacity: 0 }} animate={{ scale: 1, rotate: -12, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 13 }}>read</motion.span>}</AnimatePresence>
  </div>;
}

function Ledger({ leafRule, owner, lit = '' }) {
  const [marks, setMarks] = useState([]);
  const toggle = k => setMarks(m => (m.includes(k) ? m.filter(x => x !== k) : [...m, k]));
  return <div className="herb-ledger">
    <header className="herb-head"><span className="micro">Floriography</span><span className="herb-hand">kept by {owner}</span></header>
    <div className="herb-grid">
      <span className="herb-corner micro">petals</span>
      {PETALS.map(n => <span className="herb-colhead" key={n}><PetalGlyph n={n} /><b>{n}</b></span>)}
      {GRID.map((row, r) => <Fragment key={r}>
        <motion.span className="herb-rowhead" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: r * .05 }}>
          <i style={{ background: COLOURS[r].fill, borderColor: COLOURS[r].deep }} /><b>{COLOURS[r].plain}</b>
        </motion.span>
        {row.map((ch, c) => {
          const k = r * 5 + c;
          const label = ch === BLANK ? 'a weed, skip it' : ch === ' ' ? 'a space' : ch === HEART ? 'a heart' : ch;
          return <motion.button type="button" key={k} className={`herb-cell ${marks.includes(k) ? 'is-marked' : ''} ${ch && lit.includes(ch) ? 'is-lit' : ''} ${ch === BLANK ? 'is-weed' : ''}`}
            initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} whileTap={{ scale: .8 }} transition={{ ...spring, delay: r * .05 + c * .03 }}
            onClick={() => toggle(k)} aria-pressed={marks.includes(k)} aria-label={`${COLOURS[r].plain}, ${NUM[c]} petals: ${label}`}>
            {ch === BLANK ? <Sprig /> : ch === ' ' ? <span className="herb-gap">space</span> : ch}
          </motion.button>;
        })}
      </Fragment>)}
    </div>
    {leafRule && <motion.aside className="herb-slip" initial={{ opacity: 0, y: 12, rotate: 3 }} animate={{ opacity: 1, y: 0, rotate: -1.2 }} transition={{ type: 'spring', stiffness: 200, damping: 16, delay: .5 }}>
      <svg viewBox="-2 -12 32 24" aria-hidden="true"><path className="herb-leaf" d={SERRATED_LEAF} /></svg>
      <p><b>Jagged leaves</b> mean the letter one step to the right in that row. Past the end, wrap back to the start.</p>
    </motion.aside>}
  </div>;
}

function InkLine({ text, done }) {
  return <div className={`herb-ink ${done ? 'is-done' : ''}`} aria-hidden={!done}>
    {[...text].map((ch, i) => <motion.span key={`${i}${ch}`} className={ch === HEART ? 'is-heart' : ''}
      initial={{ opacity: 0, scale: 1.7, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 19, delay: done ? i * .05 : 0 }}>{ch === ' ' ? ' ' : ch}</motion.span>)}
  </div>;
}

function InkLock({ page, solved, onSolve }) {
  const [typed, setTyped] = useState('');
  const [scope, animate] = useAnimate();
  useEffect(() => setTyped(''), [page.id]);
  if (solved) return <InkLine text={page.id === 'p3' ? page.answer : page.plain} done />;
  return <div className={`herb-lock ${[...typed].length > 20 ? 'is-long' : ''}`}>
    <AnswerLock key={page.id} accept={[page.answer]} onSolve={onSolve} onChange={v => setTyped(v.toUpperCase())}
      onMiss={() => scope.current && animate(scope.current, { x: [0, -6, 6, -6, 6, 0] }, { duration: .4 })} placeholder="Ink the decoded words" label="Ink it in" />
    <div ref={scope} className="herb-ink-over"><InkLine text={typed} /></div>
  </div>;
}

function firstHint(page) {
  const f = page.flowers[0];
  const shift = page.leafRule && f.leaf === 'serrated';
  return `N° 01 is ${COLOURS[f.c].plain} with ${NUM[f.p - 3]} petals${shift ? ' and jagged leaves, so step one to the right' : ''}: that makes ${decodeFlower(f, page.leafRule)}.`;
}

function spaceFlower() {
  const { r, c } = cellOf(' ');
  return `a ${COLOURS[r].plain} one with ${NUM[c]} petals`;
}

function hintsFor(page, botanistName) {
  if (page.id === 'p1') return [`Spaces are flowers too: ${spaceFlower()}.`, firstHint(page), 'It opens like a letter: DEAR R…'];
  if (page.id === 'p2') return ['Look closely at the leaves. The margin of the key explains what jagged ones change.', firstHint(page), 'Two flowers are weeds, skip them. It reads SAME TIME T…'];
  return ['Decode every flower first. The sentence is an instruction, not the answer.', `Only ${botanistName} can see the stems. Three tendrils curl to the left.`, 'The left-curling stems are N° 04, 22 and 23. Read just those three letters.'];
}

const HOWTO = {
  p1: 'Colour picks the row of the key, petal count picks the column. On this plate, leaves and stems are only decoration.',
  p2: 'Same key, one new rule, and only the key-holder can read it. Describe every leaf.',
  p3: 'The decoded sentence tells you what to do next. The final word is hidden inside this plate.',
};

function Composer() {
  const { me, otherName } = useClub();
  const [text, setText] = useState('');
  const [seed] = useState(() => (Date.now() % 99991) + 1);
  const [sent, setSent] = useState(false);
  const clean = sanitizeNote(text).trim();
  const raw = useMemo(() => (/[A-Z]/.test(clean) ? encodeNote(clean, me || 'A', seed) : null), [clean, me, seed]);
  const flowers = raw ? parseNote(raw)?.flowers || [] : [];
  const edit = v => { setText(sanitizeNote(v)); setSent(false); };
  const send = async () => {
    const url = `${window.location.origin}/play/herbarium#press=${raw}`;
    try {
      if (navigator.share) await navigator.share({ title: 'A pressed note', url });
      else await navigator.clipboard.writeText(url);
      setSent(true);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      try { await navigator.clipboard.writeText(url); setSent(true); } catch { window.prompt('Copy this link', url); }
    }
  };
  return <section className="herb-press">
    <h3>Press one <em>of your own</em></h3>
    <div className="herb-press-field">
      <input value={text} onChange={e => edit(e.target.value)} maxLength={NOTE_MAX} placeholder={`A secret for ${otherName}`} aria-label="Your secret note" autoCapitalize="characters" spellCheck="false" />
      <motion.button type="button" className="herb-heart-key" whileTap={{ scale: .8 }} transition={spring} onClick={() => edit(`${text}${HEART}`)} aria-label="Add a heart"><Heart size={18} weight="fill" /></motion.button>
    </div>
    <div className="herb-mini" aria-hidden="true">
      <AnimatePresence initial={false}>{flowers.map((f, i) => <motion.span key={`${i}-${f.c}-${f.p}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .4 }} transition={spring}><FlowerArt f={f} /></motion.span>)}</AnimatePresence>
    </div>
    <Button onClick={send} disabled={!raw}>{sent ? <><Check size={16} weight="bold" /> Link on its way</> : <><PaperPlaneTilt size={16} weight="duotone" /> Send it to {otherName}</>}</Button>
  </section>;
}

function NotePage({ note, onClose }) {
  const { nameOf } = useClub();
  const [solved, setSolved] = useState(false);
  const [level, setLevel] = useState(0);
  const [pressed, setPressed] = useState([]);
  const from = nameOf(note.from);
  const page = useMemo(() => ({ id: 'note', flowers: note.flowers, leafRule: false, plain: note.text, answer: note.text.replace(/♥/g, '').trim() }), [note]);
  const press = i => setPressed(p => (p.includes(i) ? p.filter(x => x !== i) : [...p, i]));
  return <Round id="note" eyebrow={`Pressed by ${from}`} title={<>A note from <em>{from}</em></>} intro="The flowers and the whole key are on this phone. Colour picks the row, petals pick the column.">
    <Plate page={page} pressed={pressed} onPress={press} solved={solved} collector={from} />
    <Ledger owner="you" lit={solved ? note.text : ''} />
    <InkLock page={page} solved={solved} onSolve={() => setSolved(true)} />
    {solved
      ? <Button kind="soft" onClick={onClose}>Back to the herbarium</Button>
      : <HintLadder hints={[`Spaces are flowers too: ${spaceFlower()}.`, `It starts with ${note.text.split(' ')[0].replace(/♥/g, '') || 'a heart'}.`]} level={level} onLevel={setLevel} onReveal={() => setSolved(true)} revealLabel="Just show me the note" />}
  </Round>;
}

const LETTER = ['Dear Riya ♥', 'Same time tomorrow.', 'Only the left curls count:'];

export default function Herbarium({ data, update }) {
  const { me, nameOf } = useClub();
  const [state, patch] = usePatch(data, update, INITIAL);
  const [note, setNote] = useState(() => noteFromHash(window.location.hash));
  const timer = useRef(null);
  useEffect(() => {
    const onHash = () => setNote(noteFromHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => { window.removeEventListener('hashchange', onHash); clearTimeout(timer.current); };
  }, []);

  const done = (state.done || []).filter(id => IDS.includes(id));
  const idx = Math.min(Math.max(Number(state.page) || 0, 0), PAGES.length - 1);
  const page = PAGES[idx];
  const solved = done.includes(page.id);
  const botanist = nameOf(page.botanist);
  const keeper = nameOf(page.botanist === 'A' ? 'B' : 'A');
  const holdsFlowers = me === page.botanist;
  const pressed = state.pressed?.[page.id] || [];

  const solve = () => {
    patch(old => ({ done: [...new Set([...(old.done || []), page.id])] }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => patch(old => (idx === PAGES.length - 1 ? { finished: true } : { page: Math.max(Number(old.page) || 0, idx + 1) })), 1700);
  };
  const press = i => patch(old => {
    const list = old.pressed?.[page.id] || [];
    return { pressed: { ...old.pressed, [page.id]: list.includes(i) ? list.filter(x => x !== i) : [...list, i] } };
  });
  const closeNote = () => { window.history.replaceState(null, '', window.location.pathname); setNote(null); };

  const rules = <GameRules steps={[
    { title: 'Two halves of one book', text: 'One of you holds the pressed flowers, the other holds the floriography key. A phone never shows both.' },
    { title: 'Describe, then look up', text: 'Colour, petal count, leaves. The key turns each flower into a letter, and either phone can ink in the words.' },
    { title: 'Trade the book', text: `${nameOf('A')} holds the flowers on Plates I and III, ${nameOf('B')} on Plate II.` },
    { title: 'Three plates, one word', text: 'The last plate hides a single word. Find it to close the book.' },
  ]} />;

  return <GameShell title="Pressed Flower Cipher" number="Game 07" tone="sage" backdrop="petals" rules={rules}>
    {note ? <NotePage note={note} onClose={closeNote} /> : state.finished ? <Finale eyebrow="The herbarium is read" title={<>And the answer was <em>you</em></>}
      onReplay={() => { clearTimeout(timer.current); patch({ ...INITIAL }); }} replayLabel="Unpress every plate and start over">
      <div className="herb-letter">
        {LETTER.map((line, i) => <motion.p key={line} initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: .5 + i * .55, duration: .8 }}>{line}</motion.p>)}
        <motion.b initial={{ opacity: 0, scale: 2 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 2.2 }}>you.</motion.b>
      </div>
      <Composer />
    </Finale> : <>
      <RoundProgress rounds={PAGES.map(p => ({ id: p.id, label: p.label }))} current={idx} done={done} onSelect={i => patch({ page: i })} rewards={{ p1: '♥', p2: '✿', p3: '❦' }} />
      <Round id={page.id} eyebrow={me ? (holdsFlowers ? 'You hold the pressed flowers' : 'You hold the key') : page.label} title={page.title}
        intro={me && (holdsFlowers ? `Describe each flower to ${keeper}, in order. Tap one once you’ve read it out.` : `Ask ${botanist} for each flower and find its letter.`)}>
        {me && (holdsFlowers
          ? <Plate page={page} pressed={pressed} onPress={press} solved={solved} collector={botanist} />
          : <Ledger key={page.id} leafRule={page.leafRule} owner={keeper} lit={solved ? page.plain : ''} />)}
        <InkLock page={page} solved={solved} onSolve={solve} />
        {!solved && <HintLadder hints={hintsFor(page, botanist)} level={state.hints?.[page.id] || 0} onLevel={n => patch(old => ({ hints: { ...old.hints, [page.id]: n } }))} onReveal={solve} revealLabel="Ink the answer for us" />}
        <HowItWorks title="How this plate works">{HOWTO[page.id]}</HowItWorks>
      </Round>
    </>}
  </GameShell>;
}
