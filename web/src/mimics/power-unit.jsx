/* Power plant (Vindhya Power & Metals, CPP Unit 1, 100 MW PF): boiler SCADA, turbine and feed cycle SCADA, live heat balance vs design.
   Default export: { '<mimic id>': Component({ c }) }. Aux scheduler, soot blowing and setpoint screens are drawn in power-ops.jsx. */
import React from 'react';
import { Mimic, Equip, Val, Pipe, Fan, Pump, Valve, Lbl, Title, Zone, MiniTrend, Lamp, Transformer, HX, Box, useLive, useMimic } from './kit.jsx';

/* =====================================================================================
   Local shapes
   ===================================================================================== */

/** Boiler steam drum: horizontal capsule with water level. */
function SteamDrum({ x, y, w = 120, h = 30, level = 0.5 }) {
  const id = `sd${x}-${y}`; const ly = y + h - h * Math.max(0.05, Math.min(0.95, level));
  return <g className="m-shape">
    <clipPath id={id}><rect x={x} y={y} width={w} height={h} rx={h / 2} /></clipPath>
    <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="url(#m-metal)" className="m-body" />
    <rect x={x} y={ly} width={w} height={h} fill="url(#m-liquid)" clipPath={`url(#${id})`} className="m-level" />
    <line x1={x + 10} y1={y + h / 2} x2={x + w - 10} y2={y + h / 2} className="m-glyph" strokeDasharray="2 4" opacity=".6" />
    <rect x={x} y={y} width={w} height={h} rx={h / 2} className="m-edge" />
    {/* saddles */}
    <path d={`M${x + 22} ${y + h} l-6 8 h18 z M${x + w - 22} ${y + h} l-6 8 h18 z`} className="m-edge" />
  </g>;
}

/** Hanging pendant tube bank (platen SH, final SH, RH): U-loops. */
function Pendant({ x, y, w, h, pitch = 9 }) {
  const n = Math.max(2, Math.floor(w / pitch));
  const d = Array.from({ length: n }).map((_, i) => { const xx = x + 4 + i * pitch; return `M${xx} ${y} V${y + h - 4} Q${xx + pitch / 4} ${y + h} ${xx + pitch / 2} ${y + h - 4} V${y}`; }).join(' ');
  return <g className="m-shape">
    <rect x={x - 2} y={y - 6} width={w + 4} height={6} rx="1.5" className="m-body" /><rect x={x - 2} y={y - 6} width={w + 4} height={6} rx="1.5" className="m-edge" />
    <path d={d} className="m-glyph" style={{ strokeWidth: 1.3 }} />
  </g>;
}

/** Horizontal serpentine bank (economiser, LTSH). */
function Serpentine({ x, y, w, h, pitch = 8 }) {
  const n = Math.max(2, Math.floor(h / pitch));
  let d = `M${x} ${y}`;
  for (let i = 0; i < n; i++) { const yy = y + i * pitch; d += i % 2 ? ` H${x + 4} Q${x} ${yy + pitch / 2} ${x + 4} ${yy + pitch}` : ` H${x + w - 4} Q${x + w} ${yy + pitch / 2} ${x + w - 4} ${yy + pitch}`; }
  return <g className="m-shape">
    <rect x={x - 3} y={y - 4} width={w + 6} height={h + 8} rx="2" className="m-edge" opacity=".5" />
    <path d={d} className="m-glyph" style={{ strokeWidth: 1.2 }} />
  </g>;
}

/** Bowl mill (XRP): gearbox, bowl section, separator body, classifier cone, multiple coal outlets, motor. */
function BowlMill({ x, y, w = 50, h = 70, on }) {
  const cx = x + w / 2;
  const body = `M${x + 6} ${y + h - 18} V${y + 26} L${x + 14} ${y + 12} H${x + w - 14} L${x + w - 6} ${y + 26} V${y + h - 18} Z`;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x + 2} y={y + h - 18} width={w - 4} height={18} rx="2" fill="url(#m-metal)" className="m-body" /><rect x={x + 2} y={y + h - 18} width={w - 4} height={18} rx="2" className="m-edge" />
    <path d={body} fill="url(#m-metal-h)" className="m-body" /><path d={body} className="m-edge" />
    <path d={`M${x + 12} ${y + h - 26} Q${cx} ${y + h - 16} ${x + w - 12} ${y + h - 26}`} className="m-glyph" />
    <circle cx={x + 16} cy={y + h - 30} r="4" className="m-edge" /><circle cx={x + w - 16} cy={y + h - 30} r="4" className="m-edge" />
    <path d={`M${x + 14} ${y + 26} L${cx} ${y + 46} L${x + w - 14} ${y + 26}`} className="m-glyph" strokeDasharray="3 2" />
    <rect x={x + 16} y={y + 4} width={w - 32} height={8} className="m-body" /><rect x={x + 16} y={y + 4} width={w - 32} height={8} className="m-edge" />
    <line x1={cx} y1={y + 12} x2={cx} y2={y + h - 18} className="m-glyph" opacity=".4" />
    <circle cx={x + w - 8} cy={y + h - 8} r="3.2" className="m-run" />
  </g>;
}

/** Rotary regenerative air preheater (bi-sector): rotor with baskets, gas side and air side. */
function APH({ x, y, w = 70, h = 90, on = true }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x} y={y} width={w} height={h} rx="4" fill="url(#m-metal-h)" className="m-body" />
    <rect x={x} y={y + 14} width={w} height={h - 28} className="m-edge" />
    <g opacity=".55">{Array.from({ length: 9 }).map((_, i) => <line key={i} x1={x + 4 + i * 7} y1={y + 16} x2={x + 4 + i * 7} y2={y + h - 16} className="m-glyph" style={{ strokeWidth: 0.8 }} />)}</g>
    <line x1={x + w / 2} y1={y + 4} x2={x + w / 2} y2={y + h - 4} className="m-edge" style={{ strokeWidth: 3 }} />
    <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} className="m-glyph" strokeDasharray="2 3" opacity=".6" />
    <rect x={x} y={y} width={w} height={h} rx="4" className="m-edge" />
    <text x={x + w * 0.25} y={y + 11} textAnchor="middle" className="m-sub" style={{ fontSize: 8.5 }}>AIR</text>
    <text x={x + w * 0.75} y={y + 11} textAnchor="middle" className="m-sub" style={{ fontSize: 8.5 }}>GAS</text>
    <circle cx={x + w - 7} cy={y + h - 7} r="3.2" className="m-run" />
  </g>;
}

/** ESP casing: inlet/outlet funnels, fields with collecting plates, TR sets on roof, hoppers. */
function ESP({ x, y, w = 150, h = 100, fields = 3 }) {
  const fw = (w - 24) / fields;
  return <g className="m-shape">
    <path d={`M${x} ${y + h * 0.35} L${x + 12} ${y} V${y + h} L${x} ${y + h * 0.65} Z`} className="m-body" /><path d={`M${x} ${y + h * 0.35} L${x + 12} ${y} V${y + h} L${x} ${y + h * 0.65} Z`} className="m-edge" />
    <path d={`M${x + w} ${y + h * 0.35} L${x + w - 12} ${y} V${y + h} L${x + w} ${y + h * 0.65} Z`} className="m-body" /><path d={`M${x + w} ${y + h * 0.35} L${x + w - 12} ${y} V${y + h} L${x + w} ${y + h * 0.65} Z`} className="m-edge" />
    <rect x={x + 12} y={y} width={w - 24} height={h} fill="url(#m-metal)" className="m-body" />
    {Array.from({ length: fields }).map((_, f) => { const fx = x + 12 + f * fw; return <g key={f}>
      {Array.from({ length: 6 }).map((_, i) => <line key={i} x1={fx + 6 + i * (fw - 12) / 5} y1={y + 8} x2={fx + 6 + i * (fw - 12) / 5} y2={y + h - 8} className="m-glyph" opacity=".45" style={{ strokeWidth: 1 }} />)}
      {f > 0 && <line x1={fx} y1={y} x2={fx} y2={y + h} className="m-edge" />}
      <rect x={fx + fw / 2 - 9} y={y - 12} width={18} height={12} rx="2" className="m-body" /><rect x={fx + fw / 2 - 9} y={y - 12} width={18} height={12} rx="2" className="m-edge" />
      <text x={fx + fw / 2} y={y + h / 2 + 4} textAnchor="middle" className="m-inner">F{f + 1}</text>
      <path d={`M${fx + 4} ${y + h} L${fx + fw / 2 - 3} ${y + h + 26} H${fx + fw / 2 + 3} L${fx + fw - 4} ${y + h} Z`} className="m-body" />
      <path d={`M${fx + 4} ${y + h} L${fx + fw / 2 - 3} ${y + h + 26} H${fx + fw / 2 + 3} L${fx + fw - 4} ${y + h} Z`} className="m-edge" />
    </g>; })}
    <rect x={x + 12} y={y} width={w - 24} height={h} className="m-edge" />
  </g>;
}

/** Tall tapered RCC stack with CEMS platform and aviation bands. */
function Stack({ x, y, w = 60, h = 600 }) {
  const d = `M${x} ${y + h} L${x + 9} ${y} H${x + w - 9} L${x + w} ${y + h} Z`;
  return <g className="m-shape">
    <path d={d} fill="url(#m-metal-h)" className="m-body" />
    {[0, 1].map(i => <rect key={i} x={x + 9.5} y={y + 4 + i * 16} width={w - 19} height={7} className="m-edge" style={{ fill: 'var(--m-eq-3)' }} />)}
    <line x1={x + 2} y1={y + 120} x2={x + w - 2} y2={y + 120} className="m-edge" style={{ strokeWidth: 2.5 }} />
    <rect x={x + w / 2 - 8} y={y + 106} width={16} height={12} rx="2" className="m-body" /><rect x={x + w / 2 - 8} y={y + 106} width={16} height={12} rx="2" className="m-edge" />
    <text x={x + w / 2} y={y + 116} textAnchor="middle" className="m-sub" style={{ fontSize: 7.5 }}>CEMS</text>
    <path d={d} className="m-edge" />
  </g>;
}

/** Turbine casing section: trapezoid from h0 (inlet) to h1 (exhaust) with blade rows. */
function TurbSec({ x, w, cy, h0, h1, rows = 6, on = true }) {
  const d = `M${x} ${cy - h0 / 2} L${x + w} ${cy - h1 / 2} V${cy + h1 / 2} L${x} ${cy + h0 / 2} Z`;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <path d={d} fill="url(#m-metal)" className="m-body" />
    {Array.from({ length: rows }).map((_, i) => { const f = (i + 0.7) / (rows + 0.4); const xx = x + w * f; const hh = (h0 + (h1 - h0) * f) / 2 - 5; return <line key={i} x1={xx} y1={cy - hh} x2={xx} y2={cy + hh} className="m-glyph" opacity=".5" />; })}
    <line x1={x + 2} y1={cy} x2={x + w - 2} y2={cy} className="m-glyph" strokeDasharray="5 3" opacity=".5" />
    <path d={d} className="m-edge" />
  </g>;
}

/** Air-cooled turbo-generator with stator ribs, cooler box and brushless exciter. */
function TurboGen({ x, y, w = 120, h = 70, on = true }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x + 18} y={y - 14} width={w - 36} height={14} rx="3" className="m-body" /><rect x={x + 18} y={y - 14} width={w - 36} height={14} rx="3" className="m-edge" />
    <rect x={x} y={y} width={w} height={h} rx="12" fill="url(#m-metal)" className="m-body" />
    {Array.from({ length: 7 }).map((_, i) => <line key={i} x1={x + 14 + i * (w - 28) / 6} y1={y + 4} x2={x + 14 + i * (w - 28) / 6} y2={y + h - 4} className="m-glyph" opacity=".4" />)}
    <rect x={x} y={y} width={w} height={h} rx="12" className="m-edge" />
    <rect x={x + w + 6} y={y + h / 2 - 14} width={24} height={28} rx="5" fill="url(#m-metal)" className="m-body" /><rect x={x + w + 6} y={y + h / 2 - 14} width={24} height={28} rx="5" className="m-edge" />
    <line x1={x + w} y1={y + h / 2} x2={x + w + 6} y2={y + h / 2} className="m-edge" style={{ strokeWidth: 3 }} />
    <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className="m-inner">G</text>
    <circle cx={x + w - 10} cy={y + h - 10} r="3.5" className="m-run" />
  </g>;
}

/** Bearing pedestal under the shaft. */
const Pedestal = ({ x, y }) => <g className="m-shape"><path d={`M${x - 7} ${y} h14 l4 16 h-22 z`} className="m-body" /><path d={`M${x - 7} ${y} h14 l4 16 h-22 z`} className="m-edge" /></g>;

/** Surface condenser: exhaust neck, shell with tube nest, water boxes, hotwell with level. */
function Condenser({ x, y, w = 140, h = 70, neckX, neckW, neckTop, level = 0.5 }) {
  const lv = Math.max(0.1, Math.min(0.9, level));
  return <g className="m-shape">
    <path d={`M${neckX} ${neckTop} H${neckX + neckW} L${x + w - 8} ${y} H${x + 8} Z`} className="m-body" /><path d={`M${neckX} ${neckTop} H${neckX + neckW} L${x + w - 8} ${y} H${x + 8} Z`} className="m-edge" />
    <rect x={x} y={y} width={w} height={h} rx="6" fill="url(#m-metal)" className="m-body" />
    {[0, 1, 2, 3].map(i => <line key={i} x1={x + 14} y1={y + 14 + i * (h - 28) / 3} x2={x + w - 14} y2={y + 14 + i * (h - 28) / 3} className="m-glyph" strokeDasharray="1 3" />)}
    <rect x={x} y={y} width={w} height={h} rx="6" className="m-edge" />
    <rect x={x + w} y={y + 6} width={12} height={h - 12} rx="3" className="m-body" /><rect x={x + w} y={y + 6} width={12} height={h - 12} rx="3" className="m-edge" />
    <line x1={x + w} y1={y + h / 2} x2={x + w + 12} y2={y + h / 2} className="m-edge" />
    <clipPath id={`hw${x}`}><rect x={x + 30} y={y + h} width={w - 60} height={24} rx="4" /></clipPath>
    <rect x={x + 30} y={y + h} width={w - 60} height={24} rx="4" className="m-body" />
    <rect x={x + 30} y={y + h + 24 - 24 * lv} width={w - 60} height={24} fill="url(#m-liquid)" clipPath={`url(#hw${x})`} className="m-level" />
    <rect x={x + 30} y={y + h} width={w - 60} height={24} rx="4" className="m-edge" />
  </g>;
}

/** Deaerator: horizontal feed storage tank with spray/tray head on top. */
function Deaerator({ x, y, w = 120, h = 38, headX, level = 0.6 }) {
  const lv = Math.max(0.1, Math.min(0.95, level)); const hx = headX ?? x + w - 34;
  return <g className="m-shape">
    <rect x={hx} y={y - 30} width={26} height={34} rx="8" fill="url(#m-metal-h)" className="m-body" /><rect x={hx} y={y - 30} width={26} height={34} rx="8" className="m-edge" />
    {[0, 1, 2].map(i => <line key={i} x1={hx + 5} y1={y - 20 + i * 7} x2={hx + 21} y2={y - 20 + i * 7} className="m-glyph" strokeDasharray="2 2" />)}
    <clipPath id={`da${x}`}><rect x={x} y={y} width={w} height={h} rx={h / 2} /></clipPath>
    <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="url(#m-metal)" className="m-body" />
    <rect x={x} y={y + h - h * lv} width={w} height={h} fill="url(#m-liquid)" clipPath={`url(#da${x})`} className="m-level" />
    <rect x={x} y={y} width={w} height={h} rx={h / 2} className="m-edge" />
    <path d={`M${x + 18} ${y + h} l-6 8 h18 z M${x + w - 18} ${y + h} l-6 8 h18 z`} className="m-edge" />
  </g>;
}

/** Induced-draught cooling tower cell block (side view): casing, fill, louvres, basin. Fans drawn separately on the deck. */
function CoolingTower({ x, y, w = 260, h = 170, cells = 6 }) {
  const cw = w / cells;
  return <g className="m-shape">
    <rect x={x} y={y} width={w} height={h - 24} fill="url(#m-metal)" className="m-body" />
    {Array.from({ length: cells }).map((_, i) => <g key={i}>
      {i > 0 && <line x1={x + i * cw} y1={y} x2={x + i * cw} y2={y + h - 24} className="m-edge" opacity=".6" />}
      <path d={`M${x + i * cw + 8} ${y} L${x + i * cw + 12} ${y - 18} H${x + (i + 1) * cw - 12} L${x + (i + 1) * cw - 8} ${y} Z`} className="m-body" />
      <path d={`M${x + i * cw + 8} ${y} L${x + i * cw + 12} ${y - 18} H${x + (i + 1) * cw - 12} L${x + (i + 1) * cw - 8} ${y} Z`} className="m-edge" />
    </g>)}
    <rect x={x + 6} y={y + 30} width={w - 12} height={48} className="m-edge" style={{ strokeDasharray: '3 3' }} opacity=".7" />
    <text x={x + w / 2} y={y + 58} textAnchor="middle" className="m-sub">film fill</text>
    {Array.from({ length: Math.floor(w / 12) }).map((_, i) => <line key={i} x1={x + 6 + i * 12} y1={y + h - 56} x2={x + 14 + i * 12} y2={y + h - 30} className="m-glyph" opacity=".45" />)}
    <rect x={x} y={y} width={w} height={h - 24} className="m-edge" />
    <rect x={x - 6} y={y + h - 24} width={w + 12} height={24} rx="3" className="m-body" />
    <rect x={x - 6} y={y + h - 14} width={w + 12} height={14} fill="url(#m-liquid)" className="m-level" />
    <rect x={x - 6} y={y + h - 24} width={w + 12} height={24} rx="3" className="m-edge" />
  </g>;
}

/** Horizontal burner flame pointing right (dir 1) or left (dir -1). */
const HFlame = ({ x, y, len = 26, dir = 1 }) => <path d={`M${x} ${y} q${dir * len * 0.5} ${-6} ${dir * len} 0 q${-dir * len * 0.5} 6 ${-dir * len} 0 z`} fill="url(#m-flame)" className="m-flame" style={{ transform: dir === 1 ? undefined : undefined }} />;

/** Damper (SADC): small blade in a frame. */
const Damper = ({ x, y, open = 0.5 }) => <g className="m-shape"><rect x={x - 5} y={y - 5} width={10} height={10} className="m-edge" /><line x1={x - 4} y1={y + 4 * (1 - open)} x2={x + 4} y2={y - 4 * (1 - open)} className="m-glyph" style={{ strokeWidth: 1.8 }} /></g>;

/* =====================================================================================
   Boiler SCADA
   ===================================================================================== */
const MILLS = ['MILL-E', 'MILL-D', 'MILL-C', 'MILL-B', 'MILL-A']; // top row = top elevation

function BoilerScada({ c }) {
  const run = a => (useLive(a, 'coal_flow', c).v || 0) > 2;
  const millOn = MILLS.map(run);
  const fanOn = a => (useLive(a, 'current', c).v || 0) > 5;
  const fd = [fanOn('FD-A'), fanOn('FD-B')], pa = [fanOn('PA-A'), fanOn('PA-B')], id = [fanOn('ID-A'), fanOn('ID-B')];
  const lvl = useLive('BLR-01', 'drum_level', c).v ?? 0;
  const sadc = (useLive('FUR-01', 'sadc', c).v ?? 46) / 100;
  const elevY = [340, 380, 420, 460, 500];
  return (
    <Mimic c={c} w={1280} h={740} note="gas path flue, air blue-grey, coal brown, steam light grey">
      <Title x={16} y={14}>Boiler · 330 t/h PF</Title>

      {/* ---------- top band: spray, drum values ---------- */}
      <Val a="ATT-01" t="sh_spray" x={16} y={22} label="SH spray" w={88} />
      <Val a="ATT-01" t="sh_valve" x={108} y={22} label="SH spray CV" w={88} />
      <Val a="ATT-01" t="rh_spray" x={16} y={64} label="RH spray" w={88} />
      <Val a="BLR-01" t="drum_level" x={108} y={64} label="Drum level" w={88} />
      <Lbl x={206} y={14} size={9.5} muted>SH spray from BFP discharge</Lbl>
      <Pipe d="M206 22 H478 V28" kind="water" w={3} />
      <Equip a="ATT-01" x={470} y={24} w={16} h={14} noId><Valve x={478} y={32} s={7} rot={90} control open={0.4} /></Equip>

      {/* ---------- steam lines leaving to turbine (top band) ---------- */}
      <Pipe d="M535 108 V18 H1276" kind="steam" w={7} speed={1.6} />
      <Pipe d="M1276 70 H640 V108" kind="steam" w={6} speed={1.2} />
      <Pipe d="M555 108 V48 H1276" kind="steam" w={7} speed={1.4} />
      <Pipe d="M410 50 V40 H440 V108" kind="steam" w={5} />
      <Pipe d="M462 108 V32 H490 V108" kind="steam" w={5} />
      <Lbl x={1272} y={12} anchor="end" size={10} muted>Main steam → HP turbine (TG-01)</Lbl>
      <Lbl x={1272} y={42} anchor="end" size={10} muted>Hot reheat → IP turbine</Lbl>
      <Lbl x={1272} y={90} anchor="end" size={10} muted>Cold reheat from HP exhaust</Lbl>
      <Pipe d="M760 96 V76" kind="water" w={3} />
      <Valve x={760} y={88} s={6} rot={90} />
      <Lbl x={768} y={96} size={9.5} muted>RH spray</Lbl>

      {/* ---------- boiler gas envelope (furnace, horizontal pass, second pass) ---------- */}
      <path d="M300 110 H645 V455 L617 480 H573 L545 455 V240 H430 V540 L385 576 H345 L300 540 Z" className="m-body" opacity=".55" />
      {/* gas path: fireball up, across the horizontal pass, down the second pass, into APH */}
      <Pipe d="M365 520 V236 H595 V470" kind="flue" w={12} speed={0.9} />
      <path d="M300 110 H645 V455 L617 480 H573 L545 455 V240 H430 V540 L385 576 H345 L300 540 Z" className="m-edge" />
      <line x1="430" y1="240" x2="430" y2="110" className="m-edge" strokeDasharray="4 4" opacity=".6" />
      <line x1="545" y1="240" x2="545" y2="110" className="m-edge" strokeDasharray="4 4" opacity=".6" />
      {/* water-wall tubes */}
      <Equip a="WW-01" x={300} y={240} w={130} h={300} noId>
        {[304, 308, 422, 426].map(xx => <line key={xx} x1={xx} y1={xx < 400 ? 112 : 242} x2={xx} y2={538} className="m-glyph" opacity=".55" />)}
        <path d="M345 576 L304 542 M385 576 L426 542" className="m-glyph" opacity=".55" />
      </Equip>
      <text x={312} y={238} className="m-id">WW-01</text>
      <Lbl x={292} y={582} anchor="end" size={9} muted>Bottom ash</Lbl>
      {/* nose */}
      <path d="M430 240 L412 262 L430 284" className="m-edge" />

      {/* drum, downcomers, risers */}
      <Pipe d="M300 66 H276 V566 H345" kind="water" w={5} speed={0.6} />
      <Pipe d="M365 110 V80" kind="water" w={4} flow={false} />
      <Pipe d="M330 28 V50" kind="water" w={3} />
      <Lbl x={336} y={34} size={9.5} muted>FW from ECO</Lbl>
      <Equip a="BLR-01" x={300} y={50} w={120} h={30} noId><SteamDrum x={300} y={50} w={120} h={30} level={0.5 + lvl / 300} /></Equip>
      <text x={360} y={98} textAnchor="middle" className="m-id">BLR-01 drum</text>
      <text x={270} y={250} transform="rotate(-90 270 250)" textAnchor="middle" className="m-sub" style={{ fontSize: 9 }}>Downcomer</text>

      {/* platen + final SH (furnace exit / horizontal pass) */}
      <Equip a="SH-01" x={396} y={110} w={144} h={122} noId>
        <Pendant x={398} y={118} w={70} h={96} pitch={8} />
        <Pendant x={482} y={118} w={56} h={96} pitch={8} />
      </Equip>
      <text x={433} y={228} textAnchor="middle" className="m-sub">Platen SH</text>
      <text x={511} y={228} textAnchor="middle" className="m-sub">Final SH</text>
      <text x={470} y={106} textAnchor="middle" className="m-id">SH-01</text>
      {/* reheater + economiser (second pass) */}
      <Equip a="RH-01" x={553} y={124} w={84} h={92} noId><Pendant x={553} y={130} w={84} h={80} pitch={8} /></Equip>
      <text x={595} y={228} textAnchor="middle" className="m-sub">Reheater RH-01</text>
      <Equip a="ECO-01" x={553} y={284} w={84} h={96} noId><Serpentine x={556} y={290} w={78} h={84} pitch={7} /></Equip>
      <text x={595} y={396} textAnchor="middle" className="m-sub">Economiser ECO-01</text>
      <Pipe d="M686 372 H645" kind="water" w={4} arrow />
      <Lbl x={652} y={366} size={9} muted>FW in</Lbl>
      <Pipe d="M628 284 V256" kind="water" w={3} arrow />
      <Lbl x={650} y={262} size={9} muted>to drum</Lbl>

      {/* furnace: windboxes, burners, fireball, scanners, SADC */}
      <Equip a="FUR-01" x={286} y={326} w={158} h={190} noId>
        <rect x={286} y={326} width={14} height={190} rx="2" className="m-body" /><rect x={286} y={326} width={14} height={190} rx="2" className="m-edge" />
        <rect x={430} y={326} width={14} height={190} rx="2" className="m-body" /><rect x={430} y={326} width={14} height={190} rx="2" className="m-edge" />
        <ellipse cx={365} cy={420} rx={34} ry={66} className="m-glyph" strokeDasharray="4 4" />
        <path d="M352 360 a20 20 0 1 1 26 0" className="m-glyph" markerEnd="url(#m-arrow)" opacity=".7" />
      </Equip>
      {elevY.map((y, i) => { const on = millOn[i]; return <g key={y}>
        <rect x={300} y={y - 4} width={10} height={8} className="m-body" /><rect x={300} y={y - 4} width={10} height={8} className="m-edge" />
        <rect x={420} y={y - 4} width={10} height={8} className="m-body" /><rect x={420} y={y - 4} width={10} height={8} className="m-edge" />
        {on && <HFlame x={311} y={y} len={34} dir={1} />}
        {on && <HFlame x={419} y={y} len={34} dir={-1} />}
        <text x={293} y={y + 3.5} textAnchor="middle" className="m-sub" style={{ fontSize: 8.5, fontWeight: 650 }}>{'EDCBA'[i]}</text>
        <Damper x={451} y={y} open={sadc} />
        {on ? <Lamp a="FUR-01" x={437} y={y + 14} r={3} /> : <circle cx={437} cy={y + 14} r={3} className="m-lamp off" />}
      </g>; })}
      <Lbl x={437} y={530} anchor="middle" size={8.5} muted>SADC · FS</Lbl>
      <Lbl x={365} y={530} anchor="middle" size={9} muted>Tangential fireball</Lbl>
      <text x={365} y={546} textAnchor="middle" className="m-id">FUR-01</text>

      {/* water wall values inside upper furnace */}
      <Val a="WW-01" t="metal_temp" x={312} y={244} label="WW metal max" w={88} />
      <Val a="WW-01" t="cf" x={312} y={284} label="WW cleanliness" w={88} />

      {/* furnace values in the gap */}
      <Val a="FUR-01" t="fegt" x={458} y={250} label="FEGT" w={82} />
      <Val a="FUR-01" t="tilt" x={458} y={292} label="Burner tilt" w={82} />
      <Val a="FUR-01" t="sadc" x={458} y={334} label="SADC avg" w={82} />
      <Val a="FUR-01" t="windbox_dp" x={458} y={376} label="WB–furn ΔP" w={82} />
      <Val a="FUR-01" t="flame" x={458} y={418} label="Flame scanners" w={82} />

      {/* ---------- mills and coal pipes ---------- */}
      <Zone x={10} y={100} w={262} h={474} label="Coal mills · 4 + 1" />
      <Pipe d="M520 490 V590 H134 V152" kind="hot" w={6} speed={0.9} />
      <Lbl x={140} y={586} size={9.5} muted>Hot PA header</Lbl>
      {MILLS.map((a, k) => { const y0 = 110 + k * 92; const on = millOn[k]; const xv = 262 - k * 10; const ey = elevY[k]; return <g key={a}>
        <Pipe d={`M134 ${y0 + 62} H150`} kind="hot" w={4} flow={on} />
        <Pipe d={`M198 ${y0 + 26} H${xv} V${ey} H286`} kind="material" w={4} flow={on} speed={0.8} />
        <Equip a={a} x={148} y={y0 + 6} w={50} h={70} noId><BowlMill x={148} y={y0 + 6} w={50} h={70} on={on} /></Equip>
        <text x={173} y={y0 + 2} textAnchor="middle" className="m-id">{a}</text>{!on && <text x={204} y={y0 + 70} className="m-sub" style={{ fontSize: 9 }}>standby</text>}
        <Val a={a} t="coal_flow" x={18} y={y0 + 6} label="Coal (feeder)" w={104} />
        <Val a={a} t="outlet_temp" x={18} y={y0 + 46} label="Outlet temp" w={104} />
      </g>; })}

      {/* ---------- air: FD and PA fans, APH, SA to windbox ---------- */}
      <Pipe d="M40 666 V606 H575 V590" kind="air" w={8} speed={1.1} />
      <Pipe d="M175 666 V606" kind="air" w={8} flow={fd[1]} />
      <Pipe d="M310 666 V620 H595 V590" kind="air" w={6} speed={1.1} />
      <Pipe d="M445 666 V620" kind="air" w={6} flow={pa[1]} />
      <Pipe d="M572 500 V490 H444" kind="hot" w={8} speed={1.1} />
      <Lbl x={452} y={484} size={9.5} muted>Hot SA → 4 corner windboxes</Lbl>
      {[['FD-A', 40, fd[0], 'FD fan A'], ['FD-B', 175, fd[1], 'FD fan B'], ['PA-A', 310, pa[0], 'PA fan A'], ['PA-B', 445, pa[1], 'PA fan B']].map(([a, cx, on, nm]) => <g key={a}>
        <Equip a={a} x={cx - 18} y={666} w={36} h={36} label={nm}><Fan x={cx} y={684} r={18} on={on} speed={1.5} /></Equip>
        <Val a={a} t="current" x={cx + 26} y={644} label="Current" w={90} />
        <Val a={a} t="igv" x={cx + 26} y={684} label={a.startsWith('FD') ? 'Blade pitch' : 'IGV'} w={90} />
      </g>)}
      <Lbl x={14} y={736} size={9} muted>Air from atmosphere</Lbl>
      <Pipe d="M612 478 V500" kind="flue" w={12} speed={0.9} />
      <Equip a="APH-01" x={560} y={500} w={70} h={90} label="" noId><APH x={560} y={500} w={70} h={90} /></Equip>
      <text x={548} y={548} textAnchor="end" className="m-id">APH-01</text>

      {/* ---------- gas: APH → ESP → ID fans → stack ---------- */}
      <Val a="APH-01" t="gas_out" x={612} y={606} label="APH gas exit" w={100} />
      <Val a="APH-01" t="dp" x={612} y={648} label="APH gas ΔP" w={100} />
      <Val a="APH-01" t="air_out" x={612} y={690} label="SA outlet" w={100} />
      <Pipe d="M630 560 H720" kind="flue" w={12} speed={0.9} />
      <Equip a="ESP-01" x={720} y={500} w={150} h={100} noId><ESP x={720} y={500} w={150} h={100} /></Equip>
      <text x={795} y={482} textAnchor="middle" className="m-id">ESP-01 · 2 passes × 3 fields</text>
      <Lbl x={795} y={640} anchor="middle" size={9} muted>Fly ash to silo</Lbl>
      <Val a="ESP-01" t="f1_current" x={720} y={648} label="F1 current" w={74} />
      <Val a="ESP-01" t="f2_current" x={798} y={648} label="F2 current" w={74} />
      <Val a="ESP-01" t="f3_current" x={720} y={690} label="F3 current" w={74} />
      <Val a="ESP-01" t="spm" x={798} y={690} label="Outlet dust" w={74} />
      <Pipe d="M870 560 H878 V520 H883 M878 560 V642 H883" kind="flue" w={10} speed={0.9} />
      <Pipe d="M927 520 H1150 V680 H1180 M927 642 H1150" kind="flue" w={10} speed={1} />
      {[['ID-A', 520, id[0]], ['ID-B', 642, id[1]]].map(([a, y, on]) => <g key={a}>
        <Equip a={a} x={883} y={y - 22} w={44} h={44}><Fan x={905} y={y} r={22} on={on} speed={1.6} /></Equip>
        <rect x={897} y={y + 25} width={16} height={9} rx="2" className="m-body" /><rect x={897} y={y + 25} width={16} height={9} rx="2" className="m-edge" />
      </g>)}
      <Val a="ID-A" t="current" x={940} y={478} label="ID-A current" w={92} />
      <Val a="ID-A" t="igv" x={1036} y={478} label="ID-A IGV" w={92} />
      <Val a="ID-A" t="vib" x={940} y={530} label="ID-A NDE vib" w={92} />
      <Val a="ID-A" t="brg_temp" x={1036} y={530} label="ID-A brg temp" w={92} />
      <Val a="ID-B" t="current" x={940} y={598} label="ID-B current" w={92} />
      <Val a="ID-B" t="igv" x={1036} y={598} label="ID-B IGV" w={92} />
      <Val a="ID-B" t="vib" x={940} y={652} label="ID-B NDE vib" w={92} />
      <Val a="ID-B" t="brg_temp" x={1036} y={652} label="ID-B brg temp" w={92} />
      <MiniTrend a="ID-B" t="vib" x={940} y={696} w={188} h={30} />
      <Lbl x={1034} y={738} anchor="middle" size={9} muted>ID-B vibration · 24 h</Lbl>
      <Equip a="STK-01" x={1180} y={96} w={60} h={604} noId><Stack x={1180} y={96} w={60} h={604} /></Equip>
      <text x={1210} y={718} textAnchor="middle" className="m-id">STK-01 · 120 m</text>
      <Val a="STK-01" t="nox" x={1066} y={104} label="NOx" w={100} />
      <Val a="STK-01" t="sox" x={1066} y={146} label="SO₂" w={100} />
      <Val a="STK-01" t="co" x={1066} y={188} label="CO" w={100} />
      <Val a="STK-01" t="o2" x={1066} y={230} label="Stack O₂" w={100} />
      <Val a="STK-01" t="temp" x={1066} y={272} label="Stack temp" w={100} />

      {/* ---------- heat-transfer section values (right of second pass) ---------- */}
      <Val a="SH-01" t="metal_temp" x={690} y={104} label="SH metal max" w={100} />
      <Val a="SH-01" t="cf" x={690} y={146} label="SH cleanliness" w={100} />
      <Val a="RH-01" t="metal_temp" x={690} y={188} label="RH metal max" w={100} />
      <Val a="RH-01" t="cf" x={690} y={230} label="RH cleanliness" w={100} />
      <Val a="ECO-01" t="gas_in" x={690} y={272} label="ECO gas in" w={100} />
      <Val a="ECO-01" t="cf" x={690} y={314} label="ECO cleanliness" w={100} />
      <Val a="ECO-01" t="fw_out" x={690} y={386} label="ECO FW out" w={100} />
      <Val a="ECO-01" t="gas_out" x={690} y={428} label="ECO gas out" w={100} />

      {/* ---------- steam and combustion panels ---------- */}
      <Zone x={806} y={100} w={252} h={168} label="Steam conditions" />
      <Val a="BLR-01" t="ms_flow" x={816} y={122} label="MS flow" w={116} />
      <Val a="BLR-01" t="ms_press" x={936} y={122} label="MS pressure" w={116} />
      <Val a="BLR-01" t="ms_temp" x={816} y={164} label="MS temperature" w={116} />
      <Val a="BLR-01" t="rh_temp" x={936} y={164} label="HRH temperature" w={116} />
      <Val a="TG-01" t="crh_press" x={816} y={206} label="CRH pressure" w={116} />
      <Val a="ATT-01" t="sh_spray" x={936} y={206} label="SH spray" w={116} />
      <Zone x={806} y={280} w={252} h={176} label="Combustion" />
      <Val a="BLR-01" t="o2" x={816} y={302} label="Excess O₂ (ECO out)" w={116} />
      <Val a="BLR-01" t="furnace_draft" x={936} y={302} label="Furnace draft" w={116} />
      <Val a="BLR-01" t="eff" x={816} y={344} label="Boiler efficiency" w={116} />
      <Val a="CHP-01" t="gcv" x={936} y={344} label="Coal GCV" w={116} />
      <MiniTrend a="BLR-01" t="o2" x={816} y={392} w={116} h={34} />
      <MiniTrend a="APH-01" t="gas_out" x={936} y={392} w={116} h={34} />
      <Lbl x={816} y={440} size={9} muted>O₂ · 24 h</Lbl>
      <Lbl x={936} y={440} size={9} muted>APH gas exit · 24 h</Lbl>
    </Mimic>
  );
}

/* =====================================================================================
   Turbine and feed cycle SCADA
   ===================================================================================== */
function TurbineScada({ c }) {
  const on = (a, t, th) => (useLive(a, t, c).v || 0) > th;
  const tgOn = on('TG-01', 'load', 5);
  const bfp = ['BFP-A', 'BFP-B', 'BFP-C'].map(a => on(a, 'flow', 5));
  const cep = ['CEP-A', 'CEP-B'].map(a => on(a, 'flow', 5));
  const cwp = ['CWP-A', 'CWP-B'].map(a => on(a, 'flow', 100));
  const ctf = [1, 2, 3, 4, 5, 6].map(i => on(`CTF-${i}`, 'kw', 10));
  const hw = useLive('COND-01', 'hotwell', c).v ?? 620;
  const dl = useLive('DEA-01', 'level', c).v ?? 1850;
  const cy = 150;
  return (
    <Mimic c={c} w={1280} h={740}>
      {/* ---------- steam lines from boiler ---------- */}
      <Lbl x={16} y={22} size={10} muted>Hot reheat from RH-01</Lbl>
      <Lbl x={16} y={50} size={10} muted>Cold reheat to RH-01</Lbl>
      <Lbl x={16} y={78} size={10} muted>Main steam from SH-01</Lbl>
      <Pipe d={`M16 30 H360 V${cy - 30}`} kind="steam" w={6} speed={1.4} />
      <Pipe d={`M285 ${cy - 38} V58 H16`} kind="steam" w={6} speed={1.2} />
      <Pipe d={`M16 86 H210 V${cy - 25}`} kind="steam" w={7} speed={1.6} />
      <Valve x={150} y={86} s={8} /><Lbl x={150} y={108} anchor="middle" size={9} muted>ESV</Lbl>
      <Valve x={190} y={86} s={8} control /><Lbl x={190} y={108} anchor="middle" size={9} muted>CV</Lbl>
      <Valve x={320} y={30} s={7} control /><Lbl x={320} y={50} anchor="middle" size={9} muted>IV</Lbl>
      <Pipe d={`M488 ${cy - 42} V72 H670 V${cy - 25}`} kind="steam" w={8} speed={1.2} />
      <Lbl x={580} y={66} anchor="middle" size={9.5} muted>IP–LP crossover</Lbl>

      {/* ---------- turbine train ---------- */}
      <line x1={180} y1={cy} x2={980} y2={cy} className="m-edge" style={{ strokeWidth: 3 }} />
      <Equip a="TG-01" x={190} y={cy - 65} w={590} h={130} noId>
        <TurbSec x={190} w={100} cy={cy} h0={50} h1={80} on={tgOn} />
        <TurbSec x={345} w={150} cy={cy} h0={60} h1={96} on={tgOn} />
        <TurbSec x={560} w={110} cy={cy} h0={130} h1={50} on={tgOn} />
        <TurbSec x={670} w={110} cy={cy} h0={50} h1={130} on={tgOn} />
      </Equip>
      {[[190, 'HP'], [345, 'IP'], [560, 'LP · double flow']].map(([x, t]) => <text key={t} x={x + 4} y={cy + 4} className="m-inner" style={{ fontSize: 10 }}>{t}</text>)}
      {[182, 318, 530, 800].map(x => <Pedestal key={x} x={x} y={cy + 8} />)}
      <text x={248} y={104} textAnchor="middle" className="m-id">TG-01</text>
      <Equip a="GEN-01" x={830} y={cy - 35} w={120} h={70} noId><TurboGen x={830} y={cy - 35} w={120} h={70} on={tgOn} /></Equip>
      <text x={890} y={cy + 52} textAnchor="middle" className="m-id">GEN-01 · 125 MVA</text>
      <Pipe d={`M900 ${cy - 49} V96 H1010 V${cy - 28}`} kind="power" />
      <Equip a="GT-01" x={994} y={cy - 28} w={32} h={56} noId><Transformer x={1010} y={cy - 12} r={13} /></Equip>
      <text x={1018} y={204} className="m-id">GT-01</text>
      <Pipe d={`M1010 ${cy + 16} V214`} kind="hv" />
      <line x1={990} y1={214} x2={1266} y2={214} className="m-bus-l" style={{ stroke: 'var(--m-power)', strokeWidth: 5 }} />
      <Lbl x={1266} y={232} anchor="end" size={10} muted>132 kV switchyard → smelter and grid</Lbl>

      <Val a="TG-01" t="load" x={380} y={14} label="Turbine load" w={110} big />
      <Val a="TG-01" t="thr" x={496} y={20} label="Turbine heat rate" w={104} />
      <Val a="TG-01" t="vib" x={604} y={20} label="Shaft vib max" w={92} />
      <Val a="TG-01" t="thrust_temp" x={700} y={20} label="Thrust pad" w={92} />
      <Val a="GEN-01" t="mvar" x={800} y={20} label="MVAr" w={86} />
      <Val a="GEN-01" t="pf" x={890} y={20} label="Power factor" w={86} />
      <Val a="GEN-01" t="stator_temp" x={1030} y={20} label="Stator max" w={86} />
      <Val a="GEN-01" t="freq" x={1120} y={20} label="Frequency" w={74} />
      <Val a="GEN-01" t="mw" x={1198} y={20} label="Gross MW" w={74} />
      <Val a="GT-01" t="mw_export" x={1044} y={112} label="Net export" w={96} />
      <Val a="GT-01" t="oil_temp" x={1144} y={112} label="GT top oil" w={96} />
      <Val a="GT-01" t="wind_temp" x={1044} y={154} label="GT winding" w={96} />
      <Val a="GT-01" t="tap" x={1144} y={154} label="OLTC tap" w={96} />

      {/* boiler-side values */}
      <Val a="BLR-01" t="ms_flow" x={16} y={124} label="MS flow" w={86} />
      <Val a="BLR-01" t="ms_press" x={16} y={166} label="MS pressure" w={86} />
      <Val a="BLR-01" t="ms_temp" x={16} y={208} label="MS temp" w={86} />
      <Val a="BLR-01" t="rh_temp" x={106} y={124} label="HRH temp" w={78} />
      <Val a="TG-01" t="crh_press" x={106} y={166} label="CRH press" w={78} />
      <Val a="TG-01" t="hp_ext" x={106} y={208} label="HP ext press" w={78} />

      {/* ---------- extractions ---------- */}
      <Pipe d={`M230 ${cy + 30} V340 H95 V420`} kind="steam" w={4} speed={0.8} />
      <Pipe d={`M280 ${cy + 36} V362 H185 V420`} kind="steam" w={4} speed={0.8} />
      <Pipe d={`M405 ${cy + 46} V396`} kind="steam" w={4} speed={0.8} />
      <Pipe d={`M485 ${cy + 46} V300 H465 V420`} kind="steam" w={4} speed={0.8} />
      <Pipe d={`M575 ${cy + 62} V384 H555 V420`} kind="steam" w={4} speed={0.8} />
      <Pipe d={`M645 ${cy + 30} V420`} kind="steam" w={4} speed={0.8} />
      <text x={224} y={290} transform="rotate(-90 224 290)" textAnchor="middle" className="m-sub" style={{ fontSize: 9 }}>to HPH-6</text>
      <text x={274} y={300} transform="rotate(-90 274 300)" textAnchor="middle" className="m-sub" style={{ fontSize: 9 }}>to HPH-5</text>

      {/* ---------- condenser ---------- */}
      <Equip a="COND-01" x={660} y={240} w={140} h={95} noId>
        <Condenser x={660} y={240} w={140} h={70} neckX={690} neckW={80} neckTop={cy + 62} level={(hw - 450) / 350} />
      </Equip>
      <text x={730} y={278} textAnchor="middle" className="m-inner">COND-01</text>
      <Pipe d="M640 325 H690" kind="water" w={3} arrow />
      <Lbl x={600} y={318} size={9} muted>Make-up</Lbl>
      <Val a="COND-01" t="back_pressure" x={838} y={268} label="Back pressure" w={132} big />
      <Val a="COND-01" t="ttd" x={838} y={320} label="Condenser TTD" w={132} />
      <Val a="COND-01" t="do" x={838} y={362} label="Condensate DO" w={132} />
      <Val a="COND-01" t="hotwell" x={838} y={404} label="Hotwell level" w={132} />
      <Val a="COND-01" t="cw_in" x={838} y={446} label="CW inlet temp" w={132} />
      <Val a="COND-01" t="cw_out" x={838} y={488} label="CW outlet temp" w={132} />

      {/* ---------- condensate: hotwell → CEP → LPH-1..3 → DEA ---------- */}
      <Pipe d="M780 334 V590 H700" kind="condensate" w={5} speed={0.8} />
      <Pipe d="M700 590 V572 M760 590 V572" kind="condensate" w={5} flow={false} />
      <Pipe d="M700 538 V510 M760 538 V510 H690 V434 H680" kind="condensate" w={5} speed={0.9} />
      {[['CEP-A', 700, cep[0]], ['CEP-B', 760, cep[1]]].map(([a, x, o]) => <Equip key={a} a={a} x={x - 16} y={539} w={32} h={32}><Pump x={x} y={555} r={16} on={o} dir={-90} /></Equip>)}
      <Lbl x={760} y={612} anchor="middle" size={9} muted>standby</Lbl>
      <Val a="CEP-A" t="flow" x={590} y={548} label="CEP-A flow" w={90} />
      <Val a="CEP-A" t="current" x={590} y={590} label="CEP-A current" w={90} />
      <Pipe d="M610 434 H590 M520 434 H500 M430 434 H410" kind="condensate" w={5} speed={0.9} />
      {[['LPH-1', 610], ['LPH-2', 520], ['LPH-3', 430]].map(([a, x]) => <g key={a}>
        <Equip a={a} x={x} y={420} w={70} h={28} label="" ><HX x={x} y={420} w={70} h={28} /></Equip>
        <Val a={a} t="ttd" x={x - 4} y={458} label={`${a} TTD`} w={80} />
        <Val a={a} t="ext_flow" x={x - 4} y={500} label="Extraction" w={80} />
      </g>)}
      <Val a="LPH-3" t="fw_out" x={426} y={542} label="To DEA" w={80} />
      <Val a="TG-01" t="ip_ext" x={300} y={176} label="IP ext press" w={98} />
      <Val a="TG-01" t="lp_ext" x={488} y={316} label="LP ext press" w={80} />

      {/* ---------- deaerator ---------- */}
      <Equip a="DEA-01" x={290} y={396} w={120} h={46} noId><Deaerator x={290} y={410} w={120} h={36} headX={392} level={(dl - 1300) / 1100} /></Equip>
      <text x={330} y={434} textAnchor="middle" className="m-inner">DEA-01</text>
      <Val a="DEA-01" t="pressure" x={300} y={216} label="DEA pressure" w={98} />
      <Val a="DEA-01" t="temp" x={300} y={256} label="FW temp" w={98} />
      <Val a="DEA-01" t="level" x={300} y={296} label="FST level" w={98} />
      <Val a="DEA-01" t="do" x={300} y={336} label="DEA outlet DO" w={98} />

      {/* ---------- boiler feed pumps ---------- */}
      <Pipe d="M330 454 V520 H260 M330 520 H380 M260 520 V528 M320 520 V528 M380 520 V528" kind="water" w={5} speed={0.8} />
      <Pipe d="M260 580 V600 M320 580 V600 M380 580 V600 H234 V434 H220" kind="water" w={6} speed={1} />
      {[['BFP-A', 260, bfp[0]], ['BFP-B', 320, bfp[1]], ['BFP-C', 380, bfp[2]]].map(([a, x, o]) => <g key={a}>
        <Equip a={a} x={x - 18} y={536} w={36} h={36}><Pump x={x} y={554} r={18} on={o} dir={-90} /></Equip>
      </g>)}
      <Pipe d="M250 600 V470 H300 V452" kind="water" w={3} dashed />
      <Valve x={250} y={500} s={6} rot={90} open={0.5} />
      <Lbl x={258} y={505} size={9} muted>ARC</Lbl>
      <Val a="BFP-A" t="recirc_flow" x={190} y={612} label="BFP-A recirc (ARC)" w={110} />
      <Val a="BFP-A" t="current" x={190} y={654} label="BFP-A current" w={110} />
      <Val a="BFP-A" t="flow" x={190} y={696} label="BFP-A flow" w={110} />
      <Val a="BFP-B" t="current" x={304} y={612} label="BFP-B current" w={100} />
      <Val a="BFP-B" t="flow" x={304} y={654} label="BFP-B flow" w={100} />
      <Val a="BFP-B" t="dis_press" x={304} y={696} label="Discharge" w={100} />
      <Val a="BFP-C" t="current" x={408} y={612} label="BFP-C (standby)" w={100} />
      <Val a="BFP-A" t="scoop" x={408} y={654} label="BFP-A scoop" w={100} />
      <Val a="BFP-B" t="scoop" x={408} y={696} label="BFP-B scoop" w={100} />

      {/* ---------- HP heaters and feed line to economiser ---------- */}
      <Pipe d="M150 434 H130 M60 434 H16" kind="water" w={6} speed={1} />
      <Lbl x={16} y={426} size={9.5} muted>→ ECO</Lbl>
      {[['HPH-6', 60], ['HPH-5', 150]].map(([a, x]) => <g key={a}>
        <Equip a={a} x={x} y={420} w={70} h={28}><HX x={x} y={420} w={70} h={28} /></Equip>
        <Val a={a} t="fw_out" x={x - 4} y={458} label={`${a} FW out`} w={84} />
        <Val a={a} t="ttd" x={x - 4} y={500} label="TTD" w={84} />
        <Val a={a} t="ext_flow" x={x - 4} y={542} label="Extraction" w={84} />
      </g>)}

      {/* ---------- CW system and cooling tower ---------- */}
      <Pipe d="M812 252 H990 V480 H1004" kind="cw" w={7} speed={0.9} />
      <Pipe d="M1004 628 H860 M870 628 V616 M940 628 V616" kind="cw" w={7} speed={0.9} />
      <Pipe d="M870 584 V560 M940 584 V560 H824 V298 H812" kind="cw" w={7} speed={0.9} />
      {[['CWP-A', 870, cwp[0]], ['CWP-B', 940, cwp[1]]].map(([a, x, o]) => <Equip key={a} a={a} x={x - 16} y={584} w={32} h={32}><Pump x={x} y={600} r={16} on={o} dir={-90} /></Equip>)}
      <Val a="CWP-A" t="flow" x={830} y={656} label="CWP-A flow" w={86} />
      <Val a="CWP-A" t="current" x={830} y={698} label="CWP-A current" w={86} />
      <Val a="CWP-B" t="flow" x={920} y={656} label="CWP-B flow" w={86} />
      <Val a="CWP-B" t="current" x={920} y={698} label="CWP-B current" w={86} />
      <Equip a="CT-01" x={1010} y={470} w={252} h={170} noId><CoolingTower x={1010} y={470} w={252} h={170} /></Equip>
      <text x={1136} y={658} textAnchor="middle" className="m-id">CT-01 · 6-cell induced draught</text>
      {ctf.map((o, i) => { const x = 1031 + i * 42; return <Equip key={i} a={`CTF-${i + 1}`} x={x - 14} y={430} w={28} h={24}><Fan x={x} y={442} r={12} on={o} speed={1.4} /></Equip>; })}
      <Val a="CT-01" t="fans_on" x={1012} y={262} label="Cells in service" w={124} />
      <Val a="CT-01" t="approach" x={1140} y={262} label="Approach" w={124} />
      <Val a="CT-01" t="range" x={1012} y={304} label="Range" w={124} />
      <Val a="CT-01" t="cold_water" x={1140} y={304} label="Cold water" w={124} />
      <Val a="CT-01" t="wet_bulb" x={1012} y={346} label="Wet bulb" w={124} />
      <Val a="CT-01" t="fan_kw" x={1140} y={346} label="CT fan power" w={124} />

      {/* ---------- DM and make-up ---------- */}
      <Equip a="DM-01" x={1060} y={676} w={70} h={40} noId><Box x={1060} y={676} w={70} h={40} title="DM-01" /></Equip>
      <Val a="DM-01" t="output" x={1136} y={666} label="DM output" w={64} />
      <Val a="DM-01" t="cond" x={1204} y={666} label="MB cond" w={64} />
      <Val a="MKU-01" t="flow" x={1136} y={704} label="Make-up" w={64} />
      <Val a="MKU-01" t="cst" x={1204} y={704} label="CST level" w={64} />
    </Mimic>
  );
}

/* =====================================================================================
   Live heat balance vs design
   ===================================================================================== */

/* --- simple steam-table approximations (kJ/kg, bar(a), °C) --- */
const interp = (tab, x) => { if (x <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) { const [x0, y0] = tab[i - 1], [x1, y1] = tab[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } const [x0, y0] = tab[tab.length - 2], [x1, y1] = tab[tab.length - 1]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); };
const HF = [[0, 0], [25, 104.8], [50, 209.3], [75, 314], [100, 419.1], [125, 525], [150, 632.2], [175, 741.2], [200, 852.4], [225, 966.8], [250, 1085.8], [275, 1210], [300, 1344], [325, 1491]];
const TSAT = [[0.05, 32.9], [0.1, 45.8], [0.2, 60.1], [0.5, 81.3], [1, 99.6], [2, 120.2], [5, 151.8], [10, 179.9], [20, 212.4], [50, 263.9], [100, 311], [150, 342.2]].map(([p, t]) => [Math.log(p), t]);
const tsat = P => interp(TSAT, Math.log(Math.max(0.02, P)));
const hfg = T => 2501 - 2.37 * T;
const hw = (T, P = 0) => interp(HF, T) + 0.06 * P;                         // compressed / saturated liquid
const hwet = (T, x) => interp(HF, T) + x * hfg(T);                          // wet steam
const hs = (P, T) => { const Ts = tsat(P); if (T <= Ts + 2) return hwet(Ts, 1); return 2501 + 1.85 * T + 0.00028 * T * T - P * 2.46 * Math.pow(608 / (T + 273), 2.4); };

/** Heat balance from a tag getter g(asset, tag) → number. Used twice: with live values and with design values. */
function heatBalance(g) {
  const ms = g('BLR-01', 'ms_flow'), msP = g('BLR-01', 'ms_press'), msT = g('BLR-01', 'ms_temp');
  const crhP = g('TG-01', 'crh_press'), hpP = g('TG-01', 'hp_ext'), ipP = g('TG-01', 'ip_ext'), lpP = g('TG-01', 'lp_ext');
  const x6 = g('HPH-6', 'ext_flow'), x5 = g('HPH-5', 'ext_flow');
  const x3 = g('LPH-3', 'ext_flow'), x2 = g('LPH-2', 'ext_flow'), x1 = g('LPH-1', 'ext_flow');
  const shS = g('ATT-01', 'sh_spray'), rhS = g('ATT-01', 'rh_spray');
  const S = {};
  S.ms = { F: ms, P: msP, T: msT, h: hs(msP, msT) };
  const crhT = msT - 203 + 3 * (crhP - 28);
  S.crh = { F: ms - x6 - x5, P: crhP, T: crhT, h: hs(crhP, crhT), calc: 'FT' };
  const hrhT = g('BLR-01', 'rh_temp'), hrhP = crhP * 0.92;
  S.hrh = { F: S.crh.F + rhS, P: hrhP, T: hrhT, h: hs(hrhP, hrhT), calc: 'FP' };
  const hpT = msT - 133 + 2.5 * (hpP - 42);
  S.x6 = { F: x6, P: hpP, T: hpT, h: hs(hpP, hpT), calc: 'T' };
  S.x5 = { F: x5, P: crhP, T: crhT, h: S.crh.h, calc: 'T' };
  const ipT = hrhT - 206 + 6 * (ipP - 7.2);
  const p3 = ipP * 0.36, t3 = tsat(p3) + 75;
  S.x3 = { F: x3, P: p3, T: t3, h: hs(p3, t3), calc: 'PT' };
  const t2 = tsat(lpP) + 8;
  S.x2 = { F: x2, P: lpP, T: t2, h: hs(lpP, t2), calc: 'T' };
  const p1 = lpP * 0.32, t1 = tsat(p1);
  S.x1 = { F: x1, P: p1, T: t1, h: hwet(t1, 0.97), calc: 'PTh' };
  const bp = g('COND-01', 'back_pressure'), tc = tsat(bp / 100);
  const cepF = g('CEP-A', 'flow') + g('CEP-B', 'flow'), mku = g('MKU-01', 'flow');
  S.exh = { F: cepF - x1 - x2 - x3 - mku, P: bp / 100, T: tc, h: hwet(tc, 0.925), calc: 'Fh' };
  const cepP = Math.max(g('CEP-A', 'dis_press'), g('CEP-B', 'dis_press'));
  S.cep = { F: cepF, P: cepP, T: tc - 0.5, h: hw(tc - 0.5, cepP), calc: 'T' };
  const t3o = g('LPH-3', 'fw_out');
  S.todea = { F: cepF, P: cepP - 4, T: t3o, h: hw(t3o, cepP - 4), calc: 'P' };
  const deaT = g('DEA-01', 'temp'), deaP = g('DEA-01', 'pressure');
  const bfpF = g('BFP-A', 'flow') + g('BFP-B', 'flow') + g('BFP-C', 'flow');
  const bfpP = Math.max(g('BFP-A', 'dis_press'), g('BFP-B', 'dis_press'), g('BFP-C', 'dis_press'));
  const hIp = hs(ipP, ipT), hOut = hw(deaT, deaP), hDr = hw(deaT + 7, deaP);
  S.xd = { F: Math.max(0, (cepF * (hOut - S.todea.h) + (x6 + x5) * (hOut - hDr)) / (hIp - hOut)), P: ipP, T: ipT, h: hIp, calc: 'FT' };
  S.fw = { F: bfpF, P: bfpP, T: deaT, h: hw(deaT, bfpP) };
  const t5 = g('HPH-5', 'fw_out'), t6 = g('HPH-6', 'fw_out');
  S.fw5 = { F: bfpF, P: bfpP - 3, T: t5, h: hw(t5, bfpP - 3), calc: 'P' };
  S.fw6 = { F: bfpF - shS, P: bfpP - 6, T: t6, h: hw(t6, bfpP - 6), calc: 'FP' };
  S.sh = { F: shS, T: deaT, h: hw(deaT, bfpP) };
  S.rh = { F: rhS, T: deaT, h: hw(deaT, 60) };
  S.qin = (ms * (S.ms.h - S.fw6.h) + S.hrh.F * (S.hrh.h - S.crh.h)) / 3600;   // MWth
  S.mw = g('GEN-01', 'mw');
  S.ssc = S.mw > 0 ? ms / S.mw : 0;                                              // t/MWh = kg/kWh
  return S;
}

const FLOWU = ['t/h', 'MW', 'MWth', 'm³/h', 'kW', 'A', 'MVAr'];
const SLIDE = { 'TG-01': ['hp_ext', 'crh_press', 'ip_ext', 'lp_ext'], 'DEA-01': ['pressure'] };

const STC = { good: 'var(--m-muted)', warn: '#e8a317', bad: 'var(--bad)' };
const f0 = (v, d) => (v == null || !isFinite(v) ? '—' : v.toFixed(d));
const decOf = (k, v) => (k === 'F' ? (Math.abs(v) < 100 ? 1 : 0) : k === 'P' ? (Math.abs(v) < 1 ? 3 : Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0) : k === 'T' ? (Math.abs(v) < 100 ? 1 : 0) : 0);

/** Stream data block: F, P, T, h live | design | deviation. */
function SBox({ x, y, title, a, s, d, keys = 'FPTh', w = 124, lead }) {
  const m = useMimic();
  const units = { F: 't/h', P: 'bar', T: '°C', h: 'kJ/kg' };
  const rows = keys.split('').filter(k => s[k] != null);
  const H = 17 + rows.length * 12 + 3;
  return <g onClick={e => { e.stopPropagation(); m.select(a); }} style={{ cursor: 'pointer' }}>
    {lead && <><line x1={lead[0]} y1={lead[1]} x2={lead[2]} y2={lead[3]} className="m-glyph" strokeDasharray="1.5 2.5" opacity=".8" /><circle cx={lead[2]} cy={lead[3]} r="2.4" className="m-hub" /></>}
    <rect x={x} y={y} width={w} height={H} rx="4" style={{ fill: 'var(--bg)', stroke: 'var(--m-eq-3)' }} />
    <text x={x + 6} y={y + 12} className="m-text" style={{ fontSize: 9.5, fontWeight: 650 }}>{title}</text>
    {rows.map((k, i) => {
      const lv = s[k], dv = d[k]; const yy = y + 26 + i * 12; const calc = (s.calc || '').includes(k);
      let dl = '', st = 'good';
      if (k === 'T') { const dd = lv - dv; dl = `${dd >= 0 ? '+' : ''}${dd.toFixed(1)}`; st = Math.abs(dd) > 8 ? 'bad' : Math.abs(dd) > 3 ? 'warn' : 'good'; }
      else if (Math.abs(dv) > 1e-6) { const p = (lv / dv - 1) * 100; dl = Math.abs(p) >= 100 ? (p > 0 ? '>+99%' : '<−99%') : `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`; st = Math.abs(p) > 5 ? 'bad' : Math.abs(p) > 2 ? 'warn' : 'good'; }
      else dl = '—';
      const dk = decOf(k, dv);
      return <g key={k}>
        <text x={x + 6} y={yy} className="m-val-l" style={{ fontSize: 9 }}>{k}{calc ? '*' : ''}</text>
        <text x={x + 48} y={yy} textAnchor="end" className="m-text" style={{ fontSize: 9.5, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }} key={m.tick}>{f0(lv, dk)}</text>
        <text x={x + 82} y={yy} textAnchor="end" className="m-text muted" style={{ fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>{f0(dv, dk)}</text>
        <text x={x + w - 5} y={yy} textAnchor="end" style={{ fontSize: 9, fontWeight: 600, fill: STC[st], fontVariantNumeric: 'tabular-nums' }}>{dl}</text>
      </g>;
    })}
  </g>;
}

function HBDBody() {
  const m = useMimic();
  const L = (() => { const r = m.read('GEN-01', 'mw'); return r.v && r.def?.base ? r.v / r.def.base : 1; })();
  const live = (a, t) => m.read(a, t).v ?? 0;
  const design = (a, t) => {
    const r = m.read(a, t); const def = r.def; if (!def) return 0;
    if (a === 'GEN-01' && t === 'mw') return r.v ?? def.base;
    if (FLOWU.includes(def.unit) || (SLIDE[a] || []).includes(t)) return def.base * L;
    return def.base;
  };
  const S = heatBalance(live), D = heatBalance(design);

  /* ---- heat-rate deviation method (kcal/kWh) ---- */
  const thrD = m.read('TG-01', 'thr').def.base * (1 + 0.25 * (1 - L) ** 2);
  const effD = design('BLR-01', 'eff'), apcD = design('UAT-01', 'apc'), apc = live('UAT-01', 'apc');
  const bpD = design('COND-01', 'back_pressure') + 0.35 * (live('COND-01', 'cw_in') - design('COND-01', 'cw_in'));
  const tVac = thrD * 0.012 * (live('COND-01', 'back_pressure') - bpD);
  const tSpray = 0.6 * (live('ATT-01', 'sh_spray') - design('ATT-01', 'sh_spray')) + 2.0 * (live('ATT-01', 'rh_spray') - design('ATT-01', 'rh_spray'));
  const tFw = 0.5 * (design('HPH-6', 'fw_out') - live('HPH-6', 'fw_out'));
  const tSt = 0.62 * (design('BLR-01', 'ms_temp') - live('BLR-01', 'ms_temp')) + 0.52 * (design('BLR-01', 'rh_temp') - live('BLR-01', 'rh_temp'));
  const thr = thrD + tVac + tSpray + tFw + tSt;
  const ubcL = (fly, bot) => live('CHP-01', 'ash') * (0.8 * fly / (100 - fly) + 0.2 * bot / (100 - bot)) * 8080 / Math.max(2000, live('CHP-01', 'gcv'));
  const bDfg = (live('APH-01', 'gas_out') - design('APH-01', 'gas_out')) / 20 + 0.3 * (live('BLR-01', 'o2') - design('BLR-01', 'o2'));
  const bUbc = ubcL(live('ASH-01', 'ubc_fly'), live('ASH-01', 'ubc_bottom')) - ubcL(design('ASH-01', 'ubc_fly'), design('ASH-01', 'ubc_bottom'));
  const eff = effD - bDfg - bUbc;
  const ghr = thr / (eff / 100), nhr = ghr / (1 - apc / 100);
  const ghrD = thrD / (effD / 100), nhrD = ghrD / (1 - apcD / 100);
  const k = 1 / ((eff / 100) * (1 - apc / 100));
  const losses = [
    ['Dry flue gas (APH exit, O₂)', nhr * bDfg / eff, 'APH-01'],
    ['Unburnt carbon', nhr * bUbc / eff, 'ASH-01'],
    ['Condenser vacuum', tVac * k, 'COND-01'],
    ['SH / RH spray', tSpray * k, 'ATT-01'],
    ['Final FW temperature', tFw * k, 'HPH-6'],
    ['MS / RH temperature', tSt * k, 'BLR-01'],
    ['Auxiliary power', ghr * (1 / (1 - apc / 100) - 1 / (1 - apcD / 100)), 'UAT-01'],
  ];
  const sumL = losses.reduce((s, l) => s + l[1], 0);
  losses.push(['Interaction / other', nhr - nhrD - sumL, null]);
  const maxL = Math.max(30, ...losses.map(l => Math.abs(l[1])));

  const cy = 120;
  const PX = 1030, PW = 238;
  const sumRows = [
    ['Gross load', S.mw, D.mw, 'MW', 1, 'GEN-01'],
    ['Turbine heat rate', thr, thrD, 'kcal/kWh', 0, 'TG-01'],
    ['Boiler efficiency', eff, effD, '%', 2, 'BLR-01'],
    ['Gross heat rate', ghr, ghrD, 'kcal/kWh', 0, 'BLR-01'],
    ['Net heat rate', nhr, nhrD, 'kcal/kWh', 0, 'UAT-01'],
    ['Aux power (APC)', apc, apcD, '%', 2, 'UAT-01'],
    ['Condenser back pressure', live('COND-01', 'back_pressure'), bpD, 'kPa', 2, 'COND-01'],
    ['Final FW temperature', live('HPH-6', 'fw_out'), design('HPH-6', 'fw_out'), '°C', 1, 'HPH-6'],
    ['Cycle heat added', S.qin, D.qin, 'MWth', 1, 'BLR-01'],
    ['Steam rate', S.ssc, D.ssc, 'kg/kWh', 3, 'BLR-01'],
  ];
  const better = { 'Boiler efficiency': 'up', 'Final FW temperature': 'up', 'Gross load': null };

  return <g>
    {/* ---------- cycle drawing ---------- */}
    <rect x={16} y={14} width={84} height={340} rx="6" fill="url(#m-metal)" className="m-body" /><rect x={16} y={14} width={84} height={340} rx="6" className="m-edge" />
    <path d="M30 300 Q58 250 86 300" fill="url(#m-flame)" className="m-flame" />
    <Pendant x={28} y={40} w={60} h={40} pitch={8} /><Pendant x={28} y={110} w={60} h={40} pitch={8} />
    <Serpentine x={30} y={180} w={56} h={40} pitch={8} />
    <text x={58} y={98} textAnchor="middle" className="m-sub">SH</text><text x={58} y={168} textAnchor="middle" className="m-sub">RH</text><text x={58} y={236} textAnchor="middle" className="m-sub">ECO</text>
    <text x={58} y={340} textAnchor="middle" className="m-id">BLR-01</text>
    <Pipe d={`M100 26 H430 V${cy - 28} H450`} kind="steam" w={6} speed={1.3} />
    <Pipe d={`M392 ${cy - 36} V52 H100`} kind="steam" w={5} speed={1.1} />
    <Pipe d={`M100 84 H290 V${cy} H300`} kind="steam" w={7} speed={1.6} />
    <Pipe d={`M548 ${cy - 42} V64 H700 V${cy - 28}`} kind="steam" w={7} speed={1.2} />
    <line x1={296} y1={cy} x2={972} y2={cy} className="m-edge" style={{ strokeWidth: 3 }} />
    <Equip a="TG-01" x={300} y={cy - 65} w={620} h={130} noId>
      <TurbSec x={300} w={100} cy={cy} h0={44} h1={76} />
      <TurbSec x={450} w={110} cy={cy} h0={56} h1={90} />
      <TurbSec x={600} w={100} cy={cy} h0={130} h1={50} />
      <TurbSec x={700} w={100} cy={cy} h0={50} h1={130} />
    </Equip>
    {[[302, 'HP'], [452, 'IP'], [602, 'LP']].map(([x, t]) => <text key={t} x={x + 3} y={cy + 4} className="m-inner" style={{ fontSize: 10 }}>{t}</text>)}
    <Equip a="GEN-01" x={850} y={cy - 30} w={100} h={60} noId><TurboGen x={850} y={cy - 30} w={92} h={60} /></Equip>
    <Val a="GEN-01" t="mw" x={850} y={cy + 44} label="Gross MW" w={100} />
    {/* extractions */}
    <Pipe d={`M340 ${cy + 26} V440 H165 V470`} kind="steam" w={4} speed={0.8} />
    <Pipe d={`M385 ${cy + 34} V455 H275 V470`} kind="steam" w={4} speed={0.8} />
    <Pipe d={`M470 ${cy + 30} V452`} kind="steam" w={4} speed={0.8} />
    <Pipe d={`M606 ${cy + 62} V430 H555 V470`} kind="steam" w={4} speed={0.8} />
    <Pipe d={`M640 ${cy + 50} V470`} kind="steam" w={4} speed={0.8} />
    <Pipe d={`M720 ${cy + 30} V470`} kind="steam" w={4} speed={0.8} />
    {/* condenser */}
    <Equip a="COND-01" x={760} y={230} w={140} h={90} noId><Condenser x={760} y={230} w={128} h={60} neckX={770} neckW={56} neckTop={cy + 62} level={0.5} /></Equip>
    <text x={824} y={264} textAnchor="middle" className="m-inner">COND-01</text>
    <Pipe d="M900 246 H930 M930 276 H900" kind="cw" w={3} arrow />
    <Lbl x={936} y={250} size={9} muted>CW out</Lbl><Lbl x={936} y={280} size={9} muted>CW in</Lbl>
    {/* condensate and feed */}
    <Pipe d="M870 314 V560" kind="condensate" w={5} speed={0.8} />
    <Equip a="CEP-A" x={854} y={560} w={32} h={32} noId><Pump x={870} y={576} r={16} dir={-90} /></Equip>
    <text x={870} y={608} textAnchor="middle" className="m-id">CEP</text>
    <Pipe d="M886 576 H900 V600 H820 V484 H790" kind="condensate" w={5} speed={0.9} />
    <Pipe d="M720 484 H690 M620 484 H590 M520 484 H490" kind="condensate" w={5} speed={0.9} />
    {[['LPH-1', 720], ['LPH-2', 620], ['LPH-3', 520]].map(([a, x]) => <Equip key={a} a={a} x={x} y={470} w={70} h={28}><HX x={x} y={470} w={70} h={28} /></Equip>)}
    <Equip a="DEA-01" x={360} y={446} w={130} h={56} noId><Deaerator x={360} y={466} w={130} h={36} headX={457} /></Equip>
    <text x={410} y={488} textAnchor="middle" className="m-inner">DEA</text>
    <Pipe d="M420 504 V560" kind="water" w={5} />
    <Equip a="BFP-A" x={402} y={562} w={36} h={36} noId><Pump x={420} y={580} r={18} dir={-90} /></Equip>
    <text x={420} y={612} textAnchor="middle" className="m-id">BFP A/B/C</text>
    <Pipe d="M438 580 H452 V620 H330 V484 H310" kind="water" w={6} speed={1} />
    <Pipe d="M240 484 H200" kind="water" w={6} speed={1} />
    {[['HPH-5', 240], ['HPH-6', 130]].map(([a, x]) => <Equip key={a} a={a} x={x} y={470} w={70} h={28}><HX x={x} y={470} w={70} h={28} /></Equip>)}
    <Pipe d="M130 484 H58 V354" kind="water" w={6} speed={1} />

    {/* ---------- stream boxes ---------- */}
    <SBox x={110} y={92} title="Main steam" a="BLR-01" s={S.ms} d={D.ms} />
    <SBox x={110} y={158} title="Cold reheat (to RH)" a="TG-01" s={S.crh} d={D.crh} />
    <SBox x={110} y={224} title="Hot reheat (to IP)" a="BLR-01" s={S.hrh} d={D.hrh} />
    <SBox x={110} y={290} title="Ext → HPH-6" a="HPH-6" s={S.x6} d={D.x6} lead={[230, 330, 340, 330]} />
    <SBox x={110} y={356} title="Ext (CRH) → HPH-5" a="HPH-5" s={S.x5} d={D.x5} lead={[230, 400, 385, 400]} />
    <SBox x={476} y={196} title="Ext IP → deaerator" a="DEA-01" s={S.xd} d={D.xd} lead={[478, 230, 470, 230]} />
    <SBox x={476} y={268} title="Ext → LPH-3" a="LPH-3" s={S.x3} d={D.x3} lead={[600, 300, 606, 300]} />
    <SBox x={474} y={512} title="Condensate → DEA" a="LPH-3" s={S.todea} d={D.todea} lead={[500, 512, 500, 484]} />
    <SBox x={606} y={512} title="Ext → LPH-2" a="LPH-2" s={S.x2} d={D.x2} lead={[640, 512, 640, 498]} />
    <SBox x={756} y={614} title="Ext → LPH-1" a="LPH-1" s={S.x1} d={D.x1} lead={[770, 614, 755, 498]} />
    <SBox x={892} y={300} title="LP exhaust → cond." a="COND-01" s={S.exh} d={D.exh} />
    <SBox x={892} y={444} title="Condensate (CEP)" a="CEP-A" s={S.cep} d={D.cep} lead={[892, 470, 870, 470]} />
    <SBox x={276} y={636} title="FW · BFP discharge" a="BFP-A" s={S.fw} d={D.fw} lead={[400, 650, 452, 620]} />
    <SBox x={202} y={512} title="FW after HPH-5" a="HPH-5" s={S.fw5} d={D.fw5} lead={[250, 512, 250, 498]} />
    <SBox x={72} y={512} title="FW to ECO (HPH-6)" a="HPH-6" s={S.fw6} d={D.fw6} lead={[120, 512, 120, 484]} />
    <SBox x={16} y={636} title="SH spray" a="ATT-01" s={S.sh} d={D.sh} keys="FT" />
    <SBox x={146} y={636} title="RH spray" a="ATT-01" s={S.rh} d={D.rh} keys="F" />
    <g>
      <text x={470} y={664} className="m-text" style={{ fontSize: 9.5, fontWeight: 650 }}>Each block: live · design at this load · Δ</text>
      <text x={470} y={678} className="m-text muted" style={{ fontSize: 9 }}>Δ in °C for T, in % for F, P, h · design = basis × L</text>
      <text x={470} y={691} className="m-text muted" style={{ fontSize: 9 }}>for flows and extraction pressures · * calculated</text>
      <text x={470} y={704} className="m-text muted" style={{ fontSize: 9 }}>L = {L.toFixed(3)} · F t/h · P bar(a) · T °C · h kJ/kg</text>
    </g>

    {/* ---------- summary panel ---------- */}
    <rect x={PX} y={14} width={PW} height={712} rx="8" style={{ fill: 'var(--bg)', stroke: 'var(--m-eq-3)' }} />
    <text x={PX + 12} y={34} className="m-title">Unit performance</text>
    <text x={PX + 12} y={50} className="m-text muted" style={{ fontSize: 9.5 }}>live · design at {S.mw.toFixed(1)} MW · Δ</text>
    {sumRows.map(([nm, lv, dv, u, dec, a], i) => {
      const y = 66 + i * 34; const dd = lv - dv; const p = dv ? dd / dv * 100 : 0;
      const dir = better[nm] === undefined ? 'down' : better[nm];
      const worse = dir === 'down' ? dd > 0 : dir === 'up' ? dd < 0 : false;
      const st = !dir ? 'good' : !worse ? 'good' : Math.abs(p) > 2 ? 'bad' : Math.abs(p) > 0.6 ? 'warn' : 'good';
      return <g key={nm} onClick={() => a && m.select(a)} style={{ cursor: 'pointer' }}>
        <text x={PX + 12} y={y + 10} className="m-val-l" style={{ fontSize: 9.5 }}>{nm}</text>
        <text x={PX + 12} y={y + 26} className="m-text" style={{ fontSize: 14, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }} key={m.tick}>{f0(lv, dec)}<tspan className="m-val-u"> {u}</tspan></text>
        <text x={PX + 160} y={y + 26} textAnchor="end" className="m-text muted" style={{ fontSize: 10.5, fontVariantNumeric: 'tabular-nums' }}>{f0(dv, dec)}</text>
        <text x={PX + PW - 10} y={y + 26} textAnchor="end" style={{ fontSize: 10.5, fontWeight: 650, fill: STC[st], fontVariantNumeric: 'tabular-nums' }}>{dd >= 0 ? '+' : ''}{f0(dd, dec)}</text>
        <line x1={PX + 10} y1={y + 32} x2={PX + PW - 10} y2={y + 32} className="m-gridline" style={{ stroke: 'var(--m-eq-3)', opacity: 0.5 }} />
      </g>;
    })}
    <text x={PX + 12} y={420} className="m-title" style={{ fontSize: 11.5 }}>Net heat rate losses</text>
    <text x={PX + 12} y={434} className="m-text muted" style={{ fontSize: 9.5 }}>kcal/kWh against design · total {nhr - nhrD >= 0 ? '+' : ''}{(nhr - nhrD).toFixed(0)}</text>
    {losses.map(([nm, v, a], i) => {
      const y = 446 + i * 34; const bw = 120 * Math.min(1, Math.abs(v) / maxL);
      const st = v > 10 ? 'bad' : v > 3 ? 'warn' : 'good';
      return <g key={nm} onClick={() => a && m.select(a)} style={{ cursor: a ? 'pointer' : 'default' }}>
        <text x={PX + 12} y={y + 10} className="m-val-l" style={{ fontSize: 9.5 }}>{nm}</text>
        <rect x={PX + 12} y={y + 15} width={150} height={10} rx="2" className="m-g-track-r" />
        <rect x={PX + 12} y={y + 15} width={Math.max(1, bw * 1.25)} height={10} rx="2" style={{ fill: st === 'good' ? 'var(--m-edge)' : STC[st] }} />
        <text x={PX + PW - 10} y={y + 24} textAnchor="end" style={{ fontSize: 11, fontWeight: 650, fill: st === 'good' ? 'var(--m-text)' : STC[st], fontVariantNumeric: 'tabular-nums' }} key={m.tick}>{v >= 0 ? '+' : ''}{v.toFixed(1)}</text>
      </g>;
    })}
  </g>;
}

function HBD({ c }) {
  return <Mimic c={c} w={1280} h={740} note="live vs design at current load">
    <HBDBody />
  </Mimic>;
}

export default { 'boiler-scada': BoilerScada, 'turbine-scada': TurbineScada, hbd: HBD };
