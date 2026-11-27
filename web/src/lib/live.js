/* Live agents: the app's server relays each question to the demo's Bruce Plant Copilot agent (or runs the agents on Claude), and streams the run. */
import { PLANTDB_URL } from '../shared/index.js';
import { fmtNum } from './data.js';

/* Server base; set localStorage "pwc-cpi.liveBase" to point at another server (for example http://localhost:8787) while developing. */
const override = (() => { try { return localStorage.getItem('pwc-cpi.liveBase'); } catch { return null; } })();
export const LIVE_BASE = (override || PLANTDB_URL).replace(/\/mcp$/, '').replace(/\/$/, '');

let statusCache = null;
/** { live, liveDemos, provider: {demo: 'bruce'|'claude'}, agents, model } — cached for 60 s. */
export async function liveStatus(force = false) {
  if (!force && statusCache && Date.now() - statusCache.at < 60e3) return statusCache.v;
  try {
    const r = await fetch(`${LIVE_BASE}/api/status`, { cache: 'no-store' });
    const v = r.ok ? await r.json() : { live: false };
    statusCache = { at: Date.now(), v };
    return v;
  } catch {
    statusCache = { at: Date.now(), v: { live: false, liveDemos: [], model: null } };
    return statusCache.v;
  }
}

/** Whether live answers are available for this demo. */
export const liveFor = (st, demoId) => !!st?.live && (st.liveDemos ? st.liveDemos.includes(demoId) : true);

/** Questions that create things in the app stay on the in-app engine (it writes to the Artefactory). */
export function staysLocal(q) {
  return /(write|create|generate|prepare|make|draft|export|build).*(report|deck|presentation|slides|workbook|excel|note|document|dashboard)/i.test(q);
}

/** Pick the demo agent whose domain fits the question. */
export function pickAgent(demo, q, assetId) {
  const s = q.toLowerCase();
  const by = d => demo.agents.find(a => a.domain === d) || demo.agents.find(a => a.id.endsWith('.' + d));
  const rules = [
    [/shift report|daily report|summary of (the )?shift|handover/, 'reports'],
    [/plan|schedule|shutdown|work order|\bwo\b|spares|window/, 'planner'],
    [/energy|power|kva|kwh|demand|tariff|fuel|compressed air|compressor|leak|heat consumption|utilit/, 'energy'],
    [/quality|defect|reject|ppm|crack|hardness|free lime|blaine|strength|breakout|cobble|spc|vision/, 'quality'],
    [/cyclone|kiln|preheater|raw mix|lsf|burning zone|clinker/, 'process'],
    [/yield|utilisation|utilization/, 'yield'],
    [/oee|cost|loss|changeover|conversion|productivity|throughput|budget/, 'cost'],
    [/health|vibration|bearing|gearbox|failure|alarm|remaining life|rul|diagnos|anomal|why is|at risk|temperature/, 'maintenance'],
  ];
  for (const [re, d] of rules) {
    if (!re.test(s)) continue;
    const a = d === 'planner' ? demo.agents.find(x => /planner/.test(x.id)) : d === 'reports' ? demo.agents.find(x => /shift-report/.test(x.id)) : d === 'process' ? demo.agents.find(x => /process/.test(x.id)) : d === 'yield' ? demo.agents.find(x => /yield/.test(x.id)) : by(d);
    if (a) return a;
  }
  if (assetId) return by('maintenance') || demo.agents[0];
  return demo.agents.find(a => /cost|yield|process/.test(a.id)) || demo.agents[0];
}

/** POST /api/chat and call onEvent for each server-sent event. Resolves when the stream ends. */
export async function streamChat(body, onEvent, signal) {
  const r = await fetch(`${LIVE_BASE}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!r.ok || !r.body) {
    let msg = `Live agents unavailable (${r.status})`;
    try { msg = (await r.json()).error || msg; } catch { /* keep default */ }
    throw Object.assign(new Error(msg), { status: r.status });
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) > -1) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const line = chunk.split('\n').find(l => l.startsWith('data: '));
      if (!line) continue;
      try { onEvent(JSON.parse(line.slice(6))); } catch { /* ignore a malformed event */ }
    }
  }
}

const ts = p => ({ t: new Date(p.t).getTime(), v: p.v });

/** Charts and tables the app draws from real tool results (the model writes the words). */
export function visualFor(name, input, out) {
  if (!out || out.error) return null;
  try {
    switch (name) {
      case 'get_kpi_trend':
        return { type: 'chart', kind: 'trend', title: `${out.name}, daily`, unit: out.unit, days: out.points.length, data: out.points.map(ts), series: [{ key: 'v', name: out.name }],
          refs: [{ y: out.baseline, label: 'Baseline', color: '#98a2b3' }, { y: out.target, label: 'Target', color: '#079455' }], xRefs: out.go_live ? [{ x: new Date(out.go_live).getTime(), label: 'Go-live' }] : [] };
      case 'get_tag_history':
        return out.points?.length ? { type: 'chart', kind: 'trend', title: `${out.name || 'Tag'}${out.unit ? ` (${out.unit})` : ''}`, unit: out.unit, days: Math.max(1, Math.round((new Date(out.points.at(-1).t) - new Date(out.points[0].t)) / 864e5)), data: out.points.map(ts), series: [{ key: 'v', name: out.name || 'Value', type: 'area' }],
          refs: [out.limits?.hi != null && out.limits.hi > 0 ? { y: out.limits.hi, label: `Limit ${out.limits.hi}` } : null, out.limits?.lo != null && out.limits.lo !== 0 ? { y: out.limits.lo, label: `Limit ${out.limits.lo}` } : null].filter(Boolean) } : null;
      case 'diagnose_asset':
        return out.points_series?.length ? { type: 'chart', kind: 'trend', title: `${out.asset} · ${out.tag_name}, last 14 days`, unit: out.unit, days: 14, data: out.points_series.map(ts), series: [{ key: 'v', name: out.tag_name, type: 'area' }],
          refs: out.limits?.hi != null && out.limits.hi > 0 ? [{ y: out.limits.hi, label: `Limit ${out.limits.hi}` }] : [] } : null;
      case 'get_asset_health':
        return Array.isArray(out) ? { type: 'table', head: ['Asset', 'Health', 'Life left', 'Finding'], rows: out.slice(0, 6).map(x => [`${x.id} · ${x.name}`, x.health, `${x.rulDays} d`, x.finding || '—']) } : null;
      case 'get_oee_losses':
        return out.six_big_losses_hours ? { type: 'chart', kind: 'bars', title: 'Six big losses, hours this month', data: out.six_big_losses_hours.map(x => ({ name: x.loss, v: x.hours })), series: [{ key: 'v', name: 'Hours' }], horizontal: true } : null;
      case 'get_energy':
        return out.load_profile?.length ? { type: 'chart', kind: 'trend', title: 'Site load', unit: 'kVA', days: Math.max(1, Math.round((new Date(out.load_profile.at(-1).t) - new Date(out.load_profile[0].t)) / 864e5)), data: out.load_profile.map(p => ({ t: new Date(p.t).getTime(), v: p.kva })), series: [{ key: 'v', name: 'Load', type: 'area' }], refs: out.contract_kva ? [{ y: out.contract_kva, label: 'Contract' }] : [] } : null;
      case 'get_kpis':
        return Array.isArray(out.kpis) ? { type: 'table', head: ['KPI', 'Now', 'Baseline', 'Target', 'Better by'], rows: out.kpis.slice(0, 10).map(k => [k.name, `${fmtNum(k.value)} ${k.unit}`, fmtNum(k.baseline), fmtNum(k.target), `${k.improvement_pct > 0 ? '+' : ''}${k.improvement_pct} %`]) } : null;
      default: return null;
    }
  } catch { return null; }
}

/** Buttons the app can offer after a live answer, from the tools the agent used. */
export function actionsFor(calls) {
  const items = [];
  const dx = calls.find(c => c.name === 'diagnose_asset' && c.ok && c.result?.title && c.result.health < 75);
  if (dx) items.push({ label: 'Raise work order', act: { type: 'wo', asset: dx.result.asset, title: dx.result.title }, pri: true });
  if (calls.some(c => c.name === 'diagnose_asset' || c.name === 'get_asset_health')) items.push({ label: 'Open Maintenance', act: { type: 'nav', to: 'd/maintenance' } });
  if (calls.some(c => c.name === 'get_energy')) items.push({ label: 'Open Energy', act: { type: 'nav', to: 'd/energy' } });
  if (calls.some(c => c.name === 'get_oee_losses')) items.push({ label: 'Open Cost conversion', act: { type: 'nav', to: 'd/cost' } });
  if (calls.some(c => c.name === 'get_quality')) items.push({ label: 'Open Quality', act: { type: 'nav', to: 'd/quality' } });
  return items.length ? { type: 'actions', items: items.slice(0, 3) } : null;
}
