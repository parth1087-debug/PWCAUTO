import React, { useRef, useState } from 'react';
import { Search, Download, Sparkles, Star, RotateCcw, Share2, ArrowLeft, ExternalLink, LayoutGrid, List, Printer, X } from 'lucide-react';
import { useApp } from '../App.jsx';
import { PageHead, Tabs, Tag, Empty, Av, Seg } from '../components/ui.jsx';
import { ReportDoc, WorkbookView, DeckView, DocView } from '../components/Docs.jsx';
import { CustomDashBody, DashBody } from './Dashboards.jsx';
import { TwinView, RealtimeView, SetpointView, CustomBoard, FormView, RcaView } from '../components/Boards.jsx';
import { MimicView } from '../mimics/index.jsx';
import { workbookSheets, downloadWorkbook, downloadHTML } from '../lib/artefacts.js';
import { TYPES } from '../shared/artefacts.js';
import { onePager } from '../lib/htmlpage.js';
import { emsBrief, emsReview } from '../lib/html/ems.js';
import SupplyPlan from '../components/boards/ems/supply.jsx';
import TariffAdvisory from '../components/boards/ems/tariff.jsx';
import CapexBoard from '../components/boards/ems/capex.jsx';
import TrendExplorer from '../components/boards/ems/trends.jsx';
import { sectionOf, SECTION_LABEL } from '../shared/sections.js';

/** HTML artefact generators by spec.kind. */
const HTML_KINDS = { onepager: onePager, 'ems-brief': emsBrief, 'ems-review': emsReview };
const htmlOf = (a, c) => a.spec?.html || (HTML_KINDS[a.spec?.kind] || onePager)(c);
import { downloadBlob } from '../lib/data.js';
import { artIcon, RangePicker } from '../App.jsx';
import { getDB, DEMO_LIST, fmtRel, fmtDateTime } from '../lib/data.js';
import { usePersist } from '../lib/store.js';

/* type look: icon, tint for the card thumbnail */
const TINT = {
  dash: { tint: '#e6ebfa', ink: '#2F55D4' }, xlsx: { tint: '#ecfdf3', ink: '#067647' }, pptx: { tint: '#fff1ea', ink: '#c4320a' },
  docx: { tint: '#eaf6fd', ink: '#0369a1' }, form: { tint: '#f1edfd', ink: '#6941c6' }, html: { tint: '#eef4ff', ink: '#2F55D4' },
};
const VIEW_TINT = { mimic: { tint: '#eef0f3', ink: '#40566d' }, rca: { tint: '#fdf0ef', ink: '#b42318' }, twin: { tint: '#e8f6f8', ink: '#0e7490' }, realtime: { tint: '#eafaf1', ink: '#008542' }, setpoints: { tint: '#fff6e5', ink: '#b45309' } };
const VIEW_LABEL = { mimic: 'Process view', rca: 'RCA', twin: 'Asset twin', realtime: 'Real-time', setpoints: 'Setpoints', kpis: 'KPIs', custom: 'Custom' };
const look = a => ({ icon: artIcon(a), ...((a.type === 'dash' && VIEW_TINT[a.spec?.view]) || TINT[a.type] || TINT.docx) });
const kindLabel = a => (a.type === 'dash' && VIEW_LABEL[a.spec?.view] ? `${TYPES.dash.label} · ${VIEW_LABEL[a.spec.view]}` : TYPES[a.type]?.label || a.type);
export const openInNewTab = id => window.open(`${location.pathname}#/view/${id}`, '_blank', 'noopener');

/** #/artefactory → library · #/artefactory/<id> → full view with Back */
export default function Artefactory({ id, sel }) {
  const app = useApp();
  const a = id && app.arts.find(x => x.id === id);
  if (id && a) return <ArtefactView a={a} sel={sel} />;
  return <Library missing={id && !a} />;
}

function Library({ missing }) {
  const app = useApp();
  const { arts, user, users, nav } = app;
  const [scope, setScope] = useState('all');
  const [plant, setPlant] = usePersist('artplant', 'this');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [view, setView] = usePersist('artview', 'grid');
  const inPlant = arts.filter(a => plant === 'all' || a.demo === app.demoId);
  const list = inPlant.filter(a => (scope === 'all' || (scope === 'mine' ? a.owner === user.id : a.owner !== user.id))
    && (type === 'all' || a.type === type) && (!q || (a.name + ' ' + a.demo + ' ' + kindLabel(a)).toLowerCase().includes(q.toLowerCase())));
  const owner = a => users.find(u => u.id === a.owner) || { name: a.owner, color: '#777' };
  const demoName = a => DEMO_LIST.find(d => d.id === a.demo)?.name;
  const open = a => nav('artefactory/' + a.id);
  return (
    <div className="page">
      <PageHead title="Artefactory" sub={`Dashboards, asset twins, real-time monitors, setpoint advisors, forms, sheets, decks and documents. Shared across users and stored in the plant database (${app.dbState === 'server' ? 'live' : 'offline copy'}). Each save is a version.`}>
        <button className="btn pri" onClick={() => app.openPanel({ kind: 'page', title: 'Artefactory', summary: [] })}><Sparkles />Create with Copilot</button>
      </PageHead>
      {missing && <div className="card" style={{ padding: '10px 16px', marginBottom: 14, borderColor: 'var(--warn)' }}>That artefact no longer exists. It may have been removed.</div>}
      <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <Seg value={scope} onChange={setScope} options={[{ id: 'all', label: `All ${inPlant.length}` }, { id: 'mine', label: 'Mine' }, { id: 'shared', label: 'Shared with me' }]} />
        <Seg value={type} onChange={setType} options={[{ id: 'all', label: 'All types' }, ...Object.entries(TYPES).map(([k, v]) => ({ id: k, label: v.plural }))]} />
        {app.allowed.length > 1 && <Seg value={plant} onChange={setPlant} options={[{ id: 'this', label: 'This plant' }, { id: 'all', label: 'All plants' }]} />}
        <label className="search right" style={{ flex: '0 1 260px', background: 'var(--bg)' }}><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search artefacts" aria-label="Search artefacts" style={{ border: 0, outline: 0, background: 'transparent', width: '100%' }} /></label>
        <div className="seg" role="group" aria-label="View">
          <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-label="Grid view" title="Grid"><LayoutGrid size={14} /></button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="List view" title="List"><List size={14} /></button>
        </div>
      </div>

      {!list.length && <div className="card"><Empty>No artefacts match. Clear the filters, or ask the Copilot to create one.</Empty></div>}

      {view === 'grid' ? (
        <div className="art-cards">{list.map(a => { const L = look(a); return (
          <div key={a.id} className="art-c">
            <button className="th" style={{ background: `linear-gradient(135deg, ${L.tint}, var(--bg))` }} onClick={() => open(a)} aria-label={`Open ${a.name}`}>
              <L.icon size={30} strokeWidth={1.5} color={L.ink} />
              <span className="tag line" style={{ position: 'absolute', top: 10, left: 10, background: 'var(--bg)' }}>{kindLabel(a)}</span>
              <span className="tag" style={{ position: 'absolute', top: 10, right: 10, background: 'var(--bg)' }}>v{a.versions[0].v}</span>
            </button>
            <button className="bd" onClick={() => open(a)}><span className="nm ellipsis" style={{ maxWidth: '100%' }}>{a.name}</span><span className="mt">{demoName(a)} · updated {fmtRel(a.versions[0].when)}</span></button>
            <div className="ft"><Av u={owner(a)} s={20} /><span className="ellipsis">{owner(a).name}</span>
              <span className="ac"><button className="ibtn" title="Open in new tab" aria-label="Open in new tab" onClick={() => openInNewTab(a.id)}><ExternalLink /></button></span></div>
          </div>); })}</div>
      ) : list.length > 0 && (
        <section className="card" style={{ overflow: 'hidden' }}>
          <div className="scroll-x"><table className="t"><thead><tr><th>Name</th><th>Type</th><th>Demo</th><th>Owner</th><th>Version</th><th>Updated</th><th /></tr></thead><tbody>
            {list.map(a => { const L = look(a); return (
              <tr key={a.id} className="click" onClick={() => open(a)}>
                <td><div className="row"><span style={{ width: 28, height: 28, borderRadius: 7, display: 'grid', placeItems: 'center', background: L.tint, color: L.ink, flex: 'none' }}><L.icon size={15} /></span><b style={{ fontWeight: 600 }}>{a.name}</b></div></td>
                <td>{kindLabel(a)}</td><td className="muted">{demoName(a)}</td><td><div className="row"><Av u={owner(a)} s={20} />{owner(a).name}</div></td>
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
function ArtefactView({ a, sel }) {
  const app = useApp();
  React.useEffect(() => { if (a.demo !== app.demoId && app.allowed.includes(a.demo)) app.setDemo(a.demo); }, [a.demo]); // open another plant's artefact in its own plant
  const [tab, setTab] = useState('preview');
  const ref = useRef(null);
  const c = getDB(a.demo, app.anchor);
  const cur = a.versions[0];
  const owner = app.users.find(u => u.id === a.owner) || { name: a.owner, color: '#777' };
  const pinned = app.pins.includes(a.id);
  const L = look(a);
  const back = () => app.nav('artefactory');
  const restore = v => {
    app.actions.addVersion(a, { note: `Restored from v${v.v}` });
    app.addLog('Access', 'artefact.restore', a.name, `v${v.v} → v${cur.v + 1}`); app.toast(`Restored v${v.v} as v${cur.v + 1}. Earlier versions are kept.`);
  };
  const askCtx = { kind: 'artefact', title: a.name, versions: a.versions, summary: [`${kindLabel(a)} for ${c.demo.company}, version ${cur.v}, last change: ${cur.note} (${cur.by}).`] };
  return (
    <div className="page full" style={{ height: 'auto' }}>
      <div className="av-bar">
        <button className="back" onClick={back} aria-label="Back to Artefactory"><ArrowLeft size={16} />Artefactory</button>
        <span style={{ width: 1, height: 22, background: 'var(--line)' }} />
        <span style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: L.tint, color: L.ink, flex: 'none' }}><L.icon size={16} /></span>
        <div className="t grow"><h1 className="ellipsis">{a.name}</h1><div className="s ellipsis">{kindLabel(a)} · v{cur.v} · {c.demo.company} · {owner.name} · {fmtRel(cur.when)}</div></div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <div className="seg"><button className={tab === 'preview' ? 'on' : ''} onClick={() => setTab('preview')}>Preview</button><button className={tab === 'versions' ? 'on' : ''} onClick={() => setTab('versions')}>Versions · {a.versions.length}</button></div>
          <label className="sel-in" title="Where this artefact appears in the sidebar"><span className="muted">Show in</span><select className="inp" value={sectionOf(a) || 'none'} onChange={e => { app.actions.addVersion(a, { note: `Moved to ${e.target.value === 'none' ? 'Artefactory only' : SECTION_LABEL[e.target.value]}`, spec: { ...a.spec, section: e.target.value, group: e.target.value === sectionOf(a) ? a.spec.group : undefined } }); app.toast(e.target.value === 'none' ? 'Removed from the sidebar' : `Shown in ${SECTION_LABEL[e.target.value]}`); }}>
            <option value="decision">Decision boards</option><option value="monitoring">Monitoring</option><option value="none">Artefactory only</option></select></label>
          <button className="btn sm" onClick={() => openInNewTab(a.id)}><ExternalLink />Open in new tab</button>
          <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/view/${a.id}`); app.toast('Link copied'); }}><Share2 />Share</button>
          {!['dash', 'form'].includes(a.type) && <button className="btn sm" onClick={() => download(app, a, c, ref)}><Download />Download</button>}
        </div>
      </div>
      {a.type === 'dash' && !['twin', 'realtime', 'setpoints', 'mimic'].includes(a.spec?.view) && tab === 'preview' && <div className="av-range"><span className="muted" style={{ fontSize: 12 }}>Period</span><RangePicker /></div>}
      <div className="av-body">
        {tab === 'versions' ? (
          <section className="card" style={{ maxWidth: 1100, margin: '0 auto' }}><div className="scroll-x"><table className="t"><thead><tr><th>Version</th><th>Saved</th><th>By</th><th>Change</th><th /></tr></thead><tbody>{a.versions.map(v => (
            <tr key={v.v}><td><Tag c={v.v === cur.v ? 'brand' : 'line'}>v{v.v}{v.v === cur.v ? ' · current' : ''}</Tag></td><td className="num">{fmtDateTime(v.when)}</td><td>{v.by}</td><td className="muted">{v.note}</td>
              <td className="r">{v.v !== cur.v && <button className="btn sm" onClick={() => restore(v)}><RotateCcw />Restore</button>}</td></tr>))}</tbody></table></div></section>
        ) : <div ref={ref}><ArtefactBody a={a} c={c} sel={sel} /></div>}
      </div>
    </div>
  );
}

export function ArtefactBody({ a, c, sel }) {
  if (a.type === 'form') return <FormView c={c} a={a} />;
  if (a.type === 'html') return <HtmlFrame a={a} c={c} />;
  if (a.type === 'docx' && a.spec?.kind === 'report') return <ReportDoc c={c} kind="daily" title={a.name} />;
  if (a.type === 'xlsx') return <div className="xl-wrap" style={{ maxWidth: 1100, margin: '0 auto' }}><WorkbookView sheets={workbookSheets(c, a.spec?.kind)} /></div>;
  if (a.type === 'pptx') return <div style={{ maxWidth: 1100, margin: '0 auto' }}><DeckView c={c} name={a.name} /></div>;
  if (a.type === 'docx') return <DocView c={c} name={a.name} />;
  const v = a.spec?.view;
  if (v === 'twin') return <TwinView c={c} asset={sel || a.spec.asset} />;
  if (v === 'realtime') return <RealtimeView c={c} assets={a.spec.assets} />;
  if (v === 'setpoints') return <SetpointView c={c} />;
  if (v === 'mimic') return <MimicView c={c} id={a.spec.mimic} />;
  if (v === 'rca') return <RcaView c={c} />;
  if (v === 'supply-plan') return <SupplyPlan c={c} />;
  if (v === 'tariff') return <TariffAdvisory c={c} />;
  if (v === 'capex') return <CapexBoard c={c} />;
  if (v === 'trends') return <TrendExplorer c={c} />;
  if (v === 'custom') return <CustomBoard c={c} widgets={a.spec.widgets} />;
  if (v) return <DashBody view={v} sel={sel} c={c} />;
  return <CustomDashBody a={a} />;
}

function download(app, a, c, ref) {
  if (a.type === 'html') downloadBlob(new Blob([htmlOf(a, c)], { type: 'text/html' }), `${a.name.replace(/[^A-Za-z0-9]+/g, '-')}.html`);
  else if (a.type === 'xlsx') downloadWorkbook(a.name, workbookSheets(c, a.spec?.kind));
  else if (ref.current) downloadHTML(a.name, ref.current, a.type === 'docx');
  app.addLog('Access', 'artefact.download', a.name, `v${a.versions[0].v}`);
}

/** #/view/<id>: a clean page for a new tab (no sidebar), with print, download and a way back into the app. */
export function StandaloneView({ id }) {
  const app = useApp();
  const ref = useRef(null);
  const a = app.arts.find(x => x.id === id);
  if (!a) return <div className="standalone"><div className="av-bar"><span className="wm" style={{ fontSize: 15 }}>FACLON<i>LABS</i></span></div><div className="av-body"><div className="card"><Empty>This artefact no longer exists. <a href="#/artefactory" style={{ color: 'var(--brand)' }}>Go to the Artefactory</a></Empty></div></div></div>;
  const c = getDB(a.demo, app.anchor);
  const cur = a.versions[0];
  const L = look(a);
  document.title = `${a.name} · Faclon Connected Plant`;
  return (
    <div className="standalone">
      <div className="av-bar no-print">
        <span className="wm" style={{ fontSize: 15 }}>FACLON<i>LABS</i></span>
        <span style={{ width: 1, height: 22, background: 'var(--line)' }} />
        <span style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: L.tint, color: L.ink, flex: 'none' }}><L.icon size={16} /></span>
        <div className="t grow"><h1 className="ellipsis">{a.name}</h1><div className="s ellipsis">{kindLabel(a)} · v{cur.v} · {c.demo.company} · updated {fmtRel(cur.when)}</div></div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm" onClick={() => window.print()}><Printer />Print</button>
          {!['dash', 'form'].includes(a.type) && <button className="btn sm" onClick={() => download(app, a, c, ref)}><Download />Download</button>}
          <a className="btn sm" href={`#/artefactory/${a.id}`}><LayoutGrid />Open in app</a>
          <button className="ibtn" onClick={() => (window.opener ? window.close() : (location.hash = `/artefactory/${a.id}`))} aria-label="Close" title="Close"><X /></button>
        </div>
      </div>
      <div className="av-body" ref={ref}><ArtefactBody a={a} c={c} /></div>
    </div>
  );
}

/** HTML artefact: shown in a sandboxed frame (scripts never run) that grows to fit its page. */
function HtmlFrame({ a, c }) {
  const ref = useRef(null);
  const fit = () => { try { const d = ref.current.contentDocument; ref.current.style.height = Math.max(400, d.documentElement.scrollHeight + 4) + 'px'; } catch { /* keep min height */ } };
  return <iframe ref={ref} className="html-frame" title={a.name} sandbox="allow-same-origin allow-popups" srcDoc={htmlOf(a, c)} onLoad={fit} />;
}
