/* Wind portfolio mimics: farm / feeder layout (L1) and MP-WTG-07 nacelle cut-away (L3). */
import React from 'react';
import { Mimic, Equip, Val, Pipe, Breaker, Bus, Transformer, Lbl, Title, Zone, MiniTrend, BarInd, Gauge, Lamp, useLive, useMimic } from './kit.jsx';

/* ---------------- local shapes ---------------- */
/** Turbine, front view. Rotor turns at the real rotor speed (one turn every 60 / rpm s). cx: tower axis, hy: hub height. */
function Turbine({ cx, hy, on, rpm, R = 24, H = 70 }) {
  const dur = on && rpm > 0.5 ? 60 / rpm : 0;
  return <g className={`m-shape m-wtg ${on ? 'on' : 'off'}`}>
    <path d={`M${cx - 4} ${hy + H} L${cx - 1.8} ${hy + 4} H${cx + 1.8} L${cx + 4} ${hy + H} Z`} className="m-body" />
    <path d={`M${cx - 4} ${hy + H} L${cx - 1.8} ${hy + 4} H${cx + 1.8} L${cx + 4} ${hy + H}`} className="m-edge" />
    <rect x={cx - 6} y={hy - 4} width={12} height={8} rx="2" className="m-body" />
    <g className="m-spin" style={{ transformOrigin: `${cx}px ${hy}px`, animationDuration: `${dur || 1}s`, animationPlayState: dur ? 'running' : 'paused' }}>
      {[0, 120, 240].map(a => <path key={a} d={`M${cx} ${hy} L${cx - 2.6} ${hy - R * 0.25} L${cx - 0.6} ${hy - R} L${cx + 1.4} ${hy - R * 0.3} Z`} transform={`rotate(${a} ${cx} ${hy})`} className="m-wblade" />)}
    </g>
    <circle cx={cx} cy={hy} r="3.2" className="m-hub" />
    <circle cx={cx + 9} cy={hy + H - 6} r="3" className="m-run" />
  </g>;
}
/** Lattice met mast with cup anemometer and vane booms. */
function MetMast({ x, y, h }) {
  const n = 6, st = h / n;
  return <g className="m-shape">
    <path d={`M${x - 6} ${y + h} L${x - 2} ${y} M${x + 6} ${y + h} L${x + 2} ${y}`} className="m-edge" />
    {Array.from({ length: n }).map((_, i) => { const y0 = y + i * st, w0 = 2 + (4 * i) / n, w1 = 2 + (4 * (i + 1)) / n; return <path key={i} d={`M${x - w0} ${y0} L${x + w1} ${y0 + st} M${x + w0} ${y0} L${x - w1} ${y0 + st}`} className="m-edge" opacity=".6" />; })}
    <path d={`M${x} ${y} V${y - 8} M${x - 14} ${y + 4} H${x + 14}`} className="m-edge" />
    <circle cx={x - 14} cy={y + 1} r="2.6" className="m-body" /><circle cx={x - 14} cy={y + 1} r="2.6" className="m-edge" />
    <path d={`M${x + 14} ${y + 4} l6 -4 v8 z`} className="m-hub" />
    <circle cx={x} cy={y - 10} r="2.4" className="m-hub" />
  </g>;
}

/* ---------------- wind farm layout (L1) ---------------- */
const FARMS = [
  { pre: 'MP', name: 'Muppandal · 150 MW', ss: 'MP-SS-01', met: 'MP-MET-01', ssl: '33/110 kV S/S',
    f: [['Feeder 1 · 33 kV · Aralvaimozhi ridge', ['MP-WTG-03', 'MP-WTG-05', 'MP-WTG-07', 'MP-WTG-09']], ['Feeder 2 · 33 kV · Panagudi side', ['MP-WTG-12', 'MP-WTG-14', 'MP-WTG-16']]] },
  { pre: 'JS', name: 'Jaisalmer · 120 MW', ss: 'JS-SS-01', met: 'JS-MET-01', ssl: '33/132 kV S/S',
    f: [['Feeder 1 · 33 kV · Badabagh', ['JS-WTG-01', 'JS-WTG-03', 'JS-WTG-05']], ['Feeder 2 · 33 kV · Amarsagar', ['JS-WTG-08', 'JS-WTG-10', 'JS-WTG-12']]] },
  { pre: 'KT', name: 'Kutch · 100 MW', ss: 'KT-SS-01', met: 'KT-MET-01', ssl: '33/220 kV S/S',
    f: [['Feeder 1 · 33 kV · Naliya', ['KT-WTG-02', 'KT-WTG-04', 'KT-WTG-06', 'KT-WTG-08']], ['Feeder 2 · 33 kV · Jakhau', ['KT-WTG-09', 'KT-WTG-11', 'KT-WTG-13']]] },
];
const ALARM_LBL = { gbx_hss_temp: 'HSS bearing', yaw_misalign: 'yaw error', gen_wind_temp: 'gen winding', pitch_angle: 'pitch', gbx_oil_temp: 'gbx oil' };

function WtgCell({ a, cx, by }) {
  const p = useLive(a, 'active_power'); const r = useLive(a, 'rotor_rpm');
  const on = (p.v || 0) > 20 && (r.v || 0) > 1;
  const hy = by + 62;
  return <g>
    <Equip a={a} x={cx - 26} y={hy - 26} w={52} h={96}><Turbine cx={cx} hy={hy} on={on} rpm={r.v || 0} /></Equip>
    <Val a={a} t="active_power" x={cx - 50} y={by + 140} w={100} label="Power" />
    <Val a={a} t="wind_speed" x={cx - 50} y={by + 178} w={100} label="Wind" dec={1} />
  </g>;
}

function FarmBand({ f, by }) {
  const m = useMimic();
  const cab = by + 132;
  const x1 = f.f[0][1].map((_, i) => 94 + i * 108);
  const x2 = f.f[1][1].map((_, i) => 766 + i * 108);
  const alarms = (m.c.demo.events || []).filter(e => e.severity && e.asset.startsWith(f.pre + '-WTG'));
  return <g>
    <Zone x={20} y={by} w={1240} h={224} label={f.name} />
    <Lbl x={232} y={by + 16} muted size={10}>{f.f[0][0]}</Lbl>
    <Lbl x={716} y={by + 16} muted size={10}>{f.f[1][0]}</Lbl>
    {/* 33 kV feeder cables: turbines stand on their feeder, both feeders run into the substation bus */}
    <Pipe pts={[[x1[0], cab], [486, cab]]} kind="power" />
    <Pipe pts={[[x2[x2.length - 1], cab], [566, cab]]} kind="power" />
    {f.f[0][1].map((a, i) => <WtgCell key={a} a={a} cx={x1[i]} by={by} />)}
    {f.f[1][1].map((a, i) => <WtgCell key={a} a={a} cx={x2[i]} by={by} />)}
    {/* pooling substation */}
    <Lbl x={496} y={by + 34} size={10} bold>{f.ssl}</Lbl>
    <text x={496} y={by + 48} className="m-id">{f.ss}</text>
    <Breaker x={486} y={cab} /><Breaker x={566} y={cab} />
    <Bus x1={496} x2={556} y={cab} a={f.ss} />
    <Pipe pts={[[526, cab], [526, by + 114]]} kind="power" />
    <Equip a={f.ss} x={512} y={by + 70} w={28} h={46} noId><Transformer x={526} y={by + 80} r={10} /></Equip>
    <Pipe pts={[[526, by + 70], [526, by + 58]]} kind="hv" />
    <path d={`M${520} ${by + 62} L${526} ${by + 54} L${532} ${by + 62}`} className="m-edge" />
    <Val a={f.ss} t="export_mw" x={580} y={by + 30} w={112} big label="Export (ABT)" />
    <Val a={f.ss} t="grid_freq" x={580} y={by + 82} w={112} label="Grid frequency" dec={2} />
    <Val a={f.ss} t="xfmr_oil_temp" x={580} y={by + 142} w={112} label="Transformer oil" />
    {/* met mast */}
    <Equip a={f.met} x={1048} y={by + 38} w={24} h={94} noId><MetMast x={1060} y={by + 44} h={88} /></Equip>
    <text x={1060} y={by + 150} textAnchor="middle" className="m-id">{f.met}</text>
    <Val a={f.met} t="hub_wind" x={1090} y={by + 26} w={156} label="Met mast · hub-height wind" dec={1} />
    <Val a={f.met} t="wind_dir" x={1090} y={by + 66} w={66} label="Direction" dec={0} />
    <Val a={f.met} t="air_density" x={1162} y={by + 66} w={84} label="Air density" dec={3} />
    {/* alarm tags of turbines in this farm */}
    {alarms.slice(0, 2).map((e, i) => <Val key={e.id} a={e.asset} t={e.tag} x={i === 0 ? 580 : 1090} y={i === 0 ? by + 182 : by + 116} w={i === 0 ? 112 : 156} label={`${e.asset.slice(3)} ${ALARM_LBL[e.tag] || e.tag}`} />)}
  </g>;
}

function WindFarm({ c }) {
  return (
    <Mimic c={c} w={1280} h={730}>
      <Title x={24} y={30}>Pavan wind portfolio · 3 farms · 33 kV feeders</Title>
      <Lbl x={1256} y={30} anchor="end" muted size={10}>Rotors turn at measured rotor speed · stopped turbines are hollow</Lbl>
      {FARMS.map((f, i) => <FarmBand key={f.pre} f={f} by={40 + i * 230} />)}
    </Mimic>
  );
}

/* ---------------- nacelle cut-away (L3) ---------------- */
const A = 'MP-WTG-07';
const GEAR = 95; // gearbox ratio used for the calculated generator speed

/** Clickable part of the turbine (selects the asset, no alarm ring: the ring is kept for the gearbox). */
function Part({ children }) { const m = useMimic(); return <g className="m-eq" onClick={e => { e.stopPropagation(); m.select(A); }} role="button">{children}</g>; }
/** Numbered callout. */
const Call = ({ x, y, n }) => <g><circle cx={x} cy={y} r="8" className="m-val-r" fill="var(--bg)" stroke="var(--m-edge)" strokeWidth="1" /><text x={x} y={y + 3.5} textAnchor="middle" className="m-inner" style={{ fontSize: 9.5 }}>{n}</text></g>;
/** Dashed leader line from a value box to the part. */
const Lead = ({ pts }) => <path d={'M' + pts.map(p => p.join(' ')).join(' L')} className="m-edge" strokeDasharray="3 3" opacity=".6" />;
/** Blade section (airfoil) turned by the pitch angle. */
function Airfoil({ x, y, pitch }) {
  const p = Math.max(-5, Math.min(95, pitch || 0));
  return <g className="m-shape">
    <line x1={x} y1={y - 44} x2={x} y2={y + 44} className="m-edge" strokeDasharray="2 4" opacity=".6" />
    <path d={`M${x - 92} ${y} H${x - 62}`} className="m-edge" markerEnd="url(#m-arrow)" />
    <text x={x - 92} y={y - 6} className="m-sub">wind</text>
    <g transform={`rotate(${p} ${x} ${y})`}>
      <path d={`M${x - 48} ${y} C${x - 46} ${y - 13} ${x - 14} ${y - 15} ${x + 52} ${y - 1} C${x - 10} ${y + 6} ${x - 44} ${y + 9} ${x - 48} ${y} Z`} className="m-body" />
      <path d={`M${x - 48} ${y} C${x - 46} ${y - 13} ${x - 14} ${y - 15} ${x + 52} ${y - 1} C${x - 10} ${y + 6} ${x - 44} ${y + 9} ${x - 48} ${y} Z`} className="m-edge" />
      <line x1={x - 48} y1={y} x2={x + 52} y2={y - 1} className="m-glyph" strokeDasharray="3 3" opacity=".5" />
    </g>
  </g>;
}
/** Side-view blade from the root, cut with a break line. dir -1 up, +1 down. */
function Blade({ x, y, dir, len }) {
  const t = y + dir * len;
  const d = `M${x - 10} ${y} C${x - 16} ${y + dir * 40} ${x - 9} ${y + dir * 90} ${x - 6} ${t} L${x + 2} ${t - dir * 6} L${x + 6} ${t + dir * 2} C${x + 10} ${y + dir * 90} ${x + 14} ${y + dir * 40} ${x + 10} ${y} Z`;
  return <g className="m-shape"><path d={d} className="m-wblade" /></g>;
}

function Nacelle({ c }) {
  const rpm = useLive(A, 'rotor_rpm', c).v || 0;
  const pw = useLive(A, 'active_power', c).v || 0;
  const pitch = useLive(A, 'pitch_angle', c).v;
  const hss = useLive(A, 'gbx_hss_temp', c);
  const on = pw > 20 && rpm > 1;
  const ev = (c.demo.events || []).find(e => e.asset === A && e.title);
  const reco = ev?.diagnosis?.reco || '';
  const lines = reco.split(/(?<=\.)\s+/).flatMap(s => { const out = []; let cur = ''; s.split(' ').forEach(w => { if ((cur + ' ' + w).length > 70) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }); if (cur) out.push(cur); return out; }).slice(0, 6);
  const cover = 'M300 236 Q300 206 334 206 H1036 Q1068 206 1068 236 V368 Q1068 398 1036 398 H334 Q300 398 296 370 Z';
  const legend = [
    ['1', 'Blades and pitch system', 'pitch'], ['2', 'Hub and spinner', ''], ['3', 'Main bearing', 'vibration (CMS)'], ['4', 'Main shaft (low speed)', 'rotor speed'],
    ['5', 'Gearbox, 3-stage', 'oil sump temp'], ['6', 'HSS bearing, generator side', 'temp · ALARM'], ['7', 'Disc brake and coupling', ''], ['8', 'Generator (DFIG)', 'winding temp'],
    ['9', 'Converter', 'active power'], ['10', 'Transformer 0.69/33 kV', ''], ['11', 'Cooling unit', ''], ['12', 'Yaw bearing and drives', 'yaw misalignment'], ['13', 'Anemometer and vane', 'wind speed'],
  ];
  return (
    <Mimic c={c} w={1280} h={720}>
      <Title x={24} y={30}>MP-WTG-07 · 2.1 MW · nacelle cut-away</Title>
      <Lbl x={24} y={48} muted size={10.5}>Muppandal · Feeder 1 · 33 kV</Lbl>

      {/* rotor front view (inset) */}
      <Part>
        <circle cx={100} cy={160} r={68} className="m-edge" strokeDasharray="2 4" opacity=".5" />
        <g className={on ? 'on' : 'off'}>
          <g className="m-spin" style={{ transformOrigin: '100px 160px', animationDuration: `${on && rpm > 0.5 ? 60 / rpm : 1}s`, animationPlayState: on ? 'running' : 'paused' }}>
            {[0, 120, 240].map(a => <path key={a} d="M100 160 L95 146 L98.5 94 L103 147 Z" transform={`rotate(${a} 100 160)`} className="m-wblade" />)}
          </g>
        </g>
        <circle cx={100} cy={160} r="7" className="m-body" /><circle cx={100} cy={160} r="7" className="m-edge" />
      </Part>
      <Lbl x={100} y={244} anchor="middle" muted size={9.5}>Rotor, front view (live speed)</Lbl>
      <Val a={A} t="rotor_rpm" x={40} y={254} w={120} label="Rotor speed" dec={1} />

      {/* blade section and pitch */}
      <Part><Airfoil x={110} y={360} pitch={pitch} /></Part>
      <Lbl x={100} y={420} anchor="middle" muted size={9.5}>Blade A section · pitch angle</Lbl>
      <Val a={A} t="pitch_angle" x={40} y={430} w={120} label="Pitch angle (blade A)" dec={1} />

      {/* tower and yaw */}
      <Part>
        <path d="M604 410 L590 720 H690 L676 410 Z" fill="url(#m-metal-h)" className="m-body" />
        <path d="M604 410 L590 720 H690 L676 410 Z" className="m-edge" />
        <rect x={584} y={398} width={112} height={12} rx="2" className="m-body" /><rect x={584} y={398} width={112} height={12} rx="2" className="m-edge" />
        {[608, 664].map(x => <g key={x}><rect x={x} y={412} width={10} height={24} rx="2" className="m-body" /><rect x={x} y={412} width={10} height={24} rx="2" className="m-edge" /><circle cx={x + 5} cy={440} r="4" className="m-body" /><circle cx={x + 5} cy={440} r="4" className="m-edge" /></g>)}
      </Part>
      <Pipe d="M960 384 V392 H640 V720" kind="power" w={3} />
      <Call x={712} y={426} n="12" />
      <Val a={A} t="yaw_misalign" x={726} y={410} w={136} label="Yaw misalignment" dec={1} />

      {/* nacelle cover (cut away) and bedplate */}
      <path d={cover} className="m-body" opacity=".28" />
      <path d={cover} className="m-edge" strokeDasharray="7 4" />
      <rect x={306} y={372} width={460} height={18} rx="2" fill="url(#m-metal)" className="m-body" /><rect x={306} y={372} width={460} height={18} rx="2" className="m-edge" />
      <rect x={766} y={380} width={292} height={10} className="m-body" /><rect x={766} y={380} width={292} height={10} className="m-edge" />

      {/* blades (side view, cut) and hub */}
      <Part>
        <Blade x={252} y={252} dir={-1} len={180} />
        <Blade x={252} y={348} dir={1} len={170} />
        <rect x={238} y={246} width={28} height={10} rx="2" className="m-body" /><rect x={238} y={246} width={28} height={10} rx="2" className="m-edge" />
        <rect x={238} y={344} width={28} height={10} rx="2" className="m-body" /><rect x={238} y={344} width={28} height={10} rx="2" className="m-edge" />
        <path d="M300 250 H262 Q206 256 182 300 Q206 344 262 350 H300 Z" fill="url(#m-metal)" className="m-body" />
        <path d="M300 250 H262 Q206 256 182 300 Q206 344 262 350 H300 Z" className="m-edge" />
        <ellipse cx={256} cy={300} rx={12} ry={18} className="m-body" /><ellipse cx={256} cy={300} rx={12} ry={18} className="m-edge" />
      </Part>
      <Call x={226} y={78} n="1" /><Call x={214} y={300} n="2" />

      {/* main shaft and main bearing */}
      <Part>
        <rect x={296} y={289} width={150} height={22} rx="3" fill="url(#m-metal)" className="m-body" /><rect x={296} y={289} width={150} height={22} rx="3" className="m-edge" />
        <path d="M330 272 H384 V328 H330 Z M322 372 L334 328 H380 L392 372 Z" className="m-body" />
        <path d="M330 272 H384 V328 H330 Z M322 372 L334 328 H380 L392 372 Z" className="m-edge" />
        <circle cx={357} cy={300} r={20} className="m-edge" />
      </Part>
      <Call x={357} y={248} n="3" /><Call x={420} y={278} n="4" />

      {/* gearbox: the asset's alarm ring sits here (HSS bearing) */}
      <Equip a={A} x={446} y={236} w={140} h={136} noId>
        <path d="M446 262 Q446 240 470 240 H556 Q580 240 582 262 V352 Q580 368 560 368 H470 Q446 368 446 350 Z" fill="url(#m-metal)" className="m-body" />
        <path d="M446 262 Q446 240 470 240 H556 Q580 240 582 262 V352 Q580 368 560 368 H470 Q446 368 446 350 Z" className="m-edge" />
        <circle cx={484} cy={300} r={34} className="m-edge" /><circle cx={484} cy={300} r={12} className="m-glyph" />
        {[0, 120, 240].map(a => <circle key={a} cx={484 + 22 * Math.cos((a * Math.PI) / 180)} cy={300 + 22 * Math.sin((a * Math.PI) / 180)} r="8" className="m-glyph" />)}
        <rect x={528} y={280} width={40} height={30} rx="3" className="m-edge" />
        <text x={514} y={360} textAnchor="middle" className="m-inner">Gearbox</text>
        <path d="M456 368 L446 372 M572 368 L582 372" className="m-edge" />
        <circle cx={584} cy={340} r={9} className={`m-lamp ${hss.st}`} />
      </Equip>
      <Call x={514} y={226} n="5" /><Call x={588} y={364} n="6" />

      {/* HSS, brake, coupling */}
      <Part>
        <rect x={586} y={334} width={76} height={12} className="m-body" /><rect x={586} y={334} width={76} height={12} className="m-edge" />
        <rect x={600} y={314} width={8} height={52} rx="1" className="m-body" /><rect x={600} y={314} width={8} height={52} rx="1" className="m-edge" />
        <rect x={596} y={310} width={16} height={10} rx="2" className="m-hub" />
        <rect x={628} y={326} width={22} height={28} rx="3" className="m-body" /><rect x={628} y={326} width={22} height={28} rx="3" className="m-edge" />
      </Part>
      <Call x={639} y={312} n="7" />

      {/* generator */}
      <Part>
        <rect x={662} y={296} width={138} height={76} rx="8" fill="url(#m-metal)" className="m-body" /><rect x={662} y={296} width={138} height={76} rx="8" className="m-edge" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <line key={i} x1={678 + i * 15} y1={300} x2={678 + i * 15} y2={368} className="m-glyph" opacity=".35" />)}
        <text x={731} y={338} textAnchor="middle" className="m-inner">Generator</text>
        <path d="M676 372 L668 380 M786 372 L794 380" className="m-edge" />
      </Part>
      <Call x={731} y={282} n="8" />

      {/* converter, transformer, cooler */}
      <Pipe d="M800 320 H822" kind="power" w={3} />
      <Part>
        <rect x={822} y={232} width={78} height={148} rx="3" fill="url(#m-metal)" className="m-body" /><rect x={822} y={232} width={78} height={148} rx="3" className="m-edge" />
        <line x1={861} y1={236} x2={861} y2={376} className="m-glyph" opacity=".4" />
        <path d="M834 262 h18 M834 268 h18 M870 258 q4 -7 8 0 t8 0" className="m-glyph" />
        <text x={861} y={340} textAnchor="middle" className="m-inner" style={{ fontSize: 10 }}>Converter</text>
      </Part>
      <Call x={861} y={300} n="9" />
      <Pipe d="M900 320 H920" kind="power" w={3} />
      <Part>
        <rect x={920} y={282} width={84} height={98} rx="3" className="m-body" /><rect x={920} y={282} width={84} height={98} rx="3" className="m-edge" />
        <Transformer x={962} y={308} r={14} />
        <text x={962} y={368} textAnchor="middle" className="m-inner" style={{ fontSize: 9.5 }}>0.69/33 kV</text>
      </Part>
      <Call x={1018} y={296} n="10" />
      <Part>
        <rect x={840} y={188} width={150} height={18} rx="2" className="m-body" /><rect x={840} y={188} width={150} height={18} rx="2" className="m-edge" />
        {Array.from({ length: 14 }).map((_, i) => <line key={i} x1={848 + i * 10} y1={190} x2={848 + i * 10} y2={204} className="m-glyph" opacity=".5" />)}
      </Part>
      <Call x={1002} y={192} n="11" />

      {/* anemometer and vane */}
      <Part><MetMast x={1040} y={142} h={64} /></Part>
      <Call x={1018} y={140} n="13" />

      {/* values with leaders */}
      <Lead pts={[[357, 176], [357, 272]]} />
      <Val a={A} t="vibration" x={300} y={140} w={114} label="Main bearing vibration" dec={2} />
      <Lead pts={[[484, 176], [484, 240]]} />
      <Val a={A} t="gbx_oil_temp" x={426} y={140} w={116} label="Gearbox oil sump" />
      <Lead pts={[[620, 142], [620, 250], [584, 330]]} />
      <Val a={A} t="gbx_hss_temp" x={554} y={92} w={150} big label="Gearbox HSS bearing temp" />
      <Lead pts={[[760, 176], [760, 296]]} />
      <Val a={A} t="gen_wind_temp" x={716} y={140} w={110} label="Generator winding" />
      <GenSpeed x={716} y={92} rpm={rpm} />
      <Lead pts={[[900, 142], [900, 188]]} />
      <Val a={A} t="active_power" x={840} y={92} w={130} big label="Active power" />
      <Lead pts={[[1092, 146], [1052, 146]]} />
      <Val a={A} t="wind_speed" x={1092} y={128} w={140} label="Nacelle wind speed" dec={1} />

      {/* callout legend */}
      <Zone x={300} y={458} w={270} h={250} label="Parts" />
      {legend.map(([n, t, v], i) => <g key={n}><Call x={318} y={486 + i * 16.4} n={n} /><text x={332} y={490 + i * 16.4} className="m-text" style={{ fontSize: 10.5 }}>{t}{v && <tspan className="m-sub"> · {v}</tspan>}</text></g>)}

      {/* alarm panel */}
      <Zone x={724} y={458} w={536} h={250} label="HSS bearing · drivetrain condition" />
      <BarInd a={A} t="gbx_hss_temp" x={744} y={488} h={120} label="HSS °C" max={100} />
      <MiniTrend a={A} t="gbx_hss_temp" x={790} y={488} w={200} h={56} />
      <Lbl x={790} y={558} muted size={9.5}>HSS bearing temp, last 24 h (limit 90 °C)</Lbl>
      <MiniTrend a={A} t="vibration" x={790} y={568} w={200} h={40} />
      <Lbl x={790} y={622} muted size={9.5}>Nacelle vibration, last 24 h</Lbl>
      <Gauge a={A} t="vibration" x={1060} y={530} r={32} min={0} max={6} label="Vibration" />
      <Gauge a={A} t="gen_wind_temp" x={1176} y={530} r={32} min={0} max={170} label="Gen winding" />
      {ev && <Lbl x={744} y={644} size={10.5} bold>{ev.title}</Lbl>}
      {lines.slice(0, 3).map((l, i) => <Lbl key={i} x={744} y={660 + i * 14} muted size={10}>{l}</Lbl>)}
    </Mimic>
  );
}
/** Generator speed calculated from rotor speed and the gearbox ratio. */
function GenSpeed({ x, y, rpm }) {
  const m = useMimic();
  return <g className="m-val good" onClick={() => m.select(A)} role="button">
    <rect x={x} y={y} width={110} height={36} rx="4" />
    <text x={x + 7} y={y + 12} className="m-val-l">Gen speed (calc. 1:{GEAR})</text>
    <text x={x + 7} y={y + 29} className="m-val-v">{Math.round(rpm * GEAR).toLocaleString('en-IN')}<tspan className="m-val-u"> rpm</tspan></text>
  </g>;
}

export default { 'wind-farm': WindFarm, nacelle: Nacelle };
