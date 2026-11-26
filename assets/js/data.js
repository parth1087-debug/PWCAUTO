/* ==========================================================================
   Demo data. All values are illustrative.
   Change CONFIG to rename the customer, plant or presenter.
   ========================================================================== */
const CONFIG = {
  customer: 'Northstar Drive Components Ltd',
  customerShort: 'Northstar',
  plant: 'Hosur Plant',
  plantCode: 'HSR',
  user: { name: 'Anand Rao', role: 'Plant Head', initials: 'AR' },
  shift: 'Shift B',
  currency: '₹',
};

/* ---------- deterministic random ---------- */
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function series(n, base, noise, seed, opts = {}) {
  const r = rng(seed);
  const out = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v = base + (v - base) * 0.6 + (r() - 0.5) * noise;
    let val = v + (opts.trend || 0) * i;
    if (opts.rampFrom != null && i >= opts.rampFrom) val += (i - opts.rampFrom) * opts.ramp;
    if (opts.daily) val += Math.sin((i / 24) * Math.PI * 2 - 1.6) * opts.daily;
    out.push(+val.toFixed(opts.dec ?? 2));
  }
  return out;
}
const DAYS30 = Array.from({ length: 30 }, (_, i) => { const d = new Date(2026, 9, 28 + i); return d.getDate() + ' ' + d.toLocaleString('en', { month: 'short' }); });
const HOURS24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');
const MONTHS6 = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ---------- Connected systems (data sources) ---------- */
const SYSTEMS = [
  { code: 'PLC', name: 'PLCs · Siemens S7 / Mitsubishi Q', desc: 'OPC UA · 64 controllers', tags: 6240, status: 'ok' },
  { code: 'CNC', name: 'CNC · Fanuc / Siemens 840D', desc: 'FOCAS · MTConnect · 22 machines', tags: 1980, status: 'ok' },
  { code: 'SCA', name: 'SCADA · WinCC (HT shop, utilities)', desc: 'OPC DA → UA bridge', tags: 2860, status: 'ok' },
  { code: 'HIS', name: 'Plant historian', desc: '3 yrs history backfilled', tags: 12400, status: 'ok' },
  { code: 'SAP', name: 'SAP S/4HANA · PP / PM / QM / CO', desc: 'OData · RFC', tags: 0, status: 'ok', note: 'Orders, WOs, costs' },
  { code: 'MES', name: 'MES · production & genealogy', desc: 'REST · SQL', tags: 0, status: 'ok', note: 'Lots, OEE, rejects' },
  { code: 'EM', name: 'Energy & utility meters', desc: 'Modbus RTU/TCP · 186 meters', tags: 2604, status: 'ok' },
  { code: 'VIB', name: 'Vibration & temperature sensors', desc: 'Wireless · 64 nodes', tags: 448, status: 'warn', note: '2 low battery' },
  { code: 'CAM', name: 'Vision cameras', desc: '12 stations · edge GPU', tags: 96, status: 'ok' },
  { code: 'DOC', name: 'Documents · SOPs, OEM manuals, RCAs', desc: '1,284 files indexed', tags: 0, status: 'ok', note: 'Knowledge base' },
];

/* ---------- ISA-95 ontology ---------- */
const CLASS_TAGS = {
  'Fine-blanking Press': [['TONNAGE', 'Press tonnage', 'T', 362, 8], ['SPM', 'Stroke rate', 'spm', 38, 2], ['HYD_OIL_T', 'Hydraulic oil temp', '°C', 51.4, 1.5], ['MTR_I', 'Main motor current', 'A', 182, 10], ['DIE_CNT', 'Die stroke count', 'k', 412.6, 0], ['KWH', 'Energy', 'kWh', 96.2, 3]],
  'Power Press': [['TONNAGE', 'Press tonnage', 'T', 188, 6], ['SPM', 'Stroke rate', 'spm', 62, 2], ['CLUTCH_P', 'Clutch air pressure', 'bar', 5.6, 0.1], ['MTR_I', 'Main motor current', 'A', 96, 6], ['KWH', 'Energy', 'kWh', 41.8, 2]],
  'High-speed Press': [['SPM', 'Stroke rate', 'spm', 420, 8], ['TONNAGE', 'Press tonnage', 'T', 62, 3], ['LUBE_P', 'Lube pressure', 'bar', 3.1, 0.1], ['KWH', 'Energy', 'kWh', 22.4, 1]],
  'CNC Hobbing Machine': [['SPDL_RPM', 'Spindle speed', 'rpm', 1450, 20], ['SPDL_VIB', 'Spindle vibration (vel.)', 'mm/s', 2.2, 0.3], ['SPDL_T', 'Spindle bearing temp', '°C', 48, 1.5], ['HOB_LIFE', 'Hob tool life remaining', '%', 64, 0], ['CYCLE', 'Cycle time', 's', 42.5, 1.2], ['PART_CNT', 'Part count (shift)', 'pcs', 512, 0], ['KWH', 'Energy', 'kWh', 9.8, 0.5]],
  'CNC Drilling Machine': [['SPDL_RPM', 'Spindle speed', 'rpm', 2200, 30], ['CYCLE', 'Cycle time', 's', 18.2, 0.8], ['COOL_P', 'Coolant pressure', 'bar', 12.5, 0.4], ['KWH', 'Energy', 'kWh', 6.1, 0.4]],
  'Cold Heading Machine': [['SPM', 'Stroke rate', 'spm', 180, 4], ['WIRE_FEED', 'Wire feed length', 'mm', 14.2, 0.05], ['MTR_I', 'Motor current', 'A', 64, 3], ['KWH', 'Energy', 'kWh', 18.4, 1]],
  'Induction Hardening Machine': [['COIL_KW', 'Coil power', 'kW', 142, 4], ['FREQ', 'Frequency', 'kHz', 28.4, 0.3], ['QUENCH_FLOW', 'Quench water flow', 'L/min', 18.2, 0.4], ['QUENCH_T', 'Quench temp', '°C', 31.5, 0.8], ['SCAN_SPD', 'Scan speed', 'mm/s', 9.5, 0.2], ['KWH', 'Energy', 'kWh', 118, 4]],
  'Sealed Quench Furnace': [['ZONE1_T', 'Zone 1 temp', '°C', 880, 3], ['ZONE2_T', 'Zone 2 temp', '°C', 882, 3], ['CP', 'Carbon potential', '%C', 0.82, 0.02], ['ENDO_FLOW', 'Endo gas flow', 'Nm³/h', 14.2, 0.4], ['OIL_T', 'Quench oil temp', '°C', 72, 1.5], ['KWH', 'Energy', 'kWh', 212, 6]],
  'Mesh Belt Furnace': [['ZONE_T', 'Hardening zone temp', '°C', 860, 3], ['BELT_SPD', 'Belt speed', 'mm/min', 145, 2], ['BELT_MTR_I', 'Belt drive motor current', 'A', 7.8, 0.4], ['CP', 'Carbon potential', '%C', 0.78, 0.02], ['KWH', 'Energy', 'kWh', 238, 7]],
  'Tempering Furnace': [['ZONE_T', 'Temper temp', '°C', 210, 2], ['FAN_I', 'Recirculation fan current', 'A', 12.2, 0.4], ['KWH', 'Energy', 'kWh', 64, 3]],
  'Shot Blasting Machine': [['BLAST_I', 'Blast wheel current', 'A', 38, 1.5], ['CYCLE', 'Cycle time', 'min', 12, 0.3], ['KWH', 'Energy', 'kWh', 28, 1]],
  'Zinc Plating Line': [['BATH_T', 'Bath temp', '°C', 26.5, 0.4], ['CD', 'Current density', 'A/dm²', 2.1, 0.05], ['PH', 'Bath pH', 'pH', 4.9, 0.05], ['KWH', 'Energy', 'kWh', 54, 2]],
  'Chain Assembly Machine': [['SPEED', 'Assembly speed', 'links/min', 310, 6], ['RIVET_F', 'Riveting force', 'kN', 18.6, 0.4], ['PITCH_EL', 'Pitch elongation', '%', 0.04, 0.005], ['OUTPUT', 'Output (shift)', 'm', 1840, 0], ['KWH', 'Energy', 'kWh', 11.2, 0.5]],
  'Pre-stretch Machine': [['LOAD', 'Pre-stretch load', 'kN', 9.2, 0.2], ['SPEED', 'Line speed', 'm/min', 6.4, 0.2]],
  'Vision Inspection Station': [['INSP', 'Parts inspected (shift)', 'pcs', 6240, 0], ['REJ', 'Rejects (shift)', 'pcs', 118, 0], ['CONF', 'Model confidence (avg)', '%', 97.8, 0.3], ['FPS', 'Frame rate', 'fps', 24, 0.5]],
  'Hardness Tester': [['HRC', 'Last reading', 'HRC', 52.4, 0.8], ['TESTS', 'Tests today', 'nos', 142, 0]],
  'Screw Air Compressor': [['DIS_P', 'Discharge pressure', 'bar', 7.1, 0.08], ['LOAD', 'Load', '%', 82, 4], ['KW', 'Power', 'kW', 128, 5], ['FAD', 'Free air delivery', 'm³/min', 19.8, 0.6], ['OIL_T', 'Oil temp', '°C', 84, 1.5]],
  'Air Dryer': [['DEW_PT', 'Pressure dew point', '°C', 3.2, 0.3], ['KW', 'Power', 'kW', 8.4, 0.3]],
  'Transformer': [['KVA', 'Load', 'kVA', 1640, 40], ['OIL_T', 'Oil temp', '°C', 58, 1], ['WDG_T', 'Winding temp', '°C', 71, 1.5], ['PF', 'Power factor', '', 0.982, 0.003]],
  'Diesel Generator': [['STATUS', 'Run status', '', 0, 0], ['FUEL', 'Fuel level', '%', 78, 0]],
  'Cooling Tower': [['RET_T', 'Return water temp', '°C', 36.2, 0.4], ['APPROACH', 'Approach', '°C', 4.1, 0.2], ['FAN_KW', 'Fan power', 'kW', 14.6, 0.5]],
  'Chiller': [['CHW_T', 'Chilled water out', '°C', 9.1, 0.2], ['KW', 'Power', 'kW', 62, 2], ['COP', 'COP', '', 4.6, 0.1]],
  'Robot Cell': [['CYCLE', 'Cycle time', 's', 8.4, 0.3]],
};

const WU = (id, name, cls, extra = {}) => ({ id, name, level: 'Work Unit', cls, ...extra });
const ONTOLOGY = {
  id: 'ENT', name: CONFIG.customer, level: 'Enterprise', cls: 'Enterprise',
  props: { 'Legal entity': CONFIG.customer, 'Plants': '3 (Hosur, Pune, Pantnagar)', 'ERP': 'SAP S/4HANA', 'Key customers': '2W OEMs (4)' },
  children: [{
    id: 'HSR', name: CONFIG.plant, level: 'Site', cls: 'Manufacturing Site',
    props: { 'Location': 'Hosur, Tamil Nadu', 'Capacity': '1.8 M sprockets / 2.4 M chains per yr', 'Shifts': '3 × 8 h', 'Contract demand': '4,200 kVA', 'Headcount': '640', 'Certifications': 'IATF 16949 · ISO 50001' },
    children: [
      { id: 'PRS', name: 'Press Shop', level: 'Area', cls: 'Production Area', props: { 'In-charge': 'R. Kumar', 'Process': 'Blanking, fine-blanking, plate stamping' }, children: [
        { id: 'PRS-BL1', name: 'Sprocket Blanking Line 1', level: 'Work Center', cls: 'Production Line', children: [
          WU('PR-01', 'Fine-blanking Press 400T', 'Fine-blanking Press', { make: 'Feintool', crit: 'A', health: 71 }),
          WU('PR-02', 'Power Press 250T', 'Power Press', { make: 'Schuler', crit: 'B', health: 88 }),
        ] },
        { id: 'PRS-PS1', name: 'Chain Plate Stamping', level: 'Work Center', cls: 'Production Line', children: [
          WU('PR-05', 'High-speed Press 80T #1', 'High-speed Press', { make: 'Bruderer', crit: 'A', health: 90 }),
          WU('PR-06', 'High-speed Press 80T #2', 'High-speed Press', { make: 'Bruderer', crit: 'A', health: 86 }),
        ] },
      ] },
      { id: 'MCH', name: 'Machining Shop', level: 'Area', cls: 'Production Area', props: { 'In-charge': 'S. Iyer', 'Process': 'Hobbing, chamfering, drilling' }, children: [
        { id: 'MCH-SL1', name: 'Sprocket Line 1', level: 'Work Center', cls: 'Production Line', children: [
          WU('HB-01', 'CNC Hobbing Machine #1', 'CNC Hobbing Machine', { make: 'Liebherr', crit: 'A', health: 92 }),
          WU('HB-02', 'CNC Hobbing Machine #2', 'CNC Hobbing Machine', { make: 'Liebherr', crit: 'A', health: 84 }),
          WU('DR-01', 'CNC Drilling Machine #1', 'CNC Drilling Machine', { make: 'BFW', crit: 'B', health: 90 }),
        ] },
        { id: 'MCH-SL2', name: 'Sprocket Line 2', level: 'Work Center', cls: 'Production Line', children: [
          WU('HB-03', 'CNC Hobbing Machine #3', 'CNC Hobbing Machine', { make: 'Gleason', crit: 'A', health: 81 }),
          WU('HB-04', 'CNC Hobbing Machine #4', 'CNC Hobbing Machine', { make: 'Gleason', crit: 'A', health: 38 }),
          WU('DR-02', 'CNC Drilling Machine #2', 'CNC Drilling Machine', { make: 'BFW', crit: 'B', health: 87 }),
        ] },
      ] },
      { id: 'CFM', name: 'Cold Forming Shop', level: 'Area', cls: 'Production Area', props: { 'In-charge': 'M. Das', 'Process': 'Pin, bush and roller forming' }, children: [
        { id: 'CFM-PB1', name: 'Pin & Bush Line', level: 'Work Center', cls: 'Production Line', children: [
          WU('CH-11', 'Cold Header · Pins', 'Cold Heading Machine', { make: 'Sacma', crit: 'A', health: 83 }),
          WU('CH-12', 'Cold Former · Bushes', 'Cold Heading Machine', { make: 'Sacma', crit: 'A', health: 79 }),
          WU('RF-01', 'Roller Former', 'Cold Heading Machine', { make: 'National', crit: 'B', health: 91 }),
        ] },
      ] },
      { id: 'HTS', name: 'Heat Treatment Shop', level: 'Area', cls: 'Production Area', props: { 'In-charge': 'V. Menon', 'Process': 'Carburising, hardening, tempering, induction' }, children: [
        { id: 'HTS-IH', name: 'Induction Hardening Cell', level: 'Work Center', cls: 'Process Cell', children: [
          WU('IH-01', 'Induction Hardening #1', 'Induction Hardening Machine', { make: 'EFD Induction', crit: 'A', health: 89 }),
          WU('IH-02', 'Induction Hardening #2', 'Induction Hardening Machine', { make: 'EFD Induction', crit: 'A', health: 58 }),
        ] },
        { id: 'HTS-FL', name: 'Furnace Line', level: 'Work Center', cls: 'Process Cell', children: [
          WU('SQF-01', 'Sealed Quench Furnace', 'Sealed Quench Furnace', { make: 'Ipsen', crit: 'A', health: 85 }),
          WU('MBF-01', 'Mesh Belt Furnace', 'Mesh Belt Furnace', { make: 'Aichelin', crit: 'A', health: 64 }),
          WU('TF-01', 'Tempering Furnace', 'Tempering Furnace', { make: 'Aichelin', crit: 'B', health: 93 }),
        ] },
      ] },
      { id: 'SRF', name: 'Surface Treatment', level: 'Area', cls: 'Production Area', props: { 'In-charge': 'K. Patel', 'Process': 'Shot blasting, zinc plating' }, children: [
        { id: 'SRF-SB', name: 'Shot Blast', level: 'Work Center', cls: 'Process Cell', children: [WU('SB-01', 'Shot Blasting Machine', 'Shot Blasting Machine', { make: 'Gietart', crit: 'B', health: 82 })] },
        { id: 'SRF-ZP', name: 'Zinc Plating Line', level: 'Work Center', cls: 'Process Cell', children: [WU('ZP-01', 'Zinc Plating Line', 'Zinc Plating Line', { make: 'In-house', crit: 'B', health: 87 })] },
      ] },
      { id: 'ASM', name: 'Chain Assembly', level: 'Area', cls: 'Production Area', props: { 'In-charge': 'P. Reddy', 'Process': 'Assembly, pre-stretch, lubrication' }, children: [
        { id: 'ASM-A', name: 'Chain Assembly Line A', level: 'Work Center', cls: 'Production Line', children: [
          WU('CA-01', 'Chain Assembly Machine A', 'Chain Assembly Machine', { make: 'Tsubaki-type', crit: 'A', health: 86 }),
          WU('PS-01', 'Pre-stretch Machine A', 'Pre-stretch Machine', { make: 'In-house', crit: 'B', health: 90 }),
        ] },
        { id: 'ASM-B', name: 'Chain Assembly Line B', level: 'Work Center', cls: 'Production Line', children: [
          WU('CA-02', 'Chain Assembly Machine B', 'Chain Assembly Machine', { make: 'Tsubaki-type', crit: 'A', health: 77 }),
          WU('PS-02', 'Pre-stretch Machine B', 'Pre-stretch Machine', { make: 'In-house', crit: 'B', health: 89 }),
        ] },
      ] },
      { id: 'QA', name: 'Quality & Inspection', level: 'Area', cls: 'Support Area', props: { 'In-charge': 'N. Shah', 'Process': 'Vision inspection, metallurgy lab' }, children: [
        { id: 'QA-VI', name: 'Vision Inspection', level: 'Work Center', cls: 'Inspection Cell', children: [
          WU('VI-01', 'Sprocket Vision Station', 'Vision Inspection Station', { make: 'Faclon Vision AI', crit: 'A', health: 97 }),
          WU('VI-02', 'Chain Vision Station', 'Vision Inspection Station', { make: 'Faclon Vision AI', crit: 'A', health: 96 }),
          WU('VI-03', 'Plate Vision Station', 'Vision Inspection Station', { make: 'Faclon Vision AI', crit: 'B', health: 98 }),
        ] },
        { id: 'QA-LAB', name: 'Metallurgy Lab', level: 'Work Center', cls: 'Lab', children: [WU('HT-01', 'Rockwell Hardness Tester', 'Hardness Tester', { make: 'Mitutoyo', crit: 'C', health: 95 })] },
      ] },
      { id: 'UTL', name: 'Utilities', level: 'Area', cls: 'Utility Area', props: { 'In-charge': 'G. Nair', 'Process': 'Power, compressed air, cooling water' }, children: [
        { id: 'UTL-AIR', name: 'Compressed Air System', level: 'Work Center', cls: 'Utility System', children: [
          WU('AC-01', 'Screw Compressor 132 kW #1', 'Screw Air Compressor', { make: 'Atlas Copco', crit: 'A', health: 87 }),
          WU('AC-02', 'Screw Compressor 132 kW #2', 'Screw Air Compressor', { make: 'Atlas Copco', crit: 'A', health: 66 }),
          WU('AC-03', 'Screw Compressor 90 kW VSD', 'Screw Air Compressor', { make: 'Atlas Copco', crit: 'B', health: 91 }),
          WU('AD-01', 'Refrigerated Air Dryer', 'Air Dryer', { make: 'Atlas Copco', crit: 'B', health: 90 }),
        ] },
        { id: 'UTL-PWR', name: 'Power Distribution', level: 'Work Center', cls: 'Utility System', children: [
          WU('TR-01', 'Transformer 2.5 MVA #1', 'Transformer', { make: 'ABB', crit: 'A', health: 94 }),
          WU('TR-02', 'Transformer 2.5 MVA #2', 'Transformer', { make: 'ABB', crit: 'A', health: 92 }),
          WU('DG-01', 'DG Set 1,250 kVA', 'Diesel Generator', { make: 'Cummins', crit: 'B', health: 95 }),
        ] },
        { id: 'UTL-CW', name: 'Cooling Water', level: 'Work Center', cls: 'Utility System', children: [
          WU('CT-01', 'Cooling Tower', 'Cooling Tower', { make: 'Paharpur', crit: 'B', health: 84 }),
          WU('CHL-01', 'Process Chiller 120 TR', 'Chiller', { make: 'Blue Star', crit: 'B', health: 88 }),
        ] },
      ] },
    ],
  }],
};

/* relationships between work units (ontology edges) */
const RELATIONS = [
  ['PR-01', 'feeds', 'HB-01'], ['PR-01', 'feeds', 'HB-03'], ['PR-02', 'feeds', 'HB-02'], ['PR-02', 'feeds', 'HB-04'],
  ['HB-01', 'feeds', 'DR-01'], ['HB-02', 'feeds', 'DR-01'], ['HB-03', 'feeds', 'DR-02'], ['HB-04', 'feeds', 'DR-02'],
  ['DR-01', 'feeds', 'IH-01'], ['DR-02', 'feeds', 'IH-02'], ['IH-01', 'feeds', 'SB-01'], ['IH-02', 'feeds', 'SB-01'],
  ['SB-01', 'feeds', 'VI-01'], ['ZP-01', 'feeds', 'VI-01'], ['SB-01', 'feeds', 'ZP-01'],
  ['PR-05', 'feeds', 'MBF-01'], ['PR-06', 'feeds', 'MBF-01'], ['CH-11', 'feeds', 'SQF-01'], ['CH-12', 'feeds', 'SQF-01'], ['RF-01', 'feeds', 'SQF-01'],
  ['MBF-01', 'feeds', 'TF-01'], ['SQF-01', 'feeds', 'TF-01'], ['TF-01', 'feeds', 'VI-03'], ['VI-03', 'feeds', 'CA-01'], ['VI-03', 'feeds', 'CA-02'],
  ['CA-01', 'feeds', 'PS-01'], ['CA-02', 'feeds', 'PS-02'], ['PS-01', 'feeds', 'VI-02'], ['PS-02', 'feeds', 'VI-02'],
  ['AC-01', 'supplies air to', 'PR-01'], ['AC-02', 'supplies air to', 'PR-02'], ['AC-01', 'supplies air to', 'CA-01'], ['AC-02', 'supplies air to', 'CA-02'], ['AC-03', 'supplies air to', 'SB-01'], ['AC-02', 'supplies air to', 'HB-04'],
  ['CT-01', 'cools', 'IH-01'], ['CT-01', 'cools', 'IH-02'], ['CHL-01', 'cools', 'SQF-01'], ['CT-01', 'cools', 'MBF-01'],
  ['TR-01', 'powers', 'PRS'], ['TR-01', 'powers', 'MCH'], ['TR-02', 'powers', 'HTS'], ['TR-02', 'powers', 'UTL'],
  ['HT-01', 'tests', 'IH-02'], ['HT-01', 'tests', 'MBF-01'],
];

/* ---------- Plant live status (for the plant map) ---------- */
const UNIT_STATE = {
  'PR-01': 'run', 'PR-02': 'run', 'PR-05': 'run', 'PR-06': 'chg', 'HB-01': 'run', 'HB-02': 'run', 'DR-01': 'run', 'HB-03': 'run', 'HB-04': 'alarm', 'DR-02': 'idle',
  'CH-11': 'run', 'CH-12': 'run', 'RF-01': 'run', 'IH-01': 'run', 'IH-02': 'alarm', 'SQF-01': 'run', 'MBF-01': 'warn', 'TF-01': 'run', 'SB-01': 'run', 'ZP-01': 'run',
  'CA-01': 'run', 'PS-01': 'run', 'CA-02': 'chg', 'PS-02': 'idle', 'VI-01': 'run', 'VI-02': 'run', 'VI-03': 'run', 'HT-01': 'run',
  'AC-01': 'run', 'AC-02': 'warn', 'AC-03': 'run', 'AD-01': 'run', 'TR-01': 'run', 'TR-02': 'run', 'DG-01': 'idle', 'CT-01': 'run', 'CHL-01': 'run',
};
const AREA_OEE = { PRS: 76.4, MCH: 64.9, CFM: 78.2, HTS: 72.6, SRF: 81.0, ASM: 70.3, QA: null, UTL: null };

/* ---------- Agent insights (feed) ---------- */
const INSIGHTS = [
  { sev: 'bad', time: '14:52', agent: 'Asset Health Agent', cap: 'Problem detection', area: 'Machining · HB-04',
    title: 'Spindle bearing outer-race defect on HB-04, remaining life about 9 days',
    body: 'Velocity rose from 2.1 to 4.6 mm/s in 6 days. A BPFO peak at 162 Hz matches the FAG 7014 bearing. Sprocket Line 2 output is at risk.', impact: '₹4.8 L downtime avoided', prompt: 'Why is HB-04 vibration rising and what should we do?' },
  { sev: 'bad', time: '14:31', agent: 'Vision Quality Agent', cap: 'Automated RCA', area: 'Heat treatment · IH-02',
    title: 'Tooth crack rejects on 428-42T are 3.2× up since 14:10',
    body: 'The rise matches a fall in IH-02 quench water flow (18.2 → 14.6 L/min). Strainer choke is the probable cause. Confidence 0.86.', impact: '1,140 pcs at risk this shift', prompt: 'Why are tooth crack rejects up on 428-42T sprockets?' },
  { sev: 'warn', time: '13:58', agent: 'Cost Conversion Agent', cap: 'Real-time recommendations', area: 'Machining · Sprocket Line 2',
    title: 'Sprocket Line 2 OEE is 58 % this shift (target 75 %)',
    body: '62 % of the loss is HB-04 micro-stops. 23 % is a 428→520 changeover that took 74 min (standard 35 min).', impact: '₹1.9 L/shift', prompt: 'Why did OEE on Sprocket Line 2 drop this shift?' },
  { sev: 'warn', time: '13:20', agent: 'Energy & Utilities Agent', cap: 'Problem detection', area: 'Utilities · Compressed air',
    title: 'Air leak load at 14 % during lunch break',
    body: 'AC-02 stayed loaded at 41 % with production stopped. Estimated leak is 3.1 m³/min. The top suspects are in the Press Shop header.', impact: '₹18.6 L/yr', prompt: 'How much compressed air are we losing to leaks?' },
  { sev: 'info', time: '12:05', agent: 'Shift Report Agent', cap: 'Notes and reports', area: 'Plant',
    title: 'Shift A report sent to 14 people',
    body: 'Output 96.2 % of plan. 3 losses above ₹50k. 2 open actions carried over to Shift B.', impact: '', prompt: 'Write the shift report for Shift A' },
  { sev: 'good', time: '11:40', agent: 'Maintenance Planner Agent', cap: 'Automated planning', area: 'Heat treatment · MBF-01',
    title: 'Belt drive inspection moved into Sunday shutdown',
    body: 'Motor current trend shows rising belt drag. The job fits the planned 6 h window, so no production loss.', impact: '₹2.2 L saved', prompt: 'Plan maintenance for this Sunday shutdown' },
];

/* ---------- Maintenance ---------- */
const ASSETS = [
  { id: 'HB-04', name: 'CNC Hobbing Machine #4', area: 'Machining · Sprocket Line 2', crit: 'A', health: 38, anomaly: 'Spindle bearing BPFO', rul: 9, nextPm: '02 Dec', state: 'Alarm', kpi: 'Vib 4.6 mm/s' },
  { id: 'IH-02', name: 'Induction Hardening #2', area: 'Heat Treatment · IH Cell', crit: 'A', health: 58, anomaly: 'Low quench flow', rul: 21, nextPm: '05 Dec', state: 'Alarm', kpi: 'Flow 14.6 L/min' },
  { id: 'MBF-01', name: 'Mesh Belt Furnace', area: 'Heat Treatment · Furnace Line', crit: 'A', health: 64, anomaly: 'Belt drive drag', rul: 34, nextPm: '30 Nov', state: 'Watch', kpi: 'Belt motor 9.1 A' },
  { id: 'AC-02', name: 'Screw Compressor #2', area: 'Utilities · Compressed Air', crit: 'A', health: 66, anomaly: 'High oil temp', rul: 40, nextPm: '08 Dec', state: 'Watch', kpi: 'Oil 96 °C' },
  { id: 'PR-01', name: 'Fine-blanking Press 400T', area: 'Press Shop · Blanking L1', crit: 'A', health: 71, anomaly: 'Hydraulic oil temp drift', rul: 52, nextPm: '12 Dec', state: 'Watch', kpi: 'Oil 56.8 °C' },
  { id: 'CA-02', name: 'Chain Assembly Machine B', area: 'Chain Assembly · Line B', crit: 'A', health: 77, anomaly: 'Riveting force spread', rul: 68, nextPm: '10 Dec', state: 'Normal', kpi: 'σ 0.9 kN' },
  { id: 'CH-12', name: 'Cold Former · Bushes', area: 'Cold Forming · Pin & Bush', crit: 'A', health: 79, anomaly: '—', rul: 85, nextPm: '15 Dec', state: 'Normal', kpi: 'Current 64 A' },
  { id: 'HB-03', name: 'CNC Hobbing Machine #3', area: 'Machining · Sprocket Line 2', crit: 'A', health: 81, anomaly: '—', rul: 96, nextPm: '18 Dec', state: 'Normal', kpi: 'Vib 2.4 mm/s' },
  { id: 'SQF-01', name: 'Sealed Quench Furnace', area: 'Heat Treatment · Furnace Line', crit: 'A', health: 85, anomaly: '—', rul: 120, nextPm: '22 Dec', state: 'Normal', kpi: 'CP 0.82 %C' },
  { id: 'HB-01', name: 'CNC Hobbing Machine #1', area: 'Machining · Sprocket Line 1', crit: 'A', health: 92, anomaly: '—', rul: 140, nextPm: '28 Dec', state: 'Normal', kpi: 'Vib 1.9 mm/s' },
];

const ASSET_DETAIL = {
  'HB-04': {
    sub: 'Gleason · Sprocket Line 2 · Criticality A', facts: [['Spindle vibration', '4.6 mm/s'], ['Bearing temp', '61 °C'], ['Remaining life', '9 days'], ['Running hours', '18,420 h']],
    chartTitle: 'Spindle vibration velocity, last 30 days (ISO 10816 zones)', unit: ' mm/s',
    series: [{ name: 'Spindle vibration', color: 'var(--c1)', data: series(30, 2.1, 0.25, 11, { rampFrom: 22, ramp: 0.33 }) }],
    bands: [{ from: 0, to: 2.8, color: 'var(--good)', label: 'Zone A/B' }, { from: 2.8, to: 4.5, color: 'var(--warn)', label: 'Zone C' }, { from: 4.5, to: 8, color: 'var(--bad)', label: 'Zone D' }],
    yMin: 0, yMax: 6,
    rca: {
      title: 'Outer-race defect on front spindle bearing (FAG 7014)',
      points: ['FFT shows a BPFO peak at 162 Hz with 2× and 3× harmonics. It matches the bearing geometry at 1,450 rpm.', 'Bearing temp is up 13 °C in 6 days. Lube pressure is normal, so it is not a lubrication fault.', 'The same failure on HB-02 in March 2025 led to 31 h of breakdown (RCA-2025-017).', 'A spare bearing is in stock in SAP (MM 400221, 2 nos, store B-14).'],
      reco: 'Replace the bearing in the planned 4 h window on Saturday Shift C. Until then, cut the feed rate by 8 %.',
    },
  },
  'IH-02': {
    sub: 'EFD Induction · IH Cell · Criticality A', facts: [['Quench flow', '14.6 L/min'], ['Quench temp', '35.8 °C'], ['Coil power', '142 kW'], ['Remaining life', '21 days']],
    chartTitle: 'Quench water flow, last 30 days', unit: ' L/min',
    series: [{ name: 'Quench flow', color: 'var(--c1)', data: series(30, 18.2, 0.4, 21, { rampFrom: 25, ramp: -0.7 }) }],
    thresholds: [{ value: 16, label: 'Min. flow 16 L/min' }],
    rca: { title: 'Quench strainer choke (scale build-up)', points: ['Flow fell 20 % in 5 h while pump current stayed the same, which points to a restriction downstream of the pump.', 'Cooling tower make-up water hardness has been high since 21 Nov (LIMS).', 'Hardness readings on 428-42T fell to 49.8 HRC (spec 50–55).'], reco: 'Clean the quench strainer and descale the ring nozzle in a 45 min stop. Hold the parts made since 14:10 for 100 % hardness check.' },
  },
  'MBF-01': {
    sub: 'Aichelin · Furnace Line · Criticality A', facts: [['Belt motor current', '9.1 A'], ['Belt speed', '145 mm/min'], ['Zone temp', '861 °C'], ['Remaining life', '34 days']],
    chartTitle: 'Belt drive motor current, last 30 days', unit: ' A',
    series: [{ name: 'Belt motor current', color: 'var(--c1)', data: series(30, 7.8, 0.2, 31, { trend: 0.045 }) }],
    thresholds: [{ value: 9.8, label: 'Alarm 9.8 A' }],
    rca: { title: 'Rising belt drag, probable roller bearing wear', points: ['Current is up 17 % in 30 days at constant belt speed and load.', 'Return-side roller R7 temperature is 22 °C above the others (thermal scan from 18 Nov).'], reco: 'Inspect and lubricate the return rollers in the Sunday shutdown. The planner has already added this job.' },
  },
  'AC-02': {
    sub: 'Atlas Copco · Compressed Air · Criticality A', facts: [['Oil temp', '96 °C'], ['Load', '88 %'], ['Specific power', '6.9 kW/m³/min'], ['Remaining life', '40 days']],
    chartTitle: 'Compressor oil temperature, last 30 days', unit: ' °C',
    series: [{ name: 'Oil temp', color: 'var(--c1)', data: series(30, 86, 1.5, 41, { trend: 0.3 }) }],
    thresholds: [{ value: 100, label: 'Trip 100 °C' }],
    rca: { title: 'Oil cooler fouling', points: ['Oil temp minus ambient temp rose from 52 to 63 °C.', 'Specific power is 9 % worse than AC-01.'], reco: 'Clean the oil cooler and change the oil filter. The work fits in tomorrow when AC-03 can carry the load.' },
  },
  'PR-01': {
    sub: 'Feintool · Blanking Line 1 · Criticality A', facts: [['Hydraulic oil temp', '56.8 °C'], ['Tonnage', '362 T'], ['Die strokes', '412.6 k'], ['Remaining life', '52 days']],
    chartTitle: 'Hydraulic oil temperature, last 30 days', unit: ' °C',
    series: [{ name: 'Oil temp', color: 'var(--c1)', data: series(30, 51.5, 0.8, 51, { trend: 0.17 }) }],
    thresholds: [{ value: 60, label: 'Alarm 60 °C' }],
    rca: { title: 'Heat exchanger effectiveness down', points: ['Oil temp rises 0.17 °C per day with the same load.', 'Cooling water ΔT across the exchanger fell from 6.1 to 4.4 °C.'], reco: 'Backflush the oil cooler during the next die change.' },
  },
};
function defaultDetail(a) {
  const base = parseFloat(a.kpi.replace(/[^0-9.]/g, '')) || 50;
  return {
    sub: `${a.area} · Criticality ${a.crit}`, facts: [['Health', a.health], ['Remaining life', a.rul + ' days'], ['Next PM', a.nextPm], ['State', a.state]],
    chartTitle: 'Key condition parameter, last 30 days', unit: '',
    series: [{ name: a.kpi.split(' ')[0], color: 'var(--c1)', data: series(30, base, base * 0.03, a.id.length * 7) }],
    rca: { title: 'No anomaly in the last 30 days', points: ['All monitored parameters are inside their learned normal bands.'], reco: 'Continue with the PM calendar.' },
  };
}

const WORK_ORDERS = [
  { no: '4100 8821', asset: 'HB-04', type: 'PdM', desc: 'Replace front spindle bearing FAG 7014', status: 'Awaiting approval', by: 'Asset Health Agent', due: '29 Nov' },
  { no: '4100 8817', asset: 'IH-02', type: 'CM', desc: 'Clean quench strainer, descale ring nozzle', status: 'In progress', by: 'Vision Quality Agent', due: 'Today' },
  { no: '4100 8809', asset: 'MBF-01', type: 'PdM', desc: 'Inspect return rollers R5–R9, lubricate', status: 'Scheduled', by: 'Maintenance Planner Agent', due: '30 Nov' },
  { no: '4100 8790', asset: 'AC-02', type: 'PdM', desc: 'Clean oil cooler, change oil filter', status: 'Scheduled', by: 'Energy & Utilities Agent', due: '27 Nov' },
  { no: '4100 8774', asset: 'CA-02', type: 'PM', desc: 'Quarterly PM · riveting head', status: 'Completed', by: 'SAP PM schedule', due: '25 Nov' },
];

/* ---------- Cost conversion ---------- */
const COST = {
  monthly: {
    labels: MONTHS6,
    series: [
      { name: 'Power & fuel', color: 'var(--c1)', data: [10.2, 10.6, 10.9, 11.1, 11.4, 11.8] },
      { name: 'Labour', color: 'var(--c2)', data: [9.6, 9.6, 9.7, 9.8, 9.9, 9.9] },
      { name: 'Tooling', color: 'var(--c3)', data: [4.8, 5.0, 5.1, 5.3, 5.6, 5.7] },
      { name: 'Consumables', color: 'var(--c4)', data: [3.1, 3.1, 3.2, 3.2, 3.3, 3.3] },
      { name: 'Maintenance', color: 'var(--c5)', data: [3.2, 3.3, 3.5, 3.4, 3.7, 3.8] },
      { name: 'Scrap & rework', color: 'var(--c6)', data: [3.2, 3.1, 3.4, 3.5, 3.6, 3.9] },
    ],
  },
  bridge: [
    { label: 'Power & fuel', value: 1.4 }, { label: 'Tooling', value: 0.9 }, { label: 'Scrap & rework', value: 0.6 },
    { label: 'Maintenance', value: 0.4 }, { label: 'Labour', value: 0.3 }, { label: 'Volume effect', value: -0.2 },
  ],
  lines: [
    { line: 'Blanking Line 1', a: 88.1, p: 91.4, q: 98.6, loss: 'Die change 38 min' },
    { line: 'Plate Stamping', a: 86.4, p: 93.0, q: 99.1, loss: 'Coil change' },
    { line: 'Sprocket Line 1', a: 84.2, p: 88.6, q: 97.9, loss: 'Hob change' },
    { line: 'Sprocket Line 2', a: 71.3, p: 84.1, q: 96.8, loss: 'HB-04 micro-stops' },
    { line: 'Pin & Bush Line', a: 89.0, p: 90.2, q: 97.4, loss: 'Wire coil change' },
    { line: 'Furnace Line', a: 92.6, p: 82.4, q: 98.8, loss: 'Under-loaded trays' },
    { line: 'Chain Assembly A', a: 85.7, p: 87.3, q: 98.2, loss: 'Plate feeding jams' },
    { line: 'Chain Assembly B', a: 79.4, p: 86.0, q: 97.5, loss: 'Changeover 52 min' },
  ],
  losses: [
    { label: 'Breakdowns', value: 182 }, { label: 'Setup & changeover', value: 164 }, { label: 'Minor stops', value: 131 },
    { label: 'Reduced speed', value: 96 }, { label: 'Production rejects', value: 58 }, { label: 'Start-up rejects', value: 21 },
  ],
  parts: [
    { pn: 'SPK-428-42T', desc: 'Rear sprocket 428 · 42T', vol: '148k', std: 61.4, act: 66.2 },
    { pn: 'SPK-428-14T', desc: 'Drive sprocket 428 · 14T', vol: '162k', std: 18.9, act: 19.6 },
    { pn: 'SPK-520-38T', desc: 'Rear sprocket 520 · 38T', vol: '41k', std: 78.5, act: 84.1 },
    { pn: 'CHN-428H-118L', desc: 'Drive chain 428H · 118 links', vol: '186k', std: 142.0, act: 147.8 },
    { pn: 'CHN-520-108L', desc: 'Drive chain 520 · 108 links', vol: '38k', std: 188.4, act: 191.2 },
    { pn: 'KIT-428-STD', desc: 'Chain & sprocket kit 428', vol: '96k', std: 238.0, act: 251.5 },
  ],
  recos: [
    { title: 'SMED on Sprocket Line 2 changeover (428 → 520)', body: 'Pre-stage the hob arbor and use a standard fixture. Last 8 changeovers took 52–74 min against 35 min standard.', impact: '₹38 L/yr', cap: 'Real-time recommendations' },
    { title: 'Raise furnace tray loading from 78 % to 92 %', body: 'Batch pin and bush lots of the same recipe across shifts. The plan is already in the Day-ahead plan.', impact: '₹27 L/yr', cap: 'Automated planning' },
    { title: 'Extend hob life by regrind at 85 % wear, not 100 %', body: 'Hob cost per 1,000 pcs is 21 % lower on HB-01, which follows this practice.', impact: '₹14 L/yr', cap: 'Real-time recommendations' },
  ],
};

/* ---------- Quality ---------- */
const QUALITY = {
  pareto: [
    { label: 'Tooth crack (HT)', value: 412 }, { label: 'Burr on tooth tip', value: 356 }, { label: 'Tooth profile error', value: 214 },
    { label: 'Dent / handling mark', value: 168 }, { label: 'Plating patch', value: 121 }, { label: 'Pitch length NG', value: 96 }, { label: 'Rust spot', value: 54 },
  ],
  fpy: series(30, 97.6, 0.5, 71),
  ppm: series(30, 42, 6, 72),
  hardness: (() => { const d = series(40, 52.6, 0.9, 81); for (let i = 33; i < 40; i++) d[i] = +(d[i] - (i - 32) * 0.42).toFixed(2); return d; })(),
  stations: [
    { id: 'VI-01', name: 'Sprocket Vision Station', part: 'SPK-428-42T', rate: '42 pcs/min', reject: '2.8 %', state: 'run' },
    { id: 'VI-02', name: 'Chain Vision Station', part: 'CHN-428H-118L', rate: '310 links/min', reject: '0.6 %', state: 'run' },
    { id: 'VI-03', name: 'Plate Vision Station', part: 'PLT-428-IN', rate: '380 pcs/min', reject: '0.4 %', state: 'run' },
  ],
  defects: ['Tooth crack', 'Burr on tooth tip', 'Tooth profile error', 'Dent', 'Plating patch'],
};

/* ---------- Energy ---------- */
const ENERGY = {
  byArea: [
    { label: 'Heat Treatment', value: 17840, color: 'var(--c1)' }, { label: 'Utilities (air, water)', value: 9620, color: 'var(--c3)' },
    { label: 'Press Shop', value: 7310, color: 'var(--c2)' }, { label: 'Machining', value: 5480, color: 'var(--c4)' },
    { label: 'Cold Forming', value: 3960, color: 'var(--c6)' }, { label: 'Others', value: 4410, color: 'var(--c5)' },
  ],
  loadProfile: series(24, 2950, 160, 91, { daily: 520, dec: 0 }),
  heat: WEEKDAYS.map((d, di) => HOURS24.map((h, hi) => { const r = rng(di * 31 + hi)(); const work = di < 6 ? 1 : 0.35; return Math.round((1500 + Math.sin(((hi - 4) / 24) * Math.PI * 2) * 500 + 1200 * work + r * 300) * (hi < 6 && di === 6 ? 0.6 : 1)); })),
  sec: series(30, 1.92, 0.05, 93),
  utilities: [
    { asset: 'AC-01 · Screw 132 kW', kpi: '6.3 kW/m³/min', load: 84, state: 'ok', note: 'Base load' },
    { asset: 'AC-02 · Screw 132 kW', kpi: '6.9 kW/m³/min', load: 88, state: 'warn', note: 'Oil cooler fouled' },
    { asset: 'AC-03 · VSD 90 kW', kpi: '5.8 kW/m³/min', load: 61, state: 'ok', note: 'Trim' },
    { asset: 'SQF-01 · Sealed quench', kpi: '412 kWh/t', load: 86, state: 'ok', note: 'Design 395 kWh/t' },
    { asset: 'MBF-01 · Mesh belt', kpi: '468 kWh/t', load: 78, state: 'warn', note: 'Under-loaded' },
    { asset: 'CT-01 · Cooling tower', kpi: 'Approach 4.1 °C', load: 70, state: 'ok', note: '' },
    { asset: 'CHL-01 · Chiller 120 TR', kpi: 'COP 4.6', load: 66, state: 'ok', note: '' },
  ],
  opps: [
    { title: 'Fix compressed air leaks in Press Shop header', body: 'Leak load is 14 % when production stops. 9 leak points are tagged from the night acoustic survey.', impact: '₹18.6 L/yr', cap: 'Problem detection' },
    { title: 'Move MBF-01 warm-up out of the peak ToD window', body: 'Start warm-up at 04:30, not 06:00. This takes 640 kW out of the 06:00–09:00 peak tariff.', impact: '₹11.2 L/yr', cap: 'Automated planning' },
    { title: 'Turn furnaces to idle mode on Sunday', body: 'SQF-01 and TF-01 stay at full temperature on non-production Sundays.', impact: '₹9.4 L/yr', cap: 'Real-time recommendations' },
  ],
};

/* ---------- Agents on Bruce ---------- */
const AGENTS = [
  { id: 'asset', name: 'Asset Health Agent', icon: 'pulse', domain: 'Asset Maintenance',
    purpose: 'Watches vibration, temperature, current and process signals on 214 assets. Finds a fault early, names the failure mode and gives the remaining life.',
    caps: ['Problem detection', 'Automated RCA', 'Real-time recommendations'], skills: ['FFT bearing diagnosis', 'Remaining life model', 'Failure mode library (ISO 14224)'],
    tools: ['Historian', 'Vibration sensors', 'SAP PM', 'Ontology', 'OEM manuals'], autonomy: 'Advise', runs: 1284, acc: '94 %', resp: '6.2 s', status: 'Running',
    prompt: 'Why is HB-04 vibration rising and what should we do?' },
  { id: 'planner', name: 'Maintenance Planner Agent', icon: 'calendar', domain: 'Asset Maintenance',
    purpose: 'Builds the weekly maintenance plan from asset health, the production plan, spares and manpower. Raises SAP PM work orders after approval.',
    caps: ['Automated planning', 'Automate tasks'], skills: ['Shutdown window planning', 'Spares check', 'Work order drafting'],
    tools: ['SAP PM', 'SAP MM', 'MES plan', 'Ontology'], autonomy: 'Act with approval', runs: 212, acc: '—', resp: '11.8 s', status: 'Running',
    prompt: 'Plan maintenance for this Sunday shutdown' },
  { id: 'cost', name: 'Cost Conversion Agent', icon: 'rupee', domain: 'Productivity & Cost',
    purpose: 'Calculates OEE and conversion cost per kg and per part in real time. Explains each variance against budget and the six big losses.',
    caps: ['Data retrieval', 'Automated RCA', 'Real-time recommendations', 'Dashboards on demand'], skills: ['OEE loss tree', 'Cost bridge', 'SMED analysis'],
    tools: ['MES', 'PLC / CNC', 'SAP CO', 'SAP PP', 'Energy meters'], autonomy: 'Advise', runs: 846, acc: '—', resp: '7.4 s', status: 'Running',
    prompt: 'Why did OEE on Sprocket Line 2 drop this shift?' },
  { id: 'vision', name: 'Vision Quality Agent', icon: 'eye', domain: 'Quality · AI Vision',
    purpose: 'Runs defect models on 12 camera stations. Links each defect trend to process parameters upstream so the cause is fixed, not only the part.',
    caps: ['Problem detection', 'Automated RCA', 'Automate tasks'], skills: ['Defect classification (CV)', 'Process–defect correlation', '8D draft'],
    tools: ['Vision cameras', 'Historian', 'SAP QM', 'MES genealogy', 'Ontology'], autonomy: 'Act with approval', runs: 2106, acc: '98.1 %', resp: '4.9 s', status: 'Running',
    prompt: 'Why are tooth crack rejects up on 428-42T sprockets?' },
  { id: 'energy', name: 'Energy & Utilities Agent', icon: 'bolt', domain: 'Energy & Utilities',
    purpose: 'Tracks energy per kg, max demand, ToD tariff, compressed air, furnaces and cooling water. Finds waste and plans loads to cut the bill.',
    caps: ['Problem detection', 'Real-time recommendations', 'Automated planning'], skills: ['Air leak estimation', 'ToD load shifting', 'Furnace SEC benchmark'],
    tools: ['Energy meters', 'SCADA', 'Utility meters', 'Tariff model', 'Ontology'], autonomy: 'Advise', runs: 964, acc: '—', resp: '5.6 s', status: 'Running',
    prompt: 'How much compressed air are we losing to leaks?' },
  { id: 'report', name: 'Shift Report Agent', icon: 'doc', domain: 'Plant-wide',
    purpose: 'Writes the shift, daily and monthly reports from plant data and sends them to the right people. Carries open actions to the next shift.',
    caps: ['Notes and reports', 'Data retrieval'], skills: ['Shift report', 'Daily MIS', 'Action tracker'],
    tools: ['MES', 'SAP', 'Historian', 'Email / Teams'], autonomy: 'Act', runs: 93, acc: '—', resp: '18.3 s', status: 'Running',
    prompt: 'Write the shift report for Shift A' },
];

const AGENT_RUNS = [
  { t: '14:52:08', agent: 'Asset Health Agent', trigger: 'Anomaly · HB-04 vibration', tools: 'Historian · FFT · SAP PM', out: 'Diagnosis + WO draft', state: 'Awaiting approval' },
  { t: '14:31:44', agent: 'Vision Quality Agent', trigger: 'Defect rate > 3σ · VI-01', tools: 'Vision · Historian · SAP QM', out: 'RCA · lot hold raised', state: 'Done' },
  { t: '14:10:12', agent: 'Cost Conversion Agent', trigger: 'User · A. Rao (Copilot)', tools: 'MES · PLC · SAP CO', out: 'OEE loss tree', state: 'Done' },
  { t: '13:58:30', agent: 'Cost Conversion Agent', trigger: 'Rule · OEE < 65 %', tools: 'MES · CNC', out: 'Alert to S. Iyer', state: 'Done' },
  { t: '13:20:02', agent: 'Energy & Utilities Agent', trigger: 'Schedule · break-time scan', tools: 'Energy meters · SCADA', out: 'Leak estimate', state: 'Done' },
  { t: '12:05:00', agent: 'Shift Report Agent', trigger: 'Schedule · end of Shift A', tools: 'MES · SAP · Teams', out: 'Report sent to 14', state: 'Done' },
  { t: '11:40:51', agent: 'Maintenance Planner Agent', trigger: 'Health change · MBF-01', tools: 'SAP PM · MES plan', out: 'WO 4100 8809 scheduled', state: 'Done' },
  { t: '11:02:19', agent: 'Asset Health Agent', trigger: 'User · V. Menon (Copilot)', tools: 'Historian · Ontology', out: 'Furnace health summary', state: 'Done' },
];
