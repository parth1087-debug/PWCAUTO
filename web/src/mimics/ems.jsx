/* EMS power mimics: campus energy flow, single-line diagram, busbar thermal view, DG sets and VFDs, power quality.
   Bound to the Meridian Industrial Park demo (web/src/shared/demos/ems.js). Utilities networks live in ems-utilities.jsx. */
import React from 'react';
import { Mimic, Equip, Val, Pipe, Box, Fan, Pump, Motor, Lbl, Title, Zone, Bus, Breaker, Switch, Transformer, Generator, Load, Capacitor, Earth, PVArray, MiniTrend, BarInd, Gauge, useLive, useMimic } from './kit.jsx';
import { fmtNum } from '../lib/data.js';

/* ---------------- local helpers ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const vOf = r => (r && r.v != null ? r.v : 0);
/** Computed value box, styled like the kit's Val (for derived figures that are not plant tags). */
function Calc({ x, y, w = 104, label, v, unit = '', dec = 0, st = 'good', a, big }) {
  const m = useMimic(); const hgt = big ? 46 : 36;
  return <g className={`m-val ${st}`} onClick={e => { e.stopPropagation(); a && m.select(a); }} role={a ? 'button' : undefined}>
    <rect x={x} y={y} width={w} height={hgt} rx="4" />
    <text x={x + 7} y={y + 12} className="m-val-l">{label}</text>
    <text x={x + 7} y={y + (big ? 36 : 29)} className={`m-val-v ${big ? 'big' : ''}`}>{v == null || Number.isNaN(v) ? '—' : fmtNum(v, dec)}<tspan className="m-val-u"> {unit}</tspan></text>
  </g>;
}
/** Horizontal Sankey-style band between two points (bezier), width proportional to flow. */
const band = (x1, y1, x2, y2) => { const xm = (x1 + x2) / 2; return `M${x1} ${y1} C${xm} ${y1} ${xm} ${y2} ${x2} ${y2}`; };
const bw = kw => clamp(kw / 140, 3, 44);
const BK = { power: 'power', gas: 'gas', material: 'mat', steam: 'steam', air: 'air', chw: 'chw' };
/** Translucent flow band with a thin animated flow line along its centre. */
const Band = ({ d, kind, w, speed = 1 }) => <g className={`m-pipe ${BK[kind]}`}>
  <path d={d} className="m-pipe-i" strokeWidth={w} style={{ opacity: kind === 'power' ? 0.38 : 0.6, strokeLinecap: 'butt' }} />
  <path d={d} className="m-flow" strokeWidth={1.6} style={{ animationDuration: `${1.8 / speed}s` }} />
</g>;

/* ---------------- energy flow (L1) ---------------- */
function Node({ a, x, y, w = 140, h = 64, title, children, noEq }) {
  const body = <><rect x={x} y={y} width={w} height={h} rx="6" fill="url(#m-metal)" className="m-body" /><rect x={x} y={y} width={w} height={h} rx="6" className="m-edge" />
    <text x={x + 8} y={y + 14} className="m-inner" style={{ fontSize: 10.5 }}>{title}</text>{children}</>;
  return noEq || !a ? <g>{body}</g> : <Equip a={a} x={x} y={y} w={w} h={h} noId>{body}</Equip>;
}
const Pylon = ({ x, y }) => <g className="m-shape"><path d={`M${x - 12} ${y + 40} L${x - 3} ${y} H${x + 3} L${x + 12} ${y + 40} M${x - 9} ${y + 28} H${x + 9} M${x - 6} ${y + 15} H${x + 6} M${x - 16} ${y + 8} H${x + 16} M${x - 9} ${y + 28} L${x + 6} ${y + 15} M${x + 9} ${y + 28} L${x - 6} ${y + 15}`} className="m-glyph" /></g>;
const Pile = ({ x, y }) => <g className="m-shape"><path d={`M${x - 16} ${y + 34} Q${x} ${y} ${x + 16} ${y + 34} Z`} className="m-body" /><path d={`M${x - 16} ${y + 34} Q${x} ${y} ${x + 16} ${y + 34} Z`} className="m-edge" /></g>;
const GasMeter = ({ x, y }) => <g className="m-shape"><rect x={x - 14} y={y + 6} width={28} height={24} rx="3" className="m-body" /><rect x={x - 14} y={y + 6} width={28} height={24} rx="3" className="m-edge" /><circle cx={x} cy={y + 18} r="6" className="m-glyph" /><line x1={x - 20} y1={y + 18} x2={x - 14} y2={y + 18} className="m-edge" /><line x1={x + 14} y1={y + 18} x2={x + 20} y2={y + 18} className="m-edge" /></g>;

function FlowBody() {
  const L = (a, t) => vOf(useLive(a, t));
  const grid = L('GRID-01', 'kw'), sol = L('SOL-01', 'ac_kw'), dg1 = L('DG-01', 'kw'), dg2 = L('DG-02', 'kw');
  const gas = L('GMS-01', 'flow'), bio = L('BLR-02', 'fuel_feed');
  const m1 = L('MCC-01', 'kw'), m2 = L('MCC-02', 'kw'), m3 = L('MCC-03', 'kw');
  const gBlr = L('BLR-01', 'gas_flow'), gTfh = L('TFH-01', 'gas_flow');
  const air = L('AC-01', 'kw') + L('AC-02', 'kw') + L('AC-03', 'kw');
  const chKw = L('CH-01', 'kw') + L('CH-02', 'kw'); const tr = L('CH-01', 'tr') + L('CH-02', 'tr');
  const steam = L('SH-01', 'total_flow');
  const kva = L('GRID-01', 'kva');
  const elec = grid + sol + dg1 + dg2; const other = Math.max(0, elec - m1 - m2 - m3);
  const GCV_GAS = 9.9, BIO = 4650, STEAM = 640; // kWh per Sm³, per t biomass, per t steam (enthalpy above feed water)
  const re = elec ? (sol / elec) * 100 : 0;
  const mdPct = (kva / 8000) * 100;
  return <>
    <Title x={24} y={30}>Campus energy flow · Meridian Industrial Park</Title>
    <Lbl x={1256} y={30} anchor="end" muted size={10.5}>Band width ∝ power (fuels as kW thermal at GCV)</Lbl>
    <Zone x={20} y={44} w={196} h={606} label="Sources" />
    <Zone x={316} y={44} w={176} h={606} label="Distribution" />
    <Zone x={584} y={44} w={176} h={606} label="Feeders & plants" />
    <Zone x={880} y={44} w={176} h={606} label="Utilities" />
    {/* bands: sources → distribution */}
    <Band d={band(200, 104, 330, 120)} kind="power" w={bw(grid)} speed={1.2} />
    <Band d={band(200, 204, 330, 196)} kind="power" w={bw(sol)} />
    <Band d={band(200, 286, 330, 238)} kind="power" w={bw(dg1)} />
    <Band d={band(200, 366, 330, 268)} kind="power" w={bw(dg2)} />
    <Band d={band(200, 462, 330, 462)} kind="gas" w={bw(gas * GCV_GAS)} />
    <Band d={band(200, 580, 600, 500)} kind="material" w={bw(bio * BIO)} speed={0.6} />
    {/* distribution → feeders / plants */}
    <Band d={band(470, 120, 600, 98)} kind="power" w={bw(m1)} />
    <Band d={band(470, 170, 600, 188)} kind="power" w={bw(m2)} />
    <Band d={band(470, 220, 600, 278)} kind="power" w={bw(m3)} />
    <Band d={band(470, 270, 600, 368)} kind="power" w={bw(other)} />
    <Band d={band(470, 452, 600, 470)} kind="gas" w={bw(gBlr * GCV_GAS)} />
    <Band d={band(470, 474, 600, 606)} kind="gas" w={bw(gTfh * GCV_GAS)} />
    {/* feeders / plants → utilities */}
    <Band d={band(740, 188, 900, 112)} kind="air" w={bw(air)} />
    <Band d={band(740, 278, 900, 262)} kind="chw" w={bw(chKw)} />
    <Band d={band(740, 486, 900, 452)} kind="steam" w={bw(steam * STEAM)} />

    {/* sources */}
    <Equip a="GRID-01" x={30} y={66} w={170} h={80} noId><Node noEq x={30} y={66} w={170} h={80} title="Grid · 33 kV" /><Pylon x={56} y={88} /></Equip>
    <Val a="GRID-01" t="kw" x={84} y={88} w={108} label="Active power" />
    <Lbl x={192} y={136} anchor="end" muted size={9.5}>GRID-01 · ABT meter</Lbl>
    <Equip a="SOL-01" x={30} y={170} w={170} h={64} noId><Node noEq x={30} y={170} w={170} h={64} title="Rooftop solar" /><PVArray x={36} y={196} cols={2} rows={2} mw={16} mh={11} /></Equip>
    <Val a="SOL-01" t="ac_kw" x={84} y={192} w={108} label="AC output" />
    {[['DG-01', 254, dg1], ['DG-02', 334, dg2]].map(([a, y, kw]) => <g key={a}>
      <Equip a={a} x={30} y={y} w={170} h={64} noId><Node noEq x={30} y={y} w={170} h={64} title={`${a} · diesel`} /><Generator x={56} y={y + 40} r={15} on={kw > 60} /></Equip>
      <Val a={a} t="kw" x={84} y={y + 22} w={108} label={kw > 60 ? 'Output · running' : 'Output · standby'} /></g>)}
    <Equip a="GMS-01" x={30} y={430} w={170} h={64} noId><Node noEq x={30} y={430} w={170} h={64} title="PNG · GMS-01" /><GasMeter x={56} y={450} /></Equip>
    <Val a="GMS-01" t="flow" x={84} y={452} w={108} label="Corrected flow" />
    <Equip a="BLR-02" x={30} y={548} w={170} h={64} noId><Node noEq x={30} y={548} w={170} h={64} title="Biomass briquettes" /><Pile x={56} y={570} /></Equip>
    <Val a="BLR-02" t="fuel_feed" x={84} y={570} w={108} label="Feed to BLR-02" />

    {/* distribution */}
    <Node x={330} y={66} w={140} h={230} title="LT power network" noEq />
    <Calc x={338} y={84} w={124} label="Total electrical input" v={elec} unit="kW" />
    <Val a="TR-01" t="kw" x={338} y={126} w={124} label="TR-01 LV" />
    <Val a="TR-02" t="kw" x={338} y={168} w={124} label="TR-02 LV" />
    <Val a="TR-02" t="load_pct" x={338} y={210} w={124} label="TR-02 loading" />
    <Lbl x={400} y={284} anchor="middle" muted size={9.5}>2 × 3.15 MVA · PCC</Lbl>
    <Node a="PRS-01" x={330} y={420} w={140} h={76} title="PNG header · PRS-01" />
    <Val a="PRS-01" t="p_out" x={338} y={446} w={124} label="Regulated pressure" />

    {/* feeders & plants */}
    <Node a="MCC-01" x={600} y={66} w={140} h={64} title="MCC-01 · process block"><Val a="MCC-01" t="kw" x={608} y={88} w={124} label="Active power" /></Node>
    <Node a="MCC-02" x={600} y={156} w={140} h={64} title="MCC-02 · utility"><Val a="MCC-02" t="kw" x={608} y={178} w={124} label="Active power" /></Node>
    <Node a="MCC-03" x={600} y={246} w={140} h={64} title="MCC-03 · HVAC"><Val a="MCC-03" t="kw" x={608} y={268} w={124} label="Active power" /></Node>
    <Node x={600} y={336} w={140} h={64} title="Other LT & losses" noEq><Calc x={608} y={358} w={124} label="Lighting, ETP, losses" v={other} unit="kW" /></Node>
    <Node a="BLR-01" x={600} y={430} w={140} h={112} title="Boiler house">
      <Val a="BLR-01" t="steam_flow" x={608} y={452} w={124} label="BLR-01 gas · steam" />
      <Val a="BLR-02" t="steam_flow" x={608} y={496} w={124} label="BLR-02 biomass · steam" /></Node>
    <Node a="TFH-01" x={600} y={574} w={140} h={64} title="TFH-01 · thermic fluid"><Val a="TFH-01" t="gas_flow" x={608} y={596} w={124} label="Gas flow" /></Node>

    {/* utilities */}
    <Node a="AR-01" x={900} y={72} w={140} h={110} title="Compressed air">
      <Val a="AR-01" t="flow" x={908} y={94} w={124} label="Air delivered" />
      <Val a="AR-01" t="header_pressure" x={908} y={136} w={124} label="Header pressure" /></Node>
    <Lbl x={970} y={198} anchor="middle" muted size={9.5}>AC-01…03 on load</Lbl>
    <Node a="CH-02" x={900} y={222} w={140} h={110} title="Chilled water">
      <Calc x={908} y={244} w={124} label="Cooling load CH-01+02" v={tr} unit="TR" a="CH-02" />
      <Val a="CH-02" t="kw_tr" x={908} y={286} w={124} label="CH-02 efficiency" dec={2} /></Node>
    <Node a="SH-01" x={900} y={404} w={140} h={110} title="Steam to process">
      <Val a="SH-01" t="total_flow" x={908} y={426} w={124} label="Steam generation" />
      <Val a="SH-01" t="pressure" x={908} y={468} w={124} label="Header pressure" /></Node>
    <Lbl x={970} y={532} anchor="middle" muted size={9.5}>PRDS → 4 bar LP users</Lbl>

    {/* KPIs */}
    <Zone x={1076} y={44} w={184} h={606} label="Key figures" />
    <Val a="GRID-01" t="kva" x={1088} y={70} w={120} label="Demand (15-min)" big />
    <BarInd a="GRID-01" t="kva" x={1226} y={66} h={96} max={8000} label="MD" />
    <Calc x={1088} y={124} w={120} label="of 8,000 kVA contract" v={mdPct} unit="%" dec={1} st={mdPct > 97.5 ? 'bad' : mdPct > 92 ? 'warn' : 'good'} a="GRID-01" />
    <MiniTrend a="GRID-01" t="kva" x={1088} y={186} w={160} h={36} />
    <Lbl x={1088} y={236} muted size={9.5}>Demand, last 24 h</Lbl>
    <Val a="GRID-01" t="pf" x={1088} y={256} w={160} label="Power factor at billing meter" dec={3} />
    <Val a="APFC-01" t="kvar" x={1088} y={298} w={160} label="APFC compensation" />
    <Calc x={1088} y={350} w={160} label="Renewable share (rooftop, now)" v={re} unit="%" dec={1} big />
    <Calc x={1088} y={404} w={160} label="DG share of electricity" v={elec ? ((dg1 + dg2) / elec) * 100 : 0} unit="%" dec={1} />
    <Calc x={1088} y={446} w={160} label="Thermal input (gas + biomass)" v={(gas * GCV_GAS + bio * BIO) / 1000} unit="MW" dec={1} />
    <Calc x={1088} y={488} w={160} label="Compressed air power" v={air} unit="kW" a="AR-01" />
    <Val a="AR-01" t="plant_sp" x={1088} y={530} w={160} label="Air plant specific power" dec={2} />
    <Val a="CH-02" t="kw_tr" x={1088} y={572} w={160} label="CH-02 kW/TR" dec={2} />
    <Lbl x={1088} y={630} muted size={9.5}>Chiller plant power {fmtNum(chKw, 0)} kW</Lbl>
  </>;
}
function EnergyFlow({ c }) {
  return <Mimic c={c} w={1280} h={664} note="band widths follow live kW"><FlowBody /></Mimic>;
}

/* ---------------- single-line diagram (L2) ---------------- */
const Meter = ({ x, y }) => <g className="m-shape"><circle cx={x} cy={y} r={10} className="m-body" /><circle cx={x} cy={y} r={10} className="m-edge" /><text x={x} y={y + 3} textAnchor="middle" className="m-inner" style={{ fontSize: 7 }}>kWh</text></g>;
const W = ({ x1, y1, x2, y2 }) => <line x1={x1} y1={y1} x2={x2} y2={y2} className="m-sld-w" style={{ stroke: 'var(--m-power)', strokeWidth: 1.8 }} />;

function Feeder({ x, a, name, sub, kind = 'load', closed = true, vals }) {
  return <g>
    <W x1={x} y1={340} x2={x} y2={kind === 'cap' ? 400 : 396} />
    <Equip a={a} x={x - 12} y={356} w={24} h={70} noId>
      <rect x={x - 12} y={356} width={24} height={70} fill="transparent" />
      <Breaker x={x} y={368} closed={closed} />
      {kind === 'cap' ? <><Capacitor x={x} y={400} /><W x1={x} y1={407} x2={x} y2={414} /><Earth x={x} y={414} /></>
        : kind === 'ups' ? <><rect x={x - 14} y={396} width={28} height={20} rx="2" className="m-body" /><rect x={x - 14} y={396} width={28} height={20} rx="2" className="m-edge" /><text x={x} y={410} textAnchor="middle" className="m-inner" style={{ fontSize: 8 }}>UPS</text></>
        : kind === 'ahf' ? <><rect x={x - 14} y={396} width={28} height={20} rx="2" className="m-body" /><rect x={x - 14} y={396} width={28} height={20} rx="2" className="m-edge" /><path d={`M${x - 9} ${406} q4.5 -8 9 0 t9 0`} className="m-glyph" /></>
          : <Load x={x} y={396} len={20} />}
    </Equip>
    <Lbl x={x} y={440} anchor="middle" bold size={11}>{name}</Lbl>
    <Lbl x={x} y={453} anchor="middle" muted size={9.5}>{sub}</Lbl>
    {vals.map(([t, l, d], i) => <Val key={t} a={a} t={t} x={x} y={462 + i * 40} w={86} anchor="middle" label={l} dec={d} />)}
  </g>;
}

function SldBody() {
  const L = (a, t) => vOf(useLive(a, t));
  const bc = L('BC-01', 'current') > 50; const dg1 = L('DG-01', 'kw') > 60, dg2 = L('DG-02', 'kw') > 60;
  const hfOn = L('HF-01', 'comp_current') > 20;
  const vfd = [['VFD-01', 'AHU-1 fan'], ['VFD-02', 'AHU-2 fan'], ['VFD-03', 'CHW pump'], ['VFD-04', 'CT-01 fan'], ['VFD-05', 'CT-02 fan']];
  return <>
    <Title x={24} y={30}>Power network · single-line diagram</Title>
    {/* 33 kV incomer */}
    <W x1={550} y1={34} x2={550} y2={150} />
    <Lbl x={558} y={30} muted size={9.5}>33 kV utility feeder</Lbl>
    <Equip a="GRID-01" x={538} y={48} w={24} h={88} noId>
      <rect x={538} y={48} width={24} height={88} fill="transparent" />
      <Switch x={550} y={50} len={20} closed /><Breaker x={550} y={94} s={16} closed /><Meter x={550} y={124} />
    </Equip>
    <Val a="GRID-01" t="kva" x={422} y={40} w={108} label="Demand" />
    <Val a="GRID-01" t="kw" x={422} y={82} w={108} label="Active power" />
    <Val a="GRID-01" t="pf" x={572} y={40} w={100} label="Power factor" dec={3} />
    <Val a="GRID-01" t="voltage" x={572} y={82} w={100} label="Voltage L-L" dec={1} />
    <Bus x1={300} x2={800} y={150} kind="hv" a="GRID-01" />
    <Lbl x={300} y={142} muted size={10}>33 kV bus</Lbl>
    {/* transformers */}
    {[['TR-01', 360], ['TR-02', 740]].map(([a, x]) => <g key={a}>
      <W x1={x} y1={150} x2={x} y2={184} /><W x1={x} y1={237} x2={x} y2={340} />
      <Equip a={a} x={x - 18} y={164} w={36} h={144} noId>
        <rect x={x - 18} y={164} width={36} height={144} fill="transparent" />
        <Breaker x={x} y={172} s={13} closed /><Transformer x={x} y={200} r={16} /><Breaker x={x} y={300} s={16} closed />
      </Equip>
      <W x1={x - 16} y1={221} x2={x - 30} y2={221} /><W x1={x - 30} y1={221} x2={x - 30} y2={236} /><Earth x={x - 30} y={236} />
      <Lbl x={x - 26} y={186} anchor="end" bold size={11}>{a} · 3.15 MVA</Lbl>
      <Lbl x={x - 26} y={200} anchor="end" muted size={9.5}>33/0.433 kV · Dyn11</Lbl>
      <Lbl x={x - 14} y={318} anchor="end" muted size={9.5}>ACB</Lbl>
      <Val a={a} t="load_pct" x={x + 32} y={166} w={100} label="Loading" />
      <Val a={a} t="oil_temp" x={x + 32} y={208} w={100} label="Oil (OTI)" />
      <Val a={a} t="wind_temp" x={x + 32} y={250} w={100} label="Winding (WTI)" />
    </g>)}
    {/* solar */}
    <Equip a="SOL-01" x={104} y={52} w={92} h={84} noId>
      <PVArray x={104} y={52} cols={5} rows={2} mw={16} mh={10} />
      <W x1={150} y1={76} x2={150} y2={96} />
      <rect x={128} y={96} width={44} height={30} rx="3" className="m-body" /><rect x={128} y={96} width={44} height={30} rx="3" className="m-edge" />
      <path d={`M${132} ${122} L${168} ${100}`} className="m-glyph" /><text x={136} y={108} className="m-inner" style={{ fontSize: 8 }}>=</text><text x={156} y={121} className="m-inner" style={{ fontSize: 9 }}>~</text>
    </Equip>
    <W x1={150} y1={126} x2={150} y2={340} /><Breaker x={150} y={300} s={14} closed />
    <Val a="SOL-01" t="ac_kw" x={206} y={52} w={100} label="SOL-01 AC output" />
    <Val a="SOL-01" t="irradiance" x={206} y={94} w={100} label="Irradiance" />
    <Lbl x={162} y={160} muted size={9.5}>1 MWp string inverters</Lbl>
    {/* LT busbars + coupler */}
    <Bus x1={40} x2={610} y={340} a="BB-01" />
    <Lbl x={40} y={330} bold size={10.5}>BB-01 · 415 V</Lbl>
    <Bus x1={670} x2={1240} y={340} a="BB-02" />
    <Lbl x={1240} y={330} anchor="end" bold size={10.5}>BB-02 · 415 V</Lbl>
    <W x1={610} y1={340} x2={630} y2={340} /><W x1={650} y1={340} x2={670} y2={340} />
    <Equip a="BC-01" x={628} y={328} w={24} h={24} noId><Breaker x={640} y={340} s={18} closed={bc} /></Equip>
    <Lbl x={640} y={370} anchor="middle" bold size={10}>BC-01 {bc ? 'closed' : 'open'}</Lbl>
    <Val a="BC-01" t="current" x={597} y={378} w={86} label="Coupler current" />
    <Val a="BB-01" t="current" x={40} y={360} w={96} label="BB-01 current" />
    <Val a="BB-01" t="joint_y" x={40} y={402} w={96} label="Y-joint temp" />
    {/* BB-01 feeders */}
    <Feeder x={200} a="MCC-01" name="MCC-01" sub="Process block" vals={[['kw', 'kW'], ['pf', 'PF', 3], ['current', 'Current']]} />
    <Feeder x={300} a="MCC-02" name="MCC-02" sub="Utility" vals={[['kw', 'kW'], ['pf', 'PF', 3], ['current', 'Current']]} />
    <Feeder x={400} a="UPS-01" name="UPS-01" sub="2 × 200 kVA" kind="ups" vals={[['load_pct', 'Load'], ['input_v', 'Input V'], ['backup_min', 'Backup']]} />
    <Feeder x={500} a="APFC-01" name="APFC-01" sub="1500 kVAr" kind="cap" vals={[['kvar', 'kVAr'], ['pf_bus', 'PCC PF', 3], ['steps_on', 'Steps on', 0]]} />
    {/* BB-02 feeders */}
    <Feeder x={720} a="MCC-03" name="MCC-03" sub="HVAC" vals={[['kw', 'kW'], ['pf', 'PF', 3], ['current', 'Current']]} />
    <Feeder x={830} a="HF-01" name="HF-01" sub={hfOn ? 'AHF in service' : 'AHF offline'} kind="ahf" closed={hfOn} vals={[['comp_current', 'Comp. current'], ['thd_i_out', 'THD-I out'], ['filter_temp', 'Heatsink']]} />
    {/* VFD panel */}
    <W x1={960} y1={340} x2={960} y2={430} /><Breaker x={960} y={368} closed />
    <line x1={900} y1={430} x2={1240} y2={430} className="m-bus-l" style={{ stroke: 'var(--m-power)', strokeWidth: 3 }} />
    <Lbl x={970} y={398} bold size={10.5}>VFD panel</Lbl><Lbl x={970} y={411} muted size={9.5}>fed from BB-02</Lbl>
    {vfd.map(([a, n], i) => { const x = 930 + i * 70; return <VfdDrop key={a} a={a} x={x} n={n} />; })}
    {/* DG sets */}
    {[['DG-01', 1000, dg1], ['DG-02', 1160, dg2]].map(([a, x, on]) => <g key={a}>
      <Equip a={a} x={x - 20} y={90} w={40} h={40} noId><Generator x={x} y={110} r={20} on={on} /></Equip>
      <W x1={x} y1={130} x2={x} y2={250} />
      <Lbl x={x} y={150} anchor="middle" bold size={11}>{a}</Lbl>
      <Lbl x={x} y={163} anchor="middle" muted size={9.5}>1500 kVA · {on ? 'running' : 'standby'}</Lbl>
      <rect x={x - 9} y={196} width={18} height={18} fill="var(--m-bg)" stroke="none" />
      <Breaker x={x} y={205} s={14} closed={on} />
      <Val a={a} t="kw" x={x + 28} y={56} w={80} label="Output" />
      <Val a={a} t="fuel_lph" x={x + 28} y={96} w={80} label="Fuel" />
    </g>)}
    <line x1={960} y1={250} x2={1220} y2={250} className="m-bus-l" style={{ stroke: 'var(--m-power)', strokeWidth: 4 }} />
    <Lbl x={1100} y={268} muted size={9.5}>DG bus 415 V</Lbl>
    <W x1={1090} y1={250} x2={1090} y2={340} /><Breaker x={1090} y={296} s={16} closed={dg1 || dg2} />
    <Lbl x={1100} y={300} muted size={9.5}>DG incomer</Lbl>
    <Lbl x={24} y={652} muted size={10}>Breakers: filled = closed, hollow = open. Values per feeder from the feeder meter. TR-02 carries the drives on BB-02; HF-01 compensates their harmonics.</Lbl>
  </>;
}
function VfdDrop({ a, x, n }) {
  const on = vOf(useLive(a, 'freq')) > 5;
  return <g>
    <W x1={x} y1={430} x2={x} y2={444} /><W x1={x} y1={458} x2={x} y2={468} />
    <Equip a={a} x={x - 12} y={444} w={24} h={46} noId>
      <rect x={x - 12} y={444} width={24} height={14} rx="2" className="m-body" /><rect x={x - 12} y={444} width={24} height={14} rx="2" className="m-edge" />
      <text x={x} y={455} textAnchor="middle" className="m-inner" style={{ fontSize: 8 }}>VFD</text>
      <g className={`m-shape ${on ? 'on' : 'off'}`}><circle cx={x} cy={478} r={10} className="m-body" /><circle cx={x} cy={478} r={10} className="m-edge" /><text x={x} y={481} textAnchor="middle" className="m-inner" style={{ fontSize: 9 }}>M</text></g>
    </Equip>
    <Lbl x={x} y={504} anchor="middle" bold size={10}>{a}</Lbl>
    <Lbl x={x} y={516} anchor="middle" muted size={9}>{n}</Lbl>
    <Val a={a} t="kw" x={x} y={524} w={62} anchor="middle" label="kW" />
    <Val a={a} t="current" x={x} y={564} w={62} anchor="middle" label="Current" />
    <Val a={a} t="freq" x={x} y={604} w={62} anchor="middle" label="Hz" dec={1} />
  </g>;
}
function SLD({ c }) { return <Mimic c={c} w={1280} h={664}><SldBody /></Mimic>; }

/* ---------------- busbar and transformer thermal view (L3) ---------------- */
/** Oil-filled power transformer: tank, radiator banks, conservator, HV bushings on the cover, LV bus-duct flange. */
function TrafoArt({ x, y }) {
  const tx = x + 40, tw = 100, ty = y + 50, th = 90;
  return <g className="m-shape">
    {[0, 1, 2, 3, 4].map(i => <g key={i}><rect x={x + 4 + i * 7} y={ty + 8} width={4} height={th - 16} className="m-body" /><rect x={x + 4 + i * 7} y={ty + 8} width={4} height={th - 16} className="m-edge" />
      <rect x={tx + tw + 4 + i * 7} y={ty + 8} width={4} height={th - 16} className="m-body" /><rect x={tx + tw + 4 + i * 7} y={ty + 8} width={4} height={th - 16} className="m-edge" /></g>)}
    <line x1={x + 4} y1={ty + 14} x2={tx} y2={ty + 14} className="m-edge" /><line x1={x + 4} y1={ty + th - 14} x2={tx} y2={ty + th - 14} className="m-edge" />
    <line x1={tx + tw} y1={ty + 14} x2={tx + tw + 36} y2={ty + 14} className="m-edge" /><line x1={tx + tw} y1={ty + th - 14} x2={tx + tw + 36} y2={ty + th - 14} className="m-edge" />
    <rect x={tx} y={ty} width={tw} height={th} rx="3" fill="url(#m-metal)" className="m-body" /><rect x={tx} y={ty} width={tw} height={th} rx="3" className="m-edge" />
    {[0, 1, 2, 3].map(i => <line key={i} x1={tx + 14 + i * 24} y1={ty + 6} x2={tx + 14 + i * 24} y2={ty + th - 6} className="m-edge" style={{ strokeOpacity: 0.35 }} />)}
    {/* conservator */}
    <rect x={tx + 4} y={y + 2} width={tw - 30} height={20} rx="10" fill="url(#m-metal)" className="m-body" /><rect x={tx + 4} y={y + 2} width={tw - 30} height={20} rx="10" className="m-edge" />
    <line x1={tx + 30} y1={y + 22} x2={tx + 30} y2={ty} className="m-edge" />
    {/* HV bushings */}
    {[0, 1, 2].map(i => { const bx = tx + 50 + i * 18; return <g key={i}>{[0, 1, 2, 3].map(k => <ellipse key={k} cx={bx} cy={ty - 6 - k * 7} rx={5} ry={3} className="m-body" />)}
      <line x1={bx} y1={ty} x2={bx} y2={ty - 34} className="m-edge" /><circle cx={bx} cy={ty - 36} r={2} className="m-hub" /></g>; })}
    {/* LV flange (bus duct) */}
    <rect x={x} y={ty + th - 6} width={20} height={12} className="m-body" /><rect x={x} y={ty + th - 6} width={20} height={12} className="m-edge" />
    <rect x={tx - 6} y={ty + th + 10} width={tw + 12} height={6} className="m-body" />
  </g>;
}
function JointMark({ a, t, x, y }) {
  const r = useLive(a, t);
  return <g>
    <rect x={x - 20} y={y - 11} width={40} height={22} rx="2" className="m-body" /><rect x={x - 20} y={y - 11} width={40} height={22} rx="2" className="m-edge" />
    {[-11, 11].map(d => <g key={d}><circle cx={x + d} cy={y - 4} r={2.4} className="m-hub" /><circle cx={x + d} cy={y + 4} r={2.4} className="m-hub" /></g>)}
    {r.st !== 'good' && <circle cx={x} cy={y} r={22} className={`m-ring ${r.st}`} />}
  </g>;
}
function PhaseDT({ a, x, y }) {
  const v = ['joint_r', 'joint_y', 'joint_b'].map(t => vOf(useLive(a, t)));
  const dt = Math.max(...v) - Math.min(...v);
  return <Calc x={x} y={y} w={100} label="Phase ΔT" v={dt} unit="°C" dec={1} st={dt > 15 ? 'bad' : dt > 10 ? 'warn' : 'good'} a={a} />;
}
function BusHalf({ ox, tr, bb, label }) {
  const bars = [['joint_r', 'R', 380], ['joint_y', 'Y', 430], ['joint_b', 'B', 480]];
  return <g>
    <Zone x={ox} y={44} w={600} h={590} label={label} />
    <Equip a={tr} x={ox + 34} y={70} w={176} h={156} noId><TrafoArt x={ox + 34} y={78} /></Equip>
    <Val a={tr} t="load_pct" x={ox + 236} y={70} w={118} label="Loading" />
    <Val a={tr} t="oil_temp" x={ox + 236} y={112} w={118} label="Top oil (OTI)" />
    <Val a={tr} t="wind_temp" x={ox + 236} y={154} w={118} label="Winding (WTI)" />
    <Val a={tr} t="tap" x={ox + 236} y={196} w={118} label="OLTC tap" />
    <BarInd a={tr} t="oil_temp" x={ox + 372} y={74} h={118} max={110} label="OTI" />
    <BarInd a={tr} t="wind_temp" x={ox + 408} y={74} h={118} max={130} label="WTI" />
    <MiniTrend a={tr} t="wind_temp" x={ox + 446} y={74} w={136} h={40} />
    <Lbl x={ox + 446} y={128} muted size={9.5}>Winding temp · 24 h</Lbl>
    <MiniTrend a={tr} t="load_pct" x={ox + 446} y={144} w={136} h={40} />
    <Lbl x={ox + 446} y={198} muted size={9.5}>Loading · 24 h</Lbl>
    {/* bus duct to PCC */}
    <Pipe d={`M${ox + 44} ${222} V${348}`} kind="power" w={6} />
    <Lbl x={ox + 54} y={318} muted size={9.5}>LV bus duct 4000 A</Lbl>
    <Lbl x={ox + 64} y={248} bold size={12}>{tr} · 3.15 MVA ONAN</Lbl>
    <Lbl x={ox + 64} y={262} muted size={10}>33/0.433 kV · Dyn11 · OLTC</Lbl>
    {/* PCC busbar chamber */}
    <Equip a={bb} x={ox + 24} y={348} w={316} h={160} noId>
      <rect x={ox + 24} y={348} width={316} height={160} rx="4" className="m-body" style={{ opacity: 0.35 }} /><rect x={ox + 24} y={348} width={316} height={160} rx="4" className="m-edge" />
      {bars.map(([t, p, y]) => <g key={t}>
        <rect x={ox + 56} y={y - 6} width={270} height={12} rx="2" fill="url(#m-metal)" className="m-body" /><rect x={ox + 56} y={y - 6} width={270} height={12} rx="2" className="m-edge" />
        <text x={ox + 38} y={y + 4} className="m-inner">{p}</text>
        {[ox + 110, ox + 270].map(sx => <line key={sx} x1={sx} y1={y + 6} x2={sx} y2={y + 18} className="m-edge" />)}
      </g>)}
      {bars.map(([t, , y]) => <JointMark key={t} a={bb} t={t} x={ox + 190} y={y} />)}
    </Equip>
    <Lbl x={ox + 182} y={526} anchor="middle" muted size={9.5}>{bb} · 4000 A PCC · bolted joint at section splice</Lbl>
    {bars.map(([t, p, y]) => <Val key={t} a={bb} t={t} x={ox + 356} y={y - 18} w={124} label={`${p}-phase joint`} />)}
    {bars.map(([t, p], i) => <BarInd key={t} a={bb} t={t} x={ox + 500 + i * 30} y={360} h={130} max={110} label={p} />)}
    <Val a={bb} t="panel_amb" x={ox + 24} y={540} w={100} label="Panel ambient" />
    <Val a={bb} t="current" x={ox + 134} y={540} w={100} label="Bus current" />
    <Val a={bb} t="v_ll" x={ox + 244} y={540} w={100} label="Bus voltage" />
    <PhaseDT a={bb} x={ox + 354} y={540} />
    <MiniTrend a={bb} t="joint_y" x={ox + 464} y={540} w={120} h={36} />
    <Lbl x={ox + 464} y={592} muted size={9.5}>Y-joint · 24 h</Lbl>
  </g>;
}
function Busbar({ c }) {
  return <Mimic c={c} w={1280} h={660} note="NETA: ΔT > 15 °C between like phases is a major defect">
    <Title x={24} y={30}>Busbars and transformers · thermal view</Title>
    <BusHalf ox={24} tr="TR-01" bb="BB-01" label="Section 1 · TR-01 → BB-01" />
    <BusHalf ox={656} tr="TR-02" bb="BB-02" label="Section 2 · TR-02 → BB-02" />
    <Lbl x={24} y={652} muted size={10}>Joint limit 85 °C · OTI trip 95 °C, WTI alarm 105 °C. Bus coupler BC-01 links the two sections.</Lbl>
  </Mimic>;
}

/* ---------------- DG sets and VFDs (L3) ---------------- */
/** Diesel genset on a skid: radiator + fan, engine block with cylinder heads and exhaust, alternator, control panel. */
function Genset({ x, y, on }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x} y={y + 112} width={300} height={10} rx="2" className="m-body" /><rect x={x} y={y + 112} width={300} height={10} rx="2" className="m-edge" />
    {/* radiator */}
    <rect x={x + 6} y={y + 24} width={46} height={88} rx="2" className="m-body" /><rect x={x + 6} y={y + 24} width={46} height={88} rx="2" className="m-edge" />
    {Array.from({ length: 9 }).map((_, i) => <line key={i} x1={x + 10} y1={y + 30 + i * 9} x2={x + 48} y2={y + 30 + i * 9} className="m-edge" style={{ strokeOpacity: 0.35 }} />)}
    <g className="m-spin" style={{ transformOrigin: `${x + 29}px ${y + 68}px`, animationDuration: '0.6s' }}><path d={`M${x + 29} ${y + 50} V${y + 86} M${x + 11} ${y + 68} H${x + 47}`} className="m-blade-l" style={{ strokeWidth: 2 }} /></g>
    {/* engine */}
    <path d={`M${x + 60} ${y + 52} H${x + 196} V${y + 112} H${x + 60} Z`} fill="url(#m-metal)" className="m-body" /><path d={`M${x + 60} ${y + 52} H${x + 196} V${y + 112} H${x + 60} Z`} className="m-edge" />
    {[0, 1, 2, 3, 4, 5].map(i => <g key={i}><rect x={x + 66 + i * 21} y={y + 40} width={17} height={12} rx="2" className="m-body" /><rect x={x + 66 + i * 21} y={y + 40} width={17} height={12} rx="2" className="m-edge" /></g>)}
    <rect x={x + 66} y={y + 70} width={60} height={22} rx="3" className="m-edge" />
    <text x={x + 150} y={y + 90} textAnchor="middle" className="m-inner" style={{ fontSize: 9 }}>V12 diesel</text>
    {/* exhaust + silencer */}
    <path d={`M${x + 170} ${y + 40} V${y + 16}`} className="m-edge" style={{ strokeWidth: 4 }} />
    <rect x={x + 160} y={y} width={20} height={18} rx="4" className="m-body" /><rect x={x + 160} y={y} width={20} height={18} rx="4" className="m-edge" />
    {/* alternator */}
    <rect x={x + 200} y={y + 56} width={70} height={54} rx="10" fill="url(#m-metal)" className="m-body" /><rect x={x + 200} y={y + 56} width={70} height={54} rx="10" className="m-edge" />
    {[0, 1, 2].map(i => <line key={i} x1={x + 220 + i * 15} y1={y + 60} x2={x + 220 + i * 15} y2={y + 106} className="m-edge" style={{ strokeOpacity: 0.35 }} />)}
    <text x={x + 235} y={y + 87} textAnchor="middle" className="m-inner">G</text>
    {/* control panel */}
    <rect x={x + 274} y={y + 40} width={22} height={72} rx="2" className="m-body" /><rect x={x + 274} y={y + 40} width={22} height={72} rx="2" className="m-edge" />
    <rect x={x + 278} y={y + 46} width={14} height={10} className="m-mini-bg" />
    <circle cx={x + 285} cy={y + 68} r="3.5" className="m-run" />
  </g>;
}
function DGPanel({ a, ox }) {
  const kw = vOf(useLive(a, 'kw')); const on = kw > 60;
  return <g>
    <Zone x={ox} y={44} w={606} h={290} label={`${a} · 1500 kVA / 1200 kW`} />
    <Equip a={a} x={ox + 20} y={72} w={300} h={122} noId><Genset x={ox + 20} y={72} on={on} /></Equip>
    <Lbl x={ox + 20} y={214} bold size={11}>{on ? 'RUNNING · on load' : 'STANDBY · auto start ready'}</Lbl>
    <Lbl x={ox + 20} y={228} muted size={9.5}>Engine + alternator on common skid, 415 V</Lbl>
    <Gauge a={a} t="kw" x={ox + 72} y={288} r={30} min={0} max={1200} label="Output kW" />
    <Calc x={ox + 136} y={258} w={120} label="Load factor (of 1200 kW)" v={(kw / 1200) * 100} unit="%" dec={1} st={on && kw < 360 ? 'warn' : 'good'} a={a} />
    <Lbl x={ox + 136} y={308} muted size={9.5}>Below 30 % load: wet stacking risk</Lbl>
    {[['kw', 'Output power'], ['fuel_lph', 'Fuel rate'], ['sfc', 'Specific output', 2], ['coolant_temp', 'Coolant temp'], ['run_hours', 'Run hours'], ['batt_v', 'Starter battery', 1]].map(([t, l, d], i) =>
      <Val key={t} a={a} t={t} x={ox + 340 + (i % 2) * 128} y={70 + Math.floor(i / 2) * 42} w={120} label={l} dec={d} />)}
    <MiniTrend a={a} t="kw" x={ox + 340} y={206} w={248} h={46} />
    <Lbl x={ox + 340} y={266} muted size={9.5}>Output kW · 24 h</Lbl>
    <MiniTrend a={a} t="coolant_temp" x={ox + 340} y={276} w={248} h={30} />
    <Lbl x={ox + 340} y={320} muted size={9.5}>Coolant °C · 24 h</Lbl>
  </g>;
}
function VFDCard({ a, ox, title, rated, load }) {
  const f = vOf(useLive(a, 'freq')), kw = vOf(useLive(a, 'kw')); const on = f > 5;
  const dol = Math.min(rated * 0.95, f > 5 ? kw / Math.pow(f / 50, 3) : 0); const save = Math.max(0, dol - kw);
  const y = 352, my = 430;
  return <g>
    <Zone x={ox} y={y} w={236} h={316} label={`${a} · ${title}`} />
    <Equip a={a} x={ox + 14} y={y + 30} w={46} h={86} noId>
      <rect x={ox + 14} y={y + 30} width={46} height={86} rx="3" fill="url(#m-metal)" className="m-body" /><rect x={ox + 14} y={y + 30} width={46} height={86} rx="3" className="m-edge" />
      <rect x={ox + 21} y={y + 38} width={32} height={14} className="m-mini-bg" /><text x={ox + 37} y={y + 49} textAnchor="middle" className="m-inner" style={{ fontSize: 8.5 }}>{fmtNum(f, 1)}</text>
      {[0, 1, 2, 3].map(i => <line key={i} x1={ox + 22} y1={y + 66 + i * 8} x2={ox + 52} y2={y + 66 + i * 8} className="m-edge" style={{ strokeOpacity: 0.4 }} />)}
    </Equip>
    <Lbl x={ox + 37} y={y + 130} anchor="middle" muted size={9.5}>Drive</Lbl>
    <Pipe pts={[[ox + 60, my], [ox + 86, my]]} kind="power" w={3} flow={on} />
    <Equip a={a} x={ox + 86} y={my - 16} w={46} h={32} noId><Motor x={ox + 104} y={my} r={16} on={on} /></Equip>
    <line x1={ox + 130} y1={my} x2={load === 'pump' ? ox + 152 : ox + 152} y2={my} className="m-edge" style={{ strokeWidth: 3 }} />
    <Lbl x={ox + 104} y={my + 32} anchor="middle" muted size={9.5}>{rated} kW</Lbl>
    {load === 'pump'
      ? <Equip a={a} x={ox + 150} y={my - 22} w={50} h={40} noId><Pump x={ox + 172} y={my} r={20} on={on} dir={0} /></Equip>
      : <Equip a={a} x={ox + 150} y={my - 30} w={60} h={60} noId><Fan x={ox + 180} y={my} r={28} on={on} speed={Math.max(0.3, f / 40)} /></Equip>}
    <Lbl x={ox + 180} y={my + 46} anchor="middle" muted size={9.5}>{load === 'pump' ? 'CHW pump' : 'Fan'}</Lbl>
    <Val a={a} t="freq" x={ox + 12} y={y + 152} w={102} label="Output frequency" dec={1} />
    <Val a={a} t="kw" x={ox + 122} y={y + 152} w={102} label="Input power" />
    <Val a={a} t="current" x={ox + 12} y={y + 194} w={102} label="Motor current" />
    <Val a={a} t="thd_i" x={ox + 122} y={y + 194} w={102} label="Input THD-I" />
    <Calc x={ox + 12} y={y + 236} w={102} label="DOL equivalent" v={dol} unit="kW" dec={1} a={a} />
    <Calc x={ox + 122} y={y + 236} w={102} label="Saving vs DOL" v={save} unit="kW" dec={1} a={a} />
    <Lbl x={ox + 12} y={y + 290} muted size={9.5}>{fmtNum(save * 24, 0)} kWh/day · {dol ? fmtNum((save / dol) * 100, 0) : 0} % less</Lbl>
    <Lbl x={ox + 12} y={y + 304} muted size={9}>Affinity law estimate, P ∝ (f / 50)³</Lbl>
  </g>;
}
function DgVfd({ c }) {
  const cards = [['VFD-01', 'AHU-1 fan', 45, 'fan'], ['VFD-02', 'AHU-2 fan', 45, 'fan'], ['VFD-03', 'sec. CHW pump', 75, 'pump'], ['VFD-04', 'CT-01 fan', 30, 'fan'], ['VFD-05', 'CT-02 fan', 30, 'fan']];
  return <Mimic c={c} w={1280} h={680}>
    <Title x={24} y={30}>DG sets and variable-speed drives</Title>
    <DGPanel a="DG-01" ox={24} />
    <DGPanel a="DG-02" ox={650} />
    {cards.map(([a, t, r, l], i) => <VFDCard key={a} a={a} ox={24 + i * 248} title={t} rated={r} load={l} />)}
  </Mimic>;
}

/* ---------------- power quality (L3) ---------------- */
/** Phasor diagram from L-L average and unbalance (phase deviation drawn ×10 for visibility). */
function Phasor({ x, y, r = 56, a, tv, tu, ua, unit, div = 1, dec = 1 }) {
  const V = vOf(useLive(a, tv)); const u = vOf(useLive(ua || a, tu)) / 100;
  const ph = V / Math.sqrt(3) / div; const dev = [1 + u, 1 - u * 0.6, 1 - u * 0.4];
  const ang = [90, -30, 210];
  return <g>
    <circle cx={x} cy={y} r={r} className="m-edge" style={{ strokeDasharray: '3 4', strokeOpacity: 0.6 }} />
    <circle cx={x} cy={y} r={2.5} className="m-hub" />
    {['R', 'Y', 'B'].map((p, i) => { const k = 1 + (dev[i] - 1) * 10; const th = (ang[i] * Math.PI) / 180;
      const ex = x + r * k * Math.cos(th), ey = y - r * k * Math.sin(th); const lx = x + (r + 14) * Math.cos(th), ly = y - (r + 14) * Math.sin(th);
      return <g key={p}><line x1={x} y1={y} x2={ex} y2={ey} className="m-g-needle" markerEnd="url(#m-arrow)" /><text x={lx} y={ly + 4} textAnchor="middle" className="m-inner">{p}</text>
        <text x={x - r} y={y + r + 22 + i * 13} className="m-sub">{p}-N {fmtNum(ph * dev[i], dec)} {unit}</text></g>; })}
  </g>;
}
const SHAPE = [[3, 0.12], [5, 0.8], [7, 0.52], [9, 0.05], [11, 0.22], [13, 0.15], [15, 0.03], [17, 0.09], [19, 0.07], [21, 0.02], [23, 0.05], [25, 0.04]];
const LIM = h => (h < 11 ? 7 : h < 17 ? 3.5 : h < 23 ? 2.5 : 1); // IEEE 519-2014 Table 2, Isc/IL 20–50, < 1 kV ... 69 kV
function Spectrum({ x, y, w, h, a, t }) {
  const m = useMimic(); const thd = vOf(useLive(a, t));
  const norm = Math.sqrt(SHAPE.reduce((s, [, k]) => s + k * k, 0)); const max = 16;
  const bwid = w / SHAPE.length; const Y = v => y + h - (Math.min(v, max) / max) * h;
  return <g onClick={() => m.select(a)} style={{ cursor: 'pointer' }}>
    {[0, 4, 8, 12, 16].map(g => <g key={g}><line x1={x} y1={Y(g)} x2={x + w} y2={Y(g)} className="m-edge" style={{ strokeOpacity: 0.18 }} /><text x={x - 8} y={Y(g) + 4} textAnchor="end" className="m-sub">{g}</text></g>)}
    <text x={x - 30} y={y - 10} className="m-sub">% of fundamental</text>
    {SHAPE.map(([n, k], i) => { const v = (thd * k) / norm; const bad = v > LIM(n); const bx = x + i * bwid + bwid * 0.22;
      return <g key={n} className={`m-bar ${bad ? 'bad' : 'good'}`}>
        <rect x={bx} y={Y(v)} width={bwid * 0.56} height={y + h - Y(v)} rx="2" className="m-g-fill" />
        <text x={bx + bwid * 0.28} y={Math.min(Y(v), Y(LIM(n))) - 5} textAnchor="middle" className="m-sub">{fmtNum(v, 1)}</text>
        <text x={bx + bwid * 0.28} y={y + h + 14} textAnchor="middle" className="m-val-l">{n}</text></g>; })}
    <path d={SHAPE.map(([n], i) => `${i ? 'L' : 'M'}${x + i * bwid} ${Y(LIM(n))} H${x + (i + 1) * bwid}`).join(' ')} className="m-g-limline" fill="none" strokeDasharray="5 3" />
    <line x1={x} y1={y + h} x2={x + w} y2={y + h} className="m-edge" />
    <text x={x + w / 2} y={y + h + 30} textAnchor="middle" className="m-sub">Harmonic order</text>
  </g>;
}
function PQBody() {
  const hfOn = vOf(useLive('HF-01', 'comp_current')) > 20;
  return <>
    <Title x={24} y={30}>Power quality · incomer and LT busbars</Title>
    {/* incomer */}
    <Zone x={24} y={44} w={404} h={300} label="33 kV incomer · GRID-01" />
    <Phasor x={98} y={146} a="GRID-01" tv="voltage" tu="v_unbal" unit="kV" dec={2} />
    <Val a="GRID-01" t="voltage" x={186} y={66} w={112} label="Voltage L-L" dec={2} />
    <Val a="GRID-01" t="freq" x={186} y={108} w={112} label="Frequency" dec={2} />
    <Val a="GRID-01" t="pf" x={186} y={150} w={112} label="Power factor" dec={3} />
    <Val a="GRID-01" t="v_unbal" x={186} y={192} w={112} label="Voltage unbalance" dec={2} />
    <Val a="GRID-01" t="kva" x={186} y={234} w={112} label="Demand" />
    <BarInd a="GRID-01" t="thd_v" x={326} y={72} h={170} max={8} label="THD-V" />
    <BarInd a="GRID-01" t="thd_i" x={376} y={72} h={170} max={12} label="TDD" />
    <Val a="GRID-01" t="thd_v" x={312} y={276} w={50} label="THD-V" dec={1} />
    <Val a="GRID-01" t="thd_i" x={366} y={276} w={50} label="TDD" dec={1} />
    {/* BB-01 */}
    <Zone x={440} y={44} w={404} h={300} label="BB-01 · 415 V (TR-01)" />
    <Phasor x={514} y={146} a="BB-01" tv="v_ll" ua="MCC-01" tu="v_unbal" unit="V" dec={0} />
    <Val a="BB-01" t="v_ll" x={602} y={66} w={112} label="Voltage L-L" />
    <Val a="BB-01" t="current" x={602} y={108} w={112} label="Bus current" />
    <Val a="MCC-01" t="pf" x={602} y={150} w={112} label="PF · MCC-01" dec={3} />
    <Val a="MCC-01" t="v_unbal" x={602} y={192} w={112} label="Unbalance · MCC-01" dec={2} />
    <Val a="APFC-01" t="pf_bus" x={602} y={234} w={112} label="PCC PF (APFC)" dec={3} />
    <BarInd a="TR-01" t="thd_i" x={742} y={72} h={170} max={16} label="TR-01" />
    <BarInd a="MCC-01" t="thd_i" x={792} y={72} h={170} max={30} label="MCC-01" />
    <Val a="TR-01" t="thd_i" x={728} y={276} w={50} label="THD-I" dec={1} />
    <Val a="MCC-01" t="thd_i" x={782} y={276} w={50} label="THD-I" dec={1} />
    {/* BB-02 */}
    <Zone x={856} y={44} w={400} h={300} label="BB-02 · 415 V (TR-02, drives)" />
    <Phasor x={930} y={146} a="BB-02" tv="v_ll" ua="MCC-03" tu="v_unbal" unit="V" dec={0} />
    <Val a="BB-02" t="v_ll" x={1018} y={66} w={112} label="Voltage L-L" />
    <Val a="BB-02" t="current" x={1018} y={108} w={112} label="Bus current" />
    <Val a="MCC-03" t="pf" x={1018} y={150} w={112} label="PF · MCC-03" dec={3} />
    <Val a="MCC-03" t="v_unbal" x={1018} y={192} w={112} label="Unbalance · MCC-03" dec={2} />
    <Val a="TR-02" t="wind_temp" x={1018} y={234} w={112} label="TR-02 winding" />
    <BarInd a="TR-02" t="thd_i" x={1158} y={72} h={170} max={16} label="TR-02" />
    <BarInd a="HF-01" t="thd_i_out" x={1208} y={72} h={170} max={12} label="After AHF" />
    <Val a="TR-02" t="thd_i" x={1144} y={276} w={50} label="THD-I" dec={1} />
    <Val a="HF-01" t="thd_i_out" x={1198} y={276} w={50} label="THD-I" dec={1} />
    {/* spectrum */}
    <Zone x={24} y={358} w={820} h={312} label="Current harmonic spectrum · TR-02 LV (scaled from THD-I)" />
    <Spectrum x={84} y={400} w={740} h={200} a="TR-02" t="thd_i" />
    <line x1={560} y1={384} x2={590} y2={384} className="m-g-limline" strokeDasharray="5 3" />
    <Lbl x={596} y={388} muted size={9.5}>IEEE 519 individual limit (Isc/IL 20–50)</Lbl>
    {/* compensation */}
    <Zone x={856} y={358} w={400} h={312} label="Compensation · HF-01 and APFC-01" />
    <line x1={876} y1={398} x2={1000} y2={398} className="m-bus-l" style={{ strokeWidth: 3 }} />
    <Lbl x={876} y={390} muted size={9.5}>BB-02</Lbl>
    <line x1={930} y1={398} x2={930} y2={430} style={{ stroke: 'var(--m-power)', strokeWidth: 1.8 }} />
    <Breaker x={930} y={418} s={14} closed={hfOn} />
    <Equip a="HF-01" x={896} y={434} w={68} h={110} noId>
      <rect x={896} y={434} width={68} height={110} rx="3" fill="url(#m-metal)" className="m-body" /><rect x={896} y={434} width={68} height={110} rx="3" className="m-edge" />
      <rect x={904} y={442} width={52} height={16} className="m-mini-bg" /><text x={930} y={454} textAnchor="middle" className="m-inner" style={{ fontSize: 9 }}>{hfOn ? 'ON' : 'FAULT'}</text>
      <path d={`M906 486 q6 -14 12 0 t12 0 t12 0 t12 0`} className="m-glyph" />
      <text x={930} y={520} textAnchor="middle" className="m-inner" style={{ fontSize: 9 }}>AHF 300 A</text>
    </Equip>
    <Lbl x={930} y={560} anchor="middle" bold size={10.5}>{hfOn ? 'IN SERVICE' : 'OFFLINE · tripped'}</Lbl>
    <Val a="HF-01" t="comp_current" x={1000} y={420} w={120} label="Compensating current" />
    <Val a="HF-01" t="thd_i_out" x={1128} y={420} w={116} label="THD-I after filter" dec={1} />
    <Val a="HF-01" t="filter_temp" x={1000} y={462} w={120} label="Heatsink" />
    <Val a="TR-02" t="thd_i" x={1128} y={462} w={116} label="TR-02 LV THD-I" dec={1} />
    <Equip a="APFC-01" x={1000} y={512} w={40} h={40} noId><rect x={1000} y={512} width={40} height={40} fill="transparent" /><line x1={1020} y1={512} x2={1020} y2={526} style={{ stroke: 'var(--m-power)', strokeWidth: 1.6 }} /><Capacitor x={1020} y={526} /><line x1={1020} y1={533} x2={1020} y2={540} style={{ stroke: 'var(--m-power)', strokeWidth: 1.6 }} /><Earth x={1020} y={540} /></Equip>
    <Val a="APFC-01" t="kvar" x={1050} y={512} w={94} label="APFC kVAr" />
    <Val a="APFC-01" t="steps_on" x={1152} y={512} w={92} label="Steps (of 12)" dec={0} />
    <Val a="APFC-01" t="cap_temp" x={1050} y={554} w={94} label="Panel temp" />
    <Val a="APFC-01" t="pf_bus" x={1152} y={554} w={92} label="PCC PF" dec={3} />
    <Lbl x={876} y={618} muted size={9.5}>With HF-01 offline, VFD harmonics flow into TR-02:</Lbl>
    <Lbl x={876} y={632} muted size={9.5}>extra eddy-current loss raises the winding temperature.</Lbl>
    <Lbl x={876} y={646} muted size={9.5}>Detuned (7 %) APFC reactors keep capacitors off resonance.</Lbl>
  </>;
}
function PowerQuality({ c }) { return <Mimic c={c} w={1280} h={684}><PQBody /></Mimic>; }

export default { 'energy-flow': EnergyFlow, sld: SLD, busbar: Busbar, 'dg-vfd': DgVfd, 'power-quality': PowerQuality };
