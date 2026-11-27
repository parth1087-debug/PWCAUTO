/* Analytics for the Cost and Quality boards (dash-cq).
   Pure functions over db / demo plus deterministic per-plant reference data (keyed by demo id).
   Board families:
     mfg   discrete and process plants (auto, cement, steel, pharma-api, pharma-formulation, pipes)
     res   renewables (solar, wind): cost = generation losses, quality = PR / power-curve performance
     ems   energy & utilities: cost = energy cost & losses, quality = power quality
     power coal power plant: cost = heat rate & losses, quality = coal & combustion */
import { hash, rng } from '../engine.js';

const D = 864e5;
const r = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const sum = (a, f = x => x) => a.reduce((s, x) => s + f(x), 0);

export function family(demo) {
  if (demo.id === 'power') return 'power';
  if (demo.id === 'ems') return 'ems';
  if (demo.id === 'solar' || demo.id === 'wind') return 'res';
  return 'mfg';
}

/* ---------- per-plant reference data ----------
   perUnit  cost units per production unit (e.g. kg per piece)
   contrib  contribution margin, ₹ per cost unit (value of one lost unit of output)
   copq     cost of poor quality, ₹ lakh per month (scrap, rework, reprocessing, downgrades)
   w        relative cost per case of each defect (scrap = high, rework = low)
   causes   defect -> [likely cause, action, owner] */
const CFG = {
  auto: { perUnit: 0.42, contrib: 30, copq: 20.5, oeeTarget: 78,
    w: { 'Tooth crack': 3, 'Burr on tooth tip': 0.6, 'Tooth profile error': 2, 'Dent': 0.8, 'Plating patch': 1, 'Pitch length': 2.5 },
    causes: {
      'Tooth crack': ['IH-02 quench flow drifting low; case depth uneven', 'Clean quench ring, add low-flow interlock at 16.5 L/min', 'HT in-charge'],
      'Burr on tooth tip': ['Hob wear past 1,800 pcs on Sprocket Line 2', 'Cut hob life to 1,500 pcs; deburr brush check each shift', 'Machining lead'],
      'Tooth profile error': ['HB-04 spindle vibration and fixture runout', 'Fix HB-04 spindle bearing (WO open); runout check at setup', 'Maintenance head'],
      'Pitch length': ['Pin and bush press-fit variation at assembly', 'Gauge R&R on pitch fixture; SPC on press force', 'Assembly lead'],
      'Dent': ['Parts dropped into bins at conveyor end', 'Fit chute damper and part-separating trays', 'Production supervisor'],
      'Plating patch': ['Oil residue before plating', 'Tighten degreasing bath titration to every 4 h', 'Plating supplier QA'] } },
  cement: { perUnit: 1, contrib: 1100, copq: 24,
    w: { 'Free lime high': 2, 'Blaine low': 1, 'SO₃ out of range': 1, 'Residue high': 0.8, 'Bag weight': 0.4 },
    causes: {
      'Free lime high': ['Kiln feed LSF swings and low burning-zone temperature', 'Raw mix control on LSF ±1; hold BZT above 1,420 °C', 'Process head'],
      'Blaine low': ['Separator speed below setpoint on Cement mill 1', 'Lock separator speed recipe per grade', 'Mill in-charge'],
      'SO₃ out of range': ['Gypsum feeder drift', 'Calibrate gypsum weigh feeder weekly', 'QC head'],
      'Residue high': ['Worn grinding media in chamber 2', 'Top up media charge at next stop', 'Mill in-charge'],
      'Bag weight': ['Packer spout weigher drift', 'Check-weigh 10 bags per spout per shift', 'Packing in-charge'] } },
  steel: { perUnit: 1, contrib: 4500, copq: 78,
    w: { 'Surface cracks': 2, 'Lap': 1.5, 'Section out of tolerance': 1, 'Bend test fail': 4, 'Rust': 0.3 },
    causes: {
      'Surface cracks': ['Strand 3 mould level hunting (> 6 mm) and low superheat', 'Retune mould level loop; superheat 25–35 °C', 'Caster in-charge'],
      'Lap': ['Overfill in stands 12–14 after roll change', 'Pass-design check after each roll change', 'Mill in-charge'],
      'Section out of tolerance': ['Roll gap drift and worn guides', 'Online gauge alarm at ±0.3 mm; guide change by tonnage', 'Rolling lead'],
      'Bend test fail': ['QT water pressure variation', 'Interlock QT pressure low; test every heat', 'QA head'],
      'Rust': ['Open-yard storage over 15 days', 'FIFO dispatch from covered bay', 'Dispatch in-charge'] } },
  'pharma-api': { perUnit: 1, contrib: 9000, copq: 95,
    w: { 'LOD out of limit': 1.2, 'Single unknown impurity > 0.10 %': 3, 'Residual solvent (methanol) high': 1, 'Particle size off-spec': 0.8, 'Colour of solution': 1.5, 'Assay below 99.0 %': 4 },
    causes: {
      'LOD out of limit': ['RCVD-301 vacuum leak extends drying; endpoint by time not LOD', 'Fix dryer seal; endpoint by on-line LOD trend', 'Production head (Block B)'],
      'Single unknown impurity > 0.10 %': ['Exotherm overshoot at stage 4 addition', 'Dosing interlock on ΔT > 3 °C; slower addition', 'Process chemist'],
      'Residual solvent (methanol) high': ['Short final wash on centrifuge', 'Wash volume by cake height, not fixed time', 'Isolation supervisor'],
      'Particle size off-spec': ['Multimill screen wear', 'Screen check every batch', 'Production supervisor'],
      'Colour of solution': ['Carbon treatment time variation', 'Fix contact time in BMR', 'Process chemist'],
      'Assay below 99.0 %': ['Incomplete crystallisation', 'Cooling ramp control in recipe', 'QC head'] } },
  'pharma-formulation': { perUnit: 0.001, contrib: 450, copq: 28,
    w: { 'Weight variation': 1, 'Broken / chipped tablet': 0.6, 'Leak test failure': 2.5, 'Coating defect (twinning, picking)': 1.2, 'Empty pocket': 0.5, 'Print / batch code error': 3 },
    causes: {
      'Weight variation': ['TP-02 feeder speed and granule flow (fines > 20 %)', 'Control fines at granulation; feeder speed in recipe', 'Compression lead'],
      'Broken / chipped tablet': ['Low hardness at high turret speed', 'Hardness ≥ 8 kp at 60 rpm; check punches', 'Compression lead'],
      'Leak test failure': ['Sealing temperature drift on Pack line 1', 'Seal-temperature alarm ±3 °C; knurl check', 'Packaging head'],
      'Coating defect (twinning, picking)': ['Spray gun blocking, high spray rate', 'Gun cleaning every 2 h; spray-rate recipe', 'Coating supervisor'],
      'Empty pocket': ['Feeder channel jams', 'Vision reject check at start of batch', 'Packaging head'],
      'Print / batch code error': ['Manual change of overprint data', 'Barcode verify interlock with BMR', 'QA head'] } },
  pipes: { perUnit: 1, contrib: 22000, copq: 46,
    w: { 'Off-length cut': 0.4, 'Short shot (fittings)': 0.5, 'Ovality out of limit': 1.5, 'Surface marks and die lines': 0.8, 'Wall below minimum': 2, 'Socket and belling defect': 1, 'Hydrostatic test failure': 6 },
    causes: {
      'Off-length cut': ['Planetary saw encoder slip at line speed changes', 'Replace encoder wheel; length check every 30 min', 'Extrusion lead'],
      'Short shot (fittings)': ['IMM cell B melt temperature low after mould change', 'Mould pre-heat; first-off approval', 'Moulding lead'],
      'Ovality out of limit': ['Vacuum tank water temperature and sizing sleeve wear on L05', 'Hold tank water < 22 °C; replace sleeve', 'Extrusion lead'],
      'Wall below minimum': ['Die centring drift; thin side at 3 o’clock', 'Auto-centring with UTG-L05 ultrasonic feedback', 'Process engineer'],
      'Surface marks and die lines': ['Degraded material at die lips', 'Die-lip cleaning on schedule; screen-pack change', 'Extrusion lead'],
      'Socket and belling defect': ['Belling oven temperature spread', 'Oven zone calibration', 'Maintenance head'],
      'Hydrostatic test failure': ['Low wall with poor gelation', 'K-value and gelation check per lot', 'QA head'] } },
  /* renewables */
  solar: { tariff: 2.62, capacity: 650, capUnit: 'MWp', caps: [150, 150, 100, 100, 75, 75],
    mwhPerCase: { 'Hotspot (> 20 °C ΔT)': 0.9, 'Bypass diode failure': 1.6, 'Cracked cell / glass': 0.4, 'PID string': 6.5, 'Connector burn (MC4)': 4.2, 'Delamination': 0.3 },
    causes: {
      'Hotspot (> 20 °C ΔT)': ['Cell cracks and shading from bird droppings', 'Replace modules with ΔT > 20 °C; bird spikes on rows', 'Site O&M lead'],
      'Bypass diode failure': ['Junction-box heat after hotspot', 'Replace J-box diodes; IV-curve the string', 'Site O&M lead'],
      'Cracked cell / glass': ['Cleaning robot and handling damage', 'Warranty claim; review robot brush pressure', 'Asset manager'],
      'PID string': ['Negative bias on long strings in humid season', 'Night-time PID recovery box on affected inverters', 'Electrical engineer'],
      'Connector burn (MC4)': ['Mixed MC4 brands and poor crimps', 'Replace with same-brand connectors; torque audit', 'Site O&M lead'],
      'Delamination': ['Module batch defect (2019 lot)', 'Warranty claim with OEM', 'Asset manager'] } },
  wind: { tariff: 3.4, capacity: 370, capUnit: 'MW', caps: [75, 75, 60, 60, 50, 50],
    causes: {
      'Leading-edge erosion (cat. 2–3)': ['Dust and rain erosion at blade tips', 'LEP repair in the low-wind window (Oct–Feb)', 'Blade engineer'],
      'Lightning receptor damage': ['Strikes during the monsoon', 'Receptor resistance test; repair before monsoon', 'Site manager'],
      'Gel-coat cracks at root': ['Fatigue at root, older blades', 'Drone inspection every 6 months; repair cat. 3', 'Blade engineer'],
      'Gearbox oil debris above limit': ['HSS bearing wear on MP-WTG-07', 'Oil change, endoscopy; plan bearing swap with crane', 'Reliability engineer'],
      'Pitch bearing grease leak': ['Seal wear', 'Replace seals; auto-lube check', 'OEM service lead'],
      'HSS bearing micropitting': ['Lubrication film breakdown at high temperature', 'Oil cooler clean; synthetic oil grade', 'Reliability engineer'],
      'Generator slip-ring wear': ['Brush wear and dust', 'Brush replacement at 6-month service', 'OEM service lead'] },
    sev: { 'Leading-edge erosion (cat. 2–3)': 1.2, 'Lightning receptor damage': 0.6, 'Gel-coat cracks at root': 0.5, 'Gearbox oil debris above limit': 9, 'Pitch bearing grease leak': 1.5, 'HSS bearing micropitting': 6, 'Generator slip-ring wear': 2 } },
  /* energy & utilities */
  ems: { lossUnit: 'MWh',
    pq: {
      'Voltage sags (> 10 %, < 1 s)': [1.4, 'Grid faults on the 33 kV feeder; drives trip on undervoltage', 'Ride-through settings on VFDs; DVR for critical line', 'Electrical head'],
      'THD-I above IEEE 519 at TR-02 LV': [0.35, 'HF-01 active filter offline; VFD load on TR-02', 'Restore HF-01; add line reactors on VFD-04/05', 'Electrical head'],
      'Voltage unbalance > 2 %': [0.3, 'Single-phase loads on MCC-02', 'Rebalance lighting and welding loads across phases', 'Electrical engineer'],
      '15-min PF below 0.97': [0.6, 'APFC-01 steps failing (2 of 12 capacitors weak)', 'Replace weak capacitor banks; check APFC controller', 'Electrical engineer'],
      'UPS transfers to battery': [0.2, 'Input voltage dips', 'Review UPS input window', 'IT facilities'],
      'Voltage swells': [0.1, 'Capacitor switching at light load', 'Step-wise APFC switching at night', 'Electrical engineer'],
      'Frequency excursions': [0.1, 'Grid-side events', 'Monitor only; under-frequency relay set-point check', 'Electrical engineer'] },
    pts: [['GRID-01', 'pf', 'PF at billing meter', 0.97, 'min', 'MSEDCL tariff'], ['GRID-01', 'thd_v', 'THD-V at PCC', 5, 'max', 'IEEE 519'], ['GRID-01', 'thd_i', 'TDD at PCC', 8, 'max', 'IEEE 519'], ['GRID-01', 'v_unbal', 'Voltage unbalance at PCC', 2, 'max', 'IEC 61000-2-4'],
      ['TR-01', 'thd_i', 'TR-01 LV current THD', 12, 'max', 'Plant limit'], ['TR-02', 'thd_i', 'TR-02 LV current THD', 12, 'max', 'Plant limit'], ['HF-01', 'thd_i_out', 'HF-01 output THD-I', 8, 'max', 'Filter spec'],
      ['MCC-01', 'thd_i', 'MCC-01 current THD', 25, 'max', 'Plant limit'], ['MCC-02', 'v_unbal', 'MCC-02 voltage unbalance', 2, 'max', 'IEC 61000-2-4']] },
  /* power */
  power: { coalRsT: 4800, design: 3850,
    comb: {
      'Excess O₂ out of band (2.8–4.0 %)': [0.9, 'APH leakage and O₂ probe drift', 'Calibrate O₂ probes; trim O₂ setpoint by load', 'Operations head'],
      'UBC in fly ash > 2 %': [1.6, 'Coarse grind (fineness < 70 % through 200 mesh)', 'Classifier vane setting; mill roller gap', 'Mill in-charge'],
      'Mill outlet temperature < 65 °C': [0.7, 'Wet coal in monsoon, low hot-PA', 'Raise hot-air damper; blend dry coal', 'Mill in-charge'],
      'Coal moisture > 14 %': [1.1, 'Open-yard stock wet after rain', 'Covered stock FIFO; blend with dry coal', 'Fuel manager'],
      'Coal GCV below grade (slippage)': [2.2, 'Grade slippage at mine (G11 billed, G12 received)', 'Third-party sampling; raise claim with supplier', 'Fuel manager'],
      'CO > 200 ppm': [0.5, 'Low O₂ at high load in corner 3', 'Burner tilt and SADC balance', 'Operations head'],
      'NOx > 300 mg/Nm³': [0.3, 'High O₂ and FEGT', 'OFA damper tuning', 'Environment officer'] },
    tiles: [['CHP-01', 'gcv', 'Coal GCV (as fired)', 3500, 'min', 'kcal/kg'], ['CHP-01', 'moisture', 'Total moisture', 14, 'max'], ['CHP-01', 'ash', 'Ash', 42, 'max'],
      ['ASH-01', 'ubc_fly', 'UBC in fly ash', 2, 'max'], ['ASH-01', 'fineness', 'Coal fineness (200 mesh)', 70, 'min'], ['STK-01', 'co', 'CO at stack', 200, 'max']] },
};
export const cfg = demo => CFG[demo.id] || {};

/* loss category -> [controllable?, next action, owner] */
const LOSS_ACT = [
  [/curtail/i, false, 'File deemed-generation claim; schedule to SLDC with better forecast', 'Commercial manager'],
  [/soiling/i, true, 'Move to soiling-ratio-triggered cleaning (0.95); extra cycle at Pavagada', 'Site O&M lead'],
  [/inverter/i, true, 'Fix BH-INV-03 derating; spares for IGBT stacks', 'Electrical engineer'],
  [/tracker/i, true, 'Repair KN-TRK-12 drive; tracker error alarm at 2°', 'Site O&M lead'],
  [/clipping/i, false, 'Design limit (DC/AC 1.4); no action', 'Asset manager'],
  [/transformer|cable/i, false, 'Within design; check IDT loading', 'Electrical engineer'],
  [/unscheduled/i, true, 'Cut MTTR: crane and spares pre-positioned for gearbox jobs', 'Site manager'],
  [/power curve|underperf/i, true, 'Yaw calibration JS-WTG-03; pitch fault KT-WTG-11', 'Performance engineer'],
  [/scheduled/i, true, 'Do services in the low-wind window', 'OEM service lead'],
  [/cut-out/i, false, 'Weather; no action', 'Site manager'],
  [/environment/i, false, 'Filter cleaning before summer', 'Site manager'],
  [/breakdown/i, true, 'Fix top 3 repeat failures; PM on A-critical assets', 'Maintenance head'],
  [/setup|changeover|clearance|die|mould|roll change/i, true, 'SMED: pre-stage tools and dies; standard changeover', 'Production head'],
  [/minor|micro|untagged/i, true, 'Tag stops in MES; fix top jam points', 'Line supervisor'],
  [/speed|feed/i, true, 'Run at rated speed; fix process limits', 'Process engineer'],
  [/reject|rework|quality/i, true, 'See quality board: top defect actions', 'Quality head'],
  [/start-up/i, true, 'Warm-up recipe; first-off approval', 'Line supervisor'],
  [/kiln stop|mill trip|packing/i, true, 'Root-cause the top trip codes; interlock review', 'Process head'],
  [/qc|waiting|release|resin|material|operator/i, true, 'Plan QC and material ahead of the batch', 'Planning head'],
  [/drying/i, true, 'End drying on LOD trend, not fixed time', 'Production head'],
  [/utility/i, true, 'Utility standby check before batch start', 'Utilities head'],
  [/compressor|unload/i, true, 'Sequence AC-01/02/04 with AC-03 as trim; fix leaks', 'Utilities head'],
  [/chiller|ΔT/i, true, 'Raise chilled-water ΔT: close bypass valves, clean CH-02 condenser', 'Utilities head'],
  [/idle|hvac/i, true, 'Schedule HVAC off at nights and holidays', 'Facilities head'],
  [/trap/i, true, 'Replace failed traps on STZ-01', 'Utilities head'],
  [/dg/i, true, 'Stop DG-02 at low load; grid-first logic', 'Electrical head'],
  [/pf/i, true, 'Replace weak APFC-01 capacitors', 'Electrical engineer'],
];
export const lossAction = name => { const m = LOSS_ACT.find(x => x[0].test(name)); return m ? { ctrl: m[1], action: m[2], owner: m[3] } : { ctrl: true, action: 'Root-cause with 5-why', owner: 'Production head' }; };

/* ---------- volume in the period ---------- */
export function volume(db, demo, R) {
  const days = db.production(R.from, R.to).filter(x => x.t >= R.from - D + 1);
  const actual = sum(days, x => x.actual), plan = sum(days, x => x.plan);
  return { actual, plan, days };
}

/* ---------- cost build-up and variance (₹ per cost unit, ₹ lakh in the period) ---------- */
export function costBuild(db, demo, R, kwh) {
  const c = demo.cost, f = family(demo), k = cfg(demo);
  const actual = sum(c.elements, e => e[1]);
  const gap = actual - c.budget;
  const bsum = sum(c.bridge, b => b[1]);
  const resid = gap - bsum;          /* what the plant's variance drivers do not explain: price, mix and other */
  let vol, volLabel;
  if (f === 'res') { vol = k.capacity * R.days / 365; volLabel = `${k.capacity} ${k.capUnit} × ${R.days} days`; }
  else if (f === 'ems') { vol = kwh || 0; volLabel = 'kWh'; }
  else { const v = volume(db, demo, R); vol = v.actual * (k.perUnit || 1); volLabel = demo.production.unit; }
  return { unit: c.unitLabel, budget: c.budget, actual, gap, gapPct: (gap / c.budget) * 100, vol, volLabel,
    elements: c.elements.map(e => ({ name: e[0], value: e[1], share: e[1] / actual })).sort((a, b) => b.value - a.value),
    drivers: [...c.bridge.map(b => ({ name: b[0], delta: b[1] })), ...(Math.abs(resid) > c.budget * 0.002 ? [{ name: 'Price, mix and other', delta: resid }] : [])].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)) };
}
/* ₹ lakh from (₹ per cost unit) × volume in cost units; renewables' unit is already ₹ lakh/MWp/yr */
export const toLakh = (perUnit, vol, demo) => (family(demo) === 'res' ? perUnit * vol : (perUnit * vol) / 1e5);

/* daily cost per unit in the period: from the plant's cost KPI, or derived from fixed-cost absorption */
export function costTrend(db, demo, R) {
  const kp = demo.kpis.find(x => x.group === 'cost' && (x.unit === demo.cost.unitLabel || x.id === 'conv' || (x.id === 'cost' && x.unit.startsWith('₹'))));
  if (kp) return { source: kp.name, pts: db.kpiDaily(kp.id).filter(p => p.t >= R.from - D && p.t <= R.to).map(p => ({ t: p.t, v: p.v })) };
  const actual = sum(demo.cost.elements, e => e[1]);
  const v = volume(db, demo, R); const att = v.days.map(x => x.actual / x.plan); const m = sum(att) / (att.length || 1);
  return { source: 'derived from daily volume (fixed-cost absorption)', pts: v.days.map((x, i) => ({ t: x.t, v: r(actual * (0.65 + 0.35 * m / att[i]), actual > 100 ? 0 : 2) })) };
}

/* ---------- loss tree with ₹ impact (manufacturing) ---------- */
export function lossTree(db, demo, R) {
  const k = cfg(demo), sc = R.days / 30, n = demo.cost.lines.length || 1;
  const perHour = ((demo.production.planPerDay / 24) * (k.perUnit || 1) * (k.contrib || 0)) / n / 1e5;   /* ₹ lakh per line-hour */
  const rows = demo.cost.losses.map(l => ({ name: l[0], hours: l[1] * sc, lakh: l[1] * sc * perHour, ...lossAction(l[0]) })).sort((a, b) => b.lakh - a.lakh);
  const tot = sum(rows, x => x.lakh); let cum = 0;
  rows.forEach(x => { cum += x.lakh; x.cum = cum / tot; });
  return { rows, tot, hours: sum(rows, x => x.hours), perHour };
}

/* ---------- line comparison (manufacturing) ---------- */
export function lineTable(db, demo, R) {
  const k = cfg(demo), n = demo.cost.lines.length;
  const lines = demo.cost.lines.map(l => ({ line: l[0], a: l[1], p: l[2], q: l[3], oee: r(l[1] * l[2] * l[3] / 1e4), top: l[4] }));
  const kOee = demo.kpis.find(x => x.id === 'oee');
  const best = Math.max(...lines.map(x => x.oee));
  const target = k.oeeTarget || (kOee && kOee.target > 70 ? kOee.target : best);
  const outPerLine = ((demo.production.planPerDay * (k.perUnit || 1)) / n) * R.days;
  lines.forEach(x => { x.gap = Math.max(0, target - x.oee); x.lakh = ((outPerLine * (target / x.oee - 1)) * (k.contrib || 0)) / 1e5 * (x.gap > 0 ? 1 : 0); });
  return { lines: lines.sort((a, b) => b.lakh - a.lakh || a.oee - b.oee), target, targetLabel: k.oeeTarget || (kOee && kOee.target > 70) ? 'OEE target' : 'best line' };
}

/* ---------- remaining value: gap to target per KPI, ₹ lakh / yr ---------- */
export function valueAtStake(db, demo, R, groups) {
  return demo.kpis.filter(k => k.lakh > 0 && (!groups || groups.includes(k.group))).map(k => {
    const s = db.kpiSummary(k.id, R.from, R.to);
    const per = k.lakh / Math.abs(k.cur - k.base || 1);
    const rem = k.better === 'up' ? k.target - s.value : s.value - k.target;
    return { id: k.id, name: k.name, unit: k.unit, value: s.value, target: k.target, dec: k.dec, owner: k.owner, better: k.better, lakh: Math.max(0, rem * per) };
  }).filter(x => x.lakh > 0.5).sort((a, b) => b.lakh - a.lakh);
}

/* ---------- cost of poor quality: defects with ₹ (manufacturing) ---------- */
export function copq(demo, R) {
  const k = cfg(demo), sc = R.days / 30;
  const rows = demo.quality.defects.map(d => ({ name: d[0], count: Math.max(0, Math.round(d[1] * sc)), raw: d[1] * sc, w: (k.w && k.w[d[0]]) || 1 }));
  const tw = sum(rows, x => x.raw * x.w) || 1, total = (k.copq || 0) * sc;
  rows.forEach(x => { x.lakh = total * (x.raw * x.w) / tw; x.perCase = x.count ? (x.lakh * 1e5) / x.count : 0; const c = (k.causes || {})[x.name]; x.cause = c?.[0]; x.action = c?.[1]; x.owner = c?.[2]; });
  rows.sort((a, b) => b.lakh - a.lakh); let cum = 0;
  rows.forEach(x => { cum += x.lakh; x.cum = cum / total; });
  return { rows, total, count: sum(rows, x => x.count) };
}

/* ---------- SPC statistics on hourly data in the period (up to 30 days) ---------- */
export function spcStats(db, asset, tag, lsl, usl, R, maxDays = 30) {
  const from = Math.max(R.from, R.to - maxDays * D);
  const s = db.series(asset, tag); if (!s) return null;
  const h = db.history(asset, tag, from, R.to, 'hour');
  const v = h.points.map(p => p.v); const n = v.length || 1;
  const mean = sum(v) / n; const sd = Math.sqrt(sum(v, x => (x - mean) ** 2) / Math.max(1, n - 1)) || 1e-9;
  const cpu = usl != null ? (usl - mean) / (3 * sd) : Infinity, cpl = lsl != null ? (mean - lsl) / (3 * sd) : Infinity;
  const out = v.filter(x => (lsl != null && x < lsl) || (usl != null && x > usl)).length;
  const sorted = [...v].sort((a, b) => a - b);
  const agg = R.to - from > 3 * D ? (R.to - from > 21 * D ? 'day' : '4h') : 'hour';
  const pts = db.history(asset, tag, from, R.to, agg).points.map(p => ({ t: p.t, v: p.v }));
  return { mean, sd, cp: usl != null && lsl != null ? (usl - lsl) / (6 * sd) : null, cpk: Math.min(cpu, cpl), out, n, outPct: (out / n) * 100,
    p5: sorted[Math.floor(n * 0.05)], p95: sorted[Math.floor(n * 0.95)], min: sorted[0], max: sorted[n - 1], ucl: mean + 3 * sd, lcl: mean - 3 * sd, pts, values: v, agg, days: (R.to - from) / D };
}
export function histogram(values, lsl, usl, bins = 18) {
  const lo = Math.min(...values, lsl ?? Infinity), hi = Math.max(...values, usl ?? -Infinity);
  const w = (hi - lo) / bins || 1; const out = Array.from({ length: bins }, (_, i) => ({ x0: lo + i * w, x1: lo + (i + 1) * w, n: 0 }));
  values.forEach(v => { out[Math.min(bins - 1, Math.floor((v - lo) / w))].n++; });
  return out;
}

/* ---------- renewables: losses in MWh and ₹ ---------- */
export function genLosses(db, demo, R) {
  const k = cfg(demo), sc = R.days / 30;
  const raw = demo.cost.losses;
  const lp = demo.kpis.find(x => x.id === 'lostprod');
  const f = lp ? lp.cur / sum(raw, x => x[1]) : 1;     /* wind: loss list is in turbine-hours; scale to lost MWh */
  const rows = raw.map(l => ({ name: l[0], mwh: l[1] * f * sc, ...lossAction(l[0]) }));
  rows.forEach(x => { x.lakh = (x.mwh * 1000 * k.tariff) / 1e5; });
  rows.sort((a, b) => b.mwh - a.mwh);
  const v = volume(db, demo, R);
  const lost = sum(rows, x => x.mwh);
  return { rows, lost, lakh: sum(rows, x => x.lakh), ctrl: sum(rows.filter(x => x.ctrl), x => x.mwh), actual: v.actual, plan: v.plan, potential: v.actual + lost, days: v.days, tariff: k.tariff };
}
export function blockTable(db, demo, R, lost) {
  const k = cfg(demo); const caps = k.caps || demo.cost.lines.map(() => 1);
  const rows = demo.cost.lines.map((l, i) => ({ name: l[0], cap: caps[i], a: l[1], p: l[2], q: l[3], top: l[4], idx: l[1] * l[2] * l[3] / 1e4 }));
  const wsum = sum(rows, x => x.cap * (100 - x.idx)) || 1;
  rows.forEach(x => { x.mwh = lost * x.cap * (100 - x.idx) / wsum; x.lakh = (x.mwh * 1000 * k.tariff) / 1e5; x.perMw = x.mwh / x.cap; });
  return rows.sort((a, b) => b.perMw - a.perMw);
}
/* solar: thermography findings with energy at risk */
export function moduleFindings(demo) {
  const k = cfg(demo);
  return demo.quality.defects.map(d => { const c = (k.causes || {})[d[0]] || []; const mwh = d[1] * ((k.mwhPerCase || {})[d[0]] || 1);
    return { name: d[0], count: d[1], mwh, lakh: (mwh * 1000 * k.tariff) / 1e5, cause: c[0], action: c[1], owner: c[2] }; }).sort((a, b) => b.mwh - a.mwh);
}
/* wind: power-curve performance per turbine (deterministic) */
export function turbines(db, demo) {
  const k = cfg(demo); const pc = demo.kpis.find(x => x.id === 'pcpi'); const cuf = (demo.kpis.find(x => x.id === 'cuf')?.cur || 27) / 100;
  const evt = Object.fromEntries((demo.events || []).filter(e => e.title).map(e => [e.asset, e.title]));
  const dips = { 'JS-WTG-03': 93.4, 'MP-WTG-07': 94.6, 'KT-WTG-11': 95.3 };
  return db.assets.filter(a => /^wtg/.test(a.cls)).map(a => {
    const g = rng(hash(demo.id + 'pc' + a.id)); const rated = a.cls === 'wtg30' ? 3 : 2.1;
    const p = dips[a.id] || r(Math.min(100.4, (pc?.cur || 98) + 0.6 + (g() - 0.5) * 2.2), 1);
    const mwhMonth = rated * cuf * 720 * Math.max(0, 100 - p) / 100;
    return { id: a.id, site: a.site.name.split(' ')[0], rated, pcpi: p, mwhMonth, lakhMonth: (mwhMonth * 1000 * k.tariff) / 1e5, note: evt[a.id] };
  }).sort((a, b) => a.pcpi - b.pcpi);
}
export function powerCurve(t) {
  const rated = t.rated * 1000, out = [];
  for (let ws = 2; ws <= 16; ws += 0.5) {
    const ref = ws < 3 ? 0 : ws >= 11.5 ? rated : rated * ((ws ** 3 - 27) / (11.5 ** 3 - 27));
    const def = (100 - t.pcpi) / 100 * 2.1 * Math.exp(-(((ws - 8) / 2.6) ** 2));   /* deficit concentrated in partial load */
    out.push({ ws, ref: Math.round(ref), act: Math.round(ref * (1 - Math.min(0.4, def))) });
  }
  return out;
}

/* ---------- power plant ---------- */
export function heatRate(db, demo, R) {
  const k = cfg(demo); const nhr = db.kpiSummary('nhr', R.from, R.to);
  const rows = demo.cost.losses.map(l => { const m = l[0].match(/≈\s*([\d.]+)\s*kcal/); return { name: l[0].replace(/\s*\(≈.*\)/, ''), kcal: m ? +m[1] : 0 }; });
  const dev = sum(rows, x => x.kcal);
  const coalElem = demo.cost.elements.find(e => /coal/i.test(e[0]))?.[1] || 3245;
  const rsPerKcalMWh = coalElem / nhr.value;                       /* ₹ per MWh for each kcal/kWh */
  const v = volume(db, demo, R);
  rows.forEach(x => { x.lakh = (x.kcal * rsPerKcalMWh * v.actual) / 1e5; x.lakhYr = (x.kcal * rsPerKcalMWh * demo.production.planPerDay * 365) / 1e5; Object.assign(x, lossAction(x.name)); });
  const acts = { 'Condenser vacuum': ['Clean condenser tubes; air-ingress test; run CT cells by approach', 'Turbine in-charge'], 'Aux power excess': ['Stop CT cells by approach; BFP-A recirculation valve repair', 'Operations head'], 'Dry flue gas loss': ['Soot-blow ECO/APH by gas ΔT; fix APH seals', 'Boiler in-charge'], 'Unburnt carbon': ['Mill fineness ≥ 70 %; classifier tuning', 'Mill in-charge'], 'SH/RH spray': ['Burner tilt and soot-blowing sequence', 'Boiler in-charge'], 'Make-up water & blowdown': ['Fix passing drains; CBD on silica', 'Chemist'] };
  rows.forEach(x => { const a = Object.entries(acts).find(([n]) => x.name.startsWith(n)); if (a) { x.action = a[1][0]; x.owner = a[1][1]; } });
  rows.sort((a, b) => b.kcal - a.kcal);
  return { actual: nhr.value, target: nhr.target, design: nhr.value - dev, dev, rows, rsPerKcalMWh, gen: v.actual, lakh: sum(rows, x => x.lakh) };
}
export function combustion(demo, R) {
  const k = cfg(demo), sc = R.days / 30, rs = (cfg(demo).coalRsT || 4800);
  return demo.quality.defects.map(d => { const c = (k.comb || {})[d[0]] || []; const n = Math.round(d[1] * sc);
    return { name: d[0], count: n, lakh: n * (c[0] || 0.5), cause: c[1], action: c[2], owner: c[3] }; }).sort((a, b) => b.lakh - a.lakh);
}

/* ---------- EMS ---------- */
export function emsLosses(db, demo, R, tariff) {
  const sc = R.days / 30;
  return demo.cost.losses.map(l => ({ name: l[0], mwh: l[1] * sc, lakh: (l[1] * sc * 1000 * tariff) / 1e5, ...lossAction(l[0]) })).sort((a, b) => b.mwh - a.mwh);
}
export function pqPoints(db, demo, R) {
  const k = cfg(demo);
  return (k.pts || []).map(([asset, tag, name, limit, dir, std]) => {
    const s = spcStats(db, asset, tag, dir === 'min' ? limit : null, dir === 'max' ? limit : null, R, 183);
    if (!s) return null;
    const worst = dir === 'min' ? s.p5 : s.p95;
    const margin = dir === 'min' ? (worst - limit) : (limit - worst);
    return { asset, tag, name, limit, dir, std, mean: s.mean, worst, max: dir === 'min' ? s.min : s.max, outPct: s.outPct, margin, rel: margin / Math.abs(limit), unit: db.tagDef(asset, tag).unit };
  }).filter(Boolean).sort((a, b) => b.outPct - a.outPct || a.rel - b.rel);
}
export function pqEvents(demo, R) {
  const k = cfg(demo), sc = R.days / 30;
  return demo.quality.defects.map(d => { const c = (k.pq || {})[d[0]] || []; const n = Math.round(d[1] * sc);
    return { name: d[0], count: n, lakh: n * (c[0] || 0.2), cause: c[1], action: c[2], owner: c[3] }; }).sort((a, b) => b.lakh - a.lakh);
}
export function tagStats(db, asset, tag, R) {
  const h = db.history(asset, tag, R.from, R.to, 'hour'); const v = h.points.map(p => p.v);
  return { mean: sum(v) / (v.length || 1), min: Math.min(...v), max: Math.max(...v), unit: h.unit, v };
}
