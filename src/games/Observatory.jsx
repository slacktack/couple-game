import { useState } from 'react';
import { ArrowRight, Check, Compass, Eye, EyeSlash, Heart, Lightbulb, LockKey, MoonStars, Radio, Sparkle, Star, Timer } from '@phosphor-icons/react';
import { Button, GameFrame, HintBox } from '../components.jsx';
import RouteBriefing from '../RouteBriefing.jsx';

const LOCKS = [
  { title: 'The constellation grid', label: 'LOCK 01', answer: '566', intro: 'Count names with one repeated letter. Enter their lengths in sky order.', cardA: 'A · Your star list: ORION · LYRA · CYGNUS', cardB: 'B · Your star list: DRACO · TAURUS · GEMINI', input: 'Three digits', hints: ['Look for the constellation name with one letter appearing twice.', 'The relevant names are ORION, TAURUS, and GEMINI. Count their letters.', 'Those counts, in that order, are 5 · 6 · 6.'] },
  { title: 'Mirror transmission', label: 'LOCK 02', answer: 'ORBIT', accepted: ['LOCK IN THE ORBIT', 'ORBIT'], intro: 'Turn the reflected terminal phrase around. Restore its spaces.', cardA: 'A · Read this terminal slowly: T I B R O   E H T   N I   K C O L', cardB: 'B · The paper says: “The signal was reflected before it arrived.”', input: 'The hidden keyword', hints: ['Read the characters from right to left.', 'Reverse the letters, then put spaces back into the phrase.', 'It reads LOCK IN THE ORBIT. Keep ORBIT for the archive strip.'] },
  { title: 'The five switches', label: 'LOCK 03', answer: '9', accepted: ['BCD', 'B C D', '9'], intro: 'Find the three ON switches. Their letter values make the code.', cardA: 'A · A is ON if and only if B is OFF. C is the opposite of A.', cardB: 'B · D matches B. E is the opposite of D. Exactly three switches are ON.', input: 'Tap the ON switches', hints: ['Start by choosing B as ON or OFF, then follow the clues.', 'If B is OFF, only A and E are ON. If B is ON, B, C, and D are ON.', 'B, C, and D are the three ON switches: 2 + 3 + 4 = 9.'] },
  { title: 'The star-map cipher', label: 'LOCK 04', answer: 'COMET', intro: 'Shift LXVNC backward with the number from Lock 03.', cardA: 'A · The previous lock gave you a number. Keep it nearby.', cardB: 'B · Cipher fragment: LXVNC. Move backward through the alphabet.', input: 'Five letters', hints: ['Use the total from Lock 03 as the key.', 'Move each letter back 9 places, wrapping from A to Z when needed.', 'LXVNC becomes COMET. The source player sheet mentions a poem that was not included; the validated host route is this Caesar cipher.'] },
  { title: 'The final vault', label: 'LOCK 05', answer: 'SPACE', accepted: ['SPACE'], intro: 'ORBIT and COMET share one final destination.', cardA: 'A · Your words so far: ORBIT and COMET.', cardB: 'B · Think of one place where both an orbit and a comet belong.', input: 'The final password', hints: ['They are both things you look for beyond Earth.', 'An orbit and a comet have one shared destination.', 'The final word is SPACE.'] },
];
const CONSTELLATIONS = [
  { name: 'ORION', line: '14 44 29 18 40 36 56 13 68 37 84 28', points: [[14,44],[29,18],[40,36],[56,13],[68,37],[84,28]] },
  { name: 'LYRA', line: '18 30 39 48 56 19 79 36 56 19', points: [[18,30],[39,48],[56,19],[79,36]] },
  { name: 'CYGNUS', line: '17 48 34 25 51 45 68 20 85 39', points: [[17,48],[34,25],[51,45],[68,20],[85,39]] },
  { name: 'DRACO', line: '12 23 31 40 49 25 65 48 83 28 92 53', points: [[12,23],[31,40],[49,25],[65,48],[83,28],[92,53]] },
  { name: 'TAURUS', line: '16 20 38 41 58 24 78 47 38 41 35 62', points: [[16,20],[38,41],[58,24],[78,47],[35,62]] },
  { name: 'GEMINI', line: '27 15 31 35 35 55 68 15 64 35 60 55 31 35 64 35', points: [[27,15],[31,35],[35,55],[68,15],[64,35],[60,55]] },
];
const BRIEFING_STOPS = [
  { title: 'Constellations', short: 'Count the stars', preview: 'Find the repeated letters and pin their counts to the archive strip.', icon: <Star size={17} />, position: [50, 10] },
  { title: 'Mirror signal', short: 'Reverse a message', preview: 'Turn a reflected transmission around to recover its hidden word.', icon: <MoonStars size={17} />, position: [86, 31] },
  { title: 'Five switches', short: 'Trace the circuit', preview: 'Follow the ON and OFF links until the station’s panel lights up.', icon: <Sparkle size={17} />, position: [73, 80] },
  { title: 'Star map', short: 'Decode the sky', preview: 'Use the switch total as a key and move backward through the alphabet.', icon: <Compass size={17} />, position: [30, 70] },
  { title: 'Final vault', short: 'Open the archive', preview: 'Bring your two sky words to the place they both belong.', icon: <LockKey size={17} />, position: [51, 52] },
];
const INITIAL = { started: false, introRole: 'A', step: 0, role: 'A', cardOpen: false, answer: '', switches: { A: false, B: false, C: false, D: false, E: false }, answers: [], hints: {}, completed: [], finished: false, archiveOpen: false, sideQuest: { role: 'A', notes: { A: '', B: '' }, revealed: false } };
const normalized = value => (value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
function decodeShift(value, shift) { return value.replace(/[A-Z]/g, letter => String.fromCharCode(((letter.charCodeAt(0) - 65 - shift + 26) % 26) + 65)); }
function SourceRoutes({ onPlayerRoute, onLibrary, onRules }) { return <div className="route-shortcuts"><button onClick={() => onPlayerRoute('/his')}>His clues · A</button><button onClick={() => onPlayerRoute('/hers')}>Her clues · B</button>{onRules && <button onClick={onRules}>How to play</button>}<button onClick={onLibrary}>Source pages</button></div>; }

export default function Observatory({ data, update, onBack, onLibrary, onPlayerRoute, theme, onToggleTheme }) {
  const state = { ...INITIAL, ...(data || {}) };
  const [ending, setEnding] = useState(false);
  const [selectedStar, setSelectedStar] = useState('ORION');
  const [pinnedStars, setPinnedStars] = useState([]);
  const [signalFlipped, setSignalFlipped] = useState(false);
  const [cipherShift, setCipherShift] = useState(0);
  const lockIndex = Math.min(state.step || 0, 4);
  const lock = LOCKS[lockIndex];
  const patch = patcher => update(previous => { const old = { ...INITIAL, ...(previous || {}) }; return typeof patcher === 'function' ? patcher(old) : { ...old, ...patcher }; });
  const success = (lock.accepted || [lock.answer]).map(normalized).includes(normalized(state.answer));
  const switches = state.switches || INITIAL.switches;
  const flipSwitch = letter => patch(old => {
    const next = { ...INITIAL.switches, ...(old.switches || {}), [letter]: !old.switches?.[letter] };
    const active = Object.keys(next).filter(key => next[key]);
    return { ...old, switches: next, answer: active.length === 3 ? String(active.reduce((sum, key) => sum + key.charCodeAt(0) - 64, 0)) : '' };
  });
  const pinConstellation = name => setPinnedStars(current => current.includes(name)
    ? current.filter(item => item !== name)
    : current.length < 3 ? [...current, name] : current);
  const starCode = ['ORION', 'TAURUS', 'GEMINI'].every(name => pinnedStars.includes(name)) && pinnedStars.length === 3
    ? CONSTELLATIONS.filter(group => pinnedStars.includes(group.name)).map(group => group.name.length).join('')
    : '';
  const orderedPinnedStars = CONSTELLATIONS.filter(group => pinnedStars.includes(group.name));
  const activeCipherShift = cipherShift || Number(state.answers?.[2]) || 9;
  const decodedSignal = decodeShift('LXVNC', activeCipherShift);
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
  if (state.finished || ending) return <GameFrame title="The Observatory Lock" eyebrow="Game 03 · a two-person digital escape room" subtitle="The archive is open. The star map is all yours." icon={<span className="observatory-emblem"><MoonStars size={32} weight="duotone" /></span>} onBack={onBack} theme={theme} onToggleTheme={onToggleTheme} color="blue" aside={<SourceRoutes onPlayerRoute={onPlayerRoute} onLibrary={onLibrary} />}>
    <section className="observatory-ending"><span className="star-map-glow"><Star size={34} weight="fill" /></span><span className="micro-label">The archive opens at 23:59</span><h2>You unlocked the <em>star map.</em></h2><p>You found ORBIT, decoded COMET, and sent them both to the same place. The constellation room is yours to keep.</p><div className="archive-strip"><span>566</span><span>ORBIT</span><span>9</span><span>COMET</span><span>SPACE</span></div><button className="archive-toggle" onClick={() => patch({ archiveOpen: !state.archiveOpen })}>{state.archiveOpen ? 'Hide the route' : 'Read your solved archive strip'} <ArrowRight size={14} /></button>{state.archiveOpen && <p className="archive-spoken">Lock 01 → 566 · Lock 02 → ORBIT · Lock 03 → 9 · Lock 04 → COMET · Lock 05 → SPACE</p>}<Button kind="soft" onClick={reset}>Play the locks again</Button></section>
  </GameFrame>;
  if (!state.started) return <GameFrame title="The Observatory Lock" eyebrow="Game 03 · a two-person digital escape room" subtitle="Five small locks, private navigator notes, and a patient archive." icon={<span className="observatory-emblem"><MoonStars size={32} weight="duotone" /></span>} onBack={onBack} theme={theme} onToggleTheme={onToggleTheme} color="blue">
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
        A: { name: 'Him · Player A', summary: 'His Navigator notes cover locks 01 and 03.' },
        B: { name: 'Her · Player B', summary: 'Her notes cover locks 02 and 04; lock 05 is shared.' },
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
  return <GameFrame title="The Observatory Lock" eyebrow="Game 03 · a two-person digital escape room" subtitle="Five small locks. A rescue hint on every one. The archive is patient." icon={<span className="observatory-emblem"><MoonStars size={32} weight="duotone" /></span>} onBack={onBack} theme={theme} onToggleTheme={onToggleTheme} color="blue" playMode aside={<SourceRoutes onPlayerRoute={onPlayerRoute} onLibrary={onLibrary} onRules={() => patch({ started: false })} />}>
    <section className="observatory-brief"><div><span className="micro-label">Midnight signal · 5 locks</span><h2>Open the midnight archive.</h2><p>Trade private notes. Solve each lock together.</p></div><div className="obs-moon" aria-hidden="true"><MoonStars size={38} weight="duotone" /></div></section>
    <div className="lock-progress">{LOCKS.map((entry, index) => <div className={`lock-progress-stop ${index === lockIndex ? 'current' : ''} ${state.completed.includes(index) ? 'solved' : ''}`} key={entry.label}><span>{state.completed.includes(index) ? <Check size={14} /> : String(index + 1).padStart(2, '0')}</span><b>{entry.label}</b>{index < 4 && <i />}</div>)}</div>
    <section className="obs-lock-card"><div className="obs-lock-heading"><div><span className="micro-label">{lock.label} · your current puzzle</span><h2>{lock.title}</h2><p>{lock.intro}</p></div><span className="obs-lock-star"><Star size={23} /></span></div>{lockIndex === 0 && <>
        <div className="constellation-board" aria-label="Interactive constellation chart">{CONSTELLATIONS.map((group, index) => <button type="button" key={group.name} className={`constellation-card ${selectedStar === group.name ? 'is-lit' : ''} ${pinnedStars.includes(group.name) ? 'is-pinned' : ''}`} aria-pressed={pinnedStars.includes(group.name)} onMouseEnter={() => setSelectedStar(group.name)} onFocus={() => setSelectedStar(group.name)} onClick={() => pinConstellation(group.name)}><svg viewBox="0 0 100 68" aria-hidden="true"><path d={`M${group.line.replaceAll(' ', ',')}`} />{group.points.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={i === 0 ? 2.6 : 2} />)}</svg><span>{group.name}</span><i>{String(index + 1).padStart(2, '0')}</i>{pinnedStars.includes(group.name) && <b className="constellation-length">{group.name.length}</b>}</button>)}</div>
      <div className="star-code-strip"><span>PIN THREE NAMES</span><div>{orderedPinnedStars.map(group => <b key={group.name}>{group.name.length}</b>)}{Array.from({ length: Math.max(0, 3 - pinnedStars.length) }, (_, i) => <i key={i}>·</i>)}</div><small>{pinnedStars.length}/3 pinned · sky order</small></div>
      </>}
      {lockIndex === 1 && <div className={`mirror-chamber ${signalFlipped ? 'is-flipped' : ''}`}><div className="mirror-orbit" aria-hidden="true"><Radio size={26} weight="duotone" /><i /><i /></div><div className="mirror-signal"><span className="micro-label">REFLECTED TERMINAL · INCOMING</span><strong>LOCKINTHEORBIT</strong><small>{signalFlipped ? 'Strip turned. Put the spaces back where they belong.' : 'The receiver has mirrored the character strip.'}</small></div><button type="button" onClick={() => setSignalFlipped(value => !value)}>{signalFlipped ? 'Mirror it again' : 'Turn the signal over'} <ArrowRight size={15} /></button></div>}
      <div className="navigator-strip"><span>Navigator</span><button className={state.role === 'A' ? 'active' : ''} onClick={() => patch({ role: 'A', cardOpen: false })}>A · {state.role === 'A' ? 'reads' : 'solves'}</button><button className={state.role === 'B' ? 'active' : ''} onClick={() => patch({ role: 'B', cardOpen: false })}>B · {state.role === 'B' ? 'reads' : 'solves'}</button></div>
      <div className="obs-private-card"><div><div><span className="input-caption">Player {state.role}’s private note</span></div><button onClick={() => patch({ cardOpen: !state.cardOpen })} aria-label={state.cardOpen ? 'Hide private clue' : 'Reveal private clue'}>{state.cardOpen ? <EyeSlash size={16} /> : <Eye size={16} />}{state.cardOpen ? 'Hide note' : 'Reveal note'}</button></div>{state.cardOpen && <p className="obs-private-text">{state.role === 'A' ? lock.cardA : state.role === 'B' ? lock.cardB : 'Both players read the shared final clue.'}</p>}</div>
      {lockIndex === 2 && <div className="switchboard" aria-label="Interactive five switch circuit"><div className="switchboard-art"><span className="switchboard-label">OBSERVATORY · MAIN BUS</span><div className="switch-track" aria-hidden="true"><i className={Object.values(switches).filter(Boolean).length === 3 ? 'powered' : ''} /></div><div className="switches">{Object.entries(switches).map(([letter, on]) => <button key={letter} type="button" aria-pressed={on} className={on ? 'is-on' : ''} onClick={() => flipSwitch(letter)}><span className="switch-toggle"><i /></span><b>{letter}</b><small>{on ? 'ON' : 'OFF'}</small></button>)}</div></div><div className="switch-readout"><span>LIVE CIRCUIT</span><b>{Object.entries(switches).filter(([, on]) => on).map(([letter]) => letter).join(' · ') || '—'}</b><small>{Object.values(switches).filter(Boolean).length === 3 ? `VALUE TOTAL · ${state.answer || '0'}` : 'Set exactly three switches to ON'}</small></div></div>}
      {lockIndex === 3 && <div className="cipher-wheel"><div className="cipher-wheel-title"><span className="micro-label">STAR CHART · CAESAR SHIFT</span><span>BACK <b>{activeCipherShift}</b></span></div><div className="cipher-letter-path"><div><small>TRANSMITTED</small><span>{'LXVNC'.split('').map((letter, index) => <b key={index}>{letter}</b>)}</span></div><ArrowRight size={19} /><div><small>SHIFTED BACK</small><span className="cipher-result">{decodedSignal.split('').map((letter, index) => <b key={index}>{letter}</b>)}</span></div></div><label className="cipher-slider"><span>Rotate the cipher wheel</span><input type="range" min="1" max="13" value={activeCipherShift} onChange={event => setCipherShift(Number(event.target.value))} aria-label="Cipher shift"/><b>{activeCipherShift} places</b></label></div>}
      {lockIndex === 4 && <div className="vault-destinations" aria-label="Choose the shared destination"><span>WHERE THE SKY OBJECTS MEET</span>{['SPACE', 'OCEAN', 'EARTH'].map(place => <button key={place} className={state.answer === place ? 'is-selected' : ''} onClick={() => patch({ answer: place })}><span>{place === 'SPACE' ? '✦' : place === 'OCEAN' ? '≈' : '◉'}</span>{place}</button>)}</div>}
      <div className="obs-answer-entry">{lockIndex === 0 ? <div className="answer-key-display"><span>ARCHIVE CODE</span><div>{(starCode || '').split('').map((digit, i) => <b key={i}>{digit}</b>)}{Array.from({ length: Math.max(0, 3 - (starCode || '').length) }, (_, i) => <i key={i}>·</i>)}</div></div> : lockIndex !== 2 && lockIndex !== 4 ? <label><span>Your shared answer</span><input value={state.answer || ''} onChange={e => patch({ answer: e.target.value })} placeholder={lock.input} onKeyDown={e => { if (e.key === 'Enter' && success) solve(state.answer); }} /></label> : <div className="answer-key-display"><span>{lockIndex === 2 ? 'SWITCH CODE' : 'VAULT KEY'}</span><div><b>{state.answer || '·'}</b></div></div>}<Button kind="berry" onClick={() => solve(lockIndex === 0 ? starCode : state.answer)} disabled={lockIndex === 0 ? !starCode : !success}>Open the lock <ArrowRight size={16} /></Button>{state.answer && lockIndex !== 0 && <span className={`answer-feedback ${success ? 'answer-correct' : ''}`}>{success ? 'Click to save that key and move on.' : 'Not quite yet. No penalty, and hints are right here.'}</span>}</div>
      {lockIndex === 3 && <div className="observatory-fix"><Lightbulb size={17} /><p>Source poem missing · using the confirmed 9-step cipher: <b>LXVNC → COMET</b>.</p></div>}
      <HintBox hints={lock.hints} index={state.hints?.[lockIndex] || 0} onReveal={() => patch(old => ({ hints: { ...old.hints, [lockIndex]: Math.min(3, (old.hints?.[lockIndex] || 0) + 1) } }))} recovery onRecovery={showSolution} recoveryLabel="Show the answer & move on" />
    </section>
    <div className="observatory-footer-progress"><span>Archive Strip · {state.completed.length}/5 locks open</span><span><Heart size={15} /> The observatory has no fail state.</span></div>
    <details className="signal-quest"><summary><span><Sparkle size={17} /> Optional side quest · Signal from home</span><span>90 seconds each</span></summary><div className="signal-inner"><p>Pick a photo from your camera roll that feels like an observatory archive. Do not explain it yet. Describe the story your partner guessed, or save a few words from your own reveal.</p><div className="role-tabs"><button className={side.role === 'A' ? 'selected' : ''} onClick={() => patch(old => ({ sideQuest: { ...old.sideQuest, role: 'A', revealed: false } }))}>Player A</button><button className={side.role === 'B' ? 'selected' : ''} onClick={() => patch(old => ({ sideQuest: { ...old.sideQuest, role: 'B', revealed: false } }))}>Player B</button></div><textarea value={side.notes?.[side.role] || ''} onChange={e => changeSideNote(side.role, e.target.value)} placeholder="A tiny clue or photo caption…"/><div className="signal-actions"><span>{Object.values(side.notes || {}).filter(Boolean).length}/2 notes ready · reveal together</span><Button kind={side.revealed ? 'soft' : 'quiet'} disabled={!side.notes?.A || !side.notes?.B} onClick={() => patch(old => ({ sideQuest: { ...old.sideQuest, revealed: !old.sideQuest.revealed } }))}>{side.revealed ? 'Hide the reveal' : 'Reveal together'} <ArrowRight size={15} /></Button></div>{side.revealed && <div className="signal-reveal"><span><b>Player A</b>{side.notes.A}</span><span><b>Player B</b>{side.notes.B}</span></div>}</div></details>
    <p className="save-note"><Check size={14} /> Your current lock saves in this browser. The side quest stays optional.</p>
  </GameFrame>;
}
