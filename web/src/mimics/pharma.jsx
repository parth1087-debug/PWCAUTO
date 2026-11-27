/* Pharma: API reactor train (pharma-api) and OSD granulation-to-coating line (pharma-formulation).
   ISA-101 style: grey equipment, colour only for state. Shapes are local SVG components that use the kit's CSS classes. */
import React from 'react';
import { Mimic, Equip, Val, Pipe, Valve, Tank, Pump, Fan, Box, Lbl, Title, Zone, BarInd, Lamp, MiniTrend, useLive, useMimic } from './kit.jsx';

const JK = { fill: 'var(--m-eq-3)' }; // jacket / casing shade

/* ======================= local equipment shapes ======================= */

/** Jacketed reactor (glass-lined or SS): elliptical heads, jacket on shell and bottom head, top-mounted drive, impeller, baffle, nozzles. */
function Reactor({ x, y, w = 92, h = 130, on, gl, level = 0.55 }) {
  const hd = w * 0.24, cx = x + w / 2;
  const d = `M${x} ${y + hd} Q${x} ${y} ${cx} ${y} Q${x + w} ${y} ${x + w} ${y + hd} V${y + h - hd} Q${x + w} ${y + h} ${cx} ${y + h} Q${x} ${y + h} ${x} ${y + h - hd} Z`;
  const jd = `M${x - 6} ${y + hd + 6} V${y + h - hd} Q${x - 6} ${y + h + 7} ${cx} ${y + h + 7} Q${x + w + 6} ${y + h + 7} ${x + w + 6} ${y + h - hd} V${y + hd + 6} Z`;
  const id = `rx${x}-${y}`;
  const iy = y + h * 0.8;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    {/* support lugs */}
    <rect x={x - 15} y={y + h * 0.3} width={9} height={12} className="m-body" /><rect x={x - 15} y={y + h * 0.3} width={9} height={12} className="m-edge" />
    <rect x={x + w + 6} y={y + h * 0.3} width={9} height={12} className="m-body" /><rect x={x + w + 6} y={y + h * 0.3} width={9} height={12} className="m-edge" />
    {/* jacket */}
    <path d={jd} style={JK} /><path d={jd} className="m-edge" />
    {/* shell */}
    <clipPath id={id}><path d={d} /></clipPath>
    <path d={d} fill="url(#m-metal-h)" className="m-body" />
    <rect x={x} y={y + h * (1 - level)} width={w} height={h * level} fill="url(#m-liquid)" opacity=".45" clipPath={`url(#${id})`} />
    {gl && <path d={d} transform={`translate(${cx} ${y + h / 2}) scale(.9 .93) translate(${-cx} ${-(y + h / 2)})`} className="m-edge" style={{ strokeDasharray: '2 3', opacity: 0.55 }} />}
    <path d={d} className="m-edge" />
    {/* nozzles: charging (left), vapour (right), manway, bottom outlet */}
    <rect x={x + w * 0.15 - 5} y={y - 4} width={10} height={10} className="m-body" /><rect x={x + w * 0.15 - 5} y={y - 4} width={10} height={10} className="m-edge" />
    <rect x={x + w * 0.75 - 5} y={y - 8} width={10} height={11} className="m-body" /><rect x={x + w * 0.75 - 5} y={y - 8} width={10} height={11} className="m-edge" />
    <rect x={cx - 5} y={y + h + 5} width={10} height={8} className="m-body" /><rect x={cx - 5} y={y + h + 5} width={10} height={8} className="m-edge" />
    {/* baffle */}
    <line x1={x + w * 0.8} y1={y + 6} x2={x + w * 0.8} y2={y + h * 0.62} className="m-edge" style={{ strokeWidth: 3 }} />
    {/* drive: motor, gearbox, stool */}
    <rect x={cx - 5} y={y - 16} width={10} height={18} className="m-body" /><rect x={cx - 5} y={y - 16} width={10} height={18} className="m-edge" />
    <rect x={cx - 14} y={y - 30} width={28} height={14} rx="2" fill="url(#m-metal)" /><rect x={cx - 14} y={y - 30} width={28} height={14} rx="2" className="m-edge" />
    <rect x={cx - 9} y={y - 56} width={18} height={26} rx="3" fill="url(#m-metal-h)" /><rect x={cx - 9} y={y - 56} width={18} height={26} rx="3" className="m-edge" />
    {[0, 1, 2].map(i => <line key={i} x1={cx - 9} y1={y - 50 + i * 7} x2={cx + 9} y2={y - 50 + i * 7} className="m-edge" style={{ opacity: 0.4 }} />)}
    <circle cx={cx + 7} cy={y - 34} r="3" className="m-run" />
    {/* shaft and impeller (retreat curve / pitched blade) */}
    <line x1={cx} y1={y} x2={cx} y2={iy} className="m-edge" style={{ strokeWidth: 2.2 }} />
    <g className={on ? 'm-spin-y' : ''} style={{ transformOrigin: `${cx}px ${iy}px` }}>
      <path d={`M${cx - w * 0.33} ${iy - 8} Q${cx - w * 0.2} ${iy + 4} ${cx} ${iy} Q${cx + w * 0.2} ${iy + 4} ${cx + w * 0.33} ${iy - 8}`} className="m-blade-l" fill="none" />
    </g>
  </g>;
}

/** Top-discharge basket centrifuge: lid, casing, perforated basket, base plate and drive. */
function Centrifuge({ x, y, w = 90, h = 60, on }) {
  const cx = x + w / 2, cy = y + h * 0.55;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <path d={`M${x + 4} ${y + 12} Q${x + 8} ${y} ${cx} ${y} Q${x + w - 8} ${y} ${x + w - 4} ${y + 12} Z`} fill="url(#m-metal)" /><path d={`M${x + 4} ${y + 12} Q${x + 8} ${y} ${cx} ${y} Q${x + w - 8} ${y} ${x + w - 4} ${y + 12} Z`} className="m-edge" />
    <rect x={x} y={y + 12} width={w} height={h - 12} rx="4" fill="url(#m-metal-h)" /><rect x={x} y={y + 12} width={w} height={h - 12} rx="4" className="m-edge" />
    <rect x={x + 9} y={y + 18} width={w - 18} height={h - 26} rx="2" className="m-edge" style={{ strokeDasharray: '2 3', opacity: 0.6 }} />
    <g className="m-spin" style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: '0.8s' }}>
      {[0, 120, 240].map(a => <line key={a} x1={cx} y1={cy} x2={cx} y2={cy - 10} transform={`rotate(${a} ${cx} ${cy})`} className="m-edge" style={{ strokeWidth: 2 }} />)}
    </g>
    <circle cx={cx} cy={cy} r="3" className="m-hub" />
    <rect x={x - 6} y={y + h} width={w + 12} height={5} className="m-body" /><rect x={x - 6} y={y + h} width={w + 12} height={5} className="m-edge" />
    {[x - 2, x + w - 6].map(lx => <rect key={lx} x={lx} y={y + h + 5} width={8} height={11} className="m-edge" />)}
    <rect x={cx - 13} y={y + h + 5} width={26} height={13} rx="3" fill="url(#m-metal-h)" /><rect x={cx - 13} y={y + h + 5} width={26} height={13} rx="3" className="m-edge" />
    <text x={cx} y={y + h + 15} textAnchor="middle" className="m-sub" style={{ fontSize: 8 }}>M</text>
    <circle cx={x + w - 8} cy={y + 20} r="3" className="m-run" />
  </g>;
}

/** Agitated nutsche filter-dryer: jacketed vessel, flat filter plate, hydraulically lifted agitator, side discharge. */
function ANFD({ x, y, w = 76, h = 110, on }) {
  const cx = x + w / 2, hd = w * 0.22, fp = y + h - 14;
  const d = `M${x} ${y + hd} Q${x} ${y} ${cx} ${y} Q${x + w} ${y} ${x + w} ${y + hd} V${y + h} H${x} Z`;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x - 6} y={y + hd + 4} width={w + 12} height={h - hd - 2} rx="3" style={JK} /><rect x={x - 6} y={y + hd + 4} width={w + 12} height={h - hd - 2} rx="3" className="m-edge" />
    <path d={d} fill="url(#m-metal-h)" /><path d={d} className="m-edge" />
    <rect x={x + 2} y={fp - 16} width={w - 4} height={16} fill="url(#m-liquid)" opacity=".35" />
    <line x1={x} y1={fp} x2={x + w} y2={fp} className="m-edge" style={{ strokeDasharray: '4 2', strokeWidth: 2 }} />
    <rect x={x + 10} y={y + h} width={w - 20} height={8} className="m-body" /><rect x={x + 10} y={y + h} width={w - 20} height={8} className="m-edge" />
    {[x - 4, x + w - 4].map(lx => <rect key={lx} x={lx} y={y + h * 0.45} width={8} height={h * 0.55 + 12} className="m-edge" />)}
    <rect x={x + w} y={fp - 12} width={12} height={10} className="m-body" /><rect x={x + w} y={fp - 12} width={12} height={10} className="m-edge" />
    {/* drive + lift cylinder */}
    <rect x={cx - 6} y={y - 12} width={12} height={14} className="m-edge" />
    <rect x={cx - 15} y={y - 26} width={30} height={14} rx="2" fill="url(#m-metal)" /><rect x={cx - 15} y={y - 26} width={30} height={14} rx="2" className="m-edge" />
    <rect x={x + 6} y={y - 30} width={7} height={26} className="m-edge" />
    <line x1={cx} y1={y} x2={cx} y2={fp - 10} className="m-edge" style={{ strokeWidth: 2.2 }} />
    <g className={on ? 'm-spin-y' : ''} style={{ transformOrigin: `${cx}px ${fp - 8}px` }}>
      <path d={`M${cx - w * 0.42} ${fp - 4} L${cx} ${fp - 10} L${cx + w * 0.42} ${fp - 4}`} className="m-blade-l" fill="none" />
    </g>
    <circle cx={cx + 11} cy={y - 19} r="3" className="m-run" />
  </g>;
}

/** Rotary cone vacuum dryer: double cone on trunnions with pedestals and drive. */
function RCVD({ cx, cy, hw = 50, hh = 46, on }) {
  const d = `M${cx - 14} ${cy - hh} H${cx + 14} L${cx + hw} ${cy - 12} V${cy + 12} L${cx + 14} ${cy + hh} H${cx - 14} L${cx - hw} ${cy + 12} V${cy - 12} Z`;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    {[cx - hw - 14, cx + hw + 4].map(px => <g key={px}><rect x={px} y={cy - 5} width={10} height={10} className="m-body" /><path d={`M${px - 4} ${cy + 48} L${px + 2} ${cy + 4} H${px + 8} L${px + 14} ${cy + 48} Z`} className="m-body" /><path d={`M${px - 4} ${cy + 48} L${px + 2} ${cy + 4} H${px + 8} L${px + 14} ${cy + 48} Z`} className="m-edge" /></g>)}
    <path d={d} fill="url(#m-metal-h)" /><path d={d} className="m-edge" />
    <path d={d} transform={`translate(${cx} ${cy}) scale(.86) translate(${-cx} ${-cy})`} className="m-edge" style={{ strokeDasharray: '3 3', opacity: 0.5 }} />
    <rect x={cx - 8} y={cy - hh - 8} width={16} height={8} className="m-body" /><rect x={cx - 8} y={cy - hh - 8} width={16} height={8} className="m-edge" />
    <circle cx={cx} cy={cy} r="5" className="m-hub" />
    <circle cx={cx + hw - 6} cy={cy + 26} r="3" className="m-run" />
  </g>;
}

/** Rapid mixer granulator: bowl with lid, bottom impeller drive, side chopper, discharge valve. */
function RMG({ x, y, w = 130, h = 100, on }) {
  const cx = x + w / 2, iy = y + h - 16;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x - 6} y={y - 8} width={w + 12} height={10} rx="3" fill="url(#m-metal)" /><rect x={x - 6} y={y - 8} width={w + 12} height={10} rx="3" className="m-edge" />
    <path d={`M${x} ${y + 2} V${y + h - 10} Q${x} ${y + h} ${x + 12} ${y + h} H${x + w - 12} Q${x + w} ${y + h} ${x + w} ${y + h - 10} V${y + 2} Z`} fill="url(#m-metal-h)" />
    <path d={`M${x} ${y + 2} V${y + h - 10} Q${x} ${y + h} ${x + 12} ${y + h} H${x + w - 12} Q${x + w} ${y + h} ${x + w} ${y + h - 10} V${y + 2} Z`} className="m-edge" />
    <path d={`M${x + 4} ${y + h - 4} Q${cx} ${y + h * 0.45} ${x + w - 4} ${y + h - 4} Z`} className="m-body" style={{ fill: 'var(--m-mat)', opacity: 0.45 }} />
    {/* impeller */}
    <line x1={cx} y1={iy} x2={cx} y2={y + h + 6} className="m-edge" style={{ strokeWidth: 2.2 }} />
    <g className={on ? 'm-spin-y' : ''} style={{ transformOrigin: `${cx}px ${iy}px`, animationDuration: '0.9s' }}><path d={`M${cx - w * 0.42} ${iy + 6} L${cx} ${iy - 2} L${cx + w * 0.42} ${iy + 6}`} className="m-blade-l" fill="none" /></g>
    <rect x={cx - 18} y={y + h + 6} width={36} height={12} rx="2" fill="url(#m-metal)" /><rect x={cx - 18} y={y + h + 6} width={36} height={12} rx="2" className="m-edge" />
    <rect x={cx - 12} y={y + h + 18} width={24} height={16} rx="3" fill="url(#m-metal-h)" /><rect x={cx - 12} y={y + h + 18} width={24} height={16} rx="3" className="m-edge" />
    <circle cx={cx + 8} cy={y + h + 30} r="3" className="m-run" />
    {/* chopper on the left wall */}
    <rect x={x - 26} y={y + h * 0.42} width={22} height={18} rx="3" fill="url(#m-metal-h)" /><rect x={x - 26} y={y + h * 0.42} width={22} height={18} rx="3" className="m-edge" />
    <line x1={x - 4} y1={y + h * 0.42 + 9} x2={x + 20} y2={y + h * 0.42 + 9} className="m-edge" style={{ strokeWidth: 2 }} />
    <g className="m-spin" style={{ transformOrigin: `${x + 20}px ${y + h * 0.42 + 9}px`, animationDuration: '0.5s' }}>
      {[0, 60, 120].map(a => <line key={a} x1={x + 12} y1={y + h * 0.42 + 9} x2={x + 28} y2={y + h * 0.42 + 9} transform={`rotate(${a} ${x + 20} ${y + h * 0.42 + 9})`} className="m-edge" style={{ strokeWidth: 1.6 }} />)}
    </g>
    {/* discharge port */}
    <rect x={x + w} y={y + h - 28} width={14} height={14} className="m-body" /><rect x={x + w} y={y + h - 28} width={14} height={14} className="m-edge" />
  </g>;
}

/** Fluid bed dryer: air plenum, conical product container, expansion chamber, filter bag housing. */
function FBD({ x, y, w = 110, on }) {
  const cx = x + w / 2;
  const fh = 50, ec = 80, pc = 60, pl = 30; // filter housing, expansion chamber, product container, plenum
  const y1 = y + fh, y2 = y1 + ec, y3 = y2 + pc;
  const body = `M${x + 6} ${y + 8} Q${x + 6} ${y} ${x + 16} ${y} H${x + w - 16} Q${x + w - 6} ${y} ${x + w - 6} ${y + 8} V${y1} L${x + w} ${y1 + 6} V${y2} L${x + w - 20} ${y3} H${x + 20} L${x} ${y2} V${y1 + 6} L${x + 6} ${y1} Z`;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <path d={body} fill="url(#m-metal-h)" /><path d={body} className="m-edge" />
    {[0, 1, 2, 3, 4].map(i => <line key={i} x1={x + 22 + i * 16} y1={y + 8} x2={x + 22 + i * 16} y2={y1 - 4} className="m-edge" style={{ strokeDasharray: '3 2', opacity: 0.55 }} />)}
    <line x1={x + 6} y1={y1} x2={x + w - 6} y2={y1} className="m-edge" />
    <line x1={x} y1={y2} x2={x + w} y2={y2} className="m-edge" />
    <line x1={x + 20} y1={y3 - 4} x2={x + w - 20} y2={y3 - 4} className="m-edge" style={{ strokeDasharray: '2 2' }} />
    <g className={on ? 'm-flow-bed' : ''}>{[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx={x + 26 + (i % 3) * 28 + (i > 2 ? 14 : 0)} cy={y3 - 14 - (i > 2 ? 18 : 0)} r="3" style={{ fill: 'var(--m-mat)', opacity: 0.6 }} />)}</g>
    <rect x={x + 16} y={y3} width={w - 32} height={pl} rx="3" style={JK} /><rect x={x + 16} y={y3} width={w - 32} height={pl} rx="3" className="m-edge" />
    {[x + 18, x + w - 26].map(lx => <rect key={lx} x={lx} y={y3 + pl} width={8} height={10} className="m-edge" />)}
    <circle cx={x + w - 12} cy={y + 14} r="3" className="m-run" />
  </g>;
}

/** Bin blender: IBC (square bin with cone) turning on a pillar arm. */
function BinBlender({ cx, cy, on, rpm = 12 }) {
  const bw = 66, bh = 84;
  const bin = `M${cx - bw / 2} ${cy - bh / 2} H${cx + bw / 2} V${cy + 8} L${cx + 10} ${cy + bh / 2} H${cx - 10} L${cx - bw / 2} ${cy + 8} Z`;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={cx + 58} y={cy - 60} width={16} height={cy + 108 - (cy - 60) - 8} fill="url(#m-metal-h)" /><rect x={cx + 58} y={cy - 60} width={16} height={160} className="m-edge" />
    <rect x={cx + 48} y={cy + 100} width={36} height={8} className="m-body" /><rect x={cx + 48} y={cy + 100} width={36} height={8} className="m-edge" />
    <rect x={cx} y={cy - 4} width={60} height={8} className="m-body" /><rect x={cx} y={cy - 4} width={60} height={8} className="m-edge" />
    <g className="m-spin" style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: `${60 / Math.max(rpm, 1)}s` }}>
      <path d={bin} fill="url(#m-metal)" /><path d={bin} className="m-edge" />
      <rect x={cx - 12} y={cy - bh / 2 - 6} width={24} height={6} className="m-edge" />
      <rect x={cx - 8} y={cy + bh / 2} width={16} height={6} className="m-edge" />
    </g>
    <circle cx={cx} cy={cy} r="5" className="m-hub" />
    <circle cx={cx + 66} cy={cy - 48} r="3" className="m-run" />
  </g>;
}

/** Rotary tablet press: hopper, force feeder, turret window with moving upper/lower punches, base cabinet, discharge chute. */
function TabletPress({ x, y, w = 160, on }) {
  const cx = x + w / 2, wy = y + 76, wh = 72, tbl = wy + 34;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <path d={`M${cx - 22} ${y} H${cx + 22} L${cx + 8} ${y + 26} H${cx - 8} Z`} fill="url(#m-metal)" /><path d={`M${cx - 22} ${y} H${cx + 22} L${cx + 8} ${y + 26} H${cx - 8} Z`} className="m-edge" />
    <rect x={cx - 4} y={y + 26} width={8} height={10} className="m-edge" />
    <rect x={x + 10} y={y + 36} width={w - 20} height={40} rx="4" fill="url(#m-metal)" /><rect x={x + 10} y={y + 36} width={w - 20} height={40} rx="4" className="m-edge" />
    <rect x={x + 10} y={wy} width={w - 20} height={wh} className="m-body" style={{ opacity: 0.55 }} /><rect x={x + 10} y={wy} width={w - 20} height={wh} className="m-edge" />
    <clipPath id={`tp${x}`}><rect x={x + 14} y={wy + 2} width={w - 28} height={wh - 4} /></clipPath>
    <g clipPath={`url(#tp${x})`}>
      <rect x={x + 14} y={tbl} width={w - 28} height={9} fill="url(#m-metal)" /><rect x={x + 14} y={tbl} width={w - 28} height={9} className="m-edge" />
      <path d={`M${x + 14} ${wy + 10} Q${cx} ${wy + 22} ${x + w - 14} ${wy + 10}`} className="m-edge" style={{ opacity: 0.5 }} />
      <path d={`M${x + 14} ${wy + wh - 10} Q${cx} ${wy + wh - 22} ${x + w - 14} ${wy + wh - 10}`} className="m-edge" style={{ opacity: 0.5 }} />
      <g className={`m-drum ${on ? 'on' : ''}`}><g className="m-bands">
        {Array.from({ length: 10 }).map((_, i) => { const px = x - 12 + i * 26; return <g key={i}>
          <rect x={px - 2.5} y={wy + 6} width={5} height={tbl - wy - 6} className="m-edge" style={{ fill: 'var(--m-eq-2)' }} />
          <rect x={px - 2.5} y={tbl + 9} width={5} height={wy + wh - 6 - tbl - 9} className="m-edge" style={{ fill: 'var(--m-eq-2)' }} />
          <rect x={px + 10.5} y={wy + 12} width={5} height={tbl - wy - 12} className="m-edge" style={{ fill: 'var(--m-eq-2)' }} />
          <rect x={px + 10.5} y={tbl + 9} width={5} height={wy + wh - 12 - tbl - 9} className="m-edge" style={{ fill: 'var(--m-eq-2)' }} />
        </g>; })}
      </g></g>
    </g>
    <rect x={cx - 26} y={tbl - 6} width={20} height={6} className="m-body" /><rect x={cx - 26} y={tbl - 6} width={20} height={6} className="m-edge" />
    <rect x={x} y={wy + wh} width={w} height={62} rx="4" fill="url(#m-metal)" /><rect x={x} y={wy + wh} width={w} height={62} rx="4" className="m-edge" />
    <rect x={x + 12} y={wy + wh + 12} width={46} height={30} rx="2" className="m-edge" style={{ opacity: 0.6 }} />
    <path d={`M${x + w - 10} ${tbl + 4} L${x + w + 16} ${tbl + 26}`} className="m-edge" style={{ strokeWidth: 6, opacity: 0.6 }} />
    <circle cx={x + w - 14} cy={wy + wh + 12} r="3" className="m-run" />
  </g>;
}

/** Perforated-pan auto coater: cabinet, rotating pan with tablet bed, spray gun arm, inlet and exhaust plenums. */
function Coater({ x, y, w = 180, h = 180, on, rpm = 8 }) {
  const cx = x + w * 0.46, cy = y + h * 0.52, r = h * 0.34;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x} y={y} width={w} height={h} rx="6" fill="url(#m-metal)" /><rect x={x} y={y} width={w} height={h} rx="6" className="m-edge" />
    <circle cx={cx} cy={cy} r={r + 6} className="m-body" style={{ fill: 'var(--m-eq-3)' }} /><circle cx={cx} cy={cy} r={r + 6} className="m-edge" />
    <g className="m-spin" style={{ transformOrigin: `${cx}px ${cy}px`, animationDuration: `${60 / Math.max(rpm, 1)}s` }}>
      <circle cx={cx} cy={cy} r={r} className="m-body" /><circle cx={cx} cy={cy} r={r} className="m-edge" />
      {Array.from({ length: 24 }).map((_, i) => { const a = (i / 24) * Math.PI * 2; return <circle key={i} cx={cx + (r - 6) * Math.cos(a)} cy={cy + (r - 6) * Math.sin(a)} r="1.6" className="m-hub" style={{ opacity: 0.5 }} />; })}
      {[0, 90].map(a => <line key={a} x1={cx - r * 0.7} y1={cy} x2={cx + r * 0.7} y2={cy} transform={`rotate(${a + 45} ${cx} ${cy})`} className="m-edge" style={{ opacity: 0.35 }} />)}
    </g>
    <path d={`M${cx - r * 0.92} ${cy + r * 0.38} A${r} ${r} 0 0 0 ${cx + r * 0.55} ${cy + r * 0.8} Q${cx - r * 0.1} ${cy + r * 0.2} ${cx - r * 0.92} ${cy + r * 0.38} Z`} style={{ fill: 'var(--m-mat)', opacity: 0.55 }} />
    <line x1={x + w - 10} y1={cy - r * 0.6} x2={cx + 6} y2={cy - r * 0.6} className="m-edge" style={{ strokeWidth: 2.5 }} />
    {[cx + 8, cx + 28].map(gx => <path key={gx} d={`M${gx} ${cy - r * 0.6} L${gx - 6} ${cy - r * 0.6 + 12} M${gx} ${cy - r * 0.6} L${gx + 6} ${cy - r * 0.6 + 12}`} className="m-edge" style={{ opacity: 0.6 }} />)}
    <circle cx={x + w - 12} cy={y + h - 12} r="3" className="m-run" />
  </g>;
}

/** RLAF dispensing booth with platform balance and container (no asset). */
function Booth({ x, y, w = 110, h = 180 }) {
  return <g className="m-shape">
    <rect x={x} y={y} width={w} height={22} rx="3" fill="url(#m-metal)" /><rect x={x} y={y} width={w} height={22} rx="3" className="m-edge" />
    <text x={x + w / 2} y={y + 15} textAnchor="middle" className="m-sub" style={{ fontSize: 9 }}>HEPA · RLAF</text>
    {[0, 1, 2, 3].map(i => <path key={i} d={`M${x + 18 + i * 24} ${y + 28} v40`} className="m-edge" style={{ strokeDasharray: '3 5', opacity: 0.45 }} markerEnd="url(#m-arrow)" />)}
    <line x1={x} y1={y + 22} x2={x} y2={y + h} className="m-edge" /><line x1={x + w} y1={y + 22} x2={x + w} y2={y + h} className="m-edge" />
    <rect x={x + 10} y={y + h - 34} width={46} height={30} rx="2" fill="url(#m-metal-h)" /><rect x={x + 10} y={y + h - 34} width={46} height={30} rx="2" className="m-edge" />
    <rect x={x + 6} y={y + h - 4} width={54} height={4} className="m-body" />
    <rect x={x + 66} y={y + h - 20} width={34} height={16} rx="2" className="m-body" /><rect x={x + 66} y={y + h - 20} width={34} height={16} rx="2" className="m-edge" />
    <text x={x + 83} y={y + h - 9} textAnchor="middle" className="m-sub" style={{ fontSize: 8 }}>kg</text>
  </g>;
}

/** Load cell symbol. */
const LoadCell = ({ x, y }) => <g className="m-shape"><path d={`M${x - 5} ${y + 8} L${x} ${y} L${x + 5} ${y + 8} Z`} className="m-body" /><path d={`M${x - 5} ${y + 8} L${x} ${y} L${x + 5} ${y + 8} Z`} className="m-edge" /></g>;

/** Text-only status block (batch phase etc.). */
function StatusBox({ x, y, w, h = 46, head, main, sub, st = 'good', onClick }) {
  return <g className={`m-val ${st}`} onClick={onClick} role="button">
    <rect x={x} y={y} width={w} height={h} rx="4" />
    <text x={x + 7} y={y + 12} className="m-val-l">{head}</text>
    <text x={x + 7} y={y + 27} className="m-val-v" style={{ fontSize: 11.5 }}>{main}</text>
    {sub && <text x={x + 7} y={y + 40} className="m-val-l">{sub}</text>}
  </g>;
}

/** CPP with design space: moving bar (BarInd) + low limit mark + value and DS range text. */
function Cpp({ a, t, x, y, h = 66, min, max, label, dec = 1 }) {
  const m = useMimic(); const r = useLive(a, t);
  const lo = r.def?.lo, hi = r.def?.hi;
  const ly = lo != null && lo !== 0 ? y + h - h * ((lo - min) / (max - min)) : null;
  const rng = lo != null && lo !== 0 ? `DS ${lo}–${hi}` : hi != null ? `limit ≤ ${hi}` : '';
  return <g>
    <BarInd a={a} t={t} x={x} y={y} h={h} min={min} max={max} label=" " />
    {ly != null && <line x1={x - 3} y1={ly} x2={x + 17} y2={ly} className="m-g-limline" />}
    <g className={`m-val ${r.st}`} onClick={() => m.select(a)} role="button">
      <text x={x + 22} y={y + h / 2} className="m-val-v" key={m.tick}>{r.v == null ? '—' : r.v.toFixed(dec)}<tspan className="m-val-u"> {r.unit}</tspan></text>
      <text x={x + 22} y={y + h / 2 + 14} className="m-val-l">{rng}</text>
    </g>
    <text x={x} y={y + h + 14} className="m-sub">{label}</text>
  </g>;
}

/* ======================= reactor train (pharma-api) ======================= */

const RECIPE = {
  'R-101': { kl: '6 KL', gl: true, stage: 'Stage 2', batch: 'B-22-0415', phase: 'Reaction', step: 'Hold at 45 °C' },
  'R-102': { kl: '4 KL', gl: true, stage: 'Stage 3', batch: 'B-23-0417', phase: 'Reaction', step: 'SOCl₂ addition', dosing: true },
  'R-103': { kl: '6 KL', gl: false, stage: 'Stage 4', batch: 'B-24-0311', phase: 'Crystallisation', step: 'Cool to 5 °C' },
  'R-104': { kl: '3 KL', gl: false, stage: 'Stage 1', batch: 'B-21-0420', phase: 'Distillation', step: 'Solvent strip' },
};
const UTIL_OF = { Reaction: 'brine', Crystallisation: 'chw', Distillation: 'steam' };
const HDR = { steam: 566, chw: 586, brine: 606, ret: 646 };

/** ISA-88 phase from the recipe step plus live tags (stopped agitator, vacuum, temperature excursion). */
function phaseOf(rec, t) {
  if (t.amp != null && t.amp < 4) return { phase: 'Idle', step: 'Agitator stopped', st: 'good' };
  if (t.mt != null && t.mtHi != null && t.mt > t.mtHi) return { phase: `${rec.phase} · HELD`, step: `${rec.step} · temp high`, st: 'bad' };
  if (t.p != null && t.p < -0.3) return { phase: 'Distillation', step: 'Under vacuum', st: 'good' };
  return { phase: rec.phase, step: rec.step, st: 'good' };
}

function ReactorUnit({ id, x0 }) {
  const m = useMimic(); const rec = RECIPE[id];
  const mt = useLive(id, 'mass_temp'), amp = useLive(id, 'agitator_current'), p = useLive(id, 'pressure');
  const on = (amp.v ?? 0) > 4;
  const ph = phaseOf(rec, { mt: mt.v, mtHi: mt.def?.hi, amp: amp.v, p: p.v });
  const util = UTIL_OF[rec.phase];
  const rx = x0 + 26, ry = 250, cx = x0 + 72;
  const brX = { brine: x0 + 14, chw: x0 + 30, steam: x0 + 46 };
  return <g>
    {/* N₂ blanket / charging, vent to vacuum header, overhead condenser and receiver */}
    {rec.dosing ? <>
      <Pipe pts={[[x0 + 40, 74], [x0 + 40, 140]]} kind="gas" w={3} />
      <Tank x={x0 + 22} y={140} w={36} h={46} />
      <line x1={x0 + 26} y1={186} x2={x0 + 26} y2={194} className="m-edge" /><line x1={x0 + 54} y1={186} x2={x0 + 54} y2={194} className="m-edge" />
      <LoadCell x={x0 + 26} y={194} /><LoadCell x={x0 + 54} y={194} />
      <Pipe pts={[[x0 + 40, 186], [x0 + 40, 244]]} kind="process" w={3} speed={0.6} />
      <Valve x={x0 + 40} y={222} s={6} rot={90} open control />
      <Lbl x={x0 + 2} y={130} size={9.5} muted>SOCl₂ dosing · WT</Lbl>
    </> : <Pipe pts={[[x0 + 40, 74], [x0 + 40, 244]]} kind="gas" w={3} flow={false} />}
    <Pipe pts={[[x0 + 95, 242], [x0 + 95, 150], [x0 + 102, 150]]} kind="steam" w={5} flow={on} speed={0.8} />
    <Pipe pts={[[x0 + 133, 138], [x0 + 133, 92]]} kind="air" w={3} flow={false} />
    <Pipe pts={[[x0 + 116, 138], [x0 + 116, 128]]} kind="chw" w={3} flow={false} /><Pipe pts={[[x0 + 152, 138], [x0 + 152, 128]]} kind="chw" w={3} flow={false} />
    <g className="m-shape"><rect x={x0 + 100} y={138} width={66} height={24} rx="12" fill="url(#m-metal-h)" /><rect x={x0 + 100} y={138} width={66} height={24} rx="12" className="m-edge" />
      <path d={`M${x0 + 110} 150 l7 -6 l7 12 l7 -12 l7 12 l7 -12 l7 12 l7 -6`} className="m-glyph" /></g>
    <Pipe pts={[[x0 + 158, 162], [x0 + 158, 178]]} kind="condensate" w={3} />
    <Tank x={x0 + 146} y={178} w={26} h={50} />
    <Pipe pts={[[x0 + 159, 228], [x0 + 159, 246]]} kind="condensate" w={3} arrow />
    {/* reactor */}
    <Equip a={id} x={x0 + 18} y={190} w={100} h={206} label={`${id} · ${rec.stage}`} sub={`${rec.kl} · ${rec.gl ? 'glass-lined' : 'SS 316'}`} noId>
      <Reactor x={rx} y={ry} on={on} gl={rec.gl} level={ph.phase === 'Idle' ? 0.2 : 0.55} />
    </Equip>
    {/* bottom outlet to slurry header */}
    <Pipe pts={[[cx, 392], [x0 + 22, 392], [x0 + 22, 500]]} kind="process" w={4} flow={false} />
    <Valve x={x0 + 44} y={392} s={6} open={false} />
    {/* jacket service: return at top, supply at bottom via utility selection */}
    <Pipe pts={[[x0 + 20, 282], [x0 + 8, 282], [x0 + 8, HDR.ret]]} kind="water" w={3} flow={on} speed={0.7} />
    <Pipe pts={[[x0 + 14, HDR[util]], [x0 + 14, 360], [x0 + 20, 360]]} kind={util === 'steam' ? 'steam' : 'chw'} w={3} flow={false} />
    <Pipe pts={[[x0 + 14, 548], [x0 + 46, 548]]} kind="process" w={3} flow={false} />
    <Pipe pts={[[x0 + 30, 548], [x0 + 30, HDR.chw]]} kind="chw" w={3} flow={false} />
    <Pipe pts={[[x0 + 46, 548], [x0 + 46, HDR.steam]]} kind="steam" w={3} flow={false} />
    {Object.entries(brX).map(([k, bx]) => <Valve key={k} x={bx} y={556} s={5} rot={90} open={k === util} />)}
    {/* values */}
    <Val a={id} t="mass_temp" x={x0 + 126} y={258} w={84} label="Mass temp" />
    <Val a={id} t="jacket_temp" x={x0 + 126} y={298} w={84} label="Jacket out" />
    <Val a={id} t="pressure" x={x0 + 126} y={338} w={84} label="Pressure" dec={2} />
    <Val a={id} t="agitator_current" x={x0 + 126} y={378} w={84} label="Agitator" />
    <Val a={id} t="ph" x={x0 + 126} y={418} w={84} label="pH" dec={2} />
    <StatusBox x={x0 + 28} y={434} w={94} head={`Batch ${rec.batch}`} main={ph.phase} sub={ph.step} st={ph.st} onClick={() => m.select(id)} />
  </g>;
}

function ReactorTrain({ c }) {
  const cf1 = useLive('CF-201', 'speed', c).v > 200, cf2 = useLive('CF-202', 'speed', c).v > 200;
  const anfdOn = useLive('ANFD-201', 'torque', c).v > 5;
  const ids = ['R-101', 'R-102', 'R-103', 'R-104'];
  return (
    <Mimic c={c} w={1280} h={720} note="Phase from recipe step and live tags (ISA-88)">
      <Title x={24} y={30}>API Block B · reactor train and isolation</Title>
      <Zone x={16} y={40} w={868} h={484} label="Reactor bay (Block B)" />
      {/* top headers */}
      <Pipe pts={[[40, 74], [820, 74]]} kind="gas" w={4} flow={false} />
      <Pipe pts={[[40, 92], [836, 92]]} kind="air" w={4} speed={0.8} />
      <Lbl x={172} y={69} size={9.5} muted>N₂ blanket header · NG-601</Lbl>
      <Lbl x={172} y={87} size={9.5} muted>Vacuum / vent header</Lbl>
      <Pump x={850} y={92} r={13} on />
      <Lbl x={850} y={124} size={9.5} muted anchor="middle">Vacuum pump</Lbl>
      <Lbl x={430} y={56} size={9.5} muted>Overhead condensers (brine) → receivers → SRP (DC-401)</Lbl>
      {ids.map((id, i) => <ReactorUnit key={id} id={id} x0={30 + i * 210} />)}
      {/* slurry transfer header */}
      <Pipe pts={[[52, 500], [1012, 500]]} kind="process" w={5} speed={0.6} />
      <Lbl x={156} y={494} size={9.5} muted>Slurry transfer</Lbl>

      {/* isolation and drying */}
      <Zone x={892} y={40} w={376} h={484} label="Isolation and drying" />
      <Pipe pts={[[898, 500], [898, 160], [918, 160]]} kind="process" w={4} flow={anfdOn} speed={0.6} />
      <Pipe pts={[[898, 288], [961, 288], [961, 300]]} kind="process" w={4} flow={cf1} speed={0.6} />
      <Pipe pts={[[1012, 500], [1012, 288], [1075, 288], [1075, 300]]} kind="process" w={4} flow={cf2} speed={0.6} />
      <Valve x={930} y={288} s={6} open={cf1} /><Valve x={1012} y={460} s={6} rot={90} open={cf2} />
      <Equip a="ANFD-201" x={910} y={62} w={92} h={150} label="ANFD-201" sub="2.5 m² filter-dryer" noId><ANFD x={918} y={96} on={anfdOn} /></Equip>
      <Val a="ANFD-201" t="vacuum" x={1012} y={66} w={96} />
      <Val a="ANFD-201" t="product_temp" x={1012} y={106} w={96} label="Product temp" />
      <Val a="ANFD-201" t="torque" x={1012} y={146} w={96} label="Agitator torque" />
      <Val a="ANFD-201" t="lod" x={1012} y={186} w={96} label="LOD" dec={2} />
      <Equip a="RCVD-301" x={1120} y={64} w={140} h={116} label="RCVD-301" sub="rotary cone dryer 3 KL" noId><RCVD cx={1190} cy={118} on /></Equip>
      <Val a="RCVD-301" t="dry_time" x={1116} y={214} w={72} label="To LOD end" />
      <Val a="RCVD-301" t="lod" x={1192} y={214} w={70} label="LOD" dec={2} />
      <Equip a="CF-201" x={910} y={296} w={102} h={82} label="CF-201" noId><Centrifuge x={916} y={300} on={cf1} /></Equip>
      <Val a="CF-201" t="speed" x={910} y={404} w={92} label="Basket speed" />
      <Val a="CF-201" t="vibration" x={910} y={444} w={92} label="Vibration" />
      <Equip a="CF-202" x={1024} y={296} w={102} h={82} label="CF-202" sub="lower bearing alarm" noId><Centrifuge x={1030} y={300} on={cf2} /></Equip>
      <Val a="CF-202" t="vibration" x={1136} y={272} w={126} label="Bearing vibration" big />
      <Val a="CF-202" t="speed" x={1136} y={326} w={126} label="Basket speed" />
      <Val a="CF-202" t="current" x={1136} y={366} w={126} label="Drive current" />
      <Val a="CF-202" t="cake_lod" x={1136} y={406} w={126} label="Wet cake LOD" />
      <MiniTrend a="CF-202" t="vibration" x={1136} y={450} w={126} h={26} />
      <Lbl x={1028} y={428} size={9.5} muted>Cake → RCVD-301</Lbl>
      <Lbl x={1028} y={441} size={9.5} muted>Liquor → SRP</Lbl>

      {/* utilities */}
      <Zone x={16} y={532} w={868} h={180} />
      <Lbl x={96} y={548} size={10.5} muted bold>JACKET UTILITIES</Lbl>
      <Pipe pts={[[24, HDR.steam], [876, HDR.steam]]} kind="steam" w={5} />
      <Pipe pts={[[24, HDR.chw], [876, HDR.chw]]} kind="chw" w={5} />
      <Pipe pts={[[24, HDR.brine], [876, HDR.brine]]} kind="chw" w={5} speed={1.2} />
      <Pipe pts={[[876, HDR.ret], [24, HDR.ret]]} kind="water" w={5} dashed />
      <Lbl x={96} y={HDR.steam - 5} size={9.5} muted>Steam · BL-601</Lbl>
      <Lbl x={96} y={HDR.chw - 5} size={9.5} muted>Chilled water 7 °C · CH-601</Lbl>
      <Lbl x={96} y={HDR.brine - 5} size={9.5} muted>Brine −15 °C · BR-601</Lbl>
      <Lbl x={96} y={HDR.ret - 5} size={9.5} muted>Jacket return</Lbl>
      <Lbl x={96} y={HDR.ret + 22} size={9.5} muted>Open valve = utility on the jacket for the current phase</Lbl>
      <Zone x={892} y={532} w={376} h={180} label="Utility plant" />
      {[['BL-601', 'Boiler 6 TPH', [['pressure', 'Header pressure'], ['steam', 'Steam']]], ['CH-601', 'Chiller 300 TR', [['supply_temp', 'CHW supply'], ['cop', 'COP']]], ['BR-601', 'Brine 120 TR', [['supply_temp', 'Brine supply'], ['flow', 'Brine flow']]]].map(([a, name, vals], i) => {
        const x = 904 + i * 120;
        return <g key={a}>
          <Equip a={a} x={x} y={572} w={108} h={30} noId><Box x={x} y={572} w={108} h={30} title={a} /></Equip>
          <Lbl x={x} y={616} size={9.5} muted>{name}</Lbl>
          {vals.map(([t, l], j) => <Val key={t} a={a} t={t} x={x} y={624 + j * 40} w={108} label={l} dec={t === 'cop' ? 2 : undefined} />)}
        </g>;
      })}
    </Mimic>
  );
}

/* ======================= OSD line (pharma-formulation) ======================= */

function OsdLine({ c }) {
  const rmgOn = useLive('RMG-01', 'impeller_speed', c).v > 20;
  const rmgKw = useLive('RMG-01', 'impeller_power', c).v;
  const fbdOn = useLive('FBD-01', 'airflow', c).v > 500;
  const bbRpm = useLive('BB-01', 'speed', c).v; const bbOn = bbRpm > 2;
  const tpOn = useLive('TP-02', 'turret_speed', c).v > 5;
  const panRpm = useLive('COT-01', 'pan_speed', c).v; const cotOn = panRpm > 1;
  const endpoint = rmgKw == null ? '—' : rmgKw >= 22 ? 'End-point reached (power plateau)' : 'Wet massing · below 22 kW';
  return (
    <Mimic c={c} w={1280} h={720} note="DS = design space from the BPR">
      <Title x={24} y={30}>OSD Plant 2 · granulation to coating</Title>
      {/* cleanroom zones */}
      <Zone x={16} y={40} w={520} h={492} label="Dispensing and granulation · Grade D" />
      <Zone x={546} y={40} w={150} h={492} label="Blending · Grade D" />
      <Zone x={706} y={40} w={300} h={492} label="Compression · Grade D · AHU-03" />
      <Zone x={1016} y={40} w={248} h={492} label="Coating · Grade D · AHU-05" />
      <Lbl x={28} y={74} size={9.5} muted>Room ΔP / RH: no BMS feed for this suite</Lbl>
      <Val a="AHU-03" t="room_dp" x={716} y={62} w={92} label="Room ΔP" />
      <Val a="AHU-03" t="rh" x={812} y={62} w={92} label="Room RH" />
      <Val a="AHU-03" t="temp" x={908} y={62} w={90} label="Room temp" />
      <Val a="AHU-05" t="room_dp" x={1026} y={62} w={76} label="Room ΔP" />
      <Val a="AHU-05" t="rh" x={1106} y={62} w={72} label="RH" />
      <Val a="AHU-05" t="temp" x={1182} y={62} w={74} label="Temp" />

      {/* dispensing */}
      <Booth x={30} y={120} w={110} h={190} />
      <Lbl x={85} y={330} size={12} bold anchor="middle">Dispensing</Lbl>
      <Lbl x={85} y={344} size={10.5} muted anchor="middle">RLAF booth · weighed RM</Lbl>
      <Pipe pts={[[140, 290], [150, 290], [150, 176], [240, 176], [240, 192]]} kind="material" w={5} speed={0.6} />
      {/* binder */}
      <Tank x={284} y={104} w={30} h={44} />
      <Lbl x={320} y={118} size={9.5} muted>Binder</Lbl>
      <Pipe pts={[[299, 148], [299, 160], [282, 160], [282, 196]]} kind="water" w={3} speed={0.8} />
      {/* RMG */}
      <Equip a="RMG-01" noId x={160} y={180} w={186} h={160} label="RMG-01 · 600 L" sub={endpoint}><RMG x={186} y={200} w={130} h={100} on={rmgOn} /></Equip>
      <Val a="RMG-01" t="impeller_power" x={170} y={378} w={130} label="Impeller power" />
      <Val a="RMG-01" t="impeller_speed" x={170} y={416} w={130} label="Impeller speed" />
      <Val a="RMG-01" t="binder_rate" x={170} y={454} w={130} label="Binder rate" />
      <Val a="RMG-01" t="product_temp" x={170} y={492} w={130} label="Product temp" />
      <Pipe pts={[[330, 279], [352, 279], [352, 262], [388, 262]]} kind="material" w={5} speed={0.6} />
      <Lbl x={334} y={300} size={9.5} muted>Wet mill</Lbl>
      {/* FBD */}
      <Pipe pts={[[340, 316], [400, 316]]} kind="air" w={6} flow={fbdOn} speed={1.4} />
      <Lbl x={340} y={334} size={9.5} muted>Inlet air</Lbl>
      <Equip a="FBD-01" noId x={372} y={100} w={130} h={244} label="FBD-01 · 300 kg"><FBD x={382} y={110} w={110} on={fbdOn} /></Equip>
      <Pipe pts={[[437, 110], [437, 92], [512, 92], [512, 108]]} kind="air" w={6} flow={fbdOn} speed={1.4} />
      <Fan x={512} y={124} r={14} on={fbdOn} speed={1.5} />
      <Lbl x={512} y={152} size={9.5} muted anchor="middle">Exhaust</Lbl>
      <Val a="FBD-01" t="inlet_temp" x={366} y={378} w={140} label="Inlet air temp" />
      <Val a="FBD-01" t="exhaust_temp" x={366} y={416} w={140} label="Outlet air (product) temp" />
      <Val a="FBD-01" t="lod" x={366} y={454} w={140} label="Granule LOD" dec={2} />
      <Val a="FBD-01" t="airflow" x={366} y={492} w={140} label="Air flow" />
      {/* co-mill to blender */}
      <Pipe pts={[[492, 250], [512, 250]]} kind="material" w={5} speed={0.6} />
      <Pipe pts={[[520, 262], [520, 290], [560, 290]]} kind="material" w={5} speed={0.6} />
      <g className="m-shape"><path d="M508 240 H532 L525 262 H515 Z" fill="url(#m-metal)" /><path d="M508 240 H532 L525 262 H515 Z" className="m-edge" /></g>
      <Lbl x={533} y={232} size={9.5} muted anchor="end">Co-mill</Lbl>
      {/* blender */}
      <Equip a="BB-01" noId x={556} y={160} w={130} h={180} label="BB-01 · bin blender" sub="1,200 L IBC"><BinBlender cx={606} cy={226} on={bbOn} rpm={bbRpm || 12} /></Equip>
      <Val a="BB-01" t="speed" x={556} y={378} w={130} label="Blender speed" />
      <Val a="BB-01" t="blend_rsd" x={556} y={416} w={130} label="Blend uniformity RSD" dec={2} />
      <Val a="BB-01" t="power" x={556} y={454} w={130} label="Drive power" />
      <Pipe pts={[[686, 140], [736, 140], [736, 126], [792, 126]]} kind="material" w={5} speed={0.6} />
      <Lbl x={692} y={132} size={9.5} muted>IBC</Lbl>
      {/* tablet presses */}
      <Equip a="TP-02" noId x={724} y={114} w={172} h={224} label="TP-02 · 45-station press" sub="punch wear · feeder fill"><TabletPress x={730} y={120} w={160} on={tpOn} /></Equip>
      <Val a="TP-02" t="turret_speed" x={716} y={378} w={136} label="Turret speed" />
      <Val a="TP-02" t="main_force" x={716} y={416} w={136} label="Main compression force" />
      <Val a="TP-02" t="hardness" x={716} y={454} w={136} label="Hardness (IPC)" />
      <Val a="TP-02" t="weight_rsd" x={860} y={378} w={140} label="Tablet weight RSD" big dec={2} />
      <Val a="TP-02" t="weight" x={860} y={430} w={140} label="Tablet weight (avg)" />
      <MiniTrend a="TP-02" t="weight_rsd" x={860} y={472} w={140} h={30} />
      {[['TP-01', 128], ['TP-03', 216]].map(([a, y]) => <g key={a}>
        <Equip a={a} x={918} y={y} w={80} h={28} noId><Box x={918} y={y} w={80} h={28} title={a} /></Equip>
        <Lamp a={a} x={990} y={y + 8} r={4} />
        <Val a={a} t="turret_speed" x={918} y={y + 36} w={80} label="Turret" />
      </g>)}
      <Pipe pts={[[906, 258], [912, 258], [912, 316], [1020, 316], [1020, 290], [1036, 290]]} kind="material" w={4} speed={0.7} />
      <Lbl x={930} y={332} size={9.5} muted>Cores → coater</Lbl>
      {/* coater */}
      <Pipe pts={[[1100, 104], [1100, 126]]} kind="air" w={8} flow={cotOn} speed={1.4} />
      <Lbl x={1092} y={114} size={9.5} muted anchor="end">Inlet air</Lbl>
      <Pipe pts={[[1196, 286], [1238, 286], [1238, 140]]} kind="air" w={8} flow={cotOn} speed={1.4} />
      <text x={1254} y={214} transform="rotate(-90 1254 214)" textAnchor="middle" className="m-text muted" style={{ fontSize: 9.5 }}>Exhaust → dust collector</text>
      <Equip a="COT-01" noId x={1030} y={120} w={172} h={200} label="COT-01 · 48″ coater" sub="exhaust low · over-wetting"><Coater x={1036} y={126} w={160} h={186} on={cotOn} rpm={panRpm || 8} /></Equip>
      <Val a="COT-01" t="exhaust_temp" x={1026} y={378} w={116} label="Exhaust temp" />
      <Val a="COT-01" t="spray_rate" x={1026} y={416} w={116} label="Spray rate" />
      <Val a="COT-01" t="pan_speed" x={1026} y={454} w={116} label="Pan speed" />
      <Val a="COT-01" t="inlet_temp" x={1146} y={378} w={110} label="Inlet temp" />
      <Val a="COT-01" t="airflow" x={1146} y={416} w={110} label="Exhaust flow" />

      {/* CPP design space */}
      <Zone x={16} y={544} w={1248} h={168} label="Critical process parameters · design space (BPR)" />
      {[
        ['RMG-01', 'product_temp', 'RMG product temp', 20, 45],
        ['FBD-01', 'inlet_temp', 'FBD inlet air', 45, 75],
        ['FBD-01', 'lod', 'FBD granule LOD', 0, 4, 2],
        ['BB-01', 'blend_rsd', 'Blend RSD', 0, 6, 2],
        ['TP-02', 'main_force', 'TP-02 force', 8, 21],
        ['TP-02', 'weight', 'TP-02 weight', 235, 265],
        ['TP-02', 'weight_rsd', 'TP-02 weight RSD', 0, 3, 2],
        ['TP-02', 'hardness', 'TP-02 hardness', 4, 15],
        ['COT-01', 'inlet_temp', 'Coater inlet', 45, 80],
        ['COT-01', 'exhaust_temp', 'Coater exhaust', 30, 52],
        ['COT-01', 'spray_rate', 'Spray rate', 120, 240, 0],
      ].map(([a, t, l, mn, mx, dec], i) => <Cpp key={a + t} a={a} t={t} x={36 + i * 112} y={588} min={mn} max={mx} label={l} dec={dec ?? 1} />)}
    </Mimic>
  );
}

export default { 'reactor-train': ReactorTrain, 'osd-line': OsdLine };
