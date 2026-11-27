/* Built-in dashboard: kpis. */
import React, { useMemo, useState } from 'react';
import { Star, Folder, Sparkles, Wrench } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { dashName } from '../../shared/artefacts.js';
import { Card, Kpi, PageHead, HealthBar, Tag, Empty } from '../../components/ui.jsx';
import { Trend, Bars, Waterfall, Donut, Spark, Heat, BarList, usePalette } from '../../components/charts.jsx';
import { fmtNum, fmtRel, fmtTime, fmtDateTime, statusCls, getDB } from '../../lib/data.js';
import { D, kpiSpark, KpiRow } from './common.jsx';

export default function Kpis({ c, R, sel }) {
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
