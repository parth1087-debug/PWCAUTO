import React, { useMemo, useState } from 'react';
import { Star, Folder, Sparkles, Wrench } from 'lucide-react';
import { useApp } from '../App.jsx';
import { dashName } from '../shared/artefacts.js';
import { Card, Kpi, PageHead, HealthBar, Tag, Empty } from '../components/ui.jsx';
import { Trend, Bars, Waterfall, Donut, Spark, Heat, BarList, usePalette } from '../components/charts.jsx';
import { fmtNum, fmtRel, fmtTime, fmtDateTime, statusCls, getDB } from '../lib/data.js';

const D = 864e5;
const kpiSpark = (db, id, R) => db.kpiDaily(id).filter(p => p.t >= R.from - D).map(p => ({ v: p.v }));

function KpiRow({ c, ids, R }) {
  const { nav } = useApp();
  return <div className="kpis">{ids.map(id => { const k = c.db.kpiSummary(id, R.from, R.to); return <Kpi key={id} k={k} onClick={() => nav(`artefactory/${c.demo.id}-kpis/${id}`)} spark={<Spark data={kpiSpark(c.db, id, R)} />} />; })}</div>;
}

/** A built-in board's content (no page header): used inside the Artefactory viewer. */
export function DashBody({ view = 'overview', sel, c: cIn }) {
  const app = useApp();
  const c = cIn || app.ctx; const R = { ...app.rng, from: c.db.anchor - app.rng.days * D, to: c.db.anchor };
  return <>
    {view === 'overview' && <Overview c={c} R={R} />}
    {view === 'kpis' && <Kpis c={c} R={R} sel={sel} />}
    {view === 'maintenance' && <Maintenance c={c} R={R} sel={sel} />}
    {view === 'cost' && <Cost c={c} R={R} />}
    {view === 'quality' && <Quality c={c} R={R} />}
    {view === 'energy' && <Energy c={c} R={R} />}
  </>;
}


/* ---------- Overview ---------- */
function Overview({ c, R }) {
  const { messages, nav } = useApp();
  const p = c.tools.get_production({ from: new Date(R.from).toISOString(), to: new Date(R.to).toISOString() });
  const days = p.days.length < 3 ? c.tools.get_production({ days: 7 }).days : p.days;
  const open = messages.filter(m => (m.type === 'alert' || m.type === 'approval') && !m.state).slice(0, 5);
  const health = c.db.healthAll();
  const areas = c.demo.areas.map(a => { const hs = health.filter(h => h.area === a.name); return { name: a.name, n: hs.length, alarms: hs.filter(h => h.health < 50).length, watch: hs.filter(h => h.health >= 50 && h.health < 75).length, low: hs[0] }; });
  const logs = c.logs.slice(0, 6);
  return <>
    <KpiRow c={c} ids={c.demo.overview} R={R} />
    <div className="grid g21">
      <Card title={`Output at ${p.attainment_pct} % of plan`} sub={`${fmtNum(p.actual)} of ${fmtNum(p.plan)} ${p.unit} · daily`} ask={{ kind: 'card', title: 'Production vs plan', summary: [`Output was ${fmtNum(p.actual)} ${p.unit} against ${fmtNum(p.plan)} (${p.attainment_pct} %) over ${R.label}.`] }}
        csv={{ name: 'production', rows: () => days.map(d => ({ date: d.t, plan: d.plan, actual: d.actual })) }}>
        <Trend data={days.map(d => ({ t: new Date(d.t).getTime(), actual: d.actual, plan: d.plan }))} series={[{ key: 'actual', name: 'Actual', type: 'bar' }, { key: 'plan', name: 'Plan', dash: '4 3', color: '#98a2b3' }]} unit={p.unit} days={30} height={240} />
      </Card>
      <Card title="Needs attention" sub={`${open.length} open`} flush>
        {open.map(m => <button key={m.id} className="feed-i" onClick={() => nav('messages/' + m.id)}><span className={`rail ${m.sev}`} /><span><span className="row" style={{ fontSize: 11.5 }}><b style={{ color: m.type === 'alert' ? 'var(--bad)' : 'var(--brand)' }}>{m.type === 'alert' ? 'Alert' : 'Approval'}</b><span className="muted">{m.from}</span><span className="muted right">{fmtRel(m.time)}</span></span><span style={{ display: 'block', fontSize: 13, marginTop: 2 }}>{m.title}</span></span></button>)}
        {!open.length && <Empty>All clear.</Empty>}
      </Card>
    </div>
    <div className="grid g21 mt">
      <Card title={(n => `${n} ${n === 1 ? 'asset' : 'assets'} in alarm across ${areas.length} areas`)(areas.reduce((a, x) => a + x.alarms, 0))} sub="Lowest health per area" flush csv={{ name: 'areas', rows: () => areas.map(a => ({ area: a.name, assets: a.n, alarms: a.alarms, watch: a.watch, lowest: a.low?.id, health: a.low?.health })) }}>
        <div className="scroll-x"><table className="t"><thead><tr><th>Area</th><th className="r">Assets</th><th>Status</th><th>Lowest health</th></tr></thead><tbody>{areas.map(a => <tr key={a.name} className="click" onClick={() => nav(`artefactory/${c.demo.id}-twin/` + a.low.id)}>
          <td className="b">{a.name}</td><td className="r num">{a.n}</td><td>{a.alarms ? <Tag c="bad">{a.alarms} alarm</Tag> : a.watch ? <Tag c="warn">{a.watch} watch</Tag> : <Tag c="good">Normal</Tag>}</td><td><div className="row"><HealthBar v={a.low.health} w={90} /><span className="muted mono">{a.low.id}</span></div></td></tr>)}</tbody></table></div>
      </Card>
      <Card title="Agent activity" sub="latest" flush>
        {logs.map((l, i) => <div key={i} className="feed-i" style={{ cursor: 'default' }}><span className={`rail ${l.lvl === 'WARN' ? 'warn' : l.lvl === 'ERROR' ? 'bad' : 'info'}`} /><span><span className="row" style={{ fontSize: 11.5 }}><b>{l.actor}</b><span className="muted right">{fmtRel(l.time)}</span></span><span className="mono muted" style={{ fontSize: 11 }}>{l.ev}</span><span style={{ display: 'block', fontSize: 12.5 }}>{l.msg}</span></span></div>)}
      </Card>
    </div>
  </>;
}

/* ---------- KPIs vs baseline ---------- */
function Kpis({ c, R, sel }) {
  const { nav } = useApp(); const p = usePalette();
  const all = c.demo.kpis.map(k => c.db.kpiSummary(k.id, R.from, R.to));
  const k = all.find(x => x.id === sel) || all[0];
  const series = c.db.kpiDaily(k.id);
  const total = c.demo.kpis.reduce((a, x) => a + (x.lakh || 0), 0);
  const groups = [...new Set(all.map(x => x.group))];
  const gName = { cost: 'Productivity & cost', maintenance: 'Maintenance', quality: 'Quality', energy: 'Energy' };
  return <>
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
      {[['Value realised vs baseline', `₹${(total / 100).toFixed(2)}`, 'Cr/yr', 'annualised, finance-validated'], ['KPIs better than baseline', all.filter(x => x.improvePct > 0).length, `of ${all.length}`, R.label], ['On target', all.filter(x => x.status === 'On target').length, 'KPIs', 'target met'], ['At risk', all.filter(x => x.status === 'At risk').length, 'KPIs', 'under 45 % of the way']].map(t =>
        <div key={t[0]} className="kpi"><div className="l">{t[0]}</div><div className="v">{t[1]}<small>{t[2]}</small></div><div className="f">{t[3]}</div></div>)}
    </div>
    <Card title={`${k.name}: ${fmtNum(k.value, k.dec)} ${k.unit}, ${k.improvePct >= 0 ? 'better' : 'worse'} by ${Math.abs(k.improvePct)} % than baseline`} sub={`Daily, 6 months · baseline ${fmtNum(k.base, k.dec)} · target ${fmtNum(k.target, k.dec)} · owner ${k.owner}`}
      ask={{ kind: 'card', title: k.name, summary: [`${k.name} is ${fmtNum(k.value, k.dec)} ${k.unit} over ${R.label}, baseline ${k.base}, target ${k.target}, ${k.status}.`] }} csv={{ name: k.id, rows: () => series.map(x => ({ date: new Date(x.t).toISOString().slice(0, 10), value: x.v })) }}>
      <Trend data={series} series={[{ key: 'v', name: k.name, type: 'area' }]} unit={k.unit} days={180} height={240} refs={[{ y: k.base, label: 'Baseline', color: p.axis }, { y: k.target, label: 'Target', color: p.good }]}
        xRefs={[{ x: c.db.goLive, label: 'Go-live' }]} bands={[{ x1: c.db.baselineFrom, x2: c.db.baselineTo, label: 'Baseline period' }, { x1: R.from, x2: R.to, color: p.c1, opacity: 0.05 }]} />
    </Card>
    <Card title="Scorecard" sub={`Measured over ${R.label}`} flush className="mt" csv={{ name: 'kpis', rows: () => all.map(x => ({ kpi: x.name, unit: x.unit, baseline: x.base, value: x.value, target: x.target, change_pct: x.improvePct, status: x.status })) }}>
      <div className="scroll-x"><table className="t"><thead><tr><th>KPI</th><th className="r">Baseline</th><th className="r">Current</th><th className="r">Target</th><th className="r">vs baseline</th><th>Progress</th><th>Status</th><th className="r">₹ L/yr</th></tr></thead>
        <tbody>{groups.map(g => <React.Fragment key={g}><tr><td colSpan={8} className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', background: 'var(--bg-2)' }}>{gName[g]}</td></tr>
          {all.filter(x => x.group === g).map(x => <tr key={x.id} className={`click ${x.id === k.id ? 'on' : ''}`} onClick={() => nav(`artefactory/${c.demo.id}-kpis/` + x.id)}>
            <td className="b">{x.name} <span className="muted" style={{ fontWeight: 400 }}>{x.unit}</span></td><td className="r num">{fmtNum(x.base, x.dec)}</td><td className="r num b">{fmtNum(x.value, x.dec)}</td><td className="r num muted">{fmtNum(x.target, x.dec)}</td>
            <td className="r num" style={{ color: x.improvePct >= 0 ? 'var(--good)' : 'var(--bad)' }}>{x.improvePct >= 0 ? '▲' : '▼'} {Math.abs(x.improvePct)} %</td>
            <td><div className="bar" style={{ width: 120 }}><div className="tr"><div className="fl brand" style={{ width: `${x.progress * 100}%` }} /></div><span className="num muted">{Math.round(x.progress * 100)}%</span></div></td>
            <td><Tag c={statusCls(x.status)}>{x.status}</Tag></td><td className="r num">{x.lakh || '—'}</td></tr>)}</React.Fragment>)}</tbody></table></div>
    </Card>
  </>;
}

/* ---------- Maintenance ---------- */
function Maintenance({ c, R, sel }) {
  const { nav, actions, openPanel } = useApp(); const p = usePalette();
  const health = c.db.healthAll();
  const a = health.find(h => h.id === sel) || health.find(h => h.id === c.demo.maintenance.spotlight) || health[0];
  const asset = c.db.assetById[a.id];
  const tags = c.demo.classes[asset.cls].tags;
  const ev = c.demo.events.find(e => e.asset === a.id && e.diagnosis);
  const [tag, setTag] = useState(null);
  const tk = tag && tags.find(t => t[0] === tag) ? tag : (ev ? ev.tag : tags[0][0]);
  const h = c.db.history(a.id, tk, R.from, R.to);
  const def = c.db.tagDef(a.id, tk);
  const ids = c.demo.kpis.filter(k => k.group === 'maintenance').map(k => k.id);
  const soon = health.filter(x => x.rulDays <= 60).sort((x, y) => x.rulDays - y.rulDays);
  return <>
    <div className="kpis" style={{ gridTemplateColumns: `repeat(${ids.length + 2}, minmax(0,1fr))` }}>
      {ids.map(id => { const k = c.db.kpiSummary(id, R.from, R.to); return <Kpi key={id} k={k} onClick={() => nav(`artefactory/${c.demo.id}-kpis/` + id)} spark={<Spark data={kpiSpark(c.db, id, R)} />} />; })}
      <div className="kpi"><div className="l">Assets in alarm</div><div className="v" style={{ color: 'var(--bad)' }}>{health.filter(x => x.health < 50).length}<small>of {health.length}</small></div><div className="f">{health.filter(x => x.health < 50).map(x => x.id).join(', ') || 'none'}</div></div>
      <div className="kpi"><div className="l">Failures forecast, 30 days</div><div className="v">{health.filter(x => x.rulDays <= 30).length}<small>assets</small></div><div className="f">by remaining-life model</div></div>
    </div>
    <div className="grid g2">
      <Card title="Asset risk" sub="lowest health first · select an asset" flush csv={{ name: 'asset-health', rows: () => health.map(x => ({ asset: x.id, name: x.name, area: x.area, health: x.health, life_left_days: x.rulDays, finding: x.finding || '' })) }}>
        <div className="scroll-x" style={{ maxHeight: 520, overflowY: 'auto' }}><table className="t"><thead><tr><th>Asset</th><th>Health</th><th className="r">Life left</th><th>Finding</th></tr></thead><tbody>
          {health.map(x => <tr key={x.id} className={`click ${x.id === a.id ? 'on' : ''}`} onClick={() => nav(`artefactory/${c.demo.id}-maintenance/` + x.id)}><td><div className="b">{x.id} <Tag c="line">{x.crit}</Tag></div><div className="muted" style={{ fontSize: 11.5 }}>{x.name} · {x.line}</div></td><td><HealthBar v={x.health} w={100} /></td><td className="r num" style={{ color: x.rulDays < 15 ? 'var(--bad)' : undefined, fontWeight: x.rulDays < 15 ? 600 : 400 }}>{x.rulDays} d</td><td className="muted">{x.finding || '—'}</td></tr>)}
        </tbody></table></div>
      </Card>
      <Card title={`${a.id} · ${a.name}`} sub={`${a.line} · health ${a.health} · ${a.rulDays} days of life left`} ask={{ kind: 'card', title: `${a.id} · ${a.name}`, summary: ev ? [`${ev.diagnosis.title}. ${ev.diagnosis.reco}`, ...ev.diagnosis.points] : [`${a.id} is healthy (score ${a.health}).`] }}
        csv={{ name: `${a.id}-${tk}`, rows: () => h.points.map(x => ({ time: new Date(x.t).toISOString(), value: x.v, unit: h.unit })) }}>
        <div className="chips" style={{ marginBottom: 6 }}>{tags.map(t => <button key={t[0]} className={`tag ${t[0] === tk ? 'brand' : 'line'}`} onClick={() => setTag(t[0])}>{t[1]}</button>)}</div>
        <Trend data={h.points} series={[{ key: 'v', name: def.name, type: 'area' }]} unit={def.unit} days={R.days} height={200} refs={[...(def.hi > 0 ? [{ y: def.hi, label: `High ${def.hi}` }] : []), ...(def.lo ? [{ y: def.lo, label: `Low ${def.lo}` }] : [])]} />
        {ev ? <div className="ans" style={{ marginTop: 8, borderLeft: '3px solid var(--brand)', paddingLeft: 12 }}>
          <div className="muted" style={{ fontSize: 12 }}>{ev.agent} · automated RCA · confidence {ev.diagnosis.confidence}</div><p style={{ margin: '2px 0 4px' }}><b>{ev.diagnosis.title}</b></p>
          <ul>{ev.diagnosis.points.map(x => <li key={x}>{x}</li>)}</ul><p><b>Recommendation:</b> {ev.diagnosis.reco}</p>
          <div className="chips"><button className="btn pri sm" onClick={() => actions.raiseWO(a.id, ev.diagnosis.title)}><Wrench />Raise work order</button><button className="btn sm" onClick={() => openPanel({ kind: 'card', title: `${a.id} · ${a.name}`, summary: [ev.diagnosis.reco] })}><Sparkles />Ask Copilot</button></div>
        </div> : <p className="muted" style={{ marginTop: 8 }}>No anomaly in the selected period. All tags inside learned normal bands.</p>}
      </Card>
    </div>
    <Card title={`${soon.length} assets may need work in the next 60 days`} sub="remaining-life forecast" className="mt">
      <BarList items={soon.map(x => ({ name: `${x.id} · ${x.finding || x.name}`, value: x.rulDays, color: x.rulDays < 15 ? p.bad : x.rulDays < 30 ? p.warn : p.c5 }))} unit="days" />
    </Card>
  </>;
}

/* ---------- Cost conversion ---------- */
function Cost({ c, R }) {
  const o = c.tools.get_oee_losses();
  const ids = c.demo.kpis.filter(k => k.group === 'cost').map(k => k.id);
  const worst = [...o.lines].sort((a, b) => a.oee - b.oee)[0];
  const actual = o.budget + o.bridge.reduce((a, b) => a + b.delta, 0);
  const p = usePalette();
  return <>
    <KpiRow c={c} ids={ids.slice(0, 6)} R={R} />
    <div className="grid g2">
      <Card title={`Cost is ${fmtNum(actual - o.budget, 1)} ${o.unit} over budget`} sub={`Budget ${fmtNum(o.budget)} to actual ${fmtNum(actual, 1)} ${o.unit}`} ask={{ kind: 'card', title: 'Cost bridge', summary: [`Cost is ${fmtNum(actual, 1)} ${o.unit} against a budget of ${o.budget}. Biggest driver: ${o.bridge[0].element} (+${o.bridge[0].delta}).`] }}
        csv={{ name: 'cost-bridge', rows: () => o.bridge }}>
        <Waterfall start={o.budget} steps={o.bridge.map(b => [b.element, b.delta])} unit={o.unit} />
      </Card>
      <Card title="Cost by element" sub={o.unit} csv={{ name: 'cost-elements', rows: () => o.cost_elements }}>
        <Donut items={o.cost_elements.map(e => ({ name: e.element, value: e.value }))} center={fmtNum(o.cost_elements.reduce((a, b) => a + b.value, 0), 1)} sub={o.unit} />
      </Card>
    </div>
    <div className="grid g2 mt">
      <Card title={`${worst.line} is the weakest line at ${worst.oee} % OEE`} sub={`Top loss: ${worst.top_loss}`} ask={{ kind: 'card', title: 'OEE by line', summary: o.lines.map(l => `${l.line}: OEE ${l.oee} % (A ${l.availability}, P ${l.performance}, Q ${l.quality}), top loss ${l.top_loss}.`) }} csv={{ name: 'oee-by-line', rows: () => o.lines }}>
        <Bars data={o.lines.map(l => ({ name: l.line, oee: l.oee }))} series={[{ key: 'oee', name: 'OEE %' }]} unit="%" horizontal height={Math.max(180, o.lines.length * 40)} colorFn={d => (d.oee < 65 ? p.bad : d.oee < 75 ? p.warn : p.c1)} />
      </Card>
      <Card title={`${o.six_big_losses_hours[0].loss} is the biggest loss`} sub="six big losses, hours this month" csv={{ name: 'six-big-losses', rows: () => o.six_big_losses_hours }}>
        <BarList items={o.six_big_losses_hours.map((l, i) => ({ name: l.loss, value: l.hours, color: i < 2 ? p.c1 : p.c5 }))} unit="h" />
      </Card>
    </div>
  </>;
}

/* ---------- Quality ---------- */
function Quality({ c, R }) {
  const p = usePalette();
  const g = c.tools.get_quality({ from: new Date(R.from).toISOString(), to: new Date(R.to).toISOString() });
  const ids = c.demo.kpis.filter(k => k.group === 'quality').map(k => k.id);
  const total = g.defects.reduce((a, b) => a + b.count, 0);
  const spc = c.demo.quality.spc;
  const hist = c.db.history(spc.asset, spc.tag, Math.max(R.from, R.to - 30 * D), R.to);
  const out = hist.points.filter(x => x.v < spc.lsl || x.v > spc.usl).length;
  const recent = c.db.history(spc.asset, spc.tag, R.to - D, R.to, 'hour').points.slice(-12).reverse();
  return <>
    <KpiRow c={c} ids={ids} R={R} />
    <div className="grid g2">
      <Card title={`${g.defects[0].defect} is ${Math.round((g.defects[0].count / total) * 100)} % of defects`} sub={`${fmtNum(total)} defects · ${R.label}`} csv={{ name: 'defects', rows: () => g.defects }} ask={{ kind: 'card', title: 'Defect Pareto', summary: g.defects.map(d => `${d.defect}: ${d.count}`) }}>
        <Bars data={g.defects.map(d => ({ name: d.defect, count: d.count }))} series={[{ key: 'count', name: 'Defects' }]} horizontal height={Math.max(180, g.defects.length * 36)} colorFn={(d, _) => (d.name === g.defects[0].defect ? p.bad : p.c1)} />
      </Card>
      <Card title={`${spc.name}: ${out} points outside limits`} sub={`LSL ${spc.lsl} · USL ${spc.usl} · up to 30 days`} csv={{ name: 'spc', rows: () => hist.points.map(x => ({ time: new Date(x.t).toISOString(), value: x.v })) }} ask={{ kind: 'card', title: spc.name, summary: [`${out} points outside ${spc.lsl}–${spc.usl}.`] }}>
        <Trend data={hist.points} series={[{ key: 'v', name: spc.name }]} days={Math.min(30, R.days)} height={230} refs={[{ y: spc.usl, label: 'USL' }, { y: spc.lsl, label: 'LSL' }]} />
      </Card>
    </div>
    <Card title="Latest checks" sub={`${spc.name} · last 12 hours`} flush className="mt">
      <table className="t"><thead><tr><th>Time</th><th className="r">Value</th><th>Result</th></tr></thead><tbody>{recent.map(x => { const ok = x.v >= spc.lsl && x.v <= spc.usl; return <tr key={x.t}><td className="num">{fmtDateTime(x.t)}</td><td className="r num">{x.v}</td><td><Tag c={ok ? 'good' : 'bad'}>{ok ? 'In limits' : 'Out of limits'}</Tag></td></tr>; })}</tbody></table>
    </Card>
  </>;
}

/* ---------- Energy ---------- */
function Energy({ c, R }) {
  const e = c.tools.get_energy({ from: new Date(Math.max(R.from, R.to - 30 * D)).toISOString(), to: new Date(R.to).toISOString() });
  const ids = c.demo.kpis.filter(k => k.group === 'energy').map(k => k.id);
  const [ma, mt] = c.demo.energy.meter; const s = c.db.series(ma, mt); const k = c.demo.energy.scale || 1;
  const heat = useMemo(() => { const rows = Array.from({ length: 7 }, () => Array(24).fill(0)); const n = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (let i = s.length - 28 * 24; i < s.length; i++) { const d = new Date(c.db.tsHour(i)); rows[(d.getDay() + 6) % 7][d.getHours()] += s[i] * k; n[(d.getDay() + 6) % 7][d.getHours()]++; }
    return rows.map((r, ri) => r.map((v, ci) => v / (n[ri][ci] || 1))); }, [c]);
  const pct = Math.round((e.peak_kva / e.contract_kva) * 100);
  return <>
    <div className="kpis">{ids.map(id => { const kk = c.db.kpiSummary(id, R.from, R.to); return <Kpi key={id} k={kk} spark={<Spark data={kpiSpark(c.db, id, R)} />} />; })}
      <div className="kpi"><div className="l">Peak demand</div><div className="v">{fmtNum(e.peak_kva)}<small>kVA</small></div><div className="f">{pct} % of contract {fmtNum(e.contract_kva)}</div></div>
      <div className="kpi"><div className="l">Energy used</div><div className="v">{fmtNum(e.energy_kwh / 1000, 0)}<small>MWh</small></div><div className="f">{R.days > 30 ? 'last 30 days' : R.label}</div></div></div>
    <div className="grid g21">
      <Card title={`Peak ${fmtNum(e.peak_kva)} kVA, ${pct} % of contract demand`} sub={`site load · ${e.load_profile_kind}`} csv={{ name: 'load-profile', rows: () => e.load_profile }} ask={{ kind: 'card', title: 'Load profile', summary: [`Peak ${e.peak_kva} kVA against contract ${e.contract_kva} kVA (${pct} %).`] }}>
        <Trend data={e.load_profile.map(x => ({ t: new Date(x.t).getTime(), v: x.kva }))} series={[{ key: 'v', name: 'Load', type: 'area' }]} unit="kVA" days={Math.min(R.days, 30)} height={240} refs={[{ y: e.contract_kva, label: 'Contract demand' }]} />
      </Card>
      <Card title={`${e.by_area[0].area} uses ${e.by_area[0].share_pct} %`} sub="consumption by area" csv={{ name: 'energy-by-area', rows: () => e.by_area }}>
        <Donut items={e.by_area.map(a => ({ name: a.area, value: a.kwh / 1000, display: fmtNum(a.kwh / 1000, 0) }))} center={fmtNum(e.energy_kwh / 1000, 0)} sub="MWh" />
      </Card>
    </div>
    <div className="grid g2 mt">
      <Card title="Weekly load pattern" sub="average kVA · weekday × hour · last 4 weeks"><Heat rows={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} cols={Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))} values={heat} unit="kVA" /></Card>
      <Card title="Utilities" sub="latest and 7-day trend" flush>
        <table className="t"><tbody>{c.demo.energy.utilities.map(([a, t]) => { const d = c.db.tagDef(a, t); const hh = c.db.history(a, t, c.db.anchor - 7 * D, c.db.anchor, '4h'); return <tr key={a + t}><td className="b">{a}<div className="muted" style={{ fontWeight: 400, fontSize: 11.5 }}>{d.name}</div></td><td className="r num">{fmtNum(c.db.latest(a, t))} <span className="muted">{d.unit}</span></td><td style={{ width: 140 }}><Spark data={hh.points} /></td></tr>; })}</tbody></table>
      </Card>
    </div>
  </>;
}


/** The dashboard itself (KPI row and trend cards), also shown in the Artefactory viewer. */
export function CustomDashBody({ a }) {
  const app = useApp();
  const c = getDB(a.demo, app.anchor); const R = { ...app.rng, from: c.db.anchor - app.rng.days * D, to: c.db.anchor };
  const ids = (a.spec?.kpis || c.demo.overview).filter(id => c.demo.kpis.find(k => k.id === id));
  return <>
    <KpiRow c={c} ids={ids} R={R} />
    <div className="grid g2">{ids.map(id => { const k = c.demo.kpis.find(x => x.id === id); const s = c.db.kpiSummary(id, R.from, R.to);
      return <Card key={id} title={`${k.name}: ${fmtNum(s.value, k.dec)} ${k.unit}`} sub={`baseline ${k.base} · target ${k.target}`} ask={{ kind: 'card', title: k.name, summary: [`${k.name} ${s.value} ${k.unit}, ${s.status}.`] }}>
        <Trend data={c.db.kpiDaily(id).filter(p => p.t >= R.from - D)} series={[{ key: 'v', name: k.name, type: 'area' }]} unit={k.unit} days={R.days} height={180} refs={[{ y: k.base, label: 'Baseline', color: '#98a2b3' }, { y: k.target, label: 'Target', color: '#079455' }]} />
      </Card>; })}</div>
  </>;
}
