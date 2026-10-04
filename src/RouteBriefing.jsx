import { useState } from 'react';
import { ArrowRight, BookOpenText, Check, Compass, SpeakerHigh, Timer } from '@phosphor-icons/react';
import { ReadTextButton } from './components.jsx';

const BOOK_ROUTES = [
  { role: 'A', label: 'A · his clue book' },
  { role: 'B', label: 'B · her clue book' },
];

export default function RouteBriefing({
  variant, number, name, subtitle, time, objective, whatYouNeed, steps, rulebook,
  roles, nodes, selectedRole, onSelectRole, onStart, onReadRulebook,
  onReadPlayerRoute, audioSrc, tagline,
}) {
  const [preview, setPreview] = useState(0);
  const activeNode = nodes[Math.min(preview, nodes.length - 1)];
  const selected = roles[selectedRole || 'A'];
  const spokenRules = [name, subtitle, objective, whatYouNeed,
    ...steps.flatMap(step => [step.title, step.text]),
    ...rulebook.flatMap(item => [item.title, item.text]),
  ].join('. ');

  return <section className={`route-briefing route-briefing-${variant}`}>
    <section className={`briefing-scene briefing-scene-${variant}`} aria-label={`${name} illustrated game scene`}>
      <div className="briefing-scene-top"><span>{number} <i>·</i> {variant === 'paper' ? 'THE FOLDED MAP' : variant === 'case' ? 'EVIDENCE ROOM' : 'THE NIGHT SKY'}</span><span><Timer size={14} /> {time}</span></div>
      <div className="briefing-cover-copy"><span className="micro-label">{variant === 'paper' ? 'A paper trail for two' : variant === 'case' ? 'A locked-room mystery' : 'An observatory after dark'}</span><h2>{tagline}</h2><p>{subtitle}</p></div>

      <div className={`briefing-map briefing-map-${variant}`} aria-label="Choose a chapter to preview">
        {variant === 'paper' && <><span className="paper-map-fold"/><span className="paper-map-stamp">T<br/><small>TOGETHER</small></span><span className="paper-map-postmark">DISTANCE<br/>PROTOCOL</span></>}
        {variant === 'case' && <><span className="case-board-thread thread-one"/><span className="case-board-thread thread-two"/><span className="case-board-thread thread-three"/><span className="case-board-watermark">11:47</span></>}
        {variant === 'orbit' && <><span className="briefing-orbit-ring orbit-ring-one"/><span className="briefing-orbit-ring orbit-ring-two"/><span className="briefing-orbit-ring orbit-ring-three"/><span className="briefing-orbit-core"><Compass size={31} weight="duotone"/></span><span className="briefing-orbit-comet"/></>}
        {nodes.map((node, index) => <button key={node.title} className={`briefing-node briefing-node-${variant} ${preview === index ? 'is-selected' : ''}`} style={{ '--node-x': `${node.position[0]}%`, '--node-y': `${node.position[1]}%`, '--node-delay': `${index * 110}ms` }} onClick={() => setPreview(index)} aria-pressed={preview === index} aria-label={`Preview ${node.title}`}>
          <span className="briefing-node-icon">{node.icon}</span><b>{node.title}</b><small>{String(index + 1).padStart(2, '0')}</small>
        </button>)}
      </div>

      <div className="briefing-preview" aria-live="polite"><span className="briefing-preview-index">{String(preview + 1).padStart(2, '0')}</span><div><small>CHAPTER PREVIEW</small><b>{activeNode.title}</b><p>{activeNode.preview}</p></div><button className="briefing-enter-button" onClick={() => onStart(selectedRole || 'A')}>Play now <ArrowRight size={15}/></button></div>
      <span className="briefing-scene-footnote">{variant === 'paper' ? 'Six chapters · one shared ending' : variant === 'case' ? 'Five suspects · seven pieces of evidence' : 'Five locks · the station never closes'}</span>
    </section>

    <div className="briefing-console">
      <div className="briefing-player-control"><span className="briefing-console-label">FIRST READER</span><div className="briefing-player-switch" role="group" aria-label="Choose the first player">{['A', 'B'].map(role => <button key={role} className={selectedRole === role ? 'selected' : ''} onClick={() => onSelectRole(role)} aria-pressed={selectedRole === role}><span>{selectedRole === role ? <Check size={13} weight="bold"/> : role}</span>{role === 'A' ? 'Player A' : 'Player B'}</button>)}</div><p>{selected?.summary}</p></div>
      <div className="briefing-console-links">{BOOK_ROUTES.map(item => <button key={item.role} onClick={() => onReadPlayerRoute(item.role)}>{item.label}<ArrowRight size={13}/></button>)}</div>
      <div className="briefing-console-actions"><ReadTextButton text={spokenRules} audioSrc={audioSrc} label="Listen to rules"/><button className="briefing-source-link" onClick={onReadRulebook}><BookOpenText size={15}/> Source pages</button></div>
    </div>

    <details className="briefing-rules"><summary><span><SpeakerHigh size={16}/> Need the full rundown?</span><span>{steps.length} quick steps <i>·</i> full rules</span></summary>
      <div className="briefing-steps">{steps.map((step, index) => <article key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><div><b>{step.title}</b><p>{step.text}</p></div></article>)}</div>
      <details className="briefing-rulebook"><summary><BookOpenText size={15}/> Read every rule</summary><div>{rulebook.map((item, index) => <article key={`${item.title}-${index}`}><b>{item.title}</b><p>{item.text}</p></article>)}</div></details>
    </details>
  </section>;
}
