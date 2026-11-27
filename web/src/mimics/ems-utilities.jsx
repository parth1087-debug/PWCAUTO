/* EMS utilities: compressed air, chilled water, steam and natural gas networks (Meridian Industrial Park, Campus 1).
   The electrical views (energy flow, SLD, busbars, DG/VFD, power quality) are drawn in ems.jsx. */
import React from 'react';
import { Mimic, Equip, Val, Pipe, Pump, Valve, Tank, Vessel, Lbl, Title, Zone, MiniTrend, BarInd, Gauge, Motor, Lamp, useLive, useMimic } from './kit.jsx';

/* ---------------- local shapes ---------------- */

/** Packaged oil-injected screw compressor: enclosure, motor, airend, separator, cooler fan. */
function AirComp({ x, y, w = 130, h = 80, on, loaded, vsd }) {
  const fx = x + w - 26, fy = y + 24;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x} y={y} width={w} height={h} rx="5" className="m-body" /><rect x={x} y={y} width={w} height={h} rx="5" className="m-edge" />
    {[0, 1, 2, 3, 4].map(i => <line key={i} x1={x + 8} y1={y + 12 + i * 7} x2={x + 26} y2={y + 12 + i * 7} className="m-glyph" />)}
    {/* motor with fins, coupling, airend */}
    <rect x={x + 10} y={y + h - 34} width={38} height={24} rx="3" fill="url(#m-metal)" className="m-edge" />
    {[0, 1, 2, 3, 4].map(i => <line key={i} x1={x + 16 + i * 7} y1={y + h - 34} x2={x + 16 + i * 7} y2={y + h - 10} className="m-glyph" style={{ strokeWidth: 0.8 }} />)}
    <line x1={x + 48} y1={y + h - 22} x2={x + 56} y2={y + h - 22} className="m-edge" />
    <rect x={x + 56} y={y + h - 36} width={30} height={28} rx="7" fill="url(#m-metal)" className="m-edge" />
    <path d={`M${x + 60} ${y + h - 30} q6 6 0 12 q6 6 0 12 M${x + 70} ${y + h - 30} q6 6 0 12 q6 6 0 12`} className="m-glyph" style={{ strokeWidth: 0.9 }} />
    {/* oil separator */}
    <rect x={x + 92} y={y + h - 38} width={14} height={32} rx="6" fill="url(#m-metal)" className="m-edge" />
    {/* cooler fan (top view) */}
    <circle cx={fx} cy={fy} r={15} className="m-edge" />
    <g className="m-spin" style={{ transformOrigin: `${fx}px ${fy}px`, animationDuration: loaded ? '0.7s' : '1.6s' }}>
      {[0, 90, 180, 270].map(a => <path key={a} d={`M${fx} ${fy} Q${fx + 4} ${fy - 8} ${fx} ${fy - 13} Q${fx - 6} ${fy - 8} ${fx} ${fy}`} transform={`rotate(${a} ${fx} ${fy})`} className="m-blade" />)}
    </g>
    <circle cx={fx} cy={fy} r="2.5" className="m-hub" />
    {vsd && <g><rect x={x + 34} y={y + 8} width={34} height={15} rx="3" className="m-edge" /><text x={x + 51} y={y + 19} textAnchor="middle" className="m-sub" style={{ fontWeight: 650 }}>VSD</text></g>}
    <circle cx={x + w - 8} cy={y + h - 8} r="3.5" className="m-run" />
  </g>;
}

/** Refrigerated air dryer cabinet with air-to-air and air-to-refrigerant exchangers and a condenser fan. */
function Dryer({ x, y, w = 80, h = 130, on = true }) {
  const fx = x + w / 2, fy = y + 26;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x} y={y} width={w} height={h} rx="5" className="m-body" /><rect x={x} y={y} width={w} height={h} rx="5" className="m-edge" />
    <circle cx={fx} cy={fy} r={15} className="m-edge" />
    <g className="m-spin" style={{ transformOrigin: `${fx}px ${fy}px`, animationDuration: '1s' }}>{[0, 120, 240].map(a => <path key={a} d={`M${fx} ${fy} Q${fx + 4} ${fy - 8} ${fx} ${fy - 13} Q${fx - 6} ${fy - 8} ${fx} ${fy}`} transform={`rotate(${a} ${fx} ${fy})`} className="m-blade" />)}</g>
    <rect x={x + 12} y={y + 52} width={w - 24} height={30} rx="3" className="m-edge" />
    <path d={`M${x + 16} ${y + 67} l7 -9 l7 18 l7 -18 l7 18 l7 -18 l7 9`} className="m-glyph" />
    <rect x={x + 12} y={y + 88} width={w - 24} height={22} rx="3" className="m-edge" />
    <path d={`M${x + 18} ${y + 99} H${x + w - 18}`} className="m-glyph" strokeDasharray="3 3" />
    <circle cx={x + w - 9} cy={y + h - 9} r="3.5" className="m-run" />
  </g>;
}

/** Vertical air receiver with dished heads, legs, safety valve and drain. */
function Receiver({ x, y, w = 70, h = 180 }) {
  const d = `M${x} ${y + 18} Q${x} ${y} ${x + w / 2} ${y} Q${x + w} ${y} ${x + w} ${y + 18} V${y + h - 18} Q${x + w} ${y + h} ${x + w / 2} ${y + h} Q${x} ${y + h} ${x} ${y + h - 18} Z`;
  return <g className="m-shape">
    <path d={d} className="m-body" /><path d={d} className="m-edge" />
    <line x1={x + 6} y1={y + h - 8} x2={x - 4} y2={y + h + 18} className="m-edge" /><line x1={x + w - 6} y1={y + h - 8} x2={x + w + 4} y2={y + h + 18} className="m-edge" />
    <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y - 12} className="m-edge" /><path d={`M${x + w / 2 - 5} ${y - 12} h10 l-5 -8 z`} className="m-body" />
    <line x1={x + w / 2} y1={y + h} x2={x + w / 2} y2={y + h + 12} className="m-edge" /><rect x={x + w / 2 - 4} y={y + h + 12} width={8} height={6} className="m-edge" />
    <text x={x + w / 2} y={y + h / 2} textAnchor="middle" className="m-sub">10 m³</text>
  </g>;
}

/** Plant air user (drop with FRL and tool). */
function AirUser({ x, y, label }) {
  return <g className="m-shape">
    <rect x={x - 26} y={y} width={52} height={26} rx="4" className="m-body" /><rect x={x - 26} y={y} width={52} height={26} rx="4" className="m-edge" />
    <circle cx={x - 12} cy={y + 13} r="5" className="m-edge" /><rect x={x - 2} y={y + 7} width={7} height={12} rx="2" className="m-edge" /><path d={`M${x + 10} ${y + 13} h10`} className="m-glyph" />
    <text x={x} y={y + 40} textAnchor="middle" className="m-sub">{label}</text>
  </g>;
}

/** Water-cooled chiller: condenser shell over evaporator shell, compressor and motor on top. */
function Chiller({ x, y, w = 170, h = 100, on = true, centrifugal }) {
  const shell = (yy, hh, lab) => <g>
    <rect x={x + 8} y={yy} width={w - 16} height={hh} rx={hh / 2} fill="url(#m-metal)" className="m-body" /><rect x={x + 8} y={yy} width={w - 16} height={hh} rx={hh / 2} className="m-edge" />
    <rect x={x + 2} y={yy + 3} width={10} height={hh - 6} rx="2" className="m-body" /><rect x={x + 2} y={yy + 3} width={10} height={hh - 6} rx="2" className="m-edge" />
    <rect x={x + w - 12} y={yy + 3} width={10} height={hh - 6} rx="2" className="m-body" /><rect x={x + w - 12} y={yy + 3} width={10} height={hh - 6} rx="2" className="m-edge" />
    <text x={x + w / 2} y={yy + hh / 2 + 4} textAnchor="middle" className="m-sub">{lab}</text>
  </g>;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    {/* compressor + motor */}
    <rect x={x + 40} y={y + 4} width={56} height={20} rx="4" fill="url(#m-metal)" className="m-edge" />
    {[0, 1, 2, 3, 4, 5].map(i => <line key={i} x1={x + 46 + i * 8} y1={y + 4} x2={x + 46 + i * 8} y2={y + 24} className="m-glyph" style={{ strokeWidth: 0.8 }} />)}
    {centrifugal ? <g><circle cx={x + 110} cy={y + 14} r={13} className="m-body" /><circle cx={x + 110} cy={y + 14} r={13} className="m-edge" /><path d={`M${x + 110} ${y + 14} m-7 0 a7 7 0 1 1 7 7`} className="m-glyph" /></g>
      : <g><rect x={x + 96} y={y + 2} width={30} height={24} rx="6" className="m-body" /><rect x={x + 96} y={y + 2} width={30} height={24} rx="6" className="m-edge" /><path d={`M${x + 101} ${y + 8} q5 6 0 12 M${x + 111} ${y + 8} q5 6 0 12`} className="m-glyph" /></g>}
    <line x1={x + 68} y1={y + 24} x2={x + 68} y2={y + 30} className="m-edge" />
    {shell(y + 30, 32, 'Condenser')}
    <line x1={x + 40} y1={y + 62} x2={x + 40} y2={y + 68} className="m-edge" /><line x1={x + 130} y1={y + 62} x2={x + 130} y2={y + 68} className="m-edge" />
    {shell(y + 68, 32, 'Evaporator')}
    <circle cx={x + 26} cy={y + 14} r="3.5" className="m-run" />
  </g>;
}

/** Induced-draft counterflow cooling tower: fan stack, fill, louvres, basin. */
function CoolingTower({ x, y, w = 140, h = 100, on = true, speed = 1 }) {
  const sx = x + w / 2;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <path d={`M${sx - 34} ${y} L${sx - 26} ${y - 24} H${sx + 26} L${sx + 34} ${y} Z`} className="m-body" /><path d={`M${sx - 34} ${y} L${sx - 26} ${y - 24} H${sx + 26} L${sx + 34} ${y} Z`} className="m-edge" />
    <g className={on ? 'm-spin-y' : ''} style={{ transformOrigin: `${sx}px ${y - 10}px`, animationDuration: `${1.4 / speed}s` }}><line x1={sx - 26} y1={y - 10} x2={sx + 26} y2={y - 10} className="m-blade-l" /></g>
    <rect x={sx - 6} y={y - 34} width={12} height={10} rx="2" className="m-body" /><rect x={sx - 6} y={y - 34} width={12} height={10} rx="2" className="m-edge" />
    <rect x={x} y={y} width={w} height={h} rx="3" className="m-body" /><rect x={x} y={y} width={w} height={h} rx="3" className="m-edge" />
    {/* drift eliminator, spray, fill */}
    <line x1={x + 6} y1={y + 12} x2={x + w - 6} y2={y + 12} className="m-glyph" strokeDasharray="2 3" />
    {Array.from({ length: 6 }).map((_, i) => <path key={i} d={`M${x + 14 + i * ((w - 28) / 5)} ${y + 20} l-4 6 m4 -6 l4 6`} className="m-glyph" style={{ strokeWidth: 0.8 }} />)}
    <rect x={x + 8} y={y + 32} width={w - 16} height={30} className="m-edge" />
    {Array.from({ length: 9 }).map((_, i) => <line key={i} x1={x + 12 + i * ((w - 24) / 9)} y1={y + 32} x2={x + 22 + i * ((w - 24) / 9)} y2={y + 62} className="m-glyph" style={{ strokeWidth: 0.7 }} />)}
    {/* air inlet louvres */}
    {[0, 1, 2].map(i => <line key={i} x1={x + 4} y1={y + 68 + i * 6} x2={x + 16} y2={y + 72 + i * 6} className="m-glyph" />)}
    {[0, 1, 2].map(i => <line key={i} x1={x + w - 4} y1={y + 68 + i * 6} x2={x + w - 16} y2={y + 72 + i * 6} className="m-glyph" />)}
    {/* basin */}
    <rect x={x - 6} y={y + h - 14} width={w + 12} height={16} rx="2" className="m-body" />
    <rect x={x - 4} y={y + h - 9} width={w + 8} height={9} fill="url(#m-liquid)" opacity=".7" />
    <rect x={x - 6} y={y + h - 14} width={w + 12} height={16} rx="2" className="m-edge" />
  </g>;
}

/** Air handling unit: filter, cooling coil, supply fan. */
function AHU({ x, y, w = 96, h = 48, on = true }) {
  const fx = x + w - 20, fy = y + h / 2;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x} y={y} width={w} height={h} rx="4" className="m-body" /><rect x={x} y={y} width={w} height={h} rx="4" className="m-edge" />
    <path d={`M${x + 10} ${y + 6} l6 6 l-6 6 l6 6 l-6 6 l6 6 l-6 6`} className="m-glyph" style={{ strokeWidth: 0.9 }} />
    <rect x={x + 26} y={y + 6} width={18} height={h - 12} className="m-edge" />
    <path d={`M${x + 28} ${y + 10} h14 m-14 6 h14 m-14 6 h14 m-14 6 h14 m-14 6 h14`} className="m-glyph" style={{ strokeWidth: 0.8 }} />
    <circle cx={fx} cy={fy} r={14} className="m-edge" />
    <g className="m-spin" style={{ transformOrigin: `${fx}px ${fy}px`, animationDuration: '0.9s' }}>{[0, 120, 240].map(a => <path key={a} d={`M${fx} ${fy} Q${fx + 4} ${fy - 7} ${fx} ${fy - 12} Q${fx - 5} ${fy - 7} ${fx} ${fy}`} transform={`rotate(${a} ${fx} ${fy})`} className="m-blade" />)}</g>
    <circle cx={x + w - 6} cy={y + h - 6} r="3" className="m-run" />
  </g>;
}

/** VFD panel (small cabinet with display). */
function VfdBox({ x, y, on = true }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x} y={y} width={26} height={34} rx="3" className="m-body" /><rect x={x} y={y} width={26} height={34} rx="3" className="m-edge" />
    <rect x={x + 5} y={y + 5} width={16} height={9} rx="1" className="m-edge" /><text x={x + 13} y={y + 28} textAnchor="middle" className="m-sub" style={{ fontSize: 8 }}>VFD</text>
  </g>;
}

/** Horizontal three-pass shell (fire-tube) boiler. Gas: burner on the front; biomass: grate furnace with hopper. */
function ShellBoiler({ x, y, w = 210, h = 90, on = true, biomass }) {
  const fx = biomass ? x + 74 : x;   // shell starts after the furnace
  const sw = w - (fx - x);
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    {biomass ? <g>
      {/* fuel hopper, screw feeder, refractory furnace with travelling grate */}
      <path d={`M${x + 10} ${y - 40} H${x + 60} L${x + 46} ${y - 8} H${x + 24} Z`} className="m-body" /><path d={`M${x + 10} ${y - 40} H${x + 60} L${x + 46} ${y - 8} H${x + 24} Z`} className="m-edge" />
      <rect x={x} y={y - 6} width={74} height={h + 10} rx="3" className="m-body" /><rect x={x} y={y - 6} width={74} height={h + 10} rx="3" className="m-edge" />
      <rect x={x + 8} y={y + 6} width={58} height={h - 24} rx="2" className="m-edge" />
      {on && <path d={`M${x + 14} ${y + h - 20} q10 -40 18 -10 q8 -36 16 -4 q8 -28 12 4 Z`} fill="url(#m-flame)" className="m-flame" />}
      <path d={`M${x + 8} ${y + h - 14} l6 -4 l6 4 l6 -4 l6 4 l6 -4 l6 4 l6 -4 l6 4 l6 -4 l4 3`} className="m-glyph" />
      <line x1={x + 66} y1={y + 30} x2={x + 74} y2={y + 30} className="m-edge" />
    </g> : <g>
      {/* burner + blower on the front plate */}
      <rect x={x - 34} y={y + h / 2 - 18} width={34} height={36} rx="4" className="m-body" /><rect x={x - 34} y={y + h / 2 - 18} width={34} height={36} rx="4" className="m-edge" />
      <circle cx={x - 22} cy={y + h / 2} r="9" className="m-edge" /><path d={`M${x - 22} ${y + h / 2 - 6} v12 M${x - 28} ${y + h / 2} h12`} className="m-glyph" />
    </g>}
    <rect x={fx} y={y} width={sw} height={h} rx="16" fill="url(#m-metal)" className="m-body" /><rect x={fx} y={y} width={sw} height={h} rx="16" className="m-edge" />
    {/* furnace tube (1st pass) and tube passes */}
    <rect x={fx + 8} y={y + h - 36} width={sw - 30} height={24} rx="12" className="m-edge" />
    {on && !biomass && <path d={`M${fx + 10} ${y + h - 24} q30 -10 ${sw * 0.55} 0 q-${sw * 0.25} 10 -${sw * 0.55} 0 Z`} fill="url(#m-flame)" className="m-flame" />}
    {[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx={fx + 22 + i * ((sw - 50) / 5)} cy={y + 22} r="4" className="m-glyph" />)}
    {[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx={fx + 22 + i * ((sw - 50) / 5)} cy={y + 36} r="4" className="m-glyph" />)}
    {/* water level line */}
    <line x1={fx + 10} y1={y + 12} x2={fx + sw - 10} y2={y + 12} className="m-glyph" strokeDasharray="4 3" />
    {/* saddles */}
    <path d={`M${fx + 24} ${y + h} l-6 10 h28 l-6 -10 M${fx + sw - 48} ${y + h} l-6 10 h28 l-6 -10`} className="m-edge" />
    <circle cx={fx + sw - 10} cy={y + h - 8} r="3.5" className="m-run" />
  </g>;
}

/** Stack with cap. */
const Stack = ({ x, y, h, w = 18 }) => <g className="m-shape"><rect x={x} y={y} width={w} height={h} className="m-body" /><rect x={x} y={y} width={w} height={h} className="m-edge" /><path d={`M${x - 4} ${y} h${w + 8}`} className="m-edge" /></g>;

/** Thermodynamic steam trap symbol (circle with T); failed traps drawn as alarm lamps. */
const Trap = ({ x, y, failed }) => <g className="m-shape"><circle cx={x} cy={y} r="8" className={failed ? 'm-lamp bad' : 'm-body'} /><circle cx={x} cy={y} r="8" className="m-edge" /><text x={x} y={y + 3.5} textAnchor="middle" className="m-inner" style={{ fontSize: 9 }}>T</text></g>;

/** Jacketed process vessel used as a steam user. */
const SteamUser = ({ x, y, w = 50, h = 70 }) => <Vessel x={x} y={y} w={w} h={h} jacket />;

/** Gas filter (vertical cartridge vessel). */
const GasFilter = ({ x, y, w = 30, h = 56 }) => <g className="m-shape"><rect x={x} y={y} width={w} height={h} rx={w / 2.5} className="m-body" /><rect x={x} y={y} width={w} height={h} rx={w / 2.5} className="m-edge" /><path d={`M${x + 6} ${y + 14} h${w - 12} m${-(w - 12)} 8 h${w - 12} m${-(w - 12)} 8 h${w - 12} m${-(w - 12)} 8 h${w - 12}`} className="m-glyph" strokeDasharray="2 2" /></g>;

/** Turbine gas meter with flanges and electronic volume corrector (EVC). */
function TurbineMeter({ x, y }) {
  return <g className="m-shape">
    <rect x={x - 4} y={y - 4} width={6} height={32} className="m-body" /><rect x={x + 58} y={y - 4} width={6} height={32} className="m-body" />
    <rect x={x} y={y} width={60} height={24} rx="4" fill="url(#m-metal)" className="m-body" /><rect x={x} y={y} width={60} height={24} rx="4" className="m-edge" />
    <path d={`M${x + 14} ${y + 4} l8 16 m4 -16 l8 16 m4 -16 l8 16`} className="m-glyph" />
    <rect x={x + 20} y={y - 18} width={20} height={14} rx="2" className="m-body" /><rect x={x + 20} y={y - 18} width={20} height={14} rx="2" className="m-edge" />
    <rect x={x + 10} y={y - 64} width={40} height={32} rx="3" className="m-body" /><rect x={x + 10} y={y - 64} width={40} height={32} rx="3" className="m-edge" />
    <rect x={x + 15} y={y - 59} width={30} height={10} rx="1" className="m-edge" /><text x={x + 30} y={y - 37} textAnchor="middle" className="m-sub" style={{ fontSize: 8 }}>EVC</text>
    <line x1={x + 30} y1={y - 32} x2={x + 30} y2={y - 18} className="m-glyph" strokeDasharray="2 2" />
  </g>;
}

/** Spring-loaded pressure regulator (self-operated): valve body + diaphragm housing + sensing line. */
function Regulator({ x, y, s = 13, label }) {
  return <g className="m-shape">
    <Valve x={x} y={y} s={s} open />
    <line x1={x} y1={y} x2={x} y2={y - 20} className="m-edge" />
    <path d={`M${x - 16} ${y - 20} h32 a16 9 0 0 0 -32 0 z`} className="m-body" /><path d={`M${x - 16} ${y - 20} h32 a16 9 0 0 0 -32 0 z`} className="m-edge" />
    <path d={`M${x + 16} ${y - 22} h14 v22`} className="m-glyph" strokeDasharray="3 2" />
    {label && <text x={x} y={y + 24} textAnchor="middle" className="m-sub">{label}</text>}
  </g>;
}

/** Thermic fluid heater: vertical coil heater with top-fired burner. */
function TFHeater({ x, y, w = 90, h = 120, on = true }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x} y={y} width={w} height={h} rx="8" fill="url(#m-metal)" className="m-body" /><rect x={x} y={y} width={w} height={h} rx="8" className="m-edge" />
    <rect x={x + w / 2 - 14} y={y - 22} width={28} height={22} rx="3" className="m-body" /><rect x={x + w / 2 - 14} y={y - 22} width={28} height={22} rx="3" className="m-edge" />
    <path d={Array.from({ length: 8 }).map((_, i) => `M${x + 12} ${y + 18 + i * 11} H${x + w - 12}`).join(' ')} className="m-glyph" />
    <line x1={x + 12} y1={y + 14} x2={x + 12} y2={y + h - 14} className="m-glyph" /><line x1={x + w - 12} y1={y + 14} x2={x + w - 12} y2={y + h - 14} className="m-glyph" />
    {on && <path d={`M${x + w / 2 - 10} ${y + 6} q10 50 10 60 q0 -10 10 -60 Z`} fill="url(#m-flame)" className="m-flame" style={{ transformOrigin: 'top' }} />}
    <circle cx={x + w - 9} cy={y + h - 9} r="3.5" className="m-run" />
  </g>;
}

/** Burner on a boiler front (gas branch end). */
function BoilerFront({ x, y, on = true }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x} y={y - 22} width={34} height={44} rx="4" className="m-body" /><rect x={x} y={y - 22} width={34} height={44} rx="4" className="m-edge" />
    <circle cx={x + 17} cy={y - 6} r="9" className="m-edge" /><path d={`M${x + 17} ${y - 12} v12 M${x + 11} ${y - 6} h12`} className="m-glyph" />
    <rect x={x + 34} y={y - 40} width={96} height={80} rx="16" fill="url(#m-metal)" className="m-body" /><rect x={x + 34} y={y - 40} width={96} height={80} rx="16" className="m-edge" />
    <rect x={x + 40} y={y + 4} width={70} height={22} rx="11" className="m-edge" />
    {on && <path d={`M${x + 42} ${y + 15} q20 -8 50 0 q-25 8 -50 0 Z`} fill="url(#m-flame)" className="m-flame" />}
    <circle cx={x + 122} cy={y + 32} r="3.5" className="m-run" />
  </g>;
}

/* ---------------- compressed air network ---------------- */
const COMPS = [['AC-01', '160 kW · fixed speed'], ['AC-02', '160 kW · fixed speed'], ['AC-03', '132 kW · VSD trim'], ['AC-04', '160 kW · standby duty']];

function CompRow({ a, sub, i, y }) {
  const m = useMimic();
  const vsd = a === 'AC-03';
  const kw = m.read(a, 'kw').v || 0;
  const on = kw > 10;
  const ld = m.read(a, vsd ? 'speed' : 'load_pct').v || 0;
  // load / unload cycle: a fixed-speed unit is loaded for load_pct % of the time
  const loaded = on && (vsd || ((m.tick * 37 + i * 29) % 100) < ld);
  const state = !on ? 'Stopped' : vsd ? 'Running · speed control' : loaded ? 'Loaded' : 'Unloaded (running idle)';
  return <g>
    <Pipe d={`M150 ${y} V${y - 14} H460`} kind="air" w={5} flow={loaded} speed={loaded ? 1.3 : 0.5} />
    <Valve x={400} y={y - 14} s={8} open={loaded} />
    <Equip a={a} x={60} y={y} w={130} h={80} label={sub} sub={state}><AirComp x={60} y={y} on={on} loaded={loaded} vsd={vsd} /></Equip>
    <Val a={a} t="kw" x={206} y={y + 2} w={96} label="Power" />
    <Val a={a} t="fad" x={308} y={y + 2} w={108} label="Air delivery" />
    <Val a={a} t={vsd ? 'speed' : 'load_pct'} x={206} y={y + 44} w={96} label={vsd ? 'Motor speed' : 'Loaded time'} />
    <Val a={a} t="spec_power" x={308} y={y + 44} w={108} label="Specific power" />
  </g>;
}

function AirNetwork({ c }) {
  const leak = useLive('AR-01', 'leak_pct', c);
  const users = [[950, 'Block A'], [1040, 'Block B'], [1125, 'Paint line'], [1205, 'Assembly']];
  return (
    <Mimic c={c} w={1280} h={700} note="Fixed-speed units cycle load / unload by their loaded-time share">
      <Title x={24} y={30}>Compressed air network · 7 bar plant air</Title>
      <Zone x={30} y={44} w={420} h={640} label="Compressor house" />
      {COMPS.map(([a, sub], i) => <CompRow key={a} a={a} sub={sub} i={i} y={92 + i * 148} />)}
      {/* discharge collector */}
      <Pipe d="M460 64 V360 H500" kind="air" w={8} speed={1.2} />
      {/* air treatment */}
      <Zone x={470} y={44} w={300} h={640} label="Treatment and storage" />
      <Equip a="ADR-01" x={500} y={300} w={80} h={130} label="Refrigerated dryer" labelPos="above"><Dryer x={500} y={300} /></Equip>
      <Val a="ADR-01" t="dew_point" x={486} y={452} w={108} label="Pressure dew point" />
      <Val a="ADR-01" t="dp" x={486} y={494} w={108} label="Filter ΔP" />
      <Val a="ADR-01" t="kw" x={486} y={536} w={108} label="Dryer power" />
      <Pipe d="M580 360 H612 V330 H650" kind="air" w={8} speed={1.2} />
      <Lbl x={486} y={600} muted size={10}>Zero-loss drains → oil-water separator</Lbl>
      <Equip a="AR-01" x={650} y={250} w={70} h={180} label="Air receiver" labelPos="above" noId><Receiver x={650} y={250} /></Equip>
      <text x={685} y={472} textAnchor="middle" className="m-id">AR-01</text>
      <Val a="AR-01" t="recv_pressure" x={620} y={484} w={130} label="Receiver pressure" big />
      {/* main to ring */}
      <Pipe d="M720 300 H830" kind="air" w={10} speed={1.3} />
      <Valve x={752} y={300} s={10} open />
      <g className="m-shape"><rect x={776} y={290} width={26} height={20} rx="3" className="m-body" /><rect x={776} y={290} width={26} height={20} rx="3" className="m-edge" /><text x={789} y={304} textAnchor="middle" className="m-sub" style={{ fontSize: 8 }}>FT</text></g>
      <Val a="AR-01" t="flow" x={740} y={226} w={110} label="Total air flow" />
      {/* ring main */}
      <Zone x={790} y={44} w={470} h={640} label="Distribution · ring main" />
      <Pipe d="M830 140 H1240 V560 H830 Z" kind="air" w={8} speed={0.9} />
      {users.map(([x, l]) => <g key={l}><Pipe d={`M${x} 140 V96`} kind="air" w={4} speed={0.8} /><AirUser x={x} y={70} label="" /><Lbl x={x} y={62} anchor="middle" muted size={10}>{l}</Lbl></g>)}
      {[[900, 'Utility & packing'], [1040, 'Machine shop'], [1180, 'Paint line (idle Sundays)']].map(([x, l]) => <g key={l}><Pipe d={`M${x} 560 V600`} kind="air" w={4} speed={0.8} /><AirUser x={x} y={600} /><Lbl x={x} y={644} anchor="middle" muted size={10}>{l}</Lbl></g>)}
      <Equip a="AR-01" x={860} y={176} w={350} h={350} noId>
        <rect x={860} y={176} width={350} height={350} rx="8" fill="transparent" />
      </Equip>
      <Lbl x={880} y={200} bold size={12}>Header and leak monitoring · AR-01</Lbl>
      <Val a="AR-01" t="header_pressure" x={880} y={216} w={150} label="Header pressure (point of use)" big />
      <Val a="AR-01" t="plant_sp" x={1044} y={216} w={150} label="Plant specific power" big />
      <Val a="AR-01" t="leak_pct" x={880} y={278} w={150} label="Leak load (no-production flow)" big />
      <Val a="AR-01" t="flow" x={1044} y={278} w={150} label="Air delivery to users" big />
      <Lbl x={880} y={350} muted size={10}>Leak load, last 24 h</Lbl>
      <MiniTrend a="AR-01" t="leak_pct" x={880} y={358} w={150} h={40} />
      <Lbl x={1044} y={350} muted size={10}>Header pressure, last 24 h</Lbl>
      <MiniTrend a="AR-01" t="header_pressure" x={1044} y={358} w={150} h={40} />
      <BarInd a="AR-01" t="leak_pct" x={884} y={420} h={70} max={40} label="Leak %" />
      <Lbl x={920} y={432} size={10.5}>{leak.st === 'bad' ? 'Leak load above the 25 % limit.' : 'Leak load within limit.'}</Lbl>
      <Lbl x={920} y={448} muted size={10}>Sunday no-production flow shows the leaks.</Lbl>
      <Lbl x={920} y={464} muted size={10}>Header set 6.9 bar; highest user need 6.0 bar.</Lbl>
      <Lbl x={920} y={480} muted size={10}>Proposal: lower setpoint to 6.4 bar (AC sequencer).</Lbl>
    </Mimic>
  );
}

/* ---------------- chilled water circuit ---------------- */
function ChillerBlock({ a, x, lab, centrifugal }) {
  const m = useMimic(); const on = (m.read(a, 'kw').v || 0) > 20;
  const y = 290;
  return <g>
    {/* condenser water: supply drop (left), return rise (right) */}
    <Pipe d={`M${x + 22} 222 V${y + 30}`} kind="cw" w={5} flow={on} />
    <Pipe d={`M${x + 148} ${y + 30} V240`} kind="hot" w={5} flow={on} />
    {/* chilled water: return in (left), supply out (right) */}
    <Pipe d={`M${x + 22} 506 V${y + 100}`} kind="water" w={5} flow={on} />
    <Pipe d={`M${x + 148} ${y + 100} V480`} kind="chw" w={5} flow={on} />
    <Valve x={x + 148} y={y + 128} s={7} rot={90} open={on} />
    <Equip a={a} x={x} y={y} w={170} h={100} label={lab}><Chiller x={x} y={y} on={on} centrifugal={centrifugal} /></Equip>
    <Val a={a} t="kw_tr" x={x + 186} y={270} w={98} label="kW/TR" />
    <Val a={a} t="tr" x={x + 186} y={310} w={98} label="Cooling load" />
    <Val a={a} t="kw" x={x + 186} y={350} w={98} label="Power" />
    <Val a={a} t="cond_approach" x={x + 186} y={390} w={98} label="Cond. approach" />
    <Val a={a} t="chws" x={x + 290} y={270} w={84} label="CHW supply" />
    <Val a={a} t="chwr" x={x + 290} y={310} w={84} label="CHW return" />
    <Val a={a} t="delta_t" x={x + 290} y={350} w={84} label="CHW ΔT" />
    <Val a={a} t="cw_in" x={x + 290} y={390} w={84} label="CW inlet" />
  </g>;
}

function CTBlock({ a, vfd, x }) {
  const m = useMimic(); const sp = m.read(a, 'fan_speed').v || 0; const on = sp > 5;
  return <g>
    <Pipe d={`M${x + 116} 200 V222`} kind="cw" w={6} flow={on} />
    <Pipe d={`M${x - 14} 240 V112 H${x}`} kind="hot" w={6} flow={on} />
    <Equip a={a} x={x} y={100} w={140} h={100} noId><CoolingTower x={x} y={100} on={on} speed={sp / 70} /></Equip>
    <Lbl x={x} y={88} bold size={10.5}>{a}</Lbl>
    <Equip a={vfd} x={x + 110} y={60} w={26} h={34} noId><VfdBox x={x + 110} y={60} on={on} /></Equip>
    <text x={x + 123} y={54} textAnchor="middle" className="m-id">{vfd}</text>
    <Val a={a} t="approach" x={x + 160} y={60} w={96} label="Approach" />
    <Val a={a} t="cw_out" x={x + 160} y={100} w={96} label="Cold water out" />
    <Val a={a} t="range" x={x + 160} y={140} w={96} label="Range" />
    <Val a={a} t="fan_speed" x={x + 262} y={60} w={96} label="Fan speed" />
    <Val a={vfd} t="freq" x={x + 262} y={100} w={96} label="VFD frequency" />
    <Val a={vfd} t="kw" x={x + 262} y={140} w={96} label="Fan power" />
  </g>;
}

function ChwCircuit({ c }) {
  const p2on = useLive('VFD-03', 'freq', c).v > 5;
  return (
    <Mimic c={c} w={1280} h={720}>
      <Title x={24} y={30}>Chilled water circuit · primary-secondary with decoupler</Title>
      <Zone x={20} y={40} w={1240} h={210} label="Condenser water" />
      <CTBlock a="CT-01" vfd="VFD-04" x={60} />
      <CTBlock a="CT-02" vfd="VFD-05" x={470} />
      {/* CW headers: supply (cold, from basins) and return (hot, to tower decks) */}
      <Pipe d="M176 222 H990" kind="cw" w={7} speed={1} />
      <Pipe d="M990 240 H46" kind="hot" w={7} speed={1} />
      <Pump x={940} y={222} r={11} on />
      <Lbl x={960} y={200} muted size={10}>CW pumps (MCC-03)</Lbl>
      <Lbl x={890} y={70} muted size={10}>Hot condenser water to the tower decks;</Lbl>
      <Lbl x={890} y={84} muted size={10}>cold basin water back to the condensers.</Lbl>
      <Val a="CT-01" t="wet_bulb" x={890} y={100} w={120} label="Ambient wet bulb" />
      {/* chillers */}
      <ChillerBlock a="CH-01" x={30} lab="400 TR screw" />
      <ChillerBlock a="CH-02" x={430} lab="600 TR centrifugal" centrifugal />
      <ChillerBlock a="CH-03" x={830} lab="400 TR screw" />
      {/* primary CHW: supply header → decoupler / secondary; return header → primary pumps → evaporators */}
      <Zone x={20} y={440} w={1240} h={270} label="Chilled water distribution" />
      <Pipe d="M178 480 H992" kind="chw" w={8} speed={1} />
      <Lbl x={600} y={474} muted size={10}>CHW supply header 7 °C</Lbl>
      <Pipe d="M1000 680 H80" kind="water" w={8} speed={1} />
      <Lbl x={600} y={674} muted size={10}>CHW return header 12 °C</Lbl>
      <Pipe d="M52 506 H860" kind="water" w={6} speed={1} />
      {[['PCHP-01', 120], ['PCHP-02', 330]].map(([a, x]) => { return <g key={a}>
        <Pipe d={`M${x - 40} 680 V600 H${x - 16}`} kind="water" w={6} />
        <Pipe d={`M${x} 584 V506`} kind="water" w={6} />
        <Equip a={a} x={x - 18} y={582} w={38} h={36} noId><Pump x={x} y={600} r={16} dir={-90} on /></Equip>
        <Val a={a} t="flow" x={x + 26} y={540} w={92} label="Flow" />
        <Val a={a} t="dp" x={x + 26} y={582} w={92} label="Head" />
        <Val a={a} t="kw" x={x + 26} y={624} w={92} label="Power" />
        <text x={x} y={574} textAnchor="middle" className="m-id">{a}</text>
      </g>; })}
      <Pipe d="M52 506 V506" kind="water" w={6} />
      {/* decoupler */}
      <Pipe d="M940 480 V680" kind="chw" w={5} speed={0.4} />
      <Lbl x={932} y={600} anchor="end" muted size={10}>Decoupler</Lbl>
      {/* secondary pump with VFD */}
      <Equip a="VFD-03" x={990} y={462} w={36} h={36} label="Secondary pump" sub="VFD-03 · 75 kW" noId><Pump x={1008} y={480} r={16} dir={0} on={p2on} /></Equip>
      <Val a="VFD-03" t="freq" x={988} y={578} w={86} label="Speed" />
      <Val a="VFD-03" t="kw" x={988} y={620} w={86} label="Power" />
      {/* loads */}
      <Pipe d="M1024 480 H1090 V660" kind="chw" w={6} speed={1} flow={p2on} />
      <Pipe d="M1244 470 V680 H1000" kind="water" w={6} speed={1} />
      {[['VFD-01', 'AHU-1', 470], ['VFD-02', 'AHU-2', 548]].map(([a, l, y]) => <g key={a}>
        <Pipe d={`M1090 ${y + 24} H1110`} kind="chw" w={4} />
        <Pipe d={`M1206 ${y + 24} H1244`} kind="water" w={4} />
        <Equip a={a} x={1110} y={y} w={96} h={48} noId><AHU x={1110} y={y} on={(useLive(a, 'freq', c).v || 0) > 5} /></Equip>
        <Lbl x={1110} y={y - 4} size={10} muted>{l} · {a}</Lbl>
      </g>)}
      <Val a="VFD-01" t="freq" x={1110} y={622} w={64} label="AHU-1" />
      <Val a="VFD-02" t="freq" x={1180} y={622} w={60} label="AHU-2" />
      <Pipe d="M1090 660 H1244" kind="chw" w={4} />
      <g className="m-shape"><rect x={1130} y={648} width={76} height={24} rx="12" className="m-body" /><rect x={1130} y={648} width={76} height={24} rx="12" className="m-edge" /><path d="M1140 660 l8 -7 l8 14 l8 -14 l8 14 l8 -14 l8 14 l8 -7" className="m-glyph" /></g>
      <Lbl x={1168} y={698} anchor="middle" muted size={10}>Process cooling loads</Lbl>
    </Mimic>
  );
}

/* ---------------- steam network ---------------- */
function SteamNetwork({ c }) {
  const b1 = useLive('BLR-01', 'steam_flow', c).v > 0.5, b2 = useLive('BLR-02', 'steam_flow', c).v > 0.5;
  const f1 = useLive('STZ-01', 'failed_traps', c).v || 0, f2 = useLive('STZ-02', 'failed_traps', c).v || 0;
  const tl = useLive('CRS-01', 'tank_level', c).v;
  const nf = (f, n) => Math.min(8, Math.round((f / n) * 8 + 0.49));
  return (
    <Mimic c={c} w={1280} h={700}>
      <Title x={24} y={30}>Steam network · 10.5 bar · condensate return</Title>
      {/* main header */}
      <Equip a="SH-01" x={60} y={104} w={1190} h={12} noId>
        <Pipe d="M60 110 H1250" kind="steam" w={12} speed={1.1} />
      </Equip>
      <Lbl x={64} y={96} size={10.5} bold>SH-01 · main steam header 10.5 bar</Lbl>
      <Val a="SH-01" t="pressure" x={640} y={40} w={104} label="Header pressure" />
      <Val a="SH-01" t="temp" x={750} y={40} w={104} label="Header temp" />
      <Val a="SH-01" t="total_flow" x={860} y={40} w={120} label="Total generation" />
      <Val a="SH-01" t="steam_per_unit" x={986} y={40} w={130} label="Steam per unit output" />
      {/* boiler house */}
      <Zone x={30} y={130} w={600} h={330} label="Boiler house" />
      <Pipe d="M200 200 V110" kind="steam" w={7} flow={b1} /><Valve x={200} y={156} s={8} rot={90} open={b1} />
      <Pipe d="M530 200 V110" kind="steam" w={7} flow={b2} /><Valve x={530} y={156} s={8} rot={90} open={b2} />
      <Stack x={250} y={150} h={50} /><Stack x={580} y={150} h={50} />
      <Lbl x={278} y={164} muted size={9.5}>stack</Lbl><Lbl x={608} y={164} muted size={9.5}>stack</Lbl>
      <Equip a="BLR-01" x={50} y={200} w={250} h={90} label="Gas-fired shell boiler · 8 TPH"><ShellBoiler x={84} y={200} w={216} on={b1} /></Equip>
      <Lbl x={44} y={186} muted size={9.5}>PNG burner</Lbl>
      <Equip a="BLR-02" x={340} y={200} w={270} h={90} label="Biomass boiler · 10 TPH"><ShellBoiler x={340} y={200} w={270} on={b2} biomass /></Equip>
      <Lbl x={346} y={154} muted size={9.5}>Briquette hopper</Lbl>
      {[['BLR-01', 54, 'gas_flow', 'Gas flow'], ['BLR-02', 344, 'fuel_feed', 'Briquette feed']].map(([a, x, ft, fl]) => <g key={a}>
        <Val a={a} t="steam_flow" x={x} y={330} w={92} label="Steam flow" />
        <Val a={a} t="pressure" x={x + 96} y={330} w={92} label="Drum pressure" />
        <Val a={a} t="efficiency" x={x + 192} y={330} w={84} label="Efficiency" />
        <Val a={a} t="stack_o2" x={x} y={372} w={92} label="Stack O₂" />
        <Val a={a} t="stack_temp" x={x + 96} y={372} w={92} label="Stack temp" />
        <Val a={a} t={ft} x={x + 192} y={372} w={84} label={fl} />
      </g>)}
      {/* feed water to boilers */}
      <Pipe d="M380 590 H40 V250 H50" kind="water" w={4} speed={0.8} />
      <Pipe d="M380 600 H320 V270 H340" kind="water" w={4} speed={0.8} />
      <Lbl x={44} y={428} muted size={9.5}>Feed water</Lbl>
      {/* PRDS + LP header */}
      <Pipe d="M700 110 V176 H740" kind="steam" w={7} />
      <Equip a="PRDS-01" x={690} y={150} w={120} h={56} label="PRDS 10.5 → 4 bar" noId>
        <g className="m-shape"><rect x={740} y={168} width={60} height={16} rx="8" className="m-body" /><rect x={740} y={168} width={60} height={16} rx="8" className="m-edge" />
          <path d="M770 150 v18 M764 156 l6 8 l6 -8" className="m-glyph" /></g>
        <Valve x={720} y={176} s={10} control open={0.5} />
      </Equip>
      <text x={750} y={144} textAnchor="middle" className="m-id">PRDS-01</text>
      <Lbl x={776} y={142} muted size={9.5}>spray water</Lbl>
      <Val a="PRDS-01" t="p_out" x={830} y={134} w={96} label="LP pressure" />
      <Val a="PRDS-01" t="t_out" x={930} y={134} w={96} label="LP temp" />
      <Val a="PRDS-01" t="flow" x={830} y={176} w={96} label="LP steam" />
      <Val a="PRDS-01" t="valve_pos" x={930} y={176} w={96} label="PRV position" />
      <Pipe d="M800 176 H812 V250 H1010" kind="steam" w={7} speed={0.9} />
      <Lbl x={820} y={244} muted size={10}>LP header 4 bar</Lbl>
      {/* LP users: tracing + heaters */}
      <Pipe d="M880 250 V290" kind="steam" w={4} /><Pipe d="M980 250 V290" kind="steam" w={4} />
      <g className="m-shape"><path d="M860 290 h40 M860 296 q6 8 12 0 t12 0 t12 0 t4 0" className="m-glyph" /><rect x={858} y={286} width={44} height={20} rx="3" className="m-edge" /></g>
      <g className="m-shape"><rect x={958} y={286} width={44} height={30} rx="3" className="m-body" /><rect x={958} y={286} width={44} height={30} rx="3" className="m-edge" /><path d="M964 292 l8 8 l8 -8 l8 8 l8 -8" className="m-glyph" /></g>
      <Lbl x={880} y={326} anchor="middle" muted size={9.5}>Line tracing</Lbl><Lbl x={980} y={330} anchor="middle" muted size={9.5}>Unit heaters</Lbl>
      {/* HP process users */}
      <Pipe d="M1110 110 V150" kind="steam" w={5} /><Pipe d="M1200 110 V150" kind="steam" w={5} />
      <SteamUser x={1085} y={150} /><SteamUser x={1175} y={150} />
      <Lbl x={1170} y={242} anchor="middle" muted size={9.5}>Process block · jacketed vessels, dryers</Lbl>
      {/* trap zones */}
      <Zone x={660} y={352} w={610} h={196} label="Steam traps and condensate" />
      <Pipe d="M1110 220 V420" kind="condensate" w={3} /><Pipe d="M1200 220 V420" kind="condensate" w={3} />
      <Pipe d="M880 306 V420" kind="condensate" w={3} /><Pipe d="M980 316 V420" kind="condensate" w={3} />
      <Equip a="STZ-01" x={1066} y={410} w={180} h={20} label="Process block traps (64)" noId>
        {Array.from({ length: 8 }).map((_, i) => <Trap key={i} x={1076 + i * 22} y={420} failed={i < nf(f1, 64)} />)}
      </Equip>
      <text x={1156} y={402} textAnchor="middle" className="m-id">STZ-01</text>
      <Val a="STZ-01" t="steam_loss" x={1074} y={456} w={180} label="Steam loss from failed traps" big />
      <Val a="STZ-01" t="failed_traps" x={1074} y={508} w={88} label="Failed traps" dec={0} />
      <Val a="STZ-01" t="normal_pct" x={1166} y={508} w={88} label="Traps normal" />
      <Equip a="STZ-02" x={850} y={410} w={160} h={20} label="Utility & tracing traps (48)" noId>
        {Array.from({ length: 7 }).map((_, i) => <Trap key={i} x={862 + i * 22} y={420} failed={i < nf(f2, 48)} />)}
      </Equip>
      <text x={930} y={402} textAnchor="middle" className="m-id">STZ-02</text>
      <Val a="STZ-02" t="steam_loss" x={686} y={372} w={110} label="Steam loss" />
      <Val a="STZ-02" t="failed_traps" x={686} y={414} w={110} label="Failed traps" dec={0} />
      {/* condensate return */}
      <Pipe d="M1066 420 H1050 V500 H930 M930 430 V500 H760 V560" kind="condensate" w={5} speed={0.8} />
      <Lbl x={1000} y={494} muted size={10}>Condensate return</Lbl>
      <Equip a="CRS-01" x={700} y={560} w={120} h={70} label="Condensate recovery">
        <Tank x={700} y={560} w={70} h={70} level={tl != null ? tl / 100 : null} />
        <Pump x={796} y={616} r={12} on />
      </Equip>
      <Val a="CRS-01" t="recovery" x={840} y={556} w={100} label="Recovery" big />
      <Val a="CRS-01" t="return_temp" x={946} y={556} w={96} label="Return temp" />
      <Val a="CRS-01" t="flow" x={1048} y={556} w={96} label="Return flow" />
      <Val a="CRS-01" t="tank_level" x={946} y={598} w={96} label="Tank level" />
      <Pipe d="M808 616 V664 H560 V610" kind="condensate" w={4} speed={0.8} />
      {/* feed water tank / deaerator */}
      <Zone x={30} y={480} w={620} h={200} label="Feed water" />
      <g className="m-shape">
        <rect x={420} y={560} width={180} height={50} rx="25" fill="url(#m-metal)" className="m-body" /><rect x={420} y={560} width={180} height={50} rx="25" className="m-edge" />
        <rect x={430} y={588} width={160} height={20} rx="8" fill="url(#m-liquid)" opacity=".55" />
        <rect x={490} y={536} width={40} height={26} rx="6" className="m-body" /><rect x={490} y={536} width={40} height={26} rx="6" className="m-edge" />
        <path d="M440 610 l-6 14 h22 l-6 -14 M580 610 l-6 14 h22 l-6 -14" className="m-edge" />
      </g>
      <Lbl x={510} y={522} anchor="middle" muted size={10}>Feed water tank · deaerator head</Lbl>
      <Pipe d="M300 544 H460 V560" kind="water" w={3} />
      <Lbl x={300} y={536} muted size={9.5}>RO make-up</Lbl>
      <Pipe d="M420 596 H404" kind="water" w={4} />
      <Pump x={392} y={596} r={12} dir={180} on={b1 || b2} />
      <Lbl x={392} y={634} anchor="middle" muted size={9.5}>Feed pumps</Lbl>
    </Mimic>
  );
}

/* ---------------- gas network ---------------- */
function GasNetwork({ c }) {
  const ss = useLive('PRS-01', 'slam_shut', c).v;
  const ssOpen = ss == null ? true : ss >= 0.5;
  const g = useLive('GMS-01', 'flow', c).v, gb = useLive('BLR-01', 'gas_flow', c).v, gt = useLive('TFH-01', 'gas_flow', c).v;
  const other = g != null && gb != null && gt != null ? Math.max(0, g - gb - gt) : null;
  const bOn = (gb || 0) > 20, tOn = (gt || 0) > 10;
  return (
    <Mimic c={c} w={1280} h={680}>
      <Title x={24} y={30}>Natural gas network · PNG 19 bar → 4 bar plant distribution</Title>
      {/* inlet */}
      <Pipe d="M20 330 H180" kind="gas" w={8} speed={1} />
      <Lbl x={24} y={276} size={10.5} bold>PNG inlet</Lbl><Lbl x={24} y={290} muted size={10}>from city gas</Lbl><Lbl x={24} y={304} muted size={10}>network, 19 bar</Lbl>
      <Valve x={70} y={330} s={11} open /><Lbl x={70} y={358} anchor="middle" muted size={9.5}>Inlet ESD</Lbl>
      <g className="m-shape"><rect x={108} y={320} width={8} height={20} className="m-body" /><rect x={108} y={320} width={8} height={20} className="m-edge" /></g>
      <Lbl x={112} y={358} anchor="middle" muted size={9}>IJ</Lbl>
      {/* metering skid */}
      <Zone x={140} y={150} w={340} h={360} label="GMS-01 · metering skid" />
      <Equip a="GMS-01" x={160} y={260} w={300} h={110} noId>
        <rect x={160} y={362} width={300} height={8} rx="2" className="m-body" /><rect x={160} y={362} width={300} height={8} rx="2" className="m-edge" />
        <Pipe d="M180 330 H460" kind="gas" w={8} speed={1} />
        <GasFilter x={192} y={290} /><Lbl x={207} y={386} anchor="middle" muted size={9.5}>Filter</Lbl>
        <Valve x={256} y={330} s={9} open />
        <TurbineMeter x={290} y={318} />
        <Lbl x={320} y={386} anchor="middle" muted size={9.5}>Turbine meter</Lbl>
        <Valve x={384} y={330} s={9} open />
        <Valve x={420} y={330} s={9} open /><Lbl x={420} y={386} anchor="middle" muted size={9.5}>Outlet</Lbl>
      </Equip>
      <text x={310} y={244} textAnchor="middle" className="m-id">GMS-01</text>
      <Val a="GMS-01" t="flow" x={160} y={180} w={150} label="Corrected gas flow" big />
      <Val a="GMS-01" t="daily_scm" x={318} y={180} w={142} label="Day-to-date volume" big />
      <Val a="GMS-01" t="p_in" x={160} y={402} w={96} label="Inlet pressure" />
      <Val a="GMS-01" t="temp" x={262} y={402} w={96} label="Gas temp" />
      <Lbl x={160} y={460} muted size={9.5}>EVC corrects volume to standard conditions</Lbl>
      <Lbl x={160} y={474} muted size={9.5}>(pressure, temperature, compressibility).</Lbl>
      {/* PRS */}
      <Pipe d="M460 330 H860" kind="gas" w={8} speed={1} />
      <Zone x={500} y={150} w={320} h={360} label="PRS-01 · pressure regulating station" />
      <Equip a="PRS-01" x={520} y={280} w={280} h={90} noId>
        <rect x={520} y={362} width={280} height={8} rx="2" className="m-body" /><rect x={520} y={362} width={280} height={8} rx="2" className="m-edge" />
        <GasFilter x={536} y={292} w={26} h={50} />
        <g className={`m-shape m-valve ${ssOpen ? 'open' : 'shut'}`}><Valve x={604} y={330} s={11} open={ssOpen} /><rect x={596} y={302} width={16} height={12} rx="2" className="m-body" /><rect x={596} y={302} width={16} height={12} rx="2" className="m-edge" /><line x1={604} y1={314} x2={604} y2={322} className="m-edge" /></g>
        <Regulator x={664} y={330} />
        <Regulator x={724} y={330} />
        <Pipe d="M770 330 V296" kind="gas" w={3} flow={false} />
        <g className="m-shape"><path d="M762 296 h16 l-8 -12 z" className="m-body" /><path d="M762 296 h16 l-8 -12 z" className="m-edge" /></g>
      </Equip>
      <text x={660} y={244} textAnchor="middle" className="m-id">PRS-01</text>
      <Lbl x={549} y={386} anchor="middle" muted size={9}>Filter</Lbl>
      <Lbl x={604} y={386} anchor="middle" muted size={9}>Slam-shut</Lbl>
      <Lbl x={664} y={386} anchor="middle" muted size={9}>Monitor</Lbl>
      <Lbl x={724} y={386} anchor="middle" muted size={9}>Active reg.</Lbl>
      <Lbl x={770} y={278} anchor="middle" muted size={9}>Relief</Lbl>
      <Val a="PRS-01" t="p_out" x={520} y={180} w={130} label="Outlet pressure" big />
      <Val a="PRS-01" t="filter_dp" x={660} y={180} w={140} label="Filter ΔP" big />
      <Val a="PRS-01" t="slam_shut" x={520} y={402} w={130} label="Slam-shut (1 = open)" />
      <Lbl x={660} y={414} muted size={10}>{ssOpen ? 'Slam-shut open, supply healthy' : 'Slam-shut tripped, supply isolated'}</Lbl>
      <Lbl x={660} y={428} muted size={9.5}>Trips on outlet over- or under-pressure.</Lbl>
      {/* distribution header */}
      <Pipe d="M860 330 V130 M860 330 V560" kind="gas" w={8} speed={0.9} />
      <Lbl x={872} y={124} muted size={10}>4 bar distribution header</Lbl>
      {[
        { y: 160, a: 'BLR-01', on: bOn, name: 'Boiler BLR-01 burner' },
        { y: 360, a: 'TFH-01', on: tOn, name: 'Thermic fluid heater TFH-01' },
        { y: 560, a: null, on: true, name: 'Canteen, ovens and other users' },
      ].map(b => <g key={b.name}>
        <Pipe d={`M860 ${b.y} H1010`} kind="gas" w={6} flow={b.on} speed={0.9} />
        <Valve x={900} y={b.y} s={9} control open={b.on} /><Valve x={950} y={b.y} s={9} control open={b.on} />
        <Pipe d={`M925 ${b.y} V${b.y - 26}`} kind="gas" w={2} flow={false} /><Valve x={925} y={b.y - 26} s={5} rot={90} open={!b.on} />
        <Lbl x={925} y={b.y + 26} anchor="middle" muted size={9}>SSOV · vent · SSOV</Lbl>
        <Pipe d={`M970 ${b.y} V${b.y}`} kind="gas" w={2} />
        <g className="m-shape"><rect x={980} y={b.y - 9} width={20} height={18} rx="2" className="m-body" /><rect x={980} y={b.y - 9} width={20} height={18} rx="2" className="m-edge" /><text x={990} y={b.y + 3} textAnchor="middle" className="m-sub" style={{ fontSize: 7.5 }}>FT</text></g>
      </g>)}
      <Equip a="BLR-01" x={1010} y={120} w={130} h={80} label="Gas-fired boiler 8 TPH" noId><BoilerFront x={1010} y={160} on={bOn} /></Equip>
      <text x={1075} y={114} textAnchor="middle" className="m-id">BLR-01</text>
      <Val a="BLR-01" t="gas_flow" x={1156} y={120} w={104} label="Gas flow" />
      <Val a="BLR-01" t="stack_o2" x={1156} y={162} w={104} label="Stack O₂" />
      <Val a="BLR-01" t="steam_flow" x={1156} y={204} w={104} label="Steam flow" />
      <Pipe d="M1010 360 H1028 V296 H1095 V308" kind="gas" w={5} flow={tOn} />
      <Equip a="TFH-01" x={1050} y={330} w={90} h={120} label="Thermic fluid heater" sub="1.0 Mkcal/h" noId><TFHeater x={1050} y={330} on={tOn} /></Equip>
      <Pipe d="M1140 370 H1150" kind="oil" w={4} /><Pipe d="M1140 430 H1150" kind="oil" w={4} /><text x={1060} y={290} textAnchor="end" className="m-id">TFH-01</text>
      <Val a="TFH-01" t="gas_flow" x={1156} y={318} w={104} label="Gas flow" />
      <Val a="TFH-01" t="tf_out" x={1156} y={360} w={104} label="Fluid outlet" />
      <Val a="TFH-01" t="stack_o2" x={1156} y={402} w={104} label="Stack O₂" />
      <g className="m-shape"><rect x={1010} y={540} width={120} height={40} rx="4" className="m-body" /><rect x={1010} y={540} width={120} height={40} rx="4" className="m-edge" />
        {[0, 1, 2].map(i => <circle key={i} cx={1036 + i * 34} cy={560} r="9" className="m-edge" />)}</g>
      <Lbl x={1070} y={598} anchor="middle" muted size={10}>Other users (unmetered)</Lbl>
      <Lbl x={1156} y={556} size={10.5}>{other != null ? `≈ ${Math.round(other)} Sm³/h` : '—'}</Lbl>
      <Lbl x={1156} y={570} muted size={9.5}>meter − BLR − TFH</Lbl>
      <Lbl x={24} y={650} muted size={10}>SSOV: safety shut-off valves (double block and vent) close on flame failure, low or high gas pressure, or the emergency stop.</Lbl>
    </Mimic>
  );
}

export default { 'air-network': AirNetwork, 'chw-circuit': ChwCircuit, 'steam-network': SteamNetwork, 'gas-network': GasNetwork };
