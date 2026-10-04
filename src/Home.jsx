import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUpRight, Flower, Heart, MagnifyingGlass, MusicNotes, Lamp, MoonStars, Timer, Envelope } from '@phosphor-icons/react';
import { useClub } from './kit/club.js';
import { RoleChip, ThemeToggle } from './kit/Kit.jsx';
import { progressOf } from './games/registry.js';

const ICONS = {
  protocol: <Heart size={22} weight="duotone" />, case: <MagnifyingGlass size={22} weight="duotone" />, observatory: <MoonStars size={22} weight="duotone" />,
  musicbox: <MusicNotes size={22} weight="duotone" />, maze: <Lamp size={22} weight="duotone" />, train: <Envelope size={22} weight="duotone" />, herbarium: <Flower size={22} weight="duotone" />,
};

function GameCard({ game, data, index, wide }) {
  const { navigate } = useClub();
  const p = progressOf(game, data);
  const started = p.done > 0 || p.finished;
  const label = p.finished ? 'Play again' : started ? `Continue · ${p.done}/${p.total}` : 'Play together';
  const rx = useSpring(0, { stiffness: 200, damping: 20 });
  const ry = useSpring(0, { stiffness: 200, damping: 20 });
  const tilt = e => {
    if (e.pointerType !== 'mouse') return;
    const box = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - box.left) / box.width - .5) * 6);
    rx.set(-((e.clientY - box.top) / box.height - .5) * 6);
  };
  return <motion.article className={`game-card tone-${game.tone} ${wide ? 'game-card-wide' : ''}`} style={{ rotateX: rx, rotateY: ry }}
    onPointerMove={tilt} onPointerLeave={() => { rx.set(0); ry.set(0); }}
    initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }}
    transition={{ type: 'spring', stiffness: 150, damping: 20, delay: (index % 3) * .07 }}>
    <button type="button" className="game-card-hit" onClick={() => navigate(`/play/${game.id}`)} aria-label={`${label}: ${game.title}`} />
    <div className="game-card-top"><span className="game-card-index">GAME {game.number}</span><span className="game-card-tag">{game.tag}</span></div>
    <div className="game-card-art"><img src={game.image} alt="" loading="lazy" onError={e => { e.currentTarget.style.opacity = 0; }} /><span className="game-cover-shade" /><span className="game-art-icon">{ICONS[game.id]}</span><span className="game-cover-label">{game.label}</span></div>
    <div className="game-card-copy">
      <span className="micro">{game.subtitle}</span>
      <h3>{game.title}</h3>
      <p>{game.description}</p>
      <div className="game-card-foot"><span className="game-runtime"><Timer size={15} /> {game.time}</span><span className={`game-card-go ${started ? 'is-started' : ''}`}>{label}<ArrowUpRight size={15} weight="bold" /></span></div>
    </div>
  </motion.article>;
}

function HeroArt() {
  const { players } = useClub();
  const ref = useRef(null);
  const mx = useSpring(useMotionValue(0), { stiffness: 70, damping: 14 });
  const my = useSpring(useMotionValue(0), { stiffness: 70, damping: 14 });
  const back = { x: useTransform(mx, v => v * -14), y: useTransform(my, v => v * -14) };
  const front = { x: useTransform(mx, v => v * 18), y: useTransform(my, v => v * 18) };
  const move = e => {
    const box = ref.current?.getBoundingClientRect(); if (!box) return;
    mx.set((e.clientX - box.left) / box.width - .5); my.set((e.clientY - box.top) / box.height - .5);
  };
  return <div className="hero-art" ref={ref} onPointerMove={move} onPointerLeave={() => { mx.set(0); my.set(0); }} aria-hidden="true">
    <motion.div className="hero-art-back" style={back}><div className="art-orbit orbit-a" /><div className="art-orbit orbit-b" /><div className="orbit-dot dot-one" /><div className="orbit-dot dot-two" /></motion.div>
    <div className="art-star art-star-one">✦</div><div className="art-star art-star-two">✦</div>
    <motion.div className="hero-ticket-wrap" style={front} initial={{ opacity: 0, y: 30, rotate: -12 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 110, damping: 13, delay: .15 }} whileHover={{ scale: 1.03 }}>
      <div className="hero-ticket"><span className="ticket-stamp">TONIGHT</span><div className="ticket-heart">♡</div><strong className="ticket-names"><span>{players.A}</span><i>♡</i><span>{players.B}</span></strong><span className="ticket-vs">vs. the mystery</span><span className="ticket-dash" /><small>ONE CALL · SEVEN GAMES</small><div className="ticket-notch ticket-notch-left" /><div className="ticket-notch ticket-notch-right" /></div>
    </motion.div>
  </div>;
}

export default function Home({ games, session, onReset }) {
  const { navigate } = useClub();
  const [confirm, setConfirm] = useState(false);
  const last = games.find(g => g.id === session.last);
  const resume = last && !progressOf(last, session.progress?.[last.id]).finished ? last : null;
  const toShelf = () => document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' });
  return <div className="home-page" id="top">
    <nav className="site-nav">
      <a className="brandmark" href="#top" aria-label="Game Club home"><span className="brand-heart">✳</span><span>game<span>club</span></span></a>
      <div className="site-nav-right"><RoleChip /><ThemeToggle /></div>
    </nav>
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="hero-eyebrow"><span className="hero-sparkle">✳</span> SAME TEAM. GOOD STORY.</span>
          <h1>Make tonight<br />a <em>little</em> legendary.</h1>
          <p>Seven co-op games for two phones and one call. Each of you holds half the clues, so you have to talk your way through.</p>
          <div className="hero-actions">
            {resume
              ? <button type="button" className="btn btn-dark" onClick={() => navigate(`/play/${resume.id}`)}>Continue {resume.title} <span className="btn-orb"><ArrowRight size={15} weight="bold" /></span></button>
              : <button type="button" className="btn btn-dark" onClick={toShelf}>Pick tonight’s game <span className="btn-orb"><ArrowDown size={15} weight="bold" /></span></button>}
          </div>
        </div>
        <HeroArt />
      </section>
      <section className="games-section" id="games">
        <div className="section-heading"><span className="micro">Pick your kind of chaos</span><h2>Seven stories.<br /><em>One team.</em></h2></div>
        <div className="game-cards">{games.map((game, i) => <GameCard key={game.id} game={game} data={session.progress?.[game.id]} index={i} wide={i === 0 || i === games.length - 1} />)}</div>
      </section>
    </main>
    <footer className="site-footer">
      <a className="brandmark" href="#top"><span className="brand-heart">✳</span><span>game<span>club</span></span></a>
      <p>Made for two people on the same side.</p>
      {confirm
        ? <span className="reset-confirm">Wipe this phone’s progress? <button type="button" onClick={() => { onReset(); setConfirm(false); }}>Yes, reset</button><button type="button" onClick={() => setConfirm(false)}>Keep it</button></span>
        : <button type="button" className="reset-link" onClick={() => setConfirm(true)}>Reset progress</button>}
    </footer>
  </div>;
}
