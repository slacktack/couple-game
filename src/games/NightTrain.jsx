import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Finale, GameRules, GameShell, HintLadder, HowItWorks, PrivatePanel, Round, RoundProgress } from '../kit/Kit.jsx';
import { useClub, usePatch } from '../kit/club.js';
import { burstFrom } from '../kit/celebrate.js';
import { CARS, DRINKS, LETTER, MANIFEST, NOTES, PASSENGERS, ROUTE, SOLUTION, STATIONS, STUBS, TIMETABLE_NOTE } from './night-train-data.js';
import './NightTrain.css';

const ROUNDS = [
  { id: 'seats', label: 'Who sat where' },
  { id: 'stops', label: 'Who got off where' },
  { id: 'letter', label: 'Who wrote it' },
];
const INITIAL = { view: 0, solved: [], seats: {}, stops: {}, accuse: {}, grid: {}, gridTab: 'car', hints: {}, finished: false };
const SPRING = { type: 'spring', stiffness: 420, damping: 24 };
const SOFT = { type: 'spring', stiffness: 220, damping: 20 };
const WRITER = LETTER.writer(SOLUTION);
const byId = id => PASSENGERS.find(p => p.id === id);
const drinkName = id => DRINKS.find(d => d.id === id)?.name;

export function progress(data = {}) {
  const solved = Array.isArray(data.solved) ? data.solved.filter(id => ROUNDS.some(r => r.id === id)) : [];
  return { done: solved.length, total: ROUNDS.length, finished: Boolean(data.finished) };
}

export default function NightTrain({ data, update }) {
  const { nameOf } = useClub();
  const [state, patch] = usePatch(data, update, INITIAL);
  const solved = Array.isArray(state.solved) ? state.solved : [];
  const firstOpen = ROUNDS.findIndex(r => !solved.includes(r.id));
  const view = Math.min(Number(state.view) || 0, firstOpen === -1 ? ROUNDS.length - 1 : firstOpen);
  const round = ROUNDS[view];
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const solve = (id, extra = {}) => {
    patch(old => ({ ...extra, solved: [...new Set([...(old.solved || []), id])] }));
    const next = ROUNDS.findIndex(r => r.id === id) + 1;
    clearTimeout(timer.current);
    if (next < ROUNDS.length) timer.current = setTimeout(() => patch({ view: next }), 1300);
    else timer.current = setTimeout(() => patch({ finished: true }), 900);
  };
  const hintLevel = Number(state.hints?.[round.id]) || 0;
  const setHint = n => patch(old => ({ hints: { ...(old.hints || {}), [round.id]: n } }));
  const A = nameOf('A'); const B = nameOf('B');

  const rules = <GameRules steps={[
    { title: 'Two halves of one night', text: `${A} holds the passenger manifest and the timetable. ${B} holds five torn ticket stubs, the conductor’s notes and the station map.` },
    { title: 'Read out loud', text: 'Neither of you can solve it alone. Read your papers to each other and argue it out.' },
    { title: 'Place the passengers', text: 'Tap a passenger, then tap where they belong. Tap a placed passenger to lift them off again.' },
    { title: 'Mark the punch card', text: 'The punch card is your scratchpad. Tap a hole once to cross it out, twice to punch a heart.' },
  ]} />;

  return <GameShell title="The Night Train" number="Game 06" tone="indigo" backdrop="train" rules={rules}>
    <RoundProgress rounds={ROUNDS} current={state.finished ? -1 : view} done={solved} onSelect={state.finished ? undefined : i => patch({ view: i })} />
    {state.finished
      ? <Finale eyebrow="The letter opens" title={<>Signed, <em>{byId(WRITER).first}</em></>} onReplay={() => patch(() => ({ ...INITIAL }))} replayLabel="Ride again (wipes every answer and mark)">
        <LetterReveal />
      </Finale>
      : <Round id={round.id} className="nt-round" eyebrow={`Round ${view + 1} of 3`} title={TITLES[round.id]} intro={INTROS[round.id]}>
        {round.id === 'seats' && <SeatsBoard state={state} patch={patch} done={solved.includes('seats')} onSolve={() => solve('seats', { seats: SOLUTION.car })} />}
        {round.id === 'stops' && <StopsBoard state={state} patch={patch} done={solved.includes('stops')} onSolve={() => solve('stops', { stops: SOLUTION.station })} />}
        {round.id === 'letter' && <LetterBoard state={state} patch={patch} onSolve={() => solve('letter', { accuse: { who: WRITER, car: SOLUTION.car[WRITER], stop: SOLUTION.station[WRITER] } })} />}
        <PrivatePanel title="Your papers" a={<TusharPapers />} b={<RiyaPapers />} />
        <PunchCard grid={state.grid || {}} tab={state.gridTab} patch={patch} />
        {!solved.includes(round.id) && <HintLadder hints={HINTS[round.id]} level={hintLevel} onLevel={setHint} onReveal={() => REVEAL[round.id](solve)} revealLabel="Show this round’s answer" />}
        <HowItWorks>{HOWTO[round.id]}</HowItWorks>
      </Round>}
  </GameShell>;
}

const TITLES = {
  seats: <>Who sat <em>where</em></>,
  stops: <>Who got off <em>where</em></>,
  letter: <>Who wrote <em>the letter</em></>,
};
const INTROS = {
  seats: `${ROUTE.name} left ${ROUTE.from} at ${ROUTE.departs} with five passengers, one to a car. Seat every one of them.`,
  stops: 'Nobody shared a stop. Walk each passenger down to their platform.',
  letter: 'This was left on the dining-car table, unsigned. Name the writer, their car and their stop.',
};
const HOWTO = {
  seats: 'Car 1 sits right behind the engine. Once all five passengers are seated, the punch button appears.',
  stops: 'Stops run in timetable order from left to right. Each passenger’s badge shows the car you gave them in round one.',
  letter: 'Read the letter together. Pick one passenger, one car and one stop. The wax seal appears once all three are chosen.',
};
const HINTS = {
  seats: [
    'The manifest puts Mateo in car 1, and Oskar’s smudged car is a 1 or a 4. Now ask which drink went with car 4.',
    'Leila drank the red wine, and the wine stub runs to Verona. The car 5 stub was punched at 01:46: find that time on the timetable.',
    'The cellist on the manifest gets off at Bolzano, so she cannot be in car 3 (a V station) or car 5. Car 5 is not Leila either.',
  ],
  stops: [
    'The map shows which city sits on the river. The manifest says who was dropped there.',
    'The first stop after 03:00 on the timetable is where the cellist got off. The car 5 stub’s 01:46 is Innsbruck.',
    'Red wine rode to Verona. Whoever is left stays on to the end of the line.',
  ],
  letter: [
    'Read the letter again, slowly. What was in the writer’s cup?',
    'Only one drink on this train comes with a marshmallow. One of the stubs carries that voucher.',
    'The rosin tin belongs to the cellist, and she drank tea. It is there to distract you.',
  ],
};
const REVEAL = {
  seats: solve => solve('seats', { seats: SOLUTION.car }),
  stops: solve => solve('stops', { stops: SOLUTION.station }),
  letter: solve => solve('letter', { accuse: { who: WRITER, car: SOLUTION.car[WRITER], stop: SOLUTION.station[WRITER] } }),
};


function usePlacer(map, onChange, locked) {
  const [sel, setSel] = useState(null);
  const occupant = slot => PASSENGERS.find(p => map[p.id] === slot)?.id;
  const pick = id => !locked && setSel(s => (s === id ? null : id));
  const drop = slot => {
    if (locked) return;
    const sitting = occupant(slot);
    const next = { ...map };
    if (sel) {
      if (sitting) delete next[sitting];
      next[sel] = slot; setSel(null);
    } else if (sitting) {
      delete next[sitting]; setSel(sitting);
    } else return;
    onChange(next);
  };
  return { sel, pick, drop, occupant };
}

function Token({ p, as = 'button', layoutId, selected, onClick, badge, compact }) {
  const Tag = as === 'span' ? motion.span : motion.button;
  const extra = as === 'span' ? {} : { type: 'button', onClick, 'aria-pressed': selected, whileTap: { scale: .88 }, 'aria-label': `${p.first}${selected ? ', picked up' : ''}` };
  return <Tag layoutId={layoutId} layout className={`nt-token ${compact ? 'is-compact' : ''} ${selected ? 'is-selected' : ''}`} style={{ '--hue': p.hue }}
    animate={{ y: selected ? -7 : 0, scale: selected ? 1.08 : 1 }} transition={SPRING} {...extra}>
    <span className="nt-token-face">{p.first[0]}</span>
    {!compact && <span className="nt-token-name">{p.first}</span>}
    {badge && <span className="nt-token-badge">{badge}</span>}
  </Tag>;
}

function Tray({ placer, map, round, badge }) {
  const loose = PASSENGERS.filter(p => map[p.id] == null);
  return <div className={`nt-tray ${loose.length ? '' : 'is-empty'}`}>
    {loose.map(p => <Token key={p.id} p={p} layoutId={`${round}-${p.id}`} selected={placer.sel === p.id} onClick={() => placer.pick(p.id)} badge={badge?.(p)} />)}
  </div>;
}

function useCheck(onSolve) {
  const [miss, setMiss] = useState(0);
  const ref = useRef(null);
  const check = ok => { if (ok) { burstFrom(ref.current, { shape: ['heart', 'star'] }); setMiss(0); onSolve(); } else setMiss(n => n + 1); };
  return { miss, ref, check };
}

function Verdict({ miss, done, doneText, children }) {
  return <div className="nt-verdict" aria-live="polite">
    <AnimatePresence mode="wait">
      {done ? <motion.p key="done" className="nt-verdict-done" initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={SOFT}>{doneText}</motion.p>
        : miss > 0 ? <motion.p key={`miss-${miss}`} className="nt-verdict-miss" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: [0, -8, 8, -4, 0] }} transition={{ duration: .45 }}>The conductor shakes his head. Something does not fit yet.</motion.p>
          : children}
    </AnimatePresence>
  </div>;
}

function SeatsBoard({ state, patch, done, onSolve }) {
  const seats = done ? SOLUTION.car : (state.seats || {});
  const placer = usePlacer(seats, next => patch({ seats: next }), done);
  const { miss, ref, check } = useCheck(onSolve);
  const full = PASSENGERS.every(p => seats[p.id] != null);
  return <LayoutGroup id="nt-seats">
    <div className={`nt-board nt-scene ${placer.sel ? 'is-armed' : ''} ${done ? 'is-done' : ''}`}>
      <SceneBackdrop />
      <motion.div key={miss} className="nt-train" animate={miss ? { x: [0, -10, 9, -5, 0] } : {}} transition={{ duration: .45 }}>
        <Engine />
        {CARS.map((car, i) => {
          const sitting = placer.occupant(car);
          return <button key={car} type="button" className={`nt-car ${sitting ? 'is-taken' : ''}`} style={{ '--i': i }} onClick={() => placer.drop(car)} disabled={done}
            aria-label={`Car ${car}${sitting ? `, ${byId(sitting).first}` : ', empty'}`}>
            <span className="nt-car-roof" />
            <span className="nt-car-body">
              <span className="nt-car-windows"><i /><i /></span>
              <span className="nt-car-seat">{sitting && <Token as="span" compact p={byId(sitting)} layoutId={`seats-${sitting}`} />}</span>
              <span className="nt-car-plate">{car}</span>
            </span>
            <span className="nt-wheels"><Wheel /><Wheel /></span>
          </button>;
        })}
      </motion.div>
      <span className="nt-rails" />
    </div>
    <Tray placer={placer} map={seats} round="seats" />
    <Verdict miss={miss} done={done} doneText="Tickets punched. Everyone is in the right car.">
      {full && <motion.button key="go" ref={ref} type="button" className="nt-punch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: .94 }} transition={SOFT}
        onClick={() => check(PASSENGERS.every(p => seats[p.id] === SOLUTION.car[p.id]))}><PunchIcon /> Punch the tickets</motion.button>}
    </Verdict>
  </LayoutGroup>;
}

function StopsBoard({ state, patch, done, onSolve }) {
  const stops = done ? SOLUTION.station : (state.stops || {});
  const placer = usePlacer(stops, next => patch({ stops: next }), done);
  const { miss, ref, check } = useCheck(onSolve);
  const full = PASSENGERS.every(p => stops[p.id] != null);
  const badge = p => `car ${SOLUTION.car[p.id]}`;
  return <LayoutGroup id="nt-stops">
    <motion.div key={miss} className={`nt-board nt-route ${placer.sel ? 'is-armed' : ''} ${done ? 'is-done' : ''}`} animate={miss ? { x: [0, -10, 9, -5, 0] } : {}} transition={{ duration: .45 }}>
      <SceneBackdrop quiet />
      <svg className="nt-route-line" viewBox="0 0 500 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 34 C 60 14, 110 46, 170 30 S 290 16, 340 34 S 450 46, 500 26" />
        <path className="nt-route-glow" d="M0 34 C 60 14, 110 46, 170 30 S 290 16, 340 34 S 450 46, 500 26" />
      </svg>
      <span className="nt-mini-train" aria-hidden="true"><i /><i /><i /></span>
      <div className="nt-platforms">
        {STATIONS.map((st, i) => {
          const sitting = placer.occupant(i);
          return <button key={st.id} type="button" className={`nt-platform ${sitting ? 'is-taken' : ''}`} style={{ '--i': i }} onClick={() => placer.drop(i)} disabled={done}
            aria-label={`${st.name}${sitting ? `, ${byId(sitting).first}` : ', nobody yet'}`}>
            <Lamp />
            <span className="nt-platform-name">{st.name}</span>
            <span className="nt-platform-slot">{sitting && <Token as="span" compact p={byId(sitting)} layoutId={`stops-${sitting}`} />}</span>
          </button>;
        })}
      </div>
    </motion.div>
    <Tray placer={placer} map={stops} round="stops" badge={badge} />
    <Verdict miss={miss} done={done} doneText="Every stop called. Nobody missed their platform.">
      {full && <motion.button key="go" ref={ref} type="button" className="nt-punch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: .94 }} transition={SOFT}
        onClick={() => check(PASSENGERS.every(p => stops[p.id] === SOLUTION.station[p.id]))}><BellIcon /> Call the stops</motion.button>}
    </Verdict>
  </LayoutGroup>;
}

function LetterBoard({ state, patch, onSolve }) {
  const accuse = state.accuse || {};
  const { miss, ref, check } = useCheck(onSolve);
  const set = (k, v) => patch(old => ({ accuse: { ...(old.accuse || {}), [k]: old.accuse?.[k] === v ? undefined : v } }));
  const ready = accuse.who && accuse.car != null && accuse.stop != null;
  return <>
    <div className="nt-board nt-table">
      <SceneBackdrop quiet />
      <motion.article className="nt-letter" initial={{ rotate: -3, y: 20, opacity: 0 }} animate={{ rotate: -1.2, y: 0, opacity: 1 }} transition={SOFT}>
        <span className="nt-letter-stain" aria-hidden="true" />
        <p className="nt-letter-to">To the two of you,</p>
        {LETTER.excerpt.map(line => <p key={line}>{line}</p>)}
        <p className="nt-letter-sign">Unsigned</p>
      </motion.article>
      <WaxSeal className="nt-table-seal" />
    </div>
    <div key={miss} className={`nt-accuse ${miss ? 'is-miss' : ''}`}>
      <Pick label="The writer" options={PASSENGERS.map(p => ({ v: p.id, node: <Token as="span" p={p} compact />, text: p.first }))} value={accuse.who} onPick={v => set('who', v)} />
      <Pick label="Their car" options={CARS.map(c => ({ v: c, node: <span className="nt-plaque">{c}</span>, text: `Car ${c}` }))} value={accuse.car} onPick={v => set('car', v)} />
      <Pick wide label="Their stop" options={STATIONS.map((st, i) => ({ v: i, node: <span className="nt-mini-ticket">{st.short}</span>, text: st.name }))} value={accuse.stop} onPick={v => set('stop', v)} />
    </div>
    <Verdict miss={miss} done={false}>
      {ready && <motion.button key="go" ref={ref} type="button" className="nt-seal-btn" initial={{ opacity: 0, scale: .6, rotate: -20 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} whileTap={{ scale: .86, rotate: 8 }} transition={SPRING}
        onClick={() => check(accuse.who === WRITER && accuse.car === SOLUTION.car[WRITER] && accuse.stop === SOLUTION.station[WRITER])}>
        <WaxSeal /><span>Seal the accusation</span>
      </motion.button>}
    </Verdict>
  </>;
}

function Pick({ label, options, value, onPick, wide }) {
  return <div className={`nt-pick ${wide ? 'is-wide' : ''}`} role="group" aria-label={label}>
    <span className="micro">{label}</span>
    <div className="nt-pick-row">
      {options.map(o => <motion.button key={o.v} type="button" className={`nt-pick-opt ${value === o.v ? 'is-on' : ''}`} onClick={() => onPick(o.v)} aria-pressed={value === o.v} aria-label={o.text}
        animate={{ y: value === o.v ? -6 : 0, scale: value === o.v ? 1.06 : 1 }} whileTap={{ scale: .9 }} transition={SPRING}>
        {o.node}<span className="nt-pick-text">{o.text}</span>
      </motion.button>)}
    </div>
  </div>;
}


const GRID_TABS = [
  { id: 'car', label: 'Cars', cols: CARS.map(c => ({ v: c, head: <b>{c}</b>, name: `car ${c}` })) },
  { id: 'stop', label: 'Stops', cols: STATIONS.map((st, i) => ({ v: i, head: <b className="nt-grid-code">{st.short}</b>, name: st.name })) },
  { id: 'drink', label: 'Drinks', cols: DRINKS.map(d => ({ v: d.id, head: <DrinkIcon id={d.id} />, name: d.name })) },
];

function PunchCard({ grid, tab, patch }) {
  const current = GRID_TABS.find(t => t.id === tab) || GRID_TABS[0];
  const cycle = k => patch(old => ({ grid: { ...(old.grid || {}), [k]: ((Number(old.grid?.[k]) || 0) + 1) % 3 } }));
  const keys = PASSENGERS.flatMap(p => current.cols.map(c => `${p.id}:${current.id}:${c.v}`));
  const marked = keys.some(k => grid[k]);
  const wipe = () => patch(old => ({ grid: Object.fromEntries(Object.entries(old.grid || {}).filter(([k]) => !keys.includes(k))) }));
  return <section className="nt-card" aria-label="Punch card scratchpad">
    <header className="nt-card-head">
      <span className="micro">Conductor’s punch card</span>
      <div className="nt-card-tabs" role="tablist">
        {GRID_TABS.map(t => <button key={t.id} type="button" role="tab" aria-selected={t.id === current.id} className={t.id === current.id ? 'is-on' : ''} onClick={() => patch({ gridTab: t.id })}>
          {t.id === current.id && <motion.span layoutId="nt-tab-pill" className="nt-tab-pill" transition={SPRING} />}<span>{t.label}</span>
        </button>)}
      </div>
    </header>
    <div className="nt-grid" style={{ '--cols': current.cols.length }}>
      <span />
      {current.cols.map(c => <span key={c.v} className="nt-grid-head" title={c.name}>{c.head}</span>)}
      {PASSENGERS.map(p => <div key={p.id} className="nt-grid-row" style={{ '--hue': p.hue }}>
        <span className="nt-grid-name"><i>{p.first[0]}</i>{p.first}</span>
        {current.cols.map(c => {
          const k = `${p.id}:${current.id}:${c.v}`;
          const v = Number(grid[k]) || 0;
          return <motion.button key={k} type="button" className={`nt-hole is-${v}`} onClick={() => cycle(k)} whileTap={{ scale: .82 }} transition={SPRING}
            aria-label={`${p.first}, ${c.name}: ${['blank', 'crossed out', 'yes'][v]}`}>
            <AnimatePresence mode="popLayout" initial={false}>
              {v === 1 && <motion.svg key="x" viewBox="0 0 24 24" className="nt-mark-x" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, opacity: 0 }} transition={SPRING}><path d="M6 6l12 12M18 6L6 18" /></motion.svg>}
              {v === 2 && <motion.svg key="h" viewBox="0 0 24 24" className="nt-mark-heart" initial={{ scale: 0 }} animate={{ scale: [0, 1.35, 1] }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: .4 }}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></motion.svg>}
            </AnimatePresence>
          </motion.button>;
        })}
      </div>)}
    </div>
    <AnimatePresence>{marked && <motion.button type="button" className="nt-card-wipe" onClick={wipe} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>Wipe the {current.label.toLowerCase()} column</motion.button>}</AnimatePresence>
  </section>;
}


function TusharPapers() {
  return <div className="nt-papers">
    <article className="nt-manifest">
      <header><span>Passenger manifest</span><b>{ROUTE.name}</b><small>{ROUTE.from} · dep. {ROUTE.departs}</small></header>
      {MANIFEST.map((row, i) => {
        const p = byId(row.id);
        return <div key={row.id} className="nt-manifest-entry" style={{ '--r': `${(i % 2 ? .4 : -.3)}deg` }}>
          <div className="nt-manifest-who"><b>{p.name}</b><small>{p.role}</small></div>
          <div className="nt-manifest-fields">
            <span><em>car</em>{row.car ? <strong>{row.car}</strong> : row.smudge ? <Smudge digits={row.smudge} /> : <Blot />}</span>
            <span><em>order</em>{row.drink ? <strong>{drinkName(row.drink)}</strong> : <Blot />}</span>
            <span><em>to</em>{row.toText ? <strong className="nt-pencil">{row.toText}</strong> : <Blot wide />}</span>
          </div>
        </div>;
      })}
    </article>
    <article className="nt-timetable">
      <header><span>Timetable</span><b>Southbound sleeper</b></header>
      <div className="nt-flap-row is-dep"><Flaps text={ROUTE.departs} /><span>{ROUTE.from}</span></div>
      {STATIONS.map((st, i) => <div key={st.id} className="nt-flap-row" style={{ '--i': i }}><Flaps text={st.time} /><span>{st.name}</span></div>)}
      <p>{TIMETABLE_NOTE}</p>
    </article>
  </div>;
}

function RiyaPapers() {
  return <div className="nt-papers">
    <div className="nt-stubs">
      {STUBS.map((s, i) => <motion.article key={s.id} className={`nt-stub torn-${s.torn}`} style={{ '--tilt': `${s.tilt}deg` }}
        initial={{ y: 16, opacity: 0, rotate: 0 }} animate={{ y: 0, opacity: 1, rotate: s.tilt }} transition={{ ...SOFT, delay: i * .06 }} whileTap={{ scale: 1.04, rotate: 0 }}>
        <span className="nt-stub-brand">Nightingale · stub {i + 1}</span>
        <b className="nt-stub-car">{s.car ? `Car ${s.car}` : <span className="nt-stub-torn">Car ░░</span>}</b>
        {s.drink && <span className="nt-stub-voucher"><DrinkIcon id={s.drink} /> {drinkName(s.drink)} voucher</span>}
        {s.to && <span className="nt-stub-to">→ {STATIONS.find(st => st.id === s.to).name}</span>}
        {s.toPrefix && <span className="nt-stub-to">→ {s.toPrefix}<span className="nt-stub-torn">░░░░</span></span>}
        {s.punched && <span className="nt-stub-punch">punched<b>{s.punched}</b></span>}
        <i className="nt-stub-hole" /><i className="nt-stub-hole" />
      </motion.article>)}
    </div>
    <article className="nt-notebook">
      <header><span>Conductor’s notes</span><small>night of the 14th</small></header>
      <ol>{NOTES.map(n => <li key={n.id}>{n.text}</li>)}</ol>
    </article>
    <StationMap />
  </div>;
}

const MAP_POINTS = [[86, 50], [52, 92], [70, 150], [118, 200], [236, 168]];
function StationMap() {
  return <figure className="nt-map">
    <figcaption>Station map</figcaption>
    <svg viewBox="0 0 300 236" role="img" aria-label="Map of the route and what each stop is known for">
      <path className="nt-map-river" d="M70 14 C 78 30, 92 38, 88 52 S 96 74, 128 82" />
      <path className="nt-map-lagoon" d="M214 190 q 12 -8 24 0 t 24 0 t 24 0 M226 204 q 12 -8 24 0 t 24 0" />
      <path className="nt-map-route" d={`M268 28 L${MAP_POINTS.map(p => p.join(' ')).join(' L')}`} />
      <g className="nt-map-start"><circle cx="268" cy="28" r="5" /><text x="262" y="18" textAnchor="end">{ROUTE.from}</text></g>
      {STATIONS.map((st, i) => {
        const [x, y] = MAP_POINTS[i];
        const right = i !== 4;
        return <g key={st.id} className="nt-map-stop" style={{ '--i': i }}>
          <MapGlyph kind={st.feature} x={x} y={y} />
          <circle cx={x} cy={y} r="6" />
          <text x={x + (right ? 12 : -12)} y={y - 2} textAnchor={right ? 'start' : 'end'}>{st.name}</text>
          <text className="nt-map-mark" x={x + (right ? 12 : -12)} y={y + 12} textAnchor={right ? 'start' : 'end'}>{st.mark}</text>
        </g>;
      })}
    </svg>
  </figure>;
}

function MapGlyph({ kind, x, y }) {
  const t = `translate(${x - 30} ${y - 12})`;
  if (kind === 'peaks') return <path className="nt-map-glyph" transform={t} d="M-6 10 l8 -14 l6 8 l5 -6 l9 12" />;
  if (kind === 'vines') return <g className="nt-map-glyph" transform={t}><circle cx="4" cy="2" r="2.6" /><circle cx="9" cy="2" r="2.6" /><circle cx="6.5" cy="6.5" r="2.6" /><path d="M6.5 -1 v-4" /></g>;
  if (kind === 'balcony') return <path className="nt-map-glyph" transform={t} d="M-2 6 h18 M0 6 v8 M5 6 v8 M10 6 v8 M15 6 v8 M-2 14 h18 M3 2 a4 4 0 0 1 8 0" />;
  return null;
}

function Flaps({ text }) {
  return <span className="nt-flaps">{text.split('').map((ch, i) => <span key={i} className={ch === ':' ? 'is-colon' : ''} style={{ '--d': `${i * 60}ms` }}>{ch}</span>)}</span>;
}
function Blot({ wide }) { return <i className={`nt-blot ${wide ? 'is-wide' : ''}`} aria-label="smudged" />; }
function Smudge({ digits }) {
  return <span className="nt-smudge" aria-label={`smudged, a ${digits.join(' or a ')}`}>{digits.map(d => <b key={d}>{d}</b>)}<small>ink ran: {digits.join(' or ')}</small></span>;
}


function LetterReveal() {
  const { nameOf } = useClub();
  const w = byId(WRITER);
  const stop = STATIONS[SOLUTION.station[WRITER]];
  const lines = [
    `I am the old man from car ${SOLUTION.car[WRITER]}, the one with the cocoa. I stepped off at ${stop.name} before midnight and left this for whoever could find me.`,
    'Fifty-one years ago I tucked a note like this under a dining-car cup for a girl two carriages down. She wrote back. We are still writing.',
    'You two did it the hard way: half the papers each, a phone apiece, a whole night of talking across the distance. That is how the good ones get solved.',
    'Keep writing to each other. Keep catching the night train.',
  ];
  return <div className="nt-reveal">
    <div className="nt-envelope" aria-hidden="true">
      <span className="nt-env-back" />
      <motion.span className="nt-env-flap" initial={{ rotateX: 0 }} animate={{ rotateX: 178 }} transition={{ delay: 1.1, type: 'spring', stiffness: 70, damping: 13 }} />
      <span className="nt-env-front" />
      <motion.span className="nt-env-seal" initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: [1.4, 1, 1], opacity: [0, 1, 0] }} transition={{ duration: 1.4, times: [0, .3, 1] }}><WaxSeal /></motion.span>
      <motion.span className="nt-env-half is-l" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], x: [0, 0, -26], rotate: [0, 0, -32], y: [0, 0, 24] }} transition={{ duration: 1.6, times: [0, .55, 1], delay: .2 }}><WaxSeal /></motion.span>
      <motion.span className="nt-env-half is-r" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], x: [0, 0, 26], rotate: [0, 0, 30], y: [0, 0, 22] }} transition={{ duration: 1.6, times: [0, .55, 1], delay: .2 }}><WaxSeal /></motion.span>
    </div>
    <motion.article className="nt-letter nt-letter-full" initial={{ y: -70, scaleY: .12, opacity: 0 }} animate={{ y: 0, scaleY: 1, opacity: 1 }} transition={{ delay: 1.7, type: 'spring', stiffness: 110, damping: 16 }}>
      <motion.p className="nt-letter-to" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>Dear {nameOf('B')} &amp; {nameOf('A')},</motion.p>
      {lines.map((line, i) => <motion.p key={i} initial={{ opacity: 0, filter: 'blur(6px)', y: 6 }} animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }} transition={{ delay: 2.5 + i * .45, duration: .7 }}>{line}</motion.p>)}
      <motion.p className="nt-letter-sign" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.5 + lines.length * .45 }}>{w.name}<small>car {SOLUTION.car[WRITER]} · off at {stop.name}, {stop.time}</small></motion.p>
      <motion.p className="nt-letter-ps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 + lines.length * .45 }}>P.S. The two seats facing each other in car {SOLUTION.car[WRITER]} are booked under your names for next time. The cocoa is on me.</motion.p>
    </motion.article>
  </div>;
}


function SceneBackdrop({ quiet }) {
  return <div className={`nt-sky ${quiet ? 'is-quiet' : ''}`} aria-hidden="true">
    <span className="nt-moon" />
    {Array.from({ length: 14 }, (_, i) => <i key={i} className="nt-star" style={{ '--x': `${(i * 37) % 100}%`, '--y': `${(i * 23) % 55}%`, '--d': `${(i % 5) * .7}s` }} />)}
    <svg className="nt-hills nt-hills-far" viewBox="0 0 800 80" preserveAspectRatio="none"><path d="M0 80 L0 50 L60 20 L120 46 L190 12 L260 44 L330 26 L400 50 L460 20 L520 46 L590 12 L660 44 L730 26 L800 50 L800 80Z" /></svg>
    <svg className="nt-hills nt-hills-near" viewBox="0 0 800 60" preserveAspectRatio="none"><path d="M0 60 L0 40 Q 50 18 100 36 T 200 30 T 300 38 T 400 40 Q 450 18 500 36 T 600 30 T 700 38 T 800 40 L800 60Z" /></svg>
    {!quiet && <span className="nt-poles"><i /><i /><i /></span>}
  </div>;
}

function Engine() {
  return <div className="nt-engine" aria-hidden="true">
    <span className="nt-steam"><i /><i /><i /></span>
    <svg viewBox="0 0 64 70">
      <rect className="nt-engine-body" x="4" y="26" width="56" height="30" rx="7" />
      <rect className="nt-engine-cab" x="30" y="12" width="28" height="22" rx="4" />
      <rect className="nt-engine-window" x="36" y="17" width="16" height="10" rx="2" />
      <rect className="nt-engine-stack" x="10" y="12" width="9" height="16" rx="2" />
      <circle className="nt-engine-lamp" cx="7" cy="40" r="4" />
      <path className="nt-engine-trim" d="M8 46 H58" />
    </svg>
    <span className="nt-beam" />
    <span className="nt-wheels"><Wheel /><Wheel /></span>
  </div>;
}

function Wheel() {
  return <svg className="nt-wheel" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" /><path d="M10 2v16M2 10h16M4.4 4.4l11.2 11.2M15.6 4.4L4.4 15.6" /></svg>;
}

function Lamp() {
  return <svg className="nt-lamp" viewBox="0 0 24 44" aria-hidden="true"><path className="nt-lamp-post" d="M12 18v26M7 44h10" /><path className="nt-lamp-head" d="M6 8h12l-2 10H8z" /><circle className="nt-lamp-glow" cx="12" cy="13" r="10" /></svg>;
}

function WaxSeal({ className = '' }) {
  return <svg className={`nt-wax ${className}`} viewBox="0 0 48 48" aria-hidden="true">
    <path className="nt-wax-blob" d="M24 3c5 0 7 3 11 4s8 4 8 9-2 6-1 10 1 8-3 11-7 4-11 6-6 2-10 0-7-2-10-5-5-6-4-10-1-7 1-11 3-7 7-9 7-5 12-5z" />
    <circle className="nt-wax-ring" cx="24" cy="25" r="13" />
    <path className="nt-wax-heart" d="M24 33s-8-5-8-10.5a4.3 4.3 0 0 1 8-2.4 4.3 4.3 0 0 1 8 2.4C32 28 24 33 24 33z" />
  </svg>;
}

function DrinkIcon({ id }) {
  const paths = {
    tea: <><path d="M5 10h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M10 10V5l3 1" /></>,
    cocoa: <><path d="M5 9h12v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" /><path d="M17 11h1a2.5 2.5 0 0 1 0 5h-1" /><rect x="8" y="5" width="3.5" height="3.5" rx="1" /><rect x="11.5" y="4" width="3.5" height="3.5" rx="1" /></>,
    wine: <><path d="M8 3h8c0 5-1.5 8-4 8s-4-3-4-8z" /><path d="M12 11v8M8.5 20h7" /><path d="M8.3 6.5h7.4" /></>,
    coffee: <><path d="M5 10h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6z" /><path d="M17 11h1a2.5 2.5 0 0 1 0 5h-1.5" /><path d="M9 7c0-1.5 1.5-1.5 1.5-3M13 7c0-1.5 1.5-1.5 1.5-3" /></>,
    lemonade: <><path d="M7 5h10l-1.5 15h-7z" /><circle cx="16.5" cy="5.5" r="3" /><path d="M8 10h8" /></>,
  };
  return <svg className="nt-drink" viewBox="0 0 24 24" aria-hidden="true">{paths[id]}</svg>;
}

function PunchIcon() {
  return <svg className="nt-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4z" /><circle cx="12" cy="12" r="2.4" /><path d="M8 7v10M16 7v10" strokeDasharray="1.5 2" /></svg>;
}
function BellIcon() {
  return <svg className="nt-btn-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;
}
