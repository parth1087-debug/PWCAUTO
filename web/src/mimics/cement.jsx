/* Cement: pyro line (preheater, calciner, kiln, cooler, ID fan) and mill circuits. Reference drawing for the kit. */
import React from 'react';
import { Mimic, Equip, Val, Pipe, Cyclone, Drum, Fan, Box, Vessel, Tank, Valve, Flame, Lbl, Title, Zone, Conveyor, Motor, MiniTrend, BarInd, Gauge, useLive } from './kit.jsx';

function KilnLine({ c }) {
  const run = useLive('KL-01', 'feed', c).v > 20;
  const cyc = [[70, 60], [175, 120], [70, 190], [175, 255], [70, 325]]; // stage 1 (top) … 5
  return (
    <Mimic c={c} w={1280} h={700}>
      <Title x={24} y={30}>Kiln line 1 · 6,000 tpd</Title>
      <Zone x={40} y={40} w={290} h={420} label="5-stage preheater" />
      {/* gas up (flue), meal down (material) */}
      <Pipe d="M300 440 V400 H250 V300 H150 V230 H250 V160 H150 V95 H120 V40 H380" kind="flue" w={10} speed={1.3} />
      <Pipe d="M95 140 V180 M200 205 V245 M95 270 V315 M200 345 V380 M95 410 V470 L380 520" kind="material" w={5} speed={0.7} />
      {cyc.map(([x, y], i) => <g key={i}><Equip a="PH-01" x={x} y={y} w={52} h={88} noId><Cyclone x={x} y={y} w={52} h={88} /></Equip><Lbl x={x + 26} y={y + 50} anchor="middle" size={10} bold>C{i + 1}</Lbl></g>)}
      <Val a="PH-01" t="c4_draft" x={236} y={258} label="C4 draft" w={92} />
      <Val a="PH-01" t="c5_outlet_temp" x={128} y={410} label="C5 outlet" w={92} />
      <Val a="PH-01" t="ph_o2" x={236} y={60} label="PH outlet O₂" w={92} />
      {/* calciner */}
      <Equip a="PH-01" x={290} y={300} w={40} h={130} label="Calciner"><Vessel x={290} y={300} w={40} h={130} flame /></Equip>
      {/* ID fan and stack */}
      <Pipe d="M380 40 H470 V86" kind="flue" w={10} speed={1.3} />
      <Equip a="ID-01" x={450} y={86} w={44} h={44} label="ID fan"><Fan x={472} y={108} r={22} on={run} speed={1.6} /></Equip>
      <Pipe d="M494 108 H560 V60" kind="flue" w={10} speed={1.3} />
      <rect x={548} y={20} width={24} height={44} rx={3} className="m-body" /><rect x={548} y={20} width={24} height={44} rx={3} className="m-edge" /><Lbl x={580} y={44} muted size={10}>to raw mill / bag house</Lbl>
      <Val a="ID-01" t="speed" x={510} y={120} w={92} /><Val a="ID-01" t="power" x={510} y={160} w={92} /><Val a="ID-01" t="vibration" x={510} y={200} w={92} />
      {/* kiln */}
      <Equip a="KL-01" x={380} y={470} w={560} h={70} label="Rotary kiln 4.75 × 72 m" sub="3 tyres · 3.6 rpm"><Drum x={380} y={470} len={560} dia={70} angle={3.5} on={run} hot /></Equip>
      <Flame x={955} y={540} s={22} />
      <Lbl x={960} y={590} muted size={10}>Main burner · coal + AFR</Lbl>
      <Val a="KL-01" t="feed" x={380} y={590} label="Kiln feed" w={100} big />
      <Val a="KL-01" t="shell_temp" x={500} y={590} label="Shell temp (scanner max)" w={150} big />
      <Val a="KL-01" t="burning_zone" x={670} y={590} label="Burning zone" w={120} big />
      <Val a="KL-01" t="torque" x={810} y={590} label="Main drive torque" w={120} big />
      <MiniTrend a="KL-01" t="shell_temp" x={500} y={644} w={150} h={34} />
      {/* cooler */}
      <Pipe d="M1000 560 H1030" kind="hot" w={10} />
      <Equip a="CL-01" x={1030} y={520} w={210} h={70} label="Grate cooler" sub="clinker → crusher → silo"><Box x={1030} y={520} w={210} h={70} />
        {[0, 1, 2, 3, 4].map(i => <Fan key={i} x={1052 + i * 42} y={622} r={13} on={run} speed={1.2} />)}
      </Equip>
      <Pipe d="M1050 520 V470 H1000" kind="hot" w={6} arrow /><Lbl x={1052} y={462} muted size={10}>Secondary air</Lbl>
      <Pipe d="M1130 520 V420 H330" kind="hot" w={6} arrow /><Lbl x={700} y={412} muted size={10}>Tertiary air duct → calciner</Lbl>
      <Val a="CL-01" t="grate_pressure" x={1030} y={436} label="Under-grate pressure" w={130} />
      <Val a="CL-01" t="clinker_temp" x={1170} y={436} label="Clinker out" w={96} />
      <Conveyor x={1240} y={560} len={30} />
      {/* quality strip */}
      <Zone x={980} y={40} w={280} h={190} label="Quality and stability" />
      <Val a="KL-01" t="free_lime" x={996} y={70} label="Free lime (XRF, hourly)" w={150} big />
      <BarInd a="KL-01" t="free_lime" x={1170} y={70} h={110} label="Free lime" />
      <Gauge a="PH-01" t="ph_o2" x={1070} y={190} r={30} min={0} max={8} label="Inlet O₂" />
    </Mimic>
  );
}

function MillCircuit({ c }) {
  const vrmOn = useLive('RM-01', 'feed', c).v > 20;
  return (
    <Mimic c={c} w={1280} h={660}>
      <Title x={24} y={30}>Raw mill (VRM) and cement mills</Title>
      <Zone x={30} y={44} w={600} h={590} label="Raw meal grinding" />
      <Equip a="CR-01" x={60} y={110} w={90} h={60} label="Crusher"><Box x={60} y={110} w={90} h={60} title="CR-01" /></Equip>
      <Val a="CR-01" t="throughput" x={60} y={196} w={96} />
      <Pipe d="M150 140 H200" kind="material" w={5} /><Tank x={200} y={90} w={56} h={110} cone={26} label="Raw meal hoppers" />
      <Pipe d="M228 200 V260 H300" kind="material" w={5} />
      <Equip a="RM-01" x={300} y={230} w={140} h={150} label="Vertical roller mill" sub="Loesche · 4 rollers"><Vessel x={300} y={230} w={140} h={150} /></Equip>
      <Val a="RM-01" t="feed" x={300} y={410} w={100} /><Val a="RM-01" t="dp" x={410} y={410} w={100} label="Mill ΔP" /><Val a="RM-01" t="power" x={300} y={452} w={100} /><Val a="RM-01" t="residue" x={410} y={452} w={100} label="Residue 90 µm" />
      <Pipe d="M370 230 V150 H480" kind="air" w={8} speed={1.4} />
      <Equip a="RMF-01" x={480} y={128} w={44} h={44} label="Mill fan"><Fan x={502} y={150} r={22} on={vrmOn} speed={1.5} /></Equip>
      <Val a="RMF-01" t="power" x={540} y={110} w={84} /><Val a="RMF-01" t="vibration" x={540} y={150} w={84} />
      <Pipe d="M300 330 H160 V480" kind="hot" w={6} arrow /><Lbl x={60} y={500} muted size={10}>Hot gas from kiln line</Lbl>
      <Zone x={660} y={44} w={600} h={590} label="Cement grinding" />
      {['CM-01', 'CM-02'].map((id, i) => { const y = 110 + i * 250; const on = true; return <g key={id}>
        <Tank x={690} y={y} w={50} h={90} cone={22} label="Clinker + gypsum" />
        <Pipe d={`M715 ${y + 90} V${y + 130} H790`} kind="material" w={5} />
        <Equip a={id} x={790} y={y + 100} w={240} h={60} label={`Ball mill ${i + 1} · 4.6 × 15 m`}><Drum x={790} y={y + 100} len={240} dia={60} angle={0} on={on} tyres={2} /></Equip>
        <Motor x={1060} y={y + 130} r={16} on={on} />
        <Pipe d={`M1030 ${y + 130} H1040`} kind="material" w={5} />
        <Val a={id} t="feed" x={790} y={y + 186} w={100} /><Val a={id} t="power" x={900} y={y + 186} w={100} />
        <Val a={id} t="blaine" x={1100} y={y + 70} w={120} label="Blaine" /><Val a={id} t="bearing_temp" x={1100} y={y + 112} w={120} label="Bearing temp" />
      </g>; })}
    </Mimic>
  );
}

export default { 'kiln-line': KilnLine, 'mill-circuit': MillCircuit };
