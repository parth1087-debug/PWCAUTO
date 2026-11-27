/* Built-in dashboard: cost. */
import React, { useMemo, useState } from 'react';
import { Star, Folder, Sparkles, Wrench } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { dashName } from '../../shared/artefacts.js';
import { Card, Kpi, PageHead, HealthBar, Tag, Empty } from '../../components/ui.jsx';
import { Trend, Bars, Waterfall, Donut, Spark, Heat, BarList, usePalette } from '../../components/charts.jsx';
import { fmtNum, fmtRel, fmtTime, fmtDateTime, statusCls, getDB } from '../../lib/data.js';
import { D, kpiSpark, KpiRow } from './common.jsx';

export default function Cost({ c, R }) {
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
