import { useState } from 'react';
import { ArrowRight, BookOpenText, CaretDown, Check, ClipboardText, ClockClockwise, Fingerprint, Heart, Lightbulb, LockKey, MagnifyingGlass, NotePencil, Play, Question, Sparkle, Timer } from '@phosphor-icons/react';
import { Button, GameFrame, HintBox } from '../components.jsx';
import RouteBriefing from '../RouteBriefing.jsx';

const EVIDENCE = [
  { id: 'A', title: 'The tea tray', type: 'Physical evidence', text: 'Two cups were on the desk. One has a lipstick trace matching Nora’s shade; the other has no trace. A spoon is damp. No fingerprints are recoverable from it.', thought: 'Interesting, but it does not place someone inside the locked library.' },
  { id: 'B', title: 'The electronic key log', type: 'The clock is wrong', text: 'The library key is checked out at 10:36 PM and returned at 11:02 PM. The security system clock runs exactly 29 minutes fast.', thought: 'Take 29 minutes off both recorded times to get the real checkout window.' },
  { id: 'C', title: 'The 14-second audio glitch', type: 'A strange sound', text: 'Three faint knocks sound during the 10:31 PM livestream glitch. Their pattern is 1–2–1. The old library radiator makes the same knocks when its heating cycle changes.', thought: 'A good spooky sound. A boring radiator. This is a red herring.' },
  { id: 'D', title: 'Adrian’s torn note', type: 'A quiet warning', text: 'A torn note in Adrian’s pocket says: “If the room is already open, look for the person who knew the clock was wrong.”', thought: 'That points toward someone with a reason to understand the security system.' },
  { id: 'E', title: 'Priya’s upstairs call', type: 'A suspicious gap', text: 'Priya’s internet call ran from 10:24 to 10:46 PM, but only audio was transmitted. There is a 17-second mute at 10:37 PM.', thought: 'Odd, but the case gives no evidence that the mute put her in the library.' },
  { id: 'F', title: 'The sale contract', type: 'A second timeline', text: 'The contract has Mira’s initials, but the printer log says it printed at 10:54 PM—after she says she left at 10:38 PM.', thought: 'Mira lied about leaving time. That contradiction alone does not prove she killed Adrian.' },
  { id: 'G', title: 'The “water” story', type: 'An impossible visit', text: 'The kitchen camera shows no one entering from 10:30–10:55 PM. Nora’s video call continues normally in that period.', thought: 'The downstairs trip did not happen as described, but the clue does not connect Nora to the library lock.' },
];
const QUESTIONS = [
  'Where did you expect Adrian to be at 10:45 PM?',
  'Can you explain someone else’s timeline?',
  'What detail matters only if the clock was wrong?',
  'What are you hoping we misunderstand?',
];
const INITIAL = { started: false, introRole: 'A', opened: [], discussed: [], timelineConverted: false, clockOffset: '29', killer: '', timeline: '', decisive: '', redHerring: '', hints: 0, accused: false, solved: false, question: '', questionSuspect: 'Elias Rook', questionLog: [], reviewCopied: false };
const PROMPT = 'You are a forensic puzzle editor. Here is our solved case, followed by the evidence. Grade our reasoning 0-100. Do not just tell us the answer. Check whether our accusation explains the clock drift, the key log, the note, the contract, and the red herrings. Flag any clue that is underdetermined or unfair.';
const HINTS = ['Start with the electronic key log. Is its time trustworthy?', 'Subtract 29 minutes from both logged times. Compare that real interval with Elias’s claimed 10:15 departure.', 'Elias knew the lock system, had the key, and fits Adrian’s note. The clock-adjusted key window is the decisive clue.'];
const BRIEFING_STOPS = [
  { title: 'Timeline', short: 'Build the night', preview: 'Lay six timestamps in order. One clock is telling the wrong story.', icon: <ClockClockwise size={18} />, position: [46, 65] },
  { title: 'Suspects', short: 'Five accounts', preview: 'Compare five private alibis and look for the detail that cannot fit.', icon: <Fingerprint size={18} />, position: [56, 36] },
  { title: 'Evidence', short: 'Seven files', preview: 'Open evidence cards, mark them discussed, and pin a theory together.', icon: <MagnifyingGlass size={18} />, position: [68, 63] },
  { title: 'Clock test', short: '29-minute drift', preview: 'Correct the key log and see who could have entered the library.', icon: <Timer size={18} />, position: [78, 34] },
  { title: 'Accusation', short: 'Name the killer', preview: 'Choose a suspect, the clock trick, one clincher, and one red herring.', icon: <LockKey size={18} />, position: [88, 62] },
];

function normalize(s) { return (s || '').trim().toLowerCase(); }
function caseClockTime(minutes) {
  const value = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(value / 60);
  return `${hour % 12 || 12}:${String(value % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}
function SourceRoutes({ onPlayerRoute, onLibrary, onRules }) { return <div className="route-shortcuts"><button onClick={() => onPlayerRoute('/his')}>His clues · A</button><button onClick={() => onPlayerRoute('/hers')}>Her clues · B</button>{onRules && <button onClick={onRules}>How to play</button>}<button onClick={onLibrary}>Source pages</button></div>; }

function EvidenceMark({ id }) {
  return <svg viewBox="0 0 100 80" aria-hidden="true" className={`evidence-mark mark-${id}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    {id === 'A' && <><path d="M28 26h37l-4 29H32z"/><path d="M65 32h7a8 8 0 0 1 0 16h-9M35 61h36M36 34h22"/><path d="M45 20c-3-4 3-5 0-9m10 9c-3-4 3-5 0-9"/></>}
    {id === 'B' && <><circle cx="27" cy="40" r="13"/><circle cx="27" cy="40" r="4"/><path d="m40 40 37 0 0 9 9 0 0-9-7 0 0-8-9 0"/><path d="M53 40v8"/></>}
    {id === 'C' && <><path d="M17 41h10l8-16 12 32 10-25 9 18 7-9h10"/><circle cx="50" cy="41" r="34" strokeDasharray="2 7"/></>}
    {id === 'D' && <><path d="M29 13h30l14 14v42H29z"/><path d="M59 13v15h14M39 39h23M39 48h19"/><path d="m33 63 9-7 7 6 8-8 16 9"/></>}
    {id === 'E' && <><path d="M29 19c-5 3-8 9-6 16 6 18 19 31 37 36 8 2 15-2 18-8l-13-11-9 8c-8-4-14-10-18-18l8-9z"/><path d="M61 17c10 2 17 9 19 19M59 26c5 1 9 5 10 10"/></>}
    {id === 'F' && <><path d="M23 13h36l17 17v38H23z"/><path d="M59 13v18h17M33 41h31M33 50h23"/><path d="m35 60 7-5 7 4 10-7"/></>}
    {id === 'G' && <><path d="M50 14c-7 13-22 27-22 41a22 22 0 0 0 44 0c0-14-15-28-22-41z"/><path d="M39 57c1 7 6 11 12 12"/><path d="M65 17h15M72 10v15"/></>}
  </svg>;
}

function ChoiceMenu({ value, placeholder, options, onChange, icon }) {
  const selected = options.find(option => option.value === value);
  return <details className="case-choice-menu">
    <summary><span className="case-choice-icon">{icon}</span><span className={selected ? 'has-choice' : ''}>{selected?.label || placeholder}</span><CaretDown size={16} /></summary>
    <div className="case-choice-options" role="listbox">{options.map((option, index) => <button type="button" role="option" aria-selected={value === option.value} className={value === option.value ? 'is-selected' : ''} key={option.value || option.label} onClick={event => { onChange(option.value); event.currentTarget.closest('details').open = false; }}><i>{String(index + 1).padStart(2, '0')}</i><span>{option.label}</span>{value === option.value && <Check size={16} />}</button>)}</div>
  </details>;
}

function ChoiceTiles({ label, value, options, onChange, icon }) {
  return <fieldset className="case-choice-set"><legend>{label}</legend><div className="case-choice-tiles">{options.map((option, index) => <button type="button" key={option.value} className={value === option.value ? 'is-selected' : ''} aria-pressed={value === option.value} onClick={() => onChange(option.value)}><i>{String(index + 1).padStart(2, '0')}</i><span>{icon}</span><b>{option.label}</b>{value === option.value && <Check size={15} className="choice-check" />}</button>)}</div></fieldset>;
}

export default function Case({ data, update, onBack, onLibrary, onPlayerRoute, theme, onToggleTheme }) {
  const state = { ...INITIAL, ...(data || {}) };
  const [ending, setEnding] = useState(false);
  const patch = patcher => update(previous => { const old = { ...INITIAL, ...(previous || {}) }; return typeof patcher === 'function' ? patcher(old) : { ...old, ...patcher }; });
  const adjusted = (Number(state.clockOffset) || 0) === 29;
  const clockOffset = Number(state.clockOffset) || 0;
  const correctedCheckout = caseClockTime(22 * 60 + 36 - clockOffset);
  const correctedReturn = caseClockTime(23 * 60 + 2 - clockOffset);
  const accusationCorrect = normalize(state.killer) === 'elias rook'
    && state.timeline === '29-fast'
    && state.decisive === 'log-note-lock'
    && Boolean(state.redHerring);
  const convert = () => patch({ timelineConverted: true, opened: state.opened.includes('B') ? state.opened : [...state.opened, 'B'] });
  const reveal = clue => patch(old => ({ opened: [...new Set([...old.opened, clue.id])] }));
  const solution = () => { patch({ killer: 'Elias Rook', timeline: '29-fast', decisive: 'log-note-lock', redHerring: 'clock-and-radiator', accused: true, solved: true }); setEnding(true); };
  const askQuestion = () => { if (!state.question.trim()) return; patch(old => ({ questionLog: [...(old.questionLog || []), { suspect: old.questionSuspect, question: old.question.trim() }], question: '' })); };
  const copyReview = async () => { try { await navigator.clipboard.writeText(PROMPT); patch({ reviewCopied: true }); window.setTimeout(() => patch({ reviewCopied: false }), 2300); } catch { patch({ reviewCopied: false }); } };
  if (state.solved || ending) return <GameFrame title="The 11:47 Case" eyebrow="Game 02 · a two-person murder mystery" subtitle="Case closed. The timeline finally makes sense." icon={<span className="case-emblem">11:47</span>} onBack={onBack} theme={theme} onToggleTheme={onToggleTheme} color="lilac" aside={<SourceRoutes onPlayerRoute={onPlayerRoute} onLibrary={onLibrary} />}>
    <section className="case-ending"><span className="case-end-seal"><Check size={27} /></span><span className="micro-label">Joint accusation · correct</span><h2>The killer was <em>Elias Rook.</em></h2><p>The key log was the trap. The system ran 29 minutes fast; corrected to 10:07–10:33, the log puts the key with the lock specialist after his claimed departure. Adrian’s note tells you who would know about the clock.</p><div className="case-answer-summary"><span>THE REAL KEY WINDOW <b>10:07–10:33 PM</b></span><span>THE DECOY SOUND <b>The old radiator</b></span><span>THE SECOND LIE <b>Mira’s contract time</b></span></div><div className="ai-review-box"><div><span className="micro-label">Optional · let the AI review your reasoning</span><p>Copy the forensic-puzzle-editor prompt into your shared conversation after you paste your accusation and the evidence.</p></div><Button kind="quiet" onClick={copyReview}><ClipboardText size={15} />{state.reviewCopied ? 'Copied' : 'Copy prompt'}</Button><details><summary>Read the prompt</summary><p>{PROMPT}</p></details></div><Button kind="soft" onClick={() => { patch({ ...INITIAL, started: true }); setEnding(false); }}>Reopen the evidence board</Button></section>
  </GameFrame>;

  if (!state.started) return <GameFrame title="The 11:47 Case" eyebrow="Game 02 · a two-person murder mystery" subtitle="Five suspects, seven clues, and one broken clock." icon={<span className="case-emblem">11:47</span>} onBack={onBack} theme={theme} onToggleTheme={onToggleTheme} color="lilac">
    <RouteBriefing variant="case" nodes={BRIEFING_STOPS} tagline="Five suspects. One wrong clock."
      number="GAME 02"
      name="The 11:47 Case"
      subtitle="A gentle locked-room murder mystery. Solve the case together, then read the explanation."
      time="25–40 minutes"
      objective="Work out who killed curator Adrian Vale, how the timeline was bent, and which clues are red herrings. You are co-investigators, never opponents."
      whatYouNeed="This page, a pen and paper if you like, and someone to compare theories with. No outside research."
      selectedRole={state.introRole || 'A'}
      audioSrc="/audio/rules/case.mp3"
      onSelectRole={role => patch({ introRole: role })}
      roles={{
        A: { name: 'Him · Player A', summary: 'His private notes on Mira, Leon, and Priya.' },
        B: { name: 'Her · Player B', summary: 'Her private notes on Elias and Nora.' },
      }}
      steps={[
        { title: 'Pick a side and read your suspect cards.', text: 'Player A reads His clues; Player B reads Her clues. Take turns paraphrasing your suspects without showing the private pages.' },
        { title: 'Open the six event times.', text: 'Read the timeline together. The game asks you to connect times; you do not need to know anything about real forensics.' },
        { title: 'Inspect all seven evidence cards.', text: 'Tap a card, read it aloud or listen to the screen, then mark it discussed. The key-log helper lets you test a clock correction.' },
        { title: 'Make one joint accusation.', text: 'Agree on the killer, the clock story, the decisive clue, and one red herring. A wrong theory changes nothing; use hints and revise it.' },
      ]}
      rulebook={[
        { title: 'Your mission', text: 'Identify the killer, explain how the timeline was manipulated, and choose the clue that makes your answer hold together. The mystery is designed for careful conversation, not forensic knowledge.' },
        { title: 'Choose separate suspect cards', text: 'Player A reads Mira Sen, Leon Vale, and Priya Khan on His route. Player B reads Elias Rook and Nora Venn on Her route. Summarize your cards to each other. The evidence board is shared.' },
        { title: 'Build the timeline', text: 'Use the timeline button to read the important events. The 11:47 time is when the body was found, not necessarily the time of death.' },
        { title: 'Read and discuss the evidence', text: 'Open every evidence card. A clue can expose a lie without proving murder. The old radiator knocks and the suspicious call gaps are there to tempt an overconfident theory.' },
        { title: 'Correct the key log', text: 'The electronic key system has a clock-offset helper. Enter the number supported by the case, then compare the corrected window with each suspect’s account.' },
        { title: 'Accuse together', text: 'Choose one suspect, one timeline explanation, one decisive clue, and one red herring. You may submit a theory, see what does not fit, and change it. Progress never resets.' },
        { title: 'Hints and solution', text: 'Open one of three gentle hints at a time. If you are ready to finish, reveal the solution. The host guide and final source page contain the spoiler, so read them only when you both want it.' },
      ]}
      onStart={role => patch({ started: true, introRole: role })}
      onReadRulebook={onLibrary}
      onReadPlayerRoute={role => onPlayerRoute(role === 'A' ? '/his' : '/hers')}
    />
  </GameFrame>;

  return <GameFrame title="The 11:47 Case" eyebrow="Game 02 · a two-person murder mystery" subtitle="Five suspects, seven clues, and one broken clock." icon={<span className="case-emblem">11:47</span>} onBack={onBack} theme={theme} onToggleTheme={onToggleTheme} color="lilac" playMode aside={<SourceRoutes onPlayerRoute={onPlayerRoute} onLibrary={onLibrary} onRules={() => patch({ started: false })} />}>
    <section className="case-brief"><div><span className="micro-label">A locked-room mystery · 20–30 minutes</span><h2>Someone bent the timeline.</h2><p>Adrian was found at 11:47. The security clock is 29 minutes fast.</p></div><div className="case-time-strip"><span>10:31</span><i /><span>10:42</span><i /><span>11:47</span><small>glitch · tea · found</small></div></section>
    <section className="case-timeline-panel"><div className="case-section-head"><div><span className="micro-label">The live event</span><h2>Build the night’s timeline.</h2></div><button type="button" className="case-expand" onClick={() => patch({ opened: state.opened.includes('timeline') ? state.opened.filter(v => v !== 'timeline') : [...state.opened, 'timeline'] })}>{state.opened.includes('timeline') ? 'Close timeline' : 'Open timeline'} <ArrowRight size={14} /></button></div>{state.opened.includes('timeline') && <div className="event-sequence"><p><b>9:58 PM</b> Livestream begins · Adrian appears in the library.</p><p><b>10:18 PM</b> Private sale of a disputed painting is announced.</p><p><b>10:31 PM</b> A 14-second audio glitch interrupts the stream.</p><p><b>10:42 PM</b> Adrian says he is making tea.</p><p><b>11:01 PM</b> The stream ends unexpectedly.</p><p><b>11:47 PM</b> Adrian is found. The library key is on the inside desk; a second copy is missing.</p></div>}</section>
    <section className="case-evidence-section"><div className="case-section-head"><div><span className="micro-label">Evidence wall · select a clue</span><h2>Pin what feels strange.</h2></div><span className="case-count"><MagnifyingGlass size={15} /> {state.opened.filter(x => x.length === 1).length}/7 inspected</span></div><div className="case-evidence-grid">{EVIDENCE.map(clue => { const open = state.opened.includes(clue.id); const discussed = state.discussed.includes(clue.id); return <article className={`case-evidence-card ${open ? 'case-evidence-open' : ''} ${discussed ? 'case-evidence-discussed' : ''}`} key={clue.id}><button type="button" className="case-evidence-trigger" aria-expanded={open} onClick={() => reveal(clue)}><span className="case-evidence-art"><EvidenceMark id={clue.id}/><i>{clue.id}</i></span><span className="case-evidence-copy"><small>{clue.type}</small><b>{clue.title}</b><em>{open ? 'Inspect again' : 'Turn over'} <ArrowRight size={13} /></em></span><span className="case-pin" aria-hidden="true">{discussed ? <Check size={14}/> : <span/>}</span></button>{open && <div className="case-evidence-detail"><p>{clue.text}</p><aside><Lightbulb size={14} />{clue.thought}</aside><button type="button" className="evidence-discuss-button" onClick={() => patch(old => ({ discussed: old.discussed.includes(clue.id) ? old.discussed.filter(v => v !== clue.id) : [...old.discussed, clue.id] }))}>{discussed ? <><Check size={14} /> Discussed together</> : <>Pin to our theory <ArrowRight size={13} /></>}</button></div>}</article>; })}</div></section>
    <details className="interrogation-deck"><summary><span><Question size={17} /> The suspect room</span><span>Tap a name to question</span></summary><div className="interrogation-body"><p>Pick a suspect and a question. Make up their answer together.</p><div className="ask-form"><ChoiceMenu value={state.questionSuspect} placeholder="Choose a suspect" icon={<Fingerprint size={17}/>} options={['Mira Sen', 'Leon Vale', 'Priya Khan', 'Elias Rook', 'Nora Venn'].map(name => ({ value: name, label: name }))} onChange={questionSuspect => patch({ questionSuspect })}/><ChoiceMenu value={state.question} placeholder="Choose a question" icon={<Question size={17}/>} options={QUESTIONS.map(question => ({ value: question, label: question }))} onChange={question => patch({ question })}/><button type="button" onClick={askQuestion} disabled={!state.question.trim()}>Ask & log <Play size={13} /></button></div>{state.questionLog?.length > 0 && <div className="question-log">{state.questionLog.map((line, i) => <p key={i}><b>{line.suspect}:</b> “{line.question}”</p>)}</div>}</div></details>
    <details className="key-adjuster"><summary><span><ClockClockwise size={17} /> Test the clock</span><span>Slide the log back to real time</span></summary><div className="key-adjuster-body"><div className="clock-test-copy"><span className="micro-label">Security system clock</span><p>How far ahead is it?</p><div className="clock-dial"><button type="button" aria-label="Subtract one minute" onClick={() => patch({ clockOffset: String(Math.max(0, (Number(state.clockOffset) || 0) - 1)) })}>−</button><div><strong>{state.clockOffset || 0}</strong><span>MIN FAST</span></div><button type="button" aria-label="Add one minute" onClick={() => patch({ clockOffset: String(Math.min(60, (Number(state.clockOffset) || 0) + 1)) })}>+</button></div><input className="clock-range" aria-label="Clock offset in minutes" type="range" min="0" max="60" value={Math.min(60, Number(state.clockOffset) || 0)} onChange={e => patch({ clockOffset: e.target.value })}/><p>Log reads 10:36 PM out → 11:02 PM in. Slide to test the correction.</p></div><div className="clock-transfer" aria-live="polite"><div className="clock-transfer-times"><span><small>LOGGED OUT</small><b>10:36 PM</b></span><ArrowRight size={16}/><span><small>LOGGED IN</small><b>11:02 PM</b></span></div><div className="clock-transfer-shift"><span>TAKE OFF <b>{clockOffset} MIN</b></span><ArrowRight size={17}/><span>ACTUAL WINDOW <b>{correctedCheckout} — {correctedReturn}</b></span></div><p>The same correction applies to both events.</p></div><Button kind="soft" onClick={convert}>{state.timelineConverted ? <Check size={15} /> : <ClockClockwise size={15} />}{state.timelineConverted ? 'Key log corrected' : 'Correct the key log'}</Button></div></details>
    <section className="case-accusation"><div className="panel-heading"><span className="mini-icon lilac-icon"><Fingerprint size={18} /></span><div><h3>Pin your theory</h3><p>Choose the suspect, clock trick, clincher, and one red herring.</p></div></div><div className="case-accusation-fields"><ChoiceTiles label="Who killed Adrian?" value={state.killer} onChange={killer => patch({ killer })} icon={<Fingerprint size={17}/>} options={['Mira Sen', 'Leon Vale', 'Priya Khan', 'Elias Rook', 'Nora Venn'].map(name => ({ value: name, label: name }))}/><ChoiceTiles label="What bent the timeline?" value={state.timeline} onChange={timeline => patch({ timeline })} icon={<ClockClockwise size={17}/>} options={[{ value: '29-fast', label: 'Clock ran 29 minutes fast' }, { value: '29-slow', label: 'Clock ran 29 minutes slow' }, { value: 'glitch', label: 'The livestream glitch' }]}/><ChoiceTiles label="Which clue clinches it?" value={state.decisive} onChange={decisive => patch({ decisive })} icon={<LockKey size={17}/>} options={[{ value: 'log-note-lock', label: 'Key log + torn note + lock access' }, { value: 'tea-tray', label: 'The cups and spoon' }, { value: 'audio-glitch', label: 'The 1–2–1 knocks' }]}/><ChoiceTiles label="Pick one red herring" value={state.redHerring} onChange={redHerring => patch({ redHerring })} icon={<MagnifyingGlass size={17}/>} options={[{ value: 'clock-and-radiator', label: 'The radiator knocks' }, { value: 'radiator', label: 'The strange heating cycle' }, { value: 'mute', label: 'Priya’s call mute' }, { value: 'mira', label: 'Mira’s printer timestamp' }]}/></div>{state.accused && !accusationCorrect && <p className="case-incorrect"><Heart size={14} /> Not there yet. Nothing resets. Check the corrected timestamp, then compare Elias’s account.</p>}<Button kind="berry" onClick={() => { if (accusationCorrect) { patch({ accused: true, solved: true }); setEnding(true); } else patch({ accused: true }); }} disabled={!state.killer || !state.timeline || !state.decisive || !state.redHerring}>Share our theory <ArrowRight size={16} /></Button></section>
    <HintBox hints={HINTS} index={state.hints} onReveal={() => patch({ hints: Math.min(3, state.hints + 1) })} recovery onRecovery={solution} recoveryLabel="Reveal the gentle solution" />
    <div className="case-soft-note"><Heart size={15} /> The only required deduction is the corrected key log. The other details are there for atmosphere and conversation.</div>
    <p className="save-note"><Check size={14} /> Your open evidence and theory save in this browser. No fail state.</p>
  </GameFrame>;
}
