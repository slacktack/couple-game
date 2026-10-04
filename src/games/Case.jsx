import { useState } from 'react';
import { ArrowRight, BookOpenText, Check, ClipboardText, ClockClockwise, Fingerprint, Heart, Lightbulb, LockKey, MagnifyingGlass, NotePencil, Play, Question, Sparkle, Timer } from '@phosphor-icons/react';
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
function SourceRoutes({ onPlayerRoute, onLibrary, onRules }) { return <div className="route-shortcuts"><button onClick={() => onPlayerRoute('/his')}>His clues · A</button><button onClick={() => onPlayerRoute('/hers')}>Her clues · B</button>{onRules && <button onClick={onRules}>How to play</button>}<button onClick={onLibrary}>Source pages</button></div>; }

export default function Case({ data, update, onBack, onLibrary, onPlayerRoute }) {
  const state = { ...INITIAL, ...(data || {}) };
  const [ending, setEnding] = useState(false);
  const patch = patcher => update(previous => { const old = { ...INITIAL, ...(previous || {}) }; return typeof patcher === 'function' ? patcher(old) : { ...old, ...patcher }; });
  const adjusted = (Number(state.clockOffset) || 0) === 29;
  const accusationCorrect = normalize(state.killer) === 'elias rook'
    && state.timeline === '29-fast'
    && state.decisive === 'log-note-lock'
    && Boolean(state.redHerring);
  const convert = () => patch({ timelineConverted: true, opened: state.opened.includes('B') ? state.opened : [...state.opened, 'B'] });
  const reveal = clue => patch(old => ({ opened: [...new Set([...old.opened, clue.id])] }));
  const solution = () => { patch({ killer: 'Elias Rook', timeline: '29-fast', decisive: 'log-note-lock', redHerring: 'clock-and-radiator', accused: true, solved: true }); setEnding(true); };
  const askQuestion = () => { if (!state.question.trim()) return; patch(old => ({ questionLog: [...(old.questionLog || []), { suspect: old.questionSuspect, question: old.question.trim() }], question: '' })); };
  const copyReview = async () => { try { await navigator.clipboard.writeText(PROMPT); patch({ reviewCopied: true }); window.setTimeout(() => patch({ reviewCopied: false }), 2300); } catch { patch({ reviewCopied: false }); } };
  if (state.solved || ending) return <GameFrame title="The 11:47 Case" eyebrow="Game 02 · a two-person murder mystery" subtitle="Case closed. The timeline finally makes sense." icon={<span className="case-emblem">11:47</span>} onBack={onBack} color="lilac" aside={<SourceRoutes onPlayerRoute={onPlayerRoute} onLibrary={onLibrary} />}>
    <section className="case-ending"><span className="case-end-seal"><Check size={27} /></span><span className="micro-label">Joint accusation · correct</span><h2>The killer was <em>Elias Rook.</em></h2><p>The key log was the trap. The system ran 29 minutes fast; corrected to 10:07–10:33, the log puts the key with the lock specialist after his claimed departure. Adrian’s note tells you who would know about the clock.</p><div className="case-answer-summary"><span>THE REAL KEY WINDOW <b>10:07–10:33 PM</b></span><span>THE DECOY SOUND <b>The old radiator</b></span><span>THE SECOND LIE <b>Mira’s contract time</b></span></div><div className="ai-review-box"><div><span className="micro-label">Optional · let the AI review your reasoning</span><p>Copy the forensic-puzzle-editor prompt into your shared conversation after you paste your accusation and the evidence.</p></div><Button kind="quiet" onClick={copyReview}><ClipboardText size={15} />{state.reviewCopied ? 'Copied' : 'Copy prompt'}</Button><details><summary>Read the prompt</summary><p>{PROMPT}</p></details></div><Button kind="soft" onClick={() => { patch(INITIAL); setEnding(false); }}>Reopen the evidence board</Button></section>
  </GameFrame>;

  if (!state.started) return <GameFrame title="The 11:47 Case" eyebrow="Game 02 · a two-person murder mystery" subtitle="Five suspects, seven clues, and one broken clock." icon={<span className="case-emblem">11:47</span>} onBack={onBack} color="lilac">
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
        A: { name: 'Him · Player A', summary: 'Start with the Mira, Leon, and Priya suspect notes in his clue book.' },
        B: { name: 'Her · Player B', summary: 'Start with the Elias and Nora suspect notes in her clue book.' },
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

  return <GameFrame title="The 11:47 Case" eyebrow="Game 02 · a two-person murder mystery" subtitle="Five suspects, seven clues, and one broken clock." icon={<span className="case-emblem">11:47</span>} onBack={onBack} color="lilac" aside={<SourceRoutes onPlayerRoute={onPlayerRoute} onLibrary={onLibrary} onRules={() => patch({ started: false })} />}>
    <section className="case-brief"><div><span className="micro-label">A locked-room mystery · 20–30 minutes</span><h2>Someone bent the timeline.</h2><p>Curator Adrian Vale was found dead in his private library at 11:47 PM. The room was locked, one key was missing, and every suspect has something to hide. You are co-investigators—not competitors.</p></div><div className="case-time-strip"><span>10:31</span><i /><span>10:42</span><i /><span>11:47</span><small>glitch · tea · found</small></div></section>
    <section className="case-timeline-panel"><div className="case-section-head"><div><span className="micro-label">The live event</span><h2>Build the night’s timeline.</h2></div><button className="case-expand" onClick={() => patch({ opened: state.opened.includes('timeline') ? state.opened.filter(v => v !== 'timeline') : [...state.opened, 'timeline'] })}>{state.opened.includes('timeline') ? 'Close timeline' : 'Open timeline'} <ArrowRight size={14} /></button></div>{state.opened.includes('timeline') && <div className="event-sequence"><p><b>9:58 PM</b> Livestream begins · Adrian appears in the library.</p><p><b>10:18 PM</b> Private sale of a disputed painting is announced.</p><p><b>10:31 PM</b> A 14-second audio glitch interrupts the stream.</p><p><b>10:42 PM</b> Adrian says he is making tea.</p><p><b>11:01 PM</b> The stream ends unexpectedly.</p><p><b>11:47 PM</b> Adrian is found. The library key is on the inside desk; a second copy is missing.</p></div>}</section>
    <section className="case-evidence-section"><div className="case-section-head"><div><span className="micro-label">Click any card to inspect</span><h2>Lay out your evidence.</h2></div><span className="case-count"><MagnifyingGlass size={15} /> {state.opened.filter(x => x.length === 1).length}/7 open</span></div><div className="case-evidence-grid">{EVIDENCE.map((clue, index) => { const open = state.opened.includes(clue.id); const discussed = state.discussed.includes(clue.id); return <article className={`case-evidence-card ${open ? 'case-evidence-open' : ''} ${discussed ? 'case-evidence-discussed' : ''}`} key={clue.id}><button className="case-evidence-trigger" aria-expanded={open} onClick={() => reveal(clue)}><span><i>{clue.id}</i><small>{clue.type}</small></span><b>{clue.title}</b><em>{open ? 'Read it again' : 'Read evidence'} <ArrowRight size={13} /></em></button>{open && <div className="case-evidence-detail"><p>{clue.text}</p><aside><Lightbulb size={14} />{clue.thought}</aside><button className="evidence-discuss-button" onClick={() => patch(old => ({ discussed: old.discussed.includes(clue.id) ? old.discussed.filter(v => v !== clue.id) : [...old.discussed, clue.id] }))}>{discussed ? <><Check size={14} /> Discussed together</> : <>Add to our discussion <ArrowRight size={13} /></>}</button></div>}</article>; })}</div></section>
    <details className="interrogation-deck"><summary><span><Question size={17} /> A little interrogation deck</span><span>Ask one question at a time</span></summary><div className="interrogation-body"><p>Make up an answer together, or ask the other player what they think the suspect would say. The aim is to help you notice a detail, not to role-play perfectly.</p><div className="ask-form"><select value={state.questionSuspect} onChange={e => patch({ questionSuspect: e.target.value })}>{['Mira Sen', 'Leon Vale', 'Priya Khan', 'Elias Rook', 'Nora Venn'].map(suspect => <option key={suspect}>{suspect}</option>)}</select><select value={state.question} onChange={e => patch({ question: e.target.value })}><option value="">Choose a question</option>{QUESTIONS.map(q => <option key={q}>{q}</option>)}</select><button onClick={askQuestion} disabled={!state.question.trim()}>Ask & log <Play size={13} /></button></div>{state.questionLog?.length > 0 && <div className="question-log">{state.questionLog.map((line, i) => <p key={i}><b>{line.suspect}:</b> “{line.question}”</p>)}</div>}</div></details>
    <details className="key-adjuster"><summary><span><ClockClockwise size={17} /> Check the security-clock offset</span><span>A tiny time-math helper</span></summary><div className="key-adjuster-body"><div><label>Clock runs fast by <span><input type="number" value={state.clockOffset} onChange={e => patch({ clockOffset: e.target.value })} /> minutes</span></label><p>Log says 10:36 PM out → 11:02 PM in. Subtract the offset from each time.</p></div><Button kind="soft" onClick={convert}><ClockClockwise size={15} /> Correct the key log</Button>{state.timelineConverted && <div className="corrected-times"><span>REAL CHECKOUT <b>{adjusted ? '10:07 PM' : 'Recheck your offset'}</b></span><ArrowRight size={18} /><span>REAL RETURN <b>{adjusted ? '10:33 PM' : 'Recheck your offset'}</b></span></div>}</div></details>
    <section className="case-accusation"><div className="panel-heading"><span className="mini-icon lilac-icon"><Fingerprint size={18} /></span><div><h3>Make one joint accusation</h3><p>Choose who, how the timeline was bent, the clue that clinches it, and one red herring.</p></div></div><div className="case-accusation-fields"><label><span>Who killed Adrian?</span><select value={state.killer} onChange={e => patch({ killer: e.target.value })}><option value="">Choose a suspect</option>{['Mira Sen', 'Leon Vale', 'Priya Khan', 'Elias Rook', 'Nora Venn'].map(s => <option key={s}>{s}</option>)}</select></label><label><span>What changed the timeline?</span><select value={state.timeline} onChange={e => patch({ timeline: e.target.value })}><option value="">Choose the clock story</option><option value="29-fast">The key system clock was 29 minutes fast; subtract 29 minutes.</option><option value="29-slow">The clock was 29 minutes slow; add 29 minutes.</option><option value="glitch">The livestream glitch changed the key log.</option></select></label><label><span>What is the decisive clue?</span><select value={state.decisive} onChange={e => patch({ decisive: e.target.value })}><option value="">Choose the clincher</option><option value="log-note-lock">The corrected key log + Adrian’s note + Elias’s lock access</option><option value="tea-tray">The cups and spoon on the desk</option><option value="audio-glitch">The 1–2–1 knock pattern</option></select></label><label><span>What was a red herring?</span><select value={state.redHerring} onChange={e => patch({ redHerring: e.target.value })}><option value="">Choose a harmless oddity</option><option value="clock-and-radiator">The radiator knocks; the other timeline gaps need more context.</option><option value="radiator">The knocks are from the old radiator, not a signal.</option><option value="mute">Priya’s brief mute, even though it proves nothing about the library.</option><option value="mira">Mira lied about the printing time, which does not prove she committed murder.</option></select></label></div>{state.accused && !accusationCorrect && <p className="case-incorrect"><Heart size={14} /> Not there yet. Nothing resets and there is no penalty—look at the timestamp conversion, then compare Elias’s statement.</p>}<Button kind="berry" onClick={() => { if (accusationCorrect) { patch({ accused: true, solved: true }); setEnding(true); } else patch({ accused: true }); }} disabled={!state.killer || !state.timeline || !state.decisive || !state.redHerring}>Share our theory <ArrowRight size={16} /></Button></section>
    <HintBox hints={HINTS} index={state.hints} onReveal={() => patch({ hints: Math.min(3, state.hints + 1) })} recovery onRecovery={solution} recoveryLabel="Reveal the gentle solution" />
    <div className="case-soft-note"><Heart size={15} /> The only required deduction is the corrected key log. The other details are there for atmosphere and conversation.</div>
    <p className="save-note"><Check size={14} /> Your open evidence and theory save in this browser. No fail state.</p>
  </GameFrame>;
}
