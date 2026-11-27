import { makeAgents, PLANTDB_TOOLS as T } from '../common.js';

const UNS = 'vardhan/api-unit-3';
export default {
  id: 'pharma-api', name: 'Pharma API', industry: 'Active pharmaceutical ingredients · multi-step synthesis, USFDA / EU-GMP',
  company: 'Vardhan Life Sciences', companySlug: 'vardhan', site: 'API Unit 3', siteSlug: 'api-unit-3', location: 'JN Pharma City, Visakhapatnam',
  production: { unit: 'kg API', planPerDay: 420, label: 'Sartans and anti-diabetic APIs (5-stage synthesis)', massUnit: 'kg' },
  classes: {
    reactor: { label: 'Reactor', src: 'dcs', tags: [
      ['mass_temp', 'Mass temperature', '°C', 45, 0.6, 2.5, 0, 55], ['jacket_temp', 'Jacket outlet temperature', '°C', 32, 0.8, 3],
      ['pressure', 'Reactor pressure', 'barg', 0.25, 0.02, 0, -0.9, 1.5], ['agitator_current', 'Agitator motor current', 'A', 18.4, 0.5, 0.8, 0, 24], ['ph', 'Reaction mass pH', 'pH', 7.2, 0.08, 0, 6.5, 8.0]] },
    centrifuge: { label: 'Basket centrifuge', src: 'dcs', tags: [
      ['speed', 'Basket speed', 'rpm', 1150, 12, 40], ['vibration', 'Bearing vibration', 'mm/s', 2.6, 0.2, 0.15, 0, 7.1], ['current', 'Main drive current', 'A', 42, 1.2, 2],
      ['cake_lod', 'Wet cake LOD', '%', 14.5, 0.6, 0, 0, 20, 'lims']] },
    anfd: { label: 'Agitated nutsche filter-dryer', src: 'dcs', tags: [
      ['vacuum', 'Vacuum', 'mbar', 45, 2, 0, 0, 80], ['product_temp', 'Product temperature', '°C', 52, 0.7, 0, 0, 60], ['torque', 'Agitator torque', '%', 38, 1.5, 2],
      ['lod', 'Loss on drying', '%', 0.32, 0.03, 0, 0, 0.5, 'lims']] },
    vtd: { label: 'Vacuum tray dryer', src: 'dcs', tags: [
      ['vacuum', 'Chamber vacuum', 'mbar', 30, 1.5, 0, 0, 60], ['shelf_temp', 'Shelf temperature', '°C', 55, 0.5, 0, 0, 62], ['lod', 'Loss on drying', '%', 0.28, 0.03, 0, 0, 0.5, 'lims']] },
    rcvd: { label: 'Rotary cone vacuum dryer', src: 'dcs', tags: [
      ['vacuum', 'Vacuum', 'mbar', 25, 1.2, 0, 0, 50], ['jacket_temp', 'Hot-water jacket temperature', '°C', 65, 0.6, 0, 0, 72],
      ['dry_time', 'Time to LOD endpoint', 'h', 14, 0.4, 0, 0, 18, 'mes'], ['lod', 'Loss on drying', '%', 0.35, 0.03, 0, 0, 0.5, 'lims']] },
    mill: { label: 'Multi-mill', src: 'dcs', tags: [
      ['speed', 'Rotor speed', 'rpm', 2850, 20, 0], ['current', 'Motor current', 'A', 11.2, 0.4, 0.6, 0, 15], ['energy', 'Energy', 'kWh', 8.5, 0.5, 2, null, null, 'ems']] },
    column: { label: 'Distillation column', src: 'dcs', tags: [
      ['dp', 'Column differential pressure', 'mbar', 28, 1.2, 1.5, 0, 45], ['top_temp', 'Column top temperature', '°C', 64.5, 0.3, 0.4],
      ['reflux_ratio', 'Reflux ratio', 'R/D', 2.4, 0.06, 0], ['purity', 'Recovered methanol purity', '%', 99.6, 0.08, 0, 99.0, 100, 'lims'], ['steam', 'Reboiler steam', 'kg/h', 620, 15, 20]] },
    condenser: { label: 'Condenser', src: 'dcs', tags: [
      ['vent_temp', 'Vent gas temperature', '°C', 12, 0.5, 1, 0, 20], ['cw_dt', 'Cooling water ΔT', '°C', 6.2, 0.25, 0.6]] },
    ahu: { label: 'Cleanroom AHU', src: 'bms', tags: [
      ['room_dp', 'Room differential pressure', 'Pa', 15, 0.6, 0, 10, 30], ['rh', 'Room relative humidity', '%', 42, 1.2, 2.5, 30, 55], ['room_temp', 'Room temperature', '°C', 22, 0.3, 0.6, 18, 25],
      ['energy', 'Energy', 'kWh', 48, 2, 6, null, null, 'ems']] },
    chiller: { label: 'Chiller', src: 'ems', tags: [
      ['supply_temp', 'Chilled water supply temperature', '°C', 7, 0.2, 0.3, 4, 10, 'dcs'], ['cop', 'Coefficient of performance', 'COP', 5.1, 0.12, 0.25, 4.2, 7], ['power', 'Compressor power', 'kW', 182, 6, 22]] },
    brine: { label: 'Brine plant', src: 'dcs', tags: [
      ['supply_temp', 'Brine supply temperature', '°C', -15, 0.4, 0.5, -22, -10], ['flow', 'Brine flow', 'm³/h', 38, 1.2, 3], ['power', 'Compressor power', 'kW', 145, 5, 15, null, null, 'ems']] },
    boiler: { label: 'Steam boiler', src: 'dcs', tags: [
      ['steam', 'Steam generation', 'kg/h', 4200, 120, 450], ['pressure', 'Steam header pressure', 'barg', 10.2, 0.12, 0.2, 8.5, 11.5], ['efficiency', 'Boiler efficiency', '%', 82, 0.8, 0, 76, 100, 'ems']] },
    n2gen: { label: 'Nitrogen generator', src: 'dcs', tags: [
      ['purity', 'Nitrogen purity', '%', 99.95, 0.01, 0, 99.9, 100], ['o2', 'Residual oxygen', 'ppm', 280, 25, 30, 0, 500], ['flow', 'Nitrogen flow', 'Nm³/h', 165, 6, 18]] },
    ctower: { label: 'Cooling tower', src: 'dcs', tags: [
      ['return_temp', 'Cooling water return temperature', '°C', 36.5, 0.4, 1.2, 0, 40], ['approach', 'Approach', '°C', 4.1, 0.2, 0.5], ['fan_power', 'Fan power', 'kW', 30, 1.5, 3, null, null, 'ems']] },
    incomer: { label: 'Main incomer', src: 'ems', tags: [
      ['load', 'Load', 'kVA', 2350, 60, 280], ['energy', 'Energy', 'kWh', 1980, 55, 240], ['pf', 'Power factor', 'PF', 0.97, 0.005, 0, 0.92, 1]] },
  },
  areas: [
    { id: 'reaction', name: 'Reaction', lines: [{ id: 'reactor-bay', name: 'Reactor bay (Block B)', assets: [
      ['R-101', 'Glass-lined reactor 6 KL', 'reactor', 'A'], ['R-102', 'Glass-lined reactor 4 KL', 'reactor', 'A'], ['R-103', 'SS 316 reactor 6 KL', 'reactor', 'A'], ['R-104', 'SS 316 reactor 3 KL', 'reactor', 'B']] }] },
    { id: 'isolation', name: 'Isolation', lines: [{ id: 'isolation-suite', name: 'Isolation suite', assets: [
      ['CF-201', 'Top-discharge centrifuge 48"', 'centrifuge', 'A'], ['CF-202', 'Top-discharge centrifuge 48"', 'centrifuge', 'A'], ['ANFD-201', 'ANFD 2.5 m²', 'anfd', 'A']] }] },
    { id: 'drying', name: 'Drying & milling', lines: [{ id: 'drying-suite', name: 'Drying suite', assets: [
      ['VTD-301', 'Vacuum tray dryer 48 trays', 'vtd', 'B'], ['RCVD-301', 'Rotary cone vacuum dryer 3 KL', 'rcvd', 'A'], ['MM-301', 'Multi-mill', 'mill', 'B']] }] },
    { id: 'solvent-recovery', name: 'Solvent recovery', lines: [{ id: 'srp', name: 'Solvent recovery plant', assets: [
      ['DC-401', 'Packed distillation column (methanol)', 'column', 'A'], ['CN-401', 'Primary condenser 40 m²', 'condenser', 'B']] }] },
    { id: 'clean-room', name: 'Clean room & packing', lines: [{ id: 'grade-d', name: 'Grade D powder processing', assets: [
      ['AHU-501', 'AHU · milling & sifting room', 'ahu', 'A'], ['AHU-502', 'AHU · packing room', 'ahu', 'B']] }] },
    { id: 'utilities', name: 'Utilities', lines: [{ id: 'utility-block', name: 'Utility block', assets: [
      ['CH-601', 'Screw chiller 300 TR', 'chiller', 'A'], ['BR-601', 'Brine plant −20 °C, 120 TR', 'brine', 'A'], ['BL-601', 'Coal-fired boiler 6 TPH', 'boiler', 'A'],
      ['NG-601', 'PSA nitrogen generator 200 Nm³/h', 'n2gen', 'B'], ['CT-601', 'Cooling tower 800 m³/h', 'ctower', 'C'], ['TR-601', 'Main incomer 33 kV / 3 MVA', 'incomer', 'B']] }] },
  ],
  kpis: [
    { id: 'yield', name: 'Batch yield (stage 5)', unit: '%', group: 'cost', base: 81.2, cur: 84.6, target: 86.5, better: 'up', dec: 1, lakh: 310, owner: 'Production head' },
    { id: 'cycle', name: 'Batch cycle time', unit: 'h', group: 'cost', base: 62, cur: 55.5, target: 52, better: 'down', dec: 1, lakh: 145, owner: 'Production head' },
    { id: 'oee', name: 'Equipment OEE (critical trains)', unit: '%', group: 'maintenance', base: 54, cur: 61, target: 66, better: 'up', dec: 0, lakh: 120, owner: 'Engineering head' },
    { id: 'solvent', name: 'Solvent recovery', unit: '%', group: 'cost', base: 86.5, cur: 90.2, target: 92, better: 'up', dec: 1, lakh: 88, owner: 'SRP in-charge' },
    { id: 'rft', name: 'Right-first-time batches', unit: '%', group: 'quality', base: 89, cur: 94, target: 97, better: 'up', dec: 0, lakh: 64, owner: 'QA head' },
    { id: 'dev', name: 'Deviations', unit: 'per month', group: 'quality', base: 14, cur: 8, target: 5, better: 'down', dec: 0, lakh: 0, owner: 'QA head' },
    { id: 'sec', name: 'Specific energy', unit: 'kWh/kg API', group: 'energy', base: 128, cur: 114, target: 105, better: 'down', dec: 0, lakh: 72, owner: 'Energy manager' },
    { id: 'steam', name: 'Steam per kg API', unit: 'kg/kg', group: 'energy', base: 235, cur: 212, target: 198, better: 'down', dec: 0, lakh: 54, owner: 'Utilities head' },
    { id: 'conv', name: 'Conversion cost', unit: '₹/kg', group: 'cost', base: 4850, cur: 4420, target: 4150, better: 'down', dec: 0, lakh: 0, owner: 'Plant controller' },
    { id: 'release', name: 'Batch release lead time', unit: 'days', group: 'quality', base: 11.5, cur: 7.8, target: 6, better: 'down', dec: 1, lakh: 40, owner: 'QA head' },
  ],
  overview: ['yield', 'cycle', 'oee', 'rft', 'sec', 'conv'],
  events: [
    { id: 'p1', asset: 'R-102', tag: 'mass_temp', kind: 'ramp', startHoursAgo: 3, to: 58.5, health: 55, rulDays: 4, severity: 'bad', minutesAgo: 8, curve: 1.6,
      title: 'R-102 mass temperature overshoot during stage-3 exotherm', agent: 'Process Agent', finding: 'Jacket fouling, poor heat removal',
      diagnosis: { title: 'Fouled jacket is cutting heat removal during reagent addition', confidence: 0.83, points: [
        'Mass temperature reached 58.5 °C against the 55 °C BPR limit during the thionyl chloride addition (batch B-23-0417).',
        'Jacket outlet runs 4.8 °C closer to the brine inlet than the last 10 batches at the same dosing rate: U-value down about 22 %.',
        'Jacket was last descaled 9 months ago; R-101 (descaled in June) holds 47 ± 1 °C on the same step.',
        'The same pattern came before deviation DEV-2026-0188 on R-102 in April.'],
        reco: 'Hold the addition, cut the dosing rate to 60 % until mass temperature is below 50 °C, and raise a deviation. Plan jacket descaling (WO draft ready) before the next stage-3 batch.' } },
    { id: 'p1b', asset: 'R-102', tag: 'jacket_temp', kind: 'ramp', startHoursAgo: 3, to: 38 },
    { id: 'p2', asset: 'CF-202', tag: 'vibration', kind: 'ramp', startHoursAgo: 120, to: 8.2, health: 41, rulDays: 6, severity: 'bad', minutesAgo: 35, curve: 1.3,
      title: 'CF-202 bearing vibration above ISO zone C', agent: 'Asset Health Agent', finding: 'Lower bearing outer race defect',
      diagnosis: { title: 'Outer race defect on the lower spindle bearing', confidence: 0.79, points: [
        'Overall vibration rose from 2.6 to 8.2 mm/s in 5 days at the same basket speed.',
        'Envelope spectrum shows BPFO at 87 Hz with harmonics; no 1× unbalance growth.',
        'Drive current is steady, so load or cake distribution is not the cause.'],
        reco: 'Move stage-4 spinning to CF-201 and replace the lower bearing in the next 8 h window. Spare (SKF 22220 E) is in stores.' } },
    { id: 'p3', asset: 'RCVD-301', tag: 'dry_time', kind: 'ramp', startHoursAgo: 360, to: 19.4, severity: 'warn', minutesAgo: 95, curve: 1.1,
      title: 'RCVD-301 drying time to LOD endpoint drifting longer', agent: 'Quality & Compliance Agent', finding: 'Vacuum leak and wetter cake',
      diagnosis: { title: 'Vacuum seal leak plus higher wet-cake LOD from CF-202', confidence: 0.74, points: [
        'Time to reach LOD ≤ 0.5 % rose from 14 h to 19.4 h over the last 6 batches.',
        'Vacuum holds at 38 mbar instead of 25 mbar; leak-rate test on 21 Nov failed at 4.2 mbar/min.',
        'Wet cake LOD from CF-202 is 17.8 % against 14.5 % from CF-201 (LabWare).'],
        reco: 'Replace the RCVD rotary seal at the next product changeover and route wet cake from CF-201 until CF-202 is repaired.' } },
    { id: 'p4', asset: 'DC-401', tag: 'dp', kind: 'ramp', startHoursAgo: 18, to: 51, health: 60, rulDays: 12, severity: 'warn', minutesAgo: 55,
      title: 'DC-401 differential pressure high: column flooding', agent: 'Energy & Utilities Agent', finding: 'Vapour load above packing capacity',
      diagnosis: { title: 'Reboiler steam too high for the packing with fouled distributor', confidence: 0.77, points: [
        'Column ΔP rose from 28 to 51 mbar in 18 h; limit is 45 mbar.',
        'Reboiler steam was raised to 700 kg/h to clear the backlog of mother liquor.',
        'Recovered methanol purity dropped from 99.6 % to 99.1 % (LabWare), close to the 99.0 % reuse limit.'],
        reco: 'Cut reboiler steam to 600 kg/h and set reflux ratio to 2.1. Inspect the liquid distributor at the weekend SRP stop.' } },
    { id: 'p4b', asset: 'DC-401', tag: 'purity', kind: 'ramp', startHoursAgo: 18, to: 99.1 },
    { id: 'p5', asset: 'CH-601', tag: 'cop', kind: 'ramp', startHoursAgo: 240, to: 3.9, health: 64, rulDays: 30, severity: 'warn', minutesAgo: 210,
      title: 'Chiller CH-601 COP down to 3.9', agent: 'Energy & Utilities Agent', finding: 'Condenser tube fouling',
      diagnosis: { title: 'Condenser fouling from high cooling water TDS', confidence: 0.81, points: [
        'COP fell from 5.1 to 3.9 in 10 days at the same load; compressor power is up 18 %.',
        'Condenser approach is 4.6 °C against 1.5 °C design.',
        'Cooling tower TDS was 2,400 ppm last week; blowdown valve was found closed.'],
        reco: 'Restore cooling tower blowdown and schedule condenser tube cleaning (about ₹38,000). Expected saving ₹1.9 L per month.' } },
  ],
  cost: { unitLabel: '₹/kg', budget: 4150,
    elements: [['Solvents (net of recovery)', 1380], ['Utilities (steam, power, brine)', 960], ['Labour', 720], ['Maintenance', 410], ['QC testing', 380], ['Effluent & overheads', 570]],
    bridge: [['Yield gain', 210], ['Solvent recovery', 95], ['Cycle time', 80], ['Utilities', 60], ['QC retesting', -15]],
    lines: [['Reactor bay (Block B)', 86.5, 82.1, 97.8, 'Exotherm holds'], ['Isolation suite', 84.0, 78.5, 98.6, 'Centrifuge stops'], ['Drying suite', 88.2, 72.4, 99.1, 'Long LOD endpoint'], ['Solvent recovery plant', 91.0, 85.6, 98.9, 'Column flooding'], ['Grade D powder processing', 93.5, 88.0, 99.6, 'Room ΔP alarms']],
    losses: [['Cleaning & changeover', 142], ['Waiting for QC results', 96], ['Equipment breakdowns', 58], ['Extended drying', 74], ['Reprocessing', 41], ['Utility interruptions', 22]] },
  quality: { defects: [['LOD out of limit', 18], ['Single unknown impurity > 0.10 %', 12], ['Residual solvent (methanol) high', 9], ['Particle size off-spec', 7], ['Colour of solution', 4], ['Assay below 99.0 %', 3]],
    spc: { asset: 'RCVD-301', tag: 'lod', name: 'Final API loss on drying', lsl: 0, usl: 0.5 }, inspect: null },
  energy: { contractKVA: 3000, scale: 1, meter: ['TR-601', 'load'], areas: [['Utilities', 46], ['Reaction', 16], ['Solvent recovery', 12], ['Clean room & packing', 11], ['Drying & milling', 9], ['Isolation', 6]],
    utilities: [['CH-601', 'power'], ['BR-601', 'power'], ['CT-601', 'fan_power'], ['AHU-501', 'energy']] },
  maintenance: { spotlight: 'CF-202' },
  approvals: [
    { id: 'a1', from: 'Process Agent', minutesAgo: 6, title: 'Approve change control: R-102 stage-3 dosing rate 180 → 110 L/h', policy: 'P-02',
      table: [['Change', 'Thionyl chloride dosing 180 → 110 L/h for batch B-23-0417'], ['Reason', 'Mass temperature 58.5 °C, BPR limit 55 °C'], ['Impact', '+1.4 h cycle time; exotherm held below 50 °C'], ['GMP', 'Within validated range (90–200 L/h), CC-2026-212']], prompt: 'Why did R-102 mass temperature overshoot?' },
    { id: 'a2', from: 'Asset Health Agent', minutesAgo: 30, title: 'Approve WO 4100 2287 · CF-202 lower bearing replacement', policy: 'P-03',
      table: [['Equipment', 'CF-202 · Top-discharge centrifuge'], ['Job', 'Replace lower spindle bearing, re-align, vibration check'], ['Window', 'Next 8 h · after batch B-24-0311 unload'], ['Cost', '₹1,12,000']], prompt: 'Why is CF-202 vibrating?' },
    { id: 'a3', from: 'Quality & Compliance Agent', minutesAgo: 75, title: 'Approve QA hold on batch B-23-0417 pending deviation review', policy: 'P-05',
      table: [['Batch', 'B-23-0417 · Stage 3 intermediate'], ['Reason', 'Exotherm excursion to 58.5 °C'], ['Tests', 'Related substances (HPLC) and assay ordered in LabWare']], prompt: 'Draft the deviation report for R-102' },
  ],
  docs: [
    { id: 'd1', name: 'BPR · Stage 3 chlorination (Product VL-221)', type: 'Batch production record', obj: 'R-101, R-102', pages: 46, cited: 31, pass: [['Maintain mass temperature 40–55 °C during thionyl chloride addition. If temperature exceeds 55 °C, stop addition and inform QA.', 'Step 14']] },
    { id: 'd2', name: 'DEV-2026-0188 · R-102 temperature excursion', type: 'Past deviation / RCA', obj: 'R-102', pages: 14, cited: 17, pass: [['Root cause: reduced jacket heat transfer from scaling. CAPA: jacket descaling every 6 months.', 'Section 6']] },
    { id: 'd3', name: 'Centrifuge O&M manual', type: 'OEM manual', obj: 'CF-201, CF-202', pages: 210, cited: 12, pass: [['Vibration above 7.1 mm/s: stop the machine and inspect spindle bearings.', 'p. 96']] },
    { id: 'd4', name: 'SOP-PRD-045 · Operation of rotary cone vacuum dryer', type: 'SOP', obj: 'RCVD-301', pages: 12, cited: 9, pass: [['Perform vacuum leak test before each batch; acceptance ≤ 2 mbar/min.', 'Step 5.3']] },
    { id: 'd5', name: 'SOP-QA-012 · Handling of deviations', type: 'SOP', obj: 'All areas', pages: 22, cited: 26, pass: [['Classify deviations as critical, major or minor within 24 h. Impact assessment must cover product quality, validation status and other batches.', 'Section 7.2']] },
    { id: 'd6', name: 'ICH Q7 · GMP for active pharmaceutical ingredients', type: 'Regulatory guideline', obj: 'Site', pages: 48, cited: 14, pass: [['Any deviation from established procedures should be documented and explained. Critical deviations should be investigated.', '§2.16']] },
  ],
  skills: [
    { id: 'exotherm-watch', name: 'Exotherm watch', pack: 'Faclon · Pharma', ver: '1.4', steps: ['Read mass, jacket temperature and dosing rate.', 'Compute heat removal and jacket U-value per batch.', 'Predict peak temperature for the rest of the addition.', 'Advise dosing rate change and raise a deviation draft.'] },
    { id: 'drying-endpoint', name: 'Drying endpoint prediction', pack: 'Faclon · Pharma', ver: '1.2', steps: ['Read vacuum, jacket temperature and LIMS LOD.', 'Fit the drying curve.', 'Predict time to LOD ≤ 0.5 %.', 'Flag vacuum leaks and wet cake.'] },
    { id: 'deviation-drafting', name: 'GMP deviation drafting', pack: 'Faclon · Pharma', ver: '2.0', steps: ['Collect the batch record, alarms and process trends.', 'Propose classification and impact on other batches.', 'Link past deviations and CAPA.', 'Draft the report in PAS-X for QA review.'] },
    { id: 'solvent-balance', name: 'Solvent mass balance', pack: 'Faclon · Pharma', ver: '1.1', steps: ['Read issues, recovery and losses per solvent.', 'Compute recovery % per batch.', 'Find column and condenser losses.'] },
    { id: 'bearing-diagnosis', name: 'Bearing diagnosis', pack: 'Faclon · Reliability', ver: '3.2', steps: ['Read vibration and current.', 'Match bearing fault frequencies.', 'Estimate remaining life.'] },
    { id: 'utility-optimiser', name: 'Utility optimiser', pack: 'Faclon · Energy', ver: '1.7', steps: ['Read chiller, brine and boiler data.', 'Compute COP and steam per kg API.', 'Advise setpoints with savings.'] },
  ],
  schedules: [
    ['Daily batch status report', 'Report', 'Batch Report Agent', 'Daily · 07:30', 'Plant head, QA, production (9)'],
    ['Solvent recovery balance', 'Excel', 'Yield & Cost Agent', 'Daily · 09:00', 'SRP, finance (4)'],
    ['Weekly deviation and CAPA status', 'Report', 'Quality & Compliance Agent', 'Weekly · Mon 10:00', 'QA, site head (6)'],
    ['Weekly asset health', 'Report', 'Asset Health Agent', 'Weekly · Mon 09:00', 'Engineering (7)'],
    ['Monthly utilities review', 'Deck', 'Energy & Utilities Agent', 'Monthly · 2nd 11:00', 'Site leadership (8)'],
  ],
  workflows: [
    ['Exotherm excursion', [['Trigger', 'Mass temperature > 55 °C during addition'], ['Agent', 'Process · confirm cause and peak'], ['Approval', 'Production in-charge · dosing change'], ['Action', 'Deviation draft in PAS-X and alert to QA']]],
    ['QA hold on excursion batch', [['Trigger', 'Critical parameter outside BPR range'], ['Agent', 'Quality & Compliance · impact assessment'], ['Approval', 'QA in-charge'], ['Action', 'Batch status set to Hold in SAP QM']]],
    ['Centrifuge bearing fault', [['Trigger', 'Vibration > 7.1 mm/s'], ['Agent', 'Asset Health · diagnose and estimate life'], ['Approval', 'Engineering head (WO > ₹50,000)'], ['Action', 'Work order in SAP PM']]],
  ],
  agents: makeAgents('pharma-api', [
    { key: 'process', name: 'Process Agent', domain: 'process', version: '1.6.0', uns: UNS, instructions: 'Keep reactions inside BPR ranges. Watch exotherms, dosing and temperature, explain excursions and draft dosing changes for approval.',
      skills: ['exotherm-watch', 'drying-endpoint'], tools: [...T, 'deepsense.forecast'], triggers: [{ type: 'prompt' }, { type: 'event', on: 'mass_temp > 55' }], autonomy: 'act_with_approval', policies: ['P-01', 'P-02', 'P-10'] },
    { key: 'asset-health', name: 'Asset Health Agent', domain: 'maintenance', version: '2.2.0', uns: UNS, instructions: 'Detect developing faults on centrifuges, reactors, dryers and utilities, and estimate remaining life.',
      skills: ['bearing-diagnosis'], tools: [...T, 'deepsense.rul_predict', 'sap_pm.create_notification', 'sap_pm.create_order'], triggers: [{ type: 'prompt' }, { type: 'event', on: 'health < 50' }], autonomy: 'act_with_approval', policies: ['P-01', 'P-03'] },
    { key: 'quality', name: 'Quality & Compliance Agent', domain: 'quality', version: '1.9.0', uns: UNS, instructions: 'Link LIMS results to process data, draft deviations with impact assessment and CAPA, and track batch release.',
      skills: ['deviation-drafting', 'drying-endpoint'], tools: ['plantdb.get_quality', 'plantdb.get_tag_history', 'plantdb.diagnose_asset', 'sap_qm.create_quality_hold'], triggers: [{ type: 'prompt' }, { type: 'event', on: 'BPR range excursion' }], autonomy: 'act_with_approval', policies: ['P-01', 'P-05', 'P-07'] },
    { key: 'yield-cost', name: 'Yield & Cost Agent', domain: 'cost', version: '1.4.0', uns: UNS, instructions: 'Track batch yield, solvent recovery and conversion cost per kg, and rank the losses.',
      skills: ['solvent-balance'], tools: ['plantdb.get_kpis', 'plantdb.get_kpi_trend', 'plantdb.get_oee_losses', 'plantdb.get_production'] },
    { key: 'energy', name: 'Energy & Utilities Agent', domain: 'energy', version: '1.7.0', uns: UNS, instructions: 'Track steam, power and brine per kg API, watch chiller COP and column performance, and advise utility setpoints.',
      skills: ['utility-optimiser', 'solvent-balance'], tools: ['plantdb.get_energy', 'plantdb.get_kpi_trend', 'plantdb.get_tag_history'], triggers: [{ type: 'prompt' }, { type: 'event', on: 'cop < 4.2' }] },
    { key: 'batch-report', name: 'Batch Report Agent', domain: 'reports', version: '3.1.0', uns: UNS, instructions: 'Write daily batch status, shift handover summaries and review-by-exception notes for the eBR.',
      skills: ['deviation-drafting'], tools: ['plantdb.get_production', 'plantdb.get_kpis', 'msg.send_email'], triggers: [{ type: 'schedule', cron: '30 7 * * *' }], autonomy: 'act' },
  ]),
  suggestions: ['What needs my attention right now?', 'Why did R-102 mass temperature overshoot in stage 3?', 'Why is CF-202 vibrating, and can CF-201 take its load?', 'Why is RCVD-301 taking longer to reach the LOD endpoint?', 'Is DC-401 flooding, and what does it do to solvent recovery %?', 'Show CH-601 COP and specific energy per kg API for the last 30 days'],
  sources: {
    dcs: { name: 'Emerson DeltaV DCS', kind: 'OT · DCS', via: 'I/O Connect · OPC UA', detail: 'Reactors, isolation, dryers, SRP and utilities · 2,400 tags at 1 s' },
    historian: { name: 'AVEVA PI', kind: 'OT · Historian', via: 'PI Web API', detail: '6 years of process history' },
    mes: { name: 'Körber PAS-X MES / eBR', kind: 'IT · MES', via: 'REST API', detail: 'Electronic batch records, phases, dosing and equipment status' },
    lims: { name: 'LabWare LIMS', kind: 'IT · LIMS', via: 'REST API', detail: 'In-process and release results: LOD, assay, related substances, residual solvents' },
    erp: { name: 'SAP S/4HANA', kind: 'IT · ERP', via: 'OData', detail: 'Process orders, material consumption, batch status and costing' },
    cmms: { name: 'SAP PM', kind: 'IT · CMMS', via: 'OData', detail: 'Notifications, work orders, calibration and spares' },
    ems: { name: 'Energy meters', kind: 'OT · EMS', via: 'I/O Connect · Modbus TCP', detail: '64 meters, steam and chilled-water flow' },
    bms: { name: 'Cleanroom BMS', kind: 'OT · BMS', via: 'I/O Connect · BACnet/IP', detail: 'AHU, room ΔP, RH and temperature (21 CFR Part 11 audit trail)' },
  },
  setpoints: [
    { asset: 'R-102', tag: 'jacket_temp', name: 'Jacket brine ramp rate during stage-3 addition', current: 2.0, recommended: 1.2, unit: '°C/min', lo: 0.8, hi: 2.5, gain: '−1 deviation / month, ₹42 L/yr', kpi: 'rft',
      reason: 'A slower ramp keeps jacket ΔT inside the fouled-jacket capacity; the last 12 batches at 1.2 °C/min on R-101 held mass temperature below 50 °C with the same dosing.', confidence: 0.78, status: 'proposed' },
    { asset: 'RCVD-301', tag: 'vacuum', name: 'Dryer vacuum setpoint', current: 35, recommended: 20, unit: 'mbar', lo: 10, hi: 50, gain: '−3.5 h drying time per batch, ₹26 L/yr', kpi: 'cycle',
      reason: 'Batches dried at ≤ 20 mbar reached LOD 0.5 % 3.5 h earlier at the same jacket temperature; the vacuum pump has capacity once the rotary seal is replaced.', confidence: 0.72, status: 'proposed' },
    { asset: 'DC-401', tag: 'reflux_ratio', name: 'Column reflux ratio', current: 2.4, recommended: 2.1, unit: 'R/D', lo: 1.8, hi: 3.0, gain: '−9 % reboiler steam, ₹18 L/yr', kpi: 'steam',
      reason: 'Purity stays above 99.5 % at R/D 2.1 in 40 of 42 historical runs, and lower vapour load keeps ΔP below 35 mbar.', confidence: 0.81, status: 'approved' },
    { asset: 'CH-601', tag: 'supply_temp', name: 'Chilled water supply temperature', current: 7, recommended: 8.5, unit: '°C', lo: 6, hi: 10, gain: '+6 % chiller COP, ₹14 L/yr', kpi: 'sec',
      reason: 'Condenser and reactor jacket loads are met at 8.5 °C outside stage-3 additions; each 1 °C rise gives about 3–4 % lower compressor power.', confidence: 0.76, status: 'applied' },
  ],
  forms: [
    { id: 'deviation', name: 'Batch deviation report', desc: 'GMP deviation per SOP-QA-012: record, classify, assess impact and assign CAPA.', sections: [
      { title: 'Deviation details', fields: [
        { id: 'batch', label: 'Batch number', type: 'text', required: true, placeholder: 'B-23-0417' },
        { id: 'asset', label: 'Equipment', type: 'asset', required: true },
        { id: 'stage', label: 'Stage / step', type: 'select', options: ['Stage 1 · condensation', 'Stage 2 · reduction', 'Stage 3 · chlorination', 'Stage 4 · crystallisation', 'Stage 5 · final API'], required: true },
        { id: 'occurred', label: 'Date and time of occurrence (IST)', type: 'datetime', required: true },
        { id: 'description', label: 'What happened', type: 'textarea', required: true, help: 'State the BPR limit, the actual value and the duration.', placeholder: 'Mass temperature reached 58.5 °C (limit 40–55 °C) for 12 min during thionyl chloride addition.' }] },
      { title: 'Classification and impact', fields: [
        { id: 'class', label: 'Classification', type: 'radio', options: ['Critical', 'Major', 'Minor'], required: true },
        { id: 'type', label: 'Deviation type', type: 'select', options: ['Process parameter', 'Equipment', 'Documentation', 'Material', 'Environment / cleanroom', 'Utility'] },
        { id: 'impact', label: 'Impact assessment', type: 'checklist', options: ['Product quality', 'Validated state', 'Other batches in campaign', 'Stability', 'Regulatory filing', 'Patient safety'] },
        { id: 'hold', label: 'Batch placed on QA hold', type: 'checkbox' },
        { id: 'tests', label: 'Additional tests ordered', type: 'textarea', placeholder: 'Related substances by HPLC, assay, residual solvents' }] },
      { title: 'Root cause and CAPA', fields: [
        { id: 'rootcause', label: 'Probable root cause', type: 'textarea', required: true },
        { id: 'capa', label: 'CAPA', type: 'textarea', required: true, placeholder: 'Corrective: descale R-102 jacket. Preventive: add jacket U-value trend to PM plan.' },
        { id: 'capa_due', label: 'CAPA target date', type: 'date' },
        { id: 'initiator', label: 'Initiated by (production)', type: 'signature', required: true },
        { id: 'qa', label: 'Reviewed by (QA)', type: 'signature', required: true }] },
    ] },
    { id: 'cleaning', name: 'Equipment cleaning verification log', desc: 'Product changeover cleaning record with visual check and swab/rinse sampling.', sections: [
      { title: 'Equipment and product', fields: [
        { id: 'asset', label: 'Equipment', type: 'asset', required: true },
        { id: 'prev', label: 'Previous product and batch', type: 'text', required: true, placeholder: 'VL-221 · B-23-0417' },
        { id: 'next', label: 'Next product', type: 'text', placeholder: 'VL-305' },
        { id: 'type', label: 'Cleaning type', type: 'radio', options: ['Type A · batch to batch', 'Type B · product changeover', 'Type C · after maintenance'], required: true }] },
      { title: 'Cleaning steps', fields: [
        { id: 'steps', label: 'Steps completed', type: 'checklist', options: ['Drained and flushed with purified water', 'Methanol reflux wash 2 h', 'Final rinse with purified water', 'Nitrogen dried', 'Gaskets and sight glass checked'], required: true },
        { id: 'solvent_qty', label: 'Cleaning solvent used', type: 'number', unit: 'L' },
        { id: 'start', label: 'Cleaning start', type: 'datetime' },
        { id: 'end', label: 'Cleaning end', type: 'datetime' }] },
      { title: 'Verification', fields: [
        { id: 'visual', label: 'Visually clean', type: 'radio', options: ['Pass', 'Fail'], required: true },
        { id: 'swab', label: 'Swab / rinse sample ID (LIMS)', type: 'text', placeholder: 'SW-2611-0342' },
        { id: 'residue', label: 'Residue result', type: 'number', unit: 'ppm', help: 'Acceptance limit per cleaning validation: ≤ 10 ppm.' },
        { id: 'hold_time', label: 'Clean hold time valid until', type: 'datetime' },
        { id: 'done_by', label: 'Cleaned by', type: 'signature', required: true },
        { id: 'verified_by', label: 'Verified by (QA)', type: 'signature', required: true }] },
    ] },
    { id: 'handover', name: 'GMP shift handover', desc: 'Shift-to-shift handover for the API block: batches in progress, deviations, equipment and cleanroom status.', sections: [
      { title: 'Shift', fields: [
        { id: 'shift', label: 'Shift', type: 'select', options: ['A · 06:00–14:00', 'B · 14:00–22:00', 'C · 22:00–06:00'], required: true },
        { id: 'date', label: 'Date', type: 'date', required: true },
        { id: 'area', label: 'Area', type: 'select', options: ['Reaction', 'Isolation', 'Drying & milling', 'Solvent recovery', 'Clean room & packing', 'Utilities'] }] },
      { title: 'Batches and deviations', fields: [
        { id: 'batches', label: 'Batches in progress (batch, stage, step)', type: 'textarea', required: true, placeholder: 'B-23-0417 · stage 3 · addition on hold at 62 %' },
        { id: 'kg', label: 'API output this shift', type: 'number', unit: 'kg' },
        { id: 'devs', label: 'Deviations raised or open', type: 'textarea' },
        { id: 'ebr', label: 'eBR entries complete and reviewed', type: 'checkbox', required: true }] },
      { title: 'Equipment and environment', fields: [
        { id: 'down', label: 'Equipment down or under maintenance', type: 'asset' },
        { id: 'status', label: 'Status checks', type: 'checklist', options: ['Room ΔP within 10–30 Pa', 'RH within 30–55 %', 'Brine below −12 °C', 'N₂ O₂ below 500 ppm', 'Status labels on all equipment'] },
        { id: 'rating', label: 'Shift stability', type: 'rating' },
        { id: 'outgoing', label: 'Outgoing shift in-charge', type: 'signature', required: true },
        { id: 'incoming', label: 'Incoming shift in-charge', type: 'signature', required: true }] },
    ] },
  ],
  dashNames: { cost: 'Yield & cost', quality: 'Quality & compliance', energy: 'Utilities & energy' },
  realtime: { title: 'API block · live', assets: ['R-101', 'R-102', 'R-103', 'CF-201', 'CF-202', 'RCVD-301', 'DC-401', 'AHU-501', 'CH-601', 'BR-601'] },
};
