/* Copilot engine: routes a question to a Bruce agent, calls plant tools, and builds the answer from real data. */
import { POLICIES, fmtNum, fmtDate, fmtRel } from './data.js';

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

  /* 3. build a dashboard */
  if (has(q, /(build|create|make|new|add).*(dashboard|view)/)) {
    const k = kpi || demo.kpis.find(x => x.group === 'energy');
    call('uns_search', { q: k.name.split(' ')[0] }); call('get_kpi_trend', { id: k.id, days: 90 });
    ext('iosense.dashboard.build', { kpi: k.id }, 900);
    const id = ctx.actions?.createArtefact({ type: 'dash', name: `${k.name} · live`, spec: { kpis: [k.id], focus: k.group }, demo: demo.id, note: 'Created from prompt' });
    return res('Plant Copilot · I/O Sense', 'Dashboards on demand', [
      { type: 'text', md: `I built **${k.name} · live** as a dashboard and saved it in the Artefactory (v1). It shows the KPI against baseline and target, the ${k.group} tiles and the top losses.` },
      { type: 'actions', items: [{ label: 'Open dashboard', act: { type: 'nav', to: `d/custom/${id}` }, pri: true }, { label: 'Pin to Shortcuts', act: { type: 'pin', key: `custom/${id}` } }] }]);
  }

  /* 4. write a report / deck / workbook */
  const mk = q.match(/(write|create|generate|prepare|make|draft|export).*(report|deck|presentation|slides|workbook|excel|note|document)/);
  if (mk) {
    const kind = /deck|presentation|slides/.test(q) ? 'pptx' : /workbook|excel/.test(q) ? 'xlsx' : /note|document/.test(q) ? 'docx' : 'report';
    const sub = /energy/.test(q) ? 'energy' : /asset|maintenance|health/.test(q) ? 'assets' : 'daily';
    call('get_production', { days: 1 }); call('get_kpis', { days: 30 }); call('list_messages', {});
    ext('artefactory.save', { type: kind }, 300);
    const names = { report: { daily: 'Daily performance report', assets: 'Asset health report', energy: 'Energy and utilities report' }, pptx: { daily: 'Operations review', assets: 'Maintenance review', energy: 'Energy review' }, xlsx: { daily: 'KPI workbook', assets: 'Asset health workbook', energy: 'Energy workbook' }, docx: { daily: 'Value realisation note', assets: 'Maintenance note', energy: 'Energy note' } };
    const id = ctx.actions?.createArtefact({ type: kind, name: `${names[kind][sub]} · ${fmtDate(db.anchor)}`, spec: { kind: sub }, demo: demo.id, note: 'Created from prompt' });
    return res(agentFor(demo, 'reports'), 'Notes and reports', [
      { type: 'text', md: `Done. **${names[kind][sub]}** is saved in the Artefactory as v1, built from live plant data.` },
      { type: 'actions', items: [{ label: 'Open it', act: { type: 'art', id }, pri: true }] }]);
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
      { type: 'chart', kind: 'trend', title: `${kpi.name}, daily`, unit: kpi.unit, days: 120, data: tr.points.map(p => ({ t: new Date(p.t).getTime(), v: p.v })), series: [{ key: 'v', name: kpi.name }], refs: [{ y: kpi.base, label: 'Baseline', color: '#8a8884' }, { y: kpi.target, label: 'Target', color: '#16794c' }], xRefs: [{ x: db.goLive, label: 'Go-live' }] },
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
      { type: 'chart', kind: 'trend', title: 'Plan vs actual', unit: p.unit, days, data: p.days.map(x => ({ t: new Date(x.t).getTime(), actual: x.actual, plan: x.plan })), series: [{ key: 'actual', name: 'Actual', type: 'bar' }, { key: 'plan', name: 'Plan', dash: '4 3', color: '#8a8884' }] }]);
  }

  /* fallback */
  call('uns_search', { q: question.split(' ').slice(-1)[0] });
  return res('Plant Copilot', 'Data retrieval', [
    { type: 'text', md: `I can answer questions on ${demo.company} · ${demo.site} from plant data. Try:` },
    { type: 'list', items: demo.suggestions.slice(0, 5) }]);
}
