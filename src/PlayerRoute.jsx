import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenText, Check, Headphones, Heart, Lightbulb, LockKey, Pause, SpeakerHigh, UserCircle } from '@phosphor-icons/react';
import { Button } from './components.jsx';

const TARGETS = { A: [[1, 'LANTERN'], [4, 'ORCHARD'], [7, 'COMET'], [10, 'TRAIN'], [11, 'TEA'], [12, 'PARCEL']], B: [[2, 'RIVER'], [3, 'CLOCK'], [5, 'TICKET'], [6, 'WINDOW'], [8, 'CANDLE'], [9, 'MIRROR']] };
const SUSPECTS = {
  A: [
    ['Mira Sen · executive assistant', 'Mira says she left at 10:38 PM after printing the sale contract. She says Adrian was alive and speaking normally when she left. He planned to fire her after the sale.'],
    ['Leon Vale · brother', 'Leon called at 10:44 PM and got no answer. He admits an argument over their father’s collection. A large inheritance was at stake.'],
    ['Priya Khan · journalist', 'Priya says she was in the upstairs guest room from 10:20 to 11:10 PM. She called the livestream glitch “weirdly convenient.” Adrian had threatened to expose a source.'],
  ],
  B: [
    ['Elias Rook · restorer', 'Elias says he left at 10:15 PM. He could access the gallery key system and had repaired the library lock earlier that week. Adrian planned to blame him for damage to a valuable painting.'],
    ['Nora Venn · partner', 'Nora says she was on a video call from 10:30 to 11:20 PM. She says Adrian came downstairs at 10:43 PM for water. Adrian had secretly changed a legal document.'],
  ],
};

function makeGuide(role) {
  const secretWords = TARGETS[role].map(([number, word]) => `${String(number).padStart(2,'0')} · ${word}`).join('\n');
  const caseSuspects = SUSPECTS[role].map(s => `${s[0]}\n${s[1]}`).join('\n\n');
  const observatoryLocks = role === 'A'
    ? `LOCK 01 · CONSTELLATION GRID\nRead ORION, LYRA, CYGNUS, DRACO, TAURUS, GEMINI. Find the constellations with exactly one repeated letter; count their letters in the order shown. Enter a three-digit number.\n\nLOCK 03 · FIVE SWITCHES\nExactly three switches are ON. A is ON iff B is OFF; C is opposite A; D matches B; E is opposite D. Name the three ON switches, then add their alphabet positions.`
    : `LOCK 02 · MIRROR TRANSMISSION\nThe terminal says TIBRO EHT NI KCOL. The signal was reflected. Reverse the text, restore spaces, and read it.\n\nLOCK 04 · STAR MAP\nThe cipher fragment is LXVNC. Use the number from Lock 03 as the key and move backward through the alphabet.`;
  const base = [
    {
      id: 'start', game: 'Before you start', title: 'Two people on the same side.',
      body: `This is your private reading route. You are ${role === 'A' ? 'Player A' : 'Player B'} for all three games. Your partner has a separate route with their own clues. Read this page out loud, paraphrase your private clues, and only reveal a screen when the game asks you to.\n\nNo score matters more than the mood. Every game includes gentle hints and a no-stress way to move on.`,
      hints: ['You can use the Source Library to read every original PDF page.', 'Tap Listen to have your browser read any chapter aloud.'],
    },
    {
      id: 'distance', game: 'The Distance Protocol', title: 'Your private key card',
      body: `The shared word grid is LANTERN · RIVER · CLOCK · ORCHARD · TICKET · WINDOW · COMET · CANDLE · MIRROR · TRAIN · TEA · PARCEL. Your job is to give one-word clues and a number; your partner guesses the target words on your card. You get six targets. Your partner has the other six.\n\nPLAYER ${role} TARGETS\n${secretWords}\n\nNever say a target word in your clue. A clue can point to one word or a small group. It is okay to miss; use a nudge and carry on.`,
      hints: ['Think in categories, not literal objects.', 'Your partner has the other target set. Their words are safe guesses for them.', 'Use a clue that connects several targets. If that is fiddly, give a one-word hint and keep moving.'],
    },
    {
      id: 'case', game: 'The 11:47 Case', title: 'Your suspect cards',
      body: `At 11:47 PM, curator Adrian Vale was found dead in his locked library. Share these suspect cards in your own words, then compare them with your partner’s cards and the shared evidence board. You are co-investigators.\n\n${caseSuspects}\n\nThe full evidence board is on the case page and in the Source Library. Keep guesses kind: the contradictions are deliberate clues, not a test of real forensic knowledge.`,
      hints: role === 'A'
        ? ['A contradiction shows someone lied; it does not always prove murder.', 'Check whether the clock itself can change the meaning of the key log.', 'Compare the key record with the person who repaired the lock.']
        : ['A timestamp can be misleading if the system clock is wrong.', 'The lock-system knowledge matters more than a suspicious-looking alibi.', 'The person who repaired the library lock knew more about the clock.'],
    },
    {
      id: 'observatory', game: 'The Observatory Lock', title: `Your Navigator pages · Player ${role}`,
      body: `${observatoryLocks}\n\nShare the clues out loud; take turns as Navigator and Solver. Keep the five answers on the shared Archive Strip. The playable version follows the validated route from the host guide, with a rescue hint available for every lock.`,
      hints: role === 'A'
        ? ['For Lock 01, focus on repeated letters, not repeating adjacent letters.', 'The relevant constellation counts are 5, 6, and 6.', 'For Lock 03, try B=ON first, then follow each relationship.']
        : ['For Lock 02, read from the last character back to the first.', 'For Lock 04, the key is 9. Shift each letter back by nine places.', 'The decoded word is a familiar object in the night sky.'],
    },
    {
      id: 'small-joy', game: 'When you want an easier round', title: 'A softer way to keep moving.',
      body: `Any time a clue feels sticky, ask your partner to share just one more detail. Take a hint. Use the recovery button. Or take the 60-second beautiful-chaos break from the Distance Protocol and invent a tiny challenge for each other.\n\nFor the Observatory Lock, the game page has a show-the-answer button for each lock. For The 11:47 Case, try the progressive hint ladder or open the gentle solution.`,
      hints: ['A wrong guess is useful information, not lost progress.', 'You can always take a snack or stretch break and return to this page.'],
    },
  ];
  return base;
}

export default function PlayerRoute({ role = 'A', players = {}, onHome, onLibrary, onGoRoute }) {
  const chapters = useMemo(() => makeGuide(role), [role]);
  const [openChapter, setOpenChapter] = useState('start');
  const [hintLevel, setHintLevel] = useState({});
  const [playing, setPlaying] = useState(false);
  const name = players[role] || `Player ${role}`;
  const other = role === 'A' ? 'B' : 'A';
  const otherRoute = role === 'A' ? '/hers' : '/his';
  const openListen = (chapter, key) => {
    if (!('speechSynthesis' in window)) { setPlaying(false); return; }
    if (playing) { window.speechSynthesis.cancel(); setPlaying(false); return; }
    const speech = new SpeechSynthesisUtterance(`${chapter.game}. ${chapter.title}. ${chapter.body}`);
    speech.rate = 0.94; speech.pitch = 1.04;
    speech.onend = () => setPlaying(false);
    speech.onerror = () => setPlaying(false);
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(speech); setPlaying(true); setOpenChapter(key);
  };
  const showHint = chapter => setHintLevel(current => ({ ...current, [chapter.id]: Math.min(chapter.hints.length, (current[chapter.id] || 0) + 1) }));
  const stopAudio = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); setPlaying(false); };
  return <main className="player-route-page" onKeyDown={e => { if (e.key === 'Escape') stopAudio(); }}>
    <nav className="player-nav"><button className="back-link" onClick={onHome}><ArrowLeft size={17} /> Game Club</button><div className="player-route-badge"><UserCircle size={17} /><span>{role === 'A' ? 'HIS ROUTE' : 'HER ROUTE'} · PLAYER {role}</span></div><button className="player-route-switch" onClick={() => { stopAudio(); onGoRoute(otherRoute); }}>Open {role === 'A' ? 'her' : 'his'} clues <ArrowRight size={15} /></button></nav>
    <header className={`player-route-hero player-route-${role.toLowerCase()}`}><div><span className="micro-label">Your own clue book · read privately</span><h1>Hey, {name === `Player ${role}` ? role === 'A' ? 'him' : 'her' : name}.<br /><em>This side is yours.</em></h1><p>Three games, your own pages, and gentle hints that never make you feel stuck.</p><div className="player-route-actions"><Button onClick={() => { setOpenChapter('distance'); document.getElementById('private-chapters')?.scrollIntoView({ behavior: 'smooth' }); }}>Open your first private clue <ArrowRight size={16} /></Button><button onClick={onLibrary}><BookOpenText size={16} /> Read every source page</button></div></div><div className="player-book-art" aria-hidden="true"><BookOpenText size={39} weight="duotone" /><span>{role === 'A' ? 'A' : 'B'}</span><div className="book-orbit" /></div></header>
    <section className="handoff-note"><span className="handoff-icon"><LockKey size={17} /></span><p><b>Private clue etiquette</b> Tap Listen to hear a chapter. Read your own cards quietly, then paraphrase the clue to {players[other] || `Player ${other}`}. Keep your route to yourself until it is time to compare notes.</p><button onClick={() => { stopAudio(); onGoRoute(otherRoute); }}>Their route <ArrowRight size={14} /></button></section>
    <section className="private-chapters" id="private-chapters"><div className="private-heading"><div><span className="micro-label">{role === 'A' ? 'His rulebook' : 'Her rulebook'} · Player {role}</span><h2>All your chapters.<br /><em>All your little hints.</em></h2></div><span className="listen-note"><SpeakerHigh size={16} /> Listen uses your browser’s built-in voice. Nothing is uploaded.</span></div>
      <div className="chapter-list">{chapters.map((chapter, index) => { const isOpen = openChapter === chapter.id; const hintIndex = hintLevel[chapter.id] || 0; return <article className={`private-chapter ${isOpen ? 'chapter-open' : ''}`} key={chapter.id}><button className="chapter-heading" onClick={() => { stopAudio(); setOpenChapter(isOpen ? '' : chapter.id); }} aria-expanded={isOpen}><span className="chapter-index">{String(index + 1).padStart(2,'0')}</span><span><small>{chapter.game}</small><b>{chapter.title}</b></span><span className="chapter-toggle">{isOpen ? '−' : '+'}</span></button>{isOpen && <div className="chapter-content"><div className="chapter-actions"><span className="private-reminder"><LockKey size={14} /> For Player {role}</span><button className="listen-button" onClick={() => openListen(chapter, chapter.id)}>{playing ? <Pause size={15} /> : <Headphones size={15} />}{playing ? 'Stop listening' : 'Listen to this chapter'}</button></div><div className="chapter-text">{chapter.body.split('\n').map((line, i) => line ? <p className={line === line.toUpperCase() && line.length < 65 ? 'chapter-subhead' : ''} key={i}>{line}</p> : <br key={i} />)}</div><div className="route-hint"><div><span className="hint-icon"><Lightbulb size={17} /></span><span><b>{hintIndex ? `Nudge ${hintIndex} of ${chapter.hints.length}` : 'A gentle hint'}</b><small>{hintIndex ? chapter.hints[Math.min(hintIndex - 1, chapter.hints.length - 1)] : 'Open one when you want it. No penalty.'}</small></span></div>{hintIndex < chapter.hints.length && <button onClick={() => showHint(chapter)}>Next hint <ArrowRight size={14} /></button>}</div></div>}</article>; })}</div>
    </section>
    <section className="other-side-callout"><div><span className="micro-label">The rest of the story</span><h2>They have a different half.</h2><p>Your partner’s route contains their own private clues, plus the full read-along source library.</p></div><div className="other-side-controls"><Button kind="soft" onClick={() => { stopAudio(); onGoRoute(otherRoute); }}>Go to {role === 'A' ? 'her' : 'his'} route <ArrowRight size={16} /></Button><Button kind="quiet" onClick={onHome}>Game shelf <Heart size={15} /></Button></div><span className="other-side-star">✳</span></section>
    <footer className="player-route-footer"><button className="back-link" onClick={onHome}><ArrowLeft size={16} /> Return to the game shelf</button><span><Check size={14} /> This route stays in your browser tab.</span></footer>
  </main>;
}
