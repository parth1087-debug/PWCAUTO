/* ================= Asset twin =================
   Users: maintenance manager, reliability engineer, area engineer. Questions it answers:
   1. What is this asset's condition now? (health, live tags against limits, remaining life, risk ₹)
   2. What changed? (each tag now vs 7 days ago, ranked by how unusual the change is)
   3. Why? (diagnosis with evidence and confidence, tag trend with limits)
   4. What do I do, and by when? (recommended job, spare, cost of the fix vs cost of failure, next window)
   5. How has it behaved? (work-order history, MTBF, MTTR, PM compliance)
   The twin is a live view (the artefact viewer hides the period selector), so trends use fixed windows. */
import React, { useState } from 'react';
import { FileText, Sparkles, Wrench } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { Card, Tag, Empty } from '../ui.jsx';
import { Trend, Spark, usePalette } from '../charts.jsx';
import { fmtNum } from '../../lib/data.js';
import { assetSources } from '../../shared/sources.js';
import { forecast, windowPlan, assetWOs, assetReliability, healthTrend, tagChanges, spareFor } from '../../shared/analytics/dash-mt.js';
import { D, inr, pct, when, ACTION, FIT, SPARE, stateOf, LiveBadge, Ring } from './mt-ui.jsx';

const TYPE = { BD: ['bad', 'Breakdown'], PM: ['line', 'Preventive'], CM: ['info', 'Corrective'], PdM: ['good', 'Predictive'] };

export function TwinView({ c, asset: assetId }) {
  const app = useApp(); const p = usePalette();
  const id = assetId || c.demo.maintenance?.spotlight;
  const a = c.db.assetById[id];
  const [sel, setSel] = useState(null);
  if (!a) return <Card><Empty>Asset {id} not found in this plant.</Empty></Card>;
  const db = c.db;
  const f = forecast(db).find(x => x.id === id);
  const ev = f.ev || (c.demo.events || []).find(e => e.asset === id && e.title);
  const plan = windowPlan(db); const job = plan.jobs.find(j => j.asset === id && j.kind === 'pdm'); const win = plan.win;
  const ch = tagChanges(db, id); const moved = ch.filter(x => x.sig >= 2);
  const focus = sel || ev?.tag || ch[0].tag;
  const def = db.tagDef(id, focus);
  const hist = db.history(id, focus, db.anchor - 14 * D, db.anchor);
  const evStart = ev && ev.tag === focus ? db.anchor - ev.startHoursAgo * 36e5 : null;
  const ht = healthTrend(db, id, 30);
  const rel = assetReliability(db, id);
  const wos = assetWOs(db, id).slice().sort((x, y) => (y.done ?? Infinity) - (x.done ?? Infinity) || y.raised - x.raised).slice(0, 8);
  const openWO = assetWOs(db, id).filter(w => w.done == null && w.type !== 'PM' || (w.type === 'PM' && w.done == null && w.due < db.anchor)).length;
  const src = assetSources(db, id);
  const spare = job?.spare || (ev ? spareFor(db, id, `${ev.diagnosis?.title} ${ev.diagnosis?.reco} ${ev.tag}`) : null);
  const winLabel = win.inDays === 0 ? 'tonight' : `${when(win.start)} (in ${win.inDays} d)`;
  const summary = moved.length
    ? moved.slice(0, 3).map(x => `${x.name} ${x.delta > 0 ? 'up' : 'down'} ${fmtNum(Math.abs(x.delta), Math.abs(x.delta) < 10 ? 1 : 0)} ${x.unit}${x.pct != null && Math.abs(x.pct) >= 1 ? ` (${x.delta > 0 ? '+' : '−'}${Math.round(Math.abs(x.pct))} %)` : ''}`).join(', ') + ' in 7 days; other tags stable.'
    : 'No tag moved outside its normal day-to-day range in the last 7 days.';

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="twin-hero card">
        <div className="row" style={{ gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <Ring v={f.health} />
          <div className="grow" style={{ minWidth: 220 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}><span className="mono muted">{a.id}</span><Tag c={f.state === 'Alarm' ? 'bad' : f.state === 'Watch' ? 'warn' : 'good'}>{f.state}</Tag><Tag c="line">Criticality {a.crit}</Tag><Tag c={ACTION[f.action][0]}>{ACTION[f.action][1]}</Tag><LiveBadge /></div>
            <h2 style={{ margin: '4px 0 2px', fontSize: 22, letterSpacing: '-.02em' }}>{a.name}</h2>
            <div className="muted">{c.demo.classes[a.cls].label} · {a.site.name} › {a.area.name} › {a.line.name}</div>
          </div>
          <div className="twin-facts" style={{ flex: '1 1 440px', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))' }}>
            <div><span>Remaining life</span><b style={{ color: f.rulDays < 15 ? 'var(--bad)' : undefined }}>{f.rulDays} d</b><div className="muted" style={{ fontSize: 11.5 }}>failure ≈ {when(f.failAt)}</div></div>
            <div><span>Risk, 30 days</span><b>{inr(f.riskL)}</b><div className="muted" style={{ fontSize: 11.5 }}>{pct(f.p30)} × {inr(f.consL)}</div></div>
            <div><span>Next window</span><b>{winLabel}</b><div className="muted" style={{ fontSize: 11.5 }}>{job ? FIT[job.fit][1] : 'no job planned'}</div></div>
            <div><span>Open work</span><b>{openWO}</b><div className="muted" style={{ fontSize: 11.5 }}>work orders</div></div>
          </div>
        </div>
        <div className="row" style={{ gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {ev?.diagnosis && <button className="btn pri" onClick={() => app.actions.raiseWO(id, ev.diagnosis.title)}><Wrench />Raise work order</button>}
          <button className="btn" onClick={() => app.nav(`artefactory/${c.demo.id}-maintenance/${id}`)}>Maintenance plan</button>
          {ev && <button className="btn" onClick={() => app.nav(`artefactory/${c.demo.id}-rca`)}>RCA</button>}
          <button className="btn" onClick={() => app.openPanel({ kind: 'card', title: `${a.id} · ${a.name}`, summary: [ev?.diagnosis ? ev.diagnosis.reco : `${a.name} is healthy.`] })}><Sparkles />Ask</button>
        </div>
      </div>

      <Card title="What changed" sub={summary}>
        <div className="tag-grid">{ch.map(x => {
          const d = db.tagDef(id, x.tag); const v = db.live(id, x.tag, app.tick); const st = stateOf(d, v);
          const pts = db.history(id, x.tag, db.anchor - 7 * D, db.anchor, '4h').points.map(q => ({ v: q.v }));
          const big = x.sig >= 2;
          return <button key={x.tag} className={`tag-tile ${focus === x.tag ? 'on' : ''} ${st}`} onClick={() => setSel(x.tag)}>
            <div className="row"><span className="ellipsis grow">{d.name}</span><span className={`dot-s ${st}`} /></div>
            <div className="tv" key={app.tick}>{fmtNum(v)}<small> {d.unit}</small></div>
            <div style={{ fontSize: 11.5, fontWeight: big ? 600 : 400, color: big ? (st === 'good' ? 'var(--text-2)' : `var(--${st === 'bad' ? 'bad' : 'warn'})`) : 'var(--muted)' }}>
              7 d: {x.delta >= 0 ? '+' : '−'}{fmtNum(Math.abs(x.delta), Math.abs(x.delta) < 10 ? 2 : 0)} {d.unit}{big ? '' : ' · normal'}</div>
            <div className="muted" style={{ fontSize: 11 }}>{d.lo != null || d.hi != null ? `limits ${d.lo ?? '—'} – ${d.hi ?? '—'} ${d.unit}` : `normal ≈ ${fmtNum(d.base)} ${d.unit}`}</div>
            <Spark data={pts} color={st === 'bad' ? p.bad : st === 'warn' ? p.warn : undefined} height={28} />
          </button>;
        })}</div>
      </Card>

      <div className="grid g21">
        <Card title={`${def.name}, last 14 days`} sub={`${src.tags.find(x => x.tag === focus)?.system || ''} · dashed = alarm limit${evStart ? ' · dotted = anomaly start' : ''}`}>
          <Trend data={hist.points} series={[{ key: 'v', name: def.name, type: 'line' }]} unit={def.unit} days={14} height={240}
            refs={[...(def.hi != null && def.hi > 0 ? [{ y: def.hi, label: `High ${def.hi}` }] : []), ...(def.lo ? [{ y: def.lo, label: `Low ${def.lo}` }] : [])]}
            xRefs={evStart && evStart > db.anchor - 14 * D ? [{ x: evStart, label: 'anomaly start' }] : []} />
        </Card>
        <Card title={ev?.diagnosis ? 'Why: diagnosis' : 'Condition'} sub={ev?.diagnosis ? `${ev.agent} · confidence ${Math.round(ev.diagnosis.confidence * 100)} %` : 'No open findings'}>
          {ev?.diagnosis ? <>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{ev.diagnosis.title}</div>
            <div className="conf"><i style={{ width: `${ev.diagnosis.confidence * 100}%` }} /></div>
            <ul className="evid">{ev.diagnosis.points.map(q => <li key={q}>{q}</li>)}</ul>
          </> : <div className="muted">All tags are inside their limits and learned normal bands. Remaining life {f.rulDays} d; next PM as per plan.</div>}
        </Card>
      </div>

      <div className="grid g2">
        <Card title="What to do" sub={ev?.diagnosis ? 'advisory · approval needed before any action' : 'routine care'}>
          {ev?.diagnosis ? <div className="reco"><b>Recommendation</b>{ev.diagnosis.reco}</div> : <div className="muted">Keep to the PM plan. No corrective job needed.</div>}
          {(job || spare) && <table className="t" style={{ marginTop: 12 }}><tbody>
            {job && <tr><td className="muted">Job</td><td className="r num">{job.hours} h × {job.crew} people · {inr(job.costL)}</td></tr>}
            {job && <tr><td className="muted">Next window</td><td className="r"><Tag c={FIT[job.fit][0]}>{FIT[job.fit][1]}</Tag> <span className="muted">{winLabel}</span></td></tr>}
            {spare && <tr><td className="muted">Spare</td><td className="r">{spare.name} <span className="mono muted">{spare.code}</span> <Tag c={SPARE(spare)[0]}>{SPARE(spare)[1]}</Tag></td></tr>}
            <tr><td className="muted">Cost if it fails</td><td className="r num"><b>{inr(f.consL)}</b> <span className="muted">({fmtNum(f.failH, 0)} h down + repair)</span></td></tr>
            {job && <tr><td className="muted">Cost of the planned fix</td><td className="r num"><b>{inr(job.costL)}</b> <span className="muted">in a planned stop</span></td></tr>}
          </tbody></table>}
        </Card>
        <Card title="Health and remaining life" sub={`last 30 days and projection to failure (≈ ${when(ht.failAt)}) · watch below 75, alarm below 50`}>
          <Trend data={ht.points} unit="" days={60} height={220} yDomain={[0, 100]}
            series={[{ key: 'health', name: 'Health', type: 'line', color: p.c1 }, { key: 'proj', name: 'Projection', type: 'line', dash: '5 4', color: p.bad }]}
            refs={[{ y: 75, label: 'Watch 75', color: p.warn }, { y: 50, label: 'Alarm 50', color: p.bad }]} xRefs={[{ x: db.anchor, label: 'now' }]} />
        </Card>
      </div>

      <Card title="Maintenance history" sub={`last 6 months · ${rel.breakdowns} breakdowns, ${fmtNum(rel.downH, 1)} h down, ${inr(rel.lossL)} lost · maintenance spend ${inr(rel.costL)}`} flush
        csv={{ name: `${id}-work-orders`, rows: () => assetWOs(db, id).map(w => ({ wo: w.id, type: w.type, title: w.title, raised: new Date(w.raised).toISOString(), done: w.done ? new Date(w.done).toISOString() : '', downtime_h: w.downH || 0, cost_lakh: w.costL })) }}>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', padding: '12px 16px 0', marginBottom: 4 }}>
          <div className="kpi"><div className="l">MTBF</div><div className="v">{rel.mtbf != null ? fmtNum(rel.mtbf) : '—'}<small>h</small></div><div className="f">{rel.mtbf == null ? 'no failure in 6 months' : `${rel.breakdowns} failures`}</div></div>
          <div className="kpi"><div className="l">MTTR</div><div className="v">{rel.mttr != null ? fmtNum(rel.mttr, 1) : '—'}<small>h</small></div><div className="f">mean repair time</div></div>
          <div className="kpi"><div className="l">PM compliance</div><div className="v">{rel.pm != null ? rel.pm : '—'}<small>%</small></div><div className="f">on time, 6 months</div></div>
          <div className="kpi"><div className="l">Downtime avoided</div><div className="v">{inr(rel.avoidedL)}</div><div className="f">faults caught early</div></div>
        </div>
        <div className="scroll-x"><table className="t"><thead><tr><th>Work order</th><th>Type</th><th>Job</th><th className="r">Down</th><th className="r">Cost</th><th>Status</th></tr></thead><tbody>
          {wos.map(w => <tr key={w.id}><td className="mono">{w.id}</td><td><Tag c={TYPE[w.type][0]}>{TYPE[w.type][1]}</Tag></td><td>{w.title}</td>
            <td className="r num">{w.downH ? `${fmtNum(w.downH, 1)} h` : '—'}</td><td className="r num">{inr(w.costL, true)}</td>
            <td className="muted num">{w.done ? `Closed ${when(w.done)}` : w.type === 'PM' && w.due < db.anchor ? <Tag c="warn">Overdue since {when(w.due)}</Tag> : `Open · due ${when(w.due)}`}</td></tr>)}
        </tbody></table></div>
      </Card>

      <details className="card" style={{ padding: '12px 16px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Data sources, records and documents <span className="muted" style={{ fontWeight: 400 }}>· {src.tags.length} tags bound to the UNS{src.docs.length ? ` · ${src.docs.length} documents` : ''}</span></summary>
        <div className="grid g2" style={{ marginTop: 12 }}>
          <div className="scroll-x"><table className="t"><thead><tr><th>Tag</th><th>Source system</th><th>Address</th><th>Sampling</th></tr></thead><tbody>
            {src.tags.map(t => <tr key={t.tag}><td><b style={{ fontWeight: 600 }}>{t.name}</b><div className="mono muted" style={{ fontSize: 10.5 }}>{t.uns}</div></td><td>{t.system}<div className="muted" style={{ fontSize: 11 }}>{t.via}</div></td><td className="mono" style={{ fontSize: 11 }}>{t.address}</td><td className="muted">{t.sampling}</td></tr>)}
          </tbody></table></div>
          <div className="scroll-x"><table className="t"><tbody>
            {src.records.map(x => <tr key={x.object}><td className="muted">{x.object}</td><td className="mono">{x.id}</td><td>{x.system}</td></tr>)}
            {src.docs.map(d => <tr key={d.name}><td colSpan={2}><FileText size={14} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--muted)' }} />{d.name}</td><td className="muted">{d.type}</td></tr>)}
          </tbody></table></div>
        </div>
      </details>
    </div>
  );
}
