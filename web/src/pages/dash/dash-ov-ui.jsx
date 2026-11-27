/* Chart and UI helpers for the Overview and KPI scorecard boards (dash-ov). Colours come from the theme palette. */
import React from 'react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Cell } from 'recharts';
import { usePalette } from '../../components/charts.jsx';
import { axisTime, fmtNum, fmtDateTime } from '../../lib/data.js';
import { statusTone } from '../../shared/analytics/dash-ov.js';

const fmtAxis = v => (v === 0 ? '0' : Math.abs(v) >= 1e6 ? fmtNum(v / 1e6, 1) + ' M' : Math.abs(v) >= 1e4 ? fmtNum(v / 1e3, 0) + ' k' : fmtNum(v, Math.abs(v) < 10 ? 1 : 0));

/** Status pill: colour plus a word, never colour alone. */
export const StatusTag = ({ s }) => <span className={`tag ${statusTone(s)}`}>{s}</span>;

/** Tiny SVG sparkline with an optional dashed target line. */
export function MiniSpark({ data, target, color = 'var(--muted)', height = 26 }) {
  if (!data || data.length < 2) return <div style={{ height, marginTop: 4 }} />;
  const vs = data.map(d => d.v).concat(target != null ? [target] : []);
  const mn = Math.min(...vs), mx = Math.max(...vs), W = 100;
  const y = v => height - 2 - ((v - mn) / (mx - mn || 1)) * (height - 4);
  const d = data.map((p, i) => `${i ? 'L' : 'M'}${((i / (data.length - 1)) * W).toFixed(2)},${y(p.v).toFixed(2)}`).join('');
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, marginTop: 4, display: 'block' }} aria-hidden>
      {target != null && <line x1="0" x2={W} y1={y(target)} y2={y(target)} stroke="var(--good)" strokeDasharray="3 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Horizontal bullet: filled = realised, track outline = potential. */
export function Bullet({ value, max, total, tone = 'brand', h = 10 }) {
  return (
    <div style={{ position: 'relative', height: h, borderRadius: 3, background: 'var(--bg-3)', width: `${Math.max(2, (max / total) * 100)}%` }}>
      <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, (value / (max || 1)) * 100)}%`, background: `var(--${tone})`, borderRadius: 3 }} />
    </div>
  );
}

/** Diverging bar around a centre line: v in [-1, 1]. */
export function Diverge({ v, good, h = 10 }) {
  const w = Math.min(50, Math.abs(v) * 50);
  return (
    <div style={{ position: 'relative', height: h, width: '100%' }}>
      <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'var(--line)' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 3, background: good ? 'var(--good)' : 'var(--bad)', left: v >= 0 ? '50%' : `${50 - w}%`, width: `${Math.max(w, 0.6)}%` }} />
    </div>
  );
}

const TipBox = ({ title, rows }) => <div className="tt"><div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>{rows.map(([k, v, c]) => <div key={k} className="row">{c && <span className="dotc" style={{ background: c }} />}{k}: <b className="num">{v}</b></div>)}</div>;

/** Daily output bars vs plan. Days under 95 % of plan are drawn in the warning colour (legend says so). */
export function PlanBars({ data, unit, planName = 'Plan', height = 240 }) {
  const p = usePalette();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis dataKey="t" type="category" tickFormatter={t => axisTime(t, 30)} stroke={p.axis} tickLine={false} axisLine={false} minTickGap={24} fontSize={11} />
        <YAxis stroke={p.axis} tickLine={false} axisLine={false} width={52} fontSize={11} domain={[0, 'auto']} tickFormatter={fmtAxis} />
        <Tooltip cursor={{ fill: p.grid }} content={({ active, payload }) => active && payload?.length ? (d => <TipBox title={fmtDateTime(d.t).split(',')[0]} rows={[['Actual', `${fmtNum(d.actual)} ${unit}`, d.actual < d.plan * 0.95 ? p.warn : p.bar], [planName, `${fmtNum(d.plan)} ${unit}`], ['Attainment', `${fmtNum((d.actual / d.plan) * 100, 1)} %`]]} />)(payload[0].payload) : null} />
        <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.actual < d.plan * 0.95 ? p.warn : p.bar} />)}
        </Bar>
        <Line dataKey="plan" name={planName} stroke={p.axis} strokeDasharray="4 3" strokeWidth={1.5} dot={{ r: 2.5, fill: p.axis, strokeWidth: 0 }} isAnimationActive={false} type="linear" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Demand vs contract: bars from zero, contract line and 90 % alert line. */
export function DemandBars({ data, contract, hourly, height = 240 }) {
  const p = usePalette();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis dataKey="t" type="category" tickFormatter={t => axisTime(t, hourly ? 1 : 30)} stroke={p.axis} tickLine={false} axisLine={false} minTickGap={28} fontSize={11} />
        <YAxis stroke={p.axis} tickLine={false} axisLine={false} width={52} fontSize={11} domain={[0, Math.ceil(contract * 1.05 / 500) * 500]} tickFormatter={fmtAxis} />
        <Tooltip cursor={{ fill: p.grid }} content={({ active, payload }) => active && payload?.length ? (d => <TipBox title={hourly ? fmtDateTime(d.t) : fmtDateTime(d.t).split(',')[0]} rows={[[hourly ? 'Demand' : 'Peak demand', `${fmtNum(d.v)} kVA`], ['Of contract', `${fmtNum((d.v / contract) * 100, 1)} %`], ...(d.mwh != null ? [['Energy', `${fmtNum(d.mwh, 1)} MWh`]] : [])]} />)(payload[0].payload) : null} />
        <ReferenceLine y={contract} stroke={p.bad} strokeDasharray="4 3" label={{ value: `Contract ${fmtNum(contract)} kVA`, position: 'insideTopRight', fontSize: 10, fill: p.bad }} />
        <ReferenceLine y={contract * 0.9} stroke={p.warn} strokeDasharray="2 3" label={{ value: '90 % alert', position: 'insideBottomLeft', fontSize: 10, fill: p.warn }} />
        <Bar dataKey="v" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.v > contract * 0.9 ? p.warn : p.bar} />)}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** KPI trend: faint daily values, bold 7-day mean, baseline and target lines, go-live marker, selected period shaded. */
export function KpiTrend({ data, k, goLive, baseFrom, baseTo, from, to, height = 260 }) {
  const p = usePalette();
  const vals = data.map(d => d.v).concat([k.base, k.target]);
  const mn = Math.min(...vals), mx = Math.max(...vals), pad = (mx - mn) * 0.08 || 1;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={t => axisTime(t, 180)} stroke={p.axis} tickLine={false} axisLine={false} minTickGap={40} fontSize={11} />
        <YAxis stroke={p.axis} tickLine={false} axisLine={false} width={56} fontSize={11} domain={[mn - pad, mx + pad]} tickFormatter={v => fmtNum(v, Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0)} />
        <Tooltip content={({ active, payload }) => active && payload?.length ? (d => <TipBox title={fmtDateTime(d.t).split(',')[0]} rows={[['Day', `${fmtNum(d.v, k.dec + 1)} ${k.unit}`], ...(d.avg != null ? [['7-day mean', `${fmtNum(d.avg, k.dec + 1)} ${k.unit}`, p.c1]] : [])]} />)(payload[0].payload) : null} />
        <ReferenceArea key="ba" x1={baseFrom} x2={baseTo} fill={p.axis} fillOpacity={0.06} label={{ value: 'Baseline period', position: 'insideTopLeft', fontSize: 10, fill: p.axis }} />
        <ReferenceArea key="sel" x1={from} x2={to} fill={p.c1} fillOpacity={0.08} label={{ value: 'Selected period', position: 'insideTopRight', fontSize: 10, fill: p.c1 }} />
        <ReferenceLine key="go" x={goLive} stroke={p.c1} strokeDasharray="2 2" label={{ value: 'Go-live', position: 'insideBottomLeft', fontSize: 10, fill: p.c1 }} />
        <ReferenceLine key="b" y={k.base} stroke={p.axis} strokeDasharray="4 3" label={{ value: `Baseline ${fmtNum(k.base, k.dec)}`, position: 'insideBottomRight', fontSize: 10, fill: p.axis }} />
        <ReferenceLine key="tg" y={k.target} stroke={p.good} strokeDasharray="4 3" label={{ value: `Target ${fmtNum(k.target, k.dec)}`, position: 'insideTopRight', fontSize: 10, fill: p.good }} />
        <Line dataKey="v" name="Daily" stroke={p.axis} strokeOpacity={0.45} strokeWidth={1} dot={false} isAnimationActive={false} />
        <Line dataKey="avg" name="7-day mean" stroke={p.c1} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Legend row (identity never by colour alone). items: [[label, css colour, dashed?]] */
export const Legend = ({ items }) => (
  <div className="row" style={{ gap: 14, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
    {items.map(([l, c, dash]) => <span key={l} className="row" style={{ gap: 5 }}>{dash ? <span style={{ width: 14, borderTop: `2px dashed ${c}` }} /> : <span className="dotc" style={{ background: c, borderRadius: 2 }} />}{l}</span>)}
  </div>
);

/** A compact headline fact: label, value, sub-line; optional click. */
export function Fact({ label, value, unit, sub, tone, onClick }) {
  const El = onClick ? 'button' : 'div';
  return (
    <El onClick={onClick} className="ovf" style={{ textAlign: 'left', minWidth: 0, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--line)', cursor: onClick ? 'pointer' : 'default', color: 'inherit', font: 'inherit' }}>
      <div className="muted" style={{ fontSize: 11.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 650, marginTop: 2, color: tone ? `var(--${tone})` : 'var(--text)', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}{unit && <small style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 4 }}>{unit}</small>}</div>
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={typeof sub === 'string' ? sub : undefined}>{sub}</div>}
    </El>
  );
}
