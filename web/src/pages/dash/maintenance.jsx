/* Built-in dashboard: maintenance. */
import React, { useMemo, useState } from 'react';
import { Star, Folder, Sparkles, Wrench } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { dashName } from '../../shared/artefacts.js';
import { Card, Kpi, PageHead, HealthBar, Tag, Empty } from '../../components/ui.jsx';
import { Trend, Bars, Waterfall, Donut, Spark, Heat, BarList, usePalette } from '../../components/charts.jsx';
import { fmtNum, fmtRel, fmtTime, fmtDateTime, statusCls, getDB } from '../../lib/data.js';
import { D, kpiSpark, KpiRow } from './common.jsx';

export default function Maintenance({ c, R, sel }) {
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
