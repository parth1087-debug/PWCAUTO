/* UI and chart helpers for the Cost and Quality boards (dash-cq). */
import React from 'react';
import { ResponsiveContainer, ComposedChart, Line, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Cell, LineChart, Legend } from 'recharts';
import { usePalette } from '../../components/charts.jsx';
import { fmtNum, axisTime, fmtDateTime } from '../../lib/data.js';

/* ₹ lakh -> "₹ 12.4 L" or "₹ 1.32 Cr" */
export const money = (lakh, signed) => {
  if (lakh == null || Number.isNaN(lakh)) return '—';
  const s = signed ? (lakh > 0 ? '+' : lakh < 0 ? '−' : '') : lakh < 0 ? '−' : '';
  const a = Math.abs(lakh);
  return a >= 100 ? `${s}₹${fmtNum(a / 100, a >= 1000 ? 1 : 2)}\u00a0Cr` : `${s}₹${fmtNum(a, a >= 10 ? 1 : 2)}\u00a0L`;
};
export const decOf = span => (span >= 50 ? 0 : span >= 5 ? 1 : span >= 0.5 ? 2 : 3);
export const nf = (v, d) => fmtNum(v, d ?? decOf(Math.abs(v)));

export function Headline({ tone = 'info', children }) {
  const col = { bad: 'var(--bad)', warn: 'var(--warn)', good: 'var(--good)', info: 'var(--brand)' }[tone];
  return <div className="card" style={{ padding: '12px 16px', marginBottom: 16, borderLeft: `4px solid ${col}`, fontSize: 14, lineHeight: 1.5 }}><div>{children}</div></div>;
}

/* KPI tile for derived values: value, unit, limit/target, status */
export function Tile({ label, value, unit, foot, tone }) {
  const col = { bad: 'var(--bad)', warn: 'var(--warn)', good: 'var(--good)' }[tone] || 'var(--info)';
  return <div className="kpi" style={{ cursor: 'default' }}>
    <div className="l"><span className="dotc" style={{ background: col }} /><span className="ellipsis">{label}</span></div>
    <div className="v">{value}<small>{unit}</small></div>
    <div className="f" style={{ whiteSpace: 'normal' }}>{foot}</div>
  </div>;
}

const CSS = '.cq-s td.num, .cq-s td.r, .cq-s th { white-space: nowrap; }';
export const Scroll = ({ children }) => <div className="cq-s" style={{ overflowX: 'auto' }}><style>{CSS}</style>{children}</div>;

/* horizontal magnitude bar for table cells */
export function CellBar({ value, max, color, w = 90 }) {
  const p = usePalette();
  return <div style={{ width: w, height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle' }}>
    <div style={{ width: `${Math.max(2, Math.min(100, (value / (max || 1)) * 100))}%`, height: '100%', background: color || p.c1, borderRadius: 4 }} /></div>;
}
/* diverging bar: over budget to the right (bad), under to the left (good) */
export function DivBar({ v, max, w = 120 }) {
  const p = usePalette(); const f = Math.min(1, Math.abs(v) / (max || 1)) * 50;
  return <div style={{ position: 'relative', width: w, height: 10, display: 'inline-block', verticalAlign: 'middle' }}>
    <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'var(--line-2)' }} />
    <div style={{ position: 'absolute', top: 1, height: 8, borderRadius: 4, background: v > 0 ? p.bad : p.good, left: v > 0 ? '50%' : `${50 - f}%`, width: `${f}%` }} />
  </div>;
}

/* horizontal waterfall as rows: totals as bars, steps as floating segments on one shared scale.
   When the steps are small against the totals, the scale is zoomed (broken axis, marked ≈ and noted below) so the steps stay readable. */
export function HWaterfall({ rows, unit, dec = 0, upBad = false }) {
  const p = usePalette();
  let run = 0; const items = rows.map(x => { if (x.kind === 'total') { run = x.v; return { ...x, a: 0, b: x.v }; } const a = run; run += x.v; return { ...x, a: Math.min(a, run), b: Math.max(a, run) }; });
  const mx = Math.max(...items.map(x => x.b)) || 1;
  const lo = Math.min(...items.filter(x => x.kind !== 'total').map(x => x.a), ...items.filter(x => x.kind === 'total').map(x => x.b));
  const zoom = (mx - lo) / mx < 0.3;
  const base = zoom ? Math.max(0, lo - (mx - lo) * 0.35) : 0;
  const X = v => ((Math.max(v, base) - base) / (mx - base)) * 100;
  return <div>{items.map((x, i) => (
    <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(96px, 34%) 1fr 92px', gap: 10, alignItems: 'center', padding: '4px 0', fontSize: 12.5 }}>
      <span className="ellipsis" style={{ fontWeight: x.kind === 'total' ? 600 : 400 }} title={x.name}>{x.name}</span>
      <div style={{ position: 'relative', height: 14, background: 'var(--bg-2)', borderRadius: 3 }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${X(x.a)}%`, width: `${Math.max(0.8, X(x.b) - X(x.a))}%`, background: x.kind === 'total' ? p.c2 : (x.v > 0) === upBad ? p.bad : p.good, borderRadius: 3 }} />
        {zoom && x.kind === 'total' && <span style={{ position: 'absolute', left: 3, top: -2, fontSize: 11, color: 'var(--bg)', fontWeight: 700 }}>≈</span>}
      </div>
      <span className="num" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{x.kind === 'total' ? '' : x.v < 0 ? '−' : '+'}{fmtNum(Math.abs(x.v), dec)} {unit}</span>
    </div>))}
    {zoom && <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>≈ Axis starts at {fmtNum(base, dec)} {unit} so the steps are visible.</div>}
  </div>;
}

const Tip = ({ active, payload, label, unit, dec, xfmt }) => {
  if (!active || !payload?.length) return null;
  return <div className="tt"><div style={{ fontWeight: 600, marginBottom: 2 }}>{xfmt ? xfmt(label) : label}</div>
    {payload.filter(x => x.value != null).map(x => <div key={x.dataKey} className="row"><span className="dotc" style={{ background: x.color || x.stroke || x.fill }} />{x.name}: <b className="num">{fmtNum(x.value, dec)}{unit ? ' ' + unit : ''}</b></div>)}</div>;
};

/* control chart / limit trend: one series with spec limits (solid, status colour) and control limits (dashed, muted) */
export function LimitChart({ pts, name, unit, days, lsl, usl, ucl, lcl, mean, target, height = 230, color }) {
  const p = usePalette();
  const vals = pts.map(x => x.v).concat([lsl, usl, ucl, lcl, target].filter(x => x != null && Number.isFinite(x)));
  let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.01 || 1; lo -= pad; hi += pad;
  const dec = Math.min(4, decOf(hi - lo));
  const refs = [];
  if (usl != null) refs.push({ y: usl, label: `USL ${fmtNum(usl, dec)}`, c: p.bad });
  if (lsl != null) refs.push({ y: lsl, label: `LSL ${fmtNum(lsl, dec)}`, c: p.bad });
  if (ucl != null) refs.push({ y: ucl, label: 'UCL', c: p.axis, dash: true });
  if (lcl != null) refs.push({ y: lcl, label: 'LCL', c: p.axis, dash: true });
  if (mean != null) refs.push({ y: mean, label: 'mean', c: p.axis, dash: true });
  if (target != null) refs.push({ y: target, label: `target ${fmtNum(target, dec)}`, c: p.good, dash: true });
  return <ResponsiveContainer width="100%" height={height}>
    <ComposedChart data={pts} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
      <CartesianGrid stroke={p.grid} vertical={false} />
      <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={t => axisTime(t, days)} stroke={p.axis} tickLine={false} axisLine={false} minTickGap={40} fontSize={11} />
      <YAxis domain={[lo, hi]} allowDataOverflow stroke={p.axis} tickLine={false} axisLine={false} width={54} fontSize={11} tickFormatter={v => fmtNum(v, dec)} tickCount={5} />
      <Tooltip content={<Tip unit={unit} dec={dec} xfmt={t => fmtDateTime(t)} />} />
      {refs.map((x, i) => <ReferenceLine key={i} y={x.y} stroke={x.c} strokeDasharray={x.dash ? '4 3' : undefined} strokeOpacity={x.dash ? 0.8 : 1} label={{ value: x.label, position: 'insideTopRight', fontSize: 10, fill: x.c }} ifOverflow="extendDomain" />)}
      <Line dataKey="v" name={name} stroke={color || p.c1} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: p.bg }} isAnimationActive={false} />
    </ComposedChart>
  </ResponsiveContainer>;
}

/* histogram with spec limits */
export function Hist({ bins, lsl, usl, unit, height = 230 }) {
  const p = usePalette();
  const span = bins[bins.length - 1].x1 - bins[0].x0; const dec = Math.min(4, decOf(span));
  const data = bins.map(b => ({ x: (b.x0 + b.x1) / 2, n: b.n, out: (lsl != null && b.x1 <= lsl) || (usl != null && b.x0 >= usl) }));
  return <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 10, right: 8, left: -14, bottom: 0 }} barCategoryGap={1}>
      <CartesianGrid stroke={p.grid} vertical={false} />
      <XAxis dataKey="x" type="number" domain={[bins[0].x0, bins[bins.length - 1].x1]} tickFormatter={v => fmtNum(v, dec)} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} tickCount={5} />
      <YAxis stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} width={44} allowDecimals={false} />
      <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="tt"><b className="num">{fmtNum(payload[0].payload.x, dec)} {unit}</b><div>{payload[0].payload.n} hours</div></div> : null} cursor={{ fill: p.grid }} />
      {lsl != null && <ReferenceLine x={lsl} stroke={p.bad} label={{ value: 'LSL', position: 'insideTopLeft', fontSize: 10, fill: p.bad }} ifOverflow="extendDomain" />}
      {usl != null && <ReferenceLine x={usl} stroke={p.bad} label={{ value: 'USL', position: 'insideTopRight', fontSize: 10, fill: p.bad }} ifOverflow="extendDomain" />}
      <Bar dataKey="n" name="Hours" isAnimationActive={false} radius={[3, 3, 0, 0]}>{data.map((d, i) => <Cell key={i} fill={d.out ? p.bad : p.bar} />)}</Bar>
    </BarChart>
  </ResponsiveContainer>;
}

/* daily bars from zero with an optional target line (e.g. lost MWh per day) */
export function DayBars({ data, keys, unit, days, height = 220, target }) {
  const p = usePalette();
  return <ResponsiveContainer width="100%" height={height}>
    <ComposedChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid stroke={p.grid} vertical={false} />
      <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} padding={{ left: 12, right: 12 }} tickFormatter={t => axisTime(t, days)} stroke={p.axis} tickLine={false} axisLine={false} minTickGap={40} fontSize={11} />
      <YAxis domain={[0, 'auto']} stroke={p.axis} tickLine={false} axisLine={false} width={54} fontSize={11} tickFormatter={v => fmtNum(v, 0)} />
      <Tooltip content={<Tip unit={unit} dec={0} xfmt={t => fmtDateTime(t).split(',')[0]} />} cursor={{ fill: p.grid }} />
      {keys.length > 1 && <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11.5 }} />}
      {target != null && <ReferenceLine y={target} stroke={p.good} strokeDasharray="4 3" label={{ value: 'plan', position: 'insideBottomRight', fontSize: 10, fill: p.good }} />}
      {keys.map((k, i) => <Bar key={k.key} dataKey={k.key} name={k.name} stackId="s" fill={k.color || [p.c1, p.c3, p.c2][i]} maxBarSize={22} isAnimationActive={false} />)}
    </ComposedChart>
  </ResponsiveContainer>;
}

/* category bars (vertical, from zero) with a target line, colour by status */
export function CatBars({ data, unit, target, height = 220, better = 'up', dec = 1, domainMin = 0 }) {
  const p = usePalette();
  return <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 14, right: 8, left: -8, bottom: 0 }}>
      <CartesianGrid stroke={p.grid} vertical={false} />
      <XAxis dataKey="name" stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} interval={0} tick={{ fontSize: 10.5 }} />
      <YAxis domain={[domainMin, 'auto']} stroke={p.axis} tickLine={false} axisLine={false} width={48} fontSize={11} />
      <Tooltip content={<Tip unit={unit} dec={dec} />} cursor={{ fill: p.grid }} />
      {target != null && <ReferenceLine y={target} stroke={p.good} strokeDasharray="4 3" label={{ value: `target ${fmtNum(target, dec)}`, position: 'insideTopRight', fontSize: 10, fill: p.good }} />}
      <Bar dataKey="v" name="Value" isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={40}
        label={{ position: 'top', fontSize: 10.5, fill: p.axis, formatter: v => fmtNum(v, dec) }}>
        {data.map((d, i) => <Cell key={i} fill={target == null ? p.bar : (better === 'up' ? d.v >= target : d.v <= target) ? p.bar : p.warn} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>;
}

/* power curve: warranted vs measured */
export function CurveChart({ data, height = 240 }) {
  const p = usePalette();
  return <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
      <CartesianGrid stroke={p.grid} vertical={false} />
      <XAxis dataKey="ws" type="number" domain={[2, 16]} ticks={[2, 4, 6, 8, 10, 12, 14, 16]} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} unit=" m/s" />
      <YAxis stroke={p.axis} tickLine={false} axisLine={false} width={54} fontSize={11} tickFormatter={v => fmtNum(v, 0)} />
      <Tooltip content={<Tip unit="kW" dec={0} xfmt={l => `${l} m/s`} />} />
      <Legend iconType="plainline" wrapperStyle={{ fontSize: 11.5 }} />
      <Line dataKey="ref" name="Warranted curve" stroke={p.c2} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
      <Line dataKey="act" name="Measured (binned)" stroke={p.c1} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
    </LineChart>
  </ResponsiveContainer>;
}
