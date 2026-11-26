import React, { useRef, useState } from 'react';
import { Search, Download, Sparkles, Star, History, RotateCcw, Share2, LayoutDashboard } from 'lucide-react';
import { useApp } from '../App.jsx';
import { PageHead, Tabs, Tag, Empty, Av, Seg } from '../components/ui.jsx';
import { ReportDoc, WorkbookView, DeckView, DocView } from '../components/Docs.jsx';
import { TYPE, workbookSheets, downloadWorkbook, downloadHTML } from '../lib/artefacts.js';
import { getDB, DEMO_LIST, fmtRel, fmtDateTime } from '../lib/data.js';

export default function Artefactory({ id }) {
  const app = useApp();
  const { arts, user, users, nav } = app;
  const [scope, setScope] = useState('all');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const list = arts.filter(a => (scope === 'all' || (scope === 'mine' ? a.owner === user.id : a.owner !== user.id))
    && (type === 'all' || a.type === type) && (!q || (a.name + ' ' + a.demo).toLowerCase().includes(q.toLowerCase())));
  const sel = arts.find(a => a.id === id) || list[0];
  const owner = a => users.find(u => u.id === a.owner) || { name: a.owner, color: '#777' };
  return (
    <div className="page">
      <PageHead title="Artefactory" sub="Dashboards, reports, workbooks, decks and documents, shared by every user. Each save is a version.">
        <button className="btn" onClick={() => app.openPanel({ kind: 'page', title: 'Artefactory', summary: [] })}><Sparkles />Create with Copilot</button>
      </PageHead>
      <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <Seg value={scope} onChange={setScope} options={[{ id: 'all', label: `All ${arts.length}` }, { id: 'mine', label: 'Mine' }, { id: 'shared', label: 'Shared with me' }]} />
        <Seg value={type} onChange={setType} options={[{ id: 'all', label: 'All types' }, ...Object.entries(TYPE).map(([k, v]) => ({ id: k, label: v.label + 's' }))]} />
        <label className="search right" style={{ width: 260, background: 'var(--bg)' }}><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search artefacts" style={{ border: 0, outline: 0, background: 'transparent', width: '100%' }} /></label>
      </div>
      <div className="ld">
        <section className="card" style={{ overflow: 'hidden' }}>
          {list.map(a => <a key={a.id} href={'#/artefactory/' + a.id} className={`li ${sel?.id === a.id ? 'on' : ''}`}>
            <span className={`fi ${a.type}`}>{TYPE[a.type].ext}</span>
            <span className="grow"><span className="t1 ellipsis" style={{ display: 'block' }}>{a.name}</span><span className="t2">{TYPE[a.type].label} · v{a.versions[0].v} · {fmtRel(a.versions[0].when)}</span></span>
            <span style={{ textAlign: 'right' }}><Av u={owner(a)} s={22} /><div className="t2" style={{ marginTop: 2 }}>{DEMO_LIST.find(d => d.id === a.demo)?.name}</div></span>
          </a>)}
          {!list.length && <Empty>No artefacts match.</Empty>}
        </section>
        {sel ? <Viewer key={sel.id} a={sel} owner={owner(sel)} /> : <section className="card"><Empty>Select an artefact</Empty></section>}
      </div>
    </div>
  );
}

function Viewer({ a, owner }) {
  const app = useApp();
  const [tab, setTab] = useState('preview');
  const ref = useRef(null);
  const c = getDB(a.demo, app.anchor);
  const cur = a.versions[0];
  const restore = v => {
    app.setArts(list => list.map(x => x.id === a.id ? { ...x, versions: [{ v: cur.v + 1, by: app.user.name, when: Date.now(), note: `Restored from v${v.v}` }, ...x.versions] } : x));
    app.addLog('Access', 'artefact.restore', a.name, `v${v.v} → v${cur.v + 1}`); app.toast(`Restored v${v.v} as v${cur.v + 1}. Earlier versions are kept.`);
  };
  const download = () => {
    if (a.type === 'xlsx') downloadWorkbook(a.name, workbookSheets(c, a.spec?.kind));
    else if (ref.current) downloadHTML(a.name, ref.current, a.type === 'docx');
    app.addLog('Access', 'artefact.download', a.name, `v${cur.v}`);
  };
  const askCtx = { kind: 'artefact', title: a.name, versions: a.versions, summary: [`${TYPE[a.type].label} for ${c.demo.company}, version ${cur.v}, last change: ${cur.note} (${cur.by}).`] };
  const pinned = app.pins.includes('custom/' + a.id);
  return (
    <section className="card">
      <div className="ch" style={{ alignItems: 'flex-start', paddingBottom: 6 }}>
        <span className={`fi ${a.type}`}>{TYPE[a.type].ext}</span>
        <div className="grow"><h3 style={{ fontSize: 15 }}>{a.name}</h3><div className="sub">{TYPE[a.type].label} · v{cur.v} · {c.demo.company} · owner {owner.name} · {fmtRel(cur.when)}</div></div>
        <div className="acts" style={{ gap: 6, flexWrap: 'wrap' }}>
          {a.type === 'dash' && <><button className="btn sm" onClick={() => { app.actions.pin('custom/' + a.id); app.toast(pinned ? 'Removed from Shortcuts' : 'Added to Shortcuts'); }}><Star />{pinned ? 'Pinned' : 'Pin'}</button><button className="btn sm" onClick={() => app.nav('d/custom/' + a.id)}><LayoutDashboard />Open</button></>}
          <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(location.href); app.toast('Link copied'); }}><Share2 />Share</button>
          {a.type !== 'dash' && <button className="btn sm" onClick={download}><Download />Download</button>}
          <button className="btn sm pri" onClick={() => app.openPanel(askCtx)}><Sparkles />Ask</button>
        </div>
      </div>
      <div className="cb">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'preview', label: 'Preview' }, { id: 'versions', label: 'Versions', n: a.versions.length }]} />
        {tab === 'versions' ? (
          <table className="t"><thead><tr><th>Version</th><th>Saved</th><th>By</th><th>Change</th><th /></tr></thead><tbody>{a.versions.map(v => (
            <tr key={v.v}><td><Tag c={v.v === cur.v ? 'brand' : 'line'}>v{v.v}{v.v === cur.v ? ' · current' : ''}</Tag></td><td className="num">{fmtDateTime(v.when)}</td><td>{v.by}</td><td className="muted">{v.note}</td>
              <td className="r">{v.v !== cur.v && <button className="btn sm" onClick={() => restore(v)}><RotateCcw />Restore</button>}</td></tr>))}</tbody></table>
        ) : (
          <div ref={ref}>
            {a.type === 'report' && <ReportDoc c={c} kind={a.spec?.kind} title={a.name} />}
            {a.type === 'xlsx' && <WorkbookView sheets={workbookSheets(c, a.spec?.kind)} />}
            {a.type === 'pptx' && <DeckView c={c} name={a.name} />}
            {a.type === 'docx' && <DocView c={c} name={a.name} />}
            {a.type === 'dash' && <div className="muted">Live dashboard with {(a.spec?.kpis || []).length} KPIs from <b>{c.demo.company}</b>. <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => app.nav('d/custom/' + a.id)}>Open dashboard</button></div>}
          </div>
        )}
      </div>
    </section>
  );
}
