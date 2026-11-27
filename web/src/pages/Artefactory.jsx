import React, { useRef, useState } from 'react';
import { Search, Download, Sparkles, Star, RotateCcw, Share2, LayoutDashboard, ArrowLeft, ExternalLink, LayoutGrid, List, FileText, FileSpreadsheet, Presentation, FileBarChart, Printer, X } from 'lucide-react';
import { useApp } from '../App.jsx';
import { PageHead, Tabs, Tag, Empty, Av, Seg } from '../components/ui.jsx';
import { ReportDoc, WorkbookView, DeckView, DocView } from '../components/Docs.jsx';
import { CustomDashBody } from './Dashboards.jsx';
import { TYPE, workbookSheets, downloadWorkbook, downloadHTML } from '../lib/artefacts.js';
import { getDB, DEMO_LIST, fmtRel, fmtDateTime } from '../lib/data.js';
import { usePersist } from '../lib/store.js';

/* type look: icon, tint for the card thumbnail */
const LOOK = {
  dash: { icon: LayoutDashboard, tint: '#fff4ed', ink: '#ad3d00' },
  report: { icon: FileBarChart, tint: '#fef3f2', ink: '#b42318' },
  xlsx: { icon: FileSpreadsheet, tint: '#ecfdf3', ink: '#067647' },
  pptx: { icon: Presentation, tint: '#fff6ed', ink: '#c4320a' },
  docx: { icon: FileText, tint: '#eff8ff', ink: '#175cd3' },
};
export const openInNewTab = id => window.open(`${location.pathname}#/view/${id}`, '_blank', 'noopener');

/** #/artefactory → library · #/artefactory/<id> → full view with Back */
export default function Artefactory({ id }) {
  const app = useApp();
  const a = id && app.arts.find(x => x.id === id);
  if (id && a) return <ArtefactView a={a} />;
  return <Library missing={id && !a} />;
}

function Library({ missing }) {
  const app = useApp();
  const { arts, user, users, nav } = app;
  const [scope, setScope] = useState('all');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [view, setView] = usePersist('artview', 'grid');
  const list = arts.filter(a => (scope === 'all' || (scope === 'mine' ? a.owner === user.id : a.owner !== user.id))
    && (type === 'all' || a.type === type) && (!q || (a.name + ' ' + a.demo + ' ' + TYPE[a.type].label).toLowerCase().includes(q.toLowerCase())));
  const owner = a => users.find(u => u.id === a.owner) || { name: a.owner, color: '#777' };
  const demoName = a => DEMO_LIST.find(d => d.id === a.demo)?.name;
  const open = a => nav('artefactory/' + a.id);
  return (
    <div className="page">
      <PageHead title="Artefactory" sub="Dashboards, reports, workbooks, decks and documents shared across every user. Each save is a version.">
        <button className="btn pri" onClick={() => app.openPanel({ kind: 'page', title: 'Artefactory', summary: [] })}><Sparkles />Create with Copilot</button>
      </PageHead>
      {missing && <div className="card" style={{ padding: '10px 16px', marginBottom: 14, borderColor: 'var(--warn)' }}>That artefact no longer exists. It may have been removed.</div>}
      <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <Seg value={scope} onChange={setScope} options={[{ id: 'all', label: `All ${arts.length}` }, { id: 'mine', label: 'Mine' }, { id: 'shared', label: 'Shared with me' }]} />
        <Seg value={type} onChange={setType} options={[{ id: 'all', label: 'All types' }, ...Object.entries(TYPE).map(([k, v]) => ({ id: k, label: v.label + 's' }))]} />
        <label className="search right" style={{ flex: '0 1 260px', background: 'var(--bg)' }}><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search artefacts" aria-label="Search artefacts" style={{ border: 0, outline: 0, background: 'transparent', width: '100%' }} /></label>
        <div className="seg" role="group" aria-label="View">
          <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-label="Grid view" title="Grid"><LayoutGrid size={14} /></button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="List view" title="List"><List size={14} /></button>
        </div>
      </div>

      {!list.length && <div className="card"><Empty>No artefacts match. Clear the filters, or ask the Copilot to create one.</Empty></div>}

      {view === 'grid' ? (
        <div className="art-cards">{list.map(a => { const L = LOOK[a.type]; return (
          <div key={a.id} className="art-c">
            <button className="th" style={{ background: `linear-gradient(135deg, ${L.tint}, var(--bg))` }} onClick={() => open(a)} aria-label={`Open ${a.name}`}>
              <L.icon size={30} strokeWidth={1.5} color={L.ink} />
              <span className="tag line" style={{ position: 'absolute', top: 10, left: 10, background: 'var(--bg)' }}>{TYPE[a.type].label}</span>
              <span className="tag" style={{ position: 'absolute', top: 10, right: 10, background: 'var(--bg)' }}>v{a.versions[0].v}</span>
            </button>
            <button className="bd" onClick={() => open(a)}><span className="nm ellipsis" style={{ maxWidth: '100%' }}>{a.name}</span><span className="mt">{demoName(a)} · updated {fmtRel(a.versions[0].when)}</span></button>
            <div className="ft"><Av u={owner(a)} s={20} /><span className="ellipsis">{owner(a).name}</span>
              <span className="ac"><button className="ibtn" title="Open in new tab" aria-label="Open in new tab" onClick={() => openInNewTab(a.id)}><ExternalLink /></button></span></div>
          </div>); })}</div>
      ) : list.length > 0 && (
        <section className="card" style={{ overflow: 'hidden' }}>
          <div className="scroll-x"><table className="t"><thead><tr><th>Name</th><th>Type</th><th>Demo</th><th>Owner</th><th>Version</th><th>Updated</th><th /></tr></thead><tbody>
            {list.map(a => { const L = LOOK[a.type]; return (
              <tr key={a.id} className="click" onClick={() => open(a)}>
                <td><div className="row"><span style={{ width: 28, height: 28, borderRadius: 7, display: 'grid', placeItems: 'center', background: L.tint, color: L.ink, flex: 'none' }}><L.icon size={15} /></span><b style={{ fontWeight: 600 }}>{a.name}</b></div></td>
                <td>{TYPE[a.type].label}</td><td className="muted">{demoName(a)}</td><td><div className="row"><Av u={owner(a)} s={20} />{owner(a).name}</div></td>
                <td className="num">v{a.versions[0].v}</td><td className="muted">{fmtRel(a.versions[0].when)}</td>
                <td className="r" onClick={e => e.stopPropagation()}><button className="ibtn" title="Open in new tab" aria-label="Open in new tab" onClick={() => openInNewTab(a.id)}><ExternalLink /></button></td>
              </tr>); })}
          </tbody></table></div>
        </section>
      )}
    </div>
  );
}

/** Full view inside the app, with Back. */
function ArtefactView({ a }) {
  const app = useApp();
  const [tab, setTab] = useState('preview');
  const ref = useRef(null);
  const c = getDB(a.demo, app.anchor);
  const cur = a.versions[0];
  const owner = app.users.find(u => u.id === a.owner) || { name: a.owner, color: '#777' };
  const pinned = app.pins.includes('custom/' + a.id);
  const L = LOOK[a.type];
  const back = () => app.nav('artefactory');
  const restore = v => {
    app.setArts(list => list.map(x => x.id === a.id ? { ...x, versions: [{ v: cur.v + 1, by: app.user.name, when: Date.now(), note: `Restored from v${v.v}` }, ...x.versions] } : x));
    app.addLog('Access', 'artefact.restore', a.name, `v${v.v} → v${cur.v + 1}`); app.toast(`Restored v${v.v} as v${cur.v + 1}. Earlier versions are kept.`);
  };
  const askCtx = { kind: 'artefact', title: a.name, versions: a.versions, summary: [`${TYPE[a.type].label} for ${c.demo.company}, version ${cur.v}, last change: ${cur.note} (${cur.by}).`] };
  return (
    <div className="page full" style={{ height: 'auto' }}>
      <div className="av-bar">
        <button className="back" onClick={back} aria-label="Back to Artefactory"><ArrowLeft size={16} />Artefactory</button>
        <span style={{ width: 1, height: 22, background: 'var(--line)' }} />
        <span style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: L.tint, color: L.ink, flex: 'none' }}><L.icon size={16} /></span>
        <div className="t grow"><h1 className="ellipsis">{a.name}</h1><div className="s ellipsis">{TYPE[a.type].label} · v{cur.v} · {c.demo.company} · {owner.name} · {fmtRel(cur.when)}</div></div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <div className="seg"><button className={tab === 'preview' ? 'on' : ''} onClick={() => setTab('preview')}>Preview</button><button className={tab === 'versions' ? 'on' : ''} onClick={() => setTab('versions')}>Versions · {a.versions.length}</button></div>
          {a.type === 'dash' && <button className="btn sm" onClick={() => { app.actions.pin('custom/' + a.id); app.toast(pinned ? 'Removed from Shortcuts' : 'Added to Shortcuts'); }}><Star />{pinned ? 'Pinned' : 'Pin'}</button>}
          <button className="btn sm" onClick={() => openInNewTab(a.id)}><ExternalLink />Open in new tab</button>
          <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/view/${a.id}`); app.toast('Link copied'); }}><Share2 />Share</button>
          {a.type !== 'dash' && <button className="btn sm" onClick={() => download(app, a, c, ref)}><Download />Download</button>}
          <button className="btn sm pri" onClick={() => app.openPanel(askCtx)}><Sparkles />Ask</button>
        </div>
      </div>
      <div className="av-body">
        {tab === 'versions' ? (
          <section className="card" style={{ maxWidth: 1100, margin: '0 auto' }}><div className="scroll-x"><table className="t"><thead><tr><th>Version</th><th>Saved</th><th>By</th><th>Change</th><th /></tr></thead><tbody>{a.versions.map(v => (
            <tr key={v.v}><td><Tag c={v.v === cur.v ? 'brand' : 'line'}>v{v.v}{v.v === cur.v ? ' · current' : ''}</Tag></td><td className="num">{fmtDateTime(v.when)}</td><td>{v.by}</td><td className="muted">{v.note}</td>
              <td className="r">{v.v !== cur.v && <button className="btn sm" onClick={() => restore(v)}><RotateCcw />Restore</button>}</td></tr>))}</tbody></table></div></section>
        ) : <div ref={ref}><ArtefactBody a={a} c={c} /></div>}
      </div>
    </div>
  );
}

export function ArtefactBody({ a, c }) {
  if (a.type === 'report') return <ReportDoc c={c} kind={a.spec?.kind} title={a.name} />;
  if (a.type === 'xlsx') return <div className="xl-wrap" style={{ maxWidth: 1100, margin: '0 auto' }}><WorkbookView sheets={workbookSheets(c, a.spec?.kind)} /></div>;
  if (a.type === 'pptx') return <div style={{ maxWidth: 1100, margin: '0 auto' }}><DeckView c={c} name={a.name} /></div>;
  if (a.type === 'docx') return <DocView c={c} name={a.name} />;
  return <CustomDashBody a={a} />;
}

function download(app, a, c, ref) {
  if (a.type === 'xlsx') downloadWorkbook(a.name, workbookSheets(c, a.spec?.kind));
  else if (ref.current) downloadHTML(a.name, ref.current, a.type === 'docx');
  app.addLog('Access', 'artefact.download', a.name, `v${a.versions[0].v}`);
}

/** #/view/<id>: a clean page for a new tab (no sidebar), with print, download and a way back into the app. */
export function StandaloneView({ id }) {
  const app = useApp();
  const ref = useRef(null);
  const a = app.arts.find(x => x.id === id);
  if (!a) return <div className="standalone"><div className="av-bar"><span className="wm" style={{ fontSize: 20 }}>pwc</span></div><div className="av-body"><div className="card"><Empty>This artefact no longer exists. <a href="#/artefactory" style={{ color: 'var(--brand)' }}>Go to the Artefactory</a></Empty></div></div></div>;
  const c = getDB(a.demo, app.anchor);
  const cur = a.versions[0];
  const L = LOOK[a.type];
  document.title = `${a.name} · PwC Connected Plant`;
  return (
    <div className="standalone">
      <div className="av-bar no-print">
        <span className="wm" style={{ fontSize: 20, paddingTop: 6 }}>pwc</span>
        <span style={{ width: 1, height: 22, background: 'var(--line)' }} />
        <span style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: L.tint, color: L.ink, flex: 'none' }}><L.icon size={16} /></span>
        <div className="t grow"><h1 className="ellipsis">{a.name}</h1><div className="s ellipsis">{TYPE[a.type].label} · v{cur.v} · {c.demo.company} · updated {fmtRel(cur.when)}</div></div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm" onClick={() => window.print()}><Printer />Print</button>
          {a.type !== 'dash' && <button className="btn sm" onClick={() => download(app, a, c, ref)}><Download />Download</button>}
          <a className="btn sm" href={`#/artefactory/${a.id}`}><LayoutGrid />Open in app</a>
          <button className="ibtn" onClick={() => (window.opener ? window.close() : (location.hash = `/artefactory/${a.id}`))} aria-label="Close" title="Close"><X /></button>
        </div>
      </div>
      <div className="av-body" ref={ref}><ArtefactBody a={a} c={c} /></div>
    </div>
  );
}
