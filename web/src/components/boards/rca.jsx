/* ================= Anomalies: RCA and recommendations =================
   Users: reliability engineer, maintenance manager, process engineer. Questions it answers:
   1. Which anomalies are open, and which matter most? (ranked by ₹ exposure before the next window)
   2. What is the root cause, and how sure are we? (evidence, confidence, trend with limit and start marker)
   3. What does it cost if we do nothing vs act now? (hours and ₹ exposure, cost of the fix, spare)
   4. What is the recommended action and where is it? (status: new, diagnosed, awaiting approval, WO raised)
   5. Which failures closed in the period, and do they repeat? (closed RCAs with recurrence)
   The trend and the closed-RCA list follow the period selector. */
import React, { useState } from 'react';
import { Sparkles, Wrench, Cpu } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { Card, Tag, Empty } from '../ui.jsx';
import { Trend } from '../charts.jsx';
import { fmtNum } from '../../lib/data.js';
import { rcaCase, closedRca, nextWindow } from '../../shared/analytics/dash-mt.js';
import { D, inr, pct, when, SPARE, MKpi, Headline, LiveValue } from './mt-ui.jsx';

const STATUS = { New: 'info', Diagnosed: 'line', 'Action due now': 'bad', 'Awaiting approval': 'brand', 'WO raised': 'good' };
const STEPS = ['Detected', 'Diagnosed', 'Work order', 'Approved', 'Done in window'];
const stepOf = s => (s === 'New' ? 0 : s === 'WO raised' ? 2 : s === 'Awaiting approval' ? 2 : 1);
const age = m => (m < 90 ? `${m} min` : m < 60 * 48 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);

export function RcaView({ c }) {
  const app = useApp(); const db = c.db;
  const R = { ...app.rng, from: db.anchor - app.rng.days * D, to: db.anchor };
  const raw = (c.demo.events || []).filter(e => e.title && db.assetById[e.asset]);
  const cases = raw.map(e => ({ e, k: rcaCase(db, e, app.messages || []) })).sort((x, y) => y.k.exposureL - x.k.exposureL || x.k.f.rulDays - y.k.f.rulDays);
  const [sel, setSel] = useState(null);
  const cur = cases.find(x => x.e.id === sel) || cases[0];
  const closed = closedRca(db, R.from, R.to, 8);
  if (!cur) return <Card><Empty>No open anomalies. All monitored assets are inside their normal bands.</Empty></Card>;
  const { e, k } = cur;
  const a = db.assetById[e.asset]; const def = db.tagDef(e.asset, e.tag);
  const hist = db.history(e.asset, e.tag, R.from, R.to);
  const start = db.anchor - e.startHoursAgo * 36e5;
  const others = (c.demo.events || []).filter(x => x.asset === e.asset && x.tag !== e.tag).map(x => x.tag).filter((t, i, arr) => arr.indexOf(t) === i && db.tagDef(e.asset, t));
  const win = nextWindow(db);
  const bad = cases.filter(x => x.e.severity === 'bad').length;
  const totL = cases.reduce((s, x) => s + x.k.exposureL, 0), totH = cases.reduce((s, x) => s + x.k.exposureH, 0);
  const due = cases.filter(x => x.k.status === 'Action due now' || x.k.f.action === 'now');
  const pending = cases.filter(x => ['Awaiting approval', 'WO raised'].includes(x.k.status)).length;
  const diag = cases.filter(x => x.e.diagnosis);
  const conf = diag.length ? diag.reduce((s, x) => s + x.e.diagnosis.confidence, 0) / diag.length : null;
  const winLabel = win.inDays === 0 ? 'tonight' : `${when(win.start)}, in ${win.inDays} d`;
  const step = stepOf(k.status);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <Headline tone={due.length ? 'bad' : 'brand'}><div>
        <b>{cases.length}</b> open anomal{cases.length === 1 ? 'y' : 'ies'} put <b>{inr(totL)}</b> and about <b>{fmtNum(totH, 0)} h</b> of downtime at risk over the next 30 days if no action is taken. Next window: {winLabel}.
        {' '}Biggest: <b>{cases[0].e.asset}</b>, {cases[0].e.diagnosis ? cases[0].e.diagnosis.title.toLowerCase() : cases[0].e.title.toLowerCase()} ({inr(cases[0].k.exposureL)}).
        {due.length > 0 && <> <b style={{ color: 'var(--bad)' }}>{due.map(x => x.e.asset).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')}</b> cannot wait for the window.</>}
      </div></Headline>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))', marginBottom: 0 }}>
        <MKpi label="Open anomalies" value={cases.length} note={`${bad} alarm · ${cases.length - bad} warning`} />
        <MKpi label="₹ at risk, 30 days" value={totL} fmt={inr} note={`≈ ${fmtNum(totH, 0)} h downtime if not acted on`} />
        <MKpi label="Act before window" value={due.length} note={due.length ? 'controlled stop needed' : 'all can wait for the window'} />
        <MKpi label="With work order" value={pending} note={`of ${cases.length} · approval or raised`} />
        <MKpi label="Diagnosis confidence" value={conf != null ? conf * 100 : null} unit="%" note={`${diag.length} diagnosed by agents`} />
      </div>

      <Card title="Open anomalies" sub="ranked by ₹ exposure in 30 days if not acted on (probability × cost of failure) · select one" flush
        csv={{ name: 'open-anomalies', rows: () => cases.map(({ e: x, k: y }) => ({ anomaly: x.title, asset: x.asset, severity: x.severity, detected_min_ago: x.minutesAgo, life_left_days: y.f.rulDays, p_fail_before_window: +y.pBefore.toFixed(2), p_fail_30d: +y.p30.toFixed(2), exposure_h: y.exposureH, exposure_lakh: y.exposureL, fix_cost_lakh: y.fixL, status: y.status })) }}>
        <div className="scroll-x"><table className="t"><thead><tr><th>Anomaly</th><th className="r">Detected</th><th className="r">Life left</th><th className="r">P(fail) before window</th><th className="r">P(fail) 30 d</th><th className="r">Exposure</th><th className="r">Fix cost</th><th>Status</th></tr></thead><tbody>
          {cases.map(({ e: x, k: y }) => <tr key={x.id} className={`click ${x.id === e.id ? 'on' : ''}`} onClick={() => setSel(x.id)}>
            <td><div className="row" style={{ gap: 8, alignItems: 'flex-start' }}><span className={`rail ${x.severity === 'bad' ? 'bad' : 'warn'}`} style={{ width: 3, alignSelf: 'stretch', flex: 'none' }} />
              <span><div style={{ fontWeight: 600, fontSize: 12.5 }}>{x.title}</div><div className="muted" style={{ fontSize: 11.5 }}>{x.asset} · {a && db.assetById[x.asset].name} · {x.agent}</div></span></div></td>
            <td className="r num muted" style={{ whiteSpace: 'nowrap' }}>{age(x.minutesAgo)} ago</td>
            <td className="r num" style={{ color: y.f.rulDays < 15 ? 'var(--bad)' : undefined }}>{y.f.rulDays} d</td>
            <td className="r num">{y.process ? '—' : pct(y.pBefore)}</td>
            <td className="r num">{y.process ? '—' : pct(y.p30)}</td>
            <td className="r num">{y.process ? <Tag c="line">Process loss</Tag> : <><b>{inr(y.exposureL, true)}</b><div className="muted" style={{ fontSize: 11 }}>{fmtNum(y.exposureH, 1)} h</div></>}</td>
            <td className="r num">{inr(y.fixL, true)}</td>
            <td><Tag c={STATUS[y.status]}>{y.status}</Tag></td>
          </tr>)}
        </tbody></table></div>
      </Card>

      <div className="grid g21">
        <Card title={e.title} sub={`${e.asset} · ${a.name} · ${a.line.name} · ${def.name}, ${R.label || R.days + ' d'}`} actions={<Tag c={e.severity === 'bad' ? 'bad' : 'warn'}>{e.severity === 'bad' ? 'Alarm' : 'Warning'}</Tag>}>
          <Trend data={hist.points} series={[{ key: 'v', name: def.name, type: 'line' }]} unit={def.unit} days={R.days} height={220}
            refs={[...(def.hi != null && def.hi > 0 ? [{ y: def.hi, label: `High ${def.hi}` }] : []), ...(def.lo ? [{ y: def.lo, label: `Low ${def.lo}` }] : [])]}
            xRefs={start >= R.from ? [{ x: start, label: 'anomaly start' }] : []} />
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8, fontSize: 12 }}>
            <span className="muted">{start < R.from ? `Started ${age(e.startHoursAgo * 60)} ago, before the selected period.` : `Started ${age(e.startHoursAgo * 60)} ago.`}</span>
            {others.length > 0 && <><span className="muted">Correlated tags now:</span>{others.map(t => <Tag key={t} c="line">{db.tagDef(e.asset, t).name} <LiveValue c={c} asset={e.asset} tag={t} /></Tag>)}</>}
          </div>
        </Card>
        <Card title="Root cause" sub={e.diagnosis ? `${e.agent} · confidence ${Math.round(e.diagnosis.confidence * 100)} %` : 'not yet diagnosed'}>
          {e.diagnosis ? <>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{e.diagnosis.title}</div>
            <div className="conf"><i style={{ width: `${e.diagnosis.confidence * 100}%` }} /></div>
            <div className="muted" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.06em', margin: '4px 0' }}>Evidence</div>
            <ul className="evid">{e.diagnosis.points.map(q => <li key={q}>{q}</li>)}</ul>
          </> : <div className="muted">The agent is still collecting evidence.</div>}
        </Card>
      </div>

      <div className="grid g2">
        <Card title="Impact: do nothing vs act" sub={k.process ? 'process anomaly · efficiency or quality loss, no failure risk' : `next 30 days · next window ${winLabel}`} flush>
          <table className="t"><thead><tr><th /><th className="r">If not acted on</th><th className="r">Planned fix</th></tr></thead><tbody>
            <tr><td className="muted">Probability of failure</td><td className="r num">{pct(k.pBefore)} before window · {pct(k.p30)} in 30 d</td><td className="r num">—</td></tr>
            <tr><td className="muted">Downtime</td><td className="r num">{fmtNum(k.failH, 1)} h unplanned</td><td className="r num">0 h · in planned stop</td></tr>
            <tr><td className="muted">Cost</td><td className="r num">{inr(k.consL)} if it fails</td><td className="r num">{inr(k.fixL)}</td></tr>
            <tr><td className="muted">Expected cost</td><td className="r num"><b>{inr(k.exposureL)}</b></td><td className="r num"><b>{inr(k.fixL)}</b></td></tr>
            <tr><td className="muted">Spare</td><td className="r" colSpan={2}>{k.spare.name} <Tag c={SPARE(k.spare)[0]}>{SPARE(k.spare)[1]}</Tag></td></tr>
          </tbody></table>
          <div style={{ padding: '10px 16px', fontSize: 12.5 }}>{k.process ? <>No failure risk: the loss is efficiency or quality. See the setpoint advisor and the KPI impact in the recommendation.</>
            : k.exposureL > k.fixL ? <>Acting saves about <b style={{ color: 'var(--good)' }}>{inr(k.exposureL - k.fixL)}</b> in expected cost over 30 days.</>
            : <>Expected 30-day cost of waiting is lower than the fix: keep monitoring and do it in a later window.</>}</div>
        </Card>
        <Card title="Recommendation and status" sub="advisory · approval needed before any action" actions={<Tag c={STATUS[k.status]}>{k.status}</Tag>}>
          {e.diagnosis && <div className="reco"><b>Do this</b>{e.diagnosis.reco}</div>}
          <div className="row" style={{ gap: 4, margin: '14px 0 4px', flexWrap: 'wrap' }} aria-label="Status steps">
            {STEPS.map((s, i) => <React.Fragment key={s}><span className={`tag ${i < step ? 'good' : i === step ? 'brand' : 'line'}`}>{i < step ? '✓ ' : ''}{s}</span>{i < STEPS.length - 1 && <span className="muted">›</span>}</React.Fragment>)}
          </div>
          {k.appr && <div className="muted" style={{ fontSize: 12 }}>{k.appr.from}: “{k.appr.title}” is waiting in Messages.</div>}
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {e.diagnosis && <button className="btn pri" onClick={() => app.actions.raiseWO(e.asset, e.diagnosis.title)}><Wrench />Raise work order</button>}
            <button className="btn" onClick={() => app.nav(`artefactory/${c.demo.id}-twin/${e.asset}`)}><Cpu />Asset twin</button>
            <button className="btn" onClick={() => app.openPanel({ kind: 'card', title: e.title, summary: [e.diagnosis?.title || e.title, e.diagnosis?.reco || ''] })}><Sparkles />Ask</button>
          </div>
        </Card>
      </div>

      <Card title="Failures closed in the period" sub={`major breakdowns (longer than 1.6 × MTTR) · ${R.label || R.days + ' d'} · repeats = same asset and cause in the 120 days before`} flush
        csv={{ name: 'closed-rca', rows: () => closed.map(w => ({ date: new Date(w.raised).toISOString(), asset: w.asset, cause: w.cause, downtime_h: w.downH, loss_lakh: w.lossL, repeats: w.repeats, countermeasure: w.action })) }}>
        {closed.length ? <div className="scroll-x"><table className="t"><thead><tr><th>Date</th><th>Asset</th><th>Cause</th><th className="r">Down</th><th className="r">Loss</th><th className="r">Repeats</th><th>Countermeasure</th></tr></thead><tbody>
          {closed.map(w => <tr key={w.id}><td className="num muted">{when(w.raised)}</td><td><b>{w.asset}</b><div className="muted" style={{ fontSize: 11.5 }}>{db.assetById[w.asset].name}</div></td><td>{w.cause}</td>
            <td className="r num">{fmtNum(w.downH, 1)} h</td><td className="r num">{inr(w.lossL, true)}</td>
            <td className="r num" style={{ color: w.repeats ? 'var(--bad)' : undefined, fontWeight: w.repeats ? 600 : 400 }}>{w.repeats ? `${w.repeats}×` : '—'}</td>
            <td><Tag c={w.action === 'Countermeasure done' ? 'good' : 'warn'}>{w.action}</Tag></td></tr>)}
        </tbody></table></div> : <Empty>No major breakdown in this period.</Empty>}
      </Card>
    </div>
  );
}
