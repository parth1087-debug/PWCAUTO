/* Shared helpers for the built-in dashboards. */
import React from 'react';
import { useApp } from '../../App.jsx';
import { fmtNum } from '../../lib/data.js';
import { kpiStat, statusTone } from '../../shared/analytics/dash-ov.js';
import { MiniSpark } from './dash-ov-ui.jsx';

export const D = 864e5;
/** Daily KPI points for a sparkline: the selected period, but at least 14 days so the shape is readable. */
export const kpiSpark = (db, id, R) => db.kpiDaily(id).filter(p => p.t >= Math.min(R.from, R.to - 14 * D) - D).map(p => ({ v: p.v }));

/** One KPI tile: status (word + dot), value, target with gap, change vs baseline coloured by the KPI's `better`, sparkline with target line. */
export function KpiTile({ c, id, R, onClick }) {
  const k = kpiStat(c.db, id, R);
  const tone = statusTone(k.status);
  const good = k.improvePct >= 0;
  const gapTxt = k.gapMet ? 'target met' : `gap ${fmtNum(k.gap, k.dec)}`;
  return (
    <button className="kpi" onClick={onClick} title={`${k.name}: ${k.status}. Baseline ${fmtNum(k.base, k.dec)}, target ${fmtNum(k.target, k.dec)} ${k.unit}. Owner: ${k.owner}`}>
      <div className="l"><span className="dotc" style={{ background: `var(--${tone})` }} /><span className="ellipsis">{k.name}</span></div>
      <div className="v">{fmtNum(k.value, k.dec)}<small>{k.unit}</small></div>
      <div className="f"><span className={good ? 'up-good' : 'up-bad'}>{k.better === 'up' ? (good ? '▲' : '▼') : (good ? '▼' : '▲')} {Math.abs(k.improvePct)}%</span><span>vs baseline</span></div>
      <div className="f" style={{ marginTop: 3 }}><span style={{ color: `var(--${tone})`, fontWeight: 600 }}>{k.status}</span><span className="right">Target {fmtNum(k.target, k.dec)} · {gapTxt}</span></div>
      <MiniSpark data={kpiSpark(c.db, id, R)} target={k.target} />
    </button>
  );
}

export function KpiRow({ c, ids, R }) {
  const { nav } = useApp();
  return <div className="kpis">{ids.filter(id => c.demo.kpis.find(k => k.id === id)).map(id => <KpiTile key={id} c={c} id={id} R={R} onClick={() => nav(`artefactory/${c.demo.id}-kpis/${id}`)} />)}</div>;
}
