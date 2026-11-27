/* Built-in dashboard: quality. */
import React, { useMemo, useState } from 'react';
import { Star, Folder, Sparkles, Wrench } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { dashName } from '../../shared/artefacts.js';
import { Card, Kpi, PageHead, HealthBar, Tag, Empty } from '../../components/ui.jsx';
import { Trend, Bars, Waterfall, Donut, Spark, Heat, BarList, usePalette } from '../../components/charts.jsx';
import { fmtNum, fmtRel, fmtTime, fmtDateTime, statusCls, getDB } from '../../lib/data.js';
import { D, kpiSpark, KpiRow } from './common.jsx';

export default function Quality({ c, R }) {
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
