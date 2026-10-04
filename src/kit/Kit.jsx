import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ArrowLeft, CaretDown, Check, Compass, Eye, EyeSlash, Lightbulb, LockKey, Question, Moon, SpeakerHigh, Stop, Sun, X } from '@phosphor-icons/react';
import { useClub, normalize } from './club.js';
import { burstFrom } from './celebrate.js';
import Backdrop from './Backdrop.jsx';
import { WorldPortal, WorldScene, useWorld } from './World.jsx';

export function Button({ children, onClick, kind = 'primary', disabled = false, type = 'button', className = '', ...rest }) {
  return <button type={type} className={`btn btn-${kind} ${className}`} onClick={onClick} disabled={disabled} {...rest}>{children}</button>;
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useClub();
  const dark = theme === 'dark';
  return <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} title={dark ? 'Light mode' : 'Dark mode'}>
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: .25 }} style={{ display: 'grid' }}>
        {dark ? <Sun size={19} weight="duotone" /> : <Moon size={19} weight="duotone" />}
      </motion.span>
    </AnimatePresence>
  </button>;
}

export function RoleChip() {
  const { me, setMe, nameOf } = useClub();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return <div className="role-chip-wrap" ref={ref}>
    <button type="button" className="role-chip" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label="Who is holding this phone">
      {me ? <><span className={`role-dot role-dot-${me}`}>{me}</span><span className="role-chip-name">{nameOf(me)}</span></> : <><span className="role-dot role-dot-unset">?</span><span className="role-chip-name">Pick your side</span></>}<CaretDown size={12} />
    </button>
    <AnimatePresence>{open && <motion.div className="role-pop" initial={{ opacity: 0, y: -6, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .97 }} transition={{ duration: .18 }}>
      <span className="micro">{me ? 'This phone belongs to' : 'Tap your letter'}</span>
      {['A', 'B'].map(role => <button type="button" key={role} className={`role-row ${me === role ? 'is-me' : ''}`} onClick={() => { setMe(role); setOpen(false); }} aria-pressed={me === role}>
        <span className={`role-dot role-dot-${role}`}>{me === role ? <Check size={13} weight="bold" /> : role}</span><b>I’m {nameOf(role)}</b>
      </button>)}
      <p>{me ? `${nameOf(me === 'A' ? 'B' : 'A')} picks the other side on their phone.` : 'Your partner picks the other side on their phone.'}</p>
    </motion.div>}</AnimatePresence>
  </div>;
}

function WhoAreYou() {
  const { setMe, players } = useClub();
  return <motion.div className="who-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <motion.div className="who-card" initial={{ y: 24, scale: .96 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
      <span className="micro">One quick thing</span>
      <h2>Whose phone <em>is this?</em></h2>
      <p>Each of you plays on your own screen. Your private clues only show up on yours.</p>
      <div className="who-choices">{['A', 'B'].map(role => <button type="button" key={role} onClick={() => setMe(role)}><span className={`role-dot role-dot-${role}`}>{role}</span><b>I’m {players[role]}</b></button>)}</div>
    </motion.div>
  </motion.div>;
}

export function GameShell({ title, number, tone = 'rose', backdrop, rules, children }) {
  const { navigate, me } = useClub();
  const world = useWorld();
  const seenKey = `game-club-rules-seen:${world?.id || title}`;
  const [rulesOpen, setRulesOpen] = useState(false);
  useEffect(() => {
    if (!rules || !me) return undefined;
    let seen = false;
    try { seen = localStorage.getItem(seenKey) === '1'; } catch { /* storage unavailable */ }
    if (seen) return undefined;
    const id = setTimeout(() => setRulesOpen(true), world ? 2300 : 300);
    return () => clearTimeout(id);
  }, [rules, me, seenKey, world]);
  const closeRules = () => { setRulesOpen(false); try { localStorage.setItem(seenKey, '1'); } catch { /* storage unavailable */ } };
  return <MotionConfig reducedMotion="user"><div className={`game-shell tone-${tone} ${world ? `world world-${world.id}` : ''}`}>
    {world ? <WorldScene game={world} /> : backdrop && <Backdrop kind={backdrop} />}
    <header className="game-bar">
      <button type="button" className="icon-btn" onClick={() => navigate('/')} aria-label="Back to the game shelf"><ArrowLeft size={18} weight="bold" /></button>
      <div className="game-bar-title"><span className="micro">{number}</span><b>{title}</b></div>
      {rules && <button type="button" className="icon-btn" onClick={() => setRulesOpen(true)} aria-label="How to play"><Question size={19} weight="bold" /></button>}
      <RoleChip />{!world && <ThemeToggle />}
    </header>
    <main className="game-main">{children}</main>
    {rules && <Sheet open={rulesOpen} onClose={closeRules} title={`How to play ${title}`}>{rules}<Button className="rules-go" onClick={closeRules}>Got it, let’s play</Button></Sheet>}
    {world && <WorldPortal game={world} />}
    <AnimatePresence>{!me && <WhoAreYou />}</AnimatePresence>
  </div></MotionConfig>;
}

// rounds: [{ id, label }]; done: array of ids. A round is reachable once every earlier round is done.
export function RoundProgress({ rounds, current, done = [], onSelect, rewards = {} }) {
  return <nav className="round-progress" aria-label="Rounds">{rounds.map((round, index) => {
    const isDone = done.includes(round.id);
    const reachable = index === 0 || rounds.slice(0, index).every(r => done.includes(r.id));
    return <button type="button" key={round.id} className={`rp-step ${index === current ? 'is-current' : ''} ${isDone ? 'is-done' : ''}`} disabled={!reachable} onClick={() => onSelect?.(index)} aria-current={index === current ? 'step' : undefined}>
      <span className="rp-dot">{isDone ? (rewards[round.id] || <Check size={13} weight="bold" />) : reachable ? index + 1 : <LockKey size={12} />}</span>
      <span className="rp-label">{round.label}</span>
    </button>;
  })}</nav>;
}

const BriefSlot = createContext(null);

export function Round({ id, eyebrow, title, intro, children, className = '' }) {
  const [slot, setSlot] = useState(null);
  return <AnimatePresence mode="wait">
    <motion.section key={id} className={`round ${className}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }}>
      {(eyebrow || title || intro) && <header className="round-head">{eyebrow && <span className="micro">{eyebrow}</span>}{title && <h2>{title}</h2>}{intro && <p>{intro}</p>}</header>}
      <div className="round-brief" ref={setSlot} />
      <BriefSlot.Provider value={slot}>{children}</BriefSlot.Provider>
    </motion.section>
  </AnimatePresence>;
}

// Pass a and/or b. Shows only this phone's half; if the clue belongs to the partner, says so.
export function PrivatePanel({ a, b, title = 'Only for you' }) {
  const { me, other, nameOf } = useClub();
  const [shown, setShown] = useState(false);
  const mine = me === 'B' ? b : a;
  useEffect(() => setShown(false), [me]);
  if (!mine) return <div className="private private-theirs"><span className={`role-dot role-dot-${other}`}>{other}</span><p><b>{nameOf(other)} has this clue.</b> Ask them to read it out loud.</p></div>;
  return <div className={`private ${shown ? 'is-shown' : ''}`}>
    <div className="private-head"><span className="private-tag"><LockKey size={13} weight="bold" /> {title} · {nameOf(me)}</span>
      <button type="button" className="private-toggle" onClick={() => setShown(v => !v)}>{shown ? <><EyeSlash size={15} /> Hide</> : <><Eye size={15} /> Peek</>}</button>
    </div>
    <div className="private-body" onClick={() => !shown && setShown(true)}>{mine}</div>
  </div>;
}

// accept: string[] of aliases or (normalizedValue) => boolean.
export function AnswerLock({ accept, onSolve, onChange, onMiss, placeholder = 'Your shared answer', label = 'Lock it in', solved = false, solvedText }) {
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(0);
  const ref = useRef(null);
  if (solved) return <div className="answer-lock is-solved"><Check size={17} weight="bold" /> {solvedText || 'Unlocked'}</div>;
  const check = v => typeof accept === 'function' ? accept(normalize(v)) : accept.map(normalize).includes(normalize(v));
  const submit = e => {
    e.preventDefault();
    if (!value.trim()) return;
    if (check(value)) { burstFrom(ref.current); onSolve?.(value); setValue(''); setWrong(0); }
    else { setWrong(n => n + 1); onMiss?.(value); }
  };
  return <form ref={ref} className="answer-lock" onSubmit={submit}>
    <input key={wrong} className={wrong ? 'is-wrong' : ''} value={value} onChange={e => { setValue(e.target.value); onChange?.(e.target.value); }} placeholder={placeholder} aria-label={placeholder} autoComplete="off" autoCapitalize="characters" spellCheck="false" />
    <Button type="submit" disabled={!value.trim()}>{label}</Button>
    <AnimatePresence>{wrong > 0 && <motion.span className="answer-miss" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>Not quite. No penalty, try again.</motion.span>}</AnimatePresence>
  </form>;
}

// level = hints revealed so far (persist it in game state). onReveal gives the answer.
export function HintLadder({ hints = [], level = 0, onLevel, onReveal, revealLabel = 'Show the answer' }) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setConfirm(false), [level]);
  return <div className="hints">
    <AnimatePresence initial={false}>{hints.slice(0, level).map((hint, i) => <motion.p key={i} className="hint" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}><Lightbulb size={15} weight="duotone" /><span><b>Hint {i + 1}</b> {hint}</span></motion.p>)}</AnimatePresence>
    <div className="hints-actions">
      {level < hints.length && <Button kind="ghost" onClick={() => onLevel?.(level + 1)}><Lightbulb size={15} /> {level ? `Another hint (${level + 1}/${hints.length})` : 'Need a hint?'}</Button>}
      {onReveal && level >= hints.length && <Button kind="ghost" onClick={() => confirm ? onReveal() : setConfirm(true)}>{confirm ? 'Sure? Tap again' : revealLabel}</Button>}
    </div>
  </div>;
}

export function ReadTextButton({ text, audioSrc, label = 'Listen' }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const stop = () => { audioRef.current?.pause(); audioRef.current = null; window.speechSynthesis?.cancel(); setPlaying(false); };
  useEffect(() => stop, []);
  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(typeof text === 'function' ? text() : text);
    u.rate = .92;
    const voices = window.speechSynthesis.getVoices();
    u.voice = voices.find(v => /^en/i.test(v.lang) && /natural|samantha|serena|aria|google us/i.test(v.name)) || voices.find(v => /^en/i.test(v.lang)) || null;
    u.onend = u.onerror = () => setPlaying(false);
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); setPlaying(true);
  };
  const toggle = () => {
    if (playing) return stop();
    if (!audioSrc) return speak();
    const audio = new Audio(audioSrc); audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.play().then(() => setPlaying(true)).catch(speak);
  };
  return <button type="button" className="listen-btn" onClick={toggle} aria-pressed={playing}>{playing ? <Stop size={14} weight="fill" /> : <SpeakerHigh size={15} weight="duotone" />}{playing ? 'Stop' : label}</button>;
}

const toText = node => typeof node === 'string' ? node : '';

// What to do this round. Renders at the top of the enclosing Round, open by default.
export function HowItWorks({ children, speak, title = 'What to do' }) {
  const slot = useContext(BriefSlot);
  const box = <details className="howto" open>
    <summary><span className="howto-title"><Compass size={17} weight="duotone" /> {title}</span><CaretDown size={14} /></summary>
    <div className="howto-body">{children}{(speak || toText(children)) && <ReadTextButton text={speak || toText(children)} />}</div>
  </details>;
  return slot ? createPortal(box, slot) : box;
}

// Whole-game rules; GameShell shows them in a sheet behind the ? button.
export function GameRules({ steps = [], audioSrc }) {
  const speech = steps.map(s => `${s.title}. ${s.text}`).join(' ');
  return <div className="game-rules">
    <ol>{steps.map(step => <li key={step.title}><b>{step.title}</b><p>{step.text}</p></li>)}</ol>
    <ReadTextButton text={speech} audioSrc={audioSrc} label="Listen to the rules" />
  </div>;
}

export function Finale({ eyebrow = 'You did it', title, children, onReplay, replayLabel = 'Play again' }) {
  const ref = useRef(null);
  useEffect(() => { const id = setTimeout(() => burstFrom(ref.current, { count: 110 }), 250); return () => clearTimeout(id); }, []);
  return <motion.section ref={ref} className="finale" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 20 }}>
    <span className="finale-seal"><Check size={28} weight="bold" /></span>
    <span className="micro">{eyebrow}</span>
    <h2>{title}</h2>
    {children}
    {onReplay && <Button kind="ghost" onClick={onReplay}>{replayLabel}</Button>}
  </motion.section>;
}

export function Sheet({ open, onClose, title, children }) {
  return createPortal(<AnimatePresence>{open && <motion.div className="sheet-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.div className="sheet" onClick={e => e.stopPropagation()} initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}>
      <header><b>{title}</b><button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button></header>
      {children}
    </motion.div>
  </motion.div>}</AnimatePresence>, document.querySelector('.game-shell') || document.body);
}
