import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, BookOpenText, Check, GameController, Heart,
  LockKey, MagnifyingGlass, NotePencil, Sparkle, Timer, Train, UserCircle,
} from '@phosphor-icons/react';
import Protocol from './games/Protocol.jsx';
import Case from './games/Case.jsx';
import Observatory from './games/Observatory.jsx';
import Library from './Library.jsx';
import PlayerRoute from './PlayerRoute.jsx';
import { Button, ScreenReaderControl, ThemeToggle } from './components.jsx';

const STORAGE_KEY = 'game-club-night-v1';
const EMPTY = {
  players: { A: 'Him', B: 'Her' },
  progress: { protocol: {}, case: {}, observatory: {} },
};
const GAMES = [
  { id: 'protocol', number: '01', title: 'The Distance Protocol', subtitle: 'The long-distance mystery', description: 'Six clever checkpoints: secret clues, found objects, a future Tuesday, and one shared vault.', time: '75–100 min', tone: 'rose', icon: <Heart size={28} weight="duotone" />, tag: 'The big one', progressKey: 'completed' },
  { id: 'case', number: '02', title: 'The 11:47 Case', subtitle: 'A two-person murder mystery', description: 'Five suspects, seven clues, and a 29-minute clock error hiding in the evidence.', time: '25–40 min', tone: 'lilac', icon: <MagnifyingGlass size={28} weight="duotone" />, tag: 'Read the evidence' },
  { id: 'observatory', number: '03', title: 'The Observatory Lock', subtitle: 'A digital two-person escape room', description: 'Five connected locks, a nightly archive, and gentle nudges all the way to the star map.', time: '35–60 min', tone: 'blue', icon: <Train size={28} weight="duotone" />, tag: 'Board together', progressKey: 'completed' },
];

const GAME_PATHS = { '/play/protocol': 'protocol', '/play/case': 'case', '/play/observatory': 'observatory' };
function currentPath() { return window.location.pathname.replace(/\/$/, '') || '/'; }

function readSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? { ...EMPTY, ...parsed, players: { ...EMPTY.players, ...(parsed.players || {}) }, progress: { ...EMPTY.progress, ...(parsed.progress || {}) } } : EMPTY;
  } catch { return EMPTY; }
}

function currentProgress(game, session) {
  const data = session.progress?.[game.id] || {};
  if (game.id === 'protocol') return `${(data.completed || []).filter(id => id !== 'vault').length}/6 clues`;
  if (game.id === 'case') return data.solved ? 'Case solved' : `${(data.opened || []).filter(item => item.length === 1).length}/7 clues`;
  if (game.id === 'observatory') return data.finished ? 'Archive open' : `${(data.completed || []).length}/5 locks`;
  return '';
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const [path, setPath] = useState(currentPath);
  const [libraryReturn, setLibraryReturn] = useState('/');
  const [libraryDocument, setLibraryDocument] = useState('player-pack');
  const [theme, setTheme] = useState(() => localStorage.getItem('game-club-theme') || 'light');
  const [toast, setToast] = useState('');
  const [namesEditing, setNamesEditing] = useState(false);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); }, [session]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('game-club-theme', theme);
  }, [theme]);
  useEffect(() => { const handlePop = () => setPath(currentPath()); window.addEventListener('popstate', handlePop); return () => window.removeEventListener('popstate', handlePop); }, []);
  useEffect(() => { if (path !== '/' && path !== '/his' && path !== '/hers' && path !== '/library' && !GAME_PATHS[path]) { window.history.replaceState({}, '', '/'); setPath('/'); } }, [path]);
  const navigate = destination => { window.history.pushState({}, '', destination); setPath(destination); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openLibrary = (returnTo, documentId = 'player-pack') => { setLibraryReturn(returnTo || '/'); setLibraryDocument(documentId); navigate('/library'); };
  const globalControls = <div className="global-controls"><ThemeToggle theme={theme} onToggle={() => setTheme(value => value === 'dark' ? 'light' : 'dark')} /><ScreenReaderControl /></div>;
  const gamePlayed = useMemo(() => GAMES.filter(game => {
    const progress = session.progress?.[game.id] || {};
    return game.id === 'protocol' ? (progress.completed || []).length > 0 : game.id === 'case' ? (progress.opened || []).some(item => item.length === 1) || Boolean(progress.solved) : (progress.completed || []).length > 0;
  }).length, [session]);
  const begin = id => navigate(`/play/${id}`);
  const updateGame = id => patcher => setSession(old => {
    const previous = old.progress?.[id] || {};
    const next = typeof patcher === 'function' ? patcher(previous) : { ...previous, ...patcher };
    return { ...old, progress: { ...old.progress, [id]: next } };
  });
  const changeName = (role, name) => setSession(old => ({ ...old, players: { ...old.players, [role]: name.slice(0, 24) } }));
  const reset = () => {
    if (!window.confirm('Reset all saved clues and stories on this browser?')) return;
    setSession(EMPTY); navigate('/'); setToast('A fresh game night is ready.'); window.setTimeout(() => setToast(''), 2500);
  };

  if (path === '/his' || path === '/hers') return <><PlayerRoute role={path === '/his' ? 'A' : 'B'} players={session.players} onHome={() => navigate('/')} onLibrary={() => openLibrary(path)} onGoRoute={navigate} />{globalControls}{toast && <div className="toast-note">{toast}</div>}</>;
  if (path === '/library') return <><Library onBack={() => navigate(libraryReturn)} initialDocument={libraryDocument} />{globalControls}{toast && <div className="toast-note">{toast}</div>}</>;
  const activeGame = GAME_PATHS[path];
  if (activeGame) {
    const sourceDocument = { protocol: 'player-pack', case: 'case-pack', observatory: 'observatory-pack' }[activeGame];
    const props = { data: session.progress?.[activeGame] || {}, update: updateGame(activeGame), onBack: () => navigate('/'), onLibrary: () => openLibrary(path, sourceDocument), onPlayerRoute: navigate };
    return <>{activeGame === 'protocol' ? <Protocol {...props} /> : activeGame === 'case' ? <Case {...props} /> : <Observatory {...props} />}{globalControls}{toast && <div className="toast-note">{toast}</div>}</>;
  }
  return <div className="home-page" id="top">
    <nav className="site-nav"><a className="brandmark" href="#top" aria-label="Game Club home"><span className="brand-heart">✳</span><span>game<span>club</span></span></a><div className="nav-links"><a href="#games">The games</a><a href="#how-it-works">How it works</a><button onClick={() => navigate('/his')}>His route · A</button><button onClick={() => navigate('/hers')}>Her route · B</button><button onClick={() => openLibrary('/') }><BookOpenText size={16} /> Source library</button></div><button className="saved-progress" onClick={() => setNamesEditing(v => !v)}><span className="saved-avatar"><UserCircle size={18} /></span><span>Your team</span><span className="team-progress-dot">{gamePlayed}</span></button></nav>

    <main>
      <section className="hero-section">
        <div className="hero-copy"><span className="hero-eyebrow"><span className="hero-sparkle">✳</span> SAME TEAM. GOOD STORY.</span><h1>Make tonight<br />a <em>little</em> legendary.</h1><p>Three cozy co-op games for two people who have already asked each other “what should we do?” twice.</p><div className="hero-actions"><Button onClick={() => begin('protocol')}>Start the big game <ArrowRight size={17} weight="bold" /></Button><a href="#games">See all three games <ArrowDown size={16} /></a></div><div className="hero-route-links"><button onClick={() => navigate('/his')}>His clue route <ArrowUpRight size={14} /></button><span>·</span><button onClick={() => navigate('/hers')}>Her clue route <ArrowUpRight size={14} /></button></div><div className="hero-reassurance"><Heart size={16} weight="fill" /><span>No score pressure. Hints whenever. Always on the same side.</span></div></div>
        <div className="hero-art" aria-label="An illustrated map of a cozy, mysterious game night">
          <div className="art-star art-star-one">✦</div><div className="art-star art-star-two">✦</div><div className="art-orbit orbit-a"></div><div className="art-orbit orbit-b"></div>
          <div className="hero-ticket"><span className="ticket-stamp">TONIGHT</span><div className="ticket-heart">♡</div><strong>YOU + ME<br />VS. THE MYSTERY</strong><span className="ticket-dash"></span><small>ONE CALL · THREE GAMES</small><div className="ticket-notch ticket-notch-left"></div><div className="ticket-notch ticket-notch-right"></div></div>
          <div className="art-sticker sticker-note"><NotePencil size={17} /> keep this night</div><div className="art-sticker sticker-team"><span>PLAYER A</span><Heart size={13} /> <span>PLAYER B</span></div><div className="orbit-dot dot-one"></div><div className="orbit-dot dot-two"></div>
          <span className="hero-caption">A NIGHT MADE FOR TWO</span>
        </div>
      </section>

      {namesEditing && <section className="team-setup" aria-label="Choose your player names"><div><span className="micro-label">Make it yours</span><h2>Choose your sides.</h2><p>His route is Player A. Her route is Player B. Give the routes names if you like; each gets their own clues, hints, and rulebook.</p></div><label>His route · Player A<input value={session.players.A} onChange={e => changeName('A', e.target.value)} placeholder="Him · Player A" /></label><label>Her route · Player B<input value={session.players.B} onChange={e => changeName('B', e.target.value)} placeholder="Her · Player B" /></label><button className="team-setup-close" onClick={() => setNamesEditing(false)} aria-label="Close player setup">×</button></section>}

      <section className="games-section" id="games"><div className="section-heading"><div><span className="micro-label">Pick your kind of chaos</span><h2>Three stories.<br /><em>One team.</em></h2></div><div className="section-heading-note"><Sparkle size={17} /><p>Start with the big mystery, or grab a shorter game when the snacks are already out.</p></div></div>
        <div className="game-cards">{GAMES.map(game => {
          const progress = currentProgress(game, session);
          const status = (session.progress?.[game.id]?.completed?.length || session.progress?.[game.id]?.opened?.length || session.progress?.[game.id]?.finished || session.progress?.[game.id]?.solved) ? 'in progress' : 'ready when you are';
          return <article className={`game-card game-card-${game.tone}`} key={game.id}><div className="game-card-top"><span className="game-card-index">GAME {game.number}</span><span className="game-card-tag">{game.tag}</span></div><div className="game-card-art"><span className="game-art-icon">{game.icon}</span><span className="game-art-number">{game.number}</span>{game.id === 'protocol' && <span className="game-illustration protocol-ill">T<br />♡</span>}{game.id === 'case' && <span className="game-illustration mystery-ill">?</span>}{game.id === 'observatory' && <span className="game-illustration express-ill">↗</span>}</div><div className="game-card-copy"><span className="micro-label">{game.subtitle}</span><h3>{game.title}</h3><p>{game.description}</p><div className="game-card-foot"><span className="game-runtime"><Timer size={15} /> {game.time}</span><button onClick={() => begin(game.id)}>{status === 'ready when you are' ? 'Play together' : progress}<ArrowUpRight size={16} weight="bold" /></button></div><span className="game-card-status"><i className={status === 'ready when you are' ? '' : 'status-started'} />{status}</span></div></article>;
        })}</div>
      </section>

      <section className="how-section" id="how-it-works"><div className="how-aside"><span className="micro-label">Very easy to start</span><h2>Two people.<br /><em>Zero prep.</em></h2><p>Keep the call open. Take turns reading your private clue. If a puzzle stalls, take the hint. The night never makes you prove anything.</p><button className="how-library" onClick={() => openLibrary('/') }><BookOpenText size={17} /> Read every original guide <ArrowRight size={16} /></button></div><div className="how-steps"><article><span className="step-mark">01</span><div><h3>Use separate routes</h3><p>His clues are at /his and her clues are at /hers. Each route has the correct private pages, hints, and listen-aloud rulebook for Player A or Player B.</p></div><LockKey size={20} /></article><article><span className="step-mark">02</span><div><h3>Play one chapter at a time</h3><p>Each game has a short briefing, clear input fields, gentle rescue hints, and a quick route forward whenever you want one.</p></div><GameController size={20} /></article><article><span className="step-mark">03</span><div><h3>Keep the parts you like</h3><p>Progress saves in this browser. Skip a puzzle, take a snack break, or stop early and come back another night.</p></div><Heart size={20} /></article></div></section>

      <section className="source-ribbon"><div><span className="micro-label">No hunting through PDFs</span><h2>Every page is already<br />easy to read in here.</h2></div><p>All three player packs, role cards, and host guides have their own page-by-page reading view. Private clues and spoilers stay behind a handoff screen.</p><Button kind="light" onClick={() => openLibrary('/')}>Open the source library <BookOpenText size={16} /></Button><div className="ribbon-star">✳</div></section>
    </main>
    <footer className="site-footer"><a className="brandmark" href="#top"><span className="brand-heart">✳</span><span>game<span>club</span></span></a><p>Made for two people on the same side.</p><button onClick={reset}><span>Reset this browser’s progress</span></button><span className="footer-note">Your clues stay in this browser. Nothing syncs or uploads.</span></footer>
    {toast && <div className="toast-note"><Check size={15} /> {toast}</div>}
    {globalControls}
  </div>;
}
