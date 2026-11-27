/* Built-in dashboard: maintenance and reliability.
   Users: maintenance manager and reliability engineer. Questions it answers:
   1. Which assets will fail next, and when? (remaining life, probability, risk ₹ = consequence × probability)
   2. What work goes into the next shutdown window? (jobs that fit, spares, what cannot wait)
   3. Are PM compliance, MTBF, MTTR, backlog and breakdowns improving?
   4. Where does breakdown downtime come from? (causes, asset classes, bad actors)
   5. What is the downtime avoided by acting early worth?
   Sub-path `sel` selects an asset. Everything time-based follows the period selector (R). */
import React, { useState } from 'react';
import { Sparkles, Wrench, Cpu } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { Card, HealthBar, Tag, Empty } from '../../components/ui.jsx';
import { Trend, usePalette } from '../../components/charts.jsx';
import { fmtNum } from '../../lib/data.js';
import { reliability, weekly, forecast, windowPlan, causes, byClass, badActors, targets } from '../../shared/analytics/dash-mt.js';
import { MKpi, Headline, ParetoBars, Capacity, RiskMatrix, ACTION, FIT, SPARE, inr, pct, when, D } from '../../components/boards/mt-ui.jsx';

export default function Maintenance({ c, R, sel }) {
  const { nav, actions, openPanel } = useApp(); const p = usePalette();
  const db = c.db; const T = targets(c.demo);
  const fc = forecast(db); const plan = windowPlan(db); const win = plan.win;
  const rel = reliability(db, R.from, R.to); const n = rel.now, pv = rel.prev;
  const wk = weekly(db, R.from, R.to, 12);
  const [all, setAll] = useState(false); const [allCls, setAllCls] = useState(false);
  const go = id => nav(`artefactory/${c.demo.id}-maintenance/${id}`);

  const at = fc.find(x => x.id === sel) || fc[0];
  const ev = at.ev; const asset = at.asset;
  const tags = c.demo.classes[asset.cls].tags;
  const [tag, setTag] = useState(null);
  const tk = tag && tags.find(t => t[0] === tag) ? tag : (ev ? ev.tag : tags[0][0]);
  const h = db.history(at.id, tk, R.from, R.to); const def = db.tagDef(at.id, tk);

  const soon = fc.filter(x => x.action !== 'monitor');
  const rows = all ? fc : fc.filter((x, i) => x.action !== 'monitor' || i < Math.max(8, soon.length));
  const risk30 = fc.reduce((s, x) => s + x.riskL, 0);
  const fits = plan.jobs.filter(j => j.fit === 'yes').length, waitSpare = plan.jobs.filter(j => j.fit === 'spare'), before = plan.jobs.filter(j => j.fit === 'before'), later = plan.jobs.filter(j => j.fit === 'next');
  const cz = causes(db, R.from, R.to); const cls = byClass(db, R.from, R.to); const bad = badActors(db, R.from, R.to, 6);
  const winLabel = win.inDays === 0 ? 'tonight' : win.inDays === 1 ? 'tomorrow' : `in ${win.inDays} days (${when(win.start)})`;
  const relNote = n.relDays > R.days ? `rolling ${n.relDays} d · ${n.failuresA} failures` : `${n.failuresA} failures`;

  return <>
    <Headline tone={before.length ? 'bad' : 'brand'}><div>
      <b>{soon.length} asset{soon.length === 1 ? '' : 's'}</b> need work soon; <b>{inr(risk30)}</b> of failure cost is at risk in the next 30 days
      {fc[0] && <> (largest: <b>{fc[0].id}</b>, {inr(fc[0].riskL)}, about {fc[0].rulDays} d of life left)</>}.
      {' '}Next window <b>{winLabel}</b>, {win.hours} h: <b>{fits}</b> job{fits === 1 ? '' : 's'} fit
      {waitSpare.length > 0 && <>, <b>{waitSpare.length}</b> wait{waitSpare.length === 1 ? 's' : ''} for spares</>}
      {before.length > 0 && <>, <b style={{ color: 'var(--bad)' }}>{before.map(j => j.asset).join(', ')}</b> cannot wait for it</>}.
    </div></Headline>

    <div className="kpis">
      <MKpi label="PM compliance" value={n.pm} dec={0} unit="%" prev={pv.pm} better="up" target={T.pm} note={n.pmDue ? `${n.pmDue - n.pmLate} of ${n.pmDue} PMs on time${n.pmDays > R.days ? ` · rolling ${n.pmDays} d` : ''}` : 'no PM due'} spark={wk.map(w => w.pm).filter(v => v != null)} />
      <MKpi label="MTBF, critical assets" value={n.mtbf} unit="h" prev={pv.mtbf} better="up" target={T.mtbf} note={relNote} spark={wk.map(w => w.mtbf).filter(v => v != null)} />
      <MKpi label="MTTR" value={n.mttr} dec={1} unit="h" prev={pv.mttr} better="down" target={T.mttr} note={`mean repair time, ${n.relDays > R.days ? `rolling ${n.relDays} d` : 'period'}`} spark={wk.map(w => w.mttr).filter(v => v != null)} />
      <MKpi label="Breakdowns" value={n.breakdowns} unit={`in ${R.label || R.days + ' d'}`} prev={pv.breakdowns} better="down" note={`${fmtNum(n.downH, 0)} h down · ${inr(n.lossL)} lost`} spark={wk.map(w => w.breakdowns)} />
      <MKpi label="Backlog" value={n.backlogWk} dec={1} unit="crew-weeks" prev={pv.backlogWk} better="down" target={T.backlog} note={`${n.openWO} open WOs · ${n.overduePM} PM overdue`} spark={wk.map(w => w.backlog)} />
      <MKpi label="Downtime avoided" value={n.avoidedL} fmt={inr} prev={pv.avoidedL} better="up" note={`${fmtNum(n.avoidedH, 0)} h · ${n.pdm} fault${n.pdm === 1 ? '' : 's'} caught early`} spark={wk.map(w => w.avoidedL)} />
    </div>

    <div className="grid g21">
      <Card title="Failure forecast" sub={`worst risk first · risk = cost of failure × probability in 30 days · select an asset`} flush
        actions={<button className="btn sm" onClick={() => setAll(!all)}>{all ? 'Show at-risk only' : `Show all ${fc.length}`}</button>}
        csv={{ name: 'failure-forecast', rows: () => fc.map(x => ({ asset: x.id, name: x.name, criticality: x.crit, health: x.health, life_left_days: x.rulDays, p_fail_30d: +x.p30.toFixed(2), cost_of_failure_lakh: x.consL, risk_lakh: x.riskL, action: ACTION[x.action][1], finding: x.finding || '' })) }}>
        <div className="scroll-x" style={{ maxHeight: 470, overflowY: 'auto' }}><table className="t"><thead><tr><th>Asset</th><th>Health</th><th className="r">Life left</th><th className="r">P(fail) 30 d</th><th className="r">Risk</th><th>Next step</th></tr></thead><tbody>
          {rows.map(x => <tr key={x.id} className={`click ${x.id === at.id ? 'on' : ''}`} onClick={() => go(x.id)}>
            <td><div className="b">{x.id} <Tag c="line">{x.crit}</Tag></div><div className="muted ellipsis" style={{ fontSize: 11.5, maxWidth: 230 }}>{x.finding || x.name}</div></td>
            <td><HealthBar v={x.health} w={52} /></td>
            <td className="r num" style={{ color: x.rulDays < 15 ? 'var(--bad)' : undefined, fontWeight: x.rulDays < 15 ? 600 : 400 }}>{x.rulDays} d<div className="muted" style={{ fontSize: 11, fontWeight: 400 }}>{when(x.failAt)}</div></td>
            <td className="r num">{pct(x.p30)}</td>
            <td className="r num" style={{ whiteSpace: 'nowrap' }}><b>{inr(x.riskL, true)}</b><div className="muted" style={{ fontSize: 11 }}>of {inr(x.consL, true)}</div></td>
            <td><Tag c={ACTION[x.action][0]}>{ACTION[x.action][1]}</Tag></td>
          </tr>)}
        </tbody></table></div>
      </Card>

      <Card title={`${at.id} · ${at.name}`} sub={`${at.line} · health ${at.health} · ${at.rulDays} d of life left · ${inr(at.riskL)} at risk`}
        ask={{ kind: 'card', title: `${at.id} · ${at.name}`, summary: ev ? [`${ev.diagnosis.title}. ${ev.diagnosis.reco}`, ...ev.diagnosis.points] : [`${at.id} is healthy (score ${at.health}).`] }}
        csv={{ name: `${at.id}-${tk}`, rows: () => h.points.map(x => ({ time: new Date(x.t).toISOString(), value: x.v, unit: h.unit })) }}>
        <div className="chips" style={{ marginBottom: 6 }}>{tags.map(t => <button key={t[0]} className={`tag ${t[0] === tk ? 'brand' : 'line'}`} onClick={() => setTag(t[0])}>{t[1]}</button>)}</div>
        <Trend data={h.points} series={[{ key: 'v', name: def.name, type: 'line' }]} unit={def.unit} days={R.days} height={170}
          refs={[...(def.hi != null && def.hi > 0 ? [{ y: def.hi, label: `High ${def.hi}` }] : []), ...(def.lo ? [{ y: def.lo, label: `Low ${def.lo}` }] : [])]} />
        {ev ? <div style={{ marginTop: 8 }}>
          <div className="muted" style={{ fontSize: 12 }}>{ev.agent} · confidence {Math.round(ev.diagnosis.confidence * 100)} %</div>
          <div style={{ fontWeight: 600, margin: '2px 0 6px' }}>{ev.diagnosis.title}</div>
          <div className="reco" style={{ fontSize: 13 }}><b>Do this: </b>{ev.diagnosis.reco}</div>
        </div> : <p className="muted" style={{ marginTop: 8 }}>No anomaly. All tags inside learned normal bands; next step: {ACTION[at.action][1].toLowerCase()}.</p>}
        <div className="chips" style={{ marginTop: 10 }}>
          {ev && <button className="btn pri sm" onClick={() => actions.raiseWO(at.id, ev.diagnosis.title)}><Wrench />Raise work order</button>}
          <button className="btn sm" onClick={() => nav(`artefactory/${c.demo.id}-twin/${at.id}`)}><Cpu />Asset twin</button>
          <button className="btn sm" onClick={() => openPanel({ kind: 'card', title: `${at.id} · ${at.name}`, summary: [ev ? ev.diagnosis.reco : `${at.id} health ${at.health}`] })}><Sparkles />Ask</button>
        </div>
      </Card>
    </div>

    <Card title={`Next window: ${win.name}`} sub={`${winLabel} · ${win.hours} h · ${win.crew} technicians`} flush className="mt"
      csv={{ name: 'window-plan', rows: () => plan.jobs.map(j => ({ asset: j.asset, job: j.what, hours: j.hours, crew: j.crew, crew_hours: j.crewH, spare: j.spare ? j.spare.name : '', spare_status: SPARE(j.spare)[1], cost_lakh: j.costL, risk_lakh: j.riskL, plan: FIT[j.fit][1] })) }}>
      <div style={{ padding: '10px 16px 12px' }}><Capacity used={plan.used} cap={plan.cap} /></div>
      {plan.jobs.length ? <div className="scroll-x"><table className="t"><thead><tr><th>Job</th><th className="r">Crew-h</th><th>Spare</th><th className="r">Cost</th><th className="r">Risk removed</th><th>Plan</th></tr></thead><tbody>
        {plan.jobs.map((j, i) => <tr key={j.asset + i} className="click" onClick={() => go(j.asset)}>
          <td style={{ minWidth: 200 }}><div className="b" style={{ whiteSpace: 'nowrap' }}>{j.asset} <Tag c="line">{j.crit}</Tag></div><div className="muted" style={{ fontSize: 11.5, maxWidth: 320 }}>{j.what}</div></td>
          <td className="r num">{j.crewH}<div className="muted" style={{ fontSize: 11 }}>{j.hours} h × {j.crew}</div></td>
          <td>{j.spare ? <><div style={{ fontSize: 12 }}>{j.spare.name}</div><Tag c={SPARE(j.spare)[0]}>{SPARE(j.spare)[1]}</Tag></> : <span className="muted">—</span>}</td>
          <td className="r num" style={{ whiteSpace: 'nowrap' }}>{inr(j.costL, true)}</td>
          <td className="r num" style={{ whiteSpace: 'nowrap' }}>{j.riskL ? inr(j.riskL, true) : '—'}</td>
          <td><Tag c={FIT[j.fit][0]}>{FIT[j.fit][1]}</Tag></td>
        </tr>)}
      </tbody></table></div> : <Empty>No jobs need the window. All assets healthy.</Empty>}
      {(before.length > 0 || later.length > 0 || waitSpare.length > 0) && <div className="muted" style={{ fontSize: 12, padding: '10px 16px' }}>
        {before.length > 0 && <div><b style={{ color: 'var(--bad)' }}>Cannot wait:</b> {before.map(j => `${j.asset} (${j.rulDays} d of life)`).join(', ')} — plan a controlled stop before the window.</div>}
        {waitSpare.length > 0 && <div><b>Expedite spares:</b> {waitSpare.map(j => `${j.spare.name} for ${j.asset}`).join('; ')}.</div>}
        {later.length > 0 && <div><b>Over capacity:</b> {later.map(j => j.asset).join(', ')} move to the following window.</div>}
      </div>}
    </Card>

    <div className="grid g2 mt">
      <Card title="Risk matrix" sub="criticality × probability of failure in 30 days · select an asset">
        <RiskMatrix items={fc} sel={at.id} onPick={go} />
      </Card>
      <Card title="Breakdown downtime by cause" sub={`${R.label || R.days + ' d'} · hours and ₹ lost · Pareto`}
        csv={{ name: 'downtime-by-cause', rows: () => cz.map(x => ({ cause: x.cause, breakdowns: x.n, hours: x.h, loss_lakh: x.lossL, cumulative_pct: x.cum })) }}>
        {cz.length ? <><ParetoBars rows={cz.map(x => ({ name: x.cause, value: x.h }))} unit="h" extra={r => inr(cz.find(x => x.cause === r.name).lossL, true)} />
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Top {cz.findIndex(x => x.cum >= 75) + 1 || cz.length} of {cz.length} causes give {cz[Math.max(0, cz.findIndex(x => x.cum >= 75))]?.cum ?? 100} % of breakdown hours.</div></>
          : <Empty>No breakdowns in this period.</Empty>}
      </Card>
    </div>

    <Card title="Is reliability improving?" sub={`weekly · ${wk.length} weeks to ${when(R.to)} · dashed line = target`} className="mt">
      <div className="grid g2" style={{ gap: 20 }}>
        <Small title="PM compliance (rolling 4 weeks), %" data={wk} k="pm" unit="%" target={T.pm} p={p} R={R} />
        <Small title="Breakdowns per week" data={wk} k="breakdowns" bar p={p} R={R} />
        <Small title="MTBF, critical assets (rolling), h" data={wk} k="mtbf" unit="h" target={T.mtbf} p={p} R={R} />
        <Small title="MTTR, h" data={wk} k="mttr" unit="h" target={T.mttr} p={p} R={R} />
      </div>
    </Card>

    <Card title="Bad actors" sub={`assets with the highest breakdown cost · ${R.label || R.days + ' d'}`} flush className="mt">
      {bad.length ? <div className="scroll-x"><table className="t"><thead><tr><th>Asset</th><th className="r">Failures</th><th className="r">Down</th><th className="r">Loss</th><th>Main cause</th></tr></thead><tbody>
        {bad.map(b => <tr key={b.asset} className="click" onClick={() => go(b.asset)}><td><b>{b.asset}</b><div className="muted ellipsis" style={{ fontSize: 11.5, maxWidth: 200 }}>{b.name}</div></td><td className="r num">{b.n}</td><td className="r num" style={{ whiteSpace: 'nowrap' }}>{fmtNum(b.h, 1)} h</td><td className="r num" style={{ whiteSpace: 'nowrap' }}>{inr(b.lossL, true)}</td><td className="muted">{b.top}</td></tr>)}
      </tbody></table></div> : <Empty>No breakdowns in this period.</Empty>}
    </Card>

    <Card title="MTBF and MTTR by asset class" sub={`last ${cls[0]?.days || 90} days (at least 90 so every class has enough run time) · worst loss first`} flush className="mt"
      actions={cls.length > 10 && <button className="btn sm" onClick={() => setAllCls(!allCls)}>{allCls ? 'Top 10' : `Show all ${cls.length}`}</button>}
      csv={{ name: 'mtbf-mttr-by-class', rows: () => cls.map(x => ({ class: x.label, assets: x.assets, failures: x.f, mtbf_h: x.mtbf, mttr_h: x.mttr, availability_pct: x.avail, downtime_h: x.h, loss_lakh: x.lossL })) }}>
      <div className="scroll-x"><table className="t"><thead><tr><th>Asset class</th><th className="r">Assets</th><th className="r">Failures</th><th className="r">MTBF</th><th className="r">MTTR</th><th className="r">Availability</th><th className="r">Downtime</th><th className="r">Loss</th></tr></thead><tbody>
        {(allCls ? cls : cls.slice(0, 10)).map(x => <tr key={x.cls}><td>{x.label} <Tag c="line">{x.crit}</Tag></td><td className="r num">{x.assets}</td><td className="r num">{x.f}</td><td className="r num">{x.mtbf != null ? `${fmtNum(x.mtbf)} h` : 'no failure'}</td><td className="r num">{x.mttr != null ? `${fmtNum(x.mttr, 1)} h` : '—'}</td>
          <td className="r num" style={{ color: x.avail < 98 ? 'var(--warn)' : undefined }}>{fmtNum(x.avail, 2)} %</td><td className="r num">{fmtNum(x.h, 1)} h</td><td className="r num">{inr(x.lossL, true)}</td></tr>)}
      </tbody></table></div>
    </Card>
  </>;
}

function Small({ title, data, k, unit, target, bar, p }) {
  const pts = data.map(w => ({ t: w.t, v: w[k] })).filter(w => w.v != null);
  const vs = pts.map(x => x.v).concat(target != null ? [target] : []); const mn = Math.min(...vs), mx = Math.max(...vs);
  const pad = Math.max((mx - mn) * 0.15, Math.abs(mx) * 0.02, 0.5);
  const yDomain = bar ? [0, Math.max(2, Math.ceil(mx * 1.1))] : [Math.max(0, Math.floor(mn - pad)), unit === '%' ? Math.min(100, Math.ceil(mx + pad)) : Math.ceil(mx + pad)];
  return <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{title}</div>
    {/* target drawn as a dashed series so it shows in the tooltip */}
    <Trend data={target != null ? pts.map(x => ({ ...x, tgt: target })) : pts} unit={unit} days={60} height={150} yDomain={yDomain}
      series={[{ key: 'v', name: title.split(',')[0], type: bar ? 'bar' : 'line', color: bar ? p.bar : p.c1 }, ...(target != null ? [{ key: 'tgt', name: 'Target', type: 'line', dash: '4 3', color: p.good, width: 1.5 }] : [])]} />
  </div>;
}
