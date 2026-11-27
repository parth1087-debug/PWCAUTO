/* Built-in dashboard: overview. */
import React, { useMemo, useState } from 'react';
import { Star, Folder, Sparkles, Wrench } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { dashName } from '../../shared/artefacts.js';
import { Card, Kpi, PageHead, HealthBar, Tag, Empty } from '../../components/ui.jsx';
import { Trend, Bars, Waterfall, Donut, Spark, Heat, BarList, usePalette } from '../../components/charts.jsx';
import { fmtNum, fmtRel, fmtTime, fmtDateTime, statusCls, getDB } from '../../lib/data.js';
import { D, kpiSpark, KpiRow } from './common.jsx';

export default function Overview({ c, R }) {
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
        <Trend data={days.map(d => ({ t: new Date(d.t).getTime(), actual: d.actual, plan: d.plan }))} series={[{ key: 'actual', name: 'Actual', type: 'bar' }, { key: 'plan', name: 'Plan', dash: '4 3', color: '#98a2b3' }]} unit={p.unit} days={R.days} height={240} />
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
