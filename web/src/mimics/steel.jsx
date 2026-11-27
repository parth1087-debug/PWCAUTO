/* Steel (Konark Steel): ironmaking (blast furnace, DRI kiln, pellet plant), induction furnace and bar mill. */
import React from 'react';
import { Mimic, Equip, Val, Pipe, Drum, Fan, Box, Tank, Pump, Valve, Flame, Lbl, Title, Zone, Conveyor, Motor, MiniTrend, BarInd, Gauge, HX, Transformer, useLive, useMimic } from './kit.jsx';

/* ---------------- local shapes ---------------- */
const arrowGlyph = (d, k) => <path key={k} d={d} className="m-glyph" markerEnd="url(#m-arrow)" />;

/** Blast furnace profile: top hopper, throat, stack, belly, bosh, hearth. cx = centre line. */
function BFProfile({ cx }) {
  const Y = { th: 160, sb: 360, be: 385, bo: 445, he: 530 }, W = { th: 45, be: 92, he: 76 };
  const prof = i => `M${cx - W.th + i} ${Y.th + i} L${cx - W.be + i} ${Y.sb} L${cx - W.be + i} ${Y.be} L${cx - W.he + i} ${Y.bo} L${cx - W.he + i} ${Y.he - i - 10} Q${cx - W.he + i} ${Y.he - i} ${cx - W.he + i + 10} ${Y.he - i} L${cx + W.he - i - 10} ${Y.he - i} Q${cx + W.he - i} ${Y.he - i} ${cx + W.he - i} ${Y.he - i - 10} L${cx + W.he - i} ${Y.bo} L${cx + W.be - i} ${Y.be} L${cx + W.be - i} ${Y.sb} L${cx + W.th - i} ${Y.th + i} Z`;
  const bands = Array.from({ length: 11 }).map((_, i) => Y.th + 12 + i * 20);
  return <g className="m-shape">
    {/* charging top: cone, bell-less hopper */}
    <path d={`M${cx - W.th} ${Y.th} L${cx - 28} ${Y.th - 26} H${cx + 28} L${cx + W.th} ${Y.th} Z`} className="m-body" />
    <path d={`M${cx - W.th} ${Y.th} L${cx - 28} ${Y.th - 26} H${cx + 28} L${cx + W.th} ${Y.th} Z`} className="m-edge" />
    <path d={`M${cx - 34} ${Y.th - 76} H${cx + 34} L${cx + 12} ${Y.th - 32} H${cx - 12} Z`} fill="url(#m-metal)" className="m-body" />
    <path d={`M${cx - 34} ${Y.th - 76} H${cx + 34} L${cx + 12} ${Y.th - 32} H${cx - 12} Z`} className="m-edge" />
    <rect x={cx - 8} y={Y.th - 32} width={16} height={8} className="m-body" /><rect x={cx - 8} y={Y.th - 32} width={16} height={8} className="m-edge" />
    {/* shell, refractory lining, burden */}
    <path d={prof(0)} fill="url(#m-metal)" className="m-body" />
    <clipPath id="bf-in"><path d={prof(9)} /></clipPath>
    <path d={prof(9)} className="m-body" opacity=".55" />
    <g clipPath="url(#bf-in)">
      {bands.map((y, i) => <rect key={i} x={cx - 100} y={y} width={200} height={10} className="m-edge" style={{ fill: 'var(--m-edge)', stroke: 'none', opacity: i % 2 ? 0.08 : 0.18 }} />)}
      <path d={`M${cx - 70} ${Y.be + 10} Q${cx} ${Y.sb - 60} ${cx + 70} ${Y.be + 10}`} className="m-glyph" strokeDasharray="4 4" />
      <rect x={cx - 90} y={Y.he - 50} width={180} height={50} fill="url(#m-hot)" opacity=".7" />
      <rect x={cx - 90} y={Y.he - 62} width={180} height={12} style={{ fill: 'var(--m-flue)' }} opacity=".7" />
    </g>
    <path d={prof(9)} className="m-edge" />
    <path d={prof(0)} className="m-edge" />
    {/* cooling staves marks on stack */}
    {[200, 240, 280, 320].map(y => { const f = (y - Y.th) / (Y.sb - Y.th); const hw = W.th + (W.be - W.th) * f; return <g key={y}><line x1={cx - hw - 4} y1={y} x2={cx - hw + 2} y2={y} className="m-edge" /><line x1={cx + hw - 2} y1={y} x2={cx + hw + 4} y2={y} className="m-edge" /></g>; })}
    {/* raceway flames at tuyeres */}
    <Flame x={cx - 62} y={Y.bo + 22} s={9} /><Flame x={cx + 62} y={Y.bo + 22} s={9} />
    {/* support columns */}
    <line x1={cx - 110} y1={Y.sb + 10} x2={cx - 110} y2={Y.he + 20} className="m-edge" /><line x1={cx + 110} y1={Y.sb + 10} x2={cx + 110} y2={Y.he + 20} className="m-edge" />
    <line x1={cx - 130} y1={Y.he + 20} x2={cx + 130} y2={Y.he + 20} className="m-edge" />
  </g>;
}

/** Cowper hot blast stove: tall cylinder with dome, internal combustion chamber. */
function Stove({ x, y, w = 60, h = 270, on }) {
  const d = `M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <path d={d} fill="url(#m-metal-h)" className="m-body" />
    <line x1={x + w * 0.3} y1={y + w * 0.55} x2={x + w * 0.3} y2={y + h - 6} className="m-glyph" strokeDasharray="3 3" />
    {Array.from({ length: 8 }).map((_, i) => <line key={i} x1={x + w * 0.36} y1={y + 50 + i * 24} x2={x + w - 6} y2={y + 50 + i * 24} className="m-glyph" opacity=".35" />)}
    <path d={d} className="m-edge" />
    <circle cx={x + w * 0.8} cy={y + h - 12} r="3.5" className="m-run" />
  </g>;
}

/** Dust catcher: cylinder with cone and dust valve. */
function DustCatcher({ x, y, w = 90, h = 130 }) {
  const d = `M${x} ${y + 14} Q${x} ${y} ${x + w / 2} ${y} Q${x + w} ${y} ${x + w} ${y + 14} V${y + h * 0.62} L${x + w * 0.58} ${y + h} H${x + w * 0.42} L${x} ${y + h * 0.62} Z`;
  return <g className="m-shape"><path d={d} fill="url(#m-metal-h)" className="m-body" /><path d={d} className="m-edge" />
    <line x1={x + w / 2} y1={y - 6} x2={x + w / 2} y2={y + h * 0.55} className="m-glyph" strokeDasharray="3 3" />
    <line x1={x + 12} y1={y + h} x2={x + 2} y2={y + h + 26} className="m-edge" /><line x1={x + w - 12} y1={y + h} x2={x + w - 2} y2={y + h + 26} className="m-edge" />
  </g>;
}

/** Torpedo ladle car. */
function Torpedo({ x, y, w = 140, h = 36 }) {
  return <g className="m-shape">
    <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="url(#m-metal)" className="m-body" /><rect x={x} y={y} width={w} height={h} rx={h / 2} className="m-edge" />
    <rect x={x + w / 2 - 14} y={y - 10} width={28} height={12} className="m-body" /><rect x={x + w / 2 - 14} y={y - 10} width={28} height={12} className="m-edge" />
    <line x1={x + 8} y1={y + h + 6} x2={x + w - 8} y2={y + h + 6} className="m-edge" />
    {[0.15, 0.32, 0.68, 0.85].map(f => <circle key={f} cx={x + w * f} cy={y + h + 10} r="5" className="m-body" />)}
    {[0.15, 0.32, 0.68, 0.85].map(f => <circle key={'e' + f} cx={x + w * f} cy={y + h + 10} r="5" className="m-edge" />)}
  </g>;
}

/** Tilted balling disc (pan pelletiser) in side view with drive. */
function BallingDisc({ x, y, r = 50, on }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <g transform={`rotate(-48 ${x} ${y})`}>
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.34} fill="url(#m-metal)" className="m-body" />
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.34} className="m-edge" />
      <ellipse cx={x} cy={y - 4} rx={r * 0.86} ry={r * 0.26} className="m-glyph" />
      <g className="m-spin" style={{ transformOrigin: `${x}px ${y - 4}px`, animationDuration: '6s' }}>
        {[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx={x + Math.cos(i) * r * 0.5} cy={y - 4 + Math.sin(i) * r * 0.14} r="3.5" className="m-edge" style={{ fill: 'var(--m-mat)' }} />)}
      </g>
    </g>
    <line x1={x} y1={y} x2={x + 6} y2={y + r * 0.95} className="m-edge" />
    <path d={`M${x - 26} ${y + r + 8} L${x + 6} ${y + r * 0.95} L${x + 38} ${y + r + 8} Z`} className="m-body" /><path d={`M${x - 26} ${y + r + 8} L${x + 6} ${y + r * 0.95} L${x + 38} ${y + r + 8} Z`} className="m-edge" />
    <circle cx={x + r * 0.7} cy={y + r * 0.7} r="3.5" className="m-run" />
  </g>;
}

/** Induration hood segment (arched roof) for a travelling grate zone. */
function Hood({ x, w, y, h, label, up, fire }) {
  const d = `M${x} ${y + h} V${y + 14} Q${x} ${y} ${x + 14} ${y} H${x + w - 14} Q${x + w} ${y} ${x + w} ${y + 14} V${y + h}`;
  return <g className="m-shape">
    <path d={d + ' Z'} className="m-body" fill={fire ? 'url(#m-metal)' : undefined} />
    <path d={d} className="m-edge" />
    {fire && [0.25, 0.5, 0.75].map(f => <Flame key={f} x={x + w * f} y={y + h - 6} s={12} />)}
    {[0.3, 0.7].map(f => arrowGlyph(up ? `M${x + w * f} ${y + h + 26} V${y + h - 22}` : `M${x + w * f} ${y + h - 30} V${y + h + 34}`, f))}
    <text x={x + w / 2} y={y + 24} textAnchor="middle" className="m-inner">{label}</text>
  </g>;
}

/** Wind box under the grate (inverted trapezoid). */
function WindBox({ x, w, y, h = 56 }) {
  const d = `M${x + 3} ${y} H${x + w - 3} L${x + w / 2 + 12} ${y + h} H${x + w / 2 - 12} Z`;
  return <g className="m-shape"><path d={d} className="m-body" /><path d={d} className="m-edge" /></g>;
}

/** Induction furnace crucible in section: yoke, coil turns, rammed lining, melt bath, spout and lid. */
function IFCrucible({ x, y, w = 240, h = 300, on }) {
  const cx = x + w / 2;
  const turns = Array.from({ length: 12 }).map((_, i) => y + 50 + i * 19);
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    {/* steel frame and yokes */}
    <rect x={x} y={y + 20} width={w} height={h - 20} rx="4" fill="url(#m-metal)" className="m-body" /><rect x={x} y={y + 20} width={w} height={h - 20} rx="4" className="m-edge" />
    {[x + 6, x + w - 18].map(yx => <rect key={yx} x={yx} y={y + 40} width={12} height={h - 70} className="m-body" style={{ fill: 'var(--m-eq-3)' }} />)}
    {/* coil (copper tube, section) */}
    {turns.map(ty => <g key={ty}><rect x={x + 24} y={ty} width={16} height={13} rx="3" className="m-coil" style={{ fill: 'var(--m-eq-2)' }} /><rect x={x + w - 40} y={ty} width={16} height={13} rx="3" className="m-coil" style={{ fill: 'var(--m-eq-2)' }} /></g>)}
    {/* rammed refractory lining */}
    <path d={`M${x + 46} ${y + 30} V${h + y - 36} H${x + w - 46} V${y + 30}`} className="m-body" style={{ fill: 'var(--m-eq-2)' }} />
    {Array.from({ length: 14 }).map((_, i) => <line key={i} x1={x + 48} y1={y + 40 + i * 18} x2={x + 60} y2={y + 30 + i * 18} className="m-glyph" opacity=".4" />)}
    {Array.from({ length: 14 }).map((_, i) => <line key={'r' + i} x1={x + w - 60} y1={y + 40 + i * 18} x2={x + w - 48} y2={y + 30 + i * 18} className="m-glyph" opacity=".4" />)}
    {/* melt with meniscus */}
    <path d={`M${x + 62} ${y + 84} Q${cx} ${y + 54} ${x + w - 62} ${y + 84} V${h + y - 52} H${x + 62} Z`} fill="url(#m-hot)" opacity=".85" />
    <path d={`M${x + 62} ${y + 84} Q${cx} ${y + 54} ${x + w - 62} ${y + 84} V${h + y - 52} H${x + 62} Z`} className="m-edge" />
    {/* stirring arrows */}
    {arrowGlyph(`M${cx - 30} ${y + 200} q-20 -50 0 -80`, 'a1')}{arrowGlyph(`M${cx + 30} ${y + 120} q20 50 0 80`, 'a2')}
    {/* top ring, spout, lid */}
    <rect x={x - 6} y={y + 14} width={w + 12} height={14} rx="3" className="m-body" /><rect x={x - 6} y={y + 14} width={w + 12} height={14} rx="3" className="m-edge" />
    <path d={`M${x - 6} ${y + 14} L${x - 40} ${y + 6} L${x - 40} ${y + 16} L${x - 6} ${y + 28} Z`} className="m-body" /><path d={`M${x - 6} ${y + 14} L${x - 40} ${y + 6} L${x - 40} ${y + 16} L${x - 6} ${y + 28} Z`} className="m-edge" />
    <path d={`M${x + w - 10} ${y + 10} L${x + w + 40} ${y - 40}`} className="m-edge" strokeWidth="6" />
    <rect x={x + w - 4} y={y - 4} width={70} height={12} rx="3" transform={`rotate(-45 ${x + w} ${y + 8})`} className="m-body" />
    {/* tilt pivot and hydraulic cylinder */}
    <circle cx={x - 6} cy={y + 34} r="5" className="m-edge" />
    <line x1={x + w - 20} y1={y + h} x2={x + w + 10} y2={y + h + 50} className="m-edge" strokeWidth="8" opacity=".5" />
    <rect x={x - 20} y={y + h} width={w + 40} height={10} className="m-body" /><rect x={x - 20} y={y + h} width={w + 40} height={10} className="m-edge" />
    {/* bottom electrode for earth leakage detection */}
    <line x1={cx} y1={y + h - 52} x2={cx} y2={y + h + 10} className="m-edge" strokeWidth="2" />
  </g>;
}

/** Rolling stand: housing, two work rolls, spindle to drive motor below. */
function Stand({ x, y, on, vertical }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x - 13} y={y - 34} width={26} height={68} rx="3" fill="url(#m-metal)" className="m-body" /><rect x={x - 13} y={y - 34} width={26} height={68} rx="3" className="m-edge" />
    {vertical ? <><circle cx={x - 6} cy={y} r="6" className="m-body" /><circle cx={x - 6} cy={y} r="6" className="m-edge" /><circle cx={x + 6} cy={y} r="6" className="m-body" /><circle cx={x + 6} cy={y} r="6" className="m-edge" /></>
      : <><circle cx={x} cy={y - 8} r="7" className="m-body" /><circle cx={x} cy={y - 8} r="7" className="m-edge" /><circle cx={x} cy={y + 8} r="7" className="m-body" /><circle cx={x} cy={y + 8} r="7" className="m-edge" /></>}
    <line x1={x} y1={y + 34} x2={x} y2={y + 52} className="m-edge" />
    <rect x={x - 9} y={y + 52} width={18} height={16} rx="2" className="m-body" /><rect x={x - 9} y={y + 52} width={18} height={16} rx="2" className="m-edge" />
    <circle cx={x} cy={y + 80} r="10" className="m-body" /><circle cx={x} cy={y + 80} r="10" className="m-edge" /><text x={x} y={y + 84} textAnchor="middle" className="m-inner" style={{ fontSize: 9 }}>M</text>
    <circle cx={x + 8} cy={y + 88} r="2.5" className="m-run" />
  </g>;
}

/** Walking beam reheating furnace (side section) with zone burners and billets. */
function ReheatFurnace({ x, y, w = 280, h = 110 }) {
  const roof = `M${x} ${y + h} V${y + 30} L${x + w * 0.38} ${y + 18} L${x + w * 0.42} ${y} H${x + w} V${y + h} Z`;
  return <g className="m-shape">
    <path d={roof} fill="url(#m-metal)" className="m-body" /><path d={roof} className="m-edge" />
    <rect x={x + 10} y={y + 36} width={w - 20} height={h - 54} className="m-body" style={{ fill: 'var(--m-eq-2)' }} />
    {[0.38, 0.7].map(f => <line key={f} x1={x + w * f} y1={y + 20} x2={x + w * f} y2={y + h - 18} className="m-glyph" strokeDasharray="3 3" />)}
    {Array.from({ length: 13 }).map((_, i) => { const f = i / 12; return <rect key={i} x={x + 18 + i * ((w - 40) / 13)} y={y + h - 34} width={12} height={12} fill={f > 0.4 ? 'url(#m-hot)' : undefined} className="m-body" opacity={f > 0.4 ? 0.4 + f * 0.6 : 1} />; })}
    {Array.from({ length: 13 }).map((_, i) => <rect key={'e' + i} x={x + 18 + i * ((w - 40) / 13)} y={y + h - 34} width={12} height={12} className="m-edge" />)}
    <line x1={x + 14} y1={y + h - 20} x2={x + w - 14} y2={y + h - 20} className="m-edge" strokeWidth="2" />
    {[0.5, 0.62, 0.8, 0.92].map(f => <Flame key={f} x={x + w * f} y={y + 50} s={10} />)}
    <rect x={x + w * 0.16} y={y - 50} width={20} height={44} className="m-body" /><rect x={x + w * 0.16} y={y - 50} width={20} height={44} className="m-edge" />
  </g>;
}

/** Live axial temperature profile (kiln thermocouples) drawn as a small chart. */
function AxialProfile({ a, tags, x, y, w = 280, h = 140, min = 700, max = 1150 }) {
  const m = useMimic();
  const pts = tags.map(([t], i) => { const r = m.read(a, t); return { v: r.v, st: r.st, px: x + 30 + (i / (tags.length - 1)) * (w - 50), py: r.v == null ? y + h : y + h - 20 - ((r.v - min) / (max - min)) * (h - 40) }; });
  const lim = m.read(a, 'z7').def?.hi;
  const ly = lim != null ? y + h - 20 - ((lim - min) / (max - min)) * (h - 40) : null;
  return <g onClick={() => m.select(a)} style={{ cursor: 'pointer' }}>
    <rect x={x} y={y} width={w} height={h} rx="4" className="m-mini-bg" />
    <text x={x + 8} y={y + 14} className="m-val-l">Axial temperature profile · feed end → discharge</text>
    {[800, 900, 1000, 1100].map(v => { const yy = y + h - 20 - ((v - min) / (max - min)) * (h - 40); return <g key={v}><line x1={x + 28} y1={yy} x2={x + w - 10} y2={yy} className="m-gridline" style={{ stroke: 'var(--m-eq-3)', strokeOpacity: 0.5 }} /><text x={x + 24} y={yy + 3} textAnchor="end" className="m-val-l">{v}</text></g>; })}
    {ly != null && <line x1={x + 28} y1={ly} x2={x + w - 10} y2={ly} className="m-g-limline" strokeDasharray="4 3" />}
    <path d={'M' + pts.map(p => `${p.px} ${p.py}`).join(' L')} className="m-mini-l" strokeWidth="2" />
    {pts.map((p, i) => <g key={i}><circle cx={p.px} cy={p.py} r="3.5" className={`m-lamp ${p.st}`} /><text x={p.px} y={y + h - 6} textAnchor="middle" className="m-val-l">{tags[i][1]}</text></g>)}
  </g>;
}

/* ---------------- blast furnace ---------------- */
function BlastFurnace({ c }) {
  const run = useLive('BF-01', 'hb_flow', c).v > 500;
  const cx = 620;
  const stoves = [['STV-01', 50], ['STV-02', 140], ['STV-03', 230]];
  return (
    <Mimic c={c} w={1280} h={700}>
      <Title x={24} y={30}>Mini blast furnace · 450 m³</Title>
      <Zone x={28} y={44} w={292} h={590} label="Hot blast stoves" />
      {/* cold blast from turbo blower to stoves */}
      <Pipe d="M70 566 V522 H290" kind="air" w={8} speed={1.3} />
      {stoves.map(([, x]) => <Pipe key={x} d={`M${x + 45} 522 V472`} kind="air" w={6} speed={1.3} />)}
      <Equip a="BF-01" x={48} y={544} w={44} h={44} label="Turbo blower" sub="cold blast" noId><Fan x={70} y={566} r={22} on={run} speed={1.6} /></Equip>
      {/* hot blast main behind the stoves */}
      <Pipe d={`M60 420 H${cx - 140} V440 H${cx - 115}`} kind="hot" w={10} speed={1.2} />
      {stoves.map(([id, x], i) => <g key={id}>
        <Val a={id} t="waste_gas_temp" x={x - 8} y={86} w={76} label="Waste gas" />
        <Val a={id} t="dome_temp" x={x - 8} y={130} w={76} label="Dome" />
        <Equip a={id} x={x} y={200} w={60} h={270}><Stove x={x} y={200} on={run} /></Equip>
        <Lbl x={x + 30} y={330} anchor="middle" size={10} bold>Stove {i + 1}</Lbl>
      </g>)}
      {/* hot blast values */}
      <Lbl x={336} y={412} muted size={10}>Hot blast main → bustle pipe</Lbl>
      <Val a="BF-01" t="hb_flow" x={336} y={262} w={88} label="Blast flow" />
      <Val a="BF-01" t="hb_temp" x={428} y={262} w={88} label="Blast temp" />
      <Val a="BF-01" t="hb_press" x={336} y={306} w={88} label="Blast pressure" />
      <Val a="BF-01" t="o2_enrich" x={428} y={306} w={88} label="O₂ enrichment" />
      <Val a="BF-01" t="hm_rate" x={336} y={350} w={88} label="Hot metal" />
      {/* charging conveyor */}
      <Conveyor x={404} y={172} len={196} angle={-23} on={run} />
      <Lbl x={344} y={204} muted size={10}>Charging conveyor · coke, sinter, pellets</Lbl>
      {/* furnace */}
      <Pipe d={`M${cx - 115} 440 A115 11 0 0 1 ${cx + 115} 440`} kind="hot" w={8} flow={false} />
      <Equip a="BF-01" x={cx - 92} y={84} w={184} h={446} label="Blast furnace · 450 m³" sub="1 taphole · 14 tuyeres">
        <BFProfile cx={cx} />
      </Equip>
      {[['Throat', 178], ['Stack', 262], ['Belly', 376], ['Bosh', 420], ['Hearth', 506]].map(([t, y]) => <Lbl key={t} x={cx} y={y} anchor="middle" size={10} muted>{t}</Lbl>)}
      {/* bustle pipe and tuyeres */}
      <Pipe d={`M${cx - 115} 440 A115 11 0 0 0 ${cx + 115} 440`} kind="hot" w={8} flow={false} />
      {[-1, 1].map(s => <Pipe key={s} d={`M${cx + s * 104} 448 L${cx + s * 80} 462`} kind="hot" w={5} flow={false} />)}
      {/* PCI */}
      <Equip a="PCI-01" x={350} y={560} w={100} h={50} label="Coal injection" sub="lances in 14 tuyeres"><Box x={350} y={560} w={100} h={50} title="PCI" /></Equip>
      <Pipe d={`M450 576 H${cx - 96} V470`} kind="material" w={4} speed={1.2} />
      <Val a="PCI-01" t="coal_rate" x={470} y={606} w={92} />
      <Val a="PCI-01" t="pci_rate" x={470} y={650} w={92} label="PCI rate" />
      {/* hearth */}
      {[470, 490, 510].map(y => <circle key={y} cx={cx + 70} cy={y} r="3" className="m-lamp good" />)}
      <Pipe d={`M${cx + 73} 490 H744`} kind="signal" />
      <Val a="BFH-01" t="hearth_temp" x={744} y={468} w={140} label="Hearth wall TC (max)" big />
      {/* cast house: taphole, runner, torpedo */}
      <Pipe d={`M${cx + 76} 520 L${cx + 120} 548 H840 V578`} kind="hot" w={6} speed={0.6} />
      <Lbl x={cx + 96} y={572} muted size={10}>Taphole · main runner</Lbl>
      <Equip a="BFH-01" x={770} y={590} w={140} h={46} noId><Torpedo x={770} y={590} /></Equip>
      <Lbl x={840} y={666} anchor="middle" muted size={10}>Torpedo ladle → SMS</Lbl>
      <Val a="BFH-01" t="hm_temp" x={930} y={582} w={110} label="Hot metal temp" />
      <Val a="BFH-01" t="hm_si" x={1050} y={582} w={90} label="HM silicon" />
      <MiniTrend a="BFH-01" t="hearth_temp" x={930} y={630} w={210} h={34} />
      <Lbl x={1150} y={652} muted size={10}>Hearth TC · 24 h</Lbl>
      {/* top gas: uptakes, downcomer, dust catcher, scrubber */}
      <Pipe d={`M${cx - 26} 134 V58 H820 V196 M${cx + 26} 134 V58`} kind="gas" w={10} speed={1.3} />
      <Val a="BFT-01" t="top_temp" x={680} y={90} w={110} label="Top gas temp" />
      <Val a="BFT-01" t="stockline" x={680} y={134} w={110} label="Stockline (radar)" />
      <Val a="BFT-01" t="top_press" x={680} y={178} w={110} label="Top pressure" />
      <Equip a="BFT-01" x={775} y={196} w={90} h={158} label="Dust catcher" noId><DustCatcher x={775} y={196} /></Equip>
      <Lbl x={820} y={394} anchor="middle" muted size={10}>flue dust to sinter</Lbl>
      <Pipe d="M865 222 H930 V180 H980" kind="gas" w={10} speed={1.3} />
      <Equip a="BFT-01" x={980} y={150} w={60} h={200} label="Scrubber" sub="annular gap" ><Tank x={980} y={150} w={60} h={200} cone={40} /></Equip>
      <Pipe d="M1040 172 H1060 V100 H1262" kind="gas" w={10} speed={1.3} />
      <Lbl x={1060} y={90} muted size={10}>Clean BF gas → stoves, TRT, power plant</Lbl>
      <Val a="BFT-01" t="co" x={1070} y={140} w={88} label="Top gas CO" />
      <Val a="BFT-01" t="co2" x={1166} y={140} w={88} label="Top gas CO₂" />
      <Gauge a="BFT-01" t="co" x={1120} y={262} r={34} min={15} max={30} label="CO for η-CO" />
      <Gauge a="BF-01" t="hb_temp" x={1120} y={360} r={34} min={900} max={1300} label="Blast temp" />
      <Lbl x={1070} y={420} muted size={10}>Slag → granulation (INBA)</Lbl>
    </Mimic>
  );
}

/* ---------------- DRI kiln ---------------- */
function DRIKiln({ c }) {
  const run = useLive('DRK-01', 'feed', c).v > 5;
  const tcs = [['z1', 'Z1'], ['z3', 'Z3'], ['z5', 'Z5'], ['z7', 'Z7'], ['z9', 'Z9']];
  const kx = 320, kl = 600, ky = 290, kd = 64;
  return (
    <Mimic c={c} w={1280} h={680}>
      <Title x={24} y={30}>DRI kiln 500 tpd · coal-based sponge iron</Title>
      {/* raw material bins and feed conveyor */}
      <Zone x={380} y={44} w={420} h={170} label="Feed" />
      {[['Iron ore', 420], ['Feed coal', 520], ['Dolomite', 620]].map(([n, x]) => <g key={n}><Tank x={x} y={76} w={56} h={78} cone={26} /><Lbl x={x + 28} y={70} anchor="middle" muted size={10}>{n}</Lbl></g>)}
      <Conveyor x={410} y={180} len={290} on={run} />
      <Pipe d="M448 154 V172 M548 154 V172 M648 154 V172" kind="material" w={4} />
      <Pipe d={`M410 180 H360 L${kx} ${ky + 10}`} kind="material" w={6} speed={0.8} />
      <Val a="DRK-01" t="feed" x={710} y={160} w={84} label="Feed" />
      {/* kiln */}
      <Equip a="DRK-01" x={kx} y={ky} w={kl} h={kd} noId><Drum x={kx} y={ky} len={kl} dia={kd} angle={1.5} on={run} tyres={3} /></Equip>
      {/* shell air fans and air tubes */}
      {Array.from({ length: 9 }).map((_, i) => { const x = kx + 50 + i * 62; return <g key={i}><line x1={x} y1={ky + 2 + i * 1.6} x2={x} y2={ky - 18} className="m-edge" /><Fan x={x} y={ky - 26} r={8} on={run} speed={1.8} /></g>; })}
      <Lbl x={kx + 40} y={ky - 44} muted size={10}>Shell air fans · air tubes into the bed</Lbl>
      {/* thermocouples */}
      {tcs.map(([t, l], i) => { const x = kx + 40 + i * 130; return <g key={t}><circle cx={x + 18} cy={ky + kd + 6 + i * 3.4} r="3" className="m-lamp good" /><Pipe d={`M${x + 18} ${ky + kd + 9 + i * 3.4} V404`} kind="signal" /><Val a="DRT-01" t={t} x={x} y={404} w={108} label={`${l} bed temp`} /></g>; })}
      <Lbl x={kx} y={464} size={12} bold>DRK-01 · Rotary kiln 4.2 × 72 m</Lbl>
      <Lbl x={kx + 220} y={464} muted size={10}>2.5 % slope · 9 shell air fans · TCs DRT-01</Lbl>
      <Val a="DRK-01" t="speed" x={kx} y={480} w={96} label="Kiln speed" />
      <Val a="DRK-01" t="air_flow" x={kx + 104} y={480} w={120} label="Air tube flow" />
      {/* discharge end: burner and injection coal */}
      <rect x={kx + kl + 8} y={ky - 6} width={36} height={kd + 40} rx="4" fill="url(#m-metal)" className="m-body" /><rect x={kx + kl + 8} y={ky - 6} width={36} height={kd + 40} rx="4" className="m-edge" />
      <Flame x={kx + kl - 6} y={ky + 50} s={16} />
      <Pipe d={`M1010 ${ky + 30} H${kx + kl + 44}`} kind="air" w={5} speed={1.2} />
      <Pipe d={`M1010 ${ky + 14} H${kx + kl + 44}`} kind="material" w={4} speed={1.2} />
      <Lbl x={1016} y={ky + 18} muted size={10}>Injection coal (slinger)</Lbl>
      <Lbl x={1016} y={ky + 34} muted size={10}>Central burner air</Lbl>
      {/* transfer chute to cooler */}
      <Pipe d={`M${kx + kl + 26} ${ky + kd + 34} V510 H950`} kind="hot" w={6} speed={0.6} />
      <Equip a="RC-01" x={950} y={500} w={270} h={50} noId><Drum x={950} y={500} len={270} dia={50} angle={1.5} on={run} tyres={2} /></Equip>
      <Pipe d="M960 480 H1210" kind="water" w={4} speed={1} />
      {[990, 1040, 1090, 1140, 1190].map(x => <path key={x} d={`M${x} 484 l-5 10 M${x} 484 l5 10`} className="m-glyph" style={{ stroke: 'var(--m-water)' }} />)}
      <Lbl x={960} y={470} muted size={10}>Shell spray water</Lbl>
      <Pipe d="M1220 540 H1262 V580" kind="material" w={5} />
      <Lbl x={950} y={596} size={12} bold>RC-01 · Rotary cooler</Lbl>
      <Lbl x={1256} y={596} anchor="end" muted size={10}>Sponge iron → mag. separation</Lbl>
      <Val a="RC-01" t="product_temp" x={950} y={612} w={110} label="Product temp" />
      <Val a="RC-01" t="water_flow" x={1068} y={612} w={104} label="Spray water" />
      <Val a="RC-01" t="speed" x={1180} y={612} w={80} label="Cooler speed" />
      {/* waste gas: feed end hood → DSC/ABC → WHRB → ESP */}
      <rect x={kx - 46} y={ky - 20} width={44} height={kd + 50} rx="4" fill="url(#m-metal)" className="m-body" /><rect x={kx - 46} y={ky - 20} width={44} height={kd + 50} rx="4" className="m-edge" />
      <Equip a="DRK-01" x={238} y={110} w={64} h={150} noId><Box x={238} y={110} w={64} h={150} title="ABC" /></Equip>
      <Lbl x={270} y={150} anchor="middle" muted size={9}>DSC</Lbl>
      <Pipe d={`M${kx - 24} ${ky - 20} V260`} kind="flue" w={10} speed={1.3} />
      <Pipe d="M270 110 V70 H180 V110" kind="flue" w={12} speed={1.3} />
      <Equip a="WHB-01" x={70} y={110} w={130} h={230} label="Waste heat boiler" sub="64 bar · 24 t/h"><Box x={70} y={110} w={130} h={230} />
        {[0, 1, 2, 3, 4].map(i => <path key={i} d={`M84 ${140 + i * 38} h100 l-8 8 h-84`} className="m-glyph" />)}
      </Equip>
      <Pipe d="M70 320 H48 V392" kind="flue" w={10} speed={1.3} />
      <Lbl x={58} y={404} muted size={10}>ESP → ID fan → stack</Lbl>
      <Pipe d="M100 110 V68 H30" kind="steam" w={6} speed={1.5} />
      <Lbl x={34} y={58} muted size={10}>Steam → 8 MW turbine</Lbl>
      <Val a="WHB-01" t="steam" x={30} y={420} w={100} label="Steam" />
      <Val a="WHB-01" t="steam_press" x={138} y={420} w={100} label="Steam pressure" />
      <Val a="WHB-01" t="gas_in_temp" x={30} y={464} w={100} label="Gas inlet" />
      <Val a="WHB-01" t="power" x={138} y={464} w={100} label="Turbine output" />
      <Val a="DRK-01" t="outlet_temp" x={30} y={520} w={208} label="Kiln outlet gas (to DSC)" big />
      <MiniTrend a="DRK-01" t="outlet_temp" x={30} y={574} w={208} h={34} />
      {/* profile chart */}
      <AxialProfile a="DRT-01" tags={tcs} x={850} y={56} w={400} h={170} />
    </Mimic>
  );
}

/* ---------------- pellet plant ---------------- */
function PelletPlant({ c }) {
  const run = useLive('BD-01', 'feed', c).v > 10;
  const fan = useLive('PF-01', 'power', c).v > 200;
  const zones = [
    ['UDD', 260, 110, 'IND-01', 'udd_temp', true], ['DDD', 370, 130, 'IND-01', 'ddd_temp'], ['PH', 500, 120, 'IND-01', 'ph_temp'],
    ['Firing', 620, 220, 'IND-02', 'firing_temp', false, true], ['AF', 840, 110, 'IND-02', 'af_temp'], ['C1', 950, 160, 'IND-02', 'c1_temp', true], ['C2', 1110, 110, null, null, true],
  ];
  const hy = 262, hh = 78, gy = 346;
  const drop = (z) => z[1] + z[2] / 2;
  return (
    <Mimic c={c} w={1280} h={700}>
      <Title x={24} y={30}>Pellet plant · 4 Mtpa straight grate</Title>
      {/* feed and balling */}
      <Lbl x={24} y={62} muted size={10}>Concentrate + bentonite + limestone</Lbl>
      <Conveyor x={30} y={80} len={70} angle={12} on={run} />
      <Equip a="BD-01" x={70} y={96} w={110} h={110} label="Balling disc 7.5 m" sub="BD-01" noId><BallingDisc x={124} y={146} r={50} on={run} /></Equip>
      <Val a="BD-01" t="feed" x={200} y={78} w={100} label="Green mix feed" />
      <Val a="BD-01" t="speed" x={308} y={78} w={90} label="Disc speed" />
      <Val a="BD-01" t="moisture" x={200} y={122} w={100} label="Ball moisture" />
      <Val a="BD-01" t="size_9_16" x={308} y={122} w={90} label="9–16 mm" />
      <Pipe d={`M70 236 V${gy} H250`} kind="material" w={5} speed={0.8} />
      <Lbl x={80} y={300} muted size={10}>Green balls → roller screen</Lbl>
      {[200, 214, 228, 242].map(x => <circle key={x} cx={x} cy={gy - 10} r="5" className="m-edge" />)}
      {/* bed values */}
      <Val a="IND-01" t="grate_speed" x={450} y={78} w={100} label="Grate speed" />
      <Val a="IND-01" t="bed_height" x={558} y={78} w={100} label="Bed height" />
      <Val a="IND-02" t="fuel" x={700} y={78} w={110} label="Firing fuel (NG)" />
      <Val a="IND-02" t="ccs" x={818} y={78} w={110} label="Pellet CCS" big />
      <Lbl x={940} y={96} muted size={10}>C1 hot air → firing / AF hoods (direct recuperation)</Lbl>
      <Pipe d={`M1030 ${hy} V150 H792 V${hy}`} kind="hot" w={8} speed={1.2} />
      {/* hoods with zone temperatures */}
      <Equip a="IND-01" x={260} y={hy} w={360} h={140} label="" noId>{zones.slice(0, 3).map(z => <Hood key={z[0]} x={z[1]} w={z[2]} y={hy} h={hh} label={z[0]} up={z[5]} fire={z[6]} />)}</Equip>
      <Equip a="IND-02" x={620} y={hy} w={600} h={140} label="" noId>{zones.slice(3).map(z => <Hood key={z[0]} x={z[1]} w={z[2]} y={hy} h={hh} label={z[0]} up={z[5]} fire={z[6]} />)}</Equip>
      {zones.filter(z => z[3]).map(z => <Val key={z[0]} a={z[3]} t={z[4]} x={z[1] + 5} y={192} w={z[2] - 10 > 118 ? 118 : z[2] - 10} label={`${z[0]} hood`} />)}
      <Lbl x={262} y={186} size={10} muted>IND-01 · drying and preheat</Lbl>
      <Lbl x={622} y={186} size={10} muted>IND-02 · firing and cooling</Lbl>
      {/* travelling grate */}
      <rect x={250} y={gy - 4} width={980} height={16} rx="8" className="m-body" /><rect x={250} y={gy - 4} width={980} height={16} rx="8" className="m-edge" />
      <line x1={258} y1={gy + 4} x2={1222} y2={gy + 4} className={`m-flow belt`} style={{ animationDuration: '3s' }} />
      {Array.from({ length: 64 }).map((_, i) => <circle key={i} cx={262 + i * 15} cy={gy - 8} r="4" className="m-edge" style={{ fill: i > 16 && i < 40 ? 'var(--m-hot)' : 'var(--m-mat)' }} />)}
      <Pipe d={`M1230 ${gy + 4} H1262 V400`} kind="material" w={5} />
      <Lbl x={1256} y={252} anchor="end" muted size={10}>Fired pellets → screens</Lbl>
      {/* wind boxes */}
      {zones.map(z => <WindBox key={z[0]} x={z[1]} w={z[2]} y={gy + 14} />)}
      {/* PF-02 recuperation: firing + AF wind boxes → UDD */}
      <Pipe d={`M${drop(zones[3])} 416 V480 H672 M${drop(zones[4])} 416 V480 H${drop(zones[3])}`} kind="hot" w={8} speed={1.2} />
      <Pipe d={`M628 480 H${drop(zones[0])} V416`} kind="hot" w={8} speed={1.2} />
      <Equip a="PF-02" x={628} y={458} w={44} h={44} label="Recup fan" labelPos="above" noId><Fan x={650} y={480} r={22} on={fan} speed={1.5} /></Equip>
      {/* PF-03 waste gas: DDD + PH wind boxes → ESP → stack */}
      <Pipe d={`M${drop(zones[2])} 416 V560 H${drop(zones[1])} M${drop(zones[1])} 416 V560 H222`} kind="flue" w={8} speed={1.2} />
      <Equip a="PF-03" x={178} y={538} w={44} h={44} label="Waste gas fan"><Fan x={200} y={560} r={22} on={fan} speed={1.5} /></Equip>
      <Pipe d="M178 560 H120" kind="flue" w={8} speed={1.2} />
      <Box x={50} y={520} w={70} h={70} title="ESP" />
      <rect x={20} y={430} width={20} height={160} rx="3" className="m-body" /><rect x={20} y={430} width={20} height={160} rx="3" className="m-edge" />
      <Pipe d="M50 560 H40" kind="flue" w={8} />
      <Lbl x={46} y={612} muted size={10}>ESP → stack</Lbl>
      {/* PF-01 cooling air: ambient → C1/C2 wind boxes */}
      <Pipe d={`M1262 560 H1122`} kind="air" w={8} speed={1.2} />
      <Pipe d={`M1078 560 H${drop(zones[5])} V416 M${drop(zones[6])} 560 V416`} kind="air" w={8} speed={1.2} />
      <Equip a="PF-01" x={1078} y={538} w={44} h={44} label="Cooling air fan"><Fan x={1100} y={560} r={22} on={fan} speed={1.5} /></Equip>
      <Lbl x={1256} y={548} anchor="end" muted size={10}>Ambient air</Lbl>
      {/* fan values */}
      {[['PF-03', 250], ['PF-02', 610], ['PF-01', 960]].map(([id, x]) => <g key={id}>
        <Val a={id} t="wb_press" x={x} y={612} w={110} label={`${id} wind-box`} />
        <Val a={id} t="power" x={x + 118} y={612} w={90} />
        <Val a={id} t="vibration" x={x} y={656} w={110} label="Bearing vibration" />
      </g>)}
    </Mimic>
  );
}

/* ---------------- induction furnace ---------------- */
function InductionFurnace({ c }) {
  const on = useLive('IF-01', 'power', c).v > 500;
  const pumpOn = useLive('IFC-01', 'cw_flow', c).v > 50;
  return (
    <Mimic c={c} w={1280} h={690}>
      <Title x={24} y={30}>Induction furnace 20 t · melt shop</Title>
      {/* power supply */}
      <Zone x={28} y={50} w={330} h={600} label="Power supply" />
      <Lbl x={60} y={86} muted size={10}>33 kV feeder</Lbl>
      <Pipe d="M110 92 V120" kind="hv" />
      <Transformer x={110} y={136} r={16} />
      <Lbl x={140} y={150} muted size={10}>12-pulse converter transformer</Lbl>
      <Pipe d="M110 170 V214" kind="power" />
      <Equip a="IF-01" x={60} y={214} w={260} h={190} label="Medium-frequency power cabinet" sub="10 MW · series resonant inverter" noId>
        <Box x={60} y={214} w={260} h={190} />
        {[['Rectifier', 76, 230], ['DC choke', 196, 230], ['Inverter', 76, 310], ['Capacitor bank', 196, 310]].map(([n, x, y]) => <g key={n}><rect x={x} y={y} width={108} height={62} rx="4" className="m-body" style={{ fill: 'var(--m-eq-2)' }} /><rect x={x} y={y} width={108} height={62} rx="4" className="m-edge" /><text x={x + 54} y={y + 36} textAnchor="middle" className="m-inner">{n}</text></g>)}
      </Equip>
      <Gauge a="IF-01" t="power" x={120} y={500} r={38} min={0} max={12000} label="Power" />
      <Val a="IF-01" t="frequency" x={200} y={466} w={110} label="Frequency" />
      <Val a="IF-01" t="power" x={200} y={510} w={110} label="Active power" />
      <Lbl x={44} y={570} muted size={10}>Water-cooled busbars and flexible</Lbl>
      <Lbl x={44} y={584} muted size={10}>cables to coil terminals</Lbl>
      <Pipe d="M320 280 H400 V300 H468" kind="power" w={4} />
      <Pipe d="M320 360 H400 V430 H468" kind="power" w={4} />
      {/* furnace */}
      <Val a="IF-01" t="melt_temp" x={480} y={68} w={140} label="Melt temp (dip lance)" big />
      <Equip a="IF-01" x={470} y={190} w={240} h={310} label="Induction furnace · 20 t crucible" sub="rammed silica lining · tilt 95°">
        <IFCrucible x={470} y={180} w={240} h={310} on={on} />
      </Equip>
      <Lbl x={430} y={160} muted size={10}>Spout</Lbl>
      <Lbl x={720} y={140} muted size={10}>Lid</Lbl>
      <Pipe d="M590 500 V572 H620" kind="signal" />
      <Val a="IF-01" t="earth_leak" x={620} y={554} w={130} label="Earth leakage (ELD)" />
      <BarInd a="IF-01" t="lining_wear" x={790} y={200} h={160} label="Lining wear" min={0} max={100} />
      <Val a="IF-01" t="lining_wear" x={760} y={392} w={90} label="Lining wear" />
      <Lbl x={440} y={614} muted size={10}>Bottom electrode → earth leakage relay (lining wear and metal penetration)</Lbl>
      {/* cooling skid */}
      <Zone x={880} y={50} w={372} h={600} label="Coil cooling skid" />
      <Val a="IFC-01" t="cw_dt" x={900} y={78} w={150} label="Coil cooling water ΔT" big />
      <Val a="IFC-01" t="cw_flow" x={1060} y={78} w={90} label="Coil flow" />
      <Val a="IFC-01" t="cw_in_temp" x={1158} y={78} w={84} label="Inlet temp" />
      <MiniTrend a="IFC-01" t="cw_dt" x={900} y={136} w={340} h={36} />
      <Lbl x={900} y={188} muted size={10}>ΔT last 24 h</Lbl>
      <Equip a="IFC-01" x={910} y={240} w={60} h={120} label="DM water tank"><Tank x={910} y={240} w={60} h={120} level={0.68} /></Equip>
      <Equip a="IFC-01" x={1010} y={410} w={90} h={40} label="Pumps 2 × 100 %" noId><Pump x={1030} y={430} on={pumpOn} /><Pump x={1080} y={430} on={false} /></Equip>
      <Equip a="IFC-01" x={1090} y={240} w={110} h={46} label="Plate HX" noId><HX x={1090} y={240} w={110} h={40} /></Equip>
      {/* supply: tank → pump → coil bottom; return: coil top → HX → tank */}
      <Pipe d="M970 344 H990 V430 H1014" kind="cw" w={6} speed={1.2} />
      <Pipe d="M1046 430 H1060 M1096 430 H1130 V530 H700 V470 H690" kind="cw" w={6} speed={1.2} />
      <Pipe d="M690 230 H740 V170 H1145 V240" kind="cw" w={6} speed={1.2} />
      <Pipe d="M1090 262 H990 V250 H970" kind="cw" w={6} speed={1.2} />
      <Valve x={860} y={530} />
      <Lbl x={760} y={548} muted size={10}>Coil supply</Lbl>
      <Lbl x={760} y={164} muted size={10}>Coil return</Lbl>
      {/* raw water to cooling tower */}
      <Pipe d="M1180 590 H1240 V262 H1200" kind="water" w={5} speed={1} />
      <Lbl x={1234} y={420} anchor="end" muted size={10}>Raw water</Lbl>
      <Equip a="CT-01" x={1060} y={560} w={120} h={60} label="Cooling tower"><Box x={1060} y={560} w={120} h={60} /><Fan x={1120} y={575} r={12} on={true} /></Equip>
      <Val a="CT-01" t="approach" x={920} y={574} w={110} label="CT approach" />
    </Mimic>
  );
}

/* ---------------- bar mill ---------------- */
function RollingMill({ c }) {
  const run = useLive('RS-01', 'motor_current', c).v > 200;
  const ly = 300;
  const groups = [['RS-01', 'Roughing mill · 6 stands', 380, 6], ['IS-01', 'Intermediate mill · 6 stands', 620, 6], ['FS-01', 'Finishing mill · 4 stands', 860, 4]];
  return (
    <Mimic c={c} w={1280} h={680}>
      <Title x={24} y={30}>Bar mill · 1.0 Mtpa TMT</Title>
      {/* billets from caster */}
      <Equip a="CCM-01" x={150} y={80} w={110} h={50} label="Billet caster" sub="hot charging"><Box x={150} y={80} w={110} h={50} title="CCM" /></Equip>
      <Val a="CCM-01" t="cast_speed" x={280} y={86} w={100} label="Casting speed" />
      <Pipe d="M150 105 H22 V290 H40" kind="hot" w={5} speed={0.7} />
      {/* reheating furnace */}
      <Equip a="RHF-01" x={40} y={220} w={280} h={110} label="Walking beam furnace · 180 t/h" sub="preheat · heating · soak">
        <ReheatFurnace x={40} y={220} w={280} h={110} />
      </Equip>
      <Lbl x={112} y={196} muted size={10}>Flue → recuperator</Lbl>
      <Val a="RHF-01" t="zone3_temp" x={40} y={378} w={130} label="Soak zone" big />
      <Val a="RHF-01" t="fuel" x={180} y={378} w={130} label="Fuel rate" big />
      <Val a="RHF-01" t="discharge_temp" x={40} y={434} w={130} label="Discharge temp" />
      <MiniTrend a="RHF-01" t="fuel" x={180} y={434} w={130} h={36} />
      {/* rolling line */}
      <Pipe d={`M320 ${ly} H1100`} kind="hot" w={6} speed={1.6} />
      <rect x={334} y={ly - 16} width={24} height={32} rx="3" className="m-body" /><rect x={334} y={ly - 16} width={24} height={32} rx="3" className="m-edge" />
      <Lbl x={346} y={ly - 24} anchor="middle" muted size={9}>Descaler</Lbl>
      {groups.map(([id, name, x0, n]) => <g key={id}>
        <Equip a={id} x={x0} y={ly - 40} w={n * 34} h={130} label={name}>
          {Array.from({ length: n }).map((_, i) => <Stand key={i} x={x0 + 17 + i * 34} y={ly} on={run} vertical={i % 2 === 1} />)}
        </Equip>
        <Val a={id} t="motor_current" x={x0} y={460} w={130} label="Main motor current" />
        <Val a={id} t="roll_temp" x={x0} y={504} w={130} label="Roll temperature" />
        <Val a={id} t="gearbox_vibration" x={x0} y={548} w={130} label="Gearbox vibration" big={id === 'FS-01'} />
      </g>)}
      {/* crop shears */}
      {[[600, 'Crop shear 1'], [840, 'Crop shear 2']].map(([x, n]) => <g key={x}><path d={`M${x - 8} ${ly - 18} L${x + 8} ${ly - 4} M${x - 8} ${ly + 18} L${x + 8} ${ly + 4}`} className="m-edge" strokeWidth="3" /><Lbl x={x} y={ly - 54} anchor="middle" muted size={9}>{n}</Lbl></g>)}
      <MiniTrend a="FS-01" t="gearbox_vibration" x={860} y={610} w={136} h={34} />
      <Lbl x={1004} y={632} muted size={10}>FS-01 vibration · 24 h</Lbl>
      {/* QTB and cooling bed */}
      <rect x={1012} y={ly - 14} width={76} height={28} rx="4" className="m-body" /><rect x={1012} y={ly - 14} width={76} height={28} rx="4" className="m-edge" />
      <Pipe d={`M1030 ${ly - 60} V${ly - 16} M1070 ${ly - 60} V${ly - 16}`} kind="water" w={4} />
      <Lbl x={1050} y={ly - 70} anchor="middle" muted size={10}>QTB (Thermex)</Lbl>
      <path d={`M1104 ${ly - 16} L1116 ${ly - 2} M1104 ${ly + 16} L1116 ${ly + 2}`} className="m-edge" strokeWidth="3" />
      <Lbl x={1110} y={ly - 24} anchor="middle" muted size={9}>Divide shear</Lbl>
      <Pipe d={`M1100 ${ly} H1180 V360`} kind="hot" w={5} speed={1.6} />
      <g className="m-shape">
        <rect x={1120} y={360} width={140} height={200} rx="4" fill="url(#m-metal)" className="m-body" /><rect x={1120} y={360} width={140} height={200} rx="4" className="m-edge" />
        {Array.from({ length: 16 }).map((_, i) => <line key={i} x1={1130} y1={372 + i * 11.5} x2={1250} y2={372 + i * 11.5} className="m-glyph" opacity=".55" />)}
        {Array.from({ length: 6 }).map((_, i) => <line key={'r' + i} x1={1134 + i * 22} y1={366} x2={1134 + i * 22} y2={554} className="m-glyph" opacity=".25" />)}
      </g>
      <Lbl x={1190} y={578} anchor="middle" size={11} bold>Cooling bed 96 m</Lbl>
      <Lbl x={1190} y={592} anchor="middle" muted size={10}>→ cold shear → bundling</Lbl>
      <Lbl x={380} y={200} muted size={10}>Hot billet 1,100 °C · 160 × 160 mm → TMT 8–32 mm</Lbl>
    </Mimic>
  );
}

export default { 'blast-furnace': BlastFurnace, 'dri-kiln': DRIKiln, 'pellet-plant': PelletPlant, 'induction-furnace': InductionFurnace, 'rolling-mill': RollingMill };
