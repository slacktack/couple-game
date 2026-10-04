import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, Reorder, motion, useAnimationControls, useDragControls } from 'motion/react';
import { ArrowRight, Check, ClipboardText, DotsSixVertical, Minus, Plus, PushPin } from '@phosphor-icons/react';
import { Button, Finale, GameRules, GameShell, HintLadder, HowItWorks, PrivatePanel, Round, RoundProgress } from '../kit/Kit.jsx';
import { useClub, usePatch } from '../kit/club.js';
import { burstFrom } from '../kit/celebrate.js';
import './Case.css';

const ROUNDS = [
  { id: 'files', label: 'Suspect files' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'wall', label: 'Evidence wall' },
  { id: 'clock', label: 'Clock test' },
  { id: 'accuse', label: 'Accusation' },
];
const ROUND_IDS = ROUNDS.map(r => r.id);

const SUSPECTS = [
  { id: 'mira', name: 'Mira Sen', role: 'Executive assistant', owner: 'A', hair: 'bob', alibi: 'Mira says she left at 10:38 PM after printing the sale contract. She says Adrian was alive and speaking normally when she left. He planned to fire her after the sale.' },
  { id: 'leon', name: 'Leon Vale', role: 'Brother', owner: 'A', hair: 'short', alibi: 'Leon called at 10:44 PM and got no answer. He admits an argument over their father’s collection. A large inheritance was at stake.' },
  { id: 'priya', name: 'Priya Khan', role: 'Journalist', owner: 'A', hair: 'long', alibi: 'Priya says she was in the upstairs guest room from 10:20 to 11:10 PM. She called the livestream glitch “weirdly convenient.” Adrian had threatened to expose a source.' },
  { id: 'elias', name: 'Elias Rook', role: 'Restorer', owner: 'B', hair: 'cap', alibi: 'Elias says he left at 10:15 PM. He could access the gallery key system and had repaired the library lock earlier that week. Adrian planned to blame him for damage to a valuable painting.' },
  { id: 'nora', name: 'Nora Venn', role: 'Partner', owner: 'B', hair: 'bun', alibi: 'Nora says she was on a video call from 10:30 to 11:20 PM. She says Adrian came downstairs at 10:43 PM for water. Adrian had secretly changed a legal document.' },
];

const QUESTIONS = [
  'Where did you expect Adrian to be at 10:45 PM?',
  'Can you explain someone else’s timeline?',
  'What detail matters only if the clock was wrong?',
  'What are you hoping we misunderstand?',
];

const EVENTS = [
  { id: 'start', time: '9:58 PM', text: 'Livestream begins. Adrian appears in the library.' },
  { id: 'sale', time: '10:18 PM', text: 'Private sale of a disputed painting is announced.' },
  { id: 'glitch', time: '10:31 PM', text: 'A 14-second audio glitch interrupts the stream.' },
  { id: 'tea', time: '10:42 PM', text: 'Adrian says he is making tea.' },
  { id: 'end', time: '11:01 PM', text: 'The stream ends unexpectedly.' },
  { id: 'found', time: '11:47 PM', text: 'Adrian is found. The library key is on the inside desk; a second copy is missing.' },
];
const EVENT_ORDER = EVENTS.map(e => e.id);
const SHUFFLED = ['end', 'glitch', 'found', 'sale', 'start', 'tea'];

const EVIDENCE = [
  { id: 'A', title: 'The tea tray', type: 'Physical evidence', text: 'Two cups were on the desk. One has a lipstick trace matching Nora’s shade; the other has no trace. A spoon is damp. No fingerprints are recoverable from it.', thought: 'Interesting, but it does not place someone inside the locked library.' },
  { id: 'B', title: 'The electronic key log', type: 'Security system record', text: 'The security system logs the library key out at 10:36 PM and back in at 11:02 PM. The same system also stamped the livestream’s audio glitch, at 11:00 PM.', thought: 'Every time on this log came from one clock. Check it against something you trust.' },
  { id: 'C', title: 'The 14-second audio glitch', type: 'A strange sound', text: 'Three faint knocks sound during the 10:31 PM livestream glitch. Their pattern is 1–2–1. The old library radiator makes the same knocks when its heating cycle changes.', thought: 'A good spooky sound. A boring radiator.' },
  { id: 'D', title: 'Adrian’s torn note', type: 'A quiet warning', text: 'A torn note in Adrian’s pocket says: “If the room is already open, look for the person who knew the clock was wrong.”', thought: 'That points toward someone with a reason to understand the security system.' },
  { id: 'E', title: 'Priya’s upstairs call', type: 'A suspicious gap', text: 'Priya’s internet call ran from 10:24 to 10:46 PM, but only audio was transmitted. There is a 17-second mute at 10:37 PM.', thought: 'Odd, but nothing shows the mute put her in the library.' },
  { id: 'F', title: 'The sale contract', type: 'A second timeline', text: 'The contract has Mira’s initials, but the printer log says it printed at 10:54 PM, after she says she left at 10:38 PM.', thought: 'Mira lied about leaving time. That contradiction alone does not prove she killed Adrian.' },
  { id: 'G', title: 'The “water” story', type: 'An impossible visit', text: 'The kitchen camera shows no one entering from 10:30 to 10:55 PM. Nora’s video call continues normally in that period.', thought: 'The downstairs trip did not happen as described, but nothing ties Nora to the library lock.' },
];

const ACCUSE = [
  { id: 'killer', label: 'Who killed Adrian?', answer: 'elias', miss: 'Your suspect does not fit the corrected key window.', options: SUSPECTS.map(s => ({ value: s.id, label: s.name })) },
  { id: 'bent', label: 'What bent the timeline?', answer: 'fast', miss: 'That is not what the clock test showed.', options: [{ value: 'fast', label: 'The security clock ran 29 minutes fast' }, { value: 'slow', label: 'The security clock ran 29 minutes slow' }, { value: 'glitch', label: 'The livestream glitch hid the attack' }] },
  { id: 'clincher', label: 'Which clue clinches it?', answer: 'log-note-lock', miss: 'That clue does not put anyone inside the locked library.', options: [{ value: 'log-note-lock', label: 'Key log + torn note + lock access' }, { value: 'tea', label: 'The cups and the damp spoon' }, { value: 'knocks', label: 'The 1–2–1 knocks' }] },
  { id: 'herring', label: 'Pick one red herring', answer: ['radiator', 'mute'], miss: 'That one is a real lie or a real clue, not a red herring.', options: [{ value: 'radiator', label: 'The radiator knocks' }, { value: 'mute', label: 'Priya’s call mute' }, { value: 'printer', label: 'Mira’s printer timestamp' }, { value: 'keylog', label: 'The key log times' }] },
];
const fits = (group, value) => Array.isArray(group.answer) ? group.answer.includes(value) : group.answer === value;

const CLOCK_HINTS = [
  'The security system wrote down more than the key. Find something on its log you also know from the livestream.',
  'The stream glitched at 10:31 PM. What time did the security system stamp it?',
  'The gap between 10:31 PM and 11:00 PM is how far the clock is off.',
];
const ACCUSE_HINTS = [
  'Start with the corrected key window. Who claimed to be gone before it opened?',
  'Elias said he left at 10:15 PM. The key was really out from 10:07 to 10:33 PM.',
  'Elias knew the lock, had the key and fits Adrian’s note. A red herring is odd or spooky but puts no one in the library.',
];

const PROMPT = 'You are a forensic puzzle editor. Here is our solved case, followed by the evidence. Grade our reasoning 0-100. Do not just tell us the answer. Check whether our accusation explains the clock drift, the key log, the note, the contract, and the red herrings. Flag any clue that is underdetermined or unfair.';

const INITIAL = { round: 0, done: [], asked: {}, order: SHUFFLED, seen: [], pinned: [], offset: 0, picks: {}, hints: {}, solved: false };

const springy = { type: 'spring', stiffness: 320, damping: 24 };

export function progress(data = {}) {
  const done = (data.done || []).filter(id => ROUND_IDS.includes(id)).length;
  return { done: Math.min(5, done), total: 5, finished: Boolean(data.solved) };
}

const clockText = minutes => {
  const v = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(v / 60);
  return `${h % 12 || 12}:${String(v % 60).padStart(2, '0')} PM`;
};

function Portrait({ hair }) {
  return <svg viewBox="0 0 80 90" className="portrait" aria-hidden="true">
    <rect width="80" height="90" fill="#2b2320" />
    <circle cx="40" cy="30" r="40" fill="#3a2e29" />
    {hair === 'long' && <path d="M20 40c-2-22 8-30 20-30s22 8 20 30l2 26H18z" fill="#14100e" />}
    <path d="M10 90c2-18 14-26 30-26s28 8 30 26z" fill="#4b3c34" />
    <path d="M33 58h14v10H33z" fill="#c9a58a" />
    <ellipse cx="40" cy="40" rx="14" ry="17" fill="#d8b497" />
    {hair === 'bob' && <path d="M24 44c-3-20 6-28 16-28s19 8 16 28c-3-8-6-14-16-15-10 1-13 7-16 15z" fill="#1a1412" />}
    {hair === 'short' && <path d="M26 36c0-12 6-17 14-17s14 5 14 17c-4-6-9-8-14-8s-10 2-14 8z" fill="#5a4234" />}
    {hair === 'long' && <path d="M26 38c0-12 6-18 14-18s14 6 14 18c-5-7-9-9-14-9s-9 2-14 9z" fill="#14100e" />}
    {hair === 'cap' && <><path d="M24 34c0-12 7-18 16-18s16 6 16 18z" fill="#6b5446" /><path d="M54 34h10c0 2-2 4-6 4h-4z" fill="#6b5446" /></>}
    {hair === 'bun' && <><circle cx="40" cy="17" r="7" fill="#7a4d36" /><path d="M26 38c0-12 6-17 14-17s14 5 14 17c-4-6-9-8-14-8s-10 2-14 8z" fill="#7a4d36" /></>}
    {hair === 'bob' && <path d="M31 41h7M42 41h7" stroke="#2b2320" strokeWidth="1.6" strokeLinecap="round" />}
  </svg>;
}

function EvidenceMark({ id }) {
  return <svg viewBox="0 0 100 80" aria-hidden="true" className="evidence-mark" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    {id === 'A' && <><path d="M28 26h37l-4 29H32z" /><path d="M65 32h7a8 8 0 0 1 0 16h-9M35 61h36M36 34h22" /><path d="M45 20c-3-4 3-5 0-9m10 9c-3-4 3-5 0-9" /></>}
    {id === 'B' && <><circle cx="27" cy="40" r="13" /><circle cx="27" cy="40" r="4" /><path d="m40 40 37 0 0 9 9 0 0-9-7 0 0-8-9 0" /><path d="M53 40v8" /></>}
    {id === 'C' && <><path d="M17 41h10l8-16 12 32 10-25 9 18 7-9h10" /><circle cx="50" cy="41" r="34" strokeDasharray="2 7" /></>}
    {id === 'D' && <><path d="M29 13h30l14 14v42H29z" /><path d="M59 13v15h14M39 39h23M39 48h19" /><path d="m33 63 9-7 7 6 8-8 16 9" /></>}
    {id === 'E' && <><path d="M29 19c-5 3-8 9-6 16 6 18 19 31 37 36 8 2 15-2 18-8l-13-11-9 8c-8-4-14-10-18-18l8-9z" /><path d="M61 17c10 2 17 9 19 19M59 26c5 1 9 5 10 10" /></>}
    {id === 'F' && <><path d="M23 13h36l17 17v38H23z" /><path d="M59 13v18h17M33 41h31M33 50h23" /><path d="m35 60 7-5 7 4 10-7" /></>}
    {id === 'G' && <><path d="M50 14c-7 13-22 27-22 41a22 22 0 0 0 44 0c0-14-15-28-22-41z" /><path d="M39 57c1 7 6 11 12 12" /><path d="M65 17h15M72 10v15" /></>}
  </svg>;
}

const keyed = fn => e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

function NextButton({ show, label, onClick }) {
  return <AnimatePresence>{show && <motion.div className="case-next" initial={{ opacity: 0, y: 14, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={springy}>
    <Button onClick={onClick}>{label}<span className="case-next-icon"><ArrowRight size={15} weight="bold" /></span></Button>
  </motion.div>}</AnimatePresence>;
}

function FilesRound({ state, patch, finish, next }) {
  const { nameOf } = useClub();
  const [pick, setPick] = useState(null);
  const [last, setLast] = useState(null);
  const done = state.done.includes('files');
  const suspect = SUSPECTS.find(s => s.id === pick);
  const ask = q => {
    const asked = { ...state.asked, [pick]: [...new Set([...(state.asked[pick] || []), q])] };
    setLast({ who: suspect.name, q: QUESTIONS[q] });
    patch({ asked });
    if (!done && SUSPECTS.every(s => asked[s.id]?.length)) finish('files');
  };
  const sheet = role => <div className="case-typed">
    {SUSPECTS.filter(s => s.owner === role).map(s => <article key={s.id}><b>{s.name} · {s.role.toLowerCase()}</b><p>{s.alibi}</p></article>)}
    <p className="case-sticky">{role === 'A' ? 'A contradiction shows someone lied; it does not always prove murder.' : 'A timestamp can be misleading if the system clock is wrong.'}</p>
  </div>;

  return <Round id="files" eyebrow="Round 1 · Suspect files" title={<>Five people stayed <em>late.</em></>} intro="Curator Adrian Vale was found dead in his locked library at 11:47 PM. These five were in the house that night.">
    <div className="board case-desk">
      <div className="dossiers">
        {SUSPECTS.map((s, i) => {
          const asked = Boolean(state.asked[s.id]?.length);
          return <motion.div key={s.id} role="button" tabIndex={0} aria-pressed={pick === s.id}
            className={`dossier ${pick === s.id ? 'is-picked' : ''}`}
            initial={{ opacity: 0, y: 40, rotate: i % 2 ? 8 : -8 }} animate={{ opacity: 1, y: pick === s.id ? -8 : 0, rotate: pick === s.id ? 0 : [-3, 2, -1.5, 3, -2][i], scale: pick === s.id ? 1.04 : 1 }}
            transition={{ ...springy, delay: pick ? 0 : i * .07 }} whileTap={{ scale: .95 }}
            onClick={() => setPick(s.id)} onKeyDown={keyed(() => setPick(s.id))}>
            <span className="dossier-tab">{nameOf(s.owner)}</span>
            <span className="dossier-clip" />
            <Portrait hair={s.hair} />
            <b>{s.name}</b><span className="micro">{s.role}</span>
            <AnimatePresence>{asked && <motion.span className="stamp-questioned" initial={{ scale: 2.4, opacity: 0, rotate: -24 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>Questioned</motion.span>}</AnimatePresence>
          </motion.div>;
        })}
      </div>
      <AnimatePresence mode="wait">{suspect ? <motion.div key={suspect.id} className="interrogation" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={springy}>
        <span className="micro">Ask {suspect.name.split(' ')[0]}</span>
        <div className="question-cards">{QUESTIONS.map((q, i) => <motion.button type="button" key={q} whileTap={{ scale: .94 }} className={state.asked[suspect.id]?.includes(i) ? 'is-asked' : ''} onClick={() => ask(i)}>{q}</motion.button>)}</div>
      </motion.div> : <motion.p key="none" className="desk-tip" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Tap a file to bring someone in.</motion.p>}</AnimatePresence>
      <AnimatePresence>{last && <motion.p key={last.q + last.who} className="speech" initial={{ opacity: 0, scale: .9, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={springy}>
        “{last.q}” <span>Answer as {last.who.split(' ')[0]}, together, in character.</span>
      </motion.p>}</AnimatePresence>
      <NextButton show={done} label="Rebuild the night" onClick={next} />
    </div>
    <PrivatePanel a={sheet('A')} b={sheet('B')} title="Your case files" />
    <HowItWorks>Read your files aloud to each other without showing your screen. Tap a suspect, pick a question, and improvise their answer together. Once all five have been questioned, the timeline opens.</HowItWorks>
  </Round>;
}

function EventCard({ event, index, selected, solved, onTap, onDrop }) {
  const controls = useDragControls();
  return <Reorder.Item value={event.id} dragListener={false} dragControls={controls} onDragEnd={onDrop}
    className={`event-card ${selected ? 'is-selected' : ''} ${solved ? 'is-solved' : ''}`}
    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, transition: { ...springy, delay: index * .05 } }}
    whileDrag={{ scale: 1.04, rotate: -1.5, boxShadow: '0 22px 40px rgba(0,0,0,.45)' }}>
    {!solved && <span className="event-grip" onPointerDown={e => controls.start(e)} aria-hidden="true"><DotsSixVertical size={22} weight="bold" /></span>}
    <button type="button" className="event-body" disabled={solved} onClick={onTap} aria-pressed={selected}>
      <span className="event-time">{event.time}</span><span>{event.text}</span>
    </button>
  </Reorder.Item>;
}

function TimelineRound({ state, patch, finish, next }) {
  const [sel, setSel] = useState(null);
  const solved = state.done.includes('timeline');
  const order = state.order?.length === 6 ? state.order : SHUFFLED;
  const settle = list => { if (!solved && list.every((id, i) => id === EVENT_ORDER[i])) finish('timeline'); };
  const tap = id => {
    if (!sel) return setSel(id);
    if (sel === id) return setSel(null);
    const list = [...order];
    const a = list.indexOf(sel); const b = list.indexOf(id);
    [list[a], list[b]] = [list[b], list[a]];
    patch({ order: list }); setSel(null); settle(list);
  };
  return <Round id="timeline" eyebrow="Round 2 · Timeline" title={<>Put the night <em>back in order.</em></>} intro="The livestream left six timestamps scattered across the desk.">
    <div className={`board case-strip ${solved ? 'is-solved' : ''}`}>
      <motion.span className="strip-thread" initial={{ scaleY: 0 }} animate={{ scaleY: solved ? 1 : 0 }} transition={{ duration: .9, ease: [.22, 1, .36, 1] }} />
      <Reorder.Group axis="y" values={order} onReorder={list => patch({ order: list })} className="event-list">
        {order.map((id, i) => <EventCard key={id} index={i} event={EVENTS.find(e => e.id === id)} selected={sel === id} solved={solved} onTap={() => tap(id)} onDrop={() => settle(order)} />)}
      </Reorder.Group>
      <NextButton show={solved} label="Go to the evidence wall" onClick={next} />
    </div>
    <HowItWorks>Drag a card by its grip, or tap two cards to swap them. Earliest goes on top. The cards pin in place once the night reads right.</HowItWorks>
  </Round>;
}

function WallRound({ state, patch, finish, next }) {
  const [open, setOpen] = useState(null);
  const [pts, setPts] = useState({});
  const boardRef = useRef(null);
  const cards = useRef({});
  const done = state.done.includes('wall');
  const pinKey = state.pinned.join();
  const measure = useCallback(() => {
    const b = boardRef.current?.getBoundingClientRect();
    if (!b) return;
    const next = {};
    for (const id of state.pinned) {
      const r = cards.current[id]?.getBoundingClientRect();
      if (r) next[id] = { x: r.left - b.left + r.width / 2, y: r.top - b.top + 9 };
    }
    setPts(next);
  }, [pinKey]);
  useLayoutEffect(measure, [measure, open]);
  useEffect(() => { const t = setTimeout(measure, 900); return () => clearTimeout(t); }, [measure]);
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (boardRef.current) ro.observe(boardRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const flip = id => {
    const willOpen = open !== id;
    setOpen(willOpen ? id : null);
    if (!willOpen || state.seen.includes(id)) return;
    const seen = [...state.seen, id];
    patch({ seen });
    if (!done && seen.length === EVIDENCE.length) finish('wall');
  };
  const togglePin = id => patch(old => ({ pinned: old.pinned.includes(id) ? old.pinned.filter(p => p !== id) : [...old.pinned, id] }));
  const threads = state.pinned.slice(1).map((id, i) => [state.pinned[i], id]).filter(([a, b]) => pts[a] && pts[b]);

  return <Round id="wall" eyebrow="Round 3 · Evidence wall" title={<>Seven things <em>out of place.</em></>} intro="Everything bagged from the library and the house, pinned up for the two of you.">
    <div className={`cork ${open ? "has-open" : ""}`} ref={boardRef}>
      <div className="wall-grid">
        {EVIDENCE.map((ev, i) => {
          const isOpen = open === ev.id;
          const pinned = state.pinned.includes(ev.id);
          return <motion.div layout key={ev.id} ref={el => { cards.current[ev.id] = el; }} onLayoutAnimationComplete={measure}
            className={`exhibit ${isOpen ? 'is-open' : ''} ${state.seen.includes(ev.id) ? 'is-seen' : ''}`}
            initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springy, delay: i * .06, layout: springy }}
            role="button" tabIndex={0} aria-expanded={isOpen} aria-label={`Exhibit ${ev.id}: ${ev.title}`}
            onClick={() => flip(ev.id)} onKeyDown={keyed(() => flip(ev.id))}>
            <AnimatePresence>{pinned && <motion.span className="pushpin" initial={{ y: -26, scale: 1.6, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 16 }} />}</AnimatePresence>
            <motion.div className="flip" animate={{ rotateY: isOpen ? 180 : 0, rotate: isOpen ? 0 : [-4, 3, -2, 4, -3, 2, -1][i] }} transition={{ type: 'spring', stiffness: 170, damping: 19 }}>
              <div className="face front">
                <div className="photo"><EvidenceMark id={ev.id} /><i>{ev.id}</i></div>
                <span className="caption">{ev.title}</span>
                {state.seen.includes(ev.id) && <span className="seen-tick"><Check size={12} weight="bold" /></span>}
              </div>
              <div className="face back">
                <span className="micro">Exhibit {ev.id} · {ev.type}</span>
                <h3>{ev.title}</h3>
                <p>{ev.text}</p>
                <p className="thought">{ev.thought}</p>
                <motion.button type="button" whileTap={{ scale: .93 }} className={`pin-btn ${pinned ? 'is-pinned' : ''}`} onClick={e => { e.stopPropagation(); togglePin(ev.id); }}>
                  <PushPin size={16} weight={pinned ? 'fill' : 'regular'} />{pinned ? 'Pinned to the theory' : 'Pin to the theory'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>;
        })}
      </div>
      <svg className="threads" aria-hidden="true">
        <AnimatePresence>{threads.map(([a, b]) => {
          const p = pts[a]; const q = pts[b];
          const sag = Math.min(70, Math.hypot(q.x - p.x, q.y - p.y) * .2) + 14;
          return <motion.path key={`${a}${b}`} d={`M${p.x} ${p.y} Q${(p.x + q.x) / 2} ${Math.max(p.y, q.y) + sag} ${q.x} ${q.y}`}
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ opacity: 0 }} transition={{ duration: .7, ease: [.22, 1, .36, 1] }} />;
        })}</AnimatePresence>
      </svg>
    </div>
    <NextButton show={done} label="Test the clock" onClick={next} />
    <HowItWorks>Tap an exhibit to turn it over and read it out loud. Pin anything that feels connected; red string ties your pins together. The clock test opens once all seven have been turned over.</HowItWorks>
  </Round>;
}

function ClockRound({ state, patch, finish, next }) {
  const solved = state.done.includes('clock');
  const [offset, setOffset] = useState(solved ? 29 : Math.max(0, Math.min(60, Number(state.offset) || 0)));
  const [miss, setMiss] = useState(0);
  const shake = useAnimationControls();
  const set = v => { const n = Math.max(0, Math.min(60, v)); setOffset(n); patch({ offset: n }); };
  const out = 22 * 60 + 36 - offset;
  const back = 23 * 60 + 2 - offset;
  const lock = e => {
    if (offset === 29) { burstFrom(e.currentTarget, { shape: ['spark', 'star'] }); finish('clock'); }
    else { setMiss(n => n + 1); shake.start({ x: [0, -10, 10, -7, 7, 0], transition: { duration: .45 } }); }
  };
  const reveal = () => { setOffset(29); patch({ offset: 29 }); finish('clock'); };

  return <Round id="clock" eyebrow="Round 4 · Clock test" title={<>Wind the key log <em>back to real time.</em></>} intro="The security system kept its own time. How far ahead was it running?">
    <motion.div className={`board clock-bench ${solved ? 'is-solved' : ''}`} animate={shake}>
      <div className="dial-wrap">
        <svg viewBox="0 0 200 200" className="dial" aria-hidden="true">
          <defs><radialGradient id="case-brass" cx="40%" cy="35%"><stop offset="0" stopColor="#f3d08f" /><stop offset=".6" stopColor="#b98a45" /><stop offset="1" stopColor="#6e4c22" /></radialGradient></defs>
          <circle cx="100" cy="100" r="96" fill="url(#case-brass)" />
          <circle cx="100" cy="100" r="84" fill="#f1e7d4" />
          <circle cx="100" cy="100" r="84" fill="none" stroke="#3a2a20" strokeOpacity=".2" strokeWidth="6" />
          {Array.from({ length: 60 }, (_, i) => <line key={i} x1="100" y1={i % 5 ? 22 : 20} x2="100" y2={i % 5 ? 27 : 33} stroke="#3a2a20" strokeWidth={i % 5 ? 1 : 2.6} transform={`rotate(${i * 6} 100 100)`} />)}
          {[12, 3, 6, 9].map((n, i) => <text key={n} x={100 + Math.sin(i * Math.PI / 2) * 54} y={100 - Math.cos(i * Math.PI / 2) * 54 + 6} textAnchor="middle" className="dial-num">{n}</text>)}
          <motion.g animate={{ rotate: out * .5 }} transition={{ type: 'spring', stiffness: 90, damping: 14 }}>
            <circle cx="100" cy="100" r="84" fill="none" />
            <path d="M97 104 L100 56 L103 104 Z" fill="#2a1c15" />
          </motion.g>
          <motion.g animate={{ rotate: out * 6 }} transition={{ type: 'spring', stiffness: 120, damping: 13 }}>
            <circle cx="100" cy="100" r="84" fill="none" />
            <path d="M98.5 108 L100 26 L101.5 108 Z" fill="#c8323c" />
          </motion.g>
          <circle cx="100" cy="100" r="5" fill="#2a1c15" />
        </svg>
      </div>
      <div className="receipt">
        <span className="micro">Security log, corrected</span>
        <p><span>Key out</span><s>10:36 PM</s><b>{clockText(out)}</b></p>
        <p><span>Key back</span><s>11:02 PM</s><b>{clockText(back)}</b></p>
      </div>
      <div className="offset-ctl">
        <motion.button type="button" whileTap={{ scale: .85 }} className="nudge" onClick={() => set(offset - 1)} disabled={solved || offset <= 0} aria-label="One minute less"><Minus size={18} weight="bold" /></motion.button>
        <div className="offset-read"><motion.b key={offset} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{offset}</motion.b><span className="micro">min ahead</span></div>
        <motion.button type="button" whileTap={{ scale: .85 }} className="nudge" onClick={() => set(offset + 1)} disabled={solved || offset >= 60} aria-label="One minute more"><Plus size={18} weight="bold" /></motion.button>
        <input type="range" className="lever" min="0" max="60" value={offset} disabled={solved} onChange={e => set(Number(e.target.value))} aria-label="How many minutes ahead the security clock ran" />
      </div>
      {solved
        ? <motion.p className="clock-verdict" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={springy}>The key was really out from <b>10:07</b> to <b>10:33 PM</b>.</motion.p>
        : <Button onClick={lock}>Set the clock</Button>}
      <AnimatePresence>{miss > 0 && !solved && <motion.p key={miss} className="clock-miss" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>That does not square with the livestream. Try another setting.</motion.p>}</AnimatePresence>
      <NextButton show={solved} label="Make the accusation" onClick={next} />
    </motion.div>
    {!solved && <HintLadder hints={CLOCK_HINTS} level={state.hints.clock || 0} onLevel={n => patch(old => ({ hints: { ...old.hints, clock: n } }))} onReveal={reveal} revealLabel="Set it for us" />}
    <HowItWorks>Every time on the security log came from the same clock. Compare one thing it stamped with what the livestream shows, slide the lever to that gap, then set the clock.</HowItWorks>
  </Round>;
}

function AccuseRound({ state, patch, solve }) {
  const [miss, setMiss] = useState(null);
  const shake = useAnimationControls();
  const picks = state.picks || {};
  const ready = ACCUSE.every(g => picks[g.id]);
  const choose = (group, value) => { setMiss(null); patch(old => ({ picks: { ...old.picks, [group]: value } })); };
  const accuse = () => {
    const wrong = ACCUSE.find(g => !fits(g, picks[g.id]));
    if (!wrong) return solve();
    setMiss(wrong.id);
    shake.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: .5 } });
  };
  const reveal = () => patch({ picks: { killer: 'elias', bent: 'fast', clincher: 'log-note-lock', herring: 'radiator' }, solved: true, done: ROUND_IDS });
  const off = ACCUSE.find(g => g.id === miss);

  return <Round id="accuse" eyebrow="Round 5 · Accusation" title={<>Name them <em>together.</em></>} intro="One killer, one trick, one clincher and one red herring. Agree out loud before you pin each one.">
    <motion.div className="board case-file" animate={shake}>
      {ACCUSE.map(group => <fieldset key={group.id} className={`charge ${miss === group.id ? 'is-off' : ''}`}>
        <legend className="micro">{group.label}</legend>
        <div className="charge-tags">{group.options.map(o => <motion.button type="button" key={o.value} whileTap={{ scale: .93 }} aria-pressed={picks[group.id] === o.value}
          className={`tag ${picks[group.id] === o.value ? 'is-picked' : ''}`} onClick={() => choose(group.id, o.value)}>
          {picks[group.id] === o.value && <motion.span layoutId={`case-pin-${group.id}`} className="tag-pin" transition={{ type: 'spring', stiffness: 520, damping: 26 }} />}
          {o.label}
        </motion.button>)}</div>
      </fieldset>)}
      <AnimatePresence>{off && <motion.p className="clock-miss" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>{off.miss}</motion.p>}</AnimatePresence>
      <Button onClick={accuse} disabled={!ready}>Make the accusation</Button>
    </motion.div>
    <HintLadder hints={ACCUSE_HINTS} level={state.hints.accuse || 0} onLevel={n => patch(old => ({ hints: { ...old.hints, accuse: n } }))} onReveal={reveal} revealLabel="Close the case for us" />
    <HowItWorks>Pin one card on each line. If the theory does not hold, the file shakes and tells you which line is off; your other pins stay put.</HowItWorks>
  </Round>;
}

function CaseClosed({ onReplay }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(PROMPT); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch { setCopied(false); }
  };
  return <div className="case-end">
    <Finale eyebrow="Joint accusation · correct" title={<>The killer was <em>Elias Rook.</em></>} onReplay={onReplay} replayLabel="Start the case over">
      <div className="closed-photo">
        <Portrait hair="cap" />
        <motion.span className="closed-stamp" initial={{ scale: 3, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -14 }} transition={{ type: 'spring', stiffness: 420, damping: 15, delay: .55 }}>Case closed</motion.span>
      </div>
      <p>The security clock ran 29 minutes fast. Set right, the key left at 10:07 PM and came back at 10:33 PM, while Elias claimed he had gone home at 10:15. He had repaired the library lock that week, and Adrian’s note pointed at the one person who knew the clock was wrong.</p>
      <Button kind="soft" onClick={copy}><ClipboardText size={16} />{copied ? 'Copied' : 'Copy the AI review prompt'}</Button>
    </Finale>
  </div>;
}

export default function Case({ data, update }) {
  const { nameOf } = useClub();
  const [state, patch] = usePatch(data, update, INITIAL);
  const done = (state.done || []).filter(id => ROUND_IDS.includes(id));
  const firstOpen = ROUNDS.findIndex(r => !done.includes(r.id));
  const reach = firstOpen === -1 ? ROUNDS.length - 1 : firstOpen;
  const current = Math.min(Number(state.round) || 0, reach);
  const finish = id => patch(old => ({ done: [...new Set([...(old.done || []), id])] }));
  const go = i => { patch({ round: i }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const next = () => go(current + 1);
  const solve = () => patch({ solved: true, done: ROUND_IDS });
  const replay = () => { patch({ ...INITIAL }); window.scrollTo({ top: 0 }); };
  const props = { state: { ...state, done, hints: state.hints || {}, asked: state.asked || {}, seen: state.seen || [], pinned: state.pinned || [] }, patch, finish, next };

  const rules = <GameRules steps={[
    { title: 'Read your files', text: `${nameOf('A')} holds Mira, Leon and Priya. ${nameOf('B')} holds Elias and Nora. Read them to each other, then question all five.` },
    { title: 'Rebuild the night', text: 'Put the six livestream moments in order.' },
    { title: 'Work the wall', text: 'Turn over all seven exhibits and pin the ones that connect.' },
    { title: 'Test the clock', text: 'Work out how far ahead the security clock was running.' },
    { title: 'Accuse together', text: 'Name the killer, the trick, the clincher and one red herring. A wrong theory tells you which part does not fit.' },
  ]} />;

  return <GameShell title="The 11:47 Case" number="Game 02" tone="lilac" backdrop="case" rules={rules}>
    <RoundProgress rounds={ROUNDS} current={state.solved ? -1 : current} done={done} onSelect={go} />
    {state.solved ? <CaseClosed onReplay={replay} /> : <>
      {current === 0 && <FilesRound {...props} />}
      {current === 1 && <TimelineRound {...props} />}
      {current === 2 && <WallRound {...props} />}
      {current === 3 && <ClockRound {...props} />}
      {current === 4 && <AccuseRound {...props} solve={solve} />}
    </>}
  </GameShell>;
}
