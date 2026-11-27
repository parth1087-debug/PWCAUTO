/* Copilot engine: routes a question to a Bruce agent, calls plant tools, and builds the answer from real data. */
import { POLICIES, fmtNum, fmtDate, fmtRel } from './data.js';
import { MIMICS } from '../shared/mimics.js';

const D = 864e5;
const rnd = (a, b) => Math.round(a + Math.random() * (b - a));
const has = (q, re) => re.test(q);

function rangeFrom(q, fallback = 30) {
  if (/today|24 ?h|last day/.test(q)) return 1;
  if (/this week|last week|7 ?days|week/.test(q)) return 7;
  const m = q.match(/(\d+)\s*days?/); if (m) return Math.min(182, +m[1]);
  if (/6 months|six months|half year|since go.?live|6m/.test(q)) return 182;
  if (/quarter|90/.test(q)) return 90;
  if (/month|30/.test(q)) return 30;
  return fallback;
}
function findAsset(db, q) {
  const Q = q.toUpperCase().replace(/[^A-Z0-9 -]/g, ' ');
  return db.assets.find(a => new RegExp(`\\b${a.id.replace('-', '-?')}\\b`).test(Q)) || null;
}
function findKpi(demo, q) {
  const syn = { oee: ['oee'], energy: ['sec', 'heat', 'eafkwh', 'power'], yield: ['yield'], downtime: ['udt'], cost: ['conv', 'cost'], quality: ['fpy', 'fcao', 'rej'], ppm: ['ppm'], fuel: ['fuel'], mtbf: ['mtbf'], availability: ['avail'], 'run factor': ['krf'], utilisation: ['util'], 'free lime': ['fcao'], cobbles: ['cobbles'], 'specific power': ['power', 'air'] };
  for (const k of demo.kpis) if (q.includes(k.name.toLowerCase())) return k;
  for (const [w, ids] of Object.entries(syn)) if (q.includes(w)) { const k = demo.kpis.find(x => ids.includes(x.id)); if (k) return k; }
  return null;
}
const agentFor = (demo, domain, fallback) => (demo.agents.find(a => a.domain === domain) || demo.agents.find(a => a.name === fallback) || demo.agents[0]).name;

/** Main entry. ctx: { db, tools, demo, messages, context, actions } */
export function runQuery(question, ctx) {
  const q = question.toLowerCase();
  const { db, tools, demo } = ctx;
  const steps = [];
  const call = (tool, args = {}) => { const t0 = rnd(180, 900); const out = tools[tool](args); steps.push({ tool: `plantdb.${tool}`, args, ms: t0 }); return out; };
  const ext = (tool, args, ms = rnd(200, 700)) => steps.push({ tool, args, ms });
  const res = (agent, cap, blocks, extra = {}) => ({ agent, cap, steps, blocks, ...extra });
  const days = rangeFrom(q, 30);
  const asset = findAsset(db, q);
  const kpi = findKpi(demo, q);
  const c = ctx.context;

  /* 1. writes to control systems are blocked */
  if (has(q, /(set|change|increase|decrease|raise|lower|reduce).*(setpoint|temperature|speed|pressure|feed rate)|write to (plc|dcs|scada)/)) {
    ext('foundry.policy.check', { action: 'control_system_write' }, 220);
    const p = POLICIES.find(x => x.id === 'P-01');
    return res('Plant Copilot · Foundry', 'Guardrails', [
      { type: 'text', md: `**I can't change this.** ${p.stmt}` },
      { type: 'kv', rows: [['Policy', `${p.id} · ${p.name}`], ['Enforced by', p.by], ['What I can do', 'Draft a change request with the current data for the process in-charge (policy P-02).']] },
      { type: 'actions', items: [{ label: 'Draft change request', act: { type: 'toast', text: 'Change request drafted and sent to the process in-charge. Nothing was written to the control system.' }, pri: true }, { label: 'Open Policies', act: { type: 'nav', to: 'context/policies' } }] }]);
  }

  /* 2. policies */
  if (has(q, /polic|\bp-\d\d\b|guardrail|allowed to|approval rule/)) {
    ext('foundry.policy.get', {}, 260);
    const id = (q.match(/p-\d\d/) || [])[0];
    const p = id ? POLICIES.find(x => x.id === id.toUpperCase()) : null;
    if (p) return res('Plant Copilot · Foundry', 'Data retrieval', [{ type: 'text', md: `**${p.id} · ${p.name}** (${p.mode}). ${p.stmt}` }, { type: 'kv', rows: [['Applies to', p.scope], ['Approver', p.approver], ['Enforced by', p.by]] }, { type: 'code', text: p.code }]);
    return res('Plant Copilot · Foundry', 'Data retrieval', [{ type: 'text', md: `There are **${POLICIES.length} policies**. The ones that stop or hold agent actions:` }, { type: 'table', head: ['Policy', 'Effect', 'Approver'], rows: POLICIES.filter(x => ['Block', 'Approval', 'Draft only'].includes(x.mode)).map(x => [`${x.id} · ${x.name}`, x.mode, x.approver]) }, { type: 'actions', items: [{ label: 'Open Policies', act: { type: 'nav', to: 'context/policies' } }] }]);
  }

  /* 3. create an artefact: dashboard (KPI, twin, real-time, setpoints, custom), form, sheet, presentation or document */
  const made = createIntent(q) && buildArtefact(q, { demo, db, asset, kpi });
  if (made) {
    call('uns_search', { q: made.focus }); if (made.calls) made.calls.filter(([n]) => typeof ctx.tools?.[n] === 'function').forEach(([n, a]) => call(n, a));
    ext('artefactory.create_artefact', { type: made.type, name: made.name }, 600);
    const id = ctx.actions?.createArtefact({ type: made.type, name: made.name, spec: made.spec, demo: demo.id, note: 'Created from prompt' });
    return res(made.agent || 'Plant Copilot · I/O Sense', 'Artefacts on demand', [
      { type: 'text', md: `Done. I created **${made.name}** (${made.label}) and saved it in the Artefactory as v1. ${made.what}` },
      { type: 'actions', items: [{ label: 'Open it', act: { type: 'art', id }, pri: true }, { label: 'Pin to Shortcuts', act: { type: 'pin', key: id } }, { label: 'Open in new tab', act: { type: 'tab', id } }] }]);
  }

  /* 5. context from the page the panel was opened on */
  if (c && (c.summary?.length || c.versions) && has(q, /this|summar|explain|what changed|key points|tell me about/)) {
    ext(c.kind === 'artefact' ? 'artefactory.read' : 'iosense.view.read', { title: c.title }, 300);
    if (c.kind === 'artefact' && /what changed/.test(q) && c.versions) {
      const [cur, prev] = c.versions;
      return res('Plant Copilot', 'Data retrieval', [{ type: 'text', md: prev ? `**v${cur.v}** (${cur.by}, ${fmtRel(cur.when)}) changed: ${cur.note}. The version before it, **v${prev.v}**, was: ${prev.note}.` : `This is the first version: ${cur.note}.` }]);
    }
    return res('Plant Copilot', 'Data retrieval', [{ type: 'text', md: `**${c.title}**` }, ...(c.summary || []).map(s => ({ type: 'text', md: s }))]);
  }

  /* 6. what needs attention */
  if (has(q, /attention|priorit|what.*(wrong|happening|focus)|brief|summary of (the )?plant|today/) && !asset) {
    const msgs = call('list_messages', {}); const h = call('get_asset_health', {});
    const top = msgs.filter(m => m.type === 'alert' || m.type === 'approval').slice(0, 4);
    return res('Plant Copilot · multi-agent', 'Problem detection', [
      { type: 'text', md: `**${top.length} items need you now**, ranked by impact:` },
      { type: 'list', items: top.map(m => `**${m.title}** · ${m.from}, ${fmtRel(new Date(m.time).getTime())}`) },
      { type: 'text', md: `Assets at risk: ${h.filter(x => x.health < 75).map(x => `${x.id} (${x.health})`).join(', ')}.` },
      { type: 'actions', items: [{ label: 'Open Messages', act: { type: 'nav', to: 'messages' }, pri: true }, { label: 'Open Maintenance', act: { type: 'nav', to: 'd/maintenance' } }] }]);
  }

  /* 7. documents */
  if (has(q, /manual|sop|procedure|how (do|to|should)|torque|document|instruction/)) {
    const r = call('search_docs', { q: question });
    if (r.length) return res(agentFor(demo, 'maintenance'), 'Data retrieval', [
      { type: 'text', md: `Found in **${r[0].doc}** (${r[0].type}):` }, ...r[0].passages.map(p => ({ type: 'quote', text: p.text, ref: p.ref })),
      ...(r[1] ? [{ type: 'text', md: `Also relevant: ${r.slice(1, 3).map(x => x.doc).join('; ')}.` }] : [])]);
  }

  /* 8. one asset */
  if (asset) {
    const d = call('diagnose_asset', { asset: asset.id });
    const ev = demo.events.find(e => e.asset === asset.id && e.diagnosis);
    if (ev) { ext('deepsense.anomaly_explain', { asset: asset.id }, 840); call('search_docs', { q: asset.id }); }
    const blocks = [{ type: 'text', md: ev ? `**${d.title}** on ${asset.id} · ${asset.name}. Confidence ${d.confidence}. Health ${d.health}, about **${d.rul_days} days** of life left.` : `**${asset.id} · ${asset.name}** is healthy (score ${d.health}). ${d.finding}` }];
    if (ev) {
      blocks.push({ type: 'chart', kind: 'trend', title: `${d.tag_name}, last 14 days`, unit: d.unit, days: 14, data: d.points_series.map(p => ({ t: new Date(p.t).getTime(), v: p.v })), series: [{ key: 'v', name: d.tag_name, type: 'area' }], refs: d.limits.hi != null && d.limits.hi > 0 ? [{ y: d.limits.hi, label: `Limit ${d.limits.hi}` }] : d.limits.lo != null ? [{ y: d.limits.lo, label: `Limit ${d.limits.lo}` }] : [] });
      blocks.push({ type: 'list', items: d.points }); blocks.push({ type: 'text', md: `**Recommendation:** ${d.reco}` });
      blocks.push({ type: 'evidence', items: [db.unsPath(asset, d.tag), ...(d.docs || []).slice(0, 2)] });
      blocks.push({ type: 'actions', items: [{ label: 'Raise work order', act: { type: 'wo', asset: asset.id, title: d.title }, pri: true }, { label: 'Open Maintenance', act: { type: 'nav', to: 'd/maintenance' } }] });
    }
    return res(ev ? ev.agent : agentFor(demo, 'maintenance'), ev ? 'Automated RCA' : 'Data retrieval', blocks);
  }

  /* 9. assets at risk */
  if (has(q, /risk|failing|failure|health|condition|maintenance|predict/)) {
    const h = call('get_asset_health', {});
    return res(agentFor(demo, 'maintenance'), 'Problem detection', [
      { type: 'text', md: `${h.filter(x => x.health < 75).length} of ${h.length} assets need attention. Lowest health first:` },
      { type: 'table', head: ['Asset', 'Health', 'Life left', 'Finding'], rows: h.slice(0, 6).map(x => [`${x.id} · ${x.name}`, x.health, `${x.rulDays} d`, x.finding || '—']) },
      { type: 'actions', items: [{ label: `Diagnose ${h[0].id}`, act: { type: 'ask', q: `Why is ${h[0].id} at risk?` }, pri: true }] }]);
  }

  /* 10. KPI vs baseline */
  if (kpi && !has(q, /loss|by line|by area|profile|pareto/)) {
    const tr = call('get_kpi_trend', { id: kpi.id, days: Math.max(days, 120) });
    const s = db.kpiSummary(kpi.id, db.anchor - Math.min(days, 30) * D, db.anchor);
    return res(agentFor(demo, kpi.group), 'Data retrieval', [
      { type: 'text', md: `**${kpi.name}** averaged **${fmtNum(s.value, kpi.dec)} ${kpi.unit}** over the last ${Math.min(days, 30)} days. Baseline ${fmtNum(kpi.base, kpi.dec)}, target ${fmtNum(kpi.target, kpi.dec)}: that is **${s.improvePct > 0 ? 'better' : 'worse'} by ${Math.abs(s.improvePct)} %**, ${s.status.toLowerCase()}.` },
      { type: 'chart', kind: 'trend', title: `${kpi.name}, daily`, unit: kpi.unit, days: 120, data: tr.points.map(p => ({ t: new Date(p.t).getTime(), v: p.v })), series: [{ key: 'v', name: kpi.name }], refs: [{ y: kpi.base, label: 'Baseline', color: '#98a2b3' }, { y: kpi.target, label: 'Target', color: '#079455' }], xRefs: [{ x: db.goLive, label: 'Go-live' }] },
      { type: 'evidence', items: ['plantdb.get_kpi_trend', `Baseline ${fmtDate(db.baselineFrom)} – ${fmtDate(db.baselineTo)}`] }]);
  }

  /* 11. losses */
  if (has(q, /loss|downtime|oee|six big|bottleneck|changeover|cost/)) {
    const o = call('get_oee_losses', {});
    const worst = [...o.lines].sort((a, b) => a.oee - b.oee)[0];
    return res(agentFor(demo, 'cost'), 'Automated RCA', [
      { type: 'text', md: `The weakest line is **${worst.line}** at OEE ${worst.oee} % (A ${worst.availability}, P ${worst.performance}, Q ${worst.quality}). Its top loss: **${worst.top_loss}**.` },
      { type: 'chart', kind: 'bars', title: 'Six big losses, hours this month', data: o.six_big_losses_hours.map(x => ({ name: x.loss, v: x.hours })), series: [{ key: 'v', name: 'Hours' }], horizontal: true },
      { type: 'table', head: ['Line', 'OEE %', 'Top loss'], rows: o.lines.map(l => [l.line, l.oee, l.top_loss]) }]);
  }

  /* 12. energy */
  if (has(q, /energy|power|kwh|demand|load|fuel|heat|electric|utility|air/)) {
    const e = call('get_energy', { days: Math.min(days, 30) });
    return res(agentFor(demo, 'energy'), 'Problem detection', [
      { type: 'text', md: `Over ${Math.min(days, 30)} days the plant used **${fmtNum(e.energy_kwh / 1000, 0)} MWh**. Peak demand **${fmtNum(e.peak_kva)} kVA** against a contract of ${fmtNum(e.contract_kva)} kVA (${Math.round((e.peak_kva / e.contract_kva) * 100)} %).` },
      { type: 'chart', kind: 'trend', title: 'Site load', unit: 'kVA', days: Math.min(days, 30), data: e.load_profile.map(p => ({ t: new Date(p.t).getTime(), v: p.kva })), series: [{ key: 'v', name: 'Load', type: 'area' }], refs: [{ y: e.contract_kva, label: 'Contract' }] },
      { type: 'table', head: ['Area', 'MWh', 'Share'], rows: e.by_area.map(a => [a.area, fmtNum(a.kwh / 1000, 0), `${a.share_pct} %`]) }]);
  }

  /* 13. quality */
  if (has(q, /quality|defect|reject|crack|pareto|spc|lime|strength|cobble/)) {
    const g = call('get_quality', { days });
    return res(agentFor(demo, 'quality'), 'Automated RCA', [
      { type: 'text', md: `Top defect over ${days} days: **${g.defects[0].defect}** (${g.defects[0].count}). ${g.spc.name} is shown against its limits below.` },
      { type: 'chart', kind: 'bars', title: 'Defect Pareto', data: g.defects.map(x => ({ name: x.defect, v: x.count })), series: [{ key: 'v', name: 'Count' }], horizontal: true },
      { type: 'chart', kind: 'trend', title: g.spc.name, days: 7, data: g.spc.points.map(p => ({ t: new Date(p.t).getTime(), v: p.v })), series: [{ key: 'v', name: g.spc.name }], refs: [{ y: g.spc.usl, label: 'USL' }, { y: g.spc.lsl, label: 'LSL' }] }]);
  }

  /* 14. production */
  if (has(q, /production|output|plan|throughput|attainment|make|made/)) {
    const p = call('get_production', { days });
    return res(agentFor(demo, 'cost'), 'Data retrieval', [
      { type: 'text', md: `Output over ${days} days: **${fmtNum(p.actual)} ${p.unit}** against a plan of ${fmtNum(p.plan)} (${p.attainment_pct} %).` },
      { type: 'chart', kind: 'trend', title: 'Plan vs actual', unit: p.unit, days, data: p.days.map(x => ({ t: new Date(x.t).getTime(), actual: x.actual, plan: x.plan })), series: [{ key: 'actual', name: 'Actual', type: 'bar' }, { key: 'plan', name: 'Plan', dash: '4 3', color: '#98a2b3' }] }]);
  }

  /* fallback */
  call('uns_search', { q: question.split(' ').slice(-1)[0] });
  return res('Plant Copilot', 'Data retrieval', [
    { type: 'text', md: `I can answer questions on ${demo.company} · ${demo.site} from plant data. Try:` },
    { type: 'list', items: demo.suggestions.slice(0, 5) }]);
}

/** Is the question asking to create something in the Artefactory? */
export function createIntent(q) {
  return /(build|create|make|new|add|generate|prepare|draft|design|set up|setup|give me)\b.*\b(dashboard|board|view|twin|monitor|scada|mimic|sld|diagram|network|circuit|rca|form|checklist|log ?sheet|logbook|inspection|permit|sheet|workbook|excel|spreadsheet|deck|presentation|slides|ppt|document|doc|note|report|scorecard|setpoint|advisor)/i.test(q);
}

/** Turn a request into an artefact { type, name, spec, label, what }. Uses the plant model to pick assets, KPIs and forms. */
export function buildArtefact(q, { demo, db, asset, kpi }) {
  const s = q.toLowerCase();
  const date = fmtDate(db.anchor);
  const spot = asset || db.assetById[demo.maintenance?.spotlight] || db.assets[0];
  /* process / SCADA views: match a mimic of this plant by its words */
  const mims = MIMICS[demo.id] || [];
  if (mims.length && (/scada|mimic|process view|p&id|sld|single.?line|network|circuit|diagram|layout|schematic|hmi/.test(s) || (/twin|view/.test(s) && !asset))) {
    const words = s.split(/[^a-z0-9]+/).filter(w => w.length > 2);
    const score = m => words.filter(w => (m.id + ' ' + m.name + ' ' + m.desc).toLowerCase().includes(w)).length;
    const m = mims.slice().sort((x, y) => score(y) - score(x))[0];
    return { type: 'dash', name: m.name, spec: { view: 'mimic', mimic: m.id }, label: 'process view', focus: m.name, what: `It is an interactive ${m.level} view: ${m.desc} Values refresh every 10 seconds; click any equipment to inspect it or open its twin.` };
  }
  if (/rca|root cause|anomal/.test(s)) return { type: 'dash', name: 'Anomalies · RCA and recommendations', spec: { view: 'rca' }, label: 'RCA board', focus: 'anomalies', what: 'It lists every open anomaly with its trend, root cause, evidence, confidence and recommended action.' };
  if (/twin/.test(s)) return { type: 'dash', name: `${spot.id} · ${spot.name} twin`, spec: { view: 'twin', asset: spot.id }, label: 'asset twin', focus: spot.id, calls: [['get_asset_health', { asset: spot.id }], ['get_data_sources', { asset: spot.id }]],
    what: `It shows live tags every 10 seconds, the 14-day trend, the agent diagnosis, the source system and address of every tag, and the ERP, CMMS and MES records.` };
  if (/real.?time|live|monitor|control room|war room/.test(s)) {
    const area = db.assets.filter(a => (asset ? a.line === asset.line : true));
    const ids = (asset ? area : db.healthAll().map(h => db.assetById[h.id])).slice(0, 8).map(a => a.id);
    return { type: 'dash', name: asset ? `${asset.line.name} live monitor` : 'Live plant monitor', spec: { view: 'realtime', assets: ids }, label: 'real-time monitor', focus: ids[0], calls: [['get_live', { assets: ids.slice(0, 3) }]],
      what: `It tracks ${ids.length} assets with live values, state colours and 24-hour sparklines. Values refresh every 10 seconds.` };
  }
  if (/setpoint|advisor|optimi/.test(s)) return { type: 'dash', name: 'Setpoint advisor', spec: { view: 'setpoints' }, label: 'setpoint board', focus: 'setpoints', calls: [['get_setpoints', {}]],
    what: `It lists ${(demo.setpoints || []).length} recommendations with current and recommended values, expected gain and evidence. Approval raises a change request (P-02); nothing is written to control.` };
  if (/form|checklist|log ?sheet|logbook|inspection|permit|round|audit/.test(s)) {
    const f = (demo.forms || []).find(x => s.split(/\W+/).some(w => w.length > 3 && x.name.toLowerCase().includes(w)));
    if (f) return { type: 'form', name: f.name, spec: { form: f.id }, label: 'form', focus: f.name, what: `It has ${f.sections.length} sections. Submissions are saved in the plant database with name and time.` };
    const target = asset ? `${asset.id} ` : '';
    const form = { name: `${target}${/permit/.test(s) ? 'Work permit' : /round|inspection/.test(s) ? 'Inspection round' : 'Shift checklist'}`, sections: [
      { title: 'Details', fields: [{ id: 'asset', label: 'Asset', type: 'asset', required: true }, { id: 'when', label: 'Date and time', type: 'datetime', required: true }, { id: 'shift', label: 'Shift', type: 'radio', options: ['A', 'B', 'C'], required: true }] },
      { title: 'Checks', fields: [{ id: 'checks', label: 'Checks done', type: 'checklist', options: ['Guards in place', 'No abnormal noise', 'No leaks', 'Lubrication OK', 'Area clean'] }, { id: 'reading', label: 'Key reading', type: 'number', unit: asset ? db.tagDef(asset.id, demo.classes[asset.cls].tags[0][0]).unit : '' }, { id: 'condition', label: 'Overall condition', type: 'rating' }] },
      { title: 'Sign-off', fields: [{ id: 'remarks', label: 'Remarks', type: 'textarea' }, { id: 'sign', label: 'Signature', type: 'signature', required: true }] }] };
    return { type: 'form', name: form.name, spec: { form }, label: 'form', focus: form.name, what: 'It has 3 sections (details, checks, sign-off) with an asset picker, checklist, rating and signature. Submissions are saved in the plant database.' };
  }
  if (/sheet|workbook|excel|spreadsheet/.test(s)) { const kind = /energy/.test(s) ? 'energy' : 'daily'; return { type: 'xlsx', name: `${kind === 'energy' ? 'Energy' : 'KPI and losses'} sheet · ${date}`, spec: { kind }, label: 'sheet', focus: 'kpis', calls: [['get_kpis', { days: 30 }], ['get_production', { days: 30 }]], what: 'It has KPI, production and line sheets with live formulas and downloads as .xlsx.' }; }
  if (/deck|presentation|slides|ppt/.test(s)) return { type: 'pptx', name: `Operations review · ${date}`, spec: { kind: 'monthly' }, label: 'presentation', focus: 'kpis', calls: [['get_kpis', { days: 30 }]], what: 'It has the KPI summary, losses, asset health and decisions slides.' };
  if (/document|doc\b|note|report/.test(s)) { const rep = /report|daily|shift/.test(s); return { type: 'docx', name: rep ? `Daily performance report · ${date}` : `Value realisation note · ${date}`, spec: { kind: rep ? 'report' : 'note' }, label: 'document', focus: 'kpis', calls: [['get_production', { days: 1 }], ['get_kpis', { days: 30 }]], what: 'It is built from live plant data and downloads as a Word file.' }; }
  if (/kpi|scorecard/.test(s) && !kpi) return { type: 'dash', name: 'KPI scorecard', spec: { view: 'kpis' }, label: 'KPI dashboard', focus: 'kpis', what: 'It shows every KPI against baseline and target with value realised.' };
  const k = kpi || demo.kpis.find(x => x.group === 'energy') || demo.kpis[0];
  const top = db.healthAll()[0];
  return { type: 'dash', name: `${k.name} · live`, label: 'dashboard', focus: k.name, calls: [['get_kpi_trend', { id: k.id, days: 90 }]],
    spec: { view: 'custom', widgets: [{ type: 'kpis', ids: [k.id, ...demo.overview.filter(x => x !== k.id).slice(0, 3)] }, { type: 'kpi_trend', id: k.id }, { type: 'live', assets: [top.id, ...db.assets.slice(0, 2).map(a => a.id)] }, { type: 'losses' }, { type: 'alerts' }, { type: 'setpoints' }] },
    what: `It shows ${k.name} against baseline and target, live values, top losses, alerts and setpoint recommendations.` };
}
