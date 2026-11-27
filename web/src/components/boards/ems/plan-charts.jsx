/* Charts for the EMS supply plan and trend explorer (ems-plan). One y-axis per chart; bars from zero;
   limit lines dashed; ToD slots as background bands. Colours from the theme chart palette. */
import React from 'react';
import { ResponsiveContainer, ComposedChart, BarChart, LineChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Cell, LabelList } from 'recharts';
import { usePalette } from '../../charts.jsx';
import { fmtNum, fmtDateTime, axisTime } from '../../../lib/data.js';
import { hh } from './plan-ui.jsx';

const H = 36e5;
const nf = v => (v == null ? '—' : fmtNum(v, Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0));

/** ToD slot background colour and opacity. */
export const slotFill = (p, id) => ({ A: [p.c3, 0.07], B: [null, 0], C: [p.warn, 0.08], D: [p.bad, 0.08] }[id]);

function Tip({ active, payload, label, rows, title }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="tt">
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{title ? title(d, label) : fmtDateTime(label)}</div>
      {rows(d).filter(r => r && r.v != null).map(r => <div key={r.n} className="row"><span className="dotc" style={{ background: r.c }} />{r.n}: <b className="num">{nf(r.v)}{r.u ? ' ' + r.u : ''}</b></div>)}
    </div>
  );
}

/** 48 h forecast: P10–P90 band, demand, solar, grid import (forecast and with plan), ToD bands, 90 % alert and contract lines. */
export function ForecastChart({ plan, height = 300 }) {
  const p = usePalette();
  const pf = plan.pf;
  const data = plan.hours.map(x => ({ t: x.t, slot: x.slot, rate: x.rate, band: [x.lo / pf, x.hi / pf], demand: x.demand / pf, solar: x.solar, grid: x.kva15, plan: x.day === 0 ? x.kva15Plan : null }));
  const bands = []; let cur = null;
  data.forEach((d, i) => { if (!cur || cur.slot !== d.slot) { cur = { slot: d.slot, x1: d.t, x2: d.t + H }; bands.push(cur); } else cur.x2 = d.t + H; if (i === data.length - 1) cur.x2 = d.t + H; });
  const yMax = Math.ceil(Math.max(plan.contractKva, ...data.map(d => d.band[1])) / 1000) * 1000 + 500;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 14, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        {bands.map((b, i) => { const [c, o] = slotFill(p, b.slot); return c ? <ReferenceArea key={i} x1={b.x1} x2={b.x2 - 1} y1={0} y2={yMax} fill={c} fillOpacity={o} ifOverflow="hidden" /> : null; })}
        <XAxis dataKey="t" type="number" scale="time" domain={[data[0].t, data[data.length - 1].t + H]} ticks={data.filter((d, i) => i % 6 === 0).map(d => d.t).concat(data[data.length - 1].t + H)} tickFormatter={t => { const h = new Date(t).getHours(); return h === 0 ? axisTime(t, 7) : hh(h); }} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} />
        <YAxis domain={[0, yMax]} stroke={p.axis} tickLine={false} axisLine={false} width={54} fontSize={11} tickFormatter={v => (v === 0 ? '0' : fmtNum(v))} />
        <Tooltip content={<Tip rows={d => [
          { n: 'Site demand', v: d.demand, u: 'kVA', c: p.c2 }, { n: 'P10–P90', v: null }, { n: 'Rooftop solar', v: d.solar, u: 'kW', c: p.c4 },
          { n: 'Grid, 15-min peak (forecast)', v: d.grid, u: 'kVA', c: p.c1 }, d.plan != null && { n: 'Grid with plan', v: d.plan, u: 'kVA', c: p.c1 }, { n: `Tariff (slot ${d.slot})`, v: d.rate, u: '₹/kWh', c: p.axis }]} />} />
        <Area dataKey="band" stroke="none" fill={p.c2} fillOpacity={0.12} isAnimationActive={false} activeDot={false} />
        <Area dataKey="solar" name="Rooftop solar" stroke={p.c4} fill={p.c4} fillOpacity={0.18} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        <Line dataKey="demand" name="Site demand" stroke={p.c2} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        <Line dataKey="grid" name="Grid forecast" stroke={p.c1} strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
        <Line dataKey="plan" name="Grid with plan" stroke={p.c1} strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
        <ReferenceLine y={plan.alertKva} stroke={p.warn} strokeDasharray="4 3" label={{ value: `90 % alert ${fmtNum(plan.alertKva)} kVA`, position: 'insideTopLeft', fontSize: 10.5, fill: p.warn }} />
        <ReferenceLine y={plan.contractKva} stroke={p.bad} strokeDasharray="4 3" label={{ value: `Contract ${fmtNum(plan.contractKva)} kVA`, position: 'insideTopLeft', fontSize: 10.5, fill: p.bad }} />
        <ReferenceLine x={plan.start + 24 * H} stroke={p.axis} strokeDasharray="2 3" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Peak bridge: forecast 15-min peak → each action → planned peak, with the alert and contract lines. */
export function PeakBridge({ plan, height = 260 }) {
  const p = usePalette();
  let run = plan.peak.kva15;
  const data = [{ name: 'Forecast peak', base: 0, v: run, kind: 'total', lab: fmtNum(run, 0) }];
  plan.peakActions.filter(a => a.kva > 0).forEach(a => { run -= a.kva; data.push({ name: a.short, base: run, v: a.kva, kind: 'down', lab: `−${fmtNum(a.kva, 0)}` }); });
  const moved = plan.peakPlan.kva15 - run;
  if (Math.abs(moved) >= 5) { data.push({ name: `Peak moves to ${hh(plan.peakPlan.h)}`, base: moved > 0 ? run : run + moved, v: Math.abs(moved), kind: moved > 0 ? 'up' : 'down', lab: (moved > 0 ? '+' : '−') + fmtNum(Math.abs(moved), 0) }); run += moved; }
  data.push({ name: 'Planned peak', base: 0, v: plan.peakPlan.kva15, kind: 'total', lab: fmtNum(plan.peakPlan.kva15, 0) });
  const lo = Math.floor((Math.min(...data.map(d => d.base || d.v)) - 250) / 250) * 250;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 18, right: 58, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis dataKey="name" stroke={p.axis} tickLine={false} axisLine={false} fontSize={10.5} interval={0} height={44} tick={<WrapTick fill={p.axis} />} />
        <YAxis domain={[lo, Math.max(plan.contractKva + 200, plan.peak.kva15 + 150)]} allowDataOverflow stroke={p.axis} tickLine={false} axisLine={false} width={50} fontSize={11} tickFormatter={v => fmtNum(v)} />
        <Tooltip cursor={{ fill: p.grid }} content={({ active, payload }) => active && payload?.length ? <div className="tt"><b>{payload[0].payload.name}</b><div className="num">{payload[0].payload.lab} kVA</div></div> : null} />
        <ReferenceLine y={plan.alertKva} stroke={p.warn} strokeDasharray="4 3" label={{ value: '90 % alert', position: 'right', fontSize: 10.5, fill: p.warn }} />
        <ReferenceLine y={plan.contractKva} stroke={p.bad} strokeDasharray="4 3" label={{ value: 'Contract', position: 'right', fontSize: 10.5, fill: p.bad }} />
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="v" stackId="w" isAnimationActive={false} radius={[3, 3, 0, 0]} maxBarSize={44}>
          {data.map((d, i) => <Cell key={i} fill={d.kind === 'total' ? p.c2 : d.kind === 'up' ? p.warn : p.c1} />)}
          <LabelList dataKey="lab" position="top" fontSize={10.5} fill={p.axis} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
function WrapTick({ x, y, payload, fill }) {
  const words = String(payload.value).split(' '); const lines = []; let cur = '';
  words.forEach(w => { if ((cur + ' ' + w).trim().length > 12) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lines.push(cur);
  return <text x={x} y={y + 10} textAnchor="middle" fontSize={10.5} fill={fill}>{lines.slice(0, 3).map((l, i) => <tspan key={i} x={x} dy={i ? 12 : 0}>{l}</tspan>)}</text>;
}

/** Steam plan for tomorrow: stacked biomass + gas t/h by hour, with today's split for reference. */
export function SteamChart({ hours, height = 220 }) {
  const p = usePalette();
  const data = hours.map(x => ({ h: hh(x.h), bio: x.bio, gas: x.gas, now: x.bioNow }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis dataKey="h" stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} interval={3} />
        <YAxis domain={[0, 'auto']} stroke={p.axis} tickLine={false} axisLine={false} width={40} fontSize={11} />
        <Tooltip cursor={{ fill: p.grid }} content={<Tip title={d => d.h} rows={d => [{ n: 'BLR-02 biomass', v: d.bio, u: 't/h', c: p.c4 }, { n: 'BLR-01 gas', v: d.gas, u: 't/h', c: p.c1 }, { n: 'Biomass at today’s split', v: d.now, u: 't/h', c: p.c2 }]} />} />
        <Bar dataKey="bio" stackId="s" fill={p.c4} isAnimationActive={false} maxBarSize={18} />
        <Bar dataKey="gas" stackId="s" fill={p.c1} radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={18} />
        <Line dataKey="now" stroke={p.c2} strokeDasharray="4 3" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Yesterday: hourly demand forecast vs actual (kW). */
export function BacktestChart({ bt, height = 220 }) {
  const p = usePalette();
  const data = bt.pts.map(x => ({ t: x.t, fc: x.fc, act: x.act }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={t => hh(new Date(t).getHours())} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} minTickGap={30} />
        <YAxis domain={['auto', 'auto']} stroke={p.axis} tickLine={false} axisLine={false} width={50} fontSize={11} tickFormatter={v => fmtNum(v)} />
        <Tooltip content={<Tip rows={d => [{ n: 'Forecast', v: d.fc, u: 'kW', c: p.c2 }, { n: 'Actual', v: d.act, u: 'kW', c: p.c1 }, { n: 'Error', v: ((d.fc - d.act) / d.act) * 100, u: '%', c: p.axis }]} />} />
        <Line dataKey="fc" stroke={p.c2} strokeDasharray="5 3" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        <Line dataKey="act" stroke={p.c1} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Daily MAPE bars with the target line. */
export function MapeBars({ rows, target = 5, height = 220, days }) {
  const p = usePalette();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 12, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis dataKey="t" type="category" tickFormatter={t => axisTime(t, 7)} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} minTickGap={24} />
        <YAxis domain={[0, Math.max(target + 1, ...rows.map(r => r.mape))]} stroke={p.axis} tickLine={false} axisLine={false} width={40} fontSize={11} tickFormatter={v => `${v}`} />
        <Tooltip cursor={{ fill: p.grid }} content={<Tip title={d => fmtDateTime(d.t).split(',')[0]} rows={d => [{ n: 'MAPE', v: d.mape, u: '%', c: p.bar }, { n: 'Peak error', v: d.peakErr, u: '%', c: p.axis }]} />} />
        <ReferenceLine y={target} stroke={p.good} strokeDasharray="4 3" label={{ value: `Target ${target} %`, position: 'insideTopRight', fontSize: 10.5, fill: p.good }} />
        <Bar dataKey="mape" isAnimationActive={false} radius={[3, 3, 0, 0]} maxBarSize={days > 60 ? 6 : 18}>
          {rows.map((r, i) => <Cell key={i} fill={r.mape > target ? p.bad : p.bar} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** One or more series on one y-axis (trend explorer). series: [{key, name, color}], events: [{t, label}] */
export function MultiLine({ data, series, height = 320, days = 7, refs = [], events = [], unit, yDomain }) {
  const p = usePalette();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 14, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={t => axisTime(t, days)} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} minTickGap={40} />
        <YAxis domain={yDomain || ['auto', 'auto']} stroke={p.axis} tickLine={false} axisLine={false} width={52} fontSize={11} tickFormatter={v => nf(v)} />
        <Tooltip content={<Tip title={(d, l) => fmtDateTime(l)} rows={d => series.map(s => ({ n: s.name, v: d[s.key], u: s.unit ?? unit, c: s.color }))} />} />
        {refs.map((r, i) => <ReferenceLine key={i} y={r.y} stroke={r.color || p.bad} strokeDasharray="4 3" ifOverflow="extendDomain" label={r.label ? { value: r.label, position: 'insideTopRight', fontSize: 10, fill: r.color || p.bad } : undefined} />)}
        {events.map((e, i) => <ReferenceLine key={'e' + i} x={e.t} stroke={e.color || p.warn} strokeDasharray="2 2" label={{ value: e.label, position: 'insideTopLeft', fontSize: 10, fill: e.color || p.warn }} />)}
        {series.map(s => <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={series.length > 1 ? 1.6 : 2} dot={false} connectNulls activeDot={{ r: 3.5, strokeWidth: 2, stroke: p.bg }} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}
