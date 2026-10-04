import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenText, Eye, EyeSlash, LockKey, NotePencil, ShieldWarning } from '@phosphor-icons/react';
import { Button, ReadTextButton, ThemeToggle } from './components.jsx';
import { documents } from './data/library.js';

export default function Library({ onBack, initialDocument = 'player-pack', theme, onToggleTheme }) {
  const [documentId, setDocumentId] = useState(initialDocument);
  const [pageIndex, setPageIndex] = useState(0);
  const [hostOpen, setHostOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const current = useMemo(() => documents.find(doc => doc.id === documentId), [documentId]);
  const page = current?.pages[pageIndex];
  const privateDocument = Boolean(current?.private);
  const selectDoc = id => { setDocumentId(id); setPageIndex(0); setHostOpen(false); setCardOpen(false); setNotice(''); };
  const move = delta => { setPageIndex(index => Math.max(0, Math.min(current.pages.length - 1, index + delta))); setCardOpen(false); };
  return <main className="library-page">
    <div className="game-topbar"><button className="back-link" onClick={onBack}><ArrowLeft size={17} weight="bold" /> <span>Back to your games</span></button><div className="game-topbar-right"><span className="library-topmark"><BookOpenText size={17} /> Protocol library</span><ThemeToggle theme={theme} onToggle={onToggleTheme} className="nav-theme-toggle" /></div></div>
    <header className="library-header"><div><span className="micro-label">A calm read-through</span><h1>Every page,<br /><em>in plain sight.</em></h1><p>The player pack, both separate key cards, and the full host guide are here. Read one page at a time so nothing spoils the next surprise by accident.</p></div><div className="library-art" aria-hidden="true"><BookOpenText size={43} weight="duotone" /><span>✳</span></div></header>
    <div className="library-tabs">{documents.map(doc => <button key={doc.id} className={`${doc.id === documentId ? 'active' : ''} ${doc.private ? 'tab-private' : ''}`} onClick={() => selectDoc(doc.id)}><span>{doc.private && <LockKey size={14} />}{doc.title}</span><small>{doc.subtitle}</small></button>)}</div>
    <section className="reader-shell">
      <div className="reader-toolbar"><div className="reader-doc-label"><span className="micro-label">{current.title}</span><strong>{pageIndex + 1}<small> / {current.pages.length}</small></strong></div><div className="reader-toolbar-actions"><ReadTextButton text={`${page[0]}. ${page[1]}`} label="Listen to this page" />{privateDocument && <span className="reader-private-label"><LockKey size={14} /> PRIVATE MATERIAL</span>}</div></div>
      {privateDocument && !hostOpen ? <div className="spoiler-gate"><span className="spoiler-symbol"><ShieldWarning size={22} /></span><span className="micro-label">Keep the reveal kind</span><h2>{documentId === 'host-guide' ? 'This guide contains every answer.' : 'These cards belong to different players.'}</h2><p>{documentId === 'host-guide' ? 'Open only when you want rescue hints, scoring, and the final passcode.' : 'Show a player only their own card. Ask the other person to look away before you reveal it.'}</p><Button kind="berry" onClick={() => { setHostOpen(true); setNotice(documentId === 'host-guide' ? 'Host guide open. Keep this page private until you both want the reveal.' : 'Cards open. Read only your assigned page; hide it before handing over.'); }}>I understand · show this document <Eye size={16} /></Button></div> : <>
        {documentId === 'private-keys' && !cardOpen ? <div className="spoiler-gate card-pick-gate"><span className="micro-label">Pick your role card</span><h2>Player A or Player B?</h2><p>Only open the page assigned to you. Each role sees a different set of targets.</p><div className="role-pick-row"><Button kind="berry" onClick={() => { setPageIndex(0); setCardOpen(true); }}>Reveal Player A card</Button><Button kind="soft" onClick={() => { setPageIndex(1); setCardOpen(true); }}>Reveal Player B card</Button></div></div> : <article className={`reader-page ${privateDocument ? 'reader-page-private' : ''}`}>
          <div className="reader-page-heading"><span className="page-index">PAGE {String(pageIndex + 1).padStart(2, '0')}</span><h2>{page[0]}</h2><span className="reader-bookmark">GAME CLUB · SOURCE NOTES</span></div>
          <div className="reader-content">{page[1].split('\n').map((line, index) => line ? <p key={index} className={line === line.toUpperCase() && line.length < 70 && /[A-Z]/.test(line) ? 'reader-subhead' : ''}>{line}</p> : <br key={index} />)}</div>
        </article>}
      </>}
      {notice && <div className="reader-notice"><Eye size={15} /> {notice}<button onClick={() => { setHostOpen(false); setCardOpen(false); setNotice(''); }}>Hide private page <EyeSlash size={15} /></button></div>}
      <div className="reader-pagination"><Button kind="quiet" onClick={() => move(-1)} disabled={pageIndex === 0}><ArrowLeft size={16} /> Previous page</Button><span>{current.pages.map((_, index) => <button aria-label={`Go to page ${index + 1}`} key={index} onClick={() => { setPageIndex(index); setCardOpen(false); }} className={index === pageIndex ? 'active-page-dot' : ''} />)}</span><Button kind="quiet" onClick={() => move(1)} disabled={pageIndex === current.pages.length - 1}>Next page <ArrowRight size={16} /></Button></div>
    </section>
    <div className="reader-footnote"><NotePencil size={16} /><p><b>Reading note:</b> the original Message page and host answer disagree about the final-five-sentence extraction. The playable version tidies the wording so the intended answer comes out cleanly.</p></div>
  </main>;
}
