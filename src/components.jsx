import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenText, Check, Lightbulb, LockKey, Moon, Sparkle, SpeakerHigh, Stop, Sun, Timer } from '@phosphor-icons/react';

export function Button({ children, onClick, kind = 'dark', disabled = false, type = 'button', className = '' }) {
  return <button type={type} className={`button button-${kind} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return <button className="theme-toggle" type="button" onClick={onToggle} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`} title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
    {isDark ? <Sun size={19} weight="duotone" /> : <Moon size={19} weight="duotone" />}
    <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
  </button>;
}

export function ReadTextButton({ text, className = '', label = 'Listen to this' }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);
  const toggle = () => {
    if (!('speechSynthesis' in window)) return;
    if (playing) { window.speechSynthesis.cancel(); setPlaying(false); return; }
    const currentText = typeof text === 'function' ? text() : text;
    const utterance = new SpeechSynthesisUtterance(currentText || 'There is no text to read on this screen.');
    utterance.rate = 0.88;
    utterance.pitch = 0.98;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(voice => /^en(-|_)/i.test(voice.lang) && /natural|samantha|serena|aria|google us|daniel/i.test(voice.name))
      || voices.find(voice => /^en(-|_)/i.test(voice.lang))
      || null;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  };
  return <button type="button" className={`read-text-button ${className}`} onClick={toggle} aria-pressed={playing}>
    {playing ? <Stop size={17} weight="fill" /> : <SpeakerHigh size={18} weight="duotone" />}
    <span>{playing ? 'Stop voice' : label}</span>
  </button>;
}

export function ScreenReaderControl() {
  const speakScreen = () => {
    const screen = document.querySelector('.instructions-screen, .reader-page, .game-shell, .player-route-page, .library-page, .home-page');
    return screen?.innerText || document.body.innerText;
  };
  return <ReadTextButton className="screen-reader-control" text={speakScreen} label="Read screen aloud" />;
}

export function GameFrame({ title, eyebrow, subtitle, icon, color = 'rose', onBack, aside, children }) {
  return <main className={`game-shell tone-${color}`}>
    <div className="game-topbar">
      <button className="back-link" onClick={onBack}><ArrowLeft size={17} weight="bold" /> <span>Game shelf</span></button>
      <div className="game-topbar-right">{aside}</div>
    </div>
    <header className="game-heading">
      <div className="game-heading-copy">
        <span className="micro-label">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="game-heading-mark" aria-hidden="true">{icon}</div>
    </header>
    {children}
  </main>;
}

export function HintBox({ hints = [], index = 0, onReveal, recovery, onRecovery, recoveryLabel = 'Give us the key and keep going' }) {
  return <section className="hint-box">
    <div className="hint-copy"><span className="hint-icon"><Lightbulb size={18} weight="duotone" /></span><div><strong>Need a nudge?</strong><p>{index > 0 ? hints[Math.min(index - 1, hints.length - 1)] : 'Open one gentle hint at a time. No points lost.'}</p></div></div>
    <div className="hint-actions">
      {index < hints.length && <Button kind="quiet" onClick={onReveal}><Lightbulb size={16} /> Hint {index ? `${index + 1} of ${hints.length}` : 'me'}</Button>}
      {recovery && <Button kind="soft" onClick={onRecovery}><Sparkle size={16} /> {recoveryLabel}</Button>}
    </div>
  </section>;
}

export function StageRail({ items, active, completed, onSelect }) {
  return <nav className="stage-rail" aria-label="Game chapters">{items.map((item, index) => {
    const done = completed.includes(item.id);
    const allowed = index === 0 || completed.includes(items[index - 1].id);
    return <button key={item.id} onClick={() => onSelect(index)} disabled={!allowed} className={`stage-link ${active === index ? 'is-active' : ''} ${done ? 'is-done' : ''}`} aria-current={active === index ? 'step' : undefined}>
      <span className="stage-dot">{done ? <Check size={14} weight="bold" /> : allowed ? String(index + 1).padStart(2, '0') : <LockKey size={13} />}</span><span>{item.short}</span><span className="stage-arrow"><ArrowRight size={14} /></span>
    </button>;
  })}</nav>;
}

export function useCountdown(totalSeconds) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || remaining <= 0) return undefined;
    const id = window.setInterval(() => setRemaining(current => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running, remaining]);
  const reset = () => { setRemaining(totalSeconds); setRunning(false); };
  const toggle = () => setRunning(current => !current);
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return { remaining, running, time: `${mm}:${ss}`, reset, toggle };
}

export function Countdown({ seconds = 240, label = 'Four-minute search', className = '' }) {
  const timer = useCountdown(seconds);
  return <div className={`countdown ${timer.remaining === 0 ? 'countdown-done' : ''} ${className}`}>
    <div><span className="micro-label">{label}</span><strong className="countdown-time">{timer.time}</strong></div>
    <div className="countdown-actions"><button className="timer-button" onClick={timer.toggle} aria-label={timer.running ? 'Pause timer' : 'Start timer'}>{timer.running ? 'Pause' : 'Start'}</button><button className="timer-reset" onClick={timer.reset} aria-label="Reset timer">Reset</button></div>
  </div>;
}

export function CheckpointFooter({ completed = false, letter, onComplete, disabled = false, label = 'We did it' }) {
  return <div className={`checkpoint-footer ${completed ? 'checkpoint-finished' : ''}`}>
    <div>{completed ? <><span className="earned-chip"><Check size={14} weight="bold" /> KEY EARNED · {letter}</span><p>That's one more piece of your final word.</p></> : <><span className="micro-label">No perfect score needed</span><p>Finish the moment together, then take the letter.</p></>}</div>
    {!completed && <Button onClick={onComplete} disabled={disabled}>{label}<ArrowRight size={17} weight="bold" /></Button>}
  </div>;
}

export function GameInstructions({
  number, name, subtitle, time, objective, whatYouNeed, steps, rulebook, roles,
  selectedRole, onSelectRole, onStart, onReadRulebook, onReadPlayerRoute,
}) {
  const selected = roles[selectedRole || 'A'];
  const spokenRules = [name, subtitle, `What this game is about: ${objective}`, `What you need: ${whatYouNeed}`,
    `Who plays each side: Player A, ${roles.A.name}. ${roles.A.summary}. Player B, ${roles.B.name}. ${roles.B.summary}.`,
    'How to play:', ...steps.flatMap((step, i) => [`Step ${i + 1}. ${step.title}.`, step.text]),
    'Full rules:', ...rulebook.flatMap(item => [`${item.title}.`, item.text]),
    'Hints are always allowed. You can pause or take the answer any time.'].join(' ');
  return <section className="instructions-screen">
    <header className="instructions-hero">
      <span className="micro-label">{number} · before you play</span>
      <h2>Here’s the whole game<br /><em>in plain English.</em></h2>
      <p>{objective}</p>
      <div className="instructions-hero-actions"><span className="instructions-time"><Timer size={16} /> About {time} <i /> Pause whenever you want</span><ReadTextButton text={spokenRules} label="Listen to the rules" /></div>
    </header>
    <div className="instructions-facts">
      <article><span className="micro-label">What you’re doing</span><p>{objective}</p></article>
      <article><span className="micro-label">What to have nearby</span><p>{whatYouNeed}</p></article>
    </div>
    <section className="choose-side"><div className="instructions-section-title"><div><span className="micro-label">Pick your side before the first clue</span><h3>Who’s reading this screen?</h3></div><span className="side-prompt">You can switch players any time.</span></div>
      <div className="side-choice-grid">{['A', 'B'].map(role => <article className={`side-choice-card ${selectedRole === role ? 'side-choice-active' : ''}`} key={role}><button className="side-choice-select" onClick={() => onSelectRole(role)} aria-pressed={selectedRole === role}><span className="side-choice-check">{selectedRole === role ? <Check size={17} weight="bold" /> : role}</span><span><small>{role === 'A' ? 'HIS SIDE · PLAYER A' : 'HER SIDE · PLAYER B'}</small><b>{roles[role].name}</b><em>{roles[role].summary}</em></span><span className="side-choice-radio" /></button><button className="side-choice-book" onClick={() => onReadPlayerRoute(role)}>Read {role === 'A' ? 'his' : 'her'} complete clue book <ArrowRight size={15} /></button></article>)}</div>
    </section>
    <section className="instructions-steps"><div className="instructions-section-title"><div><span className="micro-label">The rules</span><h3>Do these in order.</h3></div><span className="side-prompt">There’s no way to lose progress.</span></div><div className="how-to-list">{steps.map((step, i) => <article key={step.title}><span>{String(i + 1).padStart(2, '0')}</span><div><b>{step.title}</b><p>{step.text}</p></div></article>)}</div></section>
    <details className="full-rulebook" open><summary><BookOpenText size={18} /> Read the full game rules <span>Tap to close or reopen</span></summary><div className="full-rulebook-body">{rulebook.map((item, i) => <article key={`${item.title}-${i}`}><b>{item.title}</b><p>{item.text}</p></article>)}</div></details>
    <div className="instructions-help"><span className="help-bulb"><Lightbulb size={19} /></span><div><b>Hints are always allowed.</b><p>Ask for one, then another. If a puzzle stops being fun, tap the rescue button and take the answer. There are no penalties.</p></div><Button kind="quiet" onClick={onReadRulebook}><BookOpenText size={16} /> Open the original PDF pages</Button></div>
    <div className="instructions-start"><div><span className="micro-label">Ready as {selected?.name}?</span><p>Your first screen will show only the current chapter. You can reopen these rules from the top of the game at any time.</p></div><Button onClick={() => onStart(selectedRole || 'A')}>Start {name} <ArrowRight size={18} weight="bold" /></Button></div>
  </section>;
}
