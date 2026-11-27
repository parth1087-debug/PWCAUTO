/* Mimic kit: SVG primitives for SCADA-style process and asset views (ISA-101 high-performance HMI style).
   Grey equipment, muted pipes, colour only for state (running, warning, alarm). Every value is bound to a plant tag
   (asset id + tag key) and refreshes on the 10-second live tick. Click any equipment or value to inspect the asset.

   Usage:
     <Mimic c={c} w={1200} h={640}>
       <Pipe pts={[[100,200],[300,200]]} kind="water" />
       <Equip a="KL-01" x={300} y={160} w={400} h={80} label="Rotary kiln"><Kiln x={300} y={160} len={400} dia={80} /></Equip>
       <Val a="KL-01" t="shell_temp" x={420} y={260} label="Shell" />
     </Mimic>
*/
import React, { createContext, useContext, useMemo, useState } from 'react';
import { X, Box as BoxIcon, Sparkles } from 'lucide-react';
import { useApp } from '../App.jsx';
import { fmtNum } from '../lib/data.js';

const D = 864e5;
const Ctx = createContext(null);
export const useMimic = () => useContext(Ctx);

/** 'good' | 'warn' | 'bad' from a tag's limits. */
export function stateOf(def, v) {
  if (!def || v == null) return 'good';
  const hi = def.hi, lo = def.lo;
  if ((hi != null && v > hi) || (lo != null && lo !== 0 && v < lo)) return 'bad';
  if ((hi != null && v > hi - Math.abs(hi) * 0.06) || (lo != null && lo !== 0 && v < lo + Math.abs(lo) * 0.04)) return 'warn';
  return 'good';
}

/** Live value of one tag: { v, def, st, unit }. Missing asset or tag gives v = null.
    Inside <Mimic> call useLive(a, t); in the drawing component before <Mimic> pass the plant: useLive(a, t, c). */
export function useLive(a, t, c) {
  const m = useMimic(); const { tick } = useApp();
  return useMemo(() => {
    if (m) return m.read(a, t);
    if (!c || !c.db.assetById[a]) return { v: null, def: null, st: 'good', unit: '' };
    const def = c.db.tagDef(a, t); const v = def ? c.db.live(a, t, tick) : null;
    return { v, def, st: stateOf(def, v), unit: def?.unit || '' };
  }, [m, a, t, c, tick]); // eslint-disable-line
}
/** Worst state across an asset's tags (for equipment colour). */
export function useAssetState(a) {
  const m = useMimic();
  return useMemo(() => m.assetState(a), [m, a, m.tick]); // eslint-disable-line
}

/* ---------------- container ---------------- */
export function Mimic({ c, w = 1200, h = 640, children, legend = true, note }) {
  const app = useApp();
  const [sel, setSel] = useState(null);
  const tick = app.tick;
  const m = useMemo(() => {
    const has = a => !!c.db.assetById[a];
    const read = (a, t) => {
      if (!has(a)) return { v: null, def: null, st: 'good', unit: '' };
      const def = c.db.tagDef(a, t); if (!def) return { v: null, def: null, st: 'good', unit: '' };
      const v = c.db.live(a, t, tick);
      return { v, def, st: stateOf(def, v), unit: def.unit };
    };
    const assetState = a => {
      if (!has(a)) return 'off';
      const tags = c.demo.classes[c.db.assetById[a].cls].tags.map(x => x[0]);
      const s = tags.map(t => read(a, t).st);
      return s.includes('bad') ? 'bad' : s.includes('warn') ? 'warn' : 'good';
    };
    return { c, tick, read, assetState, has, sel, select: a => has(a) && setSel(a) };
  }, [c, tick, sel]);
  return (
    <Ctx.Provider value={m}>
      <div className="mimic">
        <div className="mimic-stage">
          <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Process view" preserveAspectRatio="xMidYMid meet">
            <Defs />
            <rect x="0" y="0" width={w} height={h} className="m-bg" />
            {children}
          </svg>
        </div>
        {legend && <div className="mimic-legend"><span><i className="lg run" />Running</span><span><i className="lg warn" />Near limit</span><span><i className="lg bad" />Alarm</span><span><i className="lg stop" />Stopped</span><span className="muted">Click any equipment or value for details{note ? ` · ${note}` : ''}</span></div>}
        {sel && <Inspector a={sel} close={() => setSel(null)} />}
      </div>
    </Ctx.Provider>
  );
}

function Defs() {
  return <defs>
    <pattern id="m-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" className="m-gridline" /></pattern>
    <linearGradient id="m-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="m-metal-1" /><stop offset=".5" className="m-metal-2" /><stop offset="1" className="m-metal-3" /></linearGradient>
    <linearGradient id="m-metal-h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" className="m-metal-3" /><stop offset=".5" className="m-metal-2" /><stop offset="1" className="m-metal-3" /></linearGradient>
    <linearGradient id="m-hot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f59e0b" /><stop offset=".6" stopColor="#ef4444" /><stop offset="1" stopColor="#fde68a" /></linearGradient>
    <linearGradient id="m-flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#f97316" /><stop offset="1" stopColor="#fde047" stopOpacity=".2" /></linearGradient>
    <linearGradient id="m-liquid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#60a5fa" stopOpacity=".75" /><stop offset="1" stopColor="#2563eb" stopOpacity=".75" /></linearGradient>
    <linearGradient id="m-solar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1e3a8a" /><stop offset="1" stopColor="#3b82f6" /></linearGradient>
    <marker id="m-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" className="m-arrowhead" /></marker>
  </defs>;
}

/* ---------------- inspector (side drawer) ---------------- */
function Inspector({ a, close }) {
  const app = useApp(); const m = useMimic(); const { c } = m;
  const asset = c.db.assetById[a]; const h = c.db.health(a);
  const tags = c.demo.classes[asset.cls].tags.map(t => t[0]);
  const ev = (c.demo.events || []).find(e => e.asset === a && e.title);
  return (
    <aside className="mimic-insp" role="dialog" aria-label={`${a} details`}>
      <div className="row"><span className={`dot-s ${m.assetState(a)}`} /><b className="mono">{a}</b><button className="ibtn right" onClick={close} aria-label="Close"><X size={15} /></button></div>
      <div style={{ fontWeight: 600, margin: '2px 0' }}>{asset.name}</div>
      <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>{c.demo.classes[asset.cls].label} · {asset.line.name} · health {h.health} · {h.rulDays} d life left</div>
      {ev && <div className="mi-ev"><b>{ev.title}</b><span>{ev.diagnosis?.reco}</span></div>}
      <table className="t"><tbody>{tags.map(t => { const r = m.read(a, t); return <tr key={t}><td className="muted" style={{ fontSize: 12 }}>{r.def.name}</td><td className={`r num lv-v ${r.st}`} key={m.tick}>{fmtNum(r.v)} <small>{r.unit}</small></td></tr>; })}</tbody></table>
      <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <button className="btn sm pri" onClick={() => app.nav(`artefactory/${c.demo.id}-twin/${a}`)}><BoxIcon />Asset twin</button>
        <button className="btn sm" onClick={() => app.openPanel({ kind: 'card', title: `${a} · ${asset.name}`, summary: [`${asset.name}: health ${h.health}, ${h.state}.`, ev ? ev.diagnosis.reco : ''] })}><Sparkles />Ask</button>
      </div>
    </aside>
  );
}

/* ---------------- binding wrappers ---------------- */
/** Clickable equipment group. Colours its outline by the asset's state; dims when the asset is stopped. */
export function Equip({ a, x, y, w, h, label, sub, children, labelPos = 'below', noId }) {
  const m = useMimic(); const st = a ? m.assetState(a) : 'good';
  const on = m.sel === a;
  const ly = labelPos === 'above' ? y - 8 : y + h + 15;
  return (
    <g className={`m-eq ${st} ${on ? 'sel' : ''}`} onClick={e => { e.stopPropagation(); a && m.select(a); }} role={a ? 'button' : undefined} tabIndex={a ? 0 : undefined}
      onKeyDown={e => (e.key === 'Enter' ? m.select(a) : null)}>
      {children}
      {(st === 'bad' || st === 'warn' || on) && <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx="6" className={`m-ring ${on ? 'sel' : st}`} />}
      {label && <text x={x + w / 2} y={ly} className="m-label" textAnchor="middle">{label}</text>}
      {sub && <text x={x + w / 2} y={ly + 13} className="m-sub" textAnchor="middle">{sub}</text>}
      {a && !noId && <text x={x + w / 2} y={labelPos === 'above' ? y + h + 13 : y - 6} className="m-id" textAnchor="middle">{a}</text>}
    </g>
  );
}

/** Live value tag: small label, value and unit in a box, coloured by state. Width auto from text. */
export function Val({ a, t, x, y, label, w = 104, anchor = 'start', big, dec }) {
  const m = useMimic(); const r = m.read(a, t);
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const hgt = big ? 46 : 36;
  const v = r.v == null ? '—' : dec != null ? r.v.toFixed(dec) : fmtNum(r.v);
  return (
    <g className={`m-val ${r.st}`} onClick={e => { e.stopPropagation(); m.select(a); }} role="button">
      <rect x={x0} y={y} width={w} height={hgt} rx="4" />
      <text x={x0 + 7} y={y + 12} className="m-val-l">{label || r.def?.name || t}</text>
      <text x={x0 + 7} y={y + (big ? 36 : 29)} className={`m-val-v ${big ? 'big' : ''}`} key={m.tick}>{v}<tspan className="m-val-u"> {r.unit}</tspan></text>
    </g>
  );
}

/** Plain text label. */
export const Lbl = ({ x, y, children, size = 11, anchor = 'start', muted, bold }) => <text x={x} y={y} textAnchor={anchor} className={`m-text ${muted ? 'muted' : ''}`} style={{ fontSize: size, fontWeight: bold ? 650 : 400 }}>{children}</text>;
/** Section title in the drawing (area name). */
export const Title = ({ x, y, children }) => <text x={x} y={y} className="m-title">{children}</text>;
/** Dashed boundary around an area. */
export const Zone = ({ x, y, w, h, label }) => <g><rect x={x} y={y} width={w} height={h} rx="10" className="m-zone" />{label && <text x={x + 10} y={y + 16} className="m-zone-l">{label}</text>}</g>;

/* ---------------- pipes and lines ---------------- */
const KIND = { process: 'proc', material: 'mat', water: 'water', chw: 'chw', cw: 'cw', steam: 'steam', condensate: 'cond', air: 'air', gas: 'gas', oil: 'oil', flue: 'flue', power: 'power', hv: 'hv', signal: 'sig', hot: 'hot' };
/** A pipe or cable. pts: [[x,y], …] (polyline) or d (path). flow animates the direction of flow; speed 0.5–3. */
export function Pipe({ pts, d, kind = 'process', w, flow = true, speed = 1, arrow, dashed }) {
  const path = d || 'M' + pts.map(p => p.join(' ')).join(' L');
  const k = KIND[kind] || 'proc';
  const sw = w || (kind === 'power' || kind === 'hv' ? 3 : kind === 'signal' ? 1.2 : 6);
  return <g className={`m-pipe ${k}`}>
    <path d={path} className="m-pipe-o" strokeWidth={sw + 2} />
    <path d={path} className="m-pipe-i" strokeWidth={sw} markerEnd={arrow ? 'url(#m-arrow)' : undefined} strokeDasharray={dashed ? '6 5' : undefined} />
    {flow && kind !== 'power' && kind !== 'hv' && kind !== 'signal' && <path d={path} className="m-flow" strokeWidth={Math.max(1.5, sw * 0.35)} style={{ animationDuration: `${1.6 / speed}s` }} />}
    {flow && (kind === 'power' || kind === 'hv') && <path d={path} className="m-flow pw" strokeWidth={sw * 0.6} style={{ animationDuration: `${2 / speed}s` }} />}
  </g>;
}

/* ---------------- generic equipment ---------------- */
/** Vertical tank / silo / receiver with level (0–1). */
export function Tank({ x, y, w = 60, h = 110, level, dome = true, cone, label }) {
  const lv = level == null ? null : Math.max(0, Math.min(1, level));
  const body = cone ? `M${x} ${y + 10} Q${x} ${y} ${x + 10} ${y} H${x + w - 10} Q${x + w} ${y} ${x + w} ${y + 10} V${y + h - cone} L${x + w / 2 + 8} ${y + h} H${x + w / 2 - 8} L${x} ${y + h - cone} Z`
    : `M${x} ${y + (dome ? 12 : 0)} Q${x} ${y} ${x + w / 2} ${y} Q${x + w} ${y} ${x + w} ${y + (dome ? 12 : 0)} V${y + h - 6} Q${x + w} ${y + h} ${x + w / 2} ${y + h} Q${x} ${y + h} ${x} ${y + h - 6} Z`;
  return <g className="m-shape">
    <clipPath id={`tk${x}-${y}`}><path d={body} /></clipPath>
    <path d={body} className="m-body" />
    {lv != null && <rect x={x} y={y + h - h * lv} width={w} height={h * lv} fill="url(#m-liquid)" clipPath={`url(#tk${x}-${y})`} className="m-level" />}
    <path d={body} className="m-edge" />
    {lv != null && <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className="m-inner">{Math.round(lv * 100)}%</text>}
    {label && <text x={x + w / 2} y={y - 6} textAnchor="middle" className="m-sub">{label}</text>}
  </g>;
}
/** Pump (circle with discharge nozzle). on: running. */
export function Pump({ x, y, r = 16, on = true, dir = 0 }) {
  return <g className={`m-shape m-pump ${on ? 'on' : 'off'}`} transform={`rotate(${dir} ${x} ${y})`}>
    <rect x={x} y={y - r} width={r * 1.3} height={r * 0.7} className="m-body" />
    <circle cx={x} cy={y} r={r} className="m-body" /><circle cx={x} cy={y} r={r} className="m-edge" />
    <path d={`M${x - r * 0.55} ${y + r * 0.45} L${x} ${y - r * 0.55} L${x + r * 0.55} ${y + r * 0.45}`} className="m-glyph" />
    <circle cx={x + r * 0.95} cy={y + r * 0.95} r="3.5" className="m-run" />
  </g>;
}
/** Fan / blower with spinning blades. */
export function Fan({ x, y, r = 22, on = true, speed = 1 }) {
  return <g className={`m-shape m-fan ${on ? 'on' : 'off'}`}>
    <circle cx={x} cy={y} r={r} className="m-body" /><circle cx={x} cy={y} r={r} className="m-edge" />
    <g className="m-spin" style={{ transformOrigin: `${x}px ${y}px`, animationDuration: `${1.2 / speed}s` }}>
      {[0, 120, 240].map(a => <path key={a} d={`M${x} ${y} Q${x + r * 0.2} ${y - r * 0.6} ${x} ${y - r * 0.85} Q${x - r * 0.35} ${y - r * 0.5} ${x} ${y}`} transform={`rotate(${a} ${x} ${y})`} className="m-blade" />)}
    </g>
    <circle cx={x} cy={y} r="3" className="m-hub" /><circle cx={x + r * 0.85} cy={y + r * 0.85} r="3.5" className="m-run" />
  </g>;
}
/** Electric motor (M in a circle) with shaft to the right. */
export function Motor({ x, y, r = 14, on = true, label = 'M' }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}><line x1={x + r} y1={y} x2={x + r + 12} y2={y} className="m-edge" />
    <circle cx={x} cy={y} r={r} className="m-body" /><circle cx={x} cy={y} r={r} className="m-edge" /><text x={x} y={y + 4} textAnchor="middle" className="m-inner">{label}</text>
    <circle cx={x + r * 0.8} cy={y + r * 0.8} r="3" className="m-run" /></g>;
}
/** Valve (bow-tie). open: true / false / 0–1. rot 0 = horizontal line. */
export function Valve({ x, y, s = 12, open = true, rot = 0, control }) {
  const o = open === true ? 1 : open === false ? 0 : open;
  return <g className={`m-shape m-valve ${o > 0.05 ? 'open' : 'shut'}`} transform={`rotate(${rot} ${x} ${y})`}>
    <path d={`M${x - s} ${y - s * 0.7} L${x + s} ${y + s * 0.7} L${x + s} ${y - s * 0.7} L${x - s} ${y + s * 0.7} Z`} className="m-vbody" />
    {control && <><line x1={x} y1={y} x2={x} y2={y - s * 1.4} className="m-edge" /><path d={`M${x - s * 0.7} ${y - s * 1.4} A${s * 0.7} ${s * 0.7} 0 0 1 ${x + s * 0.7} ${y - s * 1.4} Z`} className="m-body" /></>}
  </g>;
}
/** Heat exchanger (shell with tube pass). */
export function HX({ x, y, w = 90, h = 34 }) {
  return <g className="m-shape"><rect x={x} y={y} width={w} height={h} rx={h / 2} className="m-body" /><rect x={x} y={y} width={w} height={h} rx={h / 2} className="m-edge" />
    <path d={`M${x + 12} ${y + h / 2} l10 -9 l10 18 l10 -18 l10 18 l10 -18 l10 18 l10 -9`} className="m-glyph" /></g>;
}
/** Cyclone (cylinder over cone). */
export function Cyclone({ x, y, w = 50, h = 90 }) {
  const cy = h * 0.42;
  return <g className="m-shape"><path d={`M${x} ${y} H${x + w} V${y + cy} L${x + w * 0.62} ${y + h} H${x + w * 0.38} L${x} ${y + cy} Z`} className="m-body" />
    <path d={`M${x} ${y} H${x + w} V${y + cy} L${x + w * 0.62} ${y + h} H${x + w * 0.38} L${x} ${y + cy} Z`} className="m-edge" />
    <rect x={x + w * 0.3} y={y - 10} width={w * 0.4} height={14} className="m-body" /><rect x={x + w * 0.3} y={y - 10} width={w * 0.4} height={14} className="m-edge" /></g>;
}
/** Rotary drum (kiln, dryer, cooler drum): inclined cylinder with rotating bands. */
export function Drum({ x, y, len = 400, dia = 60, angle = 4, on = true, hot, tyres = 3 }) {
  return <g className={`m-shape m-drum ${on ? 'on' : 'off'}`} transform={`rotate(${angle} ${x} ${y + dia / 2})`}>
    <rect x={x} y={y} width={len} height={dia} rx={dia * 0.18} fill={hot ? 'url(#m-hot)' : 'url(#m-metal)'} className="m-drum-body" opacity={hot ? 0.85 : 1} />
    <g className="m-bands">{Array.from({ length: Math.floor(len / 26) }).map((_, i) => <line key={i} x1={x + 10 + i * 26} y1={y + 3} x2={x + 22 + i * 26} y2={y + dia - 3} className="m-band" />)}</g>
    {Array.from({ length: tyres }).map((_, i) => { const tx = x + (len * (i + 1)) / (tyres + 1); return <g key={i}><rect x={tx - 7} y={y - 4} width={14} height={dia + 8} rx="2" className="m-tyre" /><path d={`M${tx - 16} ${y + dia + 16} L${tx} ${y + dia + 4} L${tx + 16} ${y + dia + 16}`} className="m-edge" /></g>; })}
    <rect x={x} y={y} width={len} height={dia} rx={dia * 0.18} className="m-edge" />
  </g>;
}
/** Generic vessel (reactor / column / furnace shell): rounded rectangle with optional agitator, jacket, flame. */
export function Vessel({ x, y, w = 80, h = 140, agitator, jacket, flame, level, hot, on = true }) {
  const lv = level == null ? null : Math.max(0, Math.min(1, level));
  const d = `M${x} ${y + w * 0.22} Q${x} ${y} ${x + w / 2} ${y} Q${x + w} ${y} ${x + w} ${y + w * 0.22} V${y + h - w * 0.22} Q${x + w} ${y + h} ${x + w / 2} ${y + h} Q${x} ${y + h} ${x} ${y + h - w * 0.22} Z`;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    {jacket && <path d={d} transform={`translate(${-6} 0) scale(1)`} className="m-jacket" style={{ transform: `translate(0,0)` }} />}
    {jacket && <rect x={x - 7} y={y + h * 0.25} width={w + 14} height={h * 0.62} rx="8" className="m-jacket" />}
    <clipPath id={`vs${x}-${y}`}><path d={d} /></clipPath>
    <path d={d} className="m-body" fill={hot ? 'url(#m-hot)' : undefined} />
    {lv != null && <rect x={x} y={y + h - h * lv} width={w} height={h * lv} fill="url(#m-liquid)" clipPath={`url(#vs${x}-${y})`} className="m-level" />}
    {flame && <path d={`M${x + w * 0.3} ${y + h - 6} Q${x + w / 2} ${y + h * 0.45} ${x + w * 0.7} ${y + h - 6} Z`} fill="url(#m-flame)" className="m-flame" />}
    <path d={d} className="m-edge" />
    {agitator && <g><line x1={x + w / 2} y1={y - 22} x2={x + w / 2} y2={y + h * 0.78} className="m-edge" /><rect x={x + w / 2 - 9} y={y - 34} width={18} height={14} rx="2" className="m-body" />
      <g className={on ? 'm-spin-y' : ''} style={{ transformOrigin: `${x + w / 2}px ${y + h * 0.78}px` }}><path d={`M${x + w / 2 - w * 0.3} ${y + h * 0.78} H${x + w / 2 + w * 0.3}`} className="m-blade-l" /></g></g>}
  </g>;
}
/** Conveyor / belt with moving rollers. */
export function Conveyor({ x, y, len = 160, angle = 0, on = true }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`} transform={`rotate(${angle} ${x} ${y})`}>
    <rect x={x} y={y - 5} width={len} height={10} rx="5" className="m-body" /><rect x={x} y={y - 5} width={len} height={10} rx="5" className="m-edge" />
    <line x1={x + 5} y1={y} x2={x + len - 5} y2={y} className="m-flow belt" />
  </g>;
}
/** Simple box machine with title (CNC, press, chiller, compressor package …). */
export function Box({ x, y, w = 90, h = 60, title, icon }) {
  return <g className="m-shape"><rect x={x} y={y} width={w} height={h} rx="6" fill="url(#m-metal)" className="m-body" /><rect x={x} y={y} width={w} height={h} rx="6" className="m-edge" />
    {icon}{title && <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className="m-inner">{title}</text>}</g>;
}
/** Burner flame (animated). */
export const Flame = ({ x, y, s = 18 }) => <path d={`M${x} ${y} q${-s * 0.6} ${-s * 0.8} 0 ${-s * 1.6} q${s * 0.6} ${s * 0.8} 0 ${s * 1.6} z`} fill="url(#m-flame)" className="m-flame" />;

/* ---------------- electrical ---------------- */
/** Busbar (thick horizontal line) with voltage label. */
export function Bus({ x1, x2, y, label, a, kind = 'lv' }) {
  const m = useMimic(); const st = a ? m.assetState(a) : 'good';
  return <g className={`m-bus ${kind} ${st}`} onClick={() => a && m.select(a)} role={a ? 'button' : undefined}>
    <line x1={x1} y1={y} x2={x2} y2={y} className="m-bus-l" />{label && <text x={x1} y={y - 8} className="m-sub">{label}</text>}</g>;
}
/** Circuit breaker: square, filled when closed. */
export function Breaker({ x, y, s = 14, closed = true, rot = 0 }) {
  return <g className={`m-brk ${closed ? 'closed' : 'open'}`} transform={`rotate(${rot} ${x} ${y})`}><rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx="2" /></g>;
}
/** Isolator / switch. */
export const Switch = ({ x, y, len = 22, closed = true }) => <g className="m-sw"><circle cx={x} cy={y} r="2.5" /><line x1={x} y1={y} x2={closed ? x : x + len * 0.5} y2={y + len} /><circle cx={x} cy={y + len} r="2.5" /></g>;
/** Two-winding transformer (two circles). */
export function Transformer({ x, y, r = 16, vertical = true }) {
  const dx = vertical ? 0 : r * 1.2, dy = vertical ? r * 1.2 : 0;
  return <g className="m-shape m-tr"><circle cx={x} cy={y} r={r} className="m-coil" /><circle cx={x + dx} cy={y + dy} r={r} className="m-coil" /></g>;
}
/** Generator (G in a circle with sine). */
export function Generator({ x, y, r = 20, on = true, label = 'G' }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}><circle cx={x} cy={y} r={r} className="m-body" /><circle cx={x} cy={y} r={r} className="m-edge" />
    <text x={x} y={y - 2} textAnchor="middle" className="m-inner">{label}</text><path d={`M${x - r * 0.5} ${y + r * 0.4} q${r * 0.25} ${-r * 0.4} ${r * 0.5} 0 t${r * 0.5} 0`} className="m-glyph" />
    <circle cx={x + r * 0.8} cy={y + r * 0.8} r="3.5" className="m-run" /></g>;
}
/** Load / feeder arrow. */
export const Load = ({ x, y, len = 26 }) => <g className="m-load"><line x1={x} y1={y} x2={x} y2={y + len} /><path d={`M${x - 6} ${y + len - 6} L${x} ${y + len + 2} L${x + 6} ${y + len - 6}`} /></g>;
/** Capacitor bank symbol. */
export const Capacitor = ({ x, y }) => <g className="m-cap"><line x1={x - 12} y1={y} x2={x + 12} y2={y} /><line x1={x - 12} y1={y + 7} x2={x + 12} y2={y + 7} /></g>;
/** Earth symbol. */
export const Earth = ({ x, y }) => <g className="m-load"><line x1={x - 10} y1={y} x2={x + 10} y2={y} /><line x1={x - 6} y1={y + 4} x2={x + 6} y2={y + 4} /><line x1={x - 2} y1={y + 8} x2={x + 2} y2={y + 8} /></g>;

/* ---------------- renewables ---------------- */
/** PV array block: rows × cols of modules. */
export function PVArray({ x, y, cols = 6, rows = 2, mw = 18, mh = 11, tilt = 0 }) {
  return <g className="m-shape" transform={`skewX(${tilt})`}>{Array.from({ length: rows * cols }).map((_, i) => <rect key={i} x={x + (i % cols) * (mw + 2)} y={y + Math.floor(i / cols) * (mh + 2)} width={mw} height={mh} rx="1" fill="url(#m-solar)" className="m-pv" />)}</g>;
}
/** Wind turbine with rotating rotor. s: scale (1 = 120 px tall). */
export function WindTurbine({ x, y, s = 1, on = true, rpm = 14 }) {
  const H = 120 * s, R = 46 * s;
  return <g className={`m-shape m-wtg ${on ? 'on' : 'off'}`}>
    <path d={`M${x - 3 * s} ${y + H} L${x - 1.5 * s} ${y} H${x + 1.5 * s} L${x + 3 * s} ${y + H} Z`} className="m-body" />
    <rect x={x - 5 * s} y={y - 4 * s} width={14 * s} height={8 * s} rx={2 * s} className="m-body" />
    <g className="m-spin" style={{ transformOrigin: `${x}px ${y}px`, animationDuration: `${on ? Math.max(1.2, 60 / Math.max(rpm, 1) / 3) : 0}s`, animationPlayState: on ? 'running' : 'paused' }}>
      {[0, 120, 240].map(a => <path key={a} d={`M${x} ${y} L${x - 2.2 * s} ${y - R * 0.3} L${x} ${y - R} L${x + 2.2 * s} ${y - R * 0.3} Z`} transform={`rotate(${a} ${x} ${y})`} className="m-wblade" />)}
    </g>
    <circle cx={x} cy={y} r={3 * s} className="m-hub" />
  </g>;
}

/* ---------------- indicators ---------------- */
/** Analog arc gauge bound to a tag. */
export function Gauge({ a, t, x, y, r = 34, min, max, label }) {
  const m = useMimic(); const rd = m.read(a, t);
  const lo = min ?? 0, hi = max ?? (rd.def?.hi ? rd.def.hi * 1.25 : (rd.def?.base || 1) * 2);
  const f = rd.v == null ? 0 : Math.max(0, Math.min(1, (rd.v - lo) / (hi - lo || 1)));
  const ang = Math.PI * (1 - f);
  const arc = (p0, p1) => { const a0 = Math.PI * (1 - p0), a1 = Math.PI * (1 - p1); return `M${x + r * Math.cos(a0)} ${y - r * Math.sin(a0)} A${r} ${r} 0 0 1 ${x + r * Math.cos(a1)} ${y - r * Math.sin(a1)}`; };
  const limF = rd.def?.hi != null ? Math.max(0, Math.min(1, (rd.def.hi - lo) / (hi - lo))) : null;
  return <g className={`m-gauge ${rd.st}`} onClick={() => m.select(a)} role="button">
    <path d={arc(0, 1)} className="m-g-track" />
    {limF != null && <path d={arc(limF, 1)} className="m-g-lim" />}
    <path d={arc(0, f || 0.001)} className="m-g-val" />
    <line x1={x} y1={y} x2={x + (r - 6) * Math.cos(ang)} y2={y - (r - 6) * Math.sin(ang)} className="m-g-needle" />
    <text x={x} y={y + 14} textAnchor="middle" className="m-val-v" key={m.tick}>{rd.v == null ? '—' : fmtNum(rd.v)}<tspan className="m-val-u"> {rd.unit}</tspan></text>
    <text x={x} y={y + 27} textAnchor="middle" className="m-val-l">{label || rd.def?.name}</text>
  </g>;
}
/** Vertical bar indicator with limit marks (ISA-101 style moving analog). */
export function BarInd({ a, t, x, y, h = 80, w = 14, min = 0, max, label }) {
  const m = useMimic(); const rd = m.read(a, t);
  const hi = max ?? (rd.def?.hi ? rd.def.hi * 1.2 : (rd.def?.base || 1) * 2);
  const f = rd.v == null ? 0 : Math.max(0, Math.min(1, (rd.v - min) / (hi - min || 1)));
  const lim = rd.def?.hi != null ? y + h - h * ((rd.def.hi - min) / (hi - min)) : null;
  return <g className={`m-bar ${rd.st}`} onClick={() => m.select(a)} role="button">
    <rect x={x} y={y} width={w} height={h} rx="2" className="m-g-track-r" />
    <rect x={x} y={y + h - h * f} width={w} height={h * f} rx="2" className="m-g-fill" />
    {lim != null && <line x1={x - 3} y1={lim} x2={x + w + 3} y2={lim} className="m-g-limline" />}
    <text x={x + w / 2} y={y + h + 12} textAnchor="middle" className="m-val-l">{label || rd.def?.name}</text>
  </g>;
}
/** Status lamp for an asset (running / alarm). */
export function Lamp({ a, x, y, r = 6 }) { const m = useMimic(); const st = m.assetState(a); return <circle cx={x} cy={y} r={r} className={`m-lamp ${st}`} onClick={() => m.select(a)} />; }

/** Helper: a few values stacked under a point. vals: [[tag, label?], …] */
export function ValStack({ a, x, y, vals, w = 110, gap = 40 }) {
  return <g>{vals.map(([t, l], i) => <Val key={t} a={a} t={t} label={l} x={x} y={y + i * gap} w={w} />)}</g>;
}

/** History mini-trend inside the drawing (last 24 h). */
export function MiniTrend({ a, t, x, y, w = 160, h = 40 }) {
  const m = useMimic(); const { c } = m;
  const pts = useMemo(() => (c.db.assetById[a] ? c.db.history(a, t, c.db.anchor - D, c.db.anchor, 'hour').points : []), [c, a, t]);
  if (!pts.length) return null;
  const vs = pts.map(p => p.v); const lo = Math.min(...vs), hi = Math.max(...vs);
  const d = 'M' + pts.map((p, i) => `${x + (i / (pts.length - 1)) * w} ${y + h - ((p.v - lo) / (hi - lo || 1)) * h}`).join(' L');
  return <g className="m-mini" onClick={() => m.select(a)}><rect x={x} y={y} width={w} height={h} rx="3" className="m-mini-bg" /><path d={d} className="m-mini-l" /></g>;
}
