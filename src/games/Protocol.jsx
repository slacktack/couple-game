import { useMemo, useState } from 'react';
import {
  ArrowRight, BookOpenText, CaretDown, Check, ClipboardText, Compass, Eye, EyeSlash, Heart, Image as ImageIcon,
  Key, Lightbulb, LockKey, MusicNotes, NotePencil, Sparkle, Shuffle, Timer, X, ArrowUpRight,
  Armchair, Buildings, CloudRain, FilmStrip, ForkKnife, HouseSimple, Microphone, Mountains, MoonStars,
  Radio, Seat, SunHorizon, Television, Waves, Waveform,
} from '@phosphor-icons/react';
import { Button, CheckpointFooter, Countdown, GameFrame, HintBox } from '../components.jsx';
import RouteBriefing from '../RouteBriefing.jsx';

const WORDS = ['LANTERN', 'RIVER', 'CLOCK', 'ORCHARD', 'TICKET', 'WINDOW', 'COMET', 'CANDLE', 'MIRROR', 'TRAIN', 'TEA', 'PARCEL'];
const TARGETS = { A: [1, 4, 7, 10, 11, 12], B: [2, 3, 5, 6, 8, 9] };
const STAGES = [
  { id: 'split', short: 'Split Key', title: 'Two partial truths.', letter: 'T', time: '12 min' },
  { id: 'message', short: 'The Message', title: 'A sentence can keep a secret.', letter: 'O', time: '8 min' },
  { id: 'evidence', short: 'Field Evidence', title: 'Objects are evidence.', letter: 'G', time: '12 min' },
  { id: 'archive', short: 'The Archive', title: 'Write an ordinary Tuesday.', letter: 'E', time: '15 min' },
  { id: 'dixit', short: 'Dixit at Distance', title: 'Same prompt. Separate worlds.', letter: 'T', time: '10 min' },
  { id: 'samePage', short: 'Same Page', title: 'How in sync are you?', letter: 'H · E · R', time: '12 min' },
  { id: 'vault', short: 'The Vault', title: 'One last little word.', letter: '', time: '' },
];
const BRIEFING_STOPS = [
  { title: 'Split Key', short: 'Clue + guess', preview: 'Trade a one-word clue and find six secret words on the shared map.', icon: <Key size={18} />, position: [47, 68] },
  { title: 'The Message', short: 'Hidden words', preview: 'A paper transmission hides two little instructions in plain sight.', icon: <NotePencil size={18} />, position: [58, 32] },
  { title: 'Field Evidence', short: 'Object hunt', preview: 'Find nearby things and let each other invent what they mean.', icon: <ImageIcon size={18} />, position: [69, 60] },
  { title: 'The Archive', short: 'Future Tuesday', preview: 'Write a tiny scene from an ordinary day, five years from now.', icon: <ClipboardText size={18} />, position: [78, 31] },
  { title: 'Dixit at Distance', short: 'Picture stories', preview: 'Choose an image for one prompt, then guess the story behind it.', icon: <MusicNotes size={18} />, position: [87, 67] },
  { title: 'Same Page', short: 'Quick choices', preview: 'Make ten tiny choices, compare your worlds, and earn the last key.', icon: <Shuffle size={18} />, position: [66, 78] },
];
const INITIAL = {
  started: false, introRole: 'A', completed: [], hints: {}, activeStage: 0, codeInput: '', vaultOpen: false,
  split: { role: 'A', phase: 'clue', cardOpen: false, clue: '', number: 1, currentClue: '', currentNumber: 1, foundThisTurn: 0, turns: [], found: { A: 0, B: 0 }, guesses: '', misses: 0 },
  message: { method: '', extraction: '' },
  evidence: { role: 'A', responses: { A: ['', '', ''], B: ['', '', ''] }, bonus: { A: '', B: '' } },
  archive: { role: 'A', texts: { A: '', B: '' }, judgeDone: false },
  dixit: { role: 'A', interpretations: { A: '', B: '' }, revealed: false, shared: false },
  samePage: { role: 'A', questionIndex: 0, answers: { A: Array(10).fill(''), B: Array(10).fill('') }, revealed: false, riddle: '' },
  sidequests: [],
};
const SIDEQUESTS = [
  { title: 'The 30-second museum', text: 'Grab any nearby object. Sell it as an artifact from the Museum of Us. You have 30 seconds.', icon: 'museum' },
  { title: 'Soundtrack ghost', text: 'Pick a song. Give three non-lyric clues. Guess the song, or the feeling it carries.', icon: 'music' },
  { title: 'Search history oracle', text: 'Choose a non-sensitive recent search that accidentally describes your week. You never have to share the screen.', icon: 'oracle' },
  { title: 'Bad invention lab', text: 'Invent a wildly unnecessary product for two people. Give it a name, a price, and one absurd feature.', icon: 'invention' },
  { title: 'One-photo time machine', text: 'Find an old photo from before you met. Tell the story of that exact day in 60 seconds.', icon: 'photo' },
  { title: 'Paper prototype', text: 'Draw the same impossible object in 90 seconds: a machine that lets two people share one ordinary Tuesday.', icon: 'paper' },
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
  [<Waves size={25} weight="duotone" />, <Mountains size={25} weight="duotone" />],
  [<SunHorizon size={25} weight="duotone" />, <MoonStars size={25} weight="duotone" />],
  [<Buildings size={25} weight="duotone" />, <HouseSimple size={25} weight="duotone" />],
  [<NotePencil size={25} weight="duotone" />, <Shuffle size={25} weight="duotone" />],
  [<Seat size={25} weight="duotone" />, <Armchair size={25} weight="duotone" />],
  [<Heart size={25} weight="duotone" />, <ForkKnife size={25} weight="duotone" />],
  [<CloudRain size={25} weight="duotone" />, <Sparkle size={25} weight="duotone" />],
  [<FilmStrip size={25} weight="duotone" />, <Television size={25} weight="duotone" />],
  [<ImageIcon size={25} weight="duotone" />, <Microphone size={25} weight="duotone" />],
  [<HouseSimple size={25} weight="duotone" />, <Compass size={25} weight="duotone" />],
];
const METHODS = ['Think category, not literal object.', 'Your partner knows which words are safe for you, not for them.', 'A clue can bridge multiple words.'];
const MESSAGE_HINTS = ['Look at how the sentences begin before you look at what they mean.', 'The first four sentences tell you an instruction.', 'Take the third word in each of the final five sentences. Their initials spell ORBIT.'];
const PROMPT = 'Act as a neutral game referee for a two-person creative challenge. We each wrote a 130–180 word scene answering the same prompt. Your job is NOT to judge who loves more, who is the better writer, or whose relationship is healthier. Give us: 1. A score out of 10 for each piece on sensory specificity. 2. A score out of 10 for each on believable everyday detail. 3. A score out of 10 for how strongly each scene implies a shared world. 4. Three concrete details that overlap in spirit across the two pieces. 5. One surprising difference that is interesting rather than bad. 6. A one-sentence verdict: what do these two scenes accidentally reveal about how we imagine ordinary life together? Do not rewrite our work. Keep the tone warm, sharp, and slightly playful.';

function PlayerLinks({ onPlayerRoute }) {
  return <div className="route-shortcuts"><button onClick={() => onPlayerRoute('/his')}>His clues · A</button><button onClick={() => onPlayerRoute('/hers')}>Her clues · B</button></div>;
}

function ChapterMenu({ items, active, completed, onSelect }) {
  const activeItem = items[active];
  return <details className="chapter-menu"><summary><span className="chapter-menu-number">{String(active + 1).padStart(2, '0')}</span><span className="chapter-menu-copy"><b>{activeItem.short}</b></span><span className="chapter-menu-progress">{completed.filter(id => id !== 'vault').length}/6</span><CaretDown size={17} /></summary><div className="chapter-menu-list">{items.map((item, index) => { const allowed = index === 0 || completed.includes(items[index - 1].id); return <button type="button" key={item.id} disabled={!allowed} className={`${active === index ? 'is-active' : ''} ${completed.includes(item.id) ? 'is-done' : ''}`} onClick={event => { onSelect(index); event.currentTarget.closest('details').open = false; }}><span>{completed.includes(item.id) ? <Check size={14}/> : String(index + 1).padStart(2, '0')}</span><b>{item.short}</b>{active === index && <i>YOU ARE HERE</i>}{!allowed && <LockKey size={14}/>}</button>; })}</div></details>;
}

function countWords(value) { return value.trim() ? value.trim().split(/\s+/).length : 0; }
function SelectPlayer({ value, onChange, label = 'Hand the screen to' }) {
  return <div className="role-switch"><span>{label}</span>{['A', 'B'].map(role => <button key={role} className={value === role ? 'selected' : ''} onClick={() => onChange(role)}>Player {role}</button>)}</div>;
}
function completeFlags(state, id) { return (state.completed || []).includes(id); }

export default function Protocol({ data, update, onBack, onLibrary, onPlayerRoute, theme, onToggleTheme }) {
  const [photoUrls, setPhotoUrls] = useState({});
  const state = { ...INITIAL, ...data };
  const completed = state.completed || [];
  const stageIndex = Math.min(state.activeStage || 0, STAGES.length - 1);
  const stage = STAGES[stageIndex];
  const patch = patcher => update(previous => {
    const base = { ...INITIAL, ...(previous || {}) };
    return typeof patcher === 'function' ? patcher(base) : { ...base, ...patcher };
  });
  const patchSection = (key, modify) => patch(old => ({ ...old, [key]: { ...old[key], ...(typeof modify === 'function' ? modify(old[key]) : modify) } }));
  const markComplete = id => {
    patch(old => ({ ...old, completed: [...new Set([...(old.completed || []), id])], activeStage: Math.min(STAGES.findIndex(item => item.id === id) + 1, STAGES.length - 1) }));
  };
  const hintIndex = state.hints?.[stage.id] || 0;
  const revealHint = () => patch(old => ({ ...old, hints: { ...(old.hints || {}), [stage.id]: Math.min((old.hints?.[stage.id] || 0) + 1, stage.id === 'message' ? 3 : 3) } }));
  const goStage = index => patch({ activeStage: index });
  const stageDone = completeFlags(state, stage.id);
  const keys = useMemo(() => STAGES.slice(0, 6).flatMap(item => completed.includes(item.id) ? item.letter.split(' · ') : []), [completed]);
  const hintBox = (hints, recoveryLabel = 'Give us the key and keep going') => <HintBox hints={hints} index={hintIndex} onReveal={revealHint} recovery onRecovery={() => markComplete(stage.id)} recoveryLabel={recoveryLabel} />;
  const footer = (label = 'Take the key') => <CheckpointFooter completed={stageDone} letter={stage.letter} onComplete={() => markComplete(stage.id)} label={label} />;

  const renderSplit = () => {
    const split = { ...INITIAL.split, ...(state.split || {}) };
    const role = split.role || 'A';
    const solved = split.found?.[role] || 0;
    const phase = split.phase || 'clue';
    const currentNumber = Number(split.currentNumber) || 1;
    const submitClue = () => {
      if (!split.clue.trim()) return;
      patchSection('split', old => ({
        turns: [...(old.turns || []), { role: old.role, clue: old.clue.trim(), number: Number(old.number) || 1, guesses: (old.guesses || '').trim() }],
        clue: '', guesses: '', cardOpen: false, phase: 'map', currentClue: old.clue.trim(), currentNumber: Number(old.number) || 1, foundThisTurn: 0,
      }));
    };
    const confirmTarget = () => patchSection('split', old => {
      const foundThisTurn = (old.foundThisTurn || 0) + 1;
      const turnFinished = foundThisTurn >= (Number(old.currentNumber) || 1);
      return {
        found: { ...old.found, [role]: Math.min(6, (old.found?.[role] || 0) + 1) },
        foundThisTurn: turnFinished ? 0 : foundThisTurn,
        phase: turnFinished ? 'clue' : 'map',
        role: turnFinished ? (role === 'A' ? 'B' : 'A') : role,
        currentClue: turnFinished ? '' : old.currentClue,
        currentNumber: turnFinished ? 1 : old.currentNumber,
        guesses: '', cardOpen: false, clue: '',
      };
    });
    const missTarget = () => patchSection('split', old => ({ misses: (old.misses || 0) + 1, guesses: '' }));
    const passClue = () => patchSection('split', old => ({ role: role === 'A' ? 'B' : 'A', phase: 'clue', currentClue: '', currentNumber: 1, foundThisTurn: 0, guesses: '', cardOpen: false, clue: '' }));
    const hints = [METHODS[0], METHODS[1], METHODS[2]];
    return <>
      <div className="stage-intro"><p>One player gives a clue. The other taps the map.</p><div className="stage-meta"><span><Timer size={15} /> 12 minutes</span><span><Heart size={15} /> One team</span></div></div>
      <div className={`split-layout ${phase === 'map' ? 'map-phase' : ''}`}>
        <section className={`play-panel split-secret ${phase === 'map' ? 'guessing-phase' : 'clue-phase'}`}>
          {phase === 'clue' ? <>
            <div className="panel-heading"><span className="mini-icon rose-icon"><LockKey size={17} /></span><div><h3>Clue-giver · Player {role}</h3><p>Keep your six marked places private.</p></div></div>
            <SelectPlayer value={role} onChange={next => patchSection('split', { role: next, cardOpen: false, clue: '', guesses: '' })} label="Who gives this clue?" />
            {!split.cardOpen ? <button className="privacy-card" onClick={() => patchSection('split', { cardOpen: true })}><Eye size={22} /><strong>Open your private map</strong><span>Hand over the screen first.</span></button> : <div className="target-reveal"><div className="target-reveal-head"><span>ONLY PLAYER {role} READS THIS</span><button onClick={() => patchSection('split', { cardOpen: false })} aria-label="Hide private key card"><EyeSlash size={18} /></button></div><div className="target-word-list">{TARGETS[role].map(n => <span key={n}>{String(n).padStart(2, '0')} <b>{WORDS[n - 1]}</b></span>)}</div></div>}
            <div className="target-meter"><div><span>Targets found</span><strong>{solved}/6</strong></div><div className="meter-track"><i style={{ width: `${Math.min(100, solved / 6 * 100)}%` }} /></div></div>
            {split.cardOpen && <div className="clue-entry"><span className="input-caption">Give one word + a number</span><div className="clue-fields"><input value={split.clue || ''} onChange={e => patchSection('split', { clue: e.target.value })} placeholder="e.g. sky" aria-label="One-word clue" /><fieldset className="count-field"><legend>Places it links</legend><div className="count-picker" role="group" aria-label="Number of words in clue">{[1, 2, 3, 4, 5, 6].map(n => <button type="button" key={n} className={Number(split.number || 1) === n ? 'selected' : ''} aria-pressed={Number(split.number || 1) === n} onClick={() => patchSection('split', { number: n })}>{n}</button>)}</div></fieldset></div><Button kind="berry" disabled={!split.clue.trim()} onClick={submitClue}><Sparkle size={16} /> Send clue to partner</Button></div>}
          </> : <>
            <div className="partner-clue-banner"><span className="partner-avatar">{role === 'A' ? 'B' : 'A'}</span><div><small>PLAYER {role === 'A' ? 'B' : 'A'} · GUESSER</small><b>{split.currentClue}</b></div><span className="clue-target-count">{split.foundThisTurn || 0}<i> / </i>{currentNumber}</span></div>
            <div className="guess-pad"><div className="map-heading"><span className="input-caption">Shared map</span><span className="map-stamp"><Compass size={14}/> 12 places</span></div><p>Tap the place your partner picked.</p><div className="word-grid"><svg className="map-thread" viewBox="0 0 1000 380" preserveAspectRatio="none" aria-hidden="true"><path d="M165 45 H500 H835 Q875 45 875 82 V105 Q875 125 835 125 H165 Q125 125 125 165 V196 Q125 216 165 216 H835 Q875 216 875 256 V287 Q875 307 835 307 H165"/></svg>{WORDS.map((word, index) => <button type="button" key={word} className={`word-tile ${split.guesses === word ? 'is-selected' : ''}`} onClick={() => patchSection('split', { guesses: word })} aria-pressed={split.guesses === word}><span className="word-tile-number">{String(index + 1).padStart(2, '0')}</span><b>{word}</b><Compass size={14} className="word-tile-marker"/></button>)}</div>{split.guesses && <div className="guess-confirm"><span>You picked <b>{split.guesses}</b></span><div><button type="button" className="tiny-accept" onClick={confirmTarget}>{(split.foundThisTurn || 0) + 1 >= currentNumber ? 'Found it · swap players' : 'Found it · one more'}</button><button type="button" className="tiny-decline" onClick={missTarget}>Try another place</button></div></div>}<button type="button" className="pass-clue" onClick={passClue}><ArrowRight size={14}/> Pass and switch clue-giver</button></div>
          </>}
          {split.turns?.length > 0 && <details className="mini-turn-log"><summary><span>Clue trail</span><i>{split.turns.length} turns</i><CaretDown size={14}/></summary><div>{split.turns.map((turn, i) => <p key={`${turn.clue}-${i}`}><b>{turn.role}</b><span>{turn.clue} · {turn.number}</span></p>)}</div></details>}
        </section>
        <aside className="side-note rose-side"><span className="micro-label">IF YOU GET STUCK</span>{hintBox(hints, 'Skip this puzzle')}<div className="side-petal" aria-hidden="true">T</div></aside>
      </div>
      {footer('We found the targets')}
    </>;
  };

  const renderMessage = () => {
    const msg = { ...INITIAL.message, ...(state.message || {}) };
    const text = ['Tonight, all good puzzles begin with attention.', 'Actually, the trick is simpler than it looks.', 'Keep your eyes on the margins.', 'Every word can be a clue.', 'Tonight, stars often offer direction.', 'I see rivers mirror moonlight.', 'Some clues burn bright.', 'Letters can illuminate.', 'One small thing can change everything.'];
    const correct = msg.method.trim().toUpperCase() === 'TAKE' && msg.extraction.trim().toUpperCase() === 'ORBIT';
    return <>
      <div className="stage-intro"><p>Two layers hide in plain sight. First read the first four sentences from a certain angle. Then use what they tell you on the last five.</p><div className="stage-meta"><span><Timer size={15} /> 8 minutes</span><span><Sparkle size={15} /> Nothing is case-sensitive</span></div></div>
      <section className="message-note"><div className="transmission-heading"><span className="transmission-art"><Radio size={26} weight="duotone" /></span><span><span className="micro-label">Recovered transmission</span><small>INBOUND · 98.4 MHZ</small></span><Waveform size={66} weight="thin" className="transmission-wave" /></div><div className="message-text">{text.map((line, i) => <p key={i} className={i === 4 ? 'message-break' : ''}><span>{String(i + 1).padStart(2, '0')}</span>{line}</p>)}</div><small>Read the opening initials, then follow the instruction in the final five lines.</small></section>
      <section className="play-panel message-entry"><div className="panel-heading"><span className="mini-icon peach-icon"><NotePencil size={17} /></span><div><h3>Enter the two layers</h3><p>The extraction chain should make a five-letter word.</p></div></div><div className="two-answer-fields"><label><span>First four initials → method</span><input value={msg.method} onChange={e => patchSection('message', { method: e.target.value })} placeholder="four letters" maxLength={8} /></label><label><span>Take the method across the final five → word</span><input value={msg.extraction} onChange={e => patchSection('message', { extraction: e.target.value })} placeholder="five letters" maxLength={10} /></label></div>{msg.method && msg.extraction && <p className={`answer-feedback ${correct ? 'answer-correct' : ''}`}>{correct ? 'That fits the transmission. The key is its first letter.' : 'Close the page for a second and look at the sentence starts.'}</p>}</section>
      <div className="clarification-note"><Lightbulb size={18} /><p><b>A clearer version for this site:</b> the source PDF’s last-five-sentence extraction has a small typo. This version makes the intended third-word initials spell ORBIT, just as the host guide says.</p></div>
      {hintBox(MESSAGE_HINTS, 'Reveal the key and move on')}
      {correct && !stageDone ? footer('Take O and continue') : footer('We cracked it')}
    </>;
  };

  const renderEvidence = () => {
    const ev = { ...INITIAL.evidence, ...(state.evidence || {}) };
    const prompts = [
      ['Something that makes a sound', 'Show it. What memory or mood might it represent?', <MusicNotes size={25} weight="duotone" />],
      ['Something older than your relationship', 'Stay quiet for 30 seconds. Let them invent its story.', <NotePencil size={25} weight="duotone" />],
      ['Something absurdly ordinary', 'Why is this boring object secretly a good symbol for you two?', <Sparkle size={25} weight="duotone" />],
    ];
    const responseCount = [...(ev.responses?.A || []), ...(ev.responses?.B || [])].filter(v => v.trim()).length;
    const capture = (role, index, value) => patchSection('evidence', old => { const rows = [...(old.responses?.[role] || ['', '', ''])]; rows[index] = value; return { responses: { ...old.responses, [role]: rows } }; });
    return <>
      <div className="stage-intro"><p>Find three everyday objects in four minutes. Give each one a little story; the other person gets to interpret it. No one needs a perfect guess.</p><div className="stage-meta"><span><Timer size={15} /> Four-minute search each</span><span><Heart size={15} /> Objects can be tiny or silly</span></div></div>
      <Countdown seconds={240} label="Your scavenger sprint" />
      <section className="evidence-sheet"><div className="sheet-top"><div><span className="micro-label">The evidence board</span><h3>Three objects, two points of view.</h3></div><SelectPlayer value={ev.role} onChange={role => patchSection('evidence', { role })} label="Writing for" /></div><div className="evidence-prompts">{prompts.map(([title, hint, icon], i) => <label className={`evidence-prompt evidence-prompt-${i + 1}`} key={title}><span className="prompt-art"><span>{icon}</span><i>0{i + 1}</i></span><span className="prompt-title"><b>{title}</b><small>{hint}</small></span><input value={ev.responses?.[ev.role]?.[i] || ''} onChange={e => capture(ev.role, i, e.target.value)} placeholder="Add a tiny story…" /></label>)}</div><div className="evidence-summary"><span>{responseCount}/6 stories added</span><div className="meter-track"><i style={{ width: `${responseCount / 6 * 100}%` }} /></div></div></section>
      <details className="bonus-card"><summary><Sparkle size={17} /> Bonus round · The fourth wall</summary><p>Each person secretly picks one extra object the other will completely misread. Reveal together. It is a win if the guesses make you laugh.</p><SelectPlayer value={ev.role} onChange={role => patchSection('evidence', { role })} label="Bonus note for" /><input value={ev.bonus?.[ev.role] || ''} onChange={e => patchSection('evidence', old => ({ bonus: { ...old.bonus, [old.role]: e.target.value } }))} placeholder="Optional: what did they think it was?" /></details>
      {footer('We told the stories')}
    </>;
  };

  const renderArchive = () => {
    const archive = { ...INITIAL.archive, ...(state.archive || {}) };
    const role = archive.role || 'A';
    const words = countWords(archive.texts?.[role] || '');
    const write = value => patchSection('archive', old => ({ texts: { ...old.texts, [old.role]: value } }));
    const copyPrompt = async () => { try { await navigator.clipboard.writeText(PROMPT); patchSection('archive', { copied: true }); window.setTimeout(() => patchSection('archive', { copied: false }), 2200); } catch { patchSection('archive', { copied: false }); } };
    return <>
      <div className="stage-intro"><p>Write a little slice of daily life, five years from now. It is not a love letter, a prediction, or a test. Tiny real details do all the work.</p><div className="stage-meta"><span><Timer size={15} /> 15 minutes</span><span><NotePencil size={15} /> One ordinary Tuesday</span></div></div>
      <section className="archive-prompt"><span className="micro-label">The only prompt</span><h3>“It is an entirely normal Tuesday, five years from now. Nothing dramatic happens. Somehow, this is the scene you remember.”</h3><div className="constraint-list"><span>one smell</span><span>one boring object</span><span>one tiny disagreement</span><span>one line of dialogue</span><span>skip: love · happy · future · forever · soulmate</span></div></section>
      <section className="play-panel writing-panel"><div className="panel-heading"><span className="mini-icon peach-icon"><NotePencil size={17} /></span><div><h3>Write privately, then swap</h3><p>Tap a player tab to hand over the screen. Their draft stays hidden until they choose to share it.</p></div></div><SelectPlayer value={role} onChange={next => patchSection('archive', { role: next })} label="Writer" /><textarea className="scene-editor" value={archive.texts?.[role] || ''} onChange={e => write(e.target.value)} placeholder="The kettle makes its small angry noise. Someone has left a…" maxLength={2400} /><div className="word-counter"><span>{words} words</span><span>{words >= 130 && words <= 180 ? 'Perfect little scene' : words < 130 ? `${130 - words} to reach the suggested length · shorter is fine` : 'Longer is fine too · trim only if it feels good'}</span></div><details className="private-draft"><summary><Eye size={15} /> Preview your partner’s scene after they say “ready”</summary><SelectPlayer value={role === 'A' ? 'B' : 'A'} onChange={() => patchSection('archive', { role: role === 'A' ? 'B' : 'A' })} label="Other writer" /><blockquote>{archive.texts?.[role === 'A' ? 'B' : 'A'] || 'Their draft is still empty.'}</blockquote></details></section>
      <section className="judge-card"><div><span className="micro-label">Your friendly AI referee</span><h3>No rankings. Just good noticing.</h3><p>Paste both scenes in one Claude or GPT conversation, then ask it to spot the ordinary details that rhyme.</p></div><button className="copy-prompt" onClick={copyPrompt}><ClipboardText size={17} />{archive.copied ? 'Copied' : 'Copy the full judge prompt'}</button><details><summary>Read the full judge prompt</summary><p>{PROMPT}</p></details></section>
      <label className="checkbox-line"><input type="checkbox" checked={archive.judgeDone || false} onChange={e => patchSection('archive', { judgeDone: e.target.checked })} /><span>We both talked about one surprising detail.</span></label>
      {footer('We shared the scenes')}
    </>;
  };

  const renderDixit = () => {
    const dixit = { ...INITIAL.dixit, ...(state.dixit || {}) };
    const role = dixit.role || 'A';
    const onPhoto = e => { const file = e.target.files?.[0]; if (file) { const url = URL.createObjectURL(file); setPhotoUrls(old => ({ ...old, [role]: url })); } };
    const threeWords = value => countWords(value) === 3;
    const bothReady = ['A', 'B'].every(p => threeWords(dixit.interpretations?.[p] || ''));
    return <>
      <div className="stage-intro"><p>Pick one image that is not a photo of either of you. Send it at the same time, then guess the feeling behind each other’s choice in exactly three words.</p><div className="stage-meta"><span><Timer size={15} /> 10 minutes</span><span><ImageIcon size={15} /> Any image, screenshot, or drawing</span></div></div>
      <section className="dixit-board"><div className="dixit-prompt"><span className="micro-label">Your shared prompt</span><h3>“This is what being understood feels like.”</h3><span className="prompt-orbit">✳</span></div><div className="dixit-step"><SelectPlayer value={role} onChange={next => patchSection('dixit', { role: next, revealed: false })} label="Writing for"/><label className="upload-tile"><input type="file" accept="image/*" onChange={onPhoto} /><span className="upload-icon"><ImageIcon size={23} /></span><b>{photoUrls[role] ? 'Change the image' : 'Optional: pick your image'}</b><small>Your photo stays in this browser tab. A text-only reveal is lovely too.</small></label>{photoUrls[role] && <img className="dixit-preview" src={photoUrls[role]} alt={`Private image for player ${role}`} />}<label className="three-words"><span>Three words for why your partner chose theirs</span><input value={dixit.interpretations?.[role] || ''} onChange={e => patchSection('dixit', old => ({ interpretations: { ...old.interpretations, [old.role]: e.target.value } }))} placeholder="quiet, brave, home" /><small>{dixit.interpretations?.[role] ? `${countWords(dixit.interpretations[role])} words` : 'Write exactly three. Keep your image and explanation secret.'}</small></label></div><div className="simultaneous-bar"><span>{bothReady ? 'Both interpretations are ready.' : 'Wait until both players have written three words.'}</span><Button kind={dixit.revealed ? 'soft' : 'dark'} disabled={!bothReady && !dixit.revealed} onClick={() => patchSection('dixit', { revealed: !dixit.revealed })}>{dixit.revealed ? 'Hide reveal' : 'Reveal together'}<ArrowRight size={16} /></Button></div>{dixit.revealed && <div className="interpretation-reveal">{['A', 'B'].map(person => <article key={person}><span>PLAYER {person}</span>{photoUrls[person] && <img src={photoUrls[person]} alt={`Player ${person}'s selected image`} />}<strong>{dixit.interpretations[person]}</strong></article>)}</div>}</section>
      <p className="gentle-note"><Heart size={16} /> Matching images is not the goal. The interesting part is what the other person noticed.</p>
      <label className="checkbox-line"><input type="checkbox" checked={dixit.shared || false} onChange={e => patchSection('dixit', { shared: e.target.checked })} /><span>We each explained what our image meant, without rushing the guess.</span></label>
      {footer('We understood the images')}
    </>;
  };

  const renderSamePage = () => {
    const sync = { ...INITIAL.samePage, ...(state.samePage || {}) };
    const role = sync.role || 'A';
    const answerRows = sync.answers?.[role] || Array(10).fill('');
    const ready = ['A', 'B'].every(person => (sync.answers?.[person] || []).length === 10 && sync.answers[person].every(Boolean));
    const sameCount = ready ? SAME_PAGE.reduce((acc, _, i) => acc + (sync.answers.A[i] === sync.answers.B[i] ? 1 : 0), 0) : 0;
    const unanswered = answerRows.findIndex(value => !value);
    const questionIndex = Math.min(9, Math.max(0, Number.isInteger(sync.questionIndex) ? sync.questionIndex : unanswered < 0 ? 9 : unanswered));
    const questionAnswers = SAME_PAGE[questionIndex];
    const answerCount = answerRows.filter(Boolean).length;
    const select = (index, choice) => patchSection('samePage', old => {
      const rows = [...(old.answers?.[old.role] || Array(10).fill(''))];
      rows[index] = choice;
      const nextQuestion = rows.findIndex(value => !value);
      return { answers: { ...old.answers, [old.role]: rows }, questionIndex: nextQuestion < 0 ? index : nextQuestion, revealed: false };
    });
    const handTo = next => {
      const nextRows = sync.answers?.[next] || Array(10).fill('');
      const nextQuestion = nextRows.findIndex(value => !value);
      patchSection('samePage', { role: next, questionIndex: nextQuestion < 0 ? 9 : nextQuestion, revealed: false });
    };
    const riddleReady = ['promise', 'trust', 'silence'].includes((sync.riddle || '').trim().toLowerCase());
    const recoverRiddle = () => patchSection('samePage', { riddle: 'promise' });
    return <>
      <div className="stage-intro"><p>Each person picks privately. Finish all ten, then reveal at once. No talking your way into a match.</p><div className="stage-meta"><span><Timer size={15} /> 12 minutes</span><span><Heart size={15} /> Odd answers are part of the fun</span></div></div>
      <section className="same-page-board">
        <div className="sync-board-heading"><div><span className="micro-label">A little compatibility experiment</span><h3>Follow your first thought.</h3></div><SelectPlayer value={role} onChange={handTo} label="Picking for" /></div>
        <div className="sync-question-top"><span>QUESTION <b>{String(questionIndex + 1).padStart(2, '0')}</b> / 10</span><span>PLAYER {role} · PRIVATE PICKS</span></div>
        <div className="sync-question-scene" key={questionIndex}>
          <div className="sync-question-art" aria-hidden="true"><span>{SAME_PAGE_ICONS[questionIndex][0]}</span><i /><span>{SAME_PAGE_ICONS[questionIndex][1]}</span></div>
          <span className="micro-label">GO WITH THE GUT ANSWER</span>
          <h3>{SAME_PAGE_QUESTIONS[questionIndex]}</h3>
          <div className="sync-choice-pair">{questionAnswers.map((choice, optionIndex) => <button type="button" key={choice} className={answerRows[questionIndex] === choice ? 'is-chosen' : ''} aria-pressed={answerRows[questionIndex] === choice} onClick={() => select(questionIndex, choice)}><span className="sync-choice-art">{SAME_PAGE_ICONS[questionIndex][optionIndex]}</span><b>{choice}</b><small>{optionIndex === 0 ? 'THE FIRST INSTINCT' : 'THE OTHER INSTINCT'}</small><ArrowRight size={16} /></button>)}</div>
        </div>
        <nav className="sync-question-trail" aria-label="Choose a question">{SAME_PAGE.map(([first], index) => <button type="button" key={first} className={`${index === questionIndex ? 'is-current' : ''} ${answerRows[index] ? 'is-answered' : ''}`} aria-label={`Question ${index + 1}${answerRows[index] ? ', answered' : ''}`} aria-current={index === questionIndex ? 'step' : undefined} onClick={() => patchSection('samePage', { questionIndex: index })}>{answerRows[index] ? <Check size={12} weight="bold" /> : String(index + 1).padStart(2, '0')}</button>)}</nav>
        <div className="sync-turn-footer"><b>{answerCount} / 10</b><span>picked by Player {role}. Their choices stay hidden.</span><i><span style={{ width: `${answerCount * 10}%` }} /></i></div>
        <div className="simultaneous-bar"><span>{ready ? `Both finished · ${sameCount} of 10 matched` : `Hand over the screen when Player ${role} is done.`}</span><Button disabled={!ready} onClick={() => patchSection('samePage', { revealed: !sync.revealed })}>{sync.revealed ? 'Hide the reveal' : 'Reveal together'}<ArrowRight size={16} /></Button></div>
        {sync.revealed && <div className="sync-result"><span className="sync-emoji">{sameCount >= 7 ? '✦' : sameCount >= 5 ? '♡' : '↗'}</span><div><span className="micro-label">Together, you matched</span><strong>{sameCount} of 10</strong><p>{sameCount >= 7 ? 'A mind-meld. Suspiciously efficient.' : sameCount >= 5 ? 'A few shared instincts and plenty to talk about.' : 'Two delightful cryptographic anomalies. Excellent work.'}</p></div></div>}
      </section>
      {sync.revealed && <section className="riddle-panel"><span className="micro-label">One soft final riddle</span><h3>“I can be carried without hands. I can be shared without dividing. I can be broken without making a sound. What am I?”</h3><div className="riddle-input"><input value={sync.riddle || ''} onChange={e => patchSection('samePage', { riddle: e.target.value })} onKeyDown={e => { if (e.key === 'Enter' && riddleReady) markComplete('samePage'); }} placeholder="A small promise?"/><Button kind="berry" onClick={() => markComplete('samePage') } disabled={!riddleReady}>Unlock the last three keys</Button></div><p>If it becomes a hassle, type <button className="inline-answer" onClick={recoverRiddle}>promise</button>. Trust and silence count too.</p></section>}
      {hintBox(['It is something two people make to each other.', 'It can be kept, made, or broken.', 'Promise is the intended answer.'], 'Skip the riddle and keep the ending')}
      {footer('We solved it together')}
    </>;
  };

  const renderVault = () => {
    const correct = (state.codeInput || '').trim().toUpperCase().replace(/\s/g, '') === 'TOGETHER';
    if (state.vaultOpen || correct) return <div className="vault-open"><span className="vault-burst">✦</span><span className="micro-label">The Distance Protocol is complete</span><h2>You made it <em>together.</em></h2><p>Each of you gets one sentence. What part of tonight would you keep if you could never replay it?</p><div className="final-reward-grid"><button onClick={() => patch(old => ({ ...old, reward: 'Plan the next date' }))}>Plan the next date</button><button onClick={() => patch(old => ({ ...old, reward: 'Pick a film and snack' }))}>Pick a film + snack</button><button onClick={() => patch(old => ({ ...old, reward: 'Make a shared playlist' }))}>Make a shared playlist</button><button onClick={() => patch(old => ({ ...old, reward: 'Write the next chapter' }))}>Write the next chapter</button></div>{state.reward && <p className="reward-picked"><Check size={16} /> Tonight's reward: {state.reward}</p>}</div>;
    return <>
      <div className="vault-locked"><span className="vault-lock"><LockKey size={25} /></span><span className="micro-label">The last little lock</span><h2>Put your earned letters in order.</h2><p>They are already here. Keep them in checkpoint order; no rearranging needed.</p><div className="letter-trail">{keys.map((letter, i) => <span key={`${letter}-${i}`}>{letter}</span>)}</div><form className="vault-code-form" onSubmit={e => { e.preventDefault(); if (correct) patch({ vaultOpen: true }); }}><label htmlFor="vault-code">Passcode</label><div><input id="vault-code" value={state.codeInput || ''} onChange={e => patch({ codeInput: e.target.value })} placeholder="Eight letters" autoComplete="off"/><Button type="submit" disabled={!correct}>Open the vault<ArrowRight size={16} /></Button></div></form><details className="vault-hint"><summary>One last hint</summary><p>Read the letters as one word about what your team did tonight. If you want the reveal now, the code is <button type="button" className="inline-answer" onClick={() => patch({ codeInput: 'TOGETHER', vaultOpen: true })}>TOGETHER</button>.</p></details></div>
      <div className="vault-footer-note"><Heart size={16} /> Finish with one sentence each, then choose a tiny reward to actually do.</div>
    </>;
  };

  const renderCurrent = () => {
    if (stage.id === 'split') return renderSplit();
    if (stage.id === 'message') return renderMessage();
    if (stage.id === 'evidence') return renderEvidence();
    if (stage.id === 'archive') return renderArchive();
    if (stage.id === 'dixit') return renderDixit();
    if (stage.id === 'samePage') return renderSamePage();
    return renderVault();
  };

  const renderSidequests = () => <details className="sidequest-drawer"><summary><span><Shuffle size={18} /> Tiny chaos menu</span><span>Six optional side quests</span></summary><div className="sidequest-list">{SIDEQUESTS.map((quest, index) => {
    const done = (state.sidequests || []).includes(index);
    return <article key={quest.title} className={done ? 'sidequest-done' : ''}><span className="sidequest-number">0{index + 1}</span><div><h4>{quest.title}</h4><p>{quest.text}</p></div><button className="sidequest-toggle" onClick={() => patch(old => ({ ...old, sidequests: done ? old.sidequests.filter(v => v !== index) : [...(old.sidequests || []), index] }))}>{done ? <Check size={17} /> : <ArrowRight size={17} />}</button></article>;
  })}</div></details>;

  const stageItems = STAGES.map((item, index) => ({ ...item, locked: index === 6 && !completed.includes('samePage') }));
  if (!state.started) return <GameFrame title="The Distance Protocol" eyebrow="Game 01 · the long-distance mystery" subtitle="A two-person co-op night. Six little locks, one shared ending." icon={<span className="protocol-emblem">♡</span>} onBack={onBack} theme={theme} onToggleTheme={onToggleTheme} color="rose">
    <RouteBriefing variant="paper" nodes={BRIEFING_STOPS} tagline="A little mystery, made for two."
      number="GAME 01"
      name="The Distance Protocol"
      subtitle="A cozy co-op mystery with clues, stories, and a shared final vault."
      time="75–100 minutes"
      objective="Work through six short chapters together. Each one earns letters or clues for the next. Put your collected letters into the final vault and open the shared ending."
      whatYouNeed="A video call, paper and pen, a phone for sending photos, and a drink. No advance prep."
      selectedRole={state.introRole || 'A'}
      audioSrc="/audio/rules/protocol.mp3"
      onSelectRole={role => patch({ introRole: role })}
      roles={{
        A: { name: 'Him · Player A', summary: 'His clue book and private Split Key word list.' },
        B: { name: 'Her · Player B', summary: 'Her clue book and private Split Key word list.' },
      }}
      steps={[
        { title: 'Choose who reads first.', text: 'His route is Player A and hers is Player B. Open the matching clue book below; keep private pages to yourself and say the clues in your own words.' },
        { title: 'Play the six chapters in order.', text: 'Split Key is a clue-and-guess grid. The Message is a two-layer text puzzle. Field Evidence is a quick object hunt. The Archive is a future-Tuesday writing prompt. Dixit at Distance is a shared image-guessing prompt. Same Page is ten quick choices and a final riddle.' },
        { title: 'Share your answers and keep every key.', text: 'Enter a shared answer when asked. The site saves earned keys and moves you forward. You can pause, switch sides, or return to a chapter.' },
        { title: 'Use a hint whenever you want.', text: 'Hints arrive one at a time. If the puzzle has stopped being fun, choose the rescue button and take the answer. Nothing is lost.' },
      ]}
      rulebook={[
        { title: 'The goal', text: 'Finish the six checkpoints as one team. Record every key letter in the on-screen key ring. Use the complete set to open the final vault. There is no score and no penalty for hints.' },
        { title: 'Private information', text: 'Some parts are intentionally different for Player A and Player B. Open only your own His or Her route, read your page, then paraphrase it. Do not show the other person a private card unless a step asks you to reveal together.' },
        { title: '01 · Split Key', text: 'Take turns giving exactly one word and one number as a clue. Your partner guesses from the shared grid. Use the secret word lists on the His and Her routes. No spelling, rhyming, gestures, or extra hints are needed. Keep going gently; the screen tracks targets found.' },
        { title: '02 · The Message', text: 'Read the short text carefully. The first layer tells you how to extract a second hidden word. Enter the shared result to collect its key.' },
        { title: '03 · Field Evidence', text: 'Each person finds a few nearby objects for the prompts. Show them one at a time, let the other person guess the memory or meaning, then explain. The timer is optional.' },
        { title: '04 · The Archive', text: 'Write 130–180 words about an ordinary Tuesday five years from now. Follow the on-screen constraints. Paste both pieces into the same AI chat with the provided judge prompt. The judge compares concrete details and overlap; it does not rank who cares more.' },
        { title: '05 · Dixit at Distance', text: 'Choose a photo for the same abstract prompt without showing it. Reveal together, guess what the other person saw in it, then tell the real story. There is no correct image.' },
        { title: '06 · Same Page and the Vault', text: 'Answer ten either-or questions at the same time, compare your choices, and solve the final gentle riddle. Bring all the earned letters to the vault.' },
        { title: 'Breaks and side quests', text: 'Side quests are optional. Pause, skip one, or take a snack break whenever either person wants. Keep the parts that feel fun.' },
      ]}
      onStart={role => patch({ started: true, introRole: role, split: { ...state.split, role }, evidence: { ...state.evidence, role }, archive: { ...state.archive, role }, dixit: { ...state.dixit, role }, samePage: { ...state.samePage, role } })}
      onReadRulebook={onLibrary}
      onReadPlayerRoute={role => onPlayerRoute(role === 'A' ? '/his' : '/hers')}
    />
  </GameFrame>;
  return <GameFrame title="The Distance Protocol" eyebrow="Game 01 · the long-distance mystery" subtitle="A two-person co-op night. Six little locks, one shared ending." icon={<span className="protocol-emblem">♡</span>} onBack={onBack} theme={theme} onToggleTheme={onToggleTheme} color="rose" playMode aside={<><PlayerLinks onPlayerRoute={onPlayerRoute} /><button className="library-shortcut" onClick={() => patch({ started: false })}><BookOpenText size={17} /> How to play</button><button className="library-shortcut" onClick={onLibrary}><BookOpenText size={17} /> Source pages</button></>}>
    <div className="protocol-progress"><div><span className="micro-label">Vault letters</span><strong>{keys.length}<small>/8</small></strong></div><div className="earned-letters">{Array.from({ length: 8 }, (_, index) => keys[index] ? <span key={`key-${index}`}>{keys[index]}</span> : <span className="letter-empty" key={`empty-${index}`}>·</span>)}</div><div className="protocol-progress-right"><span><Heart size={15} /> Team progress</span><span>{completed.filter(id => id !== 'vault').length}/6</span></div></div>
    <ChapterMenu items={stageItems} active={stageIndex} completed={completed} onSelect={goStage}/>
    <section className="stage-main"><div className="stage-heading"><div><span className="micro-label">{stage.id === 'vault' ? 'Final unlock' : `${stage.time} · one checkpoint`}</span><h2>{stage.title}</h2></div>{stage.id !== 'vault' && <div className="stage-key-pill">Key <b>{stage.letter}</b></div>}</div>{renderCurrent()}</section>
    {stage.id === 'vault' ? null : renderSidequests()}
    <p className="save-note"><Check size={14} /> Your progress saves in this browser automatically.</p>
  </GameFrame>;
}
