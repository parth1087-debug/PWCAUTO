import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronRight, Cpu, Database, FileText, Gauge, Radio, Send, ShieldCheck, Sparkles, Star, Wrench, X, Zap } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { Card, Kpi, Tag, HealthBar, Empty } from '../ui.jsx';
import { Trend, Spark, BarList, usePalette } from '../charts.jsx';
import Markdown from '../Markdown.jsx';
import { fmtNum, fmtRel, fmtTime, fmtDateTime } from '../../lib/data.js';
import { assetSources, sourcesOf } from '../../shared/sources.js';
import { hash } from '../../shared/engine.js';
import { api } from '../../lib/api.js';
import { D, stateOf, LiveBadge, LiveValue, Ring } from './live.jsx';

/* ================= Custom widget board (agent-made) ================= */
export function CustomBoard({ c, widgets = [] }) {
  const app = useApp(); const R = { ...app.rng, from: c.db.anchor - app.rng.days * D, to: c.db.anchor };
  return <div className="cb-grid">{widgets.map((w, i) => {
    switch (w.type) {
      case 'kpis': return <div key={i} className="span-all kpis" style={{ gridTemplateColumns: `repeat(${Math.min(6, Math.max(2, w.ids.length))}, minmax(0,1fr))`, margin: 0 }}>{w.ids.map(id => { const k = c.db.kpiSummary(id, R.from, R.to); return <Kpi key={id} k={k} onClick={() => app.nav(`artefactory/${c.demo.id}-kpis/${id}`)} spark={<Spark data={c.db.kpiDaily(id).filter(p => p.t >= R.from - D).map(p => ({ v: p.v }))} />} />; })}</div>;
      case 'kpi_trend': { const k = c.demo.kpis.find(x => x.id === w.id) || c.demo.kpis[0]; return <Card key={i} title={`${k.name}, daily`} sub={`baseline ${k.base} · target ${k.target} ${k.unit}`}><Trend data={c.db.kpiDaily(k.id).filter(p => p.t >= R.from - D)} series={[{ key: 'v', name: k.name, type: 'area' }]} unit={k.unit} days={R.days} height={200} refs={[{ y: k.base, label: 'Baseline', color: '#98a2b3' }, { y: k.target, label: 'Target', color: '#079455' }]} /></Card>; }
      case 'tag_trend': { const d = c.db.tagDef(w.asset, w.tag); if (!d) return null; return <Card key={i} title={`${w.asset} · ${d.name}`} sub="last 7 days"><Trend data={c.db.history(w.asset, w.tag, c.db.anchor - 7 * D, c.db.anchor).points} series={[{ key: 'v', name: d.name, type: 'area' }]} unit={d.unit} days={7} height={200} refs={d.hi != null && d.hi > 0 ? [{ y: d.hi, label: `High ${d.hi}` }] : []} /></Card>; }
      case 'asset_health': return <Card key={i} title="Asset health" sub="lowest first" flush><table className="t"><tbody>{c.db.healthAll().slice(0, 6).map(x => <tr key={x.id}><td><b>{x.id}</b> <span className="muted">{x.name}</span></td><td><HealthBar v={x.health} w={90} /></td><td className="r num">{x.rulDays} d</td></tr>)}</tbody></table></Card>;
      case 'losses': return <Card key={i} title="Top losses" sub="hours this month"><BarList items={c.demo.cost.losses.map(l => ({ name: l[0], value: l[1] }))} unit="h" /></Card>;
      case 'energy': { const e = c.tools.get_energy({ days: 7 }); return <Card key={i} title={`Peak ${fmtNum(e.peak_kva)} kVA`} sub={`contract ${fmtNum(e.contract_kva)} kVA · 7 days`}><Trend data={e.load_profile.map(p => ({ t: new Date(p.t).getTime(), v: p.kva }))} series={[{ key: 'v', name: 'Load', type: 'area' }]} unit="kVA" days={7} height={200} refs={[{ y: e.contract_kva, label: 'Contract' }]} /></Card>; }
      case 'alerts': return <Card key={i} title="Needs attention" flush>{app.messages.filter(m => m.type === 'alert' || m.type === 'approval').slice(0, 4).map(m => <button key={m.id} className="feed-i" onClick={() => app.nav('messages/' + m.id)}><span className={`rail ${m.sev}`} /><span><div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.title}</div><div className="muted" style={{ fontSize: 11.5 }}>{m.from} · {fmtRel(m.time)}</div></span></button>)}</Card>;
      case 'setpoints': return <Card key={i} title="Setpoint recommendations" flush><table className="t"><tbody>{(c.demo.setpoints || []).map(s => <tr key={s.asset + s.tag} className="click" onClick={() => app.nav(`artefactory/${c.demo.id}-setpoints`)}><td><b>{s.asset}</b> <span className="muted">{s.name}</span></td><td className="num">{fmtNum(s.current)} → <b style={{ color: 'var(--brand)' }}>{fmtNum(s.recommended)}</b> {s.unit}</td><td className="muted">{s.gain}</td></tr>)}</tbody></table></Card>;
      case 'live': { const ids = (w.assets || []).filter(x => c.db.assetById[x]).slice(0, 6); return <Card key={i} title="Live values" actions={<LiveBadge />} flush><table className="t"><tbody>{ids.flatMap(id => c.demo.classes[c.db.assetById[id].cls].tags.slice(0, 2).map(t => <tr key={id + t[0]}><td><b className="mono" style={{ fontSize: 12 }}>{id}</b> <span className="muted">{t[1]}</span></td><td className="r"><LiveValue c={c} asset={id} tag={t[0]} /></td></tr>))}</tbody></table></Card>; }
      case 'text': return <Card key={i} className="span-all"><div className="ans"><Markdown text={w.md} /></div></Card>;
      default: return null;
    }
  })}</div>;
}
