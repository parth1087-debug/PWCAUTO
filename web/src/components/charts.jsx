import React from 'react';
import { ResponsiveContainer, ComposedChart, LineChart, Line, Area, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Cell, PieChart, Pie } from 'recharts';
import { useApp } from '../App.jsx';
import { themeOf } from '../lib/themes.js';
import { axisTime, fmtNum, fmtDateTime } from '../lib/data.js';

export function usePalette() {
  const { theme } = useApp();
  return themeOf(theme).chart;
}

const Tip = ({ active, payload, label, unit, days, labelFmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tt">
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{labelFmt ? labelFmt(label) : typeof label === 'number' ? (days != null && days <= 2 ? fmtDateTime(label) : fmtDateTime(label).split(',')[0]) : label}</div>
      {payload.filter(p => p.value != null && p.dataKey !== 'base').map(p => <div key={p.dataKey} className="row"><span className="dotc" style={{ background: p.color || p.stroke || p.fill }} />{p.name}: <b className="num">{fmtNum(p.value, Math.abs(p.value) < 10 ? 2 : 1)}{unit ? ' ' + unit : ''}</b></div>)}
    </div>
  );
};

/** Time series. data: [{t, ...keys}]. series: [{key, name, color, type: line|area|bar, dash}] */
export function Trend({ data, series, unit, days = 7, height = 220, refs = [], xRefs = [], bands = [], yDomain, xKey = 't', categorical }) {
  const p = usePalette();
  const hasBar = series.some(s => s.type === 'bar'); /* bars always start from zero and keep clear of the axis */
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>{series.filter(s => s.type === 'area').map(s => <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color || p.c1} stopOpacity={0.22} /><stop offset="100%" stopColor={s.color || p.c1} stopOpacity={0.01} /></linearGradient>)}</defs>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis dataKey={xKey} type={categorical ? 'category' : 'number'} scale={categorical ? 'band' : 'time'} domain={['dataMin', 'dataMax']} padding={hasBar && !categorical ? { left: 18, right: 18 } : undefined} tickFormatter={categorical ? undefined : t => axisTime(t, days)} stroke={p.axis} tickLine={false} axisLine={false} minTickGap={36} fontSize={11} />
        <YAxis stroke={p.axis} tickLine={false} axisLine={false} width={60} fontSize={11} domain={yDomain || (hasBar ? [0, 'auto'] : ['auto', 'auto'])} tickFormatter={v => (v === 0 ? '0' : fmtNum(v, Math.abs(v) < 10 ? 1 : 0))} />
        <Tooltip content={<Tip unit={unit} days={days} />} />
        {bands.map((b, i) => <ReferenceArea key={i} x1={b.x1} x2={b.x2} y1={b.y1} y2={b.y2} fill={b.color || p.c5} fillOpacity={b.opacity || 0.08} label={b.label ? { value: b.label, position: 'insideTopLeft', fontSize: 10, fill: p.axis } : undefined} />)}
        {refs.map((r, i) => <ReferenceLine key={i} y={r.y} stroke={r.color || p.bad} strokeDasharray={r.solid ? undefined : '4 3'} label={{ value: r.label, position: 'insideTopRight', fontSize: 10, fill: r.color || p.bad }} />)}
        {xRefs.map((r, i) => <ReferenceLine key={'x' + i} x={r.x} stroke={p.c1} strokeDasharray="2 2" label={{ value: r.label, position: 'insideTopLeft', fontSize: 10, fill: p.c1 }} />)}
        {series.map(s => s.type === 'bar'
          ? <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color || p.bar} radius={[4, 4, 0, 0]} maxBarSize={26} stackId={s.stack} isAnimationActive={false} />
          : s.type === 'area'
            ? <Area key={s.key} dataKey={s.key} name={s.name} stroke={s.color || p.c1} fill={`url(#g-${s.key})`} fillOpacity={1} strokeWidth={2} dot={false} activeDot={{ r: 3.5, strokeWidth: 2, stroke: p.bg }} isAnimationActive={false} />
            : <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color || p.c1} strokeWidth={s.width || 2} strokeDasharray={s.dash} dot={false} activeDot={{ r: 3.5, strokeWidth: 2, stroke: p.bg }} isAnimationActive={false} />)}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Category bars: data [{name, ...keys}] */
export function Bars({ data, series, unit, height = 220, stacked, refs = [], horizontal, colorFn }) {
  const p = usePalette();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 12, left: horizontal ? 8 : -8, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={!!horizontal} horizontal={!horizontal} />
        {horizontal
          ? <><XAxis type="number" stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} /><YAxis type="category" dataKey="name" width={130} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11.5} /></>
          : <><XAxis dataKey="name" stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} interval={0} /><YAxis stroke={p.axis} tickLine={false} axisLine={false} width={52} fontSize={11} /></>}
        <Tooltip content={<Tip unit={unit} labelFmt={l => l} />} cursor={{ fill: p.grid }} />
        {refs.map((r, i) => <ReferenceLine key={i} y={r.y} stroke={r.color || p.good} strokeDasharray="4 3" label={{ value: r.label, position: 'insideTopRight', fontSize: 10, fill: r.color || p.good }} />)}
        {series.map((s, si) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} stackId={stacked ? 'a' : undefined} fill={s.color || p.bar} radius={stacked ? 0 : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 16 : 34} isAnimationActive={false}>
            {colorFn && data.map((d, i) => <Cell key={i} fill={colorFn(d, si) || s.color || p.bar} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Waterfall({ start, steps, startLabel = 'Budget', endLabel = 'Actual', unit, height = 230 }) {
  const p = usePalette();
  let run = start;
  const data = [{ name: startLabel, base: 0, v: start, kind: 'total' }];
  steps.forEach(([name, d]) => { data.push({ name, base: d >= 0 ? run : run + d, v: Math.abs(d), d, kind: d >= 0 ? 'up' : 'down' }); run += d; });
  data.push({ name: endLabel, base: 0, v: run, kind: 'total' });
  const min = Math.min(start, run) * 0.9;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis dataKey="name" stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} interval={0} />
        <YAxis stroke={p.axis} tickLine={false} axisLine={false} width={52} fontSize={11} domain={[Math.floor(min), 'auto']} allowDataOverflow />
        <Tooltip content={({ active, payload }) => active && payload?.length ? <div className="tt"><b>{payload[0].payload.name}</b><div className="num">{payload[0].payload.kind === 'total' ? fmtNum(payload[0].payload.v) : (payload[0].payload.d > 0 ? '+' : '') + fmtNum(payload[0].payload.d)} {unit}</div></div> : null} cursor={{ fill: p.grid }} />
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="v" stackId="w" isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={44}
          label={{ position: 'top', fontSize: 10.5, fill: p.axis, formatter: v => fmtNum(v) }}>
          {data.map((d, i) => <Cell key={i} fill={d.kind === 'total' ? p.c2 : d.kind === 'up' ? p.bad : p.good} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ items, center, sub, height = 180 }) {
  const p = usePalette();
  const colors = [p.c1, p.c3, p.c2, p.c4, p.c6, p.c5];
  const total = items.reduce((a, b) => a + b.value, 0);
  return (
    <div className="row" style={{ gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ width: height, height, position: 'relative', flex: 'none' }}>
        <ResponsiveContainer><PieChart><Pie data={items} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="96%" stroke={p.bg} strokeWidth={2} paddingAngle={1} isAnimationActive={false}>
          {items.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie></PieChart></ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}><div><div style={{ fontSize: 22, fontWeight: 650, letterSpacing: '-.02em' }}>{center}</div><div className="muted" style={{ fontSize: 11 }}>{sub}</div></div></div>
      </div>
      <div className="grow" style={{ minWidth: 160 }}>{items.map((it, i) => (
        <div key={it.name} className="row" style={{ padding: '3px 0', fontSize: 12.5 }}><span className="dotc" style={{ background: colors[i % colors.length], borderRadius: 2 }} /><span className="grow ellipsis">{it.name}</span><span className="num">{it.display ?? fmtNum(it.value)}</span><span className="muted num" style={{ width: 38, textAlign: 'right' }}>{Math.round((it.value / total) * 100)}%</span></div>))}</div>
    </div>
  );
}

export function Spark({ data, color, height = 26 }) {
  const p = usePalette();
  return (
    <div style={{ height, marginTop: 4 }}>
      <ResponsiveContainer><LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}><Line dataKey="v" stroke={color || p.spark} strokeWidth={1.5} dot={false} isAnimationActive={false} /><YAxis hide domain={['auto', 'auto']} /></LineChart></ResponsiveContainer>
    </div>
  );
}

/** Weekday x hour heatmap */
export function Heat({ rows, cols, values, unit }) {
  const p = usePalette();
  const flat = values.flat(); const mn = Math.min(...flat), mx = Math.max(...flat);
  return (
    <div className="heat" style={{ gridTemplateColumns: `34px repeat(${cols.length}, 1fr)` }}>
      {rows.map((r, ri) => <React.Fragment key={r}><div style={{ alignSelf: 'center' }}>{r}</div>
        {values[ri].map((v, ci) => <div key={ci} className="c" title={`${r} ${cols[ci]}: ${fmtNum(v)} ${unit}`} style={{ background: p.c1, opacity: 0.08 + 0.92 * ((v - mn) / (mx - mn || 1)) }} />)}</React.Fragment>)}
      <div />{cols.map((c, i) => <div key={i} style={{ textAlign: 'center' }}>{i % 3 === 0 ? c : ''}</div>)}
    </div>
  );
}

export function BarList({ items, unit, color }) {
  const p = usePalette();
  const mx = Math.max(...items.map(i => i.value));
  return <div>{items.map(i => (
    <div key={i.name} className="row" style={{ padding: '5px 0', fontSize: 12.5 }}>
      <span className="ellipsis" style={{ width: 150, flex: 'none' }}>{i.name}</span>
      <div className="grow" style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${(i.value / mx) * 100}%`, height: '100%', background: i.color || color || p.bar, borderRadius: 4 }} /></div>
      <span className="num" style={{ width: 70, textAlign: 'right' }}>{fmtNum(i.value)}{unit ? ' ' + unit : ''}</span>
    </div>))}</div>;
}
