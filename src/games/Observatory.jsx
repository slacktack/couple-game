import { useState } from 'react';
import { ArrowRight, Check, Compass, Eye, EyeSlash, Heart, Lightbulb, LockKey, MoonStars, Sparkle, Star, Timer } from '@phosphor-icons/react';
import { Button, GameFrame, HintBox } from '../components.jsx';
import RouteBriefing from '../RouteBriefing.jsx';

const LOCKS = [
  { title: 'The constellation grid', label: 'LOCK 01', answer: '566', intro: 'Count the letters in the star names. Keep the counts for the constellations with exactly one repeated letter, in the order shown.', cardA: 'A · Your star list: ORION · LYRA · CYGNUS', cardB: 'B · Your star list: DRACO · TAURUS · GEMINI', input: 'Three digits', hints: ['Look for the constellation name with one letter appearing twice.', 'The relevant names are ORION, TAURUS, and GEMINI. Count their letters.', 'Those counts, in that order, are 5 · 6 · 6.'] },
  { title: 'Mirror transmission', label: 'LOCK 02', answer: 'ORBIT', accepted: ['LOCK IN THE ORBIT', 'ORBIT'], intro: 'The terminal prints TIBRO EHT NI KCOL. Beneath it: “The signal was reflected before it arrived.” Reverse the message and restore its spaces.', cardA: 'A · Read this terminal slowly: T I B R O   E H T   N I   K C O L', cardB: 'B · The paper says: “The signal was reflected before it arrived.”', input: 'The hidden keyword', hints: ['Read the characters from right to left.', 'Reverse the letters, then put spaces back into the phrase.', 'It reads LOCK IN THE ORBIT. Keep ORBIT for the archive strip.'] },
  { title: 'The five switches', label: 'LOCK 03', answer: '9', accepted: ['BCD', 'B C D', '9'], intro: 'Exactly three switches are ON. A is ON if and only if B is OFF. C is opposite A. D matches B. E is opposite D. Which switches are ON? Add their alphabet positions.', cardA: 'A · A is ON if and only if B is OFF. C is the opposite of A.', cardB: 'B · D matches B. E is the opposite of D. Exactly three switches are ON.', input: 'Name the switches or enter their total', hints: ['Start by choosing B as ON or OFF, then follow the clues.', 'If B is OFF, only A and E are ON. If B is ON, B, C, and D are ON.', 'B, C, and D are the three ON switches: 2 + 3 + 4 = 9.'] },
  { title: 'The star-map cipher', label: 'LOCK 04', answer: 'COMET', intro: 'The terminal fragment is LXVNC. Use the number from Lock 03 as the Caesar key. Move every letter backward through the alphabet.', cardA: 'A · The previous lock gave you a number. Keep it nearby.', cardB: 'B · Cipher fragment: LXVNC. Move backward through the alphabet.', input: 'Five letters', hints: ['Use the total from Lock 03 as the key.', 'Move each letter back 9 places, wrapping from A to Z when needed.', 'LXVNC becomes COMET. The source player sheet mentions a poem that was not included; the validated host route is this Caesar cipher.'] },
  { title: 'The final vault', label: 'LOCK 05', answer: 'SPACE', accepted: ['SPACE'], intro: 'The archive says: “The object answers are ORBIT and COMET. The place they belong to is the final password.” Enter the shared destination.', cardA: 'A · Your words so far: ORBIT and COMET.', cardB: 'B · Think of one place where both an orbit and a comet belong.', input: 'The final password', hints: ['They are both things you look for beyond Earth.', 'An orbit and a comet have one shared destination.', 'The final word is SPACE.'] },
];
const BRIEFING_STOPS = [
  { title: 'Constellations', short: 'Count the stars', preview: 'Find the repeated letters and pin their counts to the archive strip.', icon: <Star size={17} />, position: [50, 10] },
  { title: 'Mirror signal', short: 'Reverse a message', preview: 'Turn a reflected transmission around to recover its hidden word.', icon: <MoonStars size={17} />, position: [86, 31] },
  { title: 'Five switches', short: 'Trace the circuit', preview: 'Follow the ON and OFF links until the station’s panel lights up.', icon: <Sparkle size={17} />, position: [73, 80] },
  { title: 'Star map', short: 'Decode the sky', preview: 'Use the switch total as a key and move backward through the alphabet.', icon: <Compass size={17} />, position: [30, 70] },
  { title: 'Final vault', short: 'Open the archive', preview: 'Bring your two sky words to the place they both belong.', icon: <LockKey size={17} />, position: [51, 52] },
];
const INITIAL = { started: false, introRole: 'A', step: 0, role: 'A', cardOpen: false, answer: '', answers: [], hints: {}, completed: [], finished: false, archiveOpen: false, sideQuest: { role: 'A', notes: { A: '', B: '' }, revealed: false } };
const normalized = value => (value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
function SourceRoutes({ onPlayerRoute, onLibrary, onRules }) { return <div className="route-shortcuts"><button onClick={() => onPlayerRoute('/his')}>His clues · A</button><button onClick={() => onPlayerRoute('/hers')}>Her clues · B</button>{onRules && <button onClick={onRules}>How to play</button>}<button onClick={onLibrary}>Source pages</button></div>; }

export default function Observatory({ data, update, onBack, onLibrary, onPlayerRoute }) {
  const state = { ...INITIAL, ...(data || {}) };
  const [ending, setEnding] = useState(false);
  const lockIndex = Math.min(state.step || 0, 4);
  const lock = LOCKS[lockIndex];
  const patch = patcher => update(previous => { const old = { ...INITIAL, ...(previous || {}) }; return typeof patcher === 'function' ? patcher(old) : { ...old, ...patcher }; });
  const success = (lock.accepted || [lock.answer]).map(normalized).includes(normalized(state.answer));
  const solve = answer => {
    const answers = [...(state.answers || [])];
    answers[lockIndex] = lock.answer;
    const completed = [...new Set([...(state.completed || []), lockIndex])];
    if (lockIndex === 4) { patch({ answers, completed, finished: true }); setEnding(true); }
    else patch({ answers, completed, step: lockIndex + 1, answer: '', cardOpen: false });
  };
  const showSolution = () => solve(lock.answer);
  const reset = () => { patch(INITIAL); setEnding(false); };
  const side = { ...INITIAL.sideQuest, ...(state.sideQuest || {}) };
  const changeSideNote = (role, value) => patch(old => ({ sideQuest: { ...old.sideQuest, notes: { ...old.sideQuest.notes, [role]: value } } }));
  if (state.finished || ending) return <GameFrame title="The Observatory Lock" eyebrow="Game 03 · a two-person digital escape room" subtitle="The archive is open. The star map is all yours." icon={<span className="observatory-emblem"><MoonStars size={32} weight="duotone" /></span>} onBack={onBack} color="blue" aside={<SourceRoutes onPlayerRoute={onPlayerRoute} onLibrary={onLibrary} />}>
    <section className="observatory-ending"><span className="star-map-glow"><Star size={34} weight="fill" /></span><span className="micro-label">The archive opens at 23:59</span><h2>You unlocked the <em>star map.</em></h2><p>You found ORBIT, decoded COMET, and sent them both to the same place. The constellation room is yours to keep.</p><div className="archive-strip"><span>566</span><span>ORBIT</span><span>9</span><span>COMET</span><span>SPACE</span></div><button className="archive-toggle" onClick={() => patch({ archiveOpen: !state.archiveOpen })}>{state.archiveOpen ? 'Hide the route' : 'Read your solved archive strip'} <ArrowRight size={14} /></button>{state.archiveOpen && <p className="archive-spoken">Lock 01 → 566 · Lock 02 → ORBIT · Lock 03 → 9 · Lock 04 → COMET · Lock 05 → SPACE</p>}<Button kind="soft" onClick={reset}>Play the locks again</Button></section>
  </GameFrame>;
  if (!state.started) return <GameFrame title="The Observatory Lock" eyebrow="Game 03 · a two-person digital escape room" subtitle="Five small locks, private navigator notes, and a patient archive." icon={<span className="observatory-emblem"><MoonStars size={32} weight="duotone" /></span>} onBack={onBack} color="blue">
    <RouteBriefing variant="orbit" nodes={BRIEFING_STOPS} tagline="Five locks. One shared orbit."
      number="GAME 03"
      name="The Observatory Lock"
      subtitle="A cozy, shared escape room in an old star observatory."
      time="35–60 minutes"
      objective="Open five locks, collect the archive answers, and reveal what the observatory has been protecting. One person has the clue for each lock; the last lock is solved together."
      whatYouNeed="This page, a place to write five answers, and a calculator only if you like. The clock is just atmosphere."
      selectedRole={state.introRole || 'A'}
      audioSrc="/audio/rules/observatory.mp3"
      onSelectRole={role => patch({ introRole: role })}
      roles={{
        A: { name: 'Him · Player A', summary: 'Read his Navigator notes for Locks 01 and 03. Keep the answers on the shared strip.' },
        B: { name: 'Her · Player B', summary: 'Read her Navigator notes for Locks 02 and 04. Lock 05 belongs to both of you.' },
      }}
      steps={[
        { title: 'Choose who reads the first Navigator note.', text: 'His route has the notes for Locks 01 and 03. Her route has Locks 02 and 04. Share each clue out loud in your own words.' },
        { title: 'Solve the five locks in order.', text: 'Enter one answer at each lock. The site keeps your Archive Strip and opens the next lock when you continue.' },
        { title: 'Trade Navigator and Solver.', text: 'The player whose private note belongs to the current lock reads it and guides the other person. Switch roles on the next lock.' },
        { title: 'Use the hint ladder or show the answer.', text: 'Each lock has three small hints and a rescue button. Take the answer and move on as soon as the puzzle stops feeling fun.' },
      ]}
      rulebook={[
        { title: 'The story', text: 'At 23:59, an old observatory locks itself. Work through five small puzzles together and keep each answer on the Archive Strip. There is no fail state and the clock never runs out.' },
        { title: 'Your private Navigator notes', text: 'Player A has the clue notes for Locks 01 and 03. Player B has the notes for Locks 02 and 04. Open your own route, read your note, and paraphrase it to your partner. Do not hand over your page.' },
        { title: 'How a lock works', text: 'The current lock tells you what to do and where the pieces of information are. The Navigator shares their private note; both players discuss and agree on one answer; enter it to open the next lock.' },
        { title: 'The five puzzles', text: 'Lock 01 counts letters in selected constellation names. Lock 02 reverses a reflected message. Lock 03 uses simple ON/OFF relationships. Lock 04 decodes a short Caesar cipher using a number from Lock 03. Lock 05 asks what two sky objects have in common.' },
        { title: 'A source-page gap, already resolved', text: 'The original player PDF refers to a poem for Lock 04, but that poem is missing from the provided files. The host guide supplies the complete route used here: shift LXVNC backward by the Lock 03 number. You can use the hints; no missing page is needed.' },
        { title: 'Hints, breaks, and side quest', text: 'Open hints one at a time. The rescue button records the answer and moves on. The Signal from Home photo prompt is optional and can be skipped.' },
      ]}
      onStart={role => patch({ started: true, introRole: role, role })}
      onReadRulebook={onLibrary}
      onReadPlayerRoute={role => onPlayerRoute(role === 'A' ? '/his' : '/hers')}
    />
  </GameFrame>;
  return <GameFrame title="The Observatory Lock" eyebrow="Game 03 · a two-person digital escape room" subtitle="Five small locks. A rescue hint on every one. The archive is patient." icon={<span className="observatory-emblem"><MoonStars size={32} weight="duotone" /></span>} onBack={onBack} color="blue" aside={<SourceRoutes onPlayerRoute={onPlayerRoute} onLibrary={onLibrary} onRules={() => patch({ started: false })} />}>
    <section className="observatory-brief"><div><span className="micro-label">At 23:59 · 60 minutes on the clock</span><h2>The old observatory just locked itself.</h2><p>Take turns as Navigator and Solver. Share clues in your own words, keep the Archive Strip, and take as many hints as you like. The clock is for atmosphere; the station waits for you.</p></div><div className="obs-moon" aria-hidden="true"><MoonStars size={38} weight="duotone" /></div></section>
    <div className="lock-progress">{LOCKS.map((entry, index) => <div className={`lock-progress-stop ${index === lockIndex ? 'current' : ''} ${state.completed.includes(index) ? 'solved' : ''}`} key={entry.label}><span>{state.completed.includes(index) ? <Check size={14} /> : String(index + 1).padStart(2, '0')}</span><b>{entry.label}</b>{index < 4 && <i />}</div>)}</div>
    <section className="obs-lock-card"><div className="obs-lock-heading"><div><span className="micro-label">{lock.label} · your current puzzle</span><h2>{lock.title}</h2><p>{lock.intro}</p></div><span className="obs-lock-star"><Star size={23} /></span></div><div className="navigator-strip"><span>Pass the Navigator role:</span><button className={state.role === 'A' ? 'active' : ''} onClick={() => patch({ role: 'A', cardOpen: false })}>Player A · {state.role === 'A' ? 'Navigator' : 'Solver'}</button><button className={state.role === 'B' ? 'active' : ''} onClick={() => patch({ role: 'B', cardOpen: false })}>Player B · {state.role === 'B' ? 'Navigator' : 'Solver'}</button></div>
      <div className="obs-clue-pair"><div className="obs-clue-card"><span>A · HIS PRIVATE READING</span>Player A reads his Navigator note on the His route. Share it in your own words.</div><div className="obs-clue-card"><span>B · HER PRIVATE READING</span>Player B reads her Navigator note on the Her route. Share it in your own words.</div></div><div className="obs-private-card"><div><div><span className="input-caption">Player {state.role}’s navigator note</span><small>Read your assigned note privately, then paraphrase it.</small></div><button onClick={() => patch({ cardOpen: !state.cardOpen })} aria-label={state.cardOpen ? 'Hide private clue' : 'Reveal private clue'}>{state.cardOpen ? <EyeSlash size={16} /> : <Eye size={16} />}{state.cardOpen ? 'Hide' : 'Reveal clue'}</button></div>{state.cardOpen && <p className="obs-private-text">{state.role === 'A' ? lock.cardA : lock.cardB}</p>}</div>
      <div className="obs-answer-entry"><label><span>Your shared answer</span><input value={state.answer || ''} onChange={e => patch({ answer: e.target.value })} placeholder={lock.input} onKeyDown={e => { if (e.key === 'Enter' && success) solve(state.answer); }} /></label><Button kind="berry" onClick={() => solve(state.answer)} disabled={!success}>Open the lock <ArrowRight size={16} /></Button>{state.answer && <span className={`answer-feedback ${success ? 'answer-correct' : ''}`}>{success ? 'Click to save that key and move on.' : 'Not quite yet. No penalty, and hints are right here.'}</span>}</div>
      {lockIndex === 3 && <div className="observatory-fix"><Lightbulb size={17} /><p><b>Playability fix:</b> the player PDF refers to a Lock 04 poem that is missing from the files. The host guide confirms the intended Caesar shift to COMET, so this lock uses that complete clue.</p></div>}
      <HintBox hints={lock.hints} index={state.hints?.[lockIndex] || 0} onReveal={() => patch(old => ({ hints: { ...old.hints, [lockIndex]: Math.min(3, (old.hints?.[lockIndex] || 0) + 1) } }))} recovery onRecovery={showSolution} recoveryLabel="Show the answer & move on" />
    </section>
    <div className="observatory-footer-progress"><span>Archive Strip · {state.completed.length}/5 locks open</span><span><Heart size={15} /> The observatory has no fail state.</span></div>
    <details className="signal-quest"><summary><span><Sparkle size={17} /> Optional side quest · Signal from home</span><span>90 seconds each</span></summary><div className="signal-inner"><p>Pick a photo from your camera roll that feels like an observatory archive. Do not explain it yet. Describe the story your partner guessed, or save a few words from your own reveal.</p><div className="role-tabs"><button className={side.role === 'A' ? 'selected' : ''} onClick={() => patch(old => ({ sideQuest: { ...old.sideQuest, role: 'A', revealed: false } }))}>Player A</button><button className={side.role === 'B' ? 'selected' : ''} onClick={() => patch(old => ({ sideQuest: { ...old.sideQuest, role: 'B', revealed: false } }))}>Player B</button></div><textarea value={side.notes?.[side.role] || ''} onChange={e => changeSideNote(side.role, e.target.value)} placeholder="A tiny clue or photo caption…"/><div className="signal-actions"><span>{Object.values(side.notes || {}).filter(Boolean).length}/2 notes ready · reveal together</span><Button kind={side.revealed ? 'soft' : 'quiet'} disabled={!side.notes?.A || !side.notes?.B} onClick={() => patch(old => ({ sideQuest: { ...old.sideQuest, revealed: !old.sideQuest.revealed } }))}>{side.revealed ? 'Hide the reveal' : 'Reveal together'} <ArrowRight size={15} /></Button></div>{side.revealed && <div className="signal-reveal"><span><b>Player A</b>{side.notes.A}</span><span><b>Player B</b>{side.notes.B}</span></div>}</div></details>
    <p className="save-note"><Check size={14} /> Your current lock saves in this browser. The side quest stays optional.</p>
  </GameFrame>;
}
