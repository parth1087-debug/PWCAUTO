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
};
export const VIEWS = ['kpis', 'overview', 'maintenance', 'cost', 'quality', 'energy', 'twin', 'realtime', 'setpoints', 'custom'];
export const WIDGETS = ['kpis', 'kpi_trend', 'tag_trend', 'asset_health', 'losses', 'energy', 'alerts', 'setpoints', 'live', 'text'];
const DEFAULT_NAMES = { kpis: 'KPI scorecard', overview: 'Plant overview', maintenance: 'Maintenance', cost: 'Cost conversion', quality: 'Quality', energy: 'Energy & utilities' };
export const dashName = (demo, view) => (demo.dashNames && demo.dashNames[view]) || DEFAULT_NAMES[view];

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
    ...(demo.forms || []).map((f, i) => A('form-' + f.id, 'form', f.name, { form: f.id }, [V(2 + i, 'Faclon', 60 * 24 * (4 + i * 3), 'Fields reviewed with the plant', now)])),
  ];
  return list;
}

/** Extra custom dashboards kept from earlier versions (auto, cement, steel). */
export const EXTRA = {
  auto: [{ key: 'd-head', name: 'Plant head daily view', spec: { view: 'custom', widgets: [{ type: 'kpis', ids: ['oee', 'fpy', 'sec', 'udt'] }, { type: 'kpi_trend', id: 'oee' }, { type: 'alerts' }, { type: 'losses' }] } },
    { key: 'd-sl2', name: 'Sprocket Line 2 war room', spec: { view: 'custom', widgets: [{ type: 'kpis', ids: ['oee', 'chg'] }, { type: 'tag_trend', asset: 'HB-04', tag: 'spindle_vibration' }, { type: 'live', assets: ['HB-03', 'HB-04'] }, { type: 'losses' }] } }],
  cement: [{ key: 'd-kiln', name: 'Kiln command view', spec: { view: 'custom', widgets: [{ type: 'kpis', ids: ['krf', 'heat', 'fcao', 'udt'] }, { type: 'live', assets: ['KL-01', 'PH-01', 'ID-01', 'CL-01'] }, { type: 'alerts' }, { type: 'setpoints' }] } }],
  steel: [{ key: 'd-mill', name: 'Mill war room', spec: { view: 'custom', widgets: [{ type: 'kpis', ids: ['yield', 'util', 'cobbles', 'udt'] }, { type: 'live', assets: ['RS-01', 'IS-01', 'FS-01', 'RHF-01'] }, { type: 'losses' }, { type: 'alerts' }] } }],
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
  const TYPE_OF = { dashboard: 'dash', dash: 'dash', sheet: 'xlsx', xlsx: 'xlsx', workbook: 'xlsx', excel: 'xlsx', spreadsheet: 'xlsx', presentation: 'pptx', deck: 'pptx', slides: 'pptx', pptx: 'pptx', document: 'docx', doc: 'docx', docx: 'docx', note: 'docx', report: 'docx', form: 'form' };
  const type = TYPE_OF[String(input.type || '').toLowerCase().trim()];
  if (!TYPES[type]) return { ok: false, error: `type must be one of dashboard, sheet, presentation, document, form` };
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
  return { ok: true, value: { type, name, spec } };
}

/** The artefact spec format, for tool descriptions and agent instructions. */
export const ARTEFACT_HELP = `type: dashboard | sheet | presentation | document | form.
dashboard spec: { view: "kpis"|"overview"|"maintenance"|"cost"|"quality"|"energy" } for a built-in board, { view: "twin", asset: "<ASSET-ID>" }, { view: "realtime", assets: ["<ASSET-ID>", …] }, { view: "setpoints" }, or { view: "custom", widgets: [ … ] } with widgets: {type:"kpis", ids:[kpi ids]}, {type:"kpi_trend", id}, {type:"tag_trend", asset, tag}, {type:"asset_health"}, {type:"losses"}, {type:"energy"}, {type:"alerts"}, {type:"setpoints"}, {type:"live", assets:[ids]}, {type:"text", md}.
sheet spec: { kind: "daily"|"energy" }. presentation spec: { kind: "monthly" }. document spec: { kind: "report"|"note" }.
form spec: { form: { name, sections: [ { title, fields: [ { id, label, type: text|textarea|number|select|radio|checkbox|checklist|date|datetime|time|rating|signature|asset, options?, unit?, required? } ] } ] } }.`;
