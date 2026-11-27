/* Auto components (Northstar Drive Components, Hosur): CNC gear hobber twin (HB-04) and heat treatment line
   (mesh belt furnace MBF-01, induction hardening IH-02). */
import React from 'react';
import { Mimic, Equip, Val, Pipe, Box, Conveyor, Motor, Pump, Transformer, Capacitor, Lamp, MiniTrend, Gauge, BarInd, Lbl, Title, Zone, useLive, useMimic } from './kit.jsx';

/* ---------------- local helpers ---------------- */
const wrap = (s = '', n = 60) => s.split(' ').reduce((ls, w) => { const l = ls[ls.length - 1]; if (l && (l + ' ' + w).length <= n) ls[ls.length - 1] = l + ' ' + w; else ls.push(w); return ls; }, []);
const evOf = (c, a) => (c.demo.events || []).find(e => e.asset === a && e.title);
/** Clickable group (no ring) for parts of an asset that already has an Equip ring elsewhere. */
function Part({ a, children }) { const m = useMimic(); return <g className="m-eq" onClick={e => { e.stopPropagation(); m.select(a); }} role="button">{children}</g>; }
/** Box that looks like a Val but shows a value derived from real tags. */
function Calc({ x, y, w = 110, label, v, unit, st = 'good', a }) {
  const m = useMimic();
  return <g className={`m-val ${st}`} onClick={e => { e.stopPropagation(); a && m.select(a); }} role="button">
    <rect x={x} y={y} width={w} height={36} rx="4" /><text x={x + 7} y={y + 12} className="m-val-l">{label}</text>
    <text x={x + 7} y={y + 29} className="m-val-v" key={m.tick}>{v == null || isNaN(v) ? '—' : v.toFixed(1)}<tspan className="m-val-u"> {unit}</tspan></text></g>;
}
/** Hob seen along its axis: toothed disc, spinning. */
function Hob({ x, y, r = 30, on }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <g className="m-spin" style={{ transformOrigin: `${x}px ${y}px`, animationDuration: '1.6s' }}>
      {Array.from({ length: 14 }).map((_, i) => <rect key={i} x={x - 3.5} y={y - r - 5} width={7} height={8} rx="1" className="m-body" transform={`rotate(${i * (360 / 14)} ${x} ${y})`} />)}
      <circle cx={x} cy={y} r={r} fill="url(#m-metal)" /><circle cx={x} cy={y} r={r} className="m-edge" />
      {[0, 60, 120, 180, 240, 300].map(a => <line key={a} x1={x} y1={y - r * 0.45} x2={x} y2={y - r} className="m-glyph" transform={`rotate(${a} ${x} ${y})`} />)}
    </g>
    <circle cx={x} cy={y} r={r * 0.32} className="m-body" /><circle cx={x} cy={y} r={r * 0.32} className="m-edge" /><circle cx={x} cy={y} r={3} className="m-hub" />
  </g>;
}
/** Angular contact bearing symbol (cross-section). */
const Bearing = ({ x, y, r = 9 }) => <g><circle cx={x} cy={y} r={r} className="m-body" /><circle cx={x} cy={y} r={r} className="m-edge" /><circle cx={x} cy={y} r={r * 0.45} className="m-edge" /><line x1={x - r} y1={y - r} x2={x + r} y2={y + r} className="m-glyph" /></g>;
/** Double-headed axis arrow. */
const Axis = ({ x1, y1, x2, y2, l, lx, ly }) => <g><line x1={x1} y1={y1} x2={x2} y2={y2} className="m-edge" markerStart="url(#m-arrow)" markerEnd="url(#m-arrow)" /><text x={lx} y={ly} className="m-label" textAnchor="middle">{l}</text></g>;

/* ---------------- CNC hobber twin ---------------- */
function CncTwin({ c }) {
  const A = 'HB-04';
  const run = useLive(A, 'energy', c).v > 2;
  const ct = useLive(A, 'cycle_time', c);
  const ev = evOf(c, A); const h = c.db.health(A);
  const perf = ct.v ? (ct.def.base / ct.v) * 100 : null;
  const oee = (c.demo.kpis || []).find(k => k.id === 'oee');
  return (
    <Mimic c={c} w={1280} h={700} note="Axis positions are not tagged; the arrows show the machine axes.">
      <Title x={24} y={30}>CNC gear hobber HB-04 · Sprocket Line 2</Title>
      <Zone x={30} y={44} w={820} h={640} label="Machine · vertical-work hobbing (X Z A B C)" />

      {/* coolant feed (neat oil) from pump to the nozzle above the hob */}
      <Pipe d="M300 612 H52 V238 H404 V346" kind="oil" w={5} speed={run ? 1 : 0.01} flow={run} />
      <path d="M398 346 h12 l-6 12 z" className="m-body" /><path d="M398 346 h12 l-6 12 z" className="m-edge" />

      <Part a={A}>
        {/* bed with feet */}
        <rect x={70} y={520} width={620} height={50} rx="4" fill="url(#m-metal)" /><rect x={70} y={520} width={620} height={50} rx="4" className="m-edge" />
        <line x1={80} y1={527} x2={680} y2={527} className="m-glyph" />
        {[90, 340, 630].map(x => <rect key={x} x={x} y={570} width={40} height={10} className="m-body" />)}
        {/* main column (moves on X), Z slideways and servo */}
        <path d="M100 520 V140 Q100 112 128 112 H206 Q230 112 230 140 V520 Z" fill="url(#m-metal)" /><path d="M100 520 V140 Q100 112 128 112 H206 Q230 112 230 140 V520 Z" className="m-edge" />
        <line x1={224} y1={130} x2={224} y2={512} className="m-glyph" /><line x1={212} y1={130} x2={212} y2={512} className="m-glyph" strokeDasharray="3 4" />
        <rect x={146} y={84} width={44} height={28} rx="3" className="m-body" /><rect x={146} y={84} width={44} height={28} rx="3" className="m-edge" /><text x={168} y={102} textAnchor="middle" className="m-inner">Z</text>
        <Lbl x={165} y={480} anchor="middle" size={10} muted>Column</Lbl>
        {/* work table (C) with arbor and sprocket blank */}
        <rect x={461} y={336} width={12} height={116} className="m-body" /><rect x={461} y={336} width={12} height={116} className="m-edge" />
        <rect x={410} y={450} width={114} height={22} rx="3" fill="url(#m-metal)" /><rect x={410} y={450} width={114} height={22} rx="3" className="m-edge" />
        <path d="M400 520 L412 472 H522 L534 520 Z" className="m-body" /><path d="M400 520 L412 472 H522 L534 520 Z" className="m-edge" />
        <rect x={427} y={381} width={80} height={18} rx="1" fill="url(#m-metal)" /><rect x={427} y={381} width={80} height={18} rx="1" className="m-edge" />
        {Array.from({ length: 11 }).map((_, i) => <line key={i} x1={431 + i * 7} y1={382} x2={431 + i * 7} y2={398} className="m-glyph" />)}
        <Lbl x={467} y={500} anchor="middle" size={10} muted>Table C</Lbl>
        {/* counter column and tailstock */}
        <rect x={580} y={140} width={70} height={380} rx="4" fill="url(#m-metal)" /><rect x={580} y={140} width={70} height={380} rx="4" className="m-edge" />
        <rect x={455} y={300} width={125} height={24} rx="3" className="m-body" /><rect x={455} y={300} width={125} height={24} rx="3" className="m-edge" />
        <path d="M458 324 H476 L467 338 Z" className="m-body" /><path d="M458 324 H476 L467 338 Z" className="m-edge" />
        <Lbl x={615} y={130} anchor="middle" size={10} muted>Counter column</Lbl>
        <Lbl x={518} y={292} anchor="middle" size={10} muted>Tailstock</Lbl>
      </Part>

      {/* hob head on the column: swivel (A), spindle motor, hob (B), front spindle bearing */}
      <Equip a={A} x={230} y={262} w={210} h={190} noId>
        <rect x={250} y={262} width={84} height={36} rx="4" className="m-body" /><rect x={250} y={262} width={84} height={36} rx="4" className="m-edge" />
        {[262, 272, 282, 292, 302, 312, 322].map(x => <line key={x} x1={x} y1={266} x2={x} y2={294} className="m-glyph" />)}
        <text x={292} y={256} textAnchor="middle" className="m-sub">Spindle motor</text>
        <rect x={230} y={298} width={120} height={152} rx="6" fill="url(#m-metal)" /><rect x={230} y={298} width={120} height={152} rx="6" className="m-edge" />
        <circle cx={292} cy={374} r={52} className="m-body" /><circle cx={292} cy={374} r={52} className="m-edge" />
        {Array.from({ length: 24 }).map((_, i) => <line key={i} x1={292} y1={322} x2={292} y2={328} className="m-glyph" transform={`rotate(${i * 15} 292 374)`} />)}
        <path d="M292 374 L392 382 L392 398 L292 392 Z" className="m-body" transform="rotate(-6 292 374)" /><path d="M292 374 L392 382 L392 398 L292 392 Z" className="m-edge" transform="rotate(-6 292 374)" />
        <Bearing x={360} y={381} />
        <Hob x={396} y={390} r={28} on={run} />
        <text x={262} y={442} textAnchor="middle" className="m-sub">A swivel</text>
      </Equip>
      <Lbl x={300} y={474} anchor="middle" size={11} bold>Hob head · spindle B</Lbl>
      <Lbl x={418} y={430} size={10} muted>Hob</Lbl>

      {/* axes */}
      <Axis x1={84} y1={160} x2={84} y2={480} l="Z" lx={72} ly={324} />
      <Axis x1={120} y1={548} x2={240} y2={548} l="X" lx={180} ly={542} />
      <path d="M440 466 A30 8 0 1 0 494 466" className="m-edge" markerEnd="url(#m-arrow)" /><text x={540} y={468} className="m-label">C</text>
      <path d="M396 352 A40 40 0 0 1 436 392" className="m-edge" markerEnd="url(#m-arrow)" /><text x={440} y={364} className="m-label">B</text>

      {/* coolant tank, pump, chip conveyor */}
      <Part a={A}>
        <rect x={80} y={596} width={210} height={58} rx="4" className="m-body" />
        <rect x={82} y={614} width={206} height={38} fill="url(#m-liquid)" opacity=".55" />
        <rect x={80} y={596} width={210} height={58} rx="4" className="m-edge" />
        <Pump x={316} y={622} r={14} on={run} />
        <Conveyor x={470} y={596} len={230} on={run} />
        <Conveyor x={700} y={596} len={110} angle={-35} on={run} />
        <path d="M768 520 H846 L834 584 H780 Z" className="m-body" /><path d="M768 520 H846 L834 584 H780 Z" className="m-edge" />
      </Part>
      <Lbl x={185} y={672} anchor="middle" size={11} bold>Coolant tank · neat cutting oil</Lbl>
      <Lbl x={585} y={624} anchor="middle" size={11} bold>Chip conveyor</Lbl>
      <Lbl x={807} y={600} anchor="middle" size={10} muted>Chip bin</Lbl>
      <Pipe d="M440 570 V590" kind="oil" w={4} flow={run} />

      {/* control cabinet */}
      <Part a={A}>
        <rect x={700} y={110} width={120} height={240} rx="4" fill="url(#m-metal)" /><rect x={700} y={110} width={120} height={240} rx="4" className="m-edge" />
        <rect x={714} y={126} width={92} height={60} rx="3" className="m-mini-bg" />
        <path d="M720 170 l12 -8 l12 4 l12 -14 l12 6 l12 -10 l12 2" className="m-glyph" />
        <line x1={760} y1={200} x2={760} y2={340} className="m-edge" />
        <Lamp a={A} x={724} y={214} r={6} />
      </Part>
      <Lbl x={760} y={368} anchor="middle" size={11} bold>CNC control cabinet</Lbl>
      <Pipe d="M700 300 H650" kind="power" />

      <Val a={A} t="spindle_vibration" x={250} y={128} w={170} label="Spindle vibration (front bearing)" big />
      <Val a={A} t="bearing_temp" x={250} y={182} w={170} label="Spindle bearing temp" />
      <Val a={A} t="cycle_time" x={462} y={182} w={110} label="Cycle time" />

      {/* condition panel */}
      <Zone x={870} y={44} w={390} h={300} label="Spindle condition" />
      <Val a={A} t="spindle_vibration" x={886} y={70} w={170} big label="Vibration velocity RMS" />
      <Val a={A} t="bearing_temp" x={886} y={126} w={170} big label="Bearing temperature" />
      <Gauge a={A} t="spindle_vibration" x={1168} y={124} r={42} min={0} max={6} label="ISO 10816 · mm/s" />
      <BarInd a={A} t="bearing_temp" x={1232} y={64} h={86} label="°C" min={20} max={80} />
      <Lbl x={886} y={204} size={10} muted>Spindle vibration · last 24 h</Lbl>
      <MiniTrend a={A} t="spindle_vibration" x={886} y={210} w={358} h={46} />
      {ev && <>
        <Lbl x={886} y={276} size={11} bold>{ev.diagnosis.title}</Lbl>
        {wrap(ev.diagnosis.reco, 64).slice(0, 2).map((l, i) => <Lbl key={i} x={886} y={294 + i * 15} size={10.5}>{l}</Lbl>)}
        <Lbl x={886} y={330} size={10} muted>{`Health ${h.health} · about ${h.rulDays} d of life left`}</Lbl>
      </>}

      {/* production strip */}
      <Zone x={870} y={360} w={390} h={170} label="Status and OEE" />
      <Lamp a={A} x={892} y={396} r={6} /><Lbl x={904} y={400} size={11} bold>{run ? 'Running · auto cycle' : 'Stopped'}</Lbl>
      <Val a={A} t="cycle_time" x={886} y={414} w={116} />
      <Val a={A} t="energy" x={1010} y={414} w={110} label="Energy (hour)" />
      <Calc a={A} x={1128} y={414} w={116} label="Performance (cycle)" v={perf} unit="%" st={perf != null && perf < 90 ? 'warn' : 'good'} />
      {oee && <Lbl x={886} y={476} size={10.5}>{`Plant OEE ${oee.cur} % · target ${oee.target} %`}</Lbl>}
      <Lbl x={886} y={494} size={10} muted>Performance = standard cycle ÷ actual cycle time</Lbl>
      <Lbl x={886} y={512} size={10} muted>Feed-rate cut of 8 % advised until the bearing change</Lbl>

      {/* sister machines */}
      <Zone x={870} y={546} w={390} h={138} label="Other hobbers" />
      {['HB-01', 'HB-02', 'HB-03'].map((id, i) => { const x = 886 + i * 124; return <g key={id}>
        <Lamp a={id} x={x + 6} y={580} r={5} /><Lbl x={x + 16} y={584} size={11} bold>{id}</Lbl>
        <Val a={id} t="spindle_vibration" x={x} y={592} w={112} label="Spindle vib." />
        <Val a={id} t="bearing_temp" x={x} y={634} w={112} label="Bearing temp" />
      </g>; })}
    </Mimic>
  );
}

/* ---------------- heat treatment line ---------------- */
/** Mesh belt furnace: insulated casing, hot chamber, radiant U-tubes per zone, belt through it. */
function BeltFurnace({ x, y, w, h, zones = 4, on }) {
  const zw = (w - 24) / zones;
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <rect x={x} y={y} width={w} height={h} rx="6" fill="url(#m-metal)" /><rect x={x} y={y} width={w} height={h} rx="6" className="m-edge" />
    <rect x={x + 12} y={y + 16} width={w - 24} height={h - 40} fill="url(#m-hot)" opacity=".38" /><rect x={x + 12} y={y + 16} width={w - 24} height={h - 40} className="m-edge" />
    {Array.from({ length: zones }).map((_, i) => { const zx = x + 12 + i * zw; return <g key={i}>
      {i > 0 && <line x1={zx} y1={y + 16} x2={zx} y2={y + h - 24} className="m-glyph" strokeDasharray="4 3" />}
      {[0.3, 0.7].map(f => <path key={f} d={`M${zx + zw * f - 6} ${y + 2} V${y + 50} Q${zx + zw * f - 6} ${y + 58} ${zx + zw * f} ${y + 58} Q${zx + zw * f + 6} ${y + 58} ${zx + zw * f + 6} ${y + 50} V${y + 2}`} className="m-glyph" />)}
      <text x={zx + zw / 2} y={y + 78} textAnchor="middle" className="m-inner">Zone {i + 1}</text>
    </g>; })}
    {[x + 30, x + w / 2, x + w - 40].map(lx => <rect key={lx} x={lx} y={y + h} width={10} height={14} className="m-body" />)}
  </g>;
}

function HtLine({ c }) {
  const runF = useLive('MBF-01', 'belt_current', c).v > 1;
  const runI = useLive('IH-02', 'coil_power', c).v > 20;
  const ev = evOf(c, 'IH-02');
  return (
    <Mimic c={c} w={1280} h={700}>
      <Title x={24} y={30}>Heat treatment · mesh belt hardening line and induction cell</Title>
      <Zone x={30} y={44} w={1220} h={322} label="Mesh belt hardening line · MBF-01" />
      <Pipe d="M60 96 H230 V120" kind="gas" w={4} /><Lbl x={60} y={88} size={10} muted>Endo gas + enrichment</Lbl>

      {/* pre-wash and loading */}
      <Box x={50} y={176} w={80} h={56} title="Pre-wash" />
      <Lbl x={90} y={250} anchor="middle" size={10} muted>Load · wash</Lbl>
      <Conveyor x={130} y={214} len={540} on={runF} />
      <Equip a="MBF-01" x={170} y={120} w={470} h={140} label="Mesh belt hardening furnace" sub="4 zones · radiant tubes · carburising atmosphere">
        <BeltFurnace x={170} y={120} w={470} h={120} on={runF} />
        <Conveyor x={626} y={256} len={440} on={runF} angle={180} />
      </Equip>
      <Val a="MBF-01" t="zone_temp" x={392} y={64} w={116} label="Zone 3 temp (control)" />
      <Val a="MBF-01" t="carbon_potential" x={516} y={64} w={116} label="Carbon potential" />
      <line x1={608} y1={300} x2={626} y2={256} className="m-glyph" strokeDasharray="3 2" /><Motor x={608} y={300} r={14} on={runF} />
      <Lbl x={600} y={330} anchor="middle" size={10} muted>Belt drive</Lbl>
      <Val a="MBF-01" t="belt_current" x={170} y={304} w={140} label="Belt drive current" />
      <Val a="MBF-01" t="energy" x={318} y={304} w={110} label="Energy (hour)" />

      {/* quench, elevator, washer, tempering */}
      <Pipe d="M666 214 L700 262" kind="material" w={5} />
      <rect x={680} y={262} width={120} height={74} rx="4" className="m-body" /><rect x={682} y={280} width={116} height={54} fill="url(#m-liquid)" opacity=".5" /><rect x={680} y={262} width={120} height={74} rx="4" className="m-edge" />
      <Lbl x={740} y={354} anchor="middle" size={11} bold>Oil quench</Lbl>
      <Conveyor x={770} y={316} len={110} angle={-48} on={runF} />
      <Box x={856} y={176} w={90} h={56} title="Post-wash" />
      {[874, 892, 910, 928].map(sx => <path key={sx} d={`M${sx} 182 l-4 8 h8 z`} className="m-glyph" />)}
      <Conveyor x={946} y={214} len={34} on={runF} />
      <rect x={980} y={160} width={180} height={80} rx="6" fill="url(#m-metal)" /><rect x={992} y={172} width={156} height={50} fill="url(#m-hot)" opacity=".18" /><rect x={980} y={160} width={180} height={80} rx="6" className="m-edge" />
      <Conveyor x={980} y={214} len={250} on={runF} />
      <Lbl x={1070} y={258} anchor="middle" size={11} bold>Tempering furnace</Lbl>
      <Lbl x={1196} y={196} anchor="middle" size={10} muted>Unload</Lbl>
      <Lbl x={1070} y={274} anchor="middle" size={10} muted>quench → wash → temper</Lbl>

      {/* induction cell */}
      <Zone x={30} y={382} w={1220} h={304} label="Induction hardening cell · IH-02" />
      <Part a="IH-02">
        <rect x={60} y={430} width={110} height={150} rx="4" fill="url(#m-metal)" /><rect x={60} y={430} width={110} height={150} rx="4" className="m-edge" />
        <line x1={115} y1={436} x2={115} y2={574} className="m-glyph" />
        <rect x={72} y={444} width={32} height={20} rx="2" className="m-mini-bg" />
        {[0, 1, 2, 3].map(i => <line key={i} x1={126} y1={450 + i * 12} x2={160} y2={450 + i * 12} className="m-glyph" />)}
      </Part>
      <Lbl x={115} y={596} anchor="middle" size={11} bold>MF power supply</Lbl><Lbl x={115} y={609} anchor="middle" size={10} muted>IGBT inverter</Lbl>
      <Pipe d="M170 480 H214" kind="power" speed={runI ? 1 : 0.01} flow={runI} />
      <Part a="IH-02">
        <rect x={214} y={440} width={110} height={110} rx="4" className="m-body" /><rect x={214} y={440} width={110} height={110} rx="4" className="m-edge" />
        <Transformer x={248} y={470} r={13} />
        <Capacitor x={294} y={478} /><Capacitor x={294} y={500} />
      </Part>
      <Lbl x={269} y={566} anchor="middle" size={11} bold>Heat station</Lbl><Lbl x={269} y={579} anchor="middle" size={10} muted>transformer + capacitors</Lbl>
      <Pipe d="M324 492 H364 V500" kind="power" speed={runI ? 1 : 0.01} flow={runI} />
      {/* spindle, sprocket, coil and quench ring */}
      <Equip a="IH-02" x={350} y={420} w={140} h={180}>
        <rect x={415} y={430} width={10} height={160} className="m-body" /><rect x={415} y={430} width={10} height={160} className="m-edge" />
        <rect x={380} y={500} width={80} height={16} rx="2" fill={runI ? 'url(#m-hot)' : 'url(#m-metal)'} /><rect x={380} y={500} width={80} height={16} rx="2" className="m-edge" />
        {[364, 466].map(cx => <g key={cx}><rect x={cx} y={494} width={10} height={10} className="m-body" /><rect x={cx} y={510} width={10} height={10} className="m-body" /><rect x={cx} y={494} width={10} height={26} className="m-edge" /></g>)}
        {[360, 468].map(cx => <rect key={cx} x={cx} y={530} width={14} height={10} rx="2" className="m-body" />)}
        {[360, 468].map(cx => <rect key={cx + 1} x={cx} y={530} width={14} height={10} rx="2" className="m-edge" />)}
        <path d="M374 534 L392 518 M374 538 L396 524 M468 534 L450 518 M468 538 L446 524" className="m-glyph" strokeDasharray="2 3" />
        <rect x={392} y={590} width={56} height={10} className="m-body" /><rect x={392} y={590} width={56} height={10} className="m-edge" />
      </Equip>
      <Lbl x={420} y={618} anchor="middle" size={11} bold>Coil · quench ring · sprocket</Lbl>
      <Lbl x={492} y={498} size={10} muted>Coil</Lbl><Lbl x={492} y={540} size={10} muted>Spray</Lbl>

      {/* quench water loop */}
      <Pipe d="M448 600 H520 V560 H560" kind="water" w={4} flow={runI} />
      <Part a="IH-02">
        <rect x={560} y={540} width={150} height={80} rx="4" className="m-body" /><rect x={562} y={556} width={146} height={62} fill="url(#m-liquid)" opacity=".5" /><rect x={560} y={540} width={150} height={80} rx="4" className="m-edge" />
      </Part>
      <Lbl x={635} y={636} anchor="middle" size={11} bold>Quench tank</Lbl>
      <Pipe d="M710 604 H726" kind="water" w={5} flow={runI} />
      <Pump x={740} y={604} r={14} on={runI} />
      <Pipe d="M750 590 V562 H806" kind="water" w={5} flow={runI} />
      <g className="m-shape"><path d="M806 552 H836 V572 H806 Z" className="m-body" /><path d="M816 572 L830 592 H840 L826 572" className="m-body" /><path d="M806 552 H836 V572 H806 Z M816 572 L830 592 H840 L826 572" className="m-edge" />
        <path d="M818 576 L832 590" className="m-glyph" strokeDasharray="1 2" /></g>
      <Lbl x={822} y={612} anchor="middle" size={10} muted>Strainer</Lbl>
      <Pipe d="M836 562 H886" kind="water" w={5} flow={runI} />
      <circle cx={900} cy={562} r={14} className="m-body" /><circle cx={900} cy={562} r={14} className="m-edge" /><text x={900} y={566} textAnchor="middle" className="m-inner">FT</text>
      <Pipe d="M914 562 H922 V456 H482 V530" kind="water" w={5} flow={runI} speed={0.8} />
      <Val a="IH-02" t="quench_flow" x={936} y={474} w={150} big label="Quench water flow" />
      <Lbl x={936} y={538} size={10} muted>Quench flow · last 24 h</Lbl>
      <MiniTrend a="IH-02" t="quench_flow" x={936} y={544} w={150} h={40} />
      <Val a="IH-02" t="quench_temp" x={560} y={492} w={120} label="Quench temp" />
      <Val a="IH-02" t="coil_power" x={60} y={622} w={110} label="Coil power" />
      <Val a="IH-02" t="energy" x={178} y={622} w={110} label="Energy (hour)" />
      {ev && <>
        <Lbl x={540} y={660} size={11} bold>{ev.diagnosis.title}</Lbl>
        <Lbl x={540} y={676} size={10.5}>{wrap(ev.diagnosis.reco, 100)[0]}</Lbl>
      </>}

      {/* related assets */}
      <line x1={1100} y1={400} x2={1100} y2={676} className="m-glyph" strokeDasharray="3 4" />
      <Lamp a="IH-01" x={1118} y={414} r={5} /><Lbl x={1128} y={418} size={11} bold>IH-01</Lbl>
      <Val a="IH-01" t="quench_flow" x={1112} y={426} w={126} label="Quench flow" />
      <Val a="IH-01" t="coil_power" x={1112} y={468} w={126} label="Coil power" />
      <Lamp a="VI-01" x={1118} y={524} r={5} /><Lbl x={1128} y={528} size={11} bold>VI-01 vision</Lbl>
      <Val a="VI-01" t="reject_rate" x={1112} y={536} w={126} label="Reject rate" />
      <Lamp a="SQF-01" x={1118} y={592} r={5} /><Lbl x={1128} y={596} size={11} bold>SQF-01</Lbl>
      <Val a="SQF-01" t="zone_temp" x={1112} y={604} w={126} label="Zone temp" />
      <Val a="SQF-01" t="carbon_potential" x={1112} y={646} w={126} label="Carbon potential" />
    </Mimic>
  );
}

export default { 'cnc-twin': CncTwin, 'ht-line': HtLine };
