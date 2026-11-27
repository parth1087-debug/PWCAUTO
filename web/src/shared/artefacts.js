/* Artefact catalogue shared by the app and the server.
   Types: dash (dashboard), xlsx (sheet), pptx (presentation), docx (document), form.
   A dashboard's spec.view is one of: kpis, overview, maintenance, cost, quality, energy (built-in boards),
   twin { asset }, realtime { assets }, setpoints, or custom { widgets } (for agent-made boards). */

export const TYPES = {
  dash: { label: 'Dashboard', plural: 'Dashboards', ext: 'HTML' },
  xlsx: { label: 'Sheet', plural: 'Sheets', ext: 'XLSX' },
  pptx: { label: 'Presentation', plural: 'Presentations', ext: 'PPTX' },
  docx: { label: 'Document', plural: 'Documents', ext: 'DOCX' },
  form: { label: 'Form', plural: 'Forms', ext: 'FORM' },
  html: { label: 'HTML page', plural: 'HTML pages', ext: 'HTML' },
};
export const VIEWS = ['kpis', 'overview', 'maintenance', 'cost', 'quality', 'energy', 'twin', 'realtime', 'setpoints', 'mimic', 'rca', 'custom'];
export const WIDGETS = ['kpis', 'kpi_trend', 'tag_trend', 'asset_health', 'losses', 'energy', 'alerts', 'setpoints', 'live', 'text', 'headline', 'kpi_compare', 'gauge', 'pareto', 'table', 'production', 'site_compare'];
const DEFAULT_NAMES = { kpis: 'KPI scorecard', overview: 'Plant overview', maintenance: 'Maintenance', cost: 'Cost conversion', quality: 'Quality', energy: 'Energy & utilities' };
export const dashName = (demo, view) => (demo.dashNames && demo.dashNames[view]) || DEFAULT_NAMES[view];

import { MIMICS } from './mimics.js';

const M = 60e3;
const V = (v, by, minsAgo, note, now) => ({ v, by, when: now - minsAgo * M, note });
const owner = demo => demo.id;

/** Seed artefacts for one demo. Deterministic ids so the server and app agree. */
export function seedFor(demo, now = Date.now()) {
  const o = owner(demo);
  const A = (key, type, name, spec, versions, extra = {}) => ({ id: `${demo.id}-${key}`, type, demo: demo.id, name, owner: o, shared: ['master'], spec, versions, ...extra });
  const spot = demo.maintenance?.spotlight;
  const spotAsset = demo.areas.flatMap(a => a.lines.flatMap(l => l.assets)).find(x => x[0] === spot);
  const list = [
    A('kpis', 'dash', dashName(demo, 'kpis'), { view: 'kpis', shortcut: 1 }, [V(9, 'Faclon', 60 * 24 * 3, 'Targets updated for H2', now), V(8, 'Faclon', 60 * 24 * 30, 'Added value realised column', now)]),
    A('overview', 'dash', dashName(demo, 'overview'), { view: 'overview', shortcut: 2 }, [V(14, 'Copilot for Master', 180, 'Added needs-attention feed', now), V(13, 'Master', 60 * 24 * 6, 'Re-ordered tiles', now)]),
    A('maintenance', 'dash', dashName(demo, 'maintenance'), { view: 'maintenance', shortcut: 3 }, [V(11, 'Asset Health Agent', 95, 'Added remaining-life column', now), V(10, 'Faclon', 60 * 24 * 12, 'Criticality filter', now)]),
    A('cost', 'dash', dashName(demo, 'cost'), { view: 'cost', shortcut: 4 }, [V(7, 'Copilot for Master', 300, 'Added cost bridge', now), V(6, 'Faclon', 60 * 24 * 20, 'Loss tree by line', now)]),
    A('quality', 'dash', dashName(demo, 'quality'), { view: 'quality', shortcut: 5 }, [V(6, 'Quality Agent', 140, 'Added SPC limits', now), V(5, 'Faclon', 60 * 24 * 25, 'Defect Pareto', now)]),
    A('energy', 'dash', dashName(demo, 'energy'), { view: 'energy', shortcut: 6 }, [V(8, 'Energy Agent', 420, 'Added weekly load pattern', now), V(7, 'Faclon', 60 * 24 * 15, 'Contract demand line', now)]),
    A('twin', 'dash', `${spot} · ${spotAsset ? spotAsset[1] : 'asset'} twin`, { view: 'twin', asset: spot, shortcut: 7 }, [V(4, 'Asset Health Agent', 25, 'Linked latest diagnosis', now), V(3, 'Faclon', 60 * 24 * 9, 'Added data-source bindings', now)]),
    A('realtime', 'dash', (demo.realtime && demo.realtime.title) || 'Live operations monitor', { view: 'realtime', assets: demo.realtime?.assets, shortcut: 8 }, [V(5, 'Faclon', 60 * 24 * 2, 'Ten-second refresh', now)]),
    A('setpoints', 'dash', 'Setpoint advisor', { view: 'setpoints', shortcut: 9 }, [V(3, 'Process Agent', 70, 'New recommendations from overnight run', now), V(2, 'Faclon', 60 * 24 * 10, 'Approval flow added', now)]),
    A('sheet', 'xlsx', 'KPI and losses sheet', { kind: 'daily' }, [V(32, 'Cost Conversion Agent', 400, 'Daily refresh', now), V(31, 'Cost Conversion Agent', 1840, 'Daily refresh', now)]),
    A('deck', 'pptx', 'Monthly operations review', { kind: 'monthly' }, [V(5, 'Master', 230, 'Edited decisions slide', now), V(4, 'Copilot for Master', 260, 'Refreshed with month-to-date data', now)]),
    A('daily', 'docx', 'Daily performance report', { kind: 'report' }, [V(58, 'Report Agent', 95, 'Scheduled run', now), V(57, 'Report Agent', 95 + 1440, 'Scheduled run', now)]),
    A('value', 'docx', 'Value realisation note', { kind: 'note' }, [V(3, 'Plant controller', 1700, 'Finance validation added', now), V(2, 'Master', 6000, 'Added energy section', now)]),
    A('page', 'html', `${demo.company} · plant one-pager`, { kind: 'onepager' }, [V(2, 'Copilot for Master', 60 * 5, 'Refreshed with live KPIs', now), V(1, 'Faclon', 60 * 24 * 6, 'Created as a shareable web page', now)]),
    A('rca', 'dash', 'Anomalies · RCA and recommendations', { view: 'rca' }, [V(6, 'Asset Health Agent', 12, 'New anomaly added with evidence', now), V(5, 'Faclon', 60 * 24 * 5, 'Grouped by asset and status', now)]),
    ...(MIMICS[demo.id] || []).map((m, i) => A('mimic-' + m.id, 'dash', m.name, { view: 'mimic', mimic: m.id, ...(i === 0 ? { shortcut: 10 } : {}) }, [V(3 + i, 'Faclon', 60 * (20 + i * 7), 'Live bindings checked against the UNS', now), V(1, 'Faclon', 60 * 24 * (12 + i), 'Drawn from the plant P&ID and SLD', now)])),
    ...(demo.forms || []).map((f, i) => A('form-' + f.id, 'form', f.name, { form: f.id }, [V(2 + i, 'Faclon', 60 * 24 * (4 + i * 3), 'Fields reviewed with the plant', now)])),
  ];
  return list;
}

/** Extra custom dashboards, one set per plant. Each board is built for one user and the decisions they make;
    widget types and options are listed in ARTEFACT_HELP. Only real KPI ids, asset ids and tag keys of each plant. */
const B = (key, name, widgets) => ({ key, name, spec: { view: 'custom', widgets } });
export const EXTRA = {
  auto: [
    /* Plant head: am I on target, what is the gap worth, where do I lose, what must I decide today? */
    B('d-head', 'Plant head daily view', [{ type: 'headline', ids: ['oee', 'conv', 'fpy', 'ppm', 'sec', 'udt'] }, { type: 'kpis', ids: ['oee', 'conv', 'fpy', 'ppm', 'sec', 'udt'] },
      { type: 'production' }, { type: 'kpi_trend', id: 'oee' }, { type: 'pareto', source: 'losses' }, { type: 'alerts' }, { type: 'table', of: 'lines', highlight: 'Sprocket Line 2' }]),
    /* Line lead, Sprocket Line 2: will HB-04 last to the planned stop, and what is holding the line back? */
    B('d-sl2', 'Sprocket Line 2 war room', [{ type: 'kpis', ids: ['oee', 'chg', 'avail', 'mtbf'] }, { type: 'tag_trend', asset: 'HB-04', tag: 'spindle_vibration' }, { type: 'tag_trend', asset: 'HB-04', tag: 'bearing_temp' },
      { type: 'live', assets: ['HB-03', 'HB-04'] }, { type: 'asset_health', assets: ['HB-01', 'HB-02', 'HB-03', 'HB-04'] }, { type: 'table', of: 'lines', highlight: 'Sprocket Line 2' }, { type: 'alerts', assets: ['HB-03', 'HB-04'] }]),
  ],
  cement: [
    /* Kiln head: is the kiln stable and efficient, is a stop coming, which setpoint to change? */
    B('d-kiln', 'Kiln command view', [{ type: 'kpis', ids: ['krf', 'heat', 'fcao', 'udt', 'power', 'cost'] }, { type: 'tag_trend', asset: 'PH-01', tag: 'c4_draft' }, { type: 'tag_trend', asset: 'KL-01', tag: 'free_lime' },
      { type: 'tag_trend', asset: 'KL-01', tag: 'shell_temp' }, { type: 'live', assets: ['KL-01', 'PH-01', 'ID-01', 'CL-01'] }, { type: 'setpoints' }, { type: 'alerts', assets: ['KL-01', 'PH-01', 'ID-01', 'CL-01'] }]),
  ],
  steel: [
    /* Mill manager: yield and utilisation vs target, cobble and gearbox risk, top losses. */
    B('d-mill', 'Mill war room', [{ type: 'kpis', ids: ['yield', 'util', 'cobbles', 'udt', 'fuel', 'rej'] }, { type: 'production' }, { type: 'pareto', source: 'losses' },
      { type: 'tag_trend', asset: 'FS-01', tag: 'gearbox_vibration' }, { type: 'tag_trend', asset: 'RHF-01', tag: 'zone3_temp' }, { type: 'live', assets: ['RS-01', 'IS-01', 'FS-01', 'RHF-01'] }, { type: 'alerts', assets: ['RS-01', 'IS-01', 'FS-01', 'RHF-01', 'CCM-01'] }]),
  ],
  'pharma-api': [
    /* Shift-in-charge, API block: batches on plan, reactor and dryer inside limits, what to escalate. */
    B('d-shift', 'API block shift-in-charge board', [{ type: 'kpis', ids: ['yield', 'cycle', 'rft', 'dev', 'oee', 'solvent'] }, { type: 'production' }, { type: 'alerts' },
      { type: 'tag_trend', asset: 'R-102', tag: 'mass_temp' }, { type: 'tag_trend', asset: 'RCVD-301', tag: 'dry_time' }, { type: 'live', assets: ['R-101', 'R-102', 'R-103', 'CF-202', 'RCVD-301', 'DC-401'] }, { type: 'asset_health', limit: 6 }]),
    /* Plant head / finance: where yield, solvent and time go, and what each fix is worth. */
    B('d-yield', 'Yield, solvent and cost war room', [{ type: 'headline', ids: ['yield', 'solvent', 'conv', 'cycle', 'sec', 'steam'] }, { type: 'kpis', ids: ['yield', 'solvent', 'conv', 'cycle', 'sec', 'release'] },
      { type: 'pareto', source: 'losses' }, { type: 'pareto', source: 'defects' }, { type: 'tag_trend', asset: 'DC-401', tag: 'dp' }, { type: 'setpoints' }, { type: 'table', of: 'lines' }]),
  ],
  'pharma-formulation': [
    /* Packaging manager: line OEE, clearance and rejects, worst line first. */
    B('d-pack', 'Packaging lines war room', [{ type: 'kpis', ids: ['oee', 'clear', 'yield', 'conv'] }, { type: 'table', of: 'lines', highlight: 'Pack line' }, { type: 'pareto', source: 'losses' },
      { type: 'pareto', source: 'defects' }, { type: 'tag_trend', asset: 'BL-01', tag: 'seal_temp' }, { type: 'live', assets: ['BL-01', 'BL-02', 'VIS-01', 'VIS-02', 'CT-01'] }, { type: 'alerts', assets: ['BL-01', 'BL-02', 'VIS-01', 'VIS-02', 'CT-01'] }]),
    /* QA head: is compression in control, is the GMP environment inside limits, what deviations are open? */
    B('d-gmp', 'Compression and GMP environment', [{ type: 'kpis', ids: ['rft', 'wrsd', 'dev', 'release', 'cpm'] }, { type: 'tag_trend', asset: 'TP-02', tag: 'weight_rsd' }, { type: 'tag_trend', asset: 'TP-02', tag: 'weight' },
      { type: 'table', of: 'tags', tag: 'room_dp' }, { type: 'tag_trend', asset: 'PW-01', tag: 'conductivity' }, { type: 'alerts' }]),
  ],
  solar: [
    /* Portfolio head: energy vs plan and P50, which site is weakest, what the losses are worth. */
    B('d-portfolio', 'Solar portfolio board', [{ type: 'headline', ids: ['pr', 'cuf', 'p50', 'pa', 'soil', 'curt'] }, { type: 'kpis', ids: ['pr', 'cuf', 'p50', 'pa', 'soil', 'curt'] }, { type: 'site_compare' },
      { type: 'production' }, { type: 'pareto', source: 'losses' }, { type: 'kpi_trend', id: 'pr' }, { type: 'alerts' }]),
    /* O&M manager: which inverter, tracker or block to send the crew to first. */
    B('d-om', 'O&M field board', [{ type: 'kpis', ids: ['pa', 'inva', 'omc', 'clean'] }, { type: 'table', of: 'tags', tag: 'igbt_temp' }, { type: 'asset_health', limit: 6 },
      { type: 'tag_trend', asset: 'PV-SMS-01', tag: 'soiling_ratio' }, { type: 'tag_trend', asset: 'KN-TRK-12', tag: 'tracking_error' }, { type: 'pareto', source: 'defects' }, { type: 'setpoints' }]),
  ],
  wind: [
    /* Portfolio head: export vs plan and P50, weakest farm, lost production in MWh and ₹. */
    B('d-portfolio', 'Wind portfolio board', [{ type: 'headline', ids: ['avail', 'cuf', 'pcpi', 'lostprod', 'p50', 'omcost'] }, { type: 'kpis', ids: ['avail', 'cuf', 'pcpi', 'lostprod', 'p50', 'omcost'] }, { type: 'site_compare' },
      { type: 'production' }, { type: 'pareto', source: 'losses' }, { type: 'table', of: 'lines' }, { type: 'alerts' }]),
    /* Reliability engineer: which turbine fails next, and where the gearbox and generator run hot. */
    B('d-turbines', 'Turbine reliability board', [{ type: 'kpis', ids: ['mtbf', 'mttr', 'gbxexc', 'avail'] }, { type: 'table', of: 'tags', tag: 'gbx_hss_temp' }, { type: 'asset_health', limit: 7 },
      { type: 'tag_trend', asset: 'MP-WTG-07', tag: 'gbx_hss_temp' }, { type: 'tag_trend', asset: 'JS-WTG-05', tag: 'gen_wind_temp' }, { type: 'tag_trend', asset: 'JS-WTG-03', tag: 'yaw_misalign' }, { type: 'pareto', source: 'defects' }]),
  ],
  pipes: [
    /* Shift-in-charge, extrusion: output on plan, which line is down or drifting, what to act on this shift. */
    B('d-shift', 'Extrusion shift board', [{ type: 'kpis', ids: ['oee', 'giveaway', 'rej', 'udt', 'sec', 'chg'] }, { type: 'production' }, { type: 'table', of: 'lines' },
      { type: 'tag_trend', asset: 'EXT-L03', tag: 'melt_pressure' }, { type: 'live', assets: ['EXT-L03', 'EXT-L05', 'VAC-L05', 'UTG-L05', 'EXT-L07', 'IMM-14'] }, { type: 'alerts' }]),
    /* Plant head: resin give-away and rejects are the biggest money leak; how big and which line. */
    B('d-giveaway', 'Material give-away war room', [{ type: 'headline', ids: ['giveaway', 'rej', 'oee', 'sec'] }, { type: 'kpis', ids: ['giveaway', 'rej', 'util', 'mcpt'] },
      { type: 'tag_trend', asset: 'UTG-L05', tag: 'weight_m' }, { type: 'table', of: 'tags', tag: 'weight_m', span: 'half' }, { type: 'pareto', source: 'defects' }, { type: 'setpoints' }]),
  ],
  ems: [
    /* Utility manager: specific power of air, chillers, boilers and DG vs target, and the setpoint to fix each. */
    B('d-spec', 'Specific power and efficiency', [{ type: 'kpis', ids: ['sec', 'air', 'kwtr', 'blreff', 'dgsfc', 'cond'] }, { type: 'kpi_compare', ids: ['sec', 'air', 'kwtr', 'blreff', 'dgsfc', 'cond', 're', 'pf'] },
      { type: 'kpi_trend', id: 'sec' }, { type: 'tag_trend', asset: 'AC-03', tag: 'spec_power' }, { type: 'tag_trend', asset: 'CH-02', tag: 'kw_tr' }, { type: 'tag_trend', asset: 'AR-01', tag: 'leak_pct' }, { type: 'setpoints' }]),
    /* Energy manager / finance: are we inside contract demand, is PF earning the incentive, what the avoidable cost is. */
    B('d-demand', 'Demand, PF and tariff', [{ type: 'kpis', ids: ['md', 'pf', 'cost', 're'] }, { type: 'gauge', id: 'md' }, { type: 'gauge', asset: 'GRID-01', tag: 'kva' }, { type: 'gauge', asset: 'TR-02', tag: 'wind_temp' },
      { type: 'energy' }, { type: 'tag_trend', asset: 'GRID-01', tag: 'pf' }, { type: 'pareto', source: 'losses' }, { type: 'tag_trend', asset: 'SOL-01', tag: 'ac_kw' }, { type: 'alerts', assets: ['GRID-01', 'TR-01', 'TR-02', 'APFC-01', 'HF-01', 'SOL-01'] }]),
    /* Electrical maintenance: transformers, busbars and DG sets running hot or inefficient. */
    B('d-transformers', 'Transformers and DG sets', [{ type: 'kpis', ids: ['md', 'pf', 'dgsfc'] }, { type: 'asset_health', assets: ['TR-01', 'TR-02', 'BB-01', 'BB-02', 'DG-01', 'DG-02', 'UPS-01', 'HF-01'] }, { type: 'live', assets: ['TR-01', 'TR-02', 'BB-01', 'DG-01'] },
      { type: 'tag_trend', asset: 'TR-02', tag: 'wind_temp' }, { type: 'tag_trend', asset: 'BB-01', tag: 'joint_y' }, { type: 'tag_trend', asset: 'TR-02', tag: 'thd_i' }, { type: 'tag_trend', asset: 'DG-01', tag: 'sfc' }]),
  ],
  power: [
    /* Performance engineer: where the net heat rate gap comes from (kcal/kWh and ₹), and the setpoint that closes it. */
    B('d-heatrate', 'Heat rate deviation and losses', [{ type: 'headline', ids: ['nhr', 'beff', 'apc', 'scc', 'ubc', 'spray'] }, { type: 'kpis', ids: ['nhr', 'beff', 'apc', 'scc', 'ubc', 'spray'] }, { type: 'pareto', source: 'losses' },
      { type: 'kpi_trend', id: 'nhr' }, { type: 'tag_trend', asset: 'APH-01', tag: 'gas_out' }, { type: 'tag_trend', asset: 'COND-01', tag: 'back_pressure' }, { type: 'tag_trend', asset: 'ATT-01', tag: 'sh_spray' }, { type: 'tag_trend', asset: 'BLR-01', tag: 'o2' }, { type: 'setpoints' }]),
    /* Electrical / energy engineer: which auxiliary drives eat the APC, and which is wasting power now. */
    B('d-apc', 'Auxiliary power consumption', [{ type: 'kpis', ids: ['apc', 'plf', 'nhr'] }, { type: 'kpi_trend', id: 'apc' }, { type: 'tag_trend', asset: 'CT-01', tag: 'fan_kw' },
      { type: 'table', of: 'tags', tag: 'kw', assets: ['BFP-A', 'BFP-B', 'CWP-A', 'CWP-B', 'ID-A', 'ID-B', 'PA-A', 'PA-B', 'FD-A', 'FD-B', 'MILL-A', 'MILL-B', 'MILL-C', 'MILL-D', 'ESP-01'], limit: 8 },
      { type: 'tag_trend', asset: 'BFP-A', tag: 'recirc_flow' }, { type: 'energy' }, { type: 'alerts', assets: ['BFP-A', 'BFP-B', 'ID-A', 'ID-B', 'CT-01', 'UAT-01'] }]),
  ],
};

export function seedAll(DEMOS, now = Date.now()) {
  const out = [];
  for (const d of Object.values(DEMOS)) {
    out.push(...seedFor(d, now));
    for (const x of EXTRA[d.id] || []) {
      const kpis = (x.spec.widgets.find(w => w.type === 'kpis')?.ids || []).filter(id => d.kpis.find(k => k.id === id));
      out.push({ id: `${d.id}-${x.key}`, type: 'dash', demo: d.id, name: x.name, owner: d.id, shared: ['master'], spec: { ...x.spec, widgets: x.spec.widgets.map(w => (w.type === 'kpis' ? { ...w, ids: kpis } : w)) },
        versions: [{ v: 3, by: `Copilot for ${d.name}`, when: now - 50 * M, note: 'Added live tiles' }, { v: 2, by: d.name, when: now - 8000 * M, note: 'Re-ordered widgets' }, { v: 1, by: `Copilot for ${d.name}`, when: now - 17000 * M, note: 'Created from prompt' }] });
    }
  }
  return out;
}

/** Check and normalise an artefact coming from the Copilot, an agent or the API. Returns { ok, value | error }. */
export function normaliseArtefact(input, demo) {
  if (!input || typeof input !== 'object') return { ok: false, error: 'artefact must be an object' };
  const TYPE_OF = { dashboard: 'dash', dash: 'dash', sheet: 'xlsx', xlsx: 'xlsx', workbook: 'xlsx', excel: 'xlsx', spreadsheet: 'xlsx', presentation: 'pptx', deck: 'pptx', slides: 'pptx', pptx: 'pptx', document: 'docx', doc: 'docx', docx: 'docx', note: 'docx', report: 'docx', form: 'form', html: 'html', 'html page': 'html', page: 'html', webpage: 'html', 'web page': 'html', onepager: 'html' };
  const type = TYPE_OF[String(input.type || '').toLowerCase().trim()];
  if (!TYPES[type]) return { ok: false, error: `type must be one of dashboard, sheet, presentation, document, form, html` };
  const name = String(input.name || '').trim().slice(0, 90);
  if (!name) return { ok: false, error: 'name is required' };
  let spec = input.spec && typeof input.spec === 'object' ? input.spec : {};
  if (type === 'dash') {
    const view = VIEWS.includes(spec.view) ? spec.view : 'custom';
    spec = { ...spec, view };
    if (view === 'custom') {
      const widgets = (Array.isArray(spec.widgets) ? spec.widgets : []).filter(w => w && WIDGETS.includes(w.type)).slice(0, 12)
        .map(w => (w.type === 'kpis' ? { ...w, ids: (w.ids || []).filter(id => demo.kpis.find(k => k.id === id)).slice(0, 6) } : w));
      if (!widgets.length) widgets.push({ type: 'kpis', ids: demo.overview.slice(0, 4) }, { type: 'alerts' });
      spec.widgets = widgets;
    }
  }
  if (type === 'form') {
    const f = spec.form && typeof spec.form === 'object' ? spec.form : null;
    if (typeof spec.form === 'string' && !(demo.forms || []).find(x => x.id === spec.form)) return { ok: false, error: `unknown form ${spec.form}` };
    if (f && !Array.isArray(f.sections)) return { ok: false, error: 'form needs sections' };
  }
  if (type === 'html') {
    if (spec.html != null && typeof spec.html !== 'string') return { ok: false, error: 'html spec needs html as a string' };
    if (spec.html && spec.html.length > 300000) return { ok: false, error: 'html is larger than 300 kB' };
    if (!spec.html) spec = { ...spec, kind: spec.kind || 'onepager' };
  }
  return { ok: true, value: { type, name, spec } };
}

/** The artefact spec format, for tool descriptions and agent instructions. */
export const ARTEFACT_HELP = `type: dashboard | sheet | presentation | document | form.
dashboard spec: { view: "kpis"|"overview"|"maintenance"|"cost"|"quality"|"energy"|"rca" } for a built-in board, { view: "mimic", mimic: "<mimic id from get_mimics>" } for a process or asset view, { view: "twin", asset: "<ASSET-ID>" }, { view: "realtime", assets: ["<ASSET-ID>", …] }, { view: "setpoints" }, or { view: "custom", widgets: [ … ] } with widgets (titles state the insight, everything follows the period selector): {type:"headline", ids?:[kpi ids]} one-line summary of KPI gaps, top loss and alerts; {type:"kpis", ids:[up to 6 kpi ids]} tiles with target gap and ₹ at stake; {type:"kpi_compare", ids?} progress from baseline to target; {type:"kpi_trend", id}; {type:"gauge", id} or {type:"gauge", asset, tag}; {type:"tag_trend", asset, tag} with limits and hours outside them; {type:"production"} plan vs actual; {type:"energy"} demand vs contract; {type:"pareto", source:"losses"|"defects"} (or {type:"losses"}) ranked with cumulative % and ₹; {type:"table", of:"lines"|"kpis"|"tags", tag?, assets?, ids?, highlight?}; {type:"site_compare"} for multi-site portfolios; {type:"asset_health", assets?, limit?} worst first with next action; {type:"alerts", assets?}; {type:"setpoints"}; {type:"live", assets:[ids]}; {type:"text", md}. Optional on any widget: span "full"|"half"|"third"|"twothirds" (KPI rows, tables and headlines are full width; charts half by default).
sheet spec: { kind: "daily"|"energy" }. presentation spec: { kind: "monthly" }. document spec: { kind: "report"|"note" }.
html spec: { html: "<!doctype html>…" } a complete self-contained web page (inline CSS, no external scripts), or { kind: "onepager" } for the generated plant one-pager.
form spec: { form: { name, sections: [ { title, fields: [ { id, label, type: text|textarea|number|select|radio|checkbox|checklist|date|datetime|time|rating|signature|asset, options?, unit?, required? } ] } ] } }.`;
