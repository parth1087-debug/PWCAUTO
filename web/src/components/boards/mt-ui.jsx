/* Small UI pieces for the Maintenance, Asset twin and RCA boards (owner: dash-mt). */
import React, { useEffect, useState } from 'react';
import { useApp } from '../../App.jsx';
import { Spark } from '../charts.jsx';
import { fmtNum, fmtDate } from '../../lib/data.js';
import { inr } from '../../shared/analytics/dash-mt.js';

export const D = 864e5;
export { inr };
export const pct = v => (v == null ? '—' : `${Math.round(v * 100)} %`);
export const days = d => (d == null ? '—' : d < 1 ? '< 1 d' : `${Math.round(d)} d`);
export const when = t => fmtDate(t);
export const sevTag = s => (s === 'bad' ? 'bad' : s === 'warn' ? 'warn' : 'line');

/** KPI tile: value, unit, change vs previous period (coloured by `better`), target and a note. */
export function MKpi({ label, value, dec = 0, unit, prev, better = 'up', target, note, spark, onClick, fmt }) {
  const show = v => (v == null ? '—' : fmt ? fmt(v) : fmtNum(v, dec));
  const d = value != null && prev != null && prev !== 0 ? ((value - prev) / Math.abs(prev)) * 100 : null;
  const good = d == null ? null : better === 'up' ? d >= 0 : d <= 0;
  const flat = d != null && Math.abs(d) < 0.5;
  const tgtGap = target != null && value != null ? (better === 'up' ? value >= target : value <= target) : null;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="kpi" onClick={onClick} style={{ textAlign: 'left' }}>
      <div className="l"><span className="dotc" style={{ background: tgtGap == null ? 'var(--muted)' : tgtGap ? 'var(--good)' : 'var(--warn)' }} /><span className="ellipsis">{label}</span></div>
      <div className="v">{show(value)}{unit && <small>{unit}</small>}</div>
      <div className="f">
        {d != null && (flat ? <span className="muted">● flat</span> : <span className={good ? 'up-good' : 'up-bad'}>{d > 0 ? '▲' : '▼'} {Math.abs(d) >= 10 ? Math.round(Math.abs(d)) : Math.abs(d).toFixed(1)}%</span>)}
        {d != null && <span>vs prev.</span>}
        {target != null && <span className="right">Target {show(target)}</span>}
      </div>
      {note && <div className="f" style={{ marginTop: 3 }}>{note}</div>}
      {spark && spark.length > 1 && <Spark data={spark.map(v => ({ v }))} />}
    </Tag>
  );
}

/** Headline insight: one line with the key numbers. */
export function Headline({ children, tone = 'brand' }) {
  return <div className="card" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: `3px solid var(--${tone})`, fontSize: 14, lineHeight: 1.55 }}>{children}</div>;
}

/** Horizontal Pareto bars: value bar, value label, extra columns. */
export function ParetoBars({ rows, unit, extra, color = 'var(--brand)' }) {
  const mx = Math.max(...rows.map(r => r.value), 1e-9);
  return <div role="table">{rows.map(r => (
    <div key={r.name} className="row" role="row" style={{ padding: '6px 0', fontSize: 12.5, gap: 10 }} title={`${r.name}: ${fmtNum(r.value)} ${unit}`}>
      <span className="ellipsis" style={{ width: '38%', flex: 'none' }}>{r.name}</span>
      <div className="grow" style={{ height: 10, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${(r.value / mx) * 100}%`, height: '100%', background: r.color || color, borderRadius: 4 }} /></div>
      <span className="num" style={{ width: 62, textAlign: 'right' }}>{fmtNum(r.value, r.value < 10 ? 1 : 0)} {unit}</span>
      {extra && <span className="num muted" style={{ width: 72, textAlign: 'right' }}>{extra(r)}</span>}
    </div>))}</div>;
}

/** Capacity bar: used vs available. */
export function Capacity({ used, cap, unit = 'crew-h' }) {
  const f = cap ? Math.min(1, used / cap) : 0;
  return <div>
    <div className="row" style={{ fontSize: 12, marginBottom: 4 }}><span className="muted">Crew capacity used</span><span className="right num"><b>{fmtNum(used)}</b> of {fmtNum(cap)} {unit}</span></div>
    <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${f * 100}%`, height: '100%', background: f > 0.95 ? 'var(--warn)' : 'var(--brand)', borderRadius: 4 }} /></div>
  </div>;
}

const ZONE = (crit, pi) => { const s = (crit === 'A' ? 3 : crit === 'B' ? 2 : 1) * (pi + 1); return s >= 9 ? 'bad' : s >= 4 ? 'warn' : 'good'; };
export const P_BINS = [['< 5 %', 0, 0.05], ['5–20 %', 0.05, 0.2], ['20–50 %', 0.2, 0.5], ['50–80 %', 0.5, 0.8], ['> 80 %', 0.8, 1.01]];
/** Risk matrix: criticality (rows) × probability of failure in 30 days (columns), assets as chips. */
export function RiskMatrix({ items, sel, onPick }) {
  return (
    <div className="scroll-x">
      <div style={{ display: 'grid', gridTemplateColumns: `76px repeat(${P_BINS.length}, minmax(64px, 1fr))`, gap: 4, minWidth: 420, fontSize: 11.5 }}>
        {['A', 'B', 'C'].map(c => <React.Fragment key={c}>
          <div className="muted" style={{ alignSelf: 'center' }}>Criticality <b style={{ color: 'var(--text)' }}>{c}</b></div>
          {P_BINS.map(([, lo, hi], pi) => {
            const xs = items.filter(x => x.crit === c && x.p30 >= lo && x.p30 < hi); const z = ZONE(c, pi);
            return <div key={pi} style={{ minHeight: 54, borderRadius: 6, padding: 5, background: `var(--${z}-soft)`, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: 3 }}>
              {xs.length > 4 && pi === 0 ? <span className="muted" style={{ padding: 2 }}>{xs.length} assets</span>
                : xs.map(x => <button key={x.id} onClick={() => onPick(x.id)} title={`${x.id} · ${x.name} · ${Math.round(x.p30 * 100)} % · ${inr(x.riskL)} at risk`}
                  style={{ fontSize: 10.5, padding: '1px 5px', borderRadius: 4, background: 'var(--bg)', border: `1px solid ${x.id === sel ? 'var(--brand)' : 'var(--line)'}`, fontWeight: x.id === sel ? 700 : 500 }}>{x.id}</button>)}
            </div>;
          })}
        </React.Fragment>)}
        <div />{P_BINS.map(([l]) => <div key={l} className="muted" style={{ textAlign: 'center' }}>{l}</div>)}
      </div>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>Columns: probability of failure in the next 30 days, from remaining life. Red zone: act first.</div>
    </div>
  );
}

export const ACTION = { now: ['bad', 'Act before window'], window: ['warn', 'Plan in window'], monitor: ['line', 'Monitor'] };
export const FIT = { before: ['bad', 'Do before window'], yes: ['good', 'Fits'], spare: ['warn', 'Waiting for spare'], next: ['line', 'Next window'] };
export const SPARE = s => (!s ? ['line', 'Not needed'] : s.status === 'stock' ? ['good', 'In stock'] : s.status === 'order' ? ['warn', `On order · ${s.eta} d`] : ['bad', `Not stocked · ${s.eta} d lead`]);

/* ---------- live helpers (copied from live.jsx so these boards do not depend on the shared file) ---------- */
export const stateOf = (def, v) => (def.hi != null && v > def.hi) || (def.lo != null && def.lo !== 0 && v < def.lo) ? 'bad' : (def.hi != null && v > def.hi * 0.92) || (def.lo != null && def.lo !== 0 && v < def.lo * 1.04) ? 'warn' : 'good';
export function LiveBadge() {
  const { tickAt } = useApp(); const [, f] = useState(0);
  useEffect(() => { const i = setInterval(() => f(x => x + 1), 1000); return () => clearInterval(i); }, []);
  const age = Math.max(0, Math.round((Date.now() - tickAt) / 1000));
  return <span className="live-badge"><span className="live" />Live · updated {age}s ago · refresh 10 s</span>;
}
export function LiveValue({ c, asset, tag }) {
  const { tick } = useApp();
  const def = c.db.tagDef(asset, tag); const v = c.db.live(asset, tag, tick); const st = stateOf(def, v);
  return <span className={`lv-v ${st}`} key={tick}>{fmtNum(v)}<small> {def.unit}</small></span>;
}
export function Ring({ v, size = 92 }) {
  const r = size / 2 - 7, C = 2 * Math.PI * r; const col = v < 50 ? 'var(--bad)' : v < 75 ? 'var(--warn)' : 'var(--good)';
  return <svg width={size} height={size} role="img" aria-label={`Health ${v} of 100`}><circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-3)" strokeWidth="8" fill="none" />
    <circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${(C * v) / 100} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    <text x="50%" y="48%" textAnchor="middle" fontSize="22" fontWeight="650" fill="var(--text)">{v}</text><text x="50%" y="66%" textAnchor="middle" fontSize="10" fill="var(--muted)">health</text></svg>;
}
