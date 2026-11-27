/* Solar portfolio mimics: portfolio map (L1) and Bhadla single-line diagram (L2). */
import React from 'react';
import { Mimic, Equip, Val, Pipe, PVArray, Transformer, Breaker, Switch, Lamp, Lbl, Title, Zone, MiniTrend, BarInd, useLive, useMimic } from './kit.jsx';

/* ---------------- local helpers ---------------- */
/** Derived value box in the same style as <Val> (for calculated values such as PR). */
function Kpi({ x, y, w = 104, label, value, unit, st = 'good', big, onClick }) {
  const h = big ? 46 : 36;
  return <g className={`m-val ${st}`} onClick={onClick} role={onClick ? 'button' : undefined}>
    <rect x={x} y={y} width={w} height={h} rx="4" />
    <text x={x + 7} y={y + 12} className="m-val-l">{label}</text>
    <text x={x + 7} y={y + (big ? 36 : 29)} className={`m-val-v ${big ? 'big' : ''}`}>{value}<tspan className="m-val-u"> {unit}</tspan></text>
  </g>;
}
/** Central / string inverter: box with DC = and AC ~ glyphs split by a diagonal. */
function Inverter({ x, y, w = 56, h = 56, on = true }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x} y={y} width={w} height={h} rx="4" fill="url(#m-metal)" className="m-body" />
    <rect x={x} y={y} width={w} height={h} rx="4" className="m-edge" />
    <line x1={x + 4} y1={y + h - 4} x2={x + w - 4} y2={y + 4} className="m-glyph" />
    <path d={`M${x + 9} ${y + 14} h14 M${x + 9} ${y + 19} h14`} className="m-glyph" />
    <path d={`M${x + w - 24} ${y + h - 14} q4 -7 8 0 t8 0`} className="m-glyph" />
    <circle cx={x + w - 6} cy={y + 6} r="3" className="m-run" />
  </g>;
}
/** Tracker end-view: post, torque tube and module table rotated to the angle; dashed line = set angle. */
function TrackerView({ x, y, angle = 0, set }) {
  const a = Math.max(-60, Math.min(60, angle || 0));
  return <g className="m-shape">
    <path d={`M${x - 26} ${y + 70} H${x + 26}`} className="m-edge" />
    <rect x={x - 4} y={y + 6} width={8} height={64} className="m-body" /><rect x={x - 4} y={y + 6} width={8} height={64} className="m-edge" />
    {set != null && <line x1={x - 58} y1={y} x2={x + 58} y2={y} transform={`rotate(${-Math.max(-60, Math.min(60, set))} ${x} ${y})`} className="m-edge" strokeDasharray="4 3" opacity=".7" />}
    <g transform={`rotate(${-a} ${x} ${y})`}>
      <rect x={x - 54} y={y - 5} width={108} height={6} fill="url(#m-solar)" className="m-pv" />
      <line x1={x - 54} y1={y + 2} x2={x + 54} y2={y + 2} className="m-edge" />
    </g>
    <circle cx={x} cy={y} r="5" className="m-body" /><circle cx={x} cy={y} r="5" className="m-edge" />
  </g>;
}
/** Vertical bus bar (kit Bus is horizontal only). */
const VBus = ({ x, y1, y2, label, hv }) => <g className={`m-bus ${hv ? 'hv' : 'mv'} good`}><line x1={x} y1={y1} x2={x} y2={y2} className="m-bus-l" />{label && <text x={x} y={y1 - 10} textAnchor="middle" className="m-sub">{label}</text>}</g>;
/** Lattice transmission tower. */
const Tower = ({ x, y, h = 90 }) => <g className="m-shape">
  <path d={`M${x - 16} ${y + h} L${x - 4} ${y} H${x + 4} L${x + 16} ${y + h} M${x - 13} ${y + h * 0.75} L${x + 9} ${y + h * 0.45} M${x + 13} ${y + h * 0.75} L${x - 9} ${y + h * 0.45} M${x - 9} ${y + h * 0.45} L${x + 6} ${y + h * 0.18} M${x + 9} ${y + h * 0.45} L${x - 6} ${y + h * 0.18} M${x - 22} ${y + 12} H${x + 22} M${x - 16} ${y + 28} H${x + 16}`} className="m-edge" />
</g>;

/* ---------------- portfolio (L1) ---------------- */
const IND = [[74.5, 37], [77.8, 35.5], [79, 34.3], [78.5, 32.5], [80.3, 30.3], [81.1, 30], [84, 28.5], [88, 27.8], [88.2, 26.5], [89.8, 26.4], [92, 27], [95.4, 28.2], [97.3, 28], [96.2, 27.2], [95.2, 26.1], [94.6, 25], [93.4, 23.8], [92.6, 22.1], [91.6, 23.6], [90.4, 22.6], [89.1, 22.0], [88.0, 21.6], [87.0, 21.4], [86.8, 20.6], [85.3, 19.5], [84.1, 18.3], [82.3, 16.6], [81.2, 15.9], [80.2, 15.2], [80.3, 13.3], [79.9, 11.3], [79.8, 10.3], [78.9, 9.4], [77.5, 8.1], [76.6, 8.9], [76.1, 10.3], [75.6, 11.8], [74.7, 13.4], [74.1, 14.8], [73.4, 16.4], [72.9, 18.9], [72.8, 20.7], [72.6, 21.4], [72.1, 21.2], [70.9, 20.7], [69.2, 22.3], [68.4, 23.6], [69.6, 24.3], [71.1, 24.4], [70.3, 25.7], [70.1, 26.6], [69.5, 27.2], [70.6, 28.0], [71.9, 27.9], [73.4, 29.9], [74.5, 31.0], [74.4, 32.7], [73.9, 34.0]];
const MX = lon => 40 + (lon - 68) * 16, MY = lat => 60 + (37 - lat) * 16;
const DC_MWP = { inverter: 3.77, strinv: 0.366 }; // DC nameplate behind one monitored inverter, for the PR estimate

const PLANTS = [
  { key: 'BH', name: 'Bhadla, Rajasthan', cap: '300 MWp · central inverters · 1-axis trackers', lon: 71.9, lat: 27.5, labelSide: 1,
    inv: ['BH-INV-01', 'BH-INV-02', 'BH-INV-03', 'BH-INV-04'], ptr: 'BH-PTR-01', wms: 'BH-WMS-01', sms: 'BH-SMS-01',
    row: [['BH-INV-03', 'igbt_temp', 'INV-03 IGBT temp'], ['BH-INV-03', 'efficiency', 'INV-03 efficiency'], ['BH-PTR-01', 'oil_temp', 'PTR top oil'], ['BH-TRK-07', 'angle', 'TRK-07 angle']] },
  { key: 'KN', name: 'Kurnool, Andhra Pradesh', cap: '150 MWp · central inverters · 1-axis trackers', lon: 78.3, lat: 15.5, labelSide: 1,
    inv: ['KN-INV-01', 'KN-INV-02', 'KN-INV-03'], ptr: 'KN-PTR-01', wms: 'KN-WMS-01', sms: 'KN-SMS-01',
    row: [['KN-TRK-12', 'tracking_error', 'TRK-12 track error'], ['KN-TRK-12', 'angle', 'TRK-12 angle'], ['KN-SMS-01', 'pyr_deviation', 'Pyr vs ref cell'], ['KN-PTR-01', 'oil_temp', 'PTR top oil']] },
  { key: 'PV', name: 'Pavagada, Karnataka', cap: '200 MWp · string inverters · fixed tilt', lon: 77.3, lat: 14.1, labelSide: -1,
    inv: ['PV-INV-01', 'PV-INV-02', 'PV-INV-05', 'PV-INV-06'], ptr: 'PV-PTR-01', wms: 'PV-WMS-01', sms: 'PV-SMS-01',
    row: [['PV-INV-05', 'string_current', 'INV-05 string current'], ['PV-INV-05', 'igbt_temp', 'INV-05 IGBT temp'], ['PV-PTR-01', 'oil_temp', 'PTR top oil'], ['PV-IDT-02', 'winding_temp', 'IDT-02 winding']] },
];

/** Plant numbers derived from live tags: PR estimate and inverter availability. */
function usePlant(p) {
  const m = useMimic();
  const poa = m.read(p.wms, 'poa').v;
  const ac = p.inv.reduce((s, a) => { const r = m.read(a, 'ac_power'); return s + (r.v || 0) / (r.unit === 'kW' ? 1000 : 1); }, 0);
  const dc = p.inv.reduce((s, a) => s + (DC_MWP[m.c.db.assetById[a]?.cls] || 0), 0);
  const pr = poa > 150 && dc ? Math.min(100, (ac / (dc * poa / 1000)) * 100) : null;
  const avail = p.inv.filter(a => m.assetState(a) !== 'bad').length;
  const exp = m.read(p.ptr, 'export_mw').v || 0;
  return { pr, avail, n: p.inv.length, exp, m };
}

function PlantTile({ p, x, y }) {
  const { pr, avail, n, m } = usePlant(p);
  const cx = [280, 384, 488, 592].map(v => x + v);
  return <g>
    <Zone x={x} y={y} w={700} h={182} label={p.name} />
    <Lbl x={x + 690} y={y + 16} anchor="end" muted size={10}>{p.cap}</Lbl>
    {/* PV field → inverters → pooling transformer → 220 kV */}
    <PVArray x={x + 18} y={y + 32} cols={8} rows={3} mw={14} mh={10} />
    <Lbl x={x + 18} y={y + 84} muted size={9.5}>PV field (sample block)</Lbl>
    <Pipe pts={[[x + 146, y + 50], [x + 194, y + 50]]} kind="power" />
    {p.inv.map((a, i) => <g key={a}><Lamp a={a} x={x + 26 + i * 30} y={y + 106} /><text x={x + 26 + i * 30} y={y + 124} textAnchor="middle" className="m-id">{a.slice(-2)}</text></g>)}
    <Lbl x={x + 18} y={y + 144} muted size={9.5}>Inverters (lamp = state)</Lbl>
    <Equip a={p.ptr} x={x + 194} y={y + 30} w={40} h={46} noId>
      <Transformer x={x + 214} y={y + 44} r={13} />
    </Equip>
    <Pipe pts={[[x + 214, y + 72], [x + 214, y + 104]]} kind="hv" />
    <path d={`M${x + 207} ${y + 98} L${x + 214} ${y + 108} L${x + 221} ${y + 98}`} className="m-edge" />
    <Lbl x={x + 214} y={y + 126} anchor="middle" muted size={9.5}>to 220 kV grid</Lbl>
    <Lbl x={x + 214} y={y + 142} anchor="middle" muted size={9.5}>pooling ICT</Lbl>
    {/* values */}
    <Val a={p.ptr} t="export_mw" x={cx[0]} y={y + 26} w={96} big label="Export" />
    <Val a={p.ptr} t="pf" x={cx[0]} y={y + 80} w={96} label="PF at POI" dec={3} />
    <Val a={p.wms} t="poa" x={cx[1]} y={y + 26} w={96} label="Irradiance POA" />
    <Val a={p.wms} t="ghi" x={cx[1]} y={y + 70} w={96} label="GHI" />
    <Kpi x={cx[2]} y={y + 26} w={96} label="PR (est.)" value={pr == null ? '—' : pr.toFixed(1)} unit="%" st={pr != null && pr < 75 ? 'warn' : 'good'} />
    <Kpi x={cx[2]} y={y + 70} w={96} label="Inverters available" value={`${avail}/${n}`} unit={`· ${Math.round((avail / n) * 100)}%`} st={avail < n ? 'bad' : 'good'} onClick={() => m.select(p.inv.find(a => m.assetState(a) === 'bad') || p.inv[0])} />
    <Val a={p.sms} t="soiling_ratio" x={cx[3]} y={y + 26} w={96} label="Soiling ratio" dec={3} />
    <Val a={p.wms} t="module_temp" x={cx[3]} y={y + 70} w={96} label="Module temp" />
    {p.row.map(([a, t, l], i) => <Val key={a + t} a={a} t={t} x={cx[i]} y={y + 128} w={96} label={l} />)}
  </g>;
}

function PortfolioTotal() {
  const m = useMimic();
  const tot = PLANTS.reduce((s, p) => s + (m.read(p.ptr, 'export_mw').v || 0), 0);
  const inv = PLANTS.flatMap(p => p.inv); const ok = inv.filter(a => m.assetState(a) !== 'bad').length;
  const alarms = (m.c.demo.events || []).filter(e => e.severity === 'bad' && m.assetState(e.asset) === 'bad').length;
  return <g>
    <Zone x={40} y={572} w={480} h={126} label="Portfolio · 650 MWp" />
    <Kpi x={56} y={598} w={150} big label="Total export (3 pooling S/S)" value={tot.toFixed(1)} unit="MW" />
    <Kpi x={218} y={598} w={140} big label="Inverters available" value={`${ok}/${inv.length}`} unit="" st={ok < inv.length ? 'bad' : 'good'} />
    <Kpi x={370} y={598} w={136} big label="Assets in alarm" value={alarms} unit="" st={alarms ? 'bad' : 'good'} />
    <Lbl x={56} y={668} muted size={10}>PR (est.) = inverter AC ÷ (DC MWp × POA / 1000) for the monitored inverters.</Lbl>
    <Lbl x={56} y={684} muted size={10}>Availability counts inverters not in alarm.</Lbl>
  </g>;
}

function SolarPortfolio({ c }) {
  const india = 'M' + IND.map(([lo, la]) => `${MX(lo).toFixed(1)} ${MY(la).toFixed(1)}`).join(' L') + ' Z';
  const tiles = [70, 266, 462];
  return (
    <Mimic c={c} w={1280} h={710}>
      <Title x={24} y={30}>Suryodaya solar portfolio · 3 plants · 650 MWp</Title>
      <path d={india} className="m-body" opacity=".45" />
      <path d={india} className="m-edge" />
      <Lbl x={270} y={300} anchor="middle" muted size={11}>INDIA</Lbl>
      {PLANTS.map((p, i) => {
        const px = MX(p.lon), py = MY(p.lat), ty = tiles[i] + 91;
        return <g key={p.key}>
          <path d={`M${px} ${py} H${p.labelSide > 0 ? 530 : 530} V${ty} H560`} className="m-edge" strokeDasharray="3 4" opacity=".55" />
          <Lamp a={p.ptr} x={px} y={py} r={7} />
          <Lbl x={p.labelSide > 0 ? px + 12 : px - 12} y={p.labelSide > 0 ? py - 8 : py + 18} anchor={p.labelSide > 0 ? 'start' : 'end'} size={11} bold>{p.name.split(',')[0]}</Lbl>
        </g>;
      })}
      {PLANTS.map((p, i) => <PlantTile key={p.key} p={p} x={560} y={tiles[i]} />)}
      <PortfolioTotal />
    </Mimic>
  );
}

/* ---------------- Bhadla single-line (L2) ---------------- */
function InvRow({ a, cy, ic }) {
  const on = (useLive(a, 'ac_power').v || 0) > 0.05;
  return <g>
    <PVArray x={40} y={cy - 26} cols={6} rows={4} mw={14} mh={10} />
    <Lbl x={40} y={cy + 36} muted size={9.5}>PV block ≈ 3.8 MWp</Lbl>
    <Pipe pts={[[138, cy], [170, cy]]} kind="power" />
    <Lbl x={154} y={cy - 6} anchor="middle" muted size={9}>DC</Lbl>
    <Equip a={a} x={170} y={cy - 28} w={56} h={56}><Inverter x={170} y={cy - 28} on={on} /></Equip>
    <Val a={a} t="ac_power" x={244} y={cy - 46} w={108} label="AC power" dec={2} />
    <Val a={a} t="dc_power" x={360} y={cy - 46} w={108} label="DC power" dec={2} />
    <Val a={a} t="igbt_temp" x={244} y={cy + 10} w={108} label="IGBT temp" />
    <Val a={a} t="efficiency" x={360} y={cy + 10} w={108} label="Efficiency" dec={2} />
    <Pipe pts={[[226, cy], [ic[0], cy], ...(ic[1] !== cy ? [[ic[0], ic[1]]] : [])]} kind="power" />
  </g>;
}
function Idt({ a, x, cy }) {
  const tr = <Transformer x={x + 15} y={cy} r={13} vertical={false} />;
  return <g>
    {a ? <Equip a={a} x={x} y={cy - 18} w={52} h={36}>{tr}</Equip> : <g opacity=".75">{tr}</g>}
    <Lbl x={x + 26} y={cy + 32} anchor="middle" muted size={9.5}>IDT 0.8/33 kV</Lbl>
  </g>;
}

function SolarSld({ c }) {
  const rows = [['BH-INV-01', 100], ['BH-INV-02', 210], ['BH-INV-03', 320], ['BH-INV-04', 470]];
  const bus = 772;
  const icr = [[155, null, 'ICR-01 · 6.6 MVA'], [320, 'BH-IDT-03', null], [470, null, 'ICR-04 · 6.6 MVA']];
  const trkSet = useLive('BH-TRK-07', 'angle', c).v;
  const trkErr = useLive('BH-TRK-07', 'tracking_error', c).v;
  return (
    <Mimic c={c} w={1280} h={720}>
      <Title x={24} y={30}>Bhadla solar park · 300 MWp · single-line</Title>
      <Zone x={20} y={44} w={712} h={340} label="Block A · 150 MWp" />
      <Zone x={20} y={396} w={712} h={312} label="Block B · 150 MWp" />
      {rows.map(([a, cy], i) => <InvRow key={a} a={a} cy={cy} ic={i < 2 ? [490, 155] : [490, cy]} />)}
      {/* inverter-duty transformers and 33 kV incomers */}
      {icr.map(([cy, a, lbl]) => <g key={cy}>
        <Idt a={a} x={490} cy={cy} />{!a && <Lbl x={516} y={cy - 24} anchor="middle" muted size={9.5}>{lbl}</Lbl>}
        <Pipe pts={[[532, cy], [bus, cy]]} kind="power" />
        <Breaker x={752} y={cy} />
      </g>)}
      <Val a="BH-IDT-03" t="load" x={566} y={274} w={92} label="IDT load" />
      <Val a="BH-IDT-03" t="oil_temp" x={664} y={274} w={92} label="Top oil" />
      <Val a="BH-IDT-03" t="winding_temp" x={566} y={330} w={92} label="Winding HS" />
      <Lbl x={566} y={186} muted size={9.5}>ICR-01, ICR-04: no IDT telemetry</Lbl>
      {/* 33 kV collection bus */}
      <VBus x={bus} y1={80} y2={494} />
      <text x={790} y={380} transform="rotate(-90 790 380)" textAnchor="middle" className="m-sub">33 kV collection bus</text>
      {/* to pooling transformer */}
      <Pipe pts={[[bus, 260], [880, 260]]} kind="power" />
      <Breaker x={806} y={260} />
      <Equip a="BH-PTR-01" x={870} y={236} w={74} h={48} label="Pooling ICT 315 MVA" sub="33/220 kV">
        <Transformer x={892} y={260} r={20} vertical={false} />
      </Equip>
      <Pipe pts={[[936, 260], [1010, 260]]} kind="hv" />
      <Breaker x={968} y={260} />
      <VBus x={1010} y1={210} y2={320} label="220 kV" hv />
      <Pipe pts={[[1010, 260], [1170, 260]]} kind="hv" />
      <Breaker x={1046} y={260} />
      <Switch x={1078} y={249} len={22} />
      <Tower x={1190} y={200} h={100} />
      <Lbl x={1190} y={322} anchor="middle" muted size={10}>220 kV line to grid</Lbl>
      <Val a="BH-PTR-01" t="export_mw" x={860} y={152} w={120} big label="Export at 220 kV" />
      <Val a="BH-PTR-01" t="pf" x={992} y={152} w={92} label="PF at POI" dec={3} />
      <Val a="BH-PTR-01" t="oil_temp" x={860} y={330} w={108} label="Top oil temp" />
      <Val a="BH-PTR-01" t="winding_temp" x={976} y={330} w={108} label="Winding hot-spot" />
      <MiniTrend a="BH-PTR-01" t="oil_temp" x={860} y={376} w={224} h={30} />
      <Lbl x={860} y={420} muted size={9.5}>Top oil, last 24 h</Lbl>
      {/* weather */}
      <Zone x={790} y={44} w={470} h={92} label="Weather and soiling stations" />
      <Val a="BH-WMS-01" t="poa" x={802} y={66} w={86} label="POA" />
      <Val a="BH-WMS-01" t="ghi" x={894} y={66} w={86} label="GHI" />
      <Val a="BH-WMS-01" t="module_temp" x={986} y={66} w={86} label="Module temp" />
      <Val a="BH-WMS-01" t="ambient_temp" x={1078} y={66} w={86} label="Ambient" />
      <Val a="BH-SMS-01" t="soiling_ratio" x={1170} y={66} w={80} label="Soiling" dec={3} />
      {/* tracker */}
      <Lbl x={40} y={534} bold size={11}>Tracker row controller TRK-07</Lbl>
      <Equip a="BH-TRK-07" x={40} y={548} w={128} h={128} noId><TrackerView x={104} y={600} angle={trkSet} set={trkSet != null && trkErr != null ? trkSet - trkErr : null} /></Equip>
      <Lbl x={104} y={696} anchor="middle" muted size={9.5}>solid = actual · dashed = set</Lbl>
      <Val a="BH-TRK-07" t="angle" x={196} y={560} w={110} label="Tracker angle" dec={1} />
      <Val a="BH-TRK-07" t="tracking_error" x={196} y={604} w={110} label="Error vs set angle" dec={1} />
      <Val a="BH-TRK-07" t="motor_current" x={316} y={560} w={110} label="Slew motor" dec={2} />
      <MiniTrend a="BH-TRK-07" t="angle" x={316} y={606} w={110} h={34} />
      <Lbl x={316} y={656} muted size={9.5}>Angle, last 24 h</Lbl>
      {/* inverter alarm focus */}
      <Zone x={790} y={448} w={470} h={260} label="BH-INV-03 · IGBT temperature" />
      <BarInd a="BH-INV-03" t="igbt_temp" x={812} y={484} h={150} label="IGBT" max={100} />
      <MiniTrend a="BH-INV-03" t="igbt_temp" x={856} y={484} w={250} h={70} />
      <Lbl x={856} y={570} muted size={9.5}>IGBT module temperature, last 24 h (limit 85 °C)</Lbl>
      <MiniTrend a="BH-INV-03" t="efficiency" x={856} y={584} w={250} h={50} />
      <Lbl x={856} y={650} muted size={9.5}>Conversion efficiency, last 24 h</Lbl>
      <Val a="BH-INV-03" t="igbt_temp" x={1120} y={484} w={124} big label="IGBT temp" />
      <Val a="BH-INV-03" t="efficiency" x={1120} y={540} w={124} label="Efficiency" dec={2} />
      <Val a="BH-INV-01" t="igbt_temp" x={1120} y={584} w={124} label="INV-01 IGBT (ref.)" />
    </Mimic>
  );
}

export default { 'solar-portfolio': SolarPortfolio, 'solar-sld': SolarSld };
