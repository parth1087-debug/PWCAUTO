/* Pipes and fittings (Prince Pipes, Haridwar): PVC-U extrusion line L03 and injection moulding cell B (IMM-14). */
import React from 'react';
import { Mimic, Equip, Val, Pipe, Vessel, Tank, Box, Motor, Fan, Lamp, MiniTrend, Lbl, Title, Zone, useLive, useMimic } from './kit.jsx';

/* ---------------- local helpers ---------------- */
const wrap = (s = '', n = 60) => s.split(' ').reduce((ls, w) => { const l = ls[ls.length - 1]; if (l && (l + ' ' + w).length <= n) ls[ls.length - 1] = l + ' ' + w; else ls.push(w); return ls; }, []);
const evOf = (c, a) => (c.demo.events || []).find(e => e.asset === a && e.title);
/** Clickable group without an alarm ring (for extra parts of an asset). */
function Part({ a, children }) { const m = useMimic(); return <g className="m-eq" onClick={e => { e.stopPropagation(); m.select(a); }} role="button">{children}</g>; }
const R = ({ x, y, w, h, rx = 3, fill, cls = 'm-body', op }) => <><rect x={x} y={y} width={w} height={h} rx={rx} className={fill ? undefined : cls} fill={fill} opacity={op} /><rect x={x} y={y} width={w} height={h} rx={rx} className="m-edge" /></>;
/** Screw flights inside a barrel cut-away, conveying to the right when on (uses the kit's band animation). */
function Screw({ x, y, len, h, on, id }) {
  return <g className={`m-drum ${on ? 'on' : 'off'}`}>
    <clipPath id={id}><rect x={x} y={y} width={len} height={h} /></clipPath>
    <rect x={x} y={y} width={len} height={h} className="m-mini-bg" />
    <g clipPath={`url(#${id})`}>
      <rect x={x} y={y + h * 0.38} width={len} height={h * 0.24} className="m-body" />
      <g className="m-bands">{Array.from({ length: Math.ceil(len / 13) + 3 }).map((_, i) => <line key={i} x1={x - 26 + i * 13} y1={y + 2} x2={x - 18 + i * 13} y2={y + h - 2} className="m-glyph" />)}</g>
    </g>
  </g>;
}

/* ---------------- extrusion line ---------------- */
function ExtrusionLine({ c }) {
  const run = useLive('EXT-L03', 'screw_rpm', c).v > 5;
  const ev = evOf(c, 'EXT-L03'); const h = c.db.health('EXT-L03');
  const PY = 428, PH = 24; // product pipe band
  return (
    <Mimic c={c} w={1280} h={712} note="Only barrel zone 4 is tagged; other zone set points are not in the historian.">
      <Title x={24} y={30}>Extrusion line L03 · PVC-U pressure pipe 90–160 mm</Title>

      {/* compounding */}
      <Zone x={30} y={44} w={450} h={200} label="Compounding · CPD-03" />
      <Equip a="CPD-03" x={60} y={110} w={180} h={104} label="Hot mixer → cooler">
        <Vessel x={60} y={110} w={64} h={70} agitator on={run} />
        <Vessel x={140} y={150} w={100} h={64} agitator on={run} />
      </Equip>
      <Pipe d="M92 180 V194 H140" kind="material" w={5} />
      <Val a="CPD-03" t="hot_temp" x={262} y={70} w={100} label="Hot mixer out" />
      <Val a="CPD-03" t="cool_temp" x={368} y={70} w={100} label="Cooler out" />
      <Val a="CPD-03" t="batch_cycle" x={262} y={112} w={100} label="Batch cycle" />
      <Val a="CPD-03" t="heat_duty" x={368} y={112} w={100} label="Heating duty" />
      <Val a="CPD-03" t="power" x={262} y={154} w={100} label="Mixer power" />
      <Lbl x={368} y={172} size={10} muted>PVC + stabiliser +</Lbl><Lbl x={368} y={186} size={10} muted>filler + regrind</Lbl>

      {/* conveying, hopper, gravimetric doser */}
      <Pipe d="M230 214 V262" kind="material" w={5} speed={0.7} />
      <Part a="EXT-L03"><Tank x={205} y={262} w={50} h={72} cone={24} /></Part>
      <R x={214} y={340} w={74} h={18} />
      <Motor x={190} y={349} r={9} on={run} label="" />
      <Pipe d="M276 358 V420" kind="material" w={5} speed={0.7} />
      <Lbl x={196} y={300} anchor="end" size={10} muted>Dry-blend hopper</Lbl><Lbl x={176} y={372} anchor="end" size={10} muted>Gravimetric doser</Lbl>

      {/* drive */}
      <Equip a="DRV-L03" x={40} y={400} w={160} h={85} label="Drive 160 kW + gearbox">
        <R x={40} y={410} w={84} h={64} rx={6} fill="url(#m-metal)" />
        {[52, 62, 72, 82, 92, 102, 112].map(x => <line key={x} x1={x} y1={414} x2={x} y2={470} className="m-glyph" />)}
        <rect x={124} y={434} width={6} height={16} className="m-body" />
        <R x={130} y={400} w={70} h={85} rx={5} fill="url(#m-metal)" />
        <circle cx={165} cy={420} r={9} className="m-edge" /><circle cx={165} cy={460} r={13} className="m-edge" />
      </Equip>

      {/* extruder barrel with heater bands Z1–Z5 and cooling blowers */}
      <Equip a="EXT-L03" x={200} y={414} w={360} h={75} label="Twin-screw extruder 90 mm">
        <R x={200} y={420} w={360} h={40} rx={2} fill="url(#m-metal)" />
        <Screw x={206} y={426} len={348} h={28} on={run} id="scr-l03" />
        <rect x={266} y={414} width={20} height={8} className="m-body" />
        {[0, 1, 2, 3, 4].map(i => { const bx = 292 + i * 53; return <g key={i}>
          <R x={bx} y={414} w={45} h={52} rx={3} cls="m-body" op={0.92} />
          <text x={bx + 22.5} y={444} textAnchor="middle" className="m-inner">Z{i + 1}</text>
          <Fan x={bx + 22.5} y={478} r={8} on={run} speed={1.4} />
        </g>; })}
      </Equip>
      <Val a="EXT-L03" t="screw_rpm" x={300} y={268} w={104} label="Screw speed" />
      <Val a="EXT-L03" t="throughput" x={410} y={268} w={104} label="Throughput" />
      <Val a="EXT-L03" t="drive_kw" x={300} y={310} w={104} label="Screw drive power" />
      <Val a="EXT-L03" t="barrel_z4" x={400} y={356} w={114} label="Barrel zone 4" />
      <line x1={457} y1={392} x2={457} y2={414} className="m-glyph" strokeDasharray="2 2" />

      {/* screen changer and die head */}
      <Equip a="EXT-L03" x={562} y={402} w={98} h={76} label="Screen changer · die" noId>
        <R x={562} y={402} w={26} h={76} rx={2} fill="url(#m-metal)" />
        <line x1={575} y1={408} x2={575} y2={472} className="m-glyph" strokeDasharray="2 2" />
        <R x={566} y={378} w={18} h={24} rx={2} />
        <path d="M588 406 L620 412 L660 426 V454 L620 468 L588 474 Z" fill="url(#m-metal)" /><path d="M588 406 L620 412 L660 426 V454 L620 468 L588 474 Z" className="m-edge" />
        {[598, 612, 630, 646].map(x => <line key={x} x1={x} y1={x < 620 ? 410 : 418} x2={x} y2={x < 620 ? 470 : 462} className="m-glyph" />)}
        <circle cx={600} cy={402} r={4} className="m-body" /><line x1={600} y1={398} x2={600} y2={388} className="m-edge" />
      </Equip>
      <Val a="EXT-L03" t="melt_pressure" x={540} y={320} w={150} big label="Melt pressure at die (PT)" />

      {/* chilled water to the tanks (CH-02 header) */}
      <Pipe d="M240 560 V518 H845 V480" kind="chw" w={4} />
      <Pipe d="M700 518 V485" kind="chw" w={4} />

      {/* vacuum calibration tank and spray tank */}
      <Part a="VAC-L03">
        <rect x={690} y={395} width={130} height={90} rx="5" className="m-body" />
        <rect x={692} y={418} width={126} height={65} fill="url(#m-liquid)" opacity=".35" />
        <rect x={835} y={400} width={110} height={80} rx="5" className="m-body" />
        <rect x={837} y={424} width={106} height={54} fill="url(#m-liquid)" opacity=".25" />
      </Part>

      {/* product pipe through the line */}
      <rect x={660} y={PY} width={510} height={PH} fill="url(#m-metal)" /><rect x={660} y={PY} width={510} height={PH} className="m-edge" />
      {run && <path d={`M662 ${PY + PH / 2} H1168`} className="m-flow" strokeWidth={2} style={{ strokeDasharray: '26 30', animationDuration: '3.2s' }} />}

      <Equip a="VAC-L03" x={690} y={395} w={130} h={90} label="Vacuum tank">
        <rect x={690} y={395} width={130} height={90} rx="5" className="m-edge" />
        <R x={692} y={PY - 4} w={30} h={PH + 8} rx={2} cls="m-body" op={0.6} />
        {[736, 760, 784, 808].map(x => <path key={x} d={`M${x} 400 l-4 8 h8 z`} className="m-glyph" />)}
      </Equip>
      <Equip a="VAC-L03" x={835} y={400} w={110} h={80} label="Spray tank" noId>
        <rect x={835} y={400} width={110} height={80} rx="5" className="m-edge" />
        {[850, 874, 898, 922].map(x => <path key={x} d={`M${x} 405 l-4 8 h8 z`} className="m-glyph" />)}
      </Equip>
      <Val a="VAC-L03" t="vacuum" x={700} y={258} w={112} label="Tank vacuum" />
      <Val a="VAC-L03" t="water_temp" x={700} y={298} w={112} label="Spray water temp" />
      <Val a="VAC-L03" t="pump_kw" x={700} y={338} w={112} label="Vacuum pump" />

      {/* ultrasonic gauge */}
      <Equip a="UTG-L03" x={960} y={402} w={36} h={76} label="US gauge">
        <R x={960} y={402} w={36} h={76} rx={10} fill="url(#m-metal)" />
        <g className={`m-shape ${run ? 'on' : 'off'}`}><g className="m-spin" style={{ transformOrigin: '978px 440px', animationDuration: '2.4s' }}>
          {[0, 90, 180, 270].map(a => <rect key={a} x={975} y={410} width={6} height={8} className="m-hub" transform={`rotate(${a} 978 440)`} />)}
        </g></g>
      </Equip>
      <Val a="UTG-L03" t="wall_min" x={826} y={258} w={112} label="Min wall" />
      <Val a="UTG-L03" t="od" x={826} y={298} w={112} label="Mean OD" />
      <Val a="UTG-L03" t="ovality" x={944} y={258} w={112} label="Ovality" />
      <Val a="UTG-L03" t="weight_m" x={944} y={298} w={112} label="Weight per metre" />

      {/* haul-off */}
      <Equip a="HO-L03" x={1010} y={392} w={100} h={96} label="Haul-off">
        <R x={1010} y={392} w={100} h={96} rx={6} cls="m-body" op={0.35} />
        {[398, 456].map(ty => <g key={ty} className={run ? 'on' : 'off'}><rect x={1016} y={ty} width={88} height={26} rx="13" className="m-body" /><rect x={1016} y={ty} width={88} height={26} rx="13" className="m-edge" />
          <rect x={1022} y={ty + 6} width={76} height={14} rx="7" className="m-flow belt" fill="none" style={{ animationDirection: ty < 420 ? 'normal' : 'reverse' }} /></g>)}
      </Equip>
      <Val a="HO-L03" t="line_speed" x={1062} y={338} w={112} label="Line speed" />

      {/* planetary cutter, tipping table, belling, stacking */}
      <Equip a="HO-L03" x={1120} y={398} w={44} h={84} label="Cutter" noId>
        <R x={1120} y={398} w={44} h={84} rx={4} fill="url(#m-metal)" />
        <g className={`m-shape ${run ? 'on' : 'off'}`}><g className="m-spin" style={{ transformOrigin: '1142px 412px', animationDuration: '0.6s' }}>
          <circle cx={1142} cy={412} r={11} className="m-body" /><circle cx={1142} cy={412} r={11} className="m-edge" /><line x1={1131} y1={412} x2={1153} y2={412} className="m-glyph" /><line x1={1142} y1={401} x2={1142} y2={423} className="m-glyph" />
        </g></g>
      </Equip>
      <Part a="HO-L03">
        <R x={1172} y={PY} w={84} h={PH} rx={1} fill="url(#m-metal)" />
        <R x={1168} y={454} w={92} h={8} rx={2} />
        <path d="M1214 462 V474" className="m-edge" />
      </Part>
      <Lbl x={1214} y={492} anchor="middle" size={10} muted>Tipping table</Lbl>
      <Pipe d="M1214 498 V520" kind="material" w={4} arrow flow={false} />
      <Box x={1172} y={524} w={84} h={46} title="Belling" />
      <Pipe d="M1214 570 V592" kind="material" w={4} arrow flow={false} />
      <g className="m-shape"><R x={1172} y={596} w={84} h={58} rx={3} />
        {Array.from({ length: 12 }).map((_, i) => <circle key={i} cx={1186 + (i % 4) * 19} cy={612 + Math.floor(i / 4) * 16} r={6.5} className="m-edge" />)}</g>
      <Lbl x={1214} y={670} anchor="middle" size={11} bold>Stacking</Lbl>

      {/* drive and cutter values */}
      <Val a="DRV-L03" t="vel_rms" x={40} y={525} w={130} label="Gearbox vibration" />
      <Val a="DRV-L03" t="bearing_temp" x={40} y={567} w={130} label="Motor DE bearing" />
      <Val a="DRV-L03" t="accel" x={40} y={609} w={130} label="Envelope accel." />
      <Val a="HO-L03" t="length_dev" x={1040} y={525} w={116} label="Length deviation" />
      <Val a="HO-L03" t="cycle_time" x={1040} y={567} w={116} label="Cut-to-cut cycle" />
      <Val a="HO-L03" t="off_length" x={1040} y={609} w={116} label="Off-length cuts" />

      {/* alarm panel */}
      <Zone x={490} y={44} w={770} h={200} label="Alarm · melt pressure at die" />
      <Lamp a="EXT-L03" x={512} y={84} r={6} /><Lbl x={524} y={88} size={11} bold>{run ? 'L03 running' : 'L03 stopped'}</Lbl>
      <Val a="EXT-L03" t="melt_pressure" x={506} y={100} w={150} big label="Melt pressure" />
      <Val a="EXT-L03" t="throughput" x={506} y={154} w={150} label="Throughput" />
      <Lbl x={676} y={76} size={10} muted>Melt pressure · last 24 h (limit 260 bar)</Lbl>
      <MiniTrend a="EXT-L03" t="melt_pressure" x={676} y={84} w={300} h={66} />
      <Lbl x={676} y={168} size={10} muted>Drive power · last 24 h</Lbl>
      <MiniTrend a="EXT-L03" t="drive_kw" x={676} y={174} w={300} h={40} />
      {ev && <>
        <Lbl x={996} y={80} size={11} bold>{ev.finding}</Lbl>
        {wrap(ev.diagnosis.title, 40).map((l, i) => <Lbl key={'t' + i} x={996} y={98 + i * 14} size={10.5}>{l}</Lbl>)}
        {wrap(ev.diagnosis.reco.split('. ')[0] + '.', 42).slice(0, 4).map((l, i) => <Lbl key={'r' + i} x={996} y={146 + i * 14} size={10} muted>{l}</Lbl>)}
        <Lbl x={996} y={228} size={10} muted>{`Health ${h.health} · ${h.rulDays} d to action`}</Lbl>
      </>}

      {/* chiller CH-02 */}
      <Zone x={190} y={530} w={300} h={160} label="Chilled water · CH-02" />
      <Equip a="CH-02" x={206} y={560} w={70} h={50} label="Chiller 2" noId>
        <R x={206} y={560} w={70} h={50} rx={4} fill="url(#m-metal)" />
        <Fan x={228} y={585} r={10} on={true} /><Fan x={256} y={585} r={10} on={true} />
      </Equip>
      <Val a="CH-02" t="supply_temp" x={290} y={556} w={92} label="Supply" />
      <Val a="CH-02" t="delta_t" x={388} y={556} w={92} label="ΔT" />
      <Val a="CH-02" t="power" x={290} y={598} w={92} label="Power" />
      <Lbl x={206} y={660} size={10} muted>Extrusion header → calibration and spray tanks</Lbl>

      {/* sister lines */}
      <Zone x={500} y={530} w={510} h={160} label="Other lines" />
      <Lamp a="EXT-L05" x={522} y={558} r={5} /><Lbl x={532} y={562} size={11} bold>L05 · 110 mm</Lbl>
      <Val a="EXT-L05" t="melt_pressure" x={630} y={544} w={116} label="Melt pressure" />
      <Val a="VAC-L05" t="vacuum" x={752} y={544} w={116} label="Tank vacuum" />
      <Val a="UTG-L05" t="weight_m" x={874} y={544} w={120} label="Weight per metre" />
      <Val a="HO-L05" t="line_speed" x={516} y={572} w={106} label="Line speed" />
      <Lamp a="EXT-L07" x={522} y={630} r={5} /><Lbl x={532} y={634} size={11} bold>L07 · CPVC</Lbl>
      <Val a="EXT-L07" t="barrel_z4" x={630} y={620} w={116} label="Barrel zone 4" />
      <Val a="VAC-L07" t="vacuum" x={752} y={620} w={116} label="Tank vacuum" />
      <Val a="HO-L07" t="line_speed" x={874} y={620} w={120} label="Line speed" />
    </Mimic>
  );
}

/* ---------------- injection moulding cell ---------------- */
/** Compact IMM silhouette for status tiles. */
function MiniImm({ x, y, on }) {
  return <g className={`m-shape ${on ? 'on' : 'off'}`}>
    <R x={x} y={y + 30} w={120} h={18} rx={2} />
    <R x={x + 6} y={y + 6} w={8} h={24} rx={1} /><R x={x + 30} y={y + 6} w={8} h={24} rx={1} /><R x={x + 50} y={y + 4} w={10} h={26} rx={1} />
    <line x1={x + 10} y1={y + 10} x2={x + 55} y2={y + 10} className="m-edge" /><line x1={x + 10} y1={y + 26} x2={x + 55} y2={y + 26} className="m-edge" />
    <R x={x + 60} y={y + 14} w={44} h={8} rx={1} /><R x={x + 104} y={y + 10} w={14} h={16} rx={2} />
    <path d={`M${x + 86} ${y + 14} l-6 -12 h16 l-6 12`} className="m-body" /><path d={`M${x + 86} ${y + 14} l-6 -12 h16 l-6 12`} className="m-edge" />
  </g>;
}

function ImmCell({ c }) {
  const A = 'IMM-14';
  const run = useLive(A, 'shots_h', c).v > 10;
  const ct = useLive(A, 'cycle_time', c), it = useLive(A, 'inj_time', c), kt = useLive(A, 'cool_time', c);
  const ev = evOf(c, A);
  const sc = 280 / 45; const bx = 966;
  const seg = [[it.v || 0, 'Injection', 'm-g-fill'], [kt.v || 0, 'Hold + cooling', 'm-g-fill'], [Math.max(0, (ct.v || 0) - (it.v || 0) - (kt.v || 0)), 'Open · eject · close', 'm-g-track-r']];
  let acc = 0;
  return (
    <Mimic c={c} w={1280} h={700}>
      <Title x={24} y={30}>Injection moulding cell B · IMM-14 (250 T, 110 mm tee)</Title>
      <Zone x={30} y={44} w={900} h={420} label="Machine · toggle clamp, reciprocating screw" />

      <Equip a={A} x={56} y={116} w={828} h={284} >
        {/* base */}
        <R x={60} y={336} w={820} h={58} rx={4} fill="url(#m-metal)" />
        {[120, 300, 480, 660].map(x => <rect key={x} x={x} y={344} width={150} height={42} rx="3" className="m-edge" />)}
        {/* tie bars */}
        <line x1={96} y1={168} x2={418} y2={168} className="m-edge" style={{ strokeWidth: 5 }} /><line x1={96} y1={312} x2={418} y2={312} className="m-edge" style={{ strokeWidth: 5 }} />
        {/* clamp cylinder, rear platen, toggle links, moving platen, ejector */}
        <R x={62} y={216} w={30} h={48} rx={3} fill="url(#m-metal)" />
        <R x={92} y={140} w={28} h={196} rx={3} fill="url(#m-metal)" />
        <line x1={92} y1={240} x2={160} y2={240} className="m-edge" style={{ strokeWidth: 4 }} />
        {[[120, 182, 180, 210, 250, 186], [120, 298, 180, 270, 250, 294]].map(([x1, y1, x2, y2, x3, y3], i) => <g key={i}>
          <path d={`M${x1} ${y1} L${x2} ${y2} L${x3} ${y3}`} className="m-edge" style={{ strokeWidth: 5 }} />
          <line x1={160} y1={240} x2={x2} y2={y2} className="m-edge" style={{ strokeWidth: 3 }} />
          {[[x1, y1], [x2, y2], [x3, y3]].map(([px, py]) => <circle key={px + '-' + py} cx={px} cy={py} r={4.5} className="m-body" />)}
        </g>)}
        <circle cx={160} cy={240} r={6} className="m-hub" />
        <R x={250} y={150} w={30} h={180} rx={3} fill="url(#m-metal)" />
        <R x={226} y={228} w={24} h={24} rx={2} />
        {[234, 246].map(y => <line key={y} x1={250} y1={y} x2={290} y2={y} className="m-glyph" />)}
        {/* mould: moving half + fixed half with cooling channels and tee cavity */}
        <R x={280} y={172} w={50} h={136} rx={2} />
        <R x={330} y={172} w={50} h={136} rx={2} />
        <path d="M318 214 H342 V232 H360 V248 H342 V266 H318 Z" className="m-mini-bg" /><path d="M318 214 H342 V232 H360 V248 H342 V266 H318 Z" className="m-edge" />
        {[186, 290].map(y => [296, 364].map(x => <circle key={x + '-' + y} cx={x} cy={y} r={4} className="m-edge" />))}
        {/* fixed platen */}
        <R x={380} y={140} w={34} h={196} rx={3} fill="url(#m-metal)" />
        {/* nozzle, barrel with heater bands and screw, hopper, injection unit */}
        <path d="M414 234 L440 228 V252 L414 246 Z" className="m-body" /><path d="M414 234 L440 228 V252 L414 246 Z" className="m-edge" />
        <R x={440} y={222} w={260} h={36} rx={2} fill="url(#m-metal)" />
        <Screw x={446} y={228} len={248} h={24} on={run} id="scr-imm14" />
        {[0, 1, 2, 3, 4].map(i => <R key={i} x={452 + i * 46} y={216} w={34} h={48} rx={3} cls="m-body" op={0.9} />)}
        <Tank x={636} y={118} w={50} h={80} cone={26} />
        <rect x={657} y={198} width={8} height={24} className="m-body" />
        <R x={700} y={205} w={124} h={70} rx={5} fill="url(#m-metal)" />
        <line x1={724} y1={212} x2={724} y2={268} className="m-glyph" /><line x1={798} y1={212} x2={798} y2={268} className="m-glyph" />
        <Motor x={846} y={240} r={14} on={run} />
        <R x={714} y={282} w={120} h={14} rx={3} />
        <line x1={714} y1={296} x2={714} y2={336} className="m-edge" /><line x1={834} y1={296} x2={834} y2={336} className="m-edge" />
      </Equip>
      <Lbl x={170} y={134} anchor="middle" size={10} muted>Clamp · toggle</Lbl>
      <Lbl x={330} y={164} anchor="middle" size={10} muted>Mould</Lbl>
      <Lbl x={265} y={144} anchor="middle" size={10} muted>Ejector</Lbl>
      <Lbl x={640} y={418} anchor="middle" size={12} bold>IMM-14 · 250 T toggle machine, 110 mm tee mould</Lbl>
      <Lbl x={570} y={210} anchor="middle" size={10} muted>Barrel · heater bands · screw</Lbl>
      <Lbl x={694} y={150} size={10} muted>Hopper (dryer)</Lbl>
      <Lbl x={762} y={196} anchor="middle" size={10} muted>Injection unit</Lbl>
      <Lbl x={428} y={276} anchor="middle" size={10} muted>Nozzle</Lbl>

      <Val a={A} t="cool_time" x={520} y={64} w={130} label="Hold + cooling time" />
      <Val a={A} t="inj_time" x={460} y={150} w={110} label="Injection time" />
      <Val a={A} t="kwh_shot" x={460} y={284} w={110} label="Energy per shot" />
      <Val a={A} t="cycle_time" x={720} y={64} w={140} big label="Cycle time" />

      {/* cycle panel */}
      <Zone x={950} y={44} w={310} h={420} label="Cycle · IMM-14" />
      <Val a={A} t="cycle_time" x={966} y={70} w={136} big label="Cycle (mould close)" />
      <Val a={A} t="shots_h" x={1110} y={70} w={136} big label="True shots / hour" />
      <Val a={A} t="inj_time" x={966} y={126} w={136} label="Injection time" />
      <Val a={A} t="cool_time" x={1110} y={126} w={136} label="Hold + cooling" />
      <Val a={A} t="kwh_shot" x={966} y={168} w={136} label="Energy per shot" />
      <Lbl x={966} y={228} size={10} muted>Cycle split (scale 0–45 s, band limit 38 s)</Lbl>
      <g>
        {seg.map(([v, , cls], i) => { const x = bx + acc * sc; acc += v; return <rect key={i} x={x} y={236} width={Math.max(0, v * sc)} height={18} className={cls} opacity={i === 1 ? 0.6 : 1} />; })}
        <rect x={bx} y={236} width={280} height={18} className="m-edge" />
        <line x1={bx + 38 * sc} y1={230} x2={bx + 38 * sc} y2={260} className="m-g-limline" />
        {seg.map(([v, l, cls], i) => <g key={'l' + i}><rect x={bx + [0, 74, 170][i]} y={266} width={9} height={9} className={cls} opacity={i === 1 ? 0.6 : 1} /><text x={bx + 13 + [0, 74, 170][i]} y={274} className="m-val-l">{l}</text></g>)}
      </g>
      <Lbl x={966} y={302} size={10} muted>Cycle time · last 24 h</Lbl>
      <MiniTrend a={A} t="cycle_time" x={966} y={308} w={280} h={48} />
      {ev && <>
        <Lbl x={966} y={378} size={11} bold>{ev.finding}</Lbl>
        {wrap(ev.diagnosis.title, 50).map((l, i) => <Lbl key={'t' + i} x={966} y={396 + i * 14} size={10.5}>{l}</Lbl>)}
        <Lbl x={966} y={440} size={10} muted>Mould at 468,000 of 500,000 rated shots</Lbl>
      </>}

      {/* mould water */}
      <Zone x={30} y={480} w={520} h={206} label="Mould water · CH-05" />
      <Pipe d="M170 536 H300 V310" kind="chw" w={5} />
      <Pipe d="M360 310 V576 H170" kind="chw" w={5} dashed />
      <Equip a="CH-05" x={50} y={516} w={120} h={76} label="Chiller 5 · 80 TR">
        <R x={50} y={516} w={120} h={76} rx={5} fill="url(#m-metal)" />
        <Fan x={80} y={544} r={13} on={true} /><Fan x={116} y={544} r={13} on={true} />
        <line x1={58} y1={572} x2={162} y2={572} className="m-glyph" />
      </Equip>
      <Lbl x={180} y={530} size={10} muted>Supply</Lbl><Lbl x={180} y={592} size={10} muted>Return</Lbl>
      <Val a="CH-05" t="supply_temp" x={400} y={500} w={130} label="Supply temp" />
      <Val a="CH-05" t="delta_t" x={400} y={542} w={130} label="Evaporator ΔT" />
      <Val a="CH-05" t="power" x={400} y={584} w={130} label="Power" />
      <Lbl x={50} y={652} size={10} muted>Scaled cooling channels slow heat removal even at a steady supply temperature.</Lbl>

      {/* other machines */}
      <Zone x={570} y={480} w={690} h={206} label="Other machines · cell B" />
      {[['IMM-22', '180 T · CPVC elbow'], ['IMM-31', '350 T · 160 mm coupler']].map(([id, nm], i) => { const x = 590 + i * 340; return <g key={id}>
        <Equip a={id} x={x} y={516} w={120} h={48} noId><MiniImm x={x} y={516} on={true} /></Equip>
        <Lamp a={id} x={x + 6} y={590} r={5} /><Lbl x={x + 16} y={594} size={11} bold>{id}</Lbl>
        <Lbl x={x} y={610} size={10} muted>{nm}</Lbl>
        <Val a={id} t="cycle_time" x={x + 140} y={506} w={150} label="Cycle time" />
        <Val a={id} t="shots_h" x={x + 140} y={548} w={150} label="True shots / hour" />
        <Val a={id} t="kwh_shot" x={x + 140} y={590} w={150} label="Energy per shot" />
        <Val a={id} t="cool_time" x={x + 140} y={632} w={150} label="Hold + cooling" />
      </g>; })}
    </Mimic>
  );
}

export default { 'extrusion-line': ExtrusionLine, 'imm-cell': ImmCell };
