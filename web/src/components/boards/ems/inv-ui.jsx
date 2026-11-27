/* Chart and UI helpers for the EMS capex and tariff decision boards (ems-inv).
   Colours come from the theme chart palette and CSS tokens, so light and dark themes both work.
   Rules: bars from zero, one y-axis per chart, legend for 2+ series, tooltips on every mark. */
import React from 'react';
import { ResponsiveContainer, ComposedChart, ScatterChart, Scatter, Bar, Line, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Cell, LabelList } from 'recharts';
import { usePalette } from '../../charts.jsx';
import { fmtNum } from '../../../lib/data.js';
import { inr } from '../../../pages/dash/dash-en-ui.jsx';

export const INV_CSS = `
.inv-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 11.5px; color: var(--text-2); padding: 2px 0 6px; }
.inv-legend span { display: inline-flex; align-items: center; gap: 6px; }
.inv-legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.inv-legend i.ln { height: 0; border-top: 2px dashed; border-radius: 0; width: 14px; }
.inv-cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.inv-col { border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 14px; background: var(--bg); min-width: 0; }
.inv-col h4 { margin: 0 0 2px; font-size: 13.5px; font-weight: 650; display: flex; align-items: center; gap: 8px; }
.inv-col .big { font-family: var(--display); font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; margin: 4px 0 2px; }
.inv-col ul { margin: 8px 0 0; padding-left: 16px; font-size: 12.5px; line-height: 1.55; }
.inv-detail { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 18px; padding: 14px 16px; border-top: 1px solid var(--line); font-size: 12.5px; line-height: 1.5; }
.inv-detail h5 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); font-weight: 600; }
.inv-ev { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 12px; }
.inv-notes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 24px; font-size: 12.5px; }
.inv-notes div { display: flex; justify-content: space-between; gap: 12px; padding: 4px 0; border-bottom: 1px dashed var(--line); }
.inv-notes div span:last-child { font-variant-numeric: tabular-nums; text-align: right; }
.inv-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; flex: none; }
.inv-note { font-size: 12px; color: var(--muted); padding: 8px 16px 12px; line-height: 1.5; }
.inv-share { height: 6px; border-radius: 3px; background: var(--bg-3); overflow: hidden; min-width: 60px; }
.inv-share i { display: block; height: 100%; border-radius: 3px; }
@media (max-width: 1100px) { .inv-cols { grid-template-columns: 1fr; } .inv-detail, .inv-notes { grid-template-columns: 1fr; } }
`;
export const InvStyle = () => <style>{INV_CSS}</style>;

export const DEC_TONE = { now: 'good', pilot: 'warn', later: 'info' };
export const decColor = (p, d) => ({ now: p.good, pilot: p.warn, later: p.c3 || p.c2 }[d]);

const TT = ({ children }) => <div className="tt" style={{ maxWidth: 280 }}>{children}</div>;
const Row = ({ k, v }) => <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}><span className="muted">{k}</span><b className="num">{v}</b></div>;

/** Priority matrix: x = simple payback (yr, log), y = net saving ₹ L/yr, bubble = capex. */
export function PriorityMatrix({ rows, onPick, sel, height = 300 }) {
  const p = usePalette();
  const data = rows.map((r, i) => ({ ...r, x: Math.max(0.05, Math.min(12, r.pay)), y: r.saveL, z: r.capex, n: i + 1 }));
  const yMax = Math.ceil(Math.max(...data.map(d => d.y)) / 10) * 10 + 10;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 12, right: 16, left: 0, bottom: 14 }}>
        <CartesianGrid stroke={p.grid} />
        <ReferenceArea x1={0.05} x2={2.5} y1={15} y2={yMax} fill={p.good} fillOpacity={0.06} label={{ value: 'Quick wins', position: 'insideTopLeft', fontSize: 10.5, fill: p.axis }} />
        <ReferenceArea x1={2.5} x2={12} y1={15} y2={yMax} fill={p.c1} fillOpacity={0.04} label={{ value: 'Strategic', position: 'insideTopRight', fontSize: 10.5, fill: p.axis }} />
        <ReferenceArea x1={2.5} x2={12} y1={0} y2={15} fill={p.axis} fillOpacity={0.04} label={{ value: 'Defer', position: 'insideBottomRight', fontSize: 10.5, fill: p.axis }} />
        <XAxis type="number" dataKey="x" scale="log" domain={[0.05, 12]} ticks={[0.1, 0.25, 0.5, 1, 2.5, 5, 10]} tickFormatter={v => fmtNum(v, v < 1 ? 2 : 0)} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11}
          label={{ value: 'Simple payback, years (log scale)', position: 'insideBottom', offset: -8, fontSize: 11, fill: p.axis }} />
        <YAxis type="number" dataKey="y" domain={[0, yMax]} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} width={52} tickFormatter={v => `₹${v} L`} />
        <ZAxis type="number" dataKey="z" range={[60, 900]} />
        <ReferenceLine x={2.5} stroke={p.axis} strokeDasharray="3 3" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => active && payload?.length ? (() => { const d = payload[0].payload; return <TT><b>{d.n}. {d.name}</b><Row k="Saving" v={`${inr(d.saveL)}/yr`} /><Row k="Capex" v={inr(d.capex)} /><Row k="Payback" v={`${fmtNum(d.pay, 2)} yr`} /><Row k="tCO₂/yr" v={fmtNum(d.tco2, 0)} /></TT>; })() : null} />
        <Scatter data={data} isAnimationActive={false} onClick={d => onPick && onPick(d.id)} style={{ cursor: 'pointer' }}>
          {data.map(d => <Cell key={d.id} fill={decColor(p, d.decision)} fillOpacity={sel === d.id ? 0.95 : 0.6} stroke={sel === d.id ? p.c1 : p.bg} strokeWidth={sel === d.id ? 2.5 : 2} />)}
          <LabelList dataKey="n" position="center" fontSize={10} fill={p.bg} />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

/** Cumulative net saving vs cumulative capex, measures ordered by payback (best first). */
export function CumulativeCurve({ curve, budget, height = 300 }) {
  const p = usePalette();
  const data = curve.map((c, i) => ({ ...c, n: i }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 18, left: 0, bottom: 14 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis type="number" dataKey="capex" domain={[0, 'dataMax']} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} tickFormatter={v => (v >= 100 ? `₹${fmtNum(v / 100, 1)} Cr` : `₹${fmtNum(v, 0)} L`)}
          label={{ value: 'Cumulative capex', position: 'insideBottom', offset: -8, fontSize: 11, fill: p.axis }} />
        <YAxis type="number" domain={[0, 'auto']} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} width={56} tickFormatter={v => (v >= 100 ? `₹${fmtNum(v / 100, 1)} Cr` : `₹${fmtNum(v, 0)} L`)} />
        {budget != null && <ReferenceLine x={budget} stroke={p.good} strokeDasharray="4 3" label={{ value: 'Approve-now set', position: 'insideTopLeft', fontSize: 10, fill: p.good }} />}
        <Tooltip content={({ active, payload }) => active && payload?.length && payload[0].payload.id ? (() => { const d = payload[0].payload; return <TT><b>+ {d.name}</b><Row k="Cumulative capex" v={inr(d.capex)} /><Row k="Cumulative saving" v={`${inr(d.save)}/yr`} /></TT>; })() : null} />
        <Line type="linear" dataKey="save" name="Cumulative saving ₹/yr" stroke={p.c1} strokeWidth={2} isAnimationActive={false}
          dot={d => (d.payload.id ? <circle key={d.payload.id} cx={d.cx} cy={d.cy} r={4.5} fill={decColor(p, d.payload.decision)} stroke={p.bg} strokeWidth={2} /> : <circle key="o" cx={d.cx} cy={d.cy} r={0} />)} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Monthly MD vs contract demand; bars red where MD > CD. */
export function DemandChart({ months, cd, floor, height = 260 }) {
  const p = usePalette();
  const data = months.map(m => ({ label: m.label, md: m.md, exceed: m.md > cd, src: m.src, inPeriod: m.inPeriod, billing: Math.max(m.md, floor) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 14, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis dataKey="label" stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} interval={0} />
        <YAxis domain={[0, Math.ceil((cd + 600) / 500) * 500]} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} width={52} tickFormatter={v => fmtNum(v)} />
        <Tooltip cursor={{ fill: p.grid }} content={({ active, payload }) => active && payload?.length ? (() => { const d = payload[0].payload; return <TT><b>{d.label}</b>{d.src === 'bill' && <span className="muted"> · from bill</span>}<Row k="Max demand" v={`${fmtNum(d.md)} kVA`} /><Row k="Billing demand" v={`${fmtNum(d.billing)} kVA`} /><Row k="vs contract" v={`${d.md > cd ? '+' : ''}${fmtNum(d.md - cd)} kVA`} /></TT>; })() : null} />
        <ReferenceLine y={cd} stroke={p.bad} strokeDasharray="4 3" label={{ value: `Contract ${fmtNum(cd)} kVA`, position: 'insideTopRight', fontSize: 10.5, fill: p.bad }} />
        <ReferenceLine y={floor} stroke={p.axis} strokeDasharray="2 3" label={{ value: `75 % floor ${fmtNum(floor)} kVA`, position: 'insideBottomRight', fontSize: 10.5, fill: p.axis }} />
        <Bar dataKey="md" name="Max demand" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.exceed ? p.bad : p.c1} fillOpacity={d.src === 'bill' ? 0.55 : 0.9} />)}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Average load by hour of day, bars coloured by ToD slot. */
export function TodProfile({ profile, slots, height = 230 }) {
  const p = usePalette();
  const col = { A: p.good, B: p.c2, C: p.warn, D: p.bad };
  const nm = Object.fromEntries(slots.map(s => [s.id, s]));
  return (
    <>
      <div className="inv-legend">{slots.map(s => <span key={s.id}><i style={{ background: col[s.id], opacity: s.id === 'B' ? 0.6 : 0.85 }} />{s.name} · {s.rate > 0 ? '+' : s.rate < 0 ? '−' : '±'}₹{fmtNum(Math.abs(s.rate), 2)}</span>)}</div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={profile} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={p.grid} vertical={false} />
          <XAxis dataKey="label" stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} interval={2} />
          <YAxis domain={[0, 'auto']} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} width={52} tickFormatter={v => fmtNum(v)} />
          <Tooltip cursor={{ fill: p.grid }} content={({ active, payload }) => active && payload?.length ? (() => { const d = payload[0].payload; return <TT><b>{d.label}:00–{String((d.h + 1) % 24).padStart(2, '0')}:00</b><Row k="Average load" v={`${fmtNum(d.kw)} kW`} /><Row k="Slot" v={nm[d.slot].name} /></TT>; })() : null} />
          <Bar dataKey="kw" name="Average grid load" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false}>
            {profile.map(d => <Cell key={d.h} fill={col[d.slot]} fillOpacity={d.slot === 'B' ? 0.6 : 0.85} />)}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}

/** Monthly PF with incentive slab bands. */
export function PfChart({ months, slabs, height = 230 }) {
  const p = usePalette();
  const lo = Math.min(0.95, ...months.map(m => m.pf)) - 0.005;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={months} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        {slabs.map((s, i) => <ReferenceArea key={s.lo} y1={s.lo} y2={slabs[i + 1]?.lo ?? 1} fill={p.good} fillOpacity={0.03 + i * 0.03} label={{ value: `${fmtNum(s.pct, 1)} %`, position: 'insideRight', fontSize: 10, fill: p.axis }} />)}
        <XAxis dataKey="label" stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} interval={0} />
        <YAxis domain={[Math.floor(lo * 200) / 200, 1]} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} width={52} tickFormatter={v => fmtNum(v, 2)} />
        <Tooltip content={({ active, payload }) => active && payload?.length ? (() => { const d = payload[0].payload; return <TT><b>{d.label}</b><Row k="Average PF" v={fmtNum(d.pf, 3)} /><Row k="Incentive slab" v={`${fmtNum(d.pct, 1)} % of energy charge`} /><Row k="Incentive earned" v={inr(d.incL, 1)} /></TT>; })() : null} />
        <Line dataKey="pf" name="Monthly PF" stroke={p.c1} strokeWidth={2} isAnimationActive={false} dot={{ r: 3.5, fill: p.c1, stroke: p.bg, strokeWidth: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars of landed ₹/kWh, with a reference at grid cost. */
export function LandedBars({ items, refV, height = 170 }) {
  const p = usePalette();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={items} layout="vertical" margin={{ top: 6, right: 40, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} horizontal={false} />
        <XAxis type="number" domain={[0, 'auto']} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11} tickFormatter={v => `₹${v}`} />
        <YAxis type="category" dataKey="short" width={118} stroke={p.axis} tickLine={false} axisLine={false} fontSize={11.5} />
        <ReferenceLine x={refV} stroke={p.axis} strokeDasharray="4 3" />
        <Tooltip cursor={{ fill: p.grid }} content={({ active, payload }) => active && payload?.length ? <TT><b>{payload[0].payload.name}</b><Row k="Landed cost" v={`₹${fmtNum(payload[0].payload.landed, 2)}/kWh`} /></TT> : null} />
        <Bar dataKey="landed" radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false}>
          {items.map(d => <Cell key={d.id} fill={d.landed <= refV ? p.good : d.id === 'grid' ? p.c2 : p.warn} />)}
          <LabelList dataKey="landed" position="right" fontSize={11} fill={p.axis} formatter={v => fmtNum(v, 2)} />
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export const Share = ({ v, max = 1, color = 'var(--brand)' }) => <div className="inv-share"><i style={{ width: `${Math.max(0, Math.min(100, (Math.abs(v) / (max || 1)) * 100))}%`, background: color }} /></div>;
