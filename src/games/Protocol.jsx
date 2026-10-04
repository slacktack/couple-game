import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowCounterClockwise, Armchair, Buildings, Cards, Check, CloudRain, Compass, Copy, FilmStrip, ForkKnife, Heart,
  HouseSimple, Image as ImageIcon, Microphone, MoonStars, Mountains, MusicNotes, NotePencil, Pause, Play, Radio,
  Seat, Shuffle, Sparkle, Stamp, SunHorizon, Television, Waves,
} from '@phosphor-icons/react';
import { AnswerLock, Button, Finale, GameRules, GameShell, HintLadder, HowItWorks, PrivatePanel, Round, RoundProgress, Sheet } from '../kit/Kit.jsx';
import { useClub, usePatch } from '../kit/club.js';
import { burstFrom } from '../kit/celebrate.js';
import './Protocol.css';

const WORDS = ['LANTERN', 'RIVER', 'CLOCK', 'ORCHARD', 'TICKET', 'WINDOW', 'COMET', 'CANDLE', 'MIRROR', 'TRAIN', 'TEA', 'PARCEL'];
const TARGETS = { A: [1, 4, 7, 10, 11, 12], B: [2, 3, 5, 6, 8, 9] };
const STAGES = [
  { id: 'split', short: 'Split Key', title: <>Two partial <em>truths.</em></>, letter: 'T' },
  { id: 'message', short: 'The Message', title: <>A sentence can keep <em>a secret.</em></>, letter: 'O' },
  { id: 'evidence', short: 'Field Evidence', title: <>Objects are <em>evidence.</em></>, letter: 'G' },
  { id: 'archive', short: 'The Archive', title: <>Write an ordinary <em>Tuesday.</em></>, letter: 'E' },
  { id: 'dixit', short: 'Dixit at Distance', title: <>Same prompt. <em>Separate worlds.</em></>, letter: 'T' },
  { id: 'samePage', short: 'Same Page', title: <>How in sync <em>are you?</em></>, letter: 'HER' },
  { id: 'vault', short: 'The Vault', title: <>One last little <em>word.</em></>, letter: '' },
];
const ROUNDS = STAGES.map(s => ({ id: s.id, label: s.short }));
const REWARDS = { split: 'T', message: 'O', evidence: 'G', archive: 'E', dixit: 'T', samePage: 'HER', vault: '♡' };
const KEY = [['split', 'T'], ['message', 'O'], ['evidence', 'G'], ['archive', 'E'], ['dixit', 'T'], ['samePage', 'H'], ['samePage', 'E'], ['samePage', 'R']];

const INITIAL = {
  completed: [], activeStage: 0, hints: {}, vaultOpen: false, sidequests: [], closingPlan: '',
  split: { turn: 'A', hits: { A: [], B: [] }, misses: 0 },
  message: { marks: [] },
  evidence: { responses: { A: ['', '', ''], B: ['', '', ''] }, stamped: { A: [], B: [] } },
  archive: { texts: { A: '', B: '' }, ticks: [] },
  dixit: { interpretations: { A: '', B: '' }, sealed: { A: false, B: false } },
  samePage: { answers: { A: Array(10).fill(''), B: Array(10).fill('') }, matches: [] },
};

const SIDEQUESTS = [
  { title: 'The 30-second museum', text: 'Grab any nearby object. Sell it as an artifact from the Museum of Us. You have 30 seconds.' },
  { title: 'Soundtrack ghost', text: 'Pick a song. Give three non-lyric clues. Guess the song, or the feeling it carries.' },
  { title: 'Search history oracle', text: 'Choose a non-sensitive recent search that accidentally describes your week. You never have to share the screen.' },
  { title: 'Bad invention lab', text: 'Invent a wildly unnecessary product for two people. Give it a name, a price and one absurd feature.' },
  { title: 'One-photo time machine', text: 'Find an old photo from before you met. Tell the story of that exact day in 60 seconds.' },
  { title: 'Paper prototype', text: 'Both draw the same impossible object in 90 seconds: a machine that lets two people share one ordinary Tuesday.' },
  { title: 'The fourth wall', text: 'Each of you secretly picks one object the other will completely misread. Reveal together. It counts if the guesses make you laugh.' },
];
const SAME_PAGE = [
  ['Sea', 'Mountains'], ['Morning', 'Midnight'], ['City', 'Small town'], ['Plan', 'Improvisation'], ['Window seat', 'Aisle'],
  ['Sweet', 'Savoury'], ['Rain', 'Cold clear night'], ['Film', 'Series'], ['Photo', 'Voice note'], ['Stay in', 'Go out'],
];
const SAME_PAGE_QUESTIONS = [
  'Where would we disappear for a weekend?', 'When do our best conversations happen?', 'Which kind of place feels like our own?',
  'How should a free afternoon unfold?', 'What makes the journey feel right?', 'What belongs beside a late-night drink?',
  'What kind of night are we saving?', 'What should we put on after dinner?', 'How do you want me to remember this?',
  'What sounds good when the day is finally ours?',
];
const SAME_PAGE_ICONS = [
  [Waves, Mountains], [SunHorizon, MoonStars], [Buildings, HouseSimple], [NotePencil, Shuffle], [Seat, Armchair],
  [Heart, ForkKnife], [CloudRain, Sparkle], [FilmStrip, Television], [ImageIcon, Microphone], [HouseSimple, Compass],
];
const METHODS = ['Think category, not literal object.', 'Your partner knows which words are safe for you, not for them.', 'A clue can bridge several words at once.'];
const MESSAGE = ['Tonight, all good puzzles begin with attention.', 'Actually, the trick is simpler than it looks.', 'Keep your eyes on the margins.', 'Every word can be a clue.', 'Tonight, stars often offer direction.', 'I see rivers mirror moonlight.', 'Some clues burn bright.', 'Letters can illuminate.', 'One small thing can change everything.'];
const EVIDENCE = [
  { title: 'Something that makes a sound', hint: 'Show it. What memory or mood might it hold?', Icon: MusicNotes },
  { title: 'Something older than us', hint: 'Stay quiet for 30 seconds. Let them invent its story.', Icon: NotePencil },
  { title: 'Something absurdly ordinary', hint: 'Why is this boring object secretly a symbol for you two?', Icon: Sparkle },
];
const CONSTRAINTS = ['one smell', 'one boring object', 'one tiny disagreement', 'one line of dialogue'];
const BANNED = ['love', 'happy', 'future', 'forever', 'soulmate'];
const PROMPT = 'Act as a neutral game referee for a two-person creative challenge. We each wrote a 130–180 word scene answering the same prompt. Your job is NOT to judge who loves more, who is the better writer, or whose relationship is healthier. Give us: 1. A score out of 10 for each piece on sensory specificity. 2. A score out of 10 for each on believable everyday detail. 3. A score out of 10 for how strongly each scene implies a shared world. 4. Three concrete details that overlap in spirit across the two pieces. 5. One surprising difference that is interesting rather than bad. 6. A one-sentence verdict: what do these two scenes accidentally reveal about how we imagine ordinary life together? Do not rewrite our work. Keep the tone warm, sharp, and slightly playful.';
const TILT = [-1.6, 1.2, -.6, 1.8, -1.1, .7];

const countWords = value => value.trim() ? value.trim().split(/\s+/).length : 0;
const pad = n => String(n).padStart(2, '0');

export function progress(data = {}) {
  const completed = data.completed || [];
  return { done: completed.filter(id => id !== 'vault').length, total: 6, finished: Boolean(data.vaultOpen) || completed.includes('vault') };
}

export default function Protocol({ data, update }) {
  const { me, nameOf } = useClub();
  const [state, patch] = usePatch(data, update, INITIAL);
  const [stamp, setStamp] = useState(null);
  const [chaosOpen, setChaosOpen] = useState(false);
  const mine = me === 'B' ? 'B' : 'A';
  const theirs = mine === 'A' ? 'B' : 'A';
  const completed = state.completed || [];
  const finished = Boolean(state.vaultOpen) || completed.includes('vault');
  const index = Math.min(Math.max(0, state.activeStage || 0), STAGES.length - 1);
  const stage = STAGES[index];
  const done = completed.includes(stage.id);

  const section = key => ({ ...INITIAL[key], ...(state[key] || {}) });
  const patchIn = key => fn => patch(old => {
    const cur = { ...INITIAL[key], ...(old[key] || {}) };
    return { [key]: { ...cur, ...(typeof fn === 'function' ? fn(cur) : fn) } };
  });
  const complete = id => {
    const at = STAGES.findIndex(s => s.id === id);
    if (STAGES[at].letter) setStamp({ letter: STAGES[at].letter, key: Date.now() });
    patch(old => ({
      completed: [...new Set([...(old.completed || []), id])],
      activeStage: Math.min(at + 1, STAGES.length - 1),
      ...(id === 'vault' ? { vaultOpen: true } : {}),
    }));
  };
  const hint = id => ({ level: state.hints?.[id] || 0, onLevel: n => patch(old => ({ hints: { ...(old.hints || {}), [id]: n } })) });
  const replay = () => update(() => JSON.parse(JSON.stringify(INITIAL)));
  const props = { mine, theirs, done, nameOf, complete: () => complete(stage.id), hint: hint(stage.id) };

  const INTROS = {
    split: `Six of these places are yours and six are ${nameOf(theirs)}'s. Lead each other to them, one word at a time.`,
    message: `${nameOf('A')} holds the opening of the transmission, ${nameOf('B')} the ending. The opening's first letters say what to do with the third word of each line in the ending.`,
    evidence: `Find three things near you. Show each one on camera and let ${nameOf(theirs)} invent its story.`,
    archive: 'Write the scene on your own. Then let a friendly AI referee look for the details that rhyme.',
    dixit: 'Each of you picks one image for the same prompt, not a photo of either of you, and sends it at the same moment.',
    samePage: 'Ten quick picks, made privately. Go with your first instinct.',
    vault: `Everything you earned tonight is sitting in the lock, ${nameOf('A')} and ${nameOf('B')}.`,
  };

  const body = {
    split: <SplitKey {...props} split={section('split')} set={patchIn('split')} />,
    message: <Message {...props} msg={section('message')} set={patchIn('message')} />,
    evidence: <Evidence {...props} ev={section('evidence')} set={patchIn('evidence')} />,
    archive: <Archive {...props} archive={section('archive')} set={patchIn('archive')} />,
    dixit: <Dixit {...props} dixit={section('dixit')} set={patchIn('dixit')} />,
    samePage: <SamePage {...props} sync={section('samePage')} set={patchIn('samePage')} />,
    vault: <Vault {...props} completed={completed} />,
  }[stage.id];

  return <GameShell title="The Distance Protocol" number="Game 01" tone="rose" backdrop="paper" rules={<GameRules steps={RULES(nameOf)} audioSrc="/audio/rules/protocol.mp3" />}>
    <RoundProgress rounds={ROUNDS} current={finished ? -1 : index} done={completed} onSelect={i => !finished && patch({ activeStage: i })} rewards={REWARDS} />
    {finished
      ? <Finale eyebrow="The vault is open" title={<>{nameOf('A')} & {nameOf('B')}, <em>together.</em></>} onReplay={replay} replayLabel="Play again from the start (clears tonight)">
        <p>Six locks and one word, opened from two different places. Before you hang up, each of you says one sentence: the part of tonight you would keep if you could never replay it.</p>
        <ClosingPlan value={state.closingPlan || ''} onChange={v => patch({ closingPlan: v })} />
      </Finale>
      : <Round id={stage.id} className="pr-round" eyebrow={stage.letter ? `Earns ${stage.letter.split('').join(' · ')}` : 'Final unlock'} title={stage.title} intro={INTROS[stage.id]}>
        {stage.id !== 'vault' && <motion.button type="button" className="pr-chaos-tab" onClick={() => setChaosOpen(true)} whileTap={{ scale: .9, rotate: -4 }}>
          <Cards size={17} weight="duotone" /><span>Tiny chaos</span>
        </motion.button>}
        {body}
      </Round>}
    <ChaosSheet open={chaosOpen} onClose={() => setChaosOpen(false)} drawn={state.sidequests || []} onDraw={i => patch(old => ({ sidequests: [...(old.sidequests || []), i] }))} />
    <StampOverlay stamp={stamp} onDone={() => setStamp(null)} />
  </GameShell>;
}

const RULES = nameOf => [
  { title: 'Two phones, one map', text: `${nameOf('A')} and ${nameOf('B')} each play on their own phone over a call. Some pages only show your half. Read it out loud in your own words.` },
  { title: 'Six stops, eight letters', text: 'Split Key, The Message, Field Evidence, The Archive, Dixit at Distance and Same Page. Each stop earns letters for the vault.' },
  { title: 'Hints when you want them', text: 'Puzzles have a hint ladder. After the last hint you can take the answer and keep moving.' },
  { title: 'The vault', text: 'Your letters spell the passcode for the last lock. Open it together.' },
];

// 01 Split Key

function SplitKey({ split, set, mine, theirs, done, nameOf, complete, hint }) {
  const [miss, setMiss] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const hits = split.hits?.[mine] || [];
  const guessing = split.turn === mine && !done;
  const found = done ? TARGETS[theirs] : hits;

  const tap = (n, el) => {
    if (!guessing || found.includes(n)) return;
    if (TARGETS[theirs].includes(n)) {
      const next = [...hits, n];
      burstFrom(el, { shape: 'heart', count: 22 });
      set(old => ({ hits: { ...old.hits, [mine]: next } }));
      if (next.length >= 6) complete();
    } else {
      setMiss(n); clearTimeout(timer.current);
      timer.current = setTimeout(() => setMiss(null), 1100);
      set(old => ({ turn: theirs, misses: (old.misses || 0) + 1 }));
    }
  };
  const reveal = () => { set(old => ({ hits: { ...old.hits, [mine]: TARGETS[theirs] } })); complete(); };

  return <>
    <div className="pr-map">
      <svg className="pr-map-route" viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true">
        <path d="M30 40 C 120 10, 200 70, 270 40 S 250 140, 150 130 S 20 160, 40 220 S 200 250, 260 230 S 270 330, 170 340 S 40 330, 30 380" />
      </svg>
      <span className="pr-compass" aria-hidden="true"><Compass size={26} weight="light" /></span>
      <TurnBaton guessing={guessing} done={done} mine={mine} theirs={theirs} nameOf={nameOf} onPass={() => set({ turn: guessing ? theirs : mine })} />
      <div className="pr-tiles">
        {WORDS.map((word, i) => {
          const n = i + 1;
          const isFound = found.includes(n);
          return <motion.button type="button" key={word} className={`pr-tile ${isFound ? 'is-found' : ''} ${miss === n ? 'is-miss' : ''} ${guessing ? 'is-live' : ''}`}
            disabled={!guessing || isFound} onClick={e => tap(n, e.currentTarget)} aria-pressed={isFound}
            aria-label={`${word}${isFound ? `, one of ${nameOf(theirs)}'s places` : ''}`}
            initial={{ opacity: 0, y: 18, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: TILT[i % 6], rotateY: isFound ? 180 : 0 }}
            transition={{ default: { type: 'spring', stiffness: 260, damping: 18, delay: i * .035 }, rotateY: { type: 'spring', stiffness: 170, damping: 15 } }}
            whileTap={guessing && !isFound ? { scale: .9 } : undefined}>
            <span className="pr-face pr-front"><i>{pad(n)}</i><b>{word}</b></span>
            <span className="pr-face pr-back"><Postmark letter={theirs} /><b>{word}</b></span>
          </motion.button>;
        })}
      </div>
      <AnimatePresence>{miss && <motion.p className="pr-miss-note" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        Not one of {nameOf(theirs)}'s. Your turn to give the clue.
      </motion.p>}</AnimatePresence>
    </div>
    <PrivatePanel title="Your six places" a={<TargetList role="A" />} b={<TargetList role="B" />} />
    {!done && <HintLadder hints={METHODS} {...hint} onReveal={reveal} revealLabel={`Show me ${nameOf(theirs)}'s six`} />}
    <HowItWorks>{`Take turns. The giver says one word and a number that links some of their six places. The guesser taps places on their own phone; a wrong tap passes the turn. Find all six of ${nameOf(theirs)}'s places to earn T.`}</HowItWorks>
  </>;
}

function TurnBaton({ guessing, done, mine, theirs, nameOf, onPass }) {
  const giver = guessing ? theirs : mine;
  const guesser = guessing ? mine : theirs;
  return <motion.div className="pr-baton" layout transition={{ type: 'spring', stiffness: 300, damping: 26 }}>
    <div className="pr-baton-pair" aria-hidden="true">
      <span className={`role-dot role-dot-${giver}`}>{giver}</span>
      <svg viewBox="0 0 60 16"><path d="M2 8 H52" /><path d="M46 3 L54 8 L46 13" /></svg>
      <span className={`role-dot role-dot-${guesser}`}>{guesser}</span>
    </div>
    <AnimatePresence mode="wait" initial={false}>
      <motion.p key={done ? 'done' : guessing ? 'g' : 'c'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
        {done ? <>You found all six. Keep giving {nameOf(theirs)} clues until yours are found too.</>
          : guessing ? <><b>Your turn to guess.</b> {nameOf(theirs)} gives one word and a number.</>
          : <><b>Your turn to give.</b> One word and a number for {nameOf(theirs)}.</>}
      </motion.p>
    </AnimatePresence>
    {!done && <Button kind="soft" onClick={onPass}>{guessing ? 'I’ll stop here' : `${nameOf(theirs)} is done guessing`}</Button>}
  </motion.div>;
}

function TargetList({ role }) {
  return <div className="pr-targets">{TARGETS[role].map((n, i) => <span key={n} style={{ '--i': i }}><i>{pad(n)}</i>{WORDS[n - 1]}</span>)}</div>;
}

function Postmark({ letter }) {
  return <svg className="pr-postmark" viewBox="0 0 60 60" aria-hidden="true">
    <circle cx="30" cy="30" r="25" /><circle cx="30" cy="30" r="19" />
    <path d="M4 22 Q 30 14 56 22 M4 30 Q 30 22 56 30 M4 38 Q 30 30 56 38" />
    <text x="30" y="35" textAnchor="middle">{letter}</text>
  </svg>;
}

// 02 The Message

function Message({ msg, set, mine, theirs, done, nameOf, complete, hint }) {
  const marks = msg.marks || [];
  const ownLines = mine === 'A' ? [0, 1, 2, 3] : [4, 5, 6, 7, 8];
  const toggle = id => set(old => ({ marks: (old.marks || []).includes(id) ? old.marks.filter(m => m !== id) : [...(old.marks || []), id] }));
  return <>
    <div className="pr-telegram">
      <header className="pr-telegram-head">
        <span className="pr-radio"><Radio size={24} weight="duotone" /></span>
        <span><span className="micro">Recovered transmission</span><small>Inbound · 98.4 MHz</small></span>
        <svg className="pr-wave" viewBox="0 0 120 30" aria-hidden="true"><path d="M0 15 Q 7 2 15 15 T 30 15 T 45 15 T 60 15 T 75 15 T 90 15 T 105 15 T 120 15" /></svg>
      </header>
      <ol className="pr-lines">
        {MESSAGE.map((line, li) => {
          const own = ownLines.includes(li);
          return <motion.li key={li} className={`${own ? '' : 'is-theirs'} ${li === 4 ? 'is-break' : ''}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .15 + li * .06, type: 'spring', stiffness: 200, damping: 22 }}>
            <i>{pad(li + 1)}</i>
            {own ? <span className="pr-words">{line.split(' ').map((w, wi) => {
              const id = `${li}-${wi}`;
              const on = marks.includes(id);
              return <button type="button" key={id} className={`pr-word ${on ? 'is-marked' : ''}`} onClick={() => toggle(id)} aria-pressed={on}>
                {w}
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M8 22 C 6 6, 90 2, 94 18 C 98 34, 14 40, 6 24 C 4 18, 20 10, 34 9" /></svg>
              </button>;
            })}</span> : <span className="pr-redacted" aria-label={`${nameOf(theirs)} holds this line`}><span style={{ width: `${40 + (line.length % 5) * 11}%` }} /></span>}
          </motion.li>;
        })}
      </ol>
      <span className="pr-telegram-stamp" aria-hidden="true">{nameOf(theirs)}'s half</span>
    </div>
    <AnswerLock accept={['ORBIT']} onSolve={complete} solved={done} solvedText="ORBIT. Its first letter, O, is yours." placeholder="The hidden word" label="Send it" />
    {!done && <HintLadder hints={[
      `Read only the first letter of each line in ${nameOf('A')}'s half.`,
      `Those letters spell TAKE. Now look at the third word of each line in ${nameOf('B')}'s half.`,
      'Take the first letter of each of those five third words, in order.',
    ]} {...hint} onReveal={complete} />}
    <HowItWorks>{'Tap any word in your half to circle it in pencil. Read your lines to each other, work out the hidden five-letter word, and send it. Nothing is case-sensitive.'}</HowItWorks>
  </>;
}

// 03 Field Evidence

function Evidence({ ev, set, mine, theirs, done, nameOf, complete }) {
  const rows = ev.responses?.[mine] || ['', '', ''];
  const stamped = ev.stamped?.[mine] || [];
  const write = (i, value) => set(old => {
    const next = [...(old.responses?.[mine] || ['', '', ''])]; next[i] = value;
    return { responses: { ...old.responses, [mine]: next } };
  });
  const seal = (i, el) => {
    if (!rows[i]?.trim() || stamped.includes(i)) return;
    const next = [...stamped, i];
    burstFrom(el, { shape: 'star', count: 18 });
    set(old => ({ stamped: { ...old.stamped, [mine]: next } }));
    if (next.length >= 3 && !done) complete();
  };
  return <>
    <div className="pr-evidence">
      <PocketWatch seconds={240} />
      <svg className="pr-string" viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 8 Q 150 46 300 8" /></svg>
      <div className="pr-tags">
        {EVIDENCE.map(({ title, hint, Icon }, i) => {
          const isSealed = stamped.includes(i) || done;
          return <motion.form key={title} className={`pr-tag ${isSealed ? 'is-sealed' : ''}`} style={{ '--sway': `${i % 2 ? 1.6 : -1.6}deg`, '--d': `${i * .7}s` }}
            initial={{ y: -40, opacity: 0, rotate: i % 2 ? 6 : -6 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 12, delay: .1 + i * .12 }}
            onSubmit={e => { e.preventDefault(); seal(i, e.currentTarget); }}>
            <span className="pr-tag-hole" aria-hidden="true" />
            <span className="pr-tag-icon"><Icon size={24} weight="duotone" /></span>
            <b>{title}</b>
            <small>{hint}</small>
            <input value={rows[i] || ''} onChange={e => write(i, e.target.value)} disabled={isSealed} placeholder={`${nameOf(theirs)}'s story for it`} aria-label={`${nameOf(theirs)}'s story for: ${title}`} />
            {!isSealed && <motion.button type="submit" className="pr-tag-stamp" disabled={!rows[i]?.trim()} whileTap={{ scale: .85, rotate: -12 }} aria-label="Stamp this tag"><Stamp size={20} weight="duotone" /></motion.button>}
            <AnimatePresence>{isSealed && <motion.span className="pr-tag-seal" initial={{ scale: 2.2, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }}>Filed</motion.span>}</AnimatePresence>
          </motion.form>;
        })}
      </div>
    </div>
    <HowItWorks>{`Start the watch and hunt for three things at once. Take turns showing one on camera; the other invents its story, then you tell the real one. Write their story on the tag and stamp it. Three stamped tags earn G.`}</HowItWorks>
  </>;
}

function PocketWatch({ seconds }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setLeft(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => { if (left === 0) setRunning(false); }, [left]);
  const r = 26; const c = 2 * Math.PI * r;
  return <div className={`pr-watch ${running ? 'is-running' : ''} ${left === 0 ? 'is-out' : ''}`}>
    <motion.button type="button" className="pr-watch-face" onClick={() => left > 0 && setRunning(v => !v)} whileTap={{ scale: .9, rotate: -6 }} aria-label={running ? 'Pause the timer' : 'Start the four-minute timer'}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle className="pr-watch-track" cx="32" cy="32" r={r} />
        <circle className="pr-watch-fill" cx="32" cy="32" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - left / seconds)} />
        <line className="pr-watch-hand" x1="32" y1="32" x2="32" y2="12" style={{ transform: `rotate(${(1 - left / seconds) * 360}deg)` }} />
      </svg>
      <span>{Math.floor(left / 60)}:{pad(left % 60)}</span>
      <i>{running ? <Pause size={12} weight="fill" /> : <Play size={12} weight="fill" />}</i>
    </motion.button>
    {!running && left < seconds && <button type="button" className="pr-watch-reset" onClick={() => setLeft(seconds)} aria-label="Reset the timer"><ArrowCounterClockwise size={15} /></button>}
  </div>;
}

// 04 The Archive

function Archive({ archive, set, mine, theirs, done, nameOf, complete }) {
  const [copied, setCopied] = useState(false);
  const text = archive.texts?.[mine] || '';
  const words = countWords(text);
  const ticks = archive.ticks || [];
  const lower = ` ${text.toLowerCase().replace(/[^a-z\s]/g, ' ')} `;
  const write = value => set(old => ({ texts: { ...old.texts, [mine]: value } }));
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${PROMPT}\n\n${nameOf(mine)}'s scene:\n${text}`); setCopied(true); setTimeout(() => setCopied(false), 2200); }
    catch { setCopied(false); }
  };
  return <>
    <div className="pr-archive">
      <div className="pr-card">
        <span className="pr-card-tab micro">Archive · case 05Y</span>
        <h3>“It is an entirely normal Tuesday, five years from now. Nothing dramatic happens. Somehow, this is the scene you remember.”</h3>
        <div className="pr-constraints">
          {CONSTRAINTS.map(item => {
            const on = ticks.includes(item);
            return <motion.button type="button" key={item} className={`pr-check ${on ? 'is-on' : ''}`} whileTap={{ scale: .9 }} aria-pressed={on}
              onClick={() => set(old => ({ ticks: (old.ticks || []).includes(item) ? old.ticks.filter(t => t !== item) : [...(old.ticks || []), item] }))}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="2" width="16" height="16" rx="3" /><motion.path d="M5 10 L9 14 L16 5" initial={false} animate={{ pathLength: on ? 1 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }} /></svg>{item}
            </motion.button>;
          })}
        </div>
        <p className="pr-banned">Skip {BANNED.map(w => <span key={w} className={lower.includes(` ${w} `) ? 'is-hit' : ''}>{w}</span>)}</p>
        <AnimatePresence>{done && <motion.span className="pr-archived" initial={{ scale: 2, opacity: 0, rotate: 10 }} animate={{ scale: 1, opacity: 1, rotate: -8 }} transition={{ type: 'spring', stiffness: 380, damping: 16 }}>Archived</motion.span>}</AnimatePresence>
      </div>
      <div className="pr-paper">
        <textarea value={text} onChange={e => write(e.target.value)} readOnly={done} placeholder="The kettle makes its small angry noise…" maxLength={2400} aria-label="Your Tuesday scene" />
        <span className={`pr-count ${words >= 130 ? 'is-good' : ''}`}>{words < 40 ? `${words} / 40 words to file` : `${words} words`} · aim for 130–180</span>
      </div>
      <div className="pr-referee">
        <span className="pr-referee-seal" aria-hidden="true"><Sparkle size={18} weight="fill" /></span>
        <p><b>The referee.</b> Copy the judge prompt with your scene, paste it into Claude or ChatGPT, then {nameOf(theirs)} adds theirs to the same chat.</p>
        <Button kind="ghost" onClick={copy} disabled={!text.trim()}><Copy size={16} /> {copied ? 'Copied' : 'Copy for the referee'}</Button>
      </div>
    </div>
    {!done && <Button onClick={complete} disabled={words < 40}><Stamp size={17} weight="duotone" /> File my Tuesday</Button>}
    <HowItWorks>{'Write privately: tiny real details beat big feelings. When both scenes are with the referee, read its verdict together and talk about one surprising detail. Then file your page to earn E.'}</HowItWorks>
  </>;
}

// 05 Dixit at Distance

function Dixit({ dixit, set, mine, theirs, done, nameOf, complete }) {
  const [photo, setPhoto] = useState('');
  const [opening, setOpening] = useState(done);
  const words = dixit.interpretations?.[mine] || '';
  const sealed = dixit.sealed?.[mine] || done;
  const ready = countWords(words) === 3;
  useEffect(() => () => photo && URL.revokeObjectURL(photo), [photo]);
  const pick = e => { const file = e.target.files?.[0]; if (file) setPhoto(URL.createObjectURL(file)); };
  const open = el => { if (opening) return; setOpening(true); burstFrom(el, { shape: ['heart', 'petal'], count: 40 }); setTimeout(complete, 900); };
  return <>
    <div className="pr-dixit">
      <div className="pr-prompt-card">
        <span className="micro">Your shared prompt</span>
        <h3>“This is what being understood feels like.”</h3>
      </div>
      <label className="pr-polaroid">
        <input type="file" accept="image/*" onChange={pick} className="sr-only" />
        <motion.span className="pr-polaroid-frame" whileTap={{ scale: .94, rotate: 2 }} animate={{ rotate: -3 }}>
          {photo ? <img src={photo} alt="Your chosen image" /> : <span className="pr-polaroid-empty"><ImageIcon size={28} weight="light" /><small>Your pick, just for you</small></span>}
        </motion.span>
      </label>
      <div className={`pr-envelope ${sealed ? 'is-sealed' : ''} ${opening ? 'is-open' : ''}`}>
        <svg className="pr-env-back" viewBox="0 0 300 180" preserveAspectRatio="none" aria-hidden="true"><rect x="1" y="1" width="298" height="178" rx="10" /></svg>
        <motion.div className="pr-letter" animate={{ y: opening ? -70 : 0 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }}>
          {sealed ? <p className="pr-three">{words}</p>
            : <><span className="micro">Three words: why did {nameOf(theirs)} choose theirs?</span>
              <input value={words} onChange={e => set(old => ({ interpretations: { ...old.interpretations, [mine]: e.target.value } }))} placeholder="Three words" aria-label="Your three words" />
              <span className="pr-ink-slots" aria-hidden="true">{[0, 1, 2].map(i => <i key={i} className={i < countWords(words) ? 'is-inked' : ''} />)}</span></>}
        </motion.div>
        <motion.svg className="pr-env-flap" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true" animate={{ rotateX: sealed && !opening ? 0 : 180 }} transition={{ type: 'spring', stiffness: 140, damping: 16 }}>
          <path d="M2 2 L150 92 L298 2 Z" />
        </motion.svg>
        <AnimatePresence>{sealed && !opening && <motion.button type="button" className="pr-wax" onClick={e => open(e.currentTarget)} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, opacity: 0 }} whileTap={{ scale: .88 }} transition={{ type: 'spring', stiffness: 380, damping: 14 }} aria-label="Break the seal">
          <Heart size={22} weight="fill" />
        </motion.button>}</AnimatePresence>
      </div>
      {!sealed && <Button onClick={() => set(old => ({ sealed: { ...old.sealed, [mine]: true } }))} disabled={!ready}>Seal the envelope</Button>}
      {sealed && !done && <p className="pr-countdown-note">Count down from three, then both break your seals and read your words aloud.</p>}
    </div>
    <HowItWorks>{`Pick your image in secret and send it at the same moment. Look at ${nameOf(theirs)}'s, then guess in exactly three words why they chose it. Seal, break the seals together, then tell each other the real story. Matching is not the goal.`}</HowItWorks>
  </>;
}

// 06 Same Page

function SamePage({ sync, set, mine, theirs, done, nameOf, complete, hint }) {
  const answers = sync.answers?.[mine] || Array(10).fill('');
  const next = answers.findIndex(a => !a);
  const allPicked = next < 0;
  const matches = sync.matches || [];
  const pick = (q, choice) => set(old => {
    const rows = [...(old.answers?.[mine] || Array(10).fill(''))]; rows[q] = choice;
    return { answers: { ...old.answers, [mine]: rows } };
  });
  const toggleMatch = i => set(old => ({ matches: (old.matches || []).includes(i) ? old.matches.filter(m => m !== i) : [...(old.matches || []), i] }));
  const verdict = matches.length >= 7 ? 'A mind-meld. Suspiciously efficient.' : matches.length >= 5 ? 'A few shared instincts and plenty to talk about.' : 'Two delightful anomalies. Excellent work.';

  return <>
    {!allPicked ? <div className="pr-deck">
      <div className="pr-deck-stack" aria-hidden="true">{Array.from({ length: Math.min(3, 9 - next) }, (_, i) => <span key={i} style={{ '--n': i + 1 }} />)}</div>
      <AnimatePresence mode="wait">
        <motion.div key={next} className="pr-question" initial={{ opacity: 0, y: 30, rotate: 3 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0, x: -80, rotate: -10 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}>
          <span className="micro">Your pick, privately</span>
          <h3>{SAME_PAGE_QUESTIONS[next]}</h3>
          <div className="pr-pair">{SAME_PAGE[next].map((choice, o) => {
            const Icon = SAME_PAGE_ICONS[next][o];
            return <motion.button type="button" key={choice} className="pr-choice" onClick={() => pick(next, choice)} whileHover={{ y: -4, rotate: o ? 1.5 : -1.5 }} whileTap={{ scale: .9 }}>
              <span className="pr-choice-art"><Icon size={34} weight="duotone" /></span><b>{choice}</b>
            </motion.button>;
          })}</div>
        </motion.div>
      </AnimatePresence>
    </div> : <>
      <div className="pr-picks">
        <p className="pr-picks-head">Read your ten to {nameOf(theirs)}. Tap a heart wherever you matched.</p>
        <ol>{answers.map((a, i) => {
          const on = matches.includes(i);
          return <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .04 }}>
            <span>{SAME_PAGE_QUESTIONS[i]}</span><b>{a}</b>
            <motion.button type="button" className={`pr-heart ${on ? 'is-on' : ''}`} onClick={() => toggleMatch(i)} aria-pressed={on} aria-label={`We matched on ${a}`} whileTap={{ scale: .7 }} animate={{ scale: on ? [1, 1.35, 1] : 1 }}>
              <Heart size={20} weight={on ? 'fill' : 'regular'} />
            </motion.button>
          </motion.li>;
        })}</ol>
        <AnimatePresence>{matches.length > 0 && <motion.p className="pr-verdict" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}><b>{matches.length} of 10.</b> {verdict}</motion.p>}</AnimatePresence>
      </div>
      <div className="pr-riddle">
        <span className="micro">One soft final riddle</span>
        <h3>“I can be carried without hands. I can be shared without dividing. I can be broken without making a sound. What am I?”</h3>
      </div>
      <AnswerLock accept={['PROMISE', 'APROMISE', 'TRUST', 'SILENCE']} onSolve={complete} solved={done} solvedText="A promise. That is H, E and R." placeholder="Your answer" label="Answer" />
      {!done && <HintLadder hints={['It is something two people make to each other.', 'It can be kept, made or broken.']} {...hint} onReveal={complete} />}
    </>}
    <HowItWorks>{'Each of you picks on your own phone, no talking your way into a match. When both are done, read your picks to each other, count your matches, and solve the riddle together.'}</HowItWorks>
  </>;
}

// Vault

function Vault({ completed, complete }) {
  const [turning, setTurning] = useState(false);
  const reduced = useReducedMotion();
  const solve = () => { setTurning(true); setTimeout(complete, reduced ? 0 : 1100); };
  return <>
    <div className={`pr-vault ${turning ? 'is-turning' : ''}`}>
      <svg className="pr-vault-door" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="92" className="pr-vault-rim" />
        <circle cx="100" cy="100" r="74" className="pr-vault-plate" />
        <g className="pr-vault-dial">{Array.from({ length: 24 }, (_, i) => <line key={i} x1="100" y1="34" x2="100" y2={i % 3 ? 40 : 44} transform={`rotate(${i * 15} 100 100)`} />)}
          <circle cx="100" cy="100" r="22" /><path d="M100 78 V60" /></g>
      </svg>
      <div className="key-strip pr-vault-key">{KEY.map(([id, letter], i) => <span key={i} className={completed.includes(id) ? 'is-earned' : ''} style={{ animationDelay: `${.25 + i * .09}s` }}>{completed.includes(id) ? letter : ''}</span>)}</div>
    </div>
    <AnswerLock accept={['TOGETHER']} onSolve={solve} solved={turning} solvedText="The dial is turning…" placeholder="Eight letters" label="Turn the key" />
    <HowItWorks>{'The letters you earned are the passcode, in the order you earned them. Say it out loud together, then type it in.'}</HowItWorks>
  </>;
}

// Finale, chaos cards, stamp

function ClosingPlan({ value, onChange }) {
  return <div className="pr-postcard">
    <span className="pr-postcard-stamp" aria-hidden="true"><Heart size={18} weight="fill" /></span>
    <label htmlFor="pr-plan">Choose one thing you will actually do together, and put it on the calendar.</label>
    <input id="pr-plan" value={value} onChange={e => onChange(e.target.value)} placeholder="Our next thing" autoComplete="off" />
  </div>;
}

function ChaosSheet({ open, onClose, drawn, onDraw }) {
  const left = Math.max(0, 2 - drawn.length);
  const draw = () => {
    const pool = SIDEQUESTS.map((_, i) => i).filter(i => !drawn.includes(i));
    if (left && pool.length) onDraw(pool[Math.floor(Math.random() * pool.length)]);
  };
  return <Sheet open={open} onClose={onClose} title="Tiny chaos">
    <div className="pr-chaos">
      {drawn.length === 0 && <p className="pr-chaos-intro">An optional side quest for a break between stops. Two draws a night.</p>}
      {drawn.map((i, n) => SIDEQUESTS[i] && <motion.article key={i} className="pr-chaos-card" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }} style={{ '--tilt': `${n ? 2 : -2}deg` }}>
        <h4>{SIDEQUESTS[i].title}</h4><p>{SIDEQUESTS[i].text}</p>
      </motion.article>)}
      {left > 0 && <Button onClick={draw}><Cards size={16} /> Draw a card</Button>}
    </div>
  </Sheet>;
}

function StampOverlay({ stamp, onDone }) {
  const reduced = useReducedMotion();
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!stamp) return undefined;
    const id = setTimeout(() => done.current(), reduced ? 600 : 1500);
    return () => clearTimeout(id);
  }, [stamp, reduced]);
  return <AnimatePresence>{stamp && <motion.div key={stamp.key} className="pr-stamp-overlay" aria-live="polite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div className="pr-stamp" initial={{ scale: 2.6, rotate: -28, opacity: 0 }} animate={{ scale: 1, rotate: -9, opacity: 1 }} exit={{ scale: .8, opacity: 0, y: -30 }} transition={{ type: 'spring', stiffness: 420, damping: 17 }}>
      <svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="72" /><circle cx="80" cy="80" r="60" /><path id="pr-arc" d="M28 80 A52 52 0 0 1 132 80" fill="none" /><text><textPath href="#pr-arc" startOffset="50%" textAnchor="middle">KEY EARNED</textPath></text></svg>
      <b>{stamp.letter.split('').join(' ')}</b>
      <span className="sr-only">You earned {stamp.letter}</span>
    </motion.div>
  </motion.div>}</AnimatePresence>;
}
