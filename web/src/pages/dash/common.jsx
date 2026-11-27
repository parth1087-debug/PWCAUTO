/* Shared helpers for the built-in dashboards. */
import React from 'react';
import { useApp } from '../../App.jsx';
import { Kpi } from '../../components/ui.jsx';
import { Spark } from '../../components/charts.jsx';

export const D = 864e5;
export const kpiSpark = (db, id, R) => db.kpiDaily(id).filter(p => p.t >= R.from - D).map(p => ({ v: p.v }));

export function KpiRow({ c, ids, R }) {
  const { nav } = useApp();
  return <div className="kpis">{ids.map(id => { const k = c.db.kpiSummary(id, R.from, R.to); return <Kpi key={id} k={k} onClick={() => nav(`artefactory/${c.demo.id}-kpis/${id}`)} spark={<Spark data={kpiSpark(c.db, id, R)} />} />; })}</div>;
}

/** A built-in board's content (no page header): used inside the Artefactory viewer. */
