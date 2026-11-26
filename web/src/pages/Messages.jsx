import React, { useEffect, useState } from 'react';
import { Sparkles, Check, X, Download } from 'lucide-react';
import { useApp } from '../App.jsx';
import { PageHead, Tabs, Tag, Empty } from '../components/ui.jsx';
import { Trend } from '../components/charts.jsx';
import { ReportDoc } from '../components/Docs.jsx';
import { downloadHTML } from '../lib/artefacts.js';
import { fmtRel, fmtDateTime } from '../lib/data.js';

const TYPES = { approval: 'Approval', alert: 'Alert', insight: 'Insight', report: 'Report' };

export default function Messages({ id }) {
  const app = useApp();
  const { messages, nav, actions, ctx, addLog, toast, openPanel } = app;
  const [f, setF] = useState('all');
  const list = messages.filter(m => f === 'all' || m.type === f);
  const m = list.find(x => x.id === id) || list[0];
  useEffect(() => { if (m && !m.read) actions.setMsg(m.id, { read: true }); }, [m?.id]);
  const n = t => messages.filter(x => x.type === t && !x.state).length;

  const decide = (state, verb) => {
    actions.setMsg(m.id, { state, by: app.user.name, at: Date.now(), read: true });
    addLog('Access', `approval.${verb}`, m.title.slice(0, 50), `${state} by ${app.user.name}`);
    toast(`${state}. Logged in the audit trail.`);
  };

  return (
    <div className="page">
      <PageHead title="Messages" sub="Insights, alerts, approvals and reports from the agents.">
        <button className="btn" onClick={() => { messages.forEach(x => !x.read && actions.setMsg(x.id, { read: true })); }}>Mark all as read</button>
      </PageHead>
      <Tabs value={f} onChange={setF} tabs={[{ id: 'all', label: 'All', n: messages.length }, { id: 'approval', label: 'Approvals', n: n('approval') }, { id: 'alert', label: 'Alerts', n: n('alert') }, { id: 'insight', label: 'Insights', n: n('insight') }, { id: 'report', label: 'Reports', n: n('report') }]} />
      <div className="ld">
        <section className="card" style={{ overflow: 'hidden' }}>
          {list.map(x => (
            <a key={x.id} href={'#/messages/' + x.id} className={`li ${x.id === m?.id ? 'on' : ''} ${x.read ? '' : 'unread'}`}>
              <span className={`rail ${x.sev}`} style={{ width: 3, alignSelf: 'stretch' }} />
              <span className="grow"><span className="row" style={{ fontSize: 11.5 }}><span style={{ color: x.type === 'approval' ? 'var(--brand)' : x.type === 'alert' ? 'var(--bad)' : 'var(--muted)', fontWeight: 600 }}>{TYPES[x.type]}</span><span className="muted ellipsis">{x.from}</span><span className="muted right num">{fmtRel(x.time)}</span></span>
                <span className="t1" style={{ display: 'block', marginTop: 2 }}>{x.title}</span>
                {x.state && <Tag c={/Approved|Done|Acknowledged/.test(x.state) ? 'good' : 'bad'}>{x.state}</Tag>}</span>
            </a>))}
          {!list.length && <Empty>Nothing here.</Empty>}
        </section>
        {m ? <MessageDetail m={m} decide={decide} /> : <section className="card"><Empty>Select a message</Empty></section>}
      </div>
    </div>
  );
}

function MessageDetail({ m, decide }) {
  const { ctx, openPanel, nav } = useApp();
  const ref = React.useRef(null);
  const hist = m.asset ? ctx.db.history(m.asset, m.tag, ctx.db.anchor - 7 * 864e5, ctx.db.anchor, '4h') : null;
  const def = m.asset ? ctx.db.tagDef(m.asset, m.tag) : null;
  const askCtx = { kind: 'message', title: m.title, summary: [m.diagnosis ? `${m.diagnosis.title}. ${m.diagnosis.reco}` : m.title, ...(m.diagnosis?.points || [])] };
  return (
    <section className="card">
      <div className="ch" style={{ alignItems: 'flex-start', paddingBottom: 8 }}>
        <div className="grow"><div className="muted" style={{ fontSize: 12 }}>{TYPES[m.type]} · {m.from} · {fmtDateTime(m.time)}</div><h3 style={{ fontSize: 16, marginTop: 4 }}>{m.title}</h3></div>
        <div className="acts"><button className="btn sm" onClick={() => openPanel(askCtx)}><Sparkles />Ask Copilot</button></div>
      </div>
      <div className="cb ans">
        {m.type === 'report' ? <>
          <div className="row" style={{ marginBottom: 10 }}><span className="muted">Report generated from live plant data.</span><button className="btn sm right" onClick={() => downloadHTML(m.title, ref.current)}><Download />Download</button></div>
          <div ref={ref}><ReportDoc kind={m.report} title={m.title} /></div>
        </> : <>
          {m.table && <div className="box"><dl className="kv">{m.table.map(r => <React.Fragment key={r[0]}><dt>{r[0]}</dt><dd>{r[1]}</dd></React.Fragment>)}</dl></div>}
          {m.policy && <p className="muted" style={{ fontSize: 12 }}>Held by policy <a href={'#/context/policies/' + m.policy} style={{ color: 'var(--brand)' }}>{m.policy}</a>.</p>}
          {m.diagnosis && <><p><b>{m.diagnosis.title}</b> · confidence {m.diagnosis.confidence}</p><ul>{m.diagnosis.points.map(p => <li key={p}>{p}</li>)}</ul><p><b>Recommendation:</b> {m.diagnosis.reco}</p></>}
          {hist && <div className="box"><div className="muted" style={{ fontSize: 12 }}>{def.name}, last 7 days · {m.evid?.[0]}</div><Trend data={hist.points} series={[{ key: 'v', name: def.name, type: 'area' }]} unit={def.unit} days={7} height={180} refs={def.hi ? [{ y: def.hi, label: 'Limit' }] : def.lo ? [{ y: def.lo, label: 'Limit' }] : []} /></div>}
          <div className="chips" style={{ marginTop: 12 }}>
            {m.state ? <Tag c={/Approved|Done|Acknowledged/.test(m.state) ? 'good' : 'bad'}>{m.state} by {m.by} · {fmtRel(m.at)}</Tag> : <>
              {m.type === 'approval' && <><button className="btn pri" onClick={() => decide('Approved', 'granted')}><Check />Approve</button><button className="btn" onClick={() => decide('Rejected', 'rejected')}><X />Reject</button></>}
              {m.type === 'alert' && <button className="btn pri" onClick={() => decide('Acknowledged', 'ack')}>Acknowledge</button>}
              {m.type === 'insight' && <button className="btn pri" onClick={() => decide('Done', 'done')}>Mark done</button>}
              {m.asset && <button className="btn" onClick={() => nav('d/maintenance/' + m.asset)}>Open {m.asset}</button>}
            </>}
          </div>
        </>}
      </div>
    </section>
  );
}
