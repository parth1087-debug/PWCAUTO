/* Built-in dashboard: energy (renamed per plant through demo.dashNames, e.g. 'Power & demand', 'Auxiliary power', 'Grid export').
   Who uses it: the energy manager (for a power plant, the performance engineer; for solar / wind, the asset manager).
   Questions it answers:
   1. Is specific energy (or APC %, or energy vs P50) on target, and what closes the gap?
   2. Are we near contract demand (max-demand risk, excess-demand penalty) and is PF in the incentive slab?
   3. Which area / consumer / site wastes most, and when (weekday × hour, idle and night load)?
   4. What is the ₹ saving of each action, who owns it and what is the next step?
   5. Renewable share and ToD tariff impact (consumers); curtailment and auxiliary consumption (generators). */
import React, { useMemo } from 'react';
import { useApp } from '../../App.jsx';
import { Card, Tag, Empty } from '../../components/ui.jsx';
import { Trend, Heat, usePalette } from '../../components/charts.jsx';
import { fmtNum, fmtDateTime } from '../../lib/data.js';
import { energyModel } from '../../shared/analytics/dash-en.js';
import { EnStyle, Headline, Tile, RankBars, LimitSpark, inr, pct, toneVs } from './dash-en-ui.jsx';
import { D } from './common.jsx';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

export default function Energy({ c, R }) {
  const m = useMemo(() => energyModel(c.db, c.demo, R), [c, R.from, R.to]);
  return <><EnStyle />{m.mode === 'export' ? <ExportBoard c={c} R={R} m={m} /> : <ConsumerBoard c={c} R={R} m={m} />}</>;
}

/* ---------- shared pieces ---------- */
function KpiTrend({ c, R, k, title }) {
  const p = usePalette();
  const pts = c.db.kpiDaily(k.id).filter(p => p.t >= R.from - D && p.t <= R.to);
  const vs = [...pts.map(x => x.v), k.target, k.base]; const lo = Math.min(...vs), hi = Math.max(...vs), pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.02;
  return (
    <Card title={title} sub={`daily · baseline ${fmtNum(k.base)} · target ${fmtNum(k.target)} ${k.unit} · ${R.label}`} csv={{ name: k.id + '-daily', rows: () => pts.map(p => ({ date: new Date(p.t).toISOString().slice(0, 10), [k.id]: p.v })) }}>
      <Trend data={pts} series={[{ key: 'v', name: k.name, type: 'line' }]} unit={k.unit} days={Math.max(R.days, 3)} height={230} yDomain={[+(lo - pad).toPrecision(3), +(hi + pad).toPrecision(3)]}
        refs={[{ y: k.target, label: `Target ${fmtNum(k.target)}`, color: p.good, solid: true }, { y: k.base, label: `Baseline ${fmtNum(k.base)}`, color: p.axis }]} />
    </Card>
  );
}

function Actions({ m, c, title, sub }) {
  const app = useApp();
  const total = m.actions.reduce((a, x) => a + x.lakhYr, 0);
  if (!m.actions.length) return <Card title="Actions"><Empty>No open energy actions for this plant.</Empty></Card>;
  return (
    <Card title={title || `${m.actions.length} actions worth ${inr(total)} a year`} sub={sub || 'ranked by ₹ saving per year · calc. = from metered data and tariff · stated = from the engineering estimate · est. = agent estimate'} flush
      csv={{ name: 'energy-actions', rows: () => m.actions.map(a => ({ action: a.title, where: a.where, owner: a.owner, inr_lakh_yr: a.lakhYr.toFixed(1), basis: a.basis, next: a.next })) }}
      ask={{ kind: 'card', title: 'Energy actions', summary: m.actions.slice(0, 5).map(a => `${a.title}: ${inr(a.lakhYr)}/yr (${a.basis}), owner ${a.owner}`) }}>
      <div className="en-tbl"><table className="t">
        <thead><tr><th>#</th><th>Action</th><th>Where</th><th>Owner</th><th className="r">₹ / yr</th>{m.actions.some(a => a.kpiEq != null) && <th className="r">{m.kpi.unit} closed</th>}<th>Next step</th></tr></thead>
        <tbody>{m.actions.map((a, i) => (
          <tr key={a.id} className={a.link ? 'click' : ''} onClick={a.link ? () => app.nav(a.link === 'setpoints' ? `artefactory/${c.demo.id}-setpoints` : a.link) : undefined}>
            <td className="num muted">{i + 1}</td>
            <td className="wrap">{a.title}{a.status && a.status !== 'open' && <> <Tag c={a.status === 'approved' ? 'good' : 'brand'}>{a.status}</Tag></>}</td>
            <td className="mono" style={{ fontSize: 12 }}>{a.where}</td>
            <td className="muted" style={{ fontSize: 12 }}>{a.owner}</td>
            <td className="r num"><b>{inr(a.lakhYr)}</b><div className="muted" style={{ fontSize: 10.5 }}>{a.basis}</div></td>
            {m.actions.some(x => x.kpiEq != null) && <td className="r num">{a.kpiEq != null ? fmtNum(a.kpiEq, a.kpiEq < 1 ? 3 : 1) : '—'}</td>}
            <td className="muted wrap" style={{ fontSize: 12, minWidth: 160 }}>{a.next}</td>
          </tr>))}</tbody>
      </table></div>
    </Card>
  );
}

function LoadProfile({ m, R, unit = 'kVA', disp, capLabel = 'Contract demand', scale = 1, title, sub }) {
  const p = usePalette();
  const hourly = R.days <= 7;
  const data = hourly ? m.hourly.map(h => ({ t: h.t, v: Math.round((unit === 'kW' ? h.kw : h.kva) / scale) })) : m.daily.map(d => ({ t: d.t, v: Math.round(d.peak / scale) }));
  const cap = m.contract / scale;
  return (
    <Card title={title} sub={sub || (hourly ? `hourly ${unit} · ${R.label}` : `daily maximum demand, ${unit} · ${R.label}`)} csv={{ name: 'load-profile', rows: () => data.map(d => ({ time: new Date(d.t).toISOString(), [unit]: d.v })) }}>
      <Trend data={data} series={[{ key: 'v', name: hourly ? 'Load' : 'Daily max', type: hourly ? 'area' : 'bar' }]} unit={disp || unit} days={R.days} height={240}
        yDomain={[0, Math.ceil(Math.max(cap * 1.05, ...data.map(d => d.v)) / 10) * 10]}
        refs={[{ y: cap, label: `${capLabel} ${fmtNum(cap)}` }, ...(capLabel === 'Contract demand' ? [{ y: cap * 0.9, label: '90 % alarm', color: p.warn }] : [])]} />
    </Card>
  );
}

/* ================= consumer plants, EMS and thermal auxiliaries ================= */
function ConsumerBoard({ c, R, m }) {
  const app = useApp();
  const aux = m.mode === 'aux';
  const k = m.kpi;
  const kTone = toneVs(k.value, k.target, k.better);
  const gapPct = (m.gap / Math.abs(k.target)) * 100;
  const top = m.actions[0];
  const worst = [...m.areas].sort((a, b) => b.wasteLakhYr - a.wasteLakhYr)[0];
  const mdTone = m.pctContract > 1 ? 'bad' : m.pctContract > 0.9 ? 'warn' : 'good';
  const closed = m.actions.reduce((a, x) => a + (x.kpiEq || 0), 0);

  return <>
    <Headline>
      <span>
        <b>{k.name} {fmtNum(k.value, k.dec)} {k.unit}</b>{m.gap > 0 ? <> is {/%/.test(k.unit) ? `${fmtNum(m.gap, 2)} pp above` : `${fmtNum(Math.abs(gapPct), 1)} % off`} the target {fmtNum(k.target, k.dec)}</> : <> is on target ({fmtNum(k.target, k.dec)})</>}.{' '}
        {aux ? <>Auxiliary load peaked at <b>{fmtNum(m.peakKva / 1000, 1)} MW</b> ({pct(m.pctContract)} of the UAT rating).</>
          : <>Peak demand <b>{fmtNum(m.peakKva)} kVA</b> reached <b style={{ color: `var(--${mdTone})` }}>{pct(m.pctContract)}</b> of contract{m.over100 ? <>, above contract on <b>{m.over100} days</b></> : m.over90 ? <>, above 90 % on {m.over90} days</> : ''}.</>}{' '}
        {top && <>Biggest lever: <b>{top.title.split(' (')[0]}</b>, worth <b>{inr(top.lakhYr)}/yr</b>.</>}
      </span>
    </Headline>

    {aux ? (
      <div className="en-tiles">
        <Tile label={k.name} value={fmtNum(k.value, k.dec)} unit={k.unit} tone={kTone} gap={{ text: m.gap > 0 ? `+${fmtNum(m.gap, 2)} pp` : 'on target', tone: kTone, rest: `vs target ${fmtNum(k.target, k.dec)}` }} foot={`baseline ${fmtNum(k.base, k.dec)} · ${k.improvePct >= 0 ? '▼' : '▲'} ${fmtNum(Math.abs(k.improvePct), 1)} % better`} onClick={() => app.nav(`artefactory/${c.demo.id}-kpis/${k.id}`)} />
        <Tile label="Auxiliary energy" value={fmtNum(m.kwh / 1000, 0)} unit="MWh" foot={`${R.label} · avg ${fmtNum(m.avgKw / 1000, 2)} MW`} />
        <Tile label="Value of auxiliary energy" value={inr(m.costLakh)} foot={`at ₹${fmtNum(m.tariff.rate, 2)}/kWh not sold`} />
        <Tile label="Gross generation" value={fmtNum(m.aux.genMWh, 0)} unit="MWh" foot={`APC from meters ${fmtNum(m.aux.apcPct, 2)} %`} />
        <Tile label="Peak aux load vs UAT rating" value={pct(m.pctContract)} tone={mdTone} foot={`${fmtNum(m.peakKva)} of ${fmtNum(m.contract)} kVA`} bar={{ value: m.peakKva, max: m.contract, mark: m.contract * 0.9, tone: mdTone }} />
        <Tile label="Excess over design duty" value={fmtNum(m.aux.consumers.reduce((a, x) => a + x.excessKw, 0), 0)} unit="kW" tone="warn" foot={`${inr(m.aux.consumers.reduce((a, x) => a + x.lakhYr, 0))}/yr · ${m.aux.consumers.filter(x => x.excessKw > 0).length} drives`} />
      </div>
    ) : (
      <div className="en-tiles">
        <Tile label={k.name} value={fmtNum(k.value, k.dec)} unit={k.unit} tone={kTone} gap={{ text: m.gap > 0 ? `+${fmtNum(gapPct, 1)} %` : 'on target', tone: kTone, rest: `vs target ${fmtNum(k.target, k.dec)}` }} foot={`baseline ${fmtNum(k.base, k.dec)} · ${fmtNum(Math.abs(k.improvePct), 1)} % better since go-live`} onClick={() => app.nav(`artefactory/${c.demo.id}-kpis/${k.id}`)} />
        <Tile label="Energy cost" value={inr(m.costLakh)} foot={`${fmtNum(m.kwh / 1000, 0)} MWh · ₹${fmtNum((m.costLakh * 1e5) / (m.kwh || 1), 2)}/kWh blended · ${R.label}`} />
        <Tile label="Max demand vs contract" value={pct(m.pctContract)} tone={mdTone} foot={`${fmtNum(m.peakKva)} of ${fmtNum(m.contract)} kVA · ${m.over90} days > 90 %`} bar={{ value: m.peakKva, max: m.contract * 1.1, mark: m.contract, tone: mdTone }} title={`Peak at ${fmtDateTime(m.peakAt)}`} />
        <Tile label="Power factor (billing)" value={fmtNum(m.pfInfo.value, 3)} tone={m.pfInfo.status} gap={{ text: m.pfInfo.value >= m.pfInfo.slab ? 'in incentive slab' : `${fmtNum(m.pfInfo.slab - m.pfInfo.value, 3)} below 0.99`, tone: m.pfInfo.status }} foot={m.pfInfo.lakhYr > 0 ? `${inr(m.pfInfo.lakhYr)}/yr incentive missed · penalty below ${m.pfInfo.penalty}` : `penalty below ${m.pfInfo.penalty}`} />
        <Tile label="Idle and night load" value={m.idle.bench == null ? 'n/a' : pct(m.idle.ratio)} unit={m.idle.bench == null ? undefined : 'of working load'} tone={m.idle.bench == null ? undefined : m.idle.ratio > m.idle.bench + 0.05 ? 'warn' : 'good'}
          foot={m.idle.bench == null ? `${fmtNum(m.idle.idleKw / 1000, 1)} MW · 24×7 process, no idle window` : `${fmtNum(m.idle.idleKw, 0)} kW · benchmark ≤ ${pct(m.idle.bench)} · ${inr(m.idle.lakhYr)}/yr`} />
        <Tile label="Renewable share" value={fmtNum(m.ren.value, 1)} unit="%" tone={toneVs(m.ren.value, m.ren.target, 'up', 0.25)} gap={{ text: `target ${fmtNum(m.ren.target, 0)} %`, tone: undefined }} foot={m.ren.src} bar={{ value: m.ren.value, max: Math.max(30, m.ren.target * 1.2), mark: m.ren.target, tone: 'good' }} />
      </div>
    )}

    <div className="grid g21">
      <KpiTrend c={c} R={R} k={k} title={m.gap > 0 ? `${k.name}: ${fmtNum(m.gap, k.dec || 2)} ${k.unit} above target` : `${k.name} is on target`} />
      <Card title={closed > 0 ? `Actions close ${fmtNum(Math.min(closed, 9e9), closed < 1 ? 3 : 1)} of the ${fmtNum(Math.max(0, m.gap), m.gap < 1 ? 3 : 1)} ${k.unit} gap` : 'What closes the gap'} sub={aux ? 'consumers above design duty · ₹/yr at selling price' : `${k.unit} each action removes · from kWh saved ÷ annual kWh`}>
        {aux ? <RankBars items={m.aux.consumers.slice(0, 7).map(x => ({ name: `${x.asset} ${x.name || ''}`, value: x.lakhYr, label: inr(x.lakhYr), sub: `${fmtNum(x.avg, 0)} vs ${fmtNum(x.design, 0)} kW design`, tone: x.lakhYr > 20 ? 'bad' : 'warn' }))} nameWidth={150} />
          : m.actions.some(a => a.kpiEq) ? <RankBars items={m.actions.filter(a => a.kpiEq).slice(0, 7).map(a => ({ name: a.title.split(/[(:]/)[0], value: a.kpiEq, label: fmtNum(a.kpiEq, a.kpiEq < 1 ? 3 : 1), sub: `${inr(a.lakhYr)}/yr · ${a.basis}`, tone: 'brand' }))} nameWidth={160} />
            : <RankBars items={m.actions.slice(0, 7).map(a => ({ name: a.title, value: a.lakhYr, label: inr(a.lakhYr) }))} />}
      </Card>
    </div>

    <div className="grid g21 mt">
      <LoadProfile m={m} R={R} unit={aux ? 'kW' : 'kVA'} capLabel={aux ? 'UAT rating' : 'Contract demand'}
        title={aux ? `Auxiliary load peaked at ${pct(m.pctContract)} of UAT rating` : m.over100 ? `Above contract demand on ${m.over100} of ${m.daily.length} days` : `Peak ${fmtNum(m.peakKva)} kVA, ${pct(m.pctContract)} of contract demand`}
        sub={aux ? undefined : `${R.days <= 7 ? 'hourly kVA' : 'daily maximum demand, kVA'} · ${R.label}${m.mdPenaltyLakh > 0 ? ` · excess-demand charge about ${inr(m.mdPenaltyLakh)}` : ''}`} />
      {aux ? (
        <Card title="Where the auxiliary power goes" sub={`share of ${fmtNum(m.kwh / 1000, 0)} MWh · ${R.label}`} csv={{ name: 'aux-by-consumer', rows: () => m.areas.map(a => ({ consumer: a.name, mwh: Math.round(a.kwh / 1000), share_pct: a.share })) }}>
          <RankBars items={[...m.areas].sort((a, b) => b.kwh - a.kwh).map(a => ({ name: a.name, value: a.kwh / 1000, label: `${fmtNum(a.kwh / 1000, 0)} MWh` }))} nameWidth={140} />
        </Card>
      ) : (
        <Card title={`ToD: ${pct(m.tod[0].share)} of energy in peak hours`} sub={`${m.tariff.state} · base ₹${fmtNum(m.tariff.rate, 2)}/kWh · ${R.label}`} flush>
          <div className="en-tbl sm"><table className="t"><thead><tr><th>Slot</th><th className="r">Energy</th><th className="r">₹/kWh</th><th className="r">Cost</th></tr></thead>
            <tbody>{m.tod.map(x => <tr key={x.id}><td><b>{x.name}</b><div className="muted" style={{ fontSize: 11 }}>{x.note}</div></td><td className="r num">{pct(x.share)}<div className="muted" style={{ fontSize: 11 }}>{fmtNum(x.kwh / 1000, 0)} MWh</div></td><td className="r num">{fmtNum(x.rate, 2)}</td><td className="r num">{inr(x.costLakh)}</td></tr>)}</tbody></table></div>
          <div style={{ padding: '10px 16px', fontSize: 12.5 }}>Moving 10 % of peak-slot energy to off-peak saves <b>{inr(m.todShiftLakh)}/yr</b>. Demand charge ₹{fmtNum(m.tariff.demand)}/kVA/month on 85 % of contract.</div>
        </Card>
      )}
    </div>

    <div className="grid g2 mt">
      <Card title={m.idle.bench != null && m.idle.ratio > m.idle.bench ? `Night and weekend load is ${pct(m.idle.ratio)} of working load` : 'Weekly load pattern'} sub={m.heat.sub}>
        <Heat rows={m.heat.rows} cols={HOURS} values={m.heat.values} unit="kW" />
        <div className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>{m.idle.bench == null ? 'Continuous process: compare shifts and days, not on / off.' : `Darker = higher load. Idle window: ${c.demo.continuous ? '23:00–05:00' : 'Sundays and 23:00–05:00'} · benchmark ≤ ${pct(m.idle.bench)} of working load.`}</div>
      </Card>
      {aux ? (
        <Card title="Major drives vs design duty" sub={`average kW · ${R.label}`} flush>
          <div className="en-tbl"><table className="t"><thead><tr><th>Drive</th><th className="r">Avg</th><th className="r">Design</th><th className="r">Excess</th><th className="r">₹/yr</th></tr></thead>
            <tbody>{m.aux.consumers.map(x => <tr key={x.asset}><td><b className="mono">{x.asset}</b> <span className="muted">{x.name}</span></td><td className="r num">{fmtNum(x.avg, 0)} kW</td><td className="r num muted">{fmtNum(x.design, 0)}</td><td className="r num" style={{ color: x.excessKw > 0 ? 'var(--warn)' : undefined }}>{x.excessKw > 0 ? '+' + fmtNum(x.excessKw, 0) : '—'}</td><td className="r num">{inr(x.lakhYr)}</td></tr>)}</tbody></table></div>
        </Card>
      ) : (
        <Card title={worst ? `${worst.name}: ${inr(worst.wasteLakhYr)}/yr avoidable` : 'Consumption by area'} sub={`area energy and avoidable share (sub-meter audit estimate) · ${R.label}`} flush
          csv={{ name: 'energy-by-area', rows: () => m.areas.map(a => ({ area: a.name, mwh: Math.round(a.kwh / 1000), share_pct: a.share, cost_lakh: a.costLakh.toFixed(1), avoidable_pct: Math.round(a.waste * 100), avoidable_lakh_yr: a.wasteLakhYr.toFixed(1) })) }}>
          <div className="en-tbl"><table className="t"><thead><tr><th>Area</th><th className="r">Energy</th><th className="r">Cost</th><th className="r">Avoidable</th><th className="r">₹/yr</th></tr></thead>
            <tbody>{[...m.areas].sort((a, b) => b.wasteLakhYr - a.wasteLakhYr).map(a => <tr key={a.name}><td>{a.name}</td><td className="r num">{fmtNum(a.kwh / 1000, 0)} MWh<div className="muted" style={{ fontSize: 11 }}>{a.share} %</div></td><td className="r num">{inr(a.costLakh)}</td><td className="r num">{Math.round(a.waste * 100)} %</td><td className="r num"><b>{inr(a.wasteLakhYr)}</b></td></tr>)}</tbody></table></div>
        </Card>
      )}
    </div>

    <div className="mt"><Actions m={m} c={c} /></div>

    {!aux && <div className="mt"><Utilities c={c} R={R} /></div>}
  </>;
}

/** Major utility meters with limits and a period trend. */
function Utilities({ c, R }) {
  const list = c.demo.energy.utilities.filter(([a, t]) => c.db.tagDef(a, t) && !(a === c.demo.energy.meter[0] && t === c.demo.energy.meter[1]));
  if (!list.length) return null;
  return (
    <Card title={c.demo.production.unit === 'MWh' && /export/.test(c.demo.energy.meter[1]) ? 'Substation and transformer meters' : 'Major loads and utility meters'} sub={`average and latest · trend over ${R.label} · red dashes = limit`} flush>
      <div className="en-tbl"><table className="t"><thead><tr><th>Meter</th><th className="r">Average</th><th className="r">Latest</th><th className="r">Limit</th><th style={{ width: 160 }}>Trend</th></tr></thead>
        <tbody>{list.map(([a, t]) => {
          const d = c.db.tagDef(a, t); const h = c.db.history(a, t, R.from, R.to); const avg = h.points.reduce((s, p) => s + p.v, 0) / (h.points.length || 1);
          return <tr key={a + t}><td><b className="mono">{a}</b> <span className="muted">{c.db.assetById[a]?.name}</span><div className="muted" style={{ fontSize: 11.5 }}>{d.name}</div></td>
            <td className="r num">{fmtNum(avg, avg < 10 ? 2 : 0)} <span className="muted">{d.unit}</span></td><td className="r num">{fmtNum(c.db.latest(a, t))}</td>
            <td className="r num muted">{d.hi != null ? '≤ ' + fmtNum(d.hi) : '—'}</td><td><LimitSpark points={h.points} hi={d.hi} lo={d.lo} height={28} width={150} /></td></tr>;
        })}</tbody></table></div>
    </Card>
  );
}

/* ================= solar and wind: grid export ================= */
function ExportBoard({ c, R, m }) {
  const app = useApp(); const p = usePalette();
  const e = m.exp; const k = m.kpi;
  const kTone = toneVs(k.value, k.target, k.better);
  const ga = c.demo.kpis.find(x => x.id === 'ga' || x.id === 'grid');
  const gaS = ga && c.db.kpiSummary(ga.id, R.from, R.to);
  const shortfall = Math.max(0, e.plan - e.act);
  const days = e.days.map(d => ({ t: d.t, actual: d.actual, plan: d.plan }));
  return <>
    <Headline>
      <span>Exported <b>{fmtNum(e.act)} MWh</b>, <b style={{ color: `var(--${e.attain >= 1 ? 'good' : e.attain > 0.97 ? 'warn' : 'bad'})` }}>{pct(e.attain, 1)}</b> of P50 ({fmtNum(shortfall)} MWh, {inr((shortfall * 1000 * m.tariff.rate) / 1e5)} short).
        Curtailment {fmtNum(e.curtMWh, 0)} MWh cost <b>{inr(e.curtLakh)}</b>. Peak export {fmtNum(e.peakMw, 0)} MW of {fmtNum(e.capMw, 0)} MW evacuation. {m.actions[0] && <>Biggest lever: <b>{m.actions[0].title.split(':')[0]}</b>, {inr(m.actions[0].lakhYr)}/yr.</>}</span>
    </Headline>
    <div className="en-tiles">
      <Tile label="Net export" value={fmtNum(e.act)} unit="MWh" tone={e.attain >= 1 ? 'good' : e.attain > 0.97 ? 'warn' : 'bad'} gap={{ text: pct(e.attain, 1), tone: e.attain >= 1 ? 'good' : 'bad', rest: `of P50 ${fmtNum(e.plan)}` }} foot={R.label} />
      <Tile label="Revenue at PPA tariff" value={inr(e.revenueLakh)} foot={`${m.tariff.state} · ₹${fmtNum(m.tariff.rate, 2)}/kWh`} />
      <Tile label={k.name} value={fmtNum(k.value, k.dec)} unit={k.unit} tone={kTone} gap={{ text: m.gap > 0 ? `${fmtNum(m.gap, 1)} pp short` : 'on target', tone: kTone, rest: `target ${fmtNum(k.target, k.dec)}` }} onClick={() => app.nav(`artefactory/${c.demo.id}-kpis/${k.id}`)} />
      <Tile label="Curtailment" value={fmtNum(e.curtMWh, 0)} unit="MWh" tone="warn" foot={`${inr(e.curtLakh)} lost · ${pct(e.curtMWh / (e.act || 1), 1)} of export`} />
      {gaS && <Tile label={ga.name} value={fmtNum(gaS.value, ga.dec)} unit="%" tone={toneVs(gaS.value, ga.target, 'up', 0.003)} gap={{ text: `target ${fmtNum(ga.target, ga.dec)} %` }} foot="grid / evacuation outages" />}
      <Tile label="Auxiliary consumption" value={fmtNum(e.auxMWh, 0)} unit="MWh" foot={`${fmtNum(e.auxPct, 2)} % of export · ${inr(e.auxLakh)} import at ₹7.8/kWh`} />
    </div>

    <div className="grid g21">
      <Card title={`Daily export vs P50: ${pct(e.attain, 1)}`} sub={`MWh per day · bars = actual, line = P50 forecast · ${R.label}`} csv={{ name: 'export-vs-p50', rows: () => days.map(d => ({ date: new Date(d.t).toISOString().slice(0, 10), actual_mwh: d.actual, p50_mwh: d.plan })) }}>
        <Trend data={days} series={[{ key: 'actual', name: 'Exported', type: 'bar' }, { key: 'plan', name: 'P50', type: 'line', color: p.c2, dash: '4 3' }]} unit="MWh" days={Math.max(R.days, 3)} height={240} />
      </Card>
      <Card title="Sites vs P50" sub={`MWh exported · ${R.label}`} flush>
        <div className="en-tbl sm"><table className="t"><thead><tr><th>Site</th><th className="r">Export</th><th className="r">vs P50</th><th className="r">Shortfall</th></tr></thead>
          <tbody>{m.areas.map((a0, _, all) => { const norm = all.reduce((t, x) => t + (x.share / 100) * x.vsPlan, 0) || 1; const a = { ...a0, vsPlan: (a0.vsPlan * e.attain) / norm }; const mwh = (e.act * a.share) / 100; const short = Math.max(0, mwh / a.vsPlan - mwh); return <tr key={a.name}><td><b>{a.name}</b><div className="muted" style={{ fontSize: 11 }}>{a.share} % of portfolio</div></td><td className="r num">{fmtNum(mwh)} MWh</td>
            <td className="r num" style={{ color: a.vsPlan < 0.97 ? 'var(--bad)' : a.vsPlan < 1 ? 'var(--warn)' : 'var(--good)' }}>{pct(a.vsPlan, 1)}</td><td className="r num">{short > 0 ? inr((short * 1000 * m.tariff.rate) / 1e5) : '—'}</td></tr>; })}</tbody></table></div>
      </Card>
    </div>

    <div className="grid g2 mt">
      <Card title="When export is lost" sub={`${m.heat.sub} · pale cells in generating hours = cloud, low wind, outage or curtailment`}>
        <Heat rows={m.heat.rows} cols={HOURS} values={m.heat.values} unit="MW" />
      </Card>
      <LoadProfile m={m} R={R} unit="kW" disp="MW" scale={1000} capLabel="Evacuation capacity" title={`Peak export ${fmtNum(e.peakMw, 0)} MW of ${fmtNum(e.capMw, 0)} MW evacuation`} sub={R.days <= 7 ? `portfolio export, MW · hourly · ${R.label}` : `daily peak export, MW · ${R.label}`} />
    </div>

    <div className="mt"><Actions m={m} c={c} sub="ranked by ₹ per year at PPA tariff · stated = engineering estimate · from MWh = energy gain × tariff · est. = agent estimate" /></div>
    <div className="mt"><Utilities c={c} R={R} /></div>
  </>;
}
