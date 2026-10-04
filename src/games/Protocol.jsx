import { useMemo, useState } from 'react';
import {
  ArrowRight, BookOpenText, Check, ClipboardText, Eye, EyeSlash, Heart, Image as ImageIcon,
  Key, Lightbulb, LockKey, MusicNotes, NotePencil, Sparkle, Shuffle, Timer, X, ArrowUpRight,
} from '@phosphor-icons/react';
import { Button, CheckpointFooter, Countdown, GameFrame, GameInstructions, HintBox, StageRail } from '../components.jsx';

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
const INITIAL = {
  started: false, introRole: 'A', completed: [], hints: {}, activeStage: 0, codeInput: '', vaultOpen: false,
  split: { role: 'A', cardOpen: false, clue: '', number: 1, turns: [], found: { A: 0, B: 0 }, guesses: '', misses: 0 },
  message: { method: '', extraction: '' },
  evidence: { role: 'A', responses: { A: ['', '', ''], B: ['', '', ''] }, bonus: { A: '', B: '' } },
  archive: { role: 'A', texts: { A: '', B: '' }, judgeDone: false },
  dixit: { role: 'A', interpretations: { A: '', B: '' }, revealed: false, shared: false },
  samePage: { role: 'A', answers: { A: Array(10).fill(''), B: Array(10).fill('') }, revealed: false, riddle: '' },
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
const METHODS = ['Think category, not literal object.', 'Your partner knows which words are safe for you, not for them.', 'A clue can bridge multiple words.'];
const MESSAGE_HINTS = ['Look at how the sentences begin before you look at what they mean.', 'The first four sentences tell you an instruction.', 'Take the third word in each of the final five sentences. Their initials spell ORBIT.'];
const PROMPT = 'Act as a neutral game referee for a two-person creative challenge. We each wrote a 130–180 word scene answering the same prompt. Your job is NOT to judge who loves more, who is the better writer, or whose relationship is healthier. Give us: 1. A score out of 10 for each piece on sensory specificity. 2. A score out of 10 for each on believable everyday detail. 3. A score out of 10 for how strongly each scene implies a shared world. 4. Three concrete details that overlap in spirit across the two pieces. 5. One surprising difference that is interesting rather than bad. 6. A one-sentence verdict: what do these two scenes accidentally reveal about how we imagine ordinary life together? Do not rewrite our work. Keep the tone warm, sharp, and slightly playful.';

function PlayerLinks({ onPlayerRoute }) {
  return <div className="route-shortcuts"><button onClick={() => onPlayerRoute('/his')}>His clues · A</button><button onClick={() => onPlayerRoute('/hers')}>Her clues · B</button></div>;
}

function countWords(value) { return value.trim() ? value.trim().split(/\s+/).length : 0; }
function SelectPlayer({ value, onChange, label = 'Hand the screen to' }) {
  return <div className="role-switch"><span>{label}</span>{['A', 'B'].map(role => <button key={role} className={value === role ? 'selected' : ''} onClick={() => onChange(role)}>Player {role}</button>)}</div>;
}
function completeFlags(state, id) { return (state.completed || []).includes(id); }

export default function Protocol({ data, update, onBack, onLibrary, onPlayerRoute }) {
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
    const submitClue = () => {
      if (!split.clue.trim()) return;
      patchSection('split', old => ({
        turns: [...(old.turns || []), { role: old.role, clue: old.clue.trim(), number: Number(old.number) || 1, guesses: (old.guesses || '').trim() }],
        clue: '', guesses: '', cardOpen: false,
      }));
    };
    const setGuessCount = value => patchSection('split', old => ({ found: { ...old.found, [old.role]: Math.min(6, Math.max(0, (old.found?.[old.role] || 0) + value)) } }));
    const hints = [METHODS[0], METHODS[1], METHODS[2]];
    return <>
      <div className="stage-intro"><p>This is the asymmetric one. The active player sees their own targets. Give a one-word clue and a number; your partner guesses from the shared grid. Swap after each turn.</p><div className="stage-meta"><span><Timer size={15} /> 12 minutes</span><span><Heart size={15} /> One team, two secret maps</span></div></div>
      <div className="split-layout">
        <section className="play-panel split-secret">
          <div className="panel-heading"><span className="mini-icon rose-icon"><LockKey size={17} /></span><div><h3>Private key card</h3><p>Hand over the screen before revealing.</p></div></div>
          <SelectPlayer value={role} onChange={next => patchSection('split', { role: next, cardOpen: false, clue: '', guesses: '' })} label="Clue-giver" />
          {!split.cardOpen ? <button className="privacy-card" onClick={() => patchSection('split', { cardOpen: true })}><Eye size={22} /><strong>Reveal Player {role}'s targets</strong><span>Ask the other player to look away first.</span></button> : <div className="target-reveal"><div className="target-reveal-head"><span>ONLY PLAYER {role} READS THIS</span><button onClick={() => patchSection('split', { cardOpen: false })} aria-label="Hide private key card"><EyeSlash size={18} /></button></div><div className="target-word-list">{TARGETS[role].map(n => <span key={n}>{String(n).padStart(2, '0')} <b>{WORDS[n - 1]}</b></span>)}</div><p>Your partner is trying to find these six words. Keep the list to yourself.</p></div>}
          <div className="target-meter"><div><span>Player {role}'s targets found</span><strong>{solved}/6</strong></div><div className="meter-track"><i style={{ width: `${Math.min(100, solved / 6 * 100)}%` }} /></div></div>
          <div className="clue-entry"><span className="input-caption">Your clue · one word</span><div className="clue-fields"><input value={split.clue || ''} onChange={e => patchSection('split', { clue: e.target.value })} placeholder="e.g. sky" aria-label="One-word clue" /><label>How many?<select value={split.number || 1} onChange={e => patchSection('split', { number: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6].map(n => <option key={n}>{n}</option>)}</select></label></div><Button kind="berry" onClick={submitClue}><Sparkle size={16} /> Give clue & hide my card</Button></div>
          <div className="guess-pad"><span className="input-caption">Shared guess board</span><p>Tap the word your partner guessed, then confirm it together.</p><div className="word-grid">{WORDS.map((word, index) => <button key={word} className="word-tile" onClick={() => patchSection('split', { guesses: word })}>{String(index + 1).padStart(2, '0')} <b>{word}</b></button>)}</div>{split.guesses && <div className="guess-confirm"><span>They guessed <b>{split.guesses}</b>?</span><div><button className="tiny-accept" onClick={() => { setGuessCount(1); patchSection('split', { guesses: '' }); }}>Yes, target found</button><button className="tiny-decline" onClick={() => { patchSection('split', old => ({ misses: (old.misses || 0) + 1, guesses: '' })); }}>Miss; try again</button></div></div>}</div>
          <div className="mini-turn-log"><div className="log-heading"><span className="input-caption">Clue log</span><span>{split.turns?.length || 0}/9 turns</span></div>{(split.turns || []).length ? split.turns.map((turn, i) => <div className="log-line" key={`${turn.clue}-${i}`}><b>{turn.role}</b><span>{turn.clue} · {turn.number}</span>{turn.guesses && <em>guess: {turn.guesses}</em>}</div>) : <p>No clues yet. Keep each clue to one word plus a number.</p>}</div>
        </section>
        <aside className="side-note rose-side"><span className="micro-label">If you get stuck</span><h3>Think category, not literal object.</h3><p>Answers are never worth a tense moment. Use a hint, swap the clue, and keep the good part of the night.</p>{hintBox(hints, 'Rescue this checkpoint')}<div className="side-petal" aria-hidden="true">T</div></aside>
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
      <section className="message-note"><span className="micro-label">Recovered transmission</span><div className="message-text">{text.map((line, i) => <p key={i} className={i === 4 ? 'message-break' : ''}><span>{String(i + 1).padStart(2, '0')}</span>{line}</p>)}</div><small>Look at where the sentences begin, then count carefully.</small></section>
      <section className="play-panel message-entry"><div className="panel-heading"><span className="mini-icon peach-icon"><NotePencil size={17} /></span><div><h3>Enter the two layers</h3><p>The extraction chain should make a five-letter word.</p></div></div><div className="two-answer-fields"><label><span>First four initials → method</span><input value={msg.method} onChange={e => patchSection('message', { method: e.target.value })} placeholder="four letters" maxLength={8} /></label><label><span>Take the method across the final five → word</span><input value={msg.extraction} onChange={e => patchSection('message', { extraction: e.target.value })} placeholder="five letters" maxLength={10} /></label></div>{msg.method && msg.extraction && <p className={`answer-feedback ${correct ? 'answer-correct' : ''}`}>{correct ? 'That fits the transmission. The key is its first letter.' : 'Close the page for a second and look at the sentence starts.'}</p>}</section>
      <div className="clarification-note"><Lightbulb size={18} /><p><b>A clearer version for this site:</b> the source PDF’s last-five-sentence extraction has a small typo. This version makes the intended third-word initials spell ORBIT, just as the host guide says.</p></div>
      {hintBox(MESSAGE_HINTS, 'Reveal the key and move on')}
      {correct && !stageDone ? footer('Take O and continue') : footer('We cracked it')}
    </>;
  };

  const renderEvidence = () => {
    const ev = { ...INITIAL.evidence, ...(state.evidence || {}) };
    const prompts = [
      ['Something that makes a sound', 'Show it. What memory or mood might it represent?'],
      ['Something older than your relationship', 'Stay quiet for 30 seconds. Let them invent its story.'],
      ['Something absurdly ordinary', 'Why is this boring object secretly a good symbol for you two?'],
    ];
    const responseCount = [...(ev.responses?.A || []), ...(ev.responses?.B || [])].filter(v => v.trim()).length;
    const capture = (role, index, value) => patchSection('evidence', old => { const rows = [...(old.responses?.[role] || ['', '', ''])]; rows[index] = value; return { responses: { ...old.responses, [role]: rows } }; });
    return <>
      <div className="stage-intro"><p>Find three everyday objects in four minutes. Give each one a little story; the other person gets to interpret it. No one needs a perfect guess.</p><div className="stage-meta"><span><Timer size={15} /> Four-minute search each</span><span><Heart size={15} /> Objects can be tiny or silly</span></div></div>
      <Countdown seconds={240} label="Your scavenger sprint" />
      <section className="evidence-sheet"><div className="sheet-top"><div><span className="micro-label">The evidence board</span><h3>Three objects, two points of view.</h3></div><SelectPlayer value={ev.role} onChange={role => patchSection('evidence', { role })} label="Writing for" /></div><div className="evidence-prompts">{prompts.map(([title, hint], i) => <label className="evidence-prompt" key={title}><span className="prompt-number">0{i + 1}</span><span className="prompt-title">{title}<small>{hint}</small></span><input value={ev.responses?.[ev.role]?.[i] || ''} onChange={e => capture(ev.role, i, e.target.value)} placeholder="A memory, a guess, or a tiny story…" /></label>)}</div><div className="evidence-summary"><span>{responseCount}/6 stories added</span><div className="meter-track"><i style={{ width: `${responseCount / 6 * 100}%` }} /></div></div></section>
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
    const select = (index, choice) => patchSection('samePage', old => { const rows = [...(old.answers?.[old.role] || Array(10).fill(''))]; rows[index] = choice; return { answers: { ...old.answers, [old.role]: rows }, revealed: false }; });
    const riddleReady = ['promise', 'trust', 'silence'].includes((sync.riddle || '').trim().toLowerCase());
    const recoverRiddle = () => patchSection('samePage', { riddle: 'promise' });
    return <>
      <div className="stage-intro"><p>Each person picks privately. Finish all ten, then reveal at once. No talking your way into a match.</p><div className="stage-meta"><span><Timer size={15} /> 12 minutes</span><span><Heart size={15} /> Odd answers are part of the fun</span></div></div>
      <section className="play-panel same-page-board"><div className="panel-heading"><span className="mini-icon lilac-icon"><Sparkle size={17} /></span><div><h3>Choose in private</h3><p>Answers stay covered until both players finish.</p></div></div><SelectPlayer value={role} onChange={next => patchSection('samePage', { role: next, revealed: false })} label="Answering for"/><div className="choice-list">{SAME_PAGE.map(([first, second], index) => <div className="choice-row" key={first}><span className="choice-number">{String(index + 1).padStart(2, '0')}</span><div><button className={answerRows[index] === first ? 'choice-selected' : ''} onClick={() => select(index, first)}>{first}</button><button className={answerRows[index] === second ? 'choice-selected' : ''} onClick={() => select(index, second)}>{second}</button></div>{answerRows[index] && <Check size={15} className="choice-check" />}</div>)}</div><div className="answer-progress">{answerRows.filter(Boolean).length}/10 locked in by Player {role}<span className="answer-bar"><i style={{ width: `${answerRows.filter(Boolean).length * 10}%` }} /></span></div><div className="simultaneous-bar"><span>{ready ? `All done · ${sameCount}/10 matched` : 'Hand over the screen, then pick for Player ' + (role === 'A' ? 'B' : 'A') + '.'}</span><Button disabled={!ready} onClick={() => patchSection('samePage', { revealed: !sync.revealed })}>{sync.revealed ? 'Hide results' : 'Reveal together'}<ArrowRight size={16} /></Button></div>{sync.revealed && <div className="sync-result"><span className="sync-emoji">{sameCount >= 7 ? '✦' : sameCount >= 5 ? '♡' : '↗'}</span><div><span className="micro-label">Together, you matched</span><strong>{sameCount} of 10</strong><p>{sameCount >= 7 ? 'A mind-meld. Suspiciously efficient.' : sameCount >= 5 ? 'A few shared instincts and plenty to talk about.' : 'Two delightful cryptographic anomalies. Excellent work.'}</p></div></div>}</section>
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
  if (!state.started) return <GameFrame title="The Distance Protocol" eyebrow="Game 01 · the long-distance mystery" subtitle="A two-person co-op night. Six little locks, one shared ending." icon={<span className="protocol-emblem">♡</span>} onBack={onBack} color="rose" aside={<button className="library-shortcut" onClick={onLibrary}><BookOpenText size={17} /> Read the original pages</button>}>
    <GameInstructions
      number="GAME 01"
      name="The Distance Protocol"
      subtitle="A cozy co-op mystery with clues, stories, and a shared final vault."
      time="75–100 minutes"
      objective="Work through six short chapters together. Each one earns letters or clues for the next. Put your collected letters into the final vault and open the shared ending."
      whatYouNeed="A video call, paper and pen, a phone for sending photos, and a drink. No advance prep."
      selectedRole={state.introRole || 'A'}
      onSelectRole={role => patch({ introRole: role })}
      roles={{
        A: { name: 'Him · Player A', summary: 'Read his private clue book. In Split Key, he starts with his own secret word list.' },
        B: { name: 'Her · Player B', summary: 'Read her private clue book. In Split Key, she has a different secret word list.' },
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
  return <GameFrame title="The Distance Protocol" eyebrow="Game 01 · the long-distance mystery" subtitle="A two-person co-op night. Six little locks, one shared ending." icon={<span className="protocol-emblem">♡</span>} onBack={onBack} color="rose" aside={<><PlayerLinks onPlayerRoute={onPlayerRoute} /><button className="library-shortcut" onClick={() => patch({ started: false })}><BookOpenText size={17} /> How to play</button><button className="library-shortcut" onClick={onLibrary}><BookOpenText size={17} /> Source pages</button></>}>
    <div className="protocol-progress"><div><span className="micro-label">Your key ring</span><strong>{keys.length}<small> / 8 letters</small></strong></div><div className="earned-letters">{['split', 'message', 'evidence', 'archive', 'dixit', 'samePage'].flatMap(id => { const item = STAGES.find(s => s.id === id); return completed.includes(id) ? item.letter.split(' · ').map((letter, i) => <span key={`${id}-${i}`}>{letter}</span>) : [<span className="letter-empty" key={id}>·</span>]; })}</div><div className="protocol-progress-right"><span><Heart size={15} /> Team progress</span><span>{completed.filter(id => id !== 'vault').length}/6</span></div></div>
    <StageRail items={stageItems} active={stageIndex} completed={completed} onSelect={goStage} />
    <section className="stage-main"><div className="stage-heading"><div><span className="micro-label">{stage.id === 'vault' ? 'Final unlock' : `${stage.time} · one checkpoint`}</span><h2>{stage.title}</h2></div>{stage.id !== 'vault' && <div className="stage-key-pill">Key <b>{stage.letter}</b></div>}</div>{renderCurrent()}</section>
    {stage.id === 'vault' ? null : renderSidequests()}
    <p className="save-note"><Check size={14} /> Your progress saves in this browser automatically.</p>
  </GameFrame>;
}
