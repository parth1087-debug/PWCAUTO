import React from 'react';
import { useApp } from '../App.jsx';
import { Card } from '../components/ui.jsx';
import { Trend } from '../components/charts.jsx';
import { fmtNum, getDB } from '../lib/data.js';
import { D, KpiRow } from './dash/common.jsx';
import Overview from './dash/overview.jsx';
import Kpis from './dash/kpis.jsx';
import Maintenance from './dash/maintenance.jsx';
import Cost from './dash/cost.jsx';
import Quality from './dash/quality.jsx';
import Energy from './dash/energy.jsx';

/** A built-in board's content (no page header): used inside the Artefactory viewer. One file per board in ./dash/. */
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
