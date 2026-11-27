/* Built-in dashboard: energy. */
import React, { useMemo, useState } from 'react';
import { Star, Folder, Sparkles, Wrench } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { dashName } from '../../shared/artefacts.js';
import { Card, Kpi, PageHead, HealthBar, Tag, Empty } from '../../components/ui.jsx';
import { Trend, Bars, Waterfall, Donut, Spark, Heat, BarList, usePalette } from '../../components/charts.jsx';
import { fmtNum, fmtRel, fmtTime, fmtDateTime, statusCls, getDB } from '../../lib/data.js';
import { D, kpiSpark, KpiRow } from './common.jsx';

export default function Energy({ c, R }) {
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
