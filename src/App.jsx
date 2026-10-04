import { useEffect, useMemo, useState } from 'react';
import { ClubContext, PLAYERS } from './kit/club.js';
import { GAMES, gameById } from './games/registry.js';
import Home from './Home.jsx';
import { WorldContext } from './kit/World.jsx';

const STORAGE_KEY = 'game-club-night-v1';
const EMPTY = { me: null, last: null, progress: {} };

function readSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return EMPTY;
    return { ...EMPTY, me: parsed.me ?? null, last: parsed.last ?? null, progress: { ...(parsed.progress || {}) } };
  } catch { return EMPTY; }
}

const currentPath = () => window.location.pathname.replace(/\/$/, '') || '/';
const gameIdFrom = path => path.match(/^\/play\/([a-z]+)$/)?.[1];

export default function App() {
  const [session, setSession] = useState(readSession);
  const [path, setPath] = useState(currentPath);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('game-club-theme') || 'light'; } catch { return 'light'; } });

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch { /* storage unavailable */ } }, [session]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('game-club-theme', theme); } catch { /* storage unavailable */ }
  }, [theme]);
  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const activeGame = gameById(gameIdFrom(path));
  useEffect(() => {
    if (path !== '/' && !activeGame) { window.history.replaceState({}, '', '/'); setPath('/'); }
  }, [path, activeGame]);

  const navigate = destination => {
    const go = () => { window.history.pushState({}, '', destination); setPath(destination); window.scrollTo({ top: 0 }); };
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(go);
    else go();
  };

  const club = useMemo(() => ({
    me: session.me,
    setMe: me => setSession(old => ({ ...old, me })),
    players: PLAYERS,
    theme,
    toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
    navigate,
  }), [session.me, theme]);

  const updateGame = id => patcher => setSession(old => {
    const previous = old.progress?.[id] || {};
    const next = typeof patcher === 'function' ? patcher(previous) : patcher;
    return { ...old, last: id, progress: { ...old.progress, [id]: { ...previous, ...(next || {}) } } };
  });
  const resetAll = () => setSession(old => ({ ...EMPTY, me: old.me }));

  let page;
  if (activeGame) {
    const Game = activeGame.mod.default;
    page = <WorldContext.Provider value={activeGame}><Game key={activeGame.id} data={session.progress?.[activeGame.id] || {}} update={updateGame(activeGame.id)} /></WorldContext.Provider>;
  } else {
    page = <Home games={GAMES} session={session} onReset={resetAll} />;
  }
  return <ClubContext.Provider value={club}>{page}</ClubContext.Provider>;
}
