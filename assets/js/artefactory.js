/* ==========================================================================
   Artefactory (versioned library), custom dashboards, sidebar shortcuts, logs
   ========================================================================== */
const PEOPLE = {
  AR: { n: 'Anand Rao', c: '#d04a02' }, JT: { n: 'J. Thomas', c: '#2a67a8' }, NS: { n: 'N. Shah', c: '#1b8a55' },
  GN: { n: 'G. Nair', c: '#a06a00' }, VM: { n: 'V. Menon', c: '#7a3fa0' }, SI: { n: 'S. Iyer', c: '#a83250' }, PC: { n: 'Plant controller', c: '#4f4f4f' },
};
const TYPE = {
  dash: { label: 'Dashboard', ext: 'HTML', cls: 'd' }, html: { label: 'Report', ext: 'HTML', cls: 'h' },
  xlsx: { label: 'Workbook', ext: 'XLSX', cls: 'x' }, pptx: { label: 'Presentation', ext: 'PPTX', cls: 'p' }, docx: { label: 'Document', ext: 'DOCX', cls: 'w' },
};
const av = (k, s = 22) => `<span class="av" style="width:${s}px;height:${s}px;background:${PEOPLE[k].c}" title="${PEOPLE[k].n}">${PEOPLE[k].n.split(' ').map(x => x[0]).join('').slice(0, 2)}</span>`;
const V = (v, who, when, note, size) => ({ v, who, when, note, size });

const ARTEFACTS = [
  { id: 'D1', type: 'dash', scope: 'mine', name: 'Plant head daily view', owner: 'AR', shared: ['JT', 'SI', 'NS'], updated: 'Today 09:12', size: '48 KB',
    versions: [V(6, 'Copilot for Anand Rao', 'Today 09:12', 'Added value-realised tile', '48 KB'), V(5, 'Anand Rao', '24 Nov', 'Moved quality chart to second row', '46 KB'), V(4, 'Copilot for Anand Rao', '18 Nov', 'Added top losses by ₹', '45 KB'), V(3, 'Anand Rao', '11 Nov', 'Changed OEE target to 78 %', '41 KB'), V(2, 'Copilot for Anand Rao', '4 Nov', 'Added energy per kg', '39 KB'), V(1, 'Copilot for Anand Rao', '28 Oct', 'Created from prompt', '32 KB')] },
  { id: 'D2', type: 'dash', scope: 'mine', name: 'Sprocket Line 2 · OEE war room', owner: 'AR', shared: ['SI'], updated: 'Today 14:20', size: '36 KB',
    versions: [V(3, 'Copilot for Anand Rao', 'Today 14:20', 'Added micro-stops by machine', '36 KB'), V(2, 'S. Iyer', '20 Nov', 'Added changeover timer', '33 KB'), V(1, 'Copilot for Anand Rao', '14 Nov', 'Created from prompt', '29 KB')] },
  { id: 'P1', type: 'pptx', scope: 'mine', name: 'Monthly operations review · Nov 2026', owner: 'AR', shared: ['JT', 'NS', 'GN', 'SI'], updated: 'Today 11:05', size: '2.4 MB',
    versions: [V(5, 'Anand Rao', 'Today 11:05', 'Edited decisions slide', '2.4 MB'), V(4, 'Copilot for Anand Rao', 'Today 10:40', 'Refreshed with Nov MTD data', '2.4 MB'), V(3, 'N. Shah', '25 Nov', 'Added quality slide', '2.2 MB'), V(2, 'Anand Rao', '24 Nov', 'Reordered sections', '2.0 MB'), V(1, 'Copilot for Anand Rao', '24 Nov', 'Drafted from October review', '1.9 MB')] },
  { id: 'W1', type: 'docx', scope: 'mine', name: 'Value realisation note · Faclon AI programme', owner: 'AR', shared: ['PC'], updated: '25 Nov', size: '184 KB',
    versions: [V(3, 'Plant controller', '25 Nov', 'Finance validation added', '184 KB'), V(2, 'Anand Rao', '22 Nov', 'Added energy section', '160 KB'), V(1, 'Copilot for Anand Rao', '21 Nov', 'Drafted from KPI scorecard', '142 KB')] },
  { id: 'R1', type: 'html', scope: 'mine', rep: 'h1', name: 'Daily plant performance', owner: 'AR', shared: ['JT', 'NS', 'GN', 'SI', 'VM'], updated: 'Today 07:30', size: '184 KB',
    versions: [V(58, 'Shift Report Agent', 'Today 07:30', 'Scheduled run · 25 Nov', '184 KB'), V(57, 'Shift Report Agent', '25 Nov 07:30', 'Scheduled run · 24 Nov', '181 KB'), V(56, 'Shift Report Agent', '24 Nov 07:30', 'Scheduled run · 23 Nov', '179 KB'), V(55, 'Shift Report Agent', '23 Nov 07:30', 'Scheduled run · 22 Nov', '182 KB')] },
  { id: 'R2', type: 'html', scope: 'mine', rep: 'h2', name: 'Shift A handover', owner: 'AR', shared: ['SI', 'VM'], updated: 'Today 14:05', size: '122 KB',
    versions: [V(171, 'Shift Report Agent', 'Today 14:05', 'Scheduled run · Shift A', '122 KB'), V(170, 'Shift Report Agent', 'Today 06:05', 'Scheduled run · Shift C', '118 KB'), V(169, 'Shift Report Agent', '25 Nov 22:05', 'Scheduled run · Shift B', '120 KB')] },
  { id: 'X1', type: 'xlsx', scope: 'mine', rep: 'x1', name: 'OEE & six big losses', owner: 'AR', shared: ['SI'], updated: 'Today 08:00', size: '96 KB',
    versions: [V(12, 'Cost Conversion Agent', 'Today 08:00', 'Daily refresh', '96 KB'), V(11, 'Cost Conversion Agent', '25 Nov 08:00', 'Daily refresh', '94 KB'), V(10, 'S. Iyer', '24 Nov', 'Added reason-code sheet', '93 KB'), V(9, 'Cost Conversion Agent', '24 Nov 08:00', 'Daily refresh', '88 KB')] },
  { id: 'X2', type: 'xlsx', scope: 'mine', rep: 'x5', name: 'Conversion cost by part', owner: 'AR', shared: ['PC'], updated: '3 Nov', size: '74 KB',
    versions: [V(2, 'Plant controller', '4 Nov', 'Standard costs updated for Q3', '74 KB'), V(1, 'Cost Conversion Agent', '3 Nov', 'Monthly run · Oct', '71 KB')] },
  { id: 'D3', type: 'dash', scope: 'shared', name: 'Compressor house', owner: 'GN', shared: ['AR'], updated: 'Yesterday 17:40', size: '31 KB',
    versions: [V(4, 'G. Nair', 'Yesterday 17:40', 'Added leak load during breaks', '31 KB'), V(3, 'Copilot for G. Nair', '19 Nov', 'Added specific power per compressor', '29 KB'), V(2, 'G. Nair', '10 Nov', 'Header pressure band 6.4–7.0 bar', '26 KB'), V(1, 'Copilot for G. Nair', '2 Nov', 'Created from prompt', '22 KB')] },
  { id: 'D4', type: 'dash', scope: 'shared', name: 'Heat treatment cell', owner: 'VM', shared: ['AR', 'NS'], updated: '24 Nov', size: '34 KB',
    versions: [V(2, 'V. Menon', '24 Nov', 'Added quench flow limits', '34 KB'), V(1, 'Copilot for V. Menon', '17 Nov', 'Created from prompt', '30 KB')] },
  { id: 'P2', type: 'pptx', scope: 'shared', name: 'Customer quality review · OEM A', owner: 'NS', shared: ['AR', 'SI'], updated: '25 Nov', size: '3.1 MB',
    versions: [V(2, 'N. Shah', '25 Nov', 'Added containment evidence', '3.1 MB'), V(1, 'Copilot for N. Shah', '24 Nov', 'Drafted from PPM data', '2.7 MB')] },
  { id: 'W2', type: 'docx', scope: 'shared', name: 'SOP · HB-04 spindle bearing replacement', owner: 'JT', shared: ['AR', 'SI'], updated: 'Today 13:10', size: '96 KB',
    versions: [V(7, 'J. Thomas', 'Today 13:10', 'Torque values for FAG 7014 updated', '96 KB'), V(6, 'Copilot for J. Thomas', 'Today 12:55', 'Added lessons from RCA-2025-017', '94 KB'), V(5, 'J. Thomas', 'Mar 2025', 'Reviewed after HB-02 failure', '88 KB')] },
  { id: 'R3', type: 'html', scope: 'shared', rep: 'h3', name: 'RCA · Tooth crack on SPK-428-42T (8D draft)', owner: 'NS', shared: ['AR', 'VM'], updated: 'Today 14:40', size: '210 KB',
    versions: [V(2, 'N. Shah', 'Today 15:02', 'D5 owners confirmed', '210 KB'), V(1, 'Vision Quality Agent', 'Today 14:40', 'Drafted from RCA evidence', '198 KB')] },
  { id: 'R4', type: 'html', scope: 'shared', rep: 'h4', name: 'Weekly asset health', owner: 'JT', shared: ['AR'], updated: 'Mon 24 Nov', size: '256 KB',
    versions: [V(13, 'Asset Health Agent', 'Mon 24 Nov', 'Scheduled run · Week 48', '256 KB'), V(12, 'Asset Health Agent', 'Mon 17 Nov', 'Scheduled run · Week 47', '248 KB')] },
  { id: 'X3', type: 'xlsx', scope: 'shared', rep: 'x3', name: 'Weekly maintenance plan', owner: 'JT', shared: ['AR'], updated: 'Fri 21 Nov', size: '58 KB',
    versions: [V(3, 'J. Thomas', 'Fri 21 Nov', 'Added Sunday shutdown jobs', '58 KB'), V(2, 'Maintenance Planner Agent', 'Fri 21 Nov', 'Weekly plan · Week 49', '55 KB')] },
  { id: 'X4', type: 'xlsx', scope: 'shared', rep: 'x4', name: 'Energy meter data', owner: 'GN', shared: ['AR'], updated: 'Mon 24 Nov', size: '1.8 MB',
    versions: [V(9, 'Energy & Utilities Agent', 'Mon 24 Nov', 'Weekly export · Week 47', '1.8 MB')] },
  { id: 'X5', type: 'xlsx', scope: 'shared', rep: 'x2', name: 'Vision defect log', owner: 'NS', shared: ['AR'], updated: 'Today 06:15', size: '412 KB',
    versions: [V(41, 'Vision Quality Agent', 'Today 06:15', 'Daily export', '412 KB')] },
  { id: 'R5', type: 'html', scope: 'shared', rep: 'h5', name: 'Monthly energy & carbon', owner: 'GN', shared: ['AR'], updated: '2 Nov', size: '298 KB',
    versions: [V(4, 'Energy & Utilities Agent', '2 Nov', 'Monthly run · Oct', '298 KB')] },
];

/* ---------- Custom dashboards (HTML dashboards built by Copilot) ---------- */
const H8 = ['07', '08', '09', '10', '11', '12', '13', '14'];
const DASHES = {
  D1: { tiles: [['Plant OEE', '71.8 %', '▲ 5.6 pp vs baseline', 'g'], ['Production', '48,260 pcs', '96 % of plan', ''], ['First pass yield', '97.6 %', '▲ 1.5 pp vs baseline', 'g'], ['Specific energy', '1.92 kWh/kg', '▼ 7.7 % vs baseline', 'g'], ['Open alarms', '2', 'HB-04, IH-02', 'b'], ['Value realised', '₹4.32 Cr/yr', 'vs baseline', 'g']],
    widgets: [{ t: 'line', title: 'OEE by hour, today', labels: H8, series: [{ name: 'OEE', color: 'var(--c1)', data: [72, 74, 73, 69, 71, 70, 66, 68] }], th: [{ value: 78, label: 'Target 78', color: 'var(--good)' }], unit: ' %' },
      { t: 'bars', title: 'Output vs plan by area', labels: ['Press', 'Mach.', 'Cold F.', 'HT', 'Chain'], series: [{ name: 'Actual %', color: 'var(--c1)', data: [98.5, 92.7, 98.6, 98.1, 98.5] }], unit: ' %', yMin: 80 },
      { t: 'hbars', title: 'Top losses today, ₹ thousand', items: [{ label: 'HB-04 micro-stops', value: 152 }, { label: 'MBF-01 under-loaded', value: 51 }, { label: 'Changeover 428→520', value: 46 }, { label: 'Plate feeding jams', value: 33 }] },
      { t: 'table', title: 'Open agent actions', head: ['Action', 'Owner', 'Status'], rows: [['Approve WO 4100 8821', 'J. Thomas', 'Waiting'], ['Close lot hold QH-2611-07', 'N. Shah', 'In progress'], ['Fix Press Shop air leaks', 'G. Nair', 'Sunday']] }] },
  D2: { tiles: [['OEE', '58.0 %', 'target 75 %', 'b'], ['Availability', '71.3 %', '', ''], ['Performance', '84.1 %', '', ''], ['Quality', '96.8 %', '', ''], ['Micro-stops', '41', 'this shift', 'b'], ['Changeover', '74 min', 'standard 35', 'b']],
    widgets: [{ t: 'line', title: 'OEE by hour, Sprocket Line 2', labels: H8, series: [{ name: 'OEE', color: 'var(--c1)', data: [68, 66, 63, 58, 55, 57, 52, 58] }], th: [{ value: 75, label: 'Target 75', color: 'var(--good)' }], unit: ' %' },
      { t: 'bars', title: 'Micro-stops by machine', labels: ['HB-03', 'HB-04', 'DR-02'], series: [{ name: 'Stops', color: 'var(--c1)', data: [6, 41, 9] }] },
      { t: 'hbars', title: 'Loss minutes by reason', items: [{ label: 'Spindle overload (2041)', value: 103 }, { label: 'Changeover overrun', value: 39 }, { label: 'Starved (no parts)', value: 24 }, { label: 'Tool change', value: 12 }] },
      { t: 'table', title: 'Next changeover', head: ['Step', 'Owner', 'Ready'], rows: [['Pre-stage hob arbor 520', 'Setter', 'Yes'], ['Fixture 520-38T at line', 'Stores', 'Yes'], ['First-off inspection gauge', 'QA', 'No']] }] },
  D3: { tiles: [['Header pressure', '7.1 bar', 'band 6.4–7.0', 'b'], ['Total power', '312 kW', '3 compressors', ''], ['Specific power', '6.5 kW/m³/min', '▼ 10 % vs baseline', 'g'], ['Leak load', '14 %', 'at breaks', 'b'], ['Dew point', '3.2 °C', 'dryer OK', 'g'], ['Air cost today', '₹31,800', '', '']],
    widgets: [{ t: 'line', title: 'Header pressure, today', labels: H8, series: [{ name: 'bar', color: 'var(--c1)', data: [7.0, 7.1, 7.1, 7.2, 7.1, 7.0, 7.1, 7.1] }], th: [{ value: 7.0, label: 'Upper band 7.0', color: 'var(--warn)' }], unit: ' bar' },
      { t: 'bars', title: 'Load by compressor, %', labels: ['AC-01', 'AC-02', 'AC-03'], series: [{ name: 'Load', color: 'var(--c1)', data: [84, 88, 61] }], unit: ' %' },
      { t: 'hbars', title: 'Specific power, kW/m³/min', items: [{ label: 'AC-02', value: 6.9, color: 'var(--bad)' }, { label: 'AC-01', value: 6.3 }, { label: 'AC-03 (VSD)', value: 5.8 }] },
      { t: 'table', title: 'Tagged leaks', head: ['Location', 'Est. m³/min', 'WO'], rows: [['Press Shop header P3', '0.6', '4100 8826'], ['PR-02 clutch line', '0.4', '4100 8826'], ['Chain Line A manifold', '0.3', '4100 8826']] }] },
  D4: { tiles: [['SQF-01 zone 1', '880 °C', 'recipe 870–890', 'g'], ['Carbon potential', '0.82 %C', 'target 0.80', 'g'], ['IH-02 quench flow', '17.9 L/min', 'after cleaning', 'g'], ['MBF-01 tray fill', '78 %', 'target 92 %', 'b'], ['Energy per tonne', '438 kWh/t', '▼ 6 % vs baseline', 'g'], ['Hardness (last)', '52.1 HRC', 'spec 50–55', 'g']],
    widgets: [{ t: 'line', title: 'IH-02 quench flow, today', labels: H8, series: [{ name: 'L/min', color: 'var(--c1)', data: [18.2, 18.1, 18.2, 18.0, 17.9, 14.8, 14.6, 17.9] }], th: [{ value: 16, label: 'Min 16', color: 'var(--bad)' }], unit: ' L/min' },
      { t: 'bars', title: 'Energy per tonne by furnace', labels: ['SQF-01', 'MBF-01', 'TF-01'], series: [{ name: 'kWh/t', color: 'var(--c1)', data: [412, 468, 96] }], unit: ' kWh/t' },
      { t: 'hbars', title: 'Hardness rejects by part, today', items: [{ label: 'SPK-428-42T', value: 61 }, { label: 'PIN-428H', value: 14 }, { label: 'BSH-428H', value: 9 }] },
      { t: 'table', title: 'Furnace recipes running', head: ['Furnace', 'Recipe', 'Load'], rows: [['SQF-01', 'Pins 428H · carburise', '1.2 t'], ['MBF-01', 'Plates · through-harden', '0.9 t/h'], ['TF-01', 'Temper 210 °C', '1.4 t']] }] },
  D5: { tiles: [['Specific power', '6.5 kW/m³/min', 'baseline 7.2', 'g'], ['AC-01', '6.3', 'base load', ''], ['AC-02', '6.9', 'cooler fouled', 'b'], ['AC-03', '5.8', 'VSD trim', 'g'], ['Leak load', '14 %', 'at breaks', 'b'], ['Saving open', '₹18.6 L/yr', 'leaks', '']],
    widgets: [{ t: 'line', title: 'Specific power, last 12 weeks', labels: WEEKS.slice(-12), series: [{ name: 'kW/m³/min', color: 'var(--c1)', data: [7.2, 7.1, 7.0, 6.9, 6.9, 6.8, 6.7, 6.7, 6.6, 6.6, 6.5, 6.5] }], th: [{ value: 6.0, label: 'Target 6.0', color: 'var(--good)' }] },
      { t: 'bars', title: 'Specific power by compressor', labels: ['AC-01', 'AC-02', 'AC-03'], series: [{ name: 'kW/m³/min', color: 'var(--c1)', data: [6.3, 6.9, 5.8] }] }] },
};
const ALLDASH = () => [
  { k: 'kpis', t: 'Plant KPIs', icon: 'target', src: 'Standard' }, { k: 'dash/overview', t: 'Plant overview', icon: 'home', src: 'Standard' }, { k: 'dash/maintenance', t: 'Asset maintenance', icon: 'wrench', badge: 2, src: 'Standard' },
  { k: 'dash/cost', t: 'Cost conversion', icon: 'rupee', src: 'Standard' }, { k: 'dash/quality', t: 'Quality · AI vision', icon: 'eye', badge: 1, src: 'Standard' },
  { k: 'dash/energy', t: 'Energy & utilities', icon: 'bolt', src: 'Standard' },
  ...ARTEFACTS.filter(a => a.type === 'dash').map(a => ({ k: 'd/' + a.id, t: a.name.replace(' · OEE war room', ' war room'), icon: 'dash', custom: true, src: a.scope === 'mine' ? 'My dashboards' : 'Shared with me', owner: a.owner })),
];
function loadPins() {
  try { const p = JSON.parse(localStorage.getItem('pwc-pins-v2')); if (Array.isArray(p) && p.length) return p; } catch (e) {}
  return ['kpis', 'dash/overview', 'dash/maintenance', 'dash/cost', 'dash/quality', 'dash/energy', 'd/D1', 'd/D2', 'd/D3'];
}
function savePins() { try { localStorage.setItem('pwc-pins-v2', JSON.stringify(state.pins)); } catch (e) {} }
function togglePin(k) {
  state.pins = state.pins.includes(k) ? state.pins.filter(x => x !== k) : [...state.pins, k];
  savePins(); renderNav();
}

function dashHTML(id, pre, big) {
  const d = DASHES[id];
  return `<div class="dtiles ${big ? 'big' : ''}">${d.tiles.map(t => `<div class="dtile"><div class="l">${t[0]}</div><div class="v">${t[1]}</div><div class="d ${t[3] === 'g' ? 'good' : t[3] === 'b' ? 'bad' : ''}">${t[2]}</div></div>`).join('')}</div>
    <div class="dgrid ${big ? 'big' : ''}">${d.widgets.map((w, i) => `<div class="dw"><div class="dw-t">${w.title}</div>${w.t === 'table'
      ? `<table class="tbl"><thead><tr>${w.head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${w.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : `<div id="${pre}-${i}"></div>`}</div>`).join('')}</div>`;
}
function drawDash(id, pre, big) {
  DASHES[id].widgets.forEach((w, i) => {
    const el = document.getElementById(`${pre}-${i}`); if (!el) return;
    const h = big ? 220 : 150;
    if (w.t === 'line') Charts.line(el, { labels: w.labels, series: w.series, thresholds: w.th, height: h, unit: w.unit || '', area: true });
    if (w.t === 'bars') Charts.bars(el, { labels: w.labels, series: w.series, height: h, unit: w.unit || '', yMin: w.yMin, valueLabels: true });
    if (w.t === 'hbars') Charts.hbars(el, { items: w.items, labelW: 150, rowH: big ? 34 : 26 });
  });
}
function pageCustomDash(id) {
  const a = ARTEFACTS.find(x => x.id === id);
  const pinned = state.pins.includes('d/' + id);
  return headerBlock(a.name, `Custom dashboard · v${a.versions[0].v} · owner ${PEOPLE[a.owner].n} · updated ${a.updated} · built with Copilot`,
    `<span class="chip good"><span class="dot pulse"></span>Live</span><button class="btn" data-pin="d/${id}">${ico('star')} ${pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}</button>
     <button class="btn" data-art-open="${id}">${ico('folder')} Open in Artefactory</button><button class="btn primary" data-ask="Add a chart of energy per piece to the ${a.name} dashboard">${ico('spark')} Edit with Copilot</button>`) +
    `<section class="card"><div class="card-body">${dashHTML(id, 'cd', true)}</div></section>`;
}
function drawCustomDash(id) { drawDash(id, 'cd', true); }

/* ---------- Slides and documents ---------- */
const SLIDES = {
  P1: [{ k: 'title', h: 'Monthly operations review', s: `${CONFIG.plant} · November 2026 · prepared with Copilot` },
    { k: 'kpis', h: 'Headline: ₹4.32 Cr/yr realised against the baseline', tiles: [['Plant OEE', '71.8 %', '▲ 5.6 pp'], ['Conversion cost', '₹38.4/kg', '▼ ₹2.5'], ['Customer PPM', '38', '▼ 55 %'], ['Specific energy', '1.92 kWh/kg', '▼ 7.7 %']] },
    { k: 'chart', h: 'OEE is up 5.6 pp since go-live on 1 Sep', kpi: 'oee' },
    { k: 'bullets', h: 'Where losses remain', b: ['Sprocket Line 2: HB-04 micro-stops and long changeovers (OEE 58 % this shift).', 'Tool cost is ₹612 per 1,000 pcs, still 18 % above target.', 'Furnace tray loading on MBF-01 is 78 % against 92 % target.'] },
    { k: 'chart', h: 'Specific energy is down 7.7 % since go-live', kpi: 'sec' },
    { k: 'bullets', h: 'Decisions needed', b: ['Approve SMED kit for Sprocket Line 2 (₹4.2 L, payback 5 weeks).', 'Approve softener upgrade for IH cooling water (₹2.8 L).', 'Extend vision inspection to Chain Line B (Q1 FY27).'] }],
  P2: [{ k: 'title', h: 'Customer quality review · OEM A', s: 'Two-wheeler drive chains and sprockets · November 2026' },
    { k: 'kpis', h: 'PPM down 55 % since 100 % vision inspection', tiles: [['Customer PPM', '38', 'baseline 84'], ['Inspection coverage', '100 %', 'was 12 % sampling'], ['Complaints', '0', 'this month'], ['8D closed on time', '100 %', '3 of 3']] },
    { k: 'chart', h: 'Customer PPM trend', kpi: 'ppm' },
    { k: 'bullets', h: 'Containment for the tooth crack event', b: ['Root cause found in 30 minutes: low quench flow on IH-02.', '1,140 parts held before dispatch. No part reached OEM A.', 'Flow interlock at 16 L/min added to the control plan.'] }],
  P3: [{ k: 'title', h: 'Energy cell review · compressed air', s: `${CONFIG.plant} · drafted by Copilot` },
    { k: 'chart', h: 'Compressed air specific power is down 10 %', kpi: 'air' },
    { k: 'bullets', h: 'Next actions', b: ['Fix 9 tagged leaks in the Press Shop header (₹18.6 L/yr).', 'Lower header pressure from 7.1 to 6.6 bar.', 'Clean the AC-02 oil cooler.'] }],
};
const DOCS = {
  W1: () => `<h2>Purpose</h2><p>This note records the value realised by the Faclon AI programme at ${CONFIG.plant}, measured against the baseline locked before go-live (${BASELINE.period}).</p>
    <h2>Value realised</h2>${tbl(['Area', '>₹ lakh/yr', 'Main KPI moved'], [['Asset maintenance', '134', 'Unplanned downtime 46 → 18.5 h/month'], ['Productivity & cost conversion', '134', 'OEE 66.2 → 71.8 %'], ['Quality · AI vision', '76', 'Customer PPM 84 → 38'], ['Energy & utilities', '88', 'Specific energy 2.08 → 1.92 kWh/kg'], ['<b>Total</b>', '<b>432</b>', '']])}
    <h2>Method</h2><ul><li>Each KPI uses the same definition before and after go-live.</li><li>Value is counted once, at the KPI that carries it.</li><li>Volumes are normalised to the baseline product mix.</li></ul>
    <div class="note"><b>Finance validation (v3):</b> the plant controller has checked the energy and downtime figures against SAP CO.</div>`,
  W2: () => `<h2>Scope</h2><p>Replacement of the front spindle bearing (FAG 7014) on CNC hobbing machines HB-01 to HB-04.</p>
    <h2>Safety</h2><ul><li>Lock out and tag out the main isolator and hydraulic unit.</li><li>Wear gloves and safety glasses. Use the bearing heater, not a flame.</li></ul>
    <h2>Steps</h2>${tbl(['#', 'Step', 'Check'], [['1', 'Remove hob arbor and spindle cover', 'Arbor stored on rack'], ['2', 'Release spindle nut, pull bearing with puller P-12', 'No scoring on shaft'], ['3', 'Heat new bearing to 110 °C, fit to shoulder', 'Even seating'], ['4', 'Torque spindle nut to 180 Nm (updated v7)', 'Torque record signed'], ['5', 'Run-in 20 min at 600 rpm, then 1,450 rpm', 'Vibration < 2.0 mm/s']])}
    <h2>Lessons from RCA-2025-017</h2><p>On HB-02 the spindle nut was under-torqued after replacement. Step 4 now uses a recorded torque value.</p>`,
};
function slideHTML(s, n, total, id) {
  const foot = `<div class="sl-foot"><span class="sl-wm">pwc</span><span>${CONFIG.customer} · Connected Plant Intelligence</span><span>${n}</span></div>`;
  if (s.k === 'title') return `<div class="slide title"><div class="sl-bars"></div><div class="sl-h1">${s.h}</div><div class="sl-sub">${s.s}</div>${foot}</div>`;
  let body = '';
  if (s.k === 'kpis') body = `<div class="sl-tiles">${s.tiles.map(t => `<div><div class="l">${t[0]}</div><div class="v">${t[1]}</div><div class="d">${t[2]}</div></div>`).join('')}</div>`;
  if (s.k === 'bullets') body = `<ul class="sl-ul">${s.b.map(x => `<li>${x}</li>`).join('')}</ul>`;
  if (s.k === 'chart') body = `<div id="sl-chart-${id}" class="sl-chart"></div>`;
  return `<div class="slide"><div class="sl-h">${s.h}</div>${body}${foot}</div>`;
}

/* ---------- Artefactory page ---------- */
function pageArtefactory() {
  state.artScope = state.artScope || 'mine';
  const f = state.artF || 'all';
  const mine = ARTEFACTS.filter(a => a.scope === 'mine').length, shared = ARTEFACTS.length - mine;
  const list = ARTEFACTS.filter(a => a.scope === state.artScope && (f === 'all' || a.type === f));
  if (!list.find(a => a.id === state.art)) state.art = (list[0] || {}).id;
  const filters = [['all', 'All'], ['dash', 'Dashboards'], ['html', 'Reports'], ['xlsx', 'Workbooks'], ['pptx', 'Presentations'], ['docx', 'Documents']];
  return headerBlock('Artefactory', 'Every dashboard, report, workbook, presentation and document in one library. Each save is a new version, with its owner and who it is shared with.',
    `<button class="btn" data-ask="Create a presentation for the energy cell review of compressed air">${ico('slides')} New deck with Copilot</button><button class="btn primary" data-ask="Build a dashboard for compressor specific power">${ico('dash')} New dashboard with Copilot</button>`) +
    kpiStrip([
      { label: 'Artefacts', value: ARTEFACTS.length, unit: '', foot: `${mine} mine · ${shared} shared with me` },
      { label: 'Dashboards', value: ARTEFACTS.filter(a => a.type === 'dash').length, unit: '', foot: 'HTML, live data' },
      { label: 'Versions kept', value: ARTEFACTS.reduce((a, x) => a + x.versions[0].v, 0), unit: '', foot: 'every save and every scheduled run' },
      { label: 'Made by agents', value: '72', unit: '%', foot: 'of versions this month' },
      { label: 'Shared links', value: '38', unit: '', foot: 'Foundry access rules apply' },
      { label: 'Storage', value: '1.2', unit: 'GB', foot: 'on plant servers' },
    ]) +
    `<div class="art-bar"><div class="tabs art-tabs"><button class="${state.artScope === 'mine' ? 'on' : ''}" data-artscope="mine">Mine <span class="muted">${mine}</span></button><button class="${state.artScope === 'shared' ? 'on' : ''}" data-artscope="shared">Shared with me <span class="muted">${shared}</span></button></div>
      <div class="seg art-f">${filters.map(x => `<button class="${x[0] === f ? 'on' : ''}" data-artf="${x[0]}">${x[1]}</button>`).join('')}</div></div>
    <div class="art-wrap">
      <section class="card art-list">${list.length ? list.map(a => `<button class="art-item ${a.id === state.art ? 'on' : ''}" data-art="${a.id}">
        <span class="fi ${TYPE[a.type].cls}">${TYPE[a.type].ext}</span>
        <span style="min-width:0;flex:1"><span class="t">${a.name}</span><span class="m">${TYPE[a.type].label} · v${a.versions[0].v} · ${a.updated}</span></span>
        ${av(a.owner, 20)}${state.pins.includes('d/' + a.id) ? `<span class="pin-on" title="Pinned to sidebar">${ico('star')}</span>` : ''}</button>`).join('') : '<div class="empty-note">Nothing here yet.</div>'}</section>
      <section class="card art-view" id="artView"></section>
    </div>`;
}
function drawArtefactory() { if (state.art) drawArtDetail(); }
function drawArtDetail() {
  const a = ARTEFACTS.find(x => x.id === state.art); if (!a) return;
  const tab = state.artTab || 'preview';
  const cur = a.versions[0].v;
  const viewV = state.artVer && state.artVer.id === a.id ? state.artVer.v : cur;
  const isDash = a.type === 'dash';
  const pinned = state.pins.includes('d/' + a.id);
  let body = '';
  if (tab === 'versions') {
    body = `<div class="card-body flush"><table class="tbl"><thead><tr><th>Version</th><th>Saved</th><th>By</th><th>Change</th><th class="r">Size</th><th></th></tr></thead><tbody>${a.versions.map(v => `<tr>
      <td><span class="chip ${v.v === cur ? 'brand' : 'outline'}">v${v.v}${v.v === cur ? ' · current' : ''}</span></td><td class="num">${v.when}</td><td>${v.who}</td><td class="muted">${v.note}</td><td class="r num muted">${v.size}</td>
      <td class="r"><button class="btn sm" data-artver="${v.v}">View</button>${v.v !== cur ? ` <button class="btn sm" data-restore="${v.v}">Restore</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
  } else {
    const banner = viewV !== cur ? `<div class="ver-banner">Viewing <b>v${viewV}</b> from ${a.versions.find(v => v.v === viewV).when}. The current version is v${cur}. <button class="btn sm" data-restore="${viewV}">Restore this version</button> <button class="btn sm" data-artver="${cur}">Back to current</button></div>` : '';
    let p = '';
    if (isDash) p = `<div class="dash-prev">${dashHTML(a.id, 'ap', false)}</div>`;
    if (a.type === 'html') p = `<div class="rep-frame">${reportDoc(REPORTS.find(r => r.id === a.rep))}</div>`;
    if (a.type === 'xlsx') p = xlGrid(a.rep);
    if (a.type === 'pptx') {
      const sl = SLIDES[a.id]; const i = Math.min(state.slide || 0, sl.length - 1);
      p = `<div class="deck"><div class="deck-thumbs">${sl.map((s, k) => `<button class="thumb ${k === i ? 'on' : ''}" data-slide="${k}"><span class="n">${k + 1}</span><span>${s.h}</span></button>`).join('')}</div>
        <div class="deck-main">${slideHTML(sl[i], i + 1, sl.length, a.id)}<div class="deck-nav"><button class="btn sm" data-slide="${Math.max(0, i - 1)}">‹ Previous</button><span class="muted">Slide ${i + 1} of ${sl.length}</span><button class="btn sm" data-slide="${Math.min(sl.length - 1, i + 1)}">Next ›</button></div></div></div>`;
    }
    if (a.type === 'docx') p = `<div class="rep-frame"><div class="rep doc"><div class="rh"><div class="wm">pwc</div><div class="rt"><h1>${a.name}</h1><div class="rm">${CONFIG.customer} · ${CONFIG.plant} · version ${viewV}</div></div><div class="rm" style="text-align:right">Owner ${PEOPLE[a.owner].n}<br>${a.updated}</div></div><div class="rb">${DOCS[a.id]()}</div><div class="rf"><span>Controlled document · stored in Artefactory</span><span>Page 1</span></div></div></div>`;
    body = banner + p;
  }
  $('#artView').innerHTML = `<div class="art-head"><span class="fi ${TYPE[a.type].cls}">${TYPE[a.type].ext}</span>
      <div style="min-width:0;flex:1"><h3>${a.name}</h3><div class="sub">${TYPE[a.type].label} · v${cur} · ${a.size} · owner ${PEOPLE[a.owner].n} · updated ${a.updated}</div>
        <div class="split" style="margin-top:6px"><span class="muted" style="font-size:11px">Shared with</span><span class="avs">${a.shared.map(k => av(k, 22)).join('')}</span></div></div>
      <div class="art-acts">${isDash ? `<button class="btn sm" data-pin="d/${a.id}">${ico('star')} ${pinned ? 'Unpin' : 'Pin to sidebar'}</button><a class="btn sm" href="#d/${a.id}">Open</a>` : ''}
        <button class="btn sm" data-toast="Link copied. Access follows Foundry roles.">Share</button>
        <button class="btn primary sm" ${a.rep ? `data-download="${a.rep}"` : `data-toast="Download started: ${a.name}.${TYPE[a.type].ext.toLowerCase()}"`}>${ico('download')} Download</button></div></div>
    <div class="tabs"><button class="${tab === 'preview' ? 'on' : ''}" data-arttab="preview">Preview</button><button class="${tab === 'versions' ? 'on' : ''}" data-arttab="versions">Versions <span class="muted">${a.versions.length}</span></button></div>
    ${body}`;
  if (tab === 'preview') {
    if (isDash) drawDash(a.id, 'ap', false);
    if (a.type === 'pptx') { const s = SLIDES[a.id][Math.min(state.slide || 0, SLIDES[a.id].length - 1)]; if (s.k === 'chart') { const k = KPIS.find(x => x.id === s.kpi); Charts.line(document.getElementById('sl-chart-' + a.id), { labels: WEEKS, series: [{ name: k.name, color: 'var(--c1)', data: kpiSeries(k) }], height: 190, dec: k.dec, thresholds: [{ value: k.base, label: 'Baseline', color: '#8a8580' }, { value: k.tgt, label: 'Target', color: '#1b8a55' }], annotations: [{ i: BASELINE.weeksBase, label: 'Go-live' }] }); } }
  }
}
function newArtefact(a) {
  if (ARTEFACTS.find(x => x.id === a.id)) return;
  ARTEFACTS.unshift({ scope: 'mine', owner: 'AR', shared: [], updated: 'Just now', ...a, versions: [V(1, 'Copilot for Anand Rao', 'Just now', 'Created from prompt', a.size)] });
}

/* ---------- Shortcut picker ---------- */
function openPinModal() {
  const all = ALLDASH();
  const groups = ['Standard', 'My dashboards', 'Shared with me'];
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-scrim" id="pinModal"><div class="modal card">
    <div class="card-head"><h3>Dashboard shortcuts</h3><span class="sub">Pinned dashboards appear in the sidebar</span><div class="right"><button class="icon-btn" id="modalClose">${ico('close')}</button></div></div>
    <div class="card-body">${groups.map(g => `<div class="cp-hgroup">${g}</div>${all.filter(d => d.src === g).map(d => `<div class="pin-row"><span class="pin-ico">${ico(d.icon)}</span><span style="flex:1">${d.t}${d.owner ? ` <span class="muted">· ${PEOPLE[d.owner].n}</span>` : ''}</span><button class="toggle ${state.pins.includes(d.k) ? 'on' : ''}" data-pin="${d.k}" data-inmodal="1"><i></i></button></div>`).join('')}`).join('')}</div></div></div>`);
}

/* ---------- click handling for this module ---------- */
function artClick(t) {
  if (t.dataset.artOpen) { const a = ARTEFACTS.find(x => x.id === t.dataset.artOpen); state.art = a.id; state.artScope = a.scope; state.artF = 'all'; state.artTab = 'preview'; location.hash = '#artefactory'; if (current === 'artefactory') render(); return true; }
  if (t.dataset.art) { state.art = t.dataset.art; state.artTab = 'preview'; state.slide = 0; state.artVer = null; $$('[data-art]').forEach(b => b.classList.toggle('on', b.dataset.art === state.art)); drawArtDetail(); return true; }
  if (t.dataset.artscope) { state.artScope = t.dataset.artscope; state.art = null; render(); return true; }
  if (t.dataset.artf) { state.artF = t.dataset.artf; render(); return true; }
  if (t.dataset.arttab) { state.artTab = t.dataset.arttab; drawArtDetail(); return true; }
  if (t.dataset.artver) { state.artVer = { id: state.art, v: +t.dataset.artver }; state.artTab = 'preview'; drawArtDetail(); return true; }
  if (t.dataset.restore) {
    const a = ARTEFACTS.find(x => x.id === state.art); const from = +t.dataset.restore; const nv = a.versions[0].v + 1;
    a.versions.unshift(V(nv, CONFIG.user.name, 'Just now', `Restored from v${from}`, a.versions.find(v => v.v === from).size)); a.updated = 'Just now';
    state.artVer = null; state.artTab = 'versions'; drawArtDetail(); toast(`Restored v${from} as v${nv}. Earlier versions are kept.`); return true;
  }
  if (t.dataset.slide) { state.slide = +t.dataset.slide; drawArtDetail(); return true; }
  if (t.dataset.pin) {
    togglePin(t.dataset.pin);
    if (t.dataset.inmodal) t.classList.toggle('on');
    else if (current.startsWith('d/') || current === 'artefactory') render();
    toast(state.pins.includes(t.dataset.pin) ? 'Pinned to the sidebar' : 'Removed from the sidebar'); return true;
  }
  if (t.id === 'pinBtn') { openPinModal(); return true; }
  if (t.id === 'modalClose') { const m = $('#pinModal'); if (m) m.outerHTML = ''; return true; }
  if (logClick(t)) return true;
  return false;
}

/* ==========================================================================
   Logs
   ========================================================================== */
const LOG_SRC = ['Agents', 'Tools', 'Data', 'Access', 'Autopilot', 'System'];
const LOG_SEED = [
  ['14:58:02.114', 'INFO', 'Agents', 'Asset Health Agent', 'session.end', 'HB-04', 'Diagnosis returned in 6.2 s, confidence 0.91'],
  ['14:57:55.902', 'INFO', 'Tools', 'Asset Health Agent', 'tool.call sap_mm.get_stock', 'MM 400221', '2 in stock, store B-14'],
  ['14:57:54.410', 'INFO', 'Tools', 'Asset Health Agent', 'tool.call deepsense.fft_diagnose', 'HB-04 SPDL_VIB', 'BPFO 162 Hz, harmonics 2×, 3×'],
  ['14:57:50.007', 'INFO', 'Agents', 'Asset Health Agent', 'session.start', 'HB-04', 'Trigger: workflow w1 · health 38'],
  ['14:52:31.552', 'INFO', 'Access', 'Maintenance Planner', 'approval.requested', 'WO 4100 8821', 'Approver J. Thomas · cost ₹62,400 > ₹50,000'],
  ['14:46:12.881', 'WARN', 'Tools', 'Energy & Utilities Agent', 'tool.denied plc.write_setpoint', 'SQF-01', 'Blocked: agents never write to control systems'],
  ['14:40:09.330', 'INFO', 'Autopilot', 'Vision Quality Agent', 'artefact.version', 'RCA 8D draft v1', 'Saved to Artefactory · shared with N. Shah'],
  ['14:31:44.027', 'INFO', 'Autopilot', 'workflow w2', 'workflow.run', 'VI-01', 'Defect rate 0.99 % > 3σ · lot hold raised'],
  ['14:31:40.611', 'INFO', 'Tools', 'Vision Quality Agent', 'tool.call sap_qm.create_quality_hold', 'QH-2611-07', '1,140 pcs blocked'],
  ['14:22:18.204', 'WARN', 'Data', 'I/O Connect', 'tag.frozen', 'HSR.UTL.AIR.AC02.FAD', 'No change for 12 min · flagged to OT team'],
  ['14:20:03.900', 'INFO', 'Access', 'Anand Rao', 'artefact.version', 'Sprocket Line 2 · OEE war room v3', 'Edited with Copilot'],
  ['14:12:41.018', 'INFO', 'Agents', 'Cost Conversion Agent', 'session.end', 'Sprocket Line 2', 'Loss tree returned · user A. Rao'],
  ['14:10:07.445', 'WARN', 'Data', 'UDF rules', 'limit.breach', 'IH-02 QUENCH_FLOW', '14.6 L/min < LCL 16 L/min'],
  ['14:05:00.120', 'INFO', 'Autopilot', 'Shift Report Agent', 'schedule.run', 'Shift handover report', 'Sent to 14 recipients'],
  ['13:58:30.771', 'INFO', 'Autopilot', 'workflow w3', 'workflow.run', 'Sprocket Line 2', 'OEE 58 % for 60 min · alert to S. Iyer'],
  ['13:41:16.302', 'ERROR', 'Data', 'I/O Connect', 'connector.timeout', 'SAP CO OData', 'Timeout after 30 s · retry 2 of 3 succeeded'],
  ['13:20:02.588', 'INFO', 'Autopilot', 'Energy & Utilities Agent', 'schedule.run', 'Break-time air scan', 'Leak load 14 %'],
  ['12:58:44.090', 'WARN', 'Data', 'Vibration gateway', 'sensor.battery_low', 'VIB-N-17 (PR-02)', 'Battery 14 % · replace within 7 days'],
  ['12:30:11.214', 'INFO', 'Access', 'G. Nair', 'artefact.shared', 'Compressor house v4', 'Shared with Anand Rao'],
  ['12:05:00.004', 'INFO', 'Autopilot', 'Shift Report Agent', 'schedule.run', 'Shift A report', 'Sent to 14 recipients'],
  ['11:40:51.660', 'INFO', 'Access', 'J. Thomas', 'approval.granted', 'WO 4100 8809', 'Released in SAP PM'],
  ['11:05:37.912', 'INFO', 'Access', 'Anand Rao', 'artefact.version', 'Monthly operations review v5', 'Edited decisions slide'],
  ['10:22:09.118', 'WARN', 'Access', 'V. Menon', 'access.denied', 'SAP CO cost centres', 'Role Heat treatment in-charge has no finance scope'],
  ['09:12:40.205', 'INFO', 'Agents', 'Copilot', 'dashboard.update', 'Plant head daily view v6', 'Added value-realised tile'],
  ['08:00:00.031', 'INFO', 'Autopilot', 'Cost Conversion Agent', 'schedule.run', 'OEE & six big losses', 'Excel sent to 6'],
  ['07:30:00.017', 'INFO', 'Autopilot', 'Shift Report Agent', 'schedule.run', 'Daily plant performance', 'Sent to 9'],
  ['07:02:14.880', 'INFO', 'Access', 'Anand Rao', 'user.signin', 'SSO · MFA', 'Device: laptop, Hosur'],
  ['06:15:00.022', 'INFO', 'Autopilot', 'Vision Quality Agent', 'schedule.run', 'Vision defect log', 'Excel sent to 7'],
  ['03:00:00.000', 'INFO', 'System', 'Forge', 'backup.completed', 'UDF snapshot', '214 GB · 18 min'],
  ['02:10:44.501', 'INFO', 'System', 'Deepsense', 'model.promoted', 'vision-defect v3.4', 'Shadow → live after 7 days · approver N. Shah'],
  ['00:00:05.640', 'INFO', 'Data', 'UDF', 'kpi.rollup', 'Daily KPIs', '21 KPIs calculated'],
];
const LOGS = LOG_SEED.map((r, i) => ({ t: r[0], lvl: r[1], src: r[2], actor: r[3], ev: r[4], obj: r[5], msg: r[6], trace: 'tr-' + (88120 - i * 37).toString(16) }));
const LIVE_POOL = [
  ['INFO', 'Data', 'I/O Connect', 'ingest.batch', 'OPC UA · PLC-PRS-01', () => `${(11000 + Math.floor(Math.random() * 3000)).toLocaleString('en-IN')} points`],
  ['INFO', 'Data', 'I/O Connect', 'connector.heartbeat', 'Modbus · EM gateway 2', () => 'Latency 120 ms'],
  ['INFO', 'Tools', 'Vision Quality Agent', 'tool.call vision.get_defect_stats', 'VI-01', () => `Reject rate ${(0.3 + Math.random() * 0.2).toFixed(2)} %`],
  ['INFO', 'Tools', 'Cost Conversion Agent', 'tool.call mes.get_oee', 'Sprocket Line 2', () => `OEE ${(60 + Math.random() * 6).toFixed(1)} %`],
  ['INFO', 'Agents', 'Energy & Utilities Agent', 'model.call', 'Local LLM', () => `${1200 + Math.floor(Math.random() * 1800)} tokens`],
  ['WARN', 'Data', 'UDF rules', 'limit.watch', 'AC-02 OIL_T', () => `${(94 + Math.random() * 2).toFixed(1)} °C · trip at 100 °C`],
];
function pageLogs() {
  state.logSrc = state.logSrc || 'All'; state.logLvl = state.logLvl || 'All';
  if (state.logLive == null) state.logLive = true;
  return headerBlock('Logs', 'Every agent session, tool call, data event, approval and change. Kept in the Foundry audit trail.',
    `<button class="btn" data-toast="Log export queued: CSV for today, all sources">${ico('download')} Export</button>`) +
    kpiStrip([
      { label: 'Events today', value: '48,212', unit: '', foot: 'all sources', live: 'logs' },
      { label: 'Errors', value: LOGS.filter(l => l.lvl === 'ERROR').length, unit: '', foot: 'all recovered' },
      { label: 'Warnings', value: '41', unit: '', foot: `${LOGS.filter(l => l.lvl === 'WARN').length} shown below` },
      { label: 'Agent sessions', value: '412', unit: '', foot: 'traced end to end' },
      { label: 'Blocked actions', value: '3', unit: '', foot: 'guardrails and roles' },
      { label: 'Retention', value: '7', unit: 'years', foot: 'audit policy' },
    ]) +
    `<section class="card"><div class="log-bar">
      <div class="seg">${['All', ...LOG_SRC].map(s => `<button class="${s === state.logSrc ? 'on' : ''}" data-logsrc="${s}">${s}</button>`).join('')}</div>
      <div class="seg">${['All', 'INFO', 'WARN', 'ERROR'].map(s => `<button class="${s === state.logLvl ? 'on' : ''}" data-loglvl="${s}">${s === 'All' ? 'All levels' : s}</button>`).join('')}</div>
      <label class="search log-search">${ico('search', 'style="width:13px;height:13px"')}<input id="logQ" placeholder="Search events, objects, trace IDs" value="${state.logQ || ''}"></label>
      <span class="split right-a"><span class="muted" style="font-size:12px">Live tail</span><button class="toggle ${state.logLive ? 'on' : ''}" id="logLive"><i></i></button></span>
    </div><div class="card-body flush"><table class="tbl log-tbl"><thead><tr><th>Time</th><th>Level</th><th>Source</th><th>Actor</th><th>Event</th><th>Object</th><th>Trace</th></tr></thead><tbody id="logBody"></tbody></table></div></section>`;
}
function logRows() {
  const q = (state.logQ || '').toLowerCase();
  return LOGS.filter(l => (state.logSrc === 'All' || l.src === state.logSrc) && (state.logLvl === 'All' || l.lvl === state.logLvl) && (!q || JSON.stringify(l).toLowerCase().includes(q)));
}
function logRowHTML(l, isNew) {
  return `<tr class="click ${isNew ? 'log-new' : ''}" data-logrow="${l.trace}"><td class="mono">${l.t}</td><td><span class="chip ${l.lvl === 'ERROR' ? 'bad' : l.lvl === 'WARN' ? 'warn' : ''}">${l.lvl}</span></td><td class="muted">${l.src}</td><td>${l.actor}</td><td class="mono">${l.ev}</td><td>${l.obj}</td><td class="mono muted">${l.trace}</td></tr>`;
}
function drawLogs() {
  $('#logBody').innerHTML = logRows().map(l => logRowHTML(l)).join('') || '<tr><td colspan="7" class="muted">No events match.</td></tr>';
  const q = $('#logQ'); q.oninput = () => { state.logQ = q.value; drawLogs(); q.focus(); };
}
function logClick(t) {
  if (t.dataset.logsrc) { state.logSrc = t.dataset.logsrc; $$('[data-logsrc]').forEach(b => b.classList.toggle('on', b === t)); drawLogs(); return true; }
  if (t.dataset.loglvl) { state.logLvl = t.dataset.loglvl; $$('[data-loglvl]').forEach(b => b.classList.toggle('on', b === t)); drawLogs(); return true; }
  if (t.id === 'logLive') { state.logLive = !state.logLive; t.classList.toggle('on', state.logLive); return true; }
  if (t.dataset.logrow) {
    const nx = t.nextElementSibling;
    if (nx && nx.classList.contains('log-detail')) { nx.outerHTML = ''; return true; }
    const l = LOGS.find(x => x.trace === t.dataset.logrow);
    t.insertAdjacentHTML('afterend', `<tr class="log-detail"><td colspan="7"><pre>${JSON.stringify({ time: '2026-11-26T' + l.t + '+05:30', level: l.lvl, source: l.src, actor: l.actor, event: l.ev, object: l.obj, message: l.msg, trace_id: l.trace, site: CONFIG.plantCode, acting_for: l.src === 'Agents' || l.src === 'Tools' ? CONFIG.user.name : undefined, policy: l.lvl === 'WARN' && /denied/.test(l.ev) ? 'blocked by Foundry policy' : 'allowed' }, null, 2)}</pre></td></tr>`);
    return true;
  }
  return false;
}
setInterval(() => {
  if (current !== 'settings/logs' || !state.logLive || !$('#logBody')) return;
  const p = LIVE_POOL[Math.floor(Math.random() * LIVE_POOL.length)];
  const d = new Date();
  const l = { t: d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0'), lvl: p[0], src: p[1], actor: p[2], ev: p[3], obj: p[4], msg: p[5](), trace: 'tr-' + Math.floor(Math.random() * 1e6).toString(16) };
  LOGS.unshift(l);
  if (logRows()[0] === l) $('#logBody').insertAdjacentHTML('afterbegin', logRowHTML(l, true));
}, 2500);
