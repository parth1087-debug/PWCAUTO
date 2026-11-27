/* Built-in dashboard: Overview (plant / unit / portfolio).
   Who: plant head or unit head, every morning.
   Questions it answers:
     1. Are we on track for this period and this month?  → headline, output (or demand) vs plan, month-end forecast
     2. What is costing us most?                          → loss Pareto in ₹ lakh for the period
     3. What needs my decision now?                       → approvals first, then critical alerts, with ₹ where known
     4. Which area / site is in trouble?                  → areas ranked worst-first (multi-site renewables: export vs day-ahead schedule per site)
   Industry-aware: renewables compare export with the day-ahead schedule per site (MWh, CUF, PR / power-curve index);
   the utilities plant (ems) shows energy cost and maximum demand instead of production; the power unit adds PLF. */
import React from 'react';
import { useApp } from '../../App.jsx';
import { Card, HealthBar, Tag, Empty } from '../../components/ui.jsx';
import { fmtNum, fmtRel } from '../../lib/data.js';
import { KpiRow } from './common.jsx';
import { profileOf, outputSummary, lossPareto, areaStatus, siteStatus, demandSummary, decisions, fmtLakh, kpiStats } from '../../shared/analytics/dash-ov.js';
import { PlanBars, DemandBars, Legend, Fact, Bullet } from './dash-ov-ui.jsx';

export default function Overview({ c, R }) {
  const { messages, nav } = useApp();
  const prof = profileOf(c.demo);
  const renew = prof === 'renewable', util = prof === 'utility';
  const o = outputSummary(c, R);
  const dm = util ? demandSummary(c, R) : null;
  const loss = lossPareto(c.demo, R);
  const dec = decisions(messages);
  const sites = renew ? siteStatus(c, R) : null;
  const areas = areaStatus(c);
  const stats = kpiStats(c.db, R);
  const offOrRisk = stats.filter(k => k.status === 'Off track' || k.status === 'At risk');
  const planName = renew ? 'Schedule' : 'Plan';
  const planLow = renew ? 'day-ahead schedule' : 'plan';
  const what = renew ? 'Export' : prof === 'power' ? 'Generation' : 'Output';
  const nApp = dec.filter(m => m.type === 'approval').length, nBad = dec.filter(m => m.sev === 'bad').length;
  const worstArea = renew ? sites[0] : areas[0];
  const top = loss.rows[0];
  const onTrack = util ? dm.peakPct < 100 : o.pct >= 98;

  /* one-line headline */
  const head = util
    ? `Energy cost ${fmtLakh(dm.costLakh)} for ${fmtNum(dm.mwh, 0)} MWh over ${R.label}; peak demand ${fmtNum(dm.peakPct, 1)} % of contract.`
    : `${what} ${fmtNum(o.pct, 1)} % of ${planLow} over ${R.label}${o.gap < 0 ? ` (${fmtNum(o.gap)} ${o.unit}${o.gapLakh != null ? `, ${fmtLakh(o.gapLakh)}` : ''})` : ''}; month-end forecast ${fmtNum(o.mtd.fcPct, 1)} % of plan.`;
  const head2 = `${top ? `Biggest loss: ${top.name.replace(/\s*\(.*\)/, '')} (${fmtLakh(top.lakh)}).` : ''} ${nApp + nBad ? `${nApp} approval${nApp === 1 ? '' : 's'} and ${nBad} critical alert${nBad === 1 ? '' : 's'} waiting.` : 'Nothing waiting for you.'}`;

  const LossCard = (
    <Card title={top ? `${top.name.replace(/\s*\(.*\)/, '')} is costing most: ${fmtLakh(top.lakh)}` : 'Losses'} sub={`${fmtLakh(loss.total)} lost over ${R.label} · ₹ at ${loss.basis}`}
      ask={{ kind: 'card', title: 'Loss Pareto', summary: loss.rows.map(x => `${x.name}: ${fmtNum(x.qty, 0)} ${loss.unit}, ${fmtLakh(x.lakh)}`) }}
      csv={{ name: 'losses', rows: () => loss.rows.map(x => ({ loss: x.name, quantity: Math.round(x.qty), unit: loss.unit, inr_lakh: Math.round(x.lakh * 10) / 10, cumulative_pct: Math.round(x.cum * 100) })) }}>
      {loss.rows.map(x => <div key={x.name} style={{ padding: '6px 0' }}>
        <div className="row" style={{ fontSize: 12.5, gap: 8 }}><span className="grow ellipsis b" title={x.name}>{x.name}</span>
          {loss.unit !== '₹ L' && <span className="num muted">{fmtNum(x.qty, 0)} {loss.unit}</span>}<b className="num" style={{ width: 64, textAlign: 'right' }}>{fmtLakh(x.lakh)}</b><span className="num muted" style={{ width: 40, textAlign: 'right', fontSize: 11.5 }}>{Math.round(x.cum * 100)} %</span></div>
        <div style={{ marginTop: 4 }}><Bullet value={x.lakh} max={x.lakh} total={loss.rows[0].lakh} tone={x.cum - x.share < 0.8 ? 'brand' : 'muted'} h={7} /></div></div>)}
      <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>Blue bars make up the first 80 % of the loss; % is cumulative. Detail on the {c.demo.dashNames?.cost || 'cost'} board.</div>
    </Card>
  );

  return <>
    <Card className="ov-head" style={{ marginBottom: 16, borderLeft: `3px solid var(--${onTrack ? 'good' : 'warn'})` }}>
      <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.4 }}>{head}</div>
      <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{head2}</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginTop: 12 }}>
        {util
          ? <Fact label="Energy cost" value={fmtLakh(dm.costLakh)} sub={`${fmtNum(dm.mwh, 0)} MWh at ₹${fmtNum(dm.rate, 2)}/kWh`} />
          : <Fact label={`${what} vs ${planLow}`} value={`${fmtNum(o.pct, 1)} %`} tone={o.pct >= 98 ? 'good' : o.pct >= 95 ? 'warn' : 'bad'}
              sub={`${fmtNum(o.actual)} of ${fmtNum(o.plan)} ${o.unit}`} />}
        {util
          ? <Fact label="Peak demand" value={`${fmtNum(dm.peak)} kVA`} tone={dm.peakPct >= 100 ? 'bad' : dm.peakPct >= 90 ? 'warn' : 'good'} sub={`${fmtNum(dm.peakPct, 1)} % of ${fmtNum(dm.contract)} kVA contract`} />
          : <Fact label="Month-end forecast" value={`${fmtNum(o.mtd.fcPct, 1)} %`} tone={o.mtd.fcPct >= 98 ? 'good' : 'warn'} sub={`${fmtNum(o.mtd.forecast)} ${o.unit} at today's run-rate`} />}
        <Fact label="Costing most" value={top ? fmtLakh(top.lakh) : '—'} sub={top ? `${top.name} · ${fmtLakh(loss.total)} in all` : 'No losses booked'} onClick={() => nav(`artefactory/${c.demo.id}-cost`)} />
        <Fact label="Decisions waiting" value={nApp + nBad} tone={nApp + nBad ? 'warn' : 'good'} sub={`${nApp} approvals · ${nBad} critical alerts`} onClick={() => nav('messages')} />
        <Fact label={renew ? 'Weakest site' : 'Area in trouble'} value={renew ? `${worstArea.name}` : worstArea ? worstArea.name : '—'} tone={renew ? (worstArea.pct < 97 ? 'warn' : undefined) : worstArea?.alarms ? 'bad' : worstArea?.watch ? 'warn' : 'good'}
          sub={renew ? `${fmtNum(worstArea.pct, 1)} % of schedule · ${worstArea.topLoss}` : worstArea ? (worstArea.alarms ? `${worstArea.alarms} in alarm · ${worstArea.low.id} health ${worstArea.low.health}` : worstArea.watch ? `${worstArea.watch} on watch · ${worstArea.low.id}` : 'All assets normal') : ''}
          onClick={renew || !worstArea?.low ? undefined : () => nav(`artefactory/${c.demo.id}-twin/${worstArea.low.id}`)} />
      </div>
    </Card>

    <KpiRow c={c} ids={c.demo.overview} R={R} />

    <div className="grid g21">
      {util
        ? <Card title={`Maximum demand peaked at ${fmtNum(dm.peakPct, 1)} % of contract`} sub={`${dm.hourly ? 'Hourly average demand' : 'Daily peak of hourly-average demand'} at the grid incomer, kVA (15-min MD in the KPI tile runs higher) · ${dm.over90} ${dm.hourly ? 'hours' : 'days'} above the 90 % alert line`}
            ask={{ kind: 'card', title: 'Maximum demand vs contract', summary: [`Peak ${dm.peak} kVA against a contract of ${dm.contract} kVA (${fmtNum(dm.peakPct, 1)} %) over ${R.label}.`] }}
            csv={{ name: 'demand', rows: () => dm.pts.map(p => ({ time: new Date(p.t).toISOString(), kva: p.v, mwh: p.mwh })) }}>
            <DemandBars data={dm.pts} contract={dm.contract} hourly={dm.hourly} height={300} />
            <Legend items={[['Demand', 'var(--brand)'], ['Above 90 % of contract', 'var(--warn)'], ['Contract demand', 'var(--bad)', true]]} />
          </Card>
        : <Card title={`${what} at ${fmtNum(o.pct, 1)} % of ${planLow}`} sub={`${fmtNum(o.actual)} of ${fmtNum(o.plan)} ${o.unit} over ${R.label}${o.short ? ' · chart shows the last 7 days (daily data)' : ''} · ${o.below} day${o.below === 1 ? '' : 's'} below 95 %`}
            ask={{ kind: 'card', title: `${what} vs ${planName}`, summary: [`${what} was ${fmtNum(o.actual)} ${o.unit} against ${fmtNum(o.plan)} (${o.pct} %) over ${R.label}. Month-end forecast ${fmtNum(o.mtd.fcPct, 1)} % of plan.`] }}
            csv={{ name: 'production', rows: () => o.days.map(d => ({ date: new Date(d.t).toISOString().slice(0, 10), plan: d.plan, actual: d.actual })) }}>
            <PlanBars data={o.days} unit={o.unit} planName={planName} height={300} />
            <Legend items={[[`${what} per day`, 'var(--brand)'], ['Under 95 % of ' + planLow, 'var(--warn)'], [planName, 'var(--muted)', true]]} />
          </Card>}
      <Card title="Needs your decision" sub={dec.length ? `${nApp} approvals · ${nBad} critical · ${dec.length - nApp - nBad} warnings` : 'Nothing open'} flush>
        {dec.slice(0, 6).map(m => <button key={m.id} className="feed-i" onClick={() => nav('messages/' + m.id)}><span className={`rail ${m.sev}`} /><span style={{ minWidth: 0 }}>
          <span className="row" style={{ fontSize: 11.5 }}><b style={{ color: m.type === 'approval' ? 'var(--brand)' : m.sev === 'bad' ? 'var(--bad)' : 'var(--warn)' }}>{m.type === 'approval' ? 'Approve' : m.sev === 'bad' ? 'Critical' : 'Warning'}</b>{m.asset && <span className="mono muted">{m.asset}</span>}<span className="muted right">{fmtRel(m.time)}</span></span>
          <span style={{ display: 'block', fontSize: 13, marginTop: 2 }}>{m.title}</span>
          {m.money && m.type === 'approval' && <span className="muted" style={{ fontSize: 11.5 }}>Value at stake: <b className="num" style={{ color: 'var(--text)' }}>{m.money}</b></span>}
        </span></button>)}
        {dec.length > 6 && <button onClick={() => nav('messages')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 0, color: 'var(--brand)', fontSize: 12.5, cursor: 'pointer' }}>{dec.length - 6} more in Messages →</button>}
        {!dec.length && <Empty>Nothing needs your decision.</Empty>}
      </Card>
    </div>

    <div className={`grid ${renew ? 'g21' : 'g2'} mt`}>
      {!renew && LossCard}

      {renew
        ? <Card title={`${sites[0].name} is furthest behind: ${fmtNum(sites[0].pct, 1)} % of schedule`} sub={`Export vs day-ahead schedule per site over ${R.label}${o.short ? ' (last 7 days)' : ''}, worst first`} flush
            csv={{ name: 'sites', rows: () => sites.map(s => ({ site: s.name, mw: s.cap, scheduled_mwh: Math.round(s.expected), actual_mwh: Math.round(s.actual), pct: Math.round(s.pct * 10) / 10, availability: Math.round(s.avail * 10) / 10, cuf: Math.round(s.cuf * 10) / 10, top_loss: s.topLoss })) }}>
            <div className="scroll-x"><table className="t"><thead><tr><th>Site</th><th className="r">Export MWh</th><th className="r">vs schedule</th><th className="r">Avail. %</th><th className="r">{c.demo.id === 'solar' ? 'PR %' : 'PCPI %'}</th><th className="r">CUF %</th><th>Top issue</th></tr></thead>
              <tbody>{sites.map(s => <tr key={s.slug}>
                <td className="b">{s.name}<div className="muted" style={{ fontWeight: 400, fontSize: 11.5 }}>{fmtNum(s.cap)} {c.demo.id === 'solar' ? 'MWp' : 'MW'}{s.alarms ? ` · ${s.alarms} in alarm` : s.watch ? ` · ${s.watch} on watch` : ''}</div></td>
                <td className="r num">{fmtNum(s.actual, 0)}</td>
                <td className="r num" style={{ color: s.gap < 0 ? 'var(--bad)' : 'var(--good)', fontWeight: 600 }}>{fmtNum(s.pct, 1)} %<div style={{ fontWeight: 400, fontSize: 11.5 }}>{s.gap < 0 ? '−' : '+'}{fmtNum(Math.abs(s.gap), 0)}</div></td>
                <td className="r num">{fmtNum(s.avail, 1)}</td><td className="r num">{fmtNum(s.perf, 1)}</td><td className="r num">{fmtNum(s.cuf, 1)}</td>
                <td style={{ fontSize: 12.5, minWidth: 140 }}>{s.topLoss}<div className="muted" style={{ fontSize: 11.5 }}>{s.worstBlock}</div></td></tr>)}</tbody></table></div>
          </Card>
        : null}
      {renew && LossCard}
      {!renew && <Card title={(n => n ? `${n} ${n === 1 ? 'asset' : 'assets'} in alarm; ${areas[0].name} needs attention first` : 'No asset in alarm')(areas.reduce((a, x) => a + x.alarms, 0))} sub="Areas ranked worst first · lowest-health asset, remaining life and issue" flush
            csv={{ name: 'areas', rows: () => areas.map(a => ({ area: a.name, assets: a.n, alarm: a.alarms, watch: a.watch, worst_asset: a.low?.id, health: a.low?.health, rul_days: a.low?.rulDays, issue: a.issue || '' })) }}>
            <div className="scroll-x"><table className="t"><thead><tr><th>Area</th><th>Status</th><th>Worst asset</th><th className="r">Life left</th></tr></thead>
              <tbody>{areas.map(a => <tr key={a.id} className="click" onClick={() => nav(`artefactory/${c.demo.id}-twin/` + a.low.id)}>
                <td className="b">{a.name}<div className="muted" style={{ fontWeight: 400, fontSize: 11.5 }}>{a.n} assets</div></td>
                <td>{a.alarms ? <Tag c="bad">{a.alarms} alarm</Tag> : a.watch ? <Tag c="warn">{a.watch} watch</Tag> : <Tag c="good">Normal</Tag>}</td>
                <td style={{ minWidth: 180 }}><div className="row"><HealthBar v={a.low.health} w={70} /><span className="muted mono" style={{ fontSize: 11.5 }}>{a.low.id}</span></div>
                  {a.issue && <div className="muted" style={{ fontSize: 11.5, marginTop: 2, maxWidth: 280, whiteSpace: 'normal' }}>{a.issue}</div>}</td>
                <td className="r num" style={{ color: a.low.rulDays < 30 ? 'var(--bad)' : undefined }}>{fmtNum(a.low.rulDays)} d</td></tr>)}</tbody></table></div>
          </Card>}
    </div>
  </>;
}
