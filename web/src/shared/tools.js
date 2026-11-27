/* Tools over one demo database. The web Copilot calls these directly; the MCP server exposes the same tools. */
import { messagesFor } from './content.js';

const D = 864e5;
const iso = t => new Date(t).toISOString();
const r1 = (v, d = 1) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
const range = (db, a = {}) => {
  const to = a.to ? new Date(a.to).getTime() : db.anchor;
  const from = a.from ? new Date(a.from).getTime() : to - (a.days || 7) * D;
  return [from, to];
};

export function createTools(db) {
  const d = db.demo;
  const findAsset = q => {
    if (!q) return null;
    const s = String(q).toUpperCase();
    return db.assets.find(a => a.id === s) || db.assets.find(a => a.id.replace('-', '') === s.replace('-', '')) || db.assets.find(a => a.name.toUpperCase().includes(s));
  };
  const siteLoad = () => { const [a, t] = d.energy.meter; const s = db.series(a, t); const k = d.energy.scale || 1; return i => s[i] * k; };

  const tools = {
    uns_browse({ path } = {}) {
      const node = path ? db.resolve(path) : db.unsTree();
      if (!node) return { error: `No UNS node at ${path}` };
      const base = path || node.name;
      return { path: base, level: node.level, label: node.label, unit: node.unit,
        value: node.tag ? db.latest(node.asset, node.tag) : undefined,
        children: (node.children || []).map(c => ({ path: `${base}/${c.name}`, name: c.name, level: c.level, label: c.label, unit: c.unit })) };
    },
    uns_search({ q }) {
      const s = String(q || '').toLowerCase();
      const out = [];
      db.assets.forEach(a => {
        if ((a.id + ' ' + a.name).toLowerCase().includes(s)) out.push({ path: db.unsPath(a), label: `${a.id} · ${a.name}`, level: 'Work unit' });
        d.classes[a.cls].tags.forEach(t => { if ((a.id + ' ' + t[1]).toLowerCase().includes(s) && s.length > 2) out.push({ path: db.unsPath(a, t[0]), label: `${a.id} · ${t[1]}`, level: 'Tag', unit: t[2] }); });
      });
      return out.slice(0, 25);
    },
    get_tag_history(a = {}) {
      let asset = a.asset, tag = a.tag;
      if (a.path) { const n = db.resolve(a.path); if (!n || !n.tag) return { error: 'Path is not a tag' }; asset = n.asset; tag = n.tag; }
      const [from, to] = range(db, a);
      const h = db.history(findAsset(asset)?.id || asset, tag, from, to, a.agg || 'auto');
      if (!h) return { error: 'Unknown asset or tag' };
      const def = db.tagDef(h.asset, tag);
      return { path: db.unsPath(db.assetById[h.asset], tag), name: def.name, unit: h.unit, agg: h.agg, limits: { lo: def.lo, hi: def.hi },
        latest: db.latest(h.asset, tag), points: h.points.map(p => ({ t: iso(p.t), v: p.v })) };
    },
    get_kpis(a = {}) {
      const [from, to] = range(db, { days: 30, ...a });
      return { period: { from: iso(from), to: iso(to) }, baseline: { from: iso(db.baselineFrom), to: iso(db.baselineTo) }, go_live: iso(db.goLive),
        kpis: d.kpis.map(k => db.kpiSummary(k.id, from, to)).map(k => ({ id: k.id, name: k.name, unit: k.unit, group: k.group, value: k.value, baseline: k.base, target: k.target, better: k.better, improvement_pct: k.improvePct, status: k.status, value_inr_lakh_yr: k.lakh || 0 })) };
    },
    get_kpi_trend({ id, from, to, days = 183 } = {}) {
      const k = d.kpis.find(x => x.id === id || x.name.toLowerCase() === String(id).toLowerCase()); if (!k) return { error: 'Unknown KPI' };
      const [f, t] = range(db, { from, to, days });
      return { id: k.id, name: k.name, unit: k.unit, baseline: k.base, target: k.target, better: k.better, go_live: iso(db.goLive),
        points: db.kpiDaily(k.id).filter(p => p.t >= f && p.t <= t).map(p => ({ t: iso(p.t), v: p.v })) };
    },
    get_asset_health({ asset } = {}) {
      if (asset) { const a = findAsset(asset); return a ? db.health(a.id) : { error: 'Unknown asset' }; }
      return db.healthAll();
    },
    diagnose_asset({ asset }) {
      const a = findAsset(asset); if (!a) return { error: 'Unknown asset' };
      const ev = d.events.find(e => e.asset === a.id && e.diagnosis);
      const h = db.health(a.id);
      if (!ev) return { asset: a.id, health: h.health, state: h.state, finding: 'No anomaly in the last 30 days.', points: ['All monitored tags are inside their learned normal bands.'] };
      const hist = db.history(a.id, ev.tag, db.anchor - 14 * D, db.anchor, '4h');
      return { asset: a.id, name: a.name, health: h.health, state: h.state, rul_days: h.rulDays, tag: ev.tag, tag_name: db.tagDef(a.id, ev.tag).name, unit: hist.unit,
        limits: { lo: db.tagDef(a.id, ev.tag).lo, hi: db.tagDef(a.id, ev.tag).hi }, ...ev.diagnosis,
        points_series: hist.points.map(p => ({ t: iso(p.t), v: p.v })), docs: d.docs.filter(x => x.obj.includes(a.id) || x.obj.includes(a.id.split('-')[0])).map(x => x.name) };
    },
    get_production(a = {}) {
      const [from, to] = range(db, { days: 30, ...a });
      const days = db.production(from, to);
      const plan = days.reduce((s, x) => s + x.plan, 0), actual = days.reduce((s, x) => s + x.actual, 0);
      return { unit: d.production.unit, plan, actual, attainment_pct: r1((actual / plan) * 100), days: days.map(x => ({ t: iso(x.t), plan: x.plan, actual: x.actual })) };
    },
    get_oee_losses() {
      return { unit: d.cost.unitLabel, budget: d.cost.budget,
        lines: d.cost.lines.map(l => ({ line: l[0], availability: l[1], performance: l[2], quality: l[3], oee: r1(l[1] * l[2] * l[3] / 10000), top_loss: l[4] })),
        six_big_losses_hours: d.cost.losses.map(l => ({ loss: l[0], hours: l[1] })),
        cost_elements: d.cost.elements.map(e => ({ element: e[0], value: e[1] })), bridge: d.cost.bridge.map(b => ({ element: b[0], delta: b[1] })) };
    },
    get_energy(a = {}) {
      const [from, to] = range(db, { days: 7, ...a });
      const load = siteLoad();
      const pts = [];
      const fi = Math.max(0, Math.ceil(db.series(...d.energy.meter).length - 1 - (db.anchor - from) / 36e5));
      const ti = db.series(...d.energy.meter).length - 1 - Math.max(0, Math.floor((db.anchor - to) / 36e5));
      let kwh = 0, peak = 0;
      const daily = (ti - fi) > 24 * 8; let dayMax = 0, dayStart = fi;
      for (let i = fi; i <= ti; i++) {
        const v = load(i); kwh += v * 0.97; peak = Math.max(peak, v);
        if (!daily) pts.push({ t: iso(db.tsHour(i)), kva: Math.round(v) });
        else { dayMax = Math.max(dayMax, v); if ((i - fi) % 24 === 23 || i === ti) { pts.push({ t: iso(db.tsHour(dayStart)), kva: Math.round(dayMax) }); dayMax = 0; dayStart = i + 1; } }
      }
      return { energy_kwh: Math.round(kwh), peak_kva: Math.round(peak), contract_kva: d.energy.contractKVA,
        by_area: d.energy.areas.map(x => ({ area: x[0], kwh: Math.round(kwh * x[1] / 100), share_pct: x[1] })), load_profile_kind: daily ? 'daily peak' : 'hourly', load_profile: pts };
    },
    get_quality(a = {}) {
      const [from, to] = range(db, { days: 30, ...a });
      const k = Math.max(0.2, (to - from) / (30 * D));
      const spc = d.quality.spc;
      return { defects: d.quality.defects.map(x => ({ defect: x[0], count: Math.round(x[1] * k) })),
        spc: { name: spc.name, lsl: spc.lsl, usl: spc.usl, points: db.history(spc.asset, spc.tag, Math.max(from, to - 7 * D), to, '4h').points.map(p => ({ t: iso(p.t), v: p.v })) } };
    },
    list_messages({ type } = {}) { return messagesFor(db).filter(m => !type || m.type === type).map(m => ({ ...m, time: iso(m.time) })); },
    search_docs({ q }) {
      const s = String(q || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
      return d.docs.map(x => ({ doc: x.name, type: x.type, linked_to: x.obj, passages: x.pass.map(p => ({ text: p[0], ref: p[1] })),
        score: s.reduce((n, w) => n + ((x.name + x.obj + x.pass.map(p => p[0]).join(' ')).toLowerCase().includes(w) ? 1 : 0), 0) }))
        .filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    },
  };
  return tools;
}

export const TOOL_SPECS = [
  { name: 'uns_browse', description: 'Browse the Unified Namespace (ISA-95: enterprise/site/area/work center/work unit/tag). Omit path for the root.', props: { path: 'string' } },
  { name: 'uns_search', description: 'Search assets and tags in the UNS by id or name.', props: { q: 'string' }, required: ['q'] },
  { name: 'get_tag_history', description: 'Time series for a tag. Pass a UNS path, or asset + tag. Timestamps are anchored to now.', props: { path: 'string', asset: 'string', tag: 'string', from: 'string', to: 'string', days: 'number', agg: 'string' } },
  { name: 'get_kpis', description: 'Plant KPIs over a period with baseline, target, improvement and status.', props: { from: 'string', to: 'string', days: 'number' } },
  { name: 'get_kpi_trend', description: 'Daily trend of one KPI over up to 6 months, with baseline, target and go-live date.', props: { id: 'string', days: 'number' }, required: ['id'] },
  { name: 'get_asset_health', description: 'Health score, state and remaining life for one asset, or all assets ranked by risk.', props: { asset: 'string' } },
  { name: 'diagnose_asset', description: 'Diagnosis of an asset anomaly with evidence, recommendation and recent trend.', props: { asset: 'string' }, required: ['asset'] },
  { name: 'get_production', description: 'Daily production plan vs actual.', props: { from: 'string', to: 'string', days: 'number' } },
  { name: 'get_oee_losses', description: 'OEE by line, six big losses, cost elements and cost bridge.', props: {} },
  { name: 'get_energy', description: 'Energy use, peak demand vs contract, consumption by area and load profile.', props: { from: 'string', to: 'string', days: 'number' } },
  { name: 'get_quality', description: 'Defect Pareto and SPC series for the key quality parameter.', props: { from: 'string', to: 'string', days: 'number' } },
  { name: 'list_messages', description: 'Alerts, insights, approvals and reports from the agents.', props: { type: 'string' } },
  { name: 'search_docs', description: 'Search indexed manuals, SOPs, control plans and past RCAs. Returns cited passages.', props: { q: 'string' }, required: ['q'] },
];
