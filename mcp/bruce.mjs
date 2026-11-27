/**
 * Bruce agent integration (REST API): the app's Copilot talks to each demo's
 * "Plant Copilot" agent on Bruce, with that agent's API key, and streams the answer back.
 *
 *   POST {BRUCE_API}/agents/v1/agents/{agentId}/chat
 *   X-API-Key: agv2_...      body: { message, session_id?, timezone }
 *   -> text/event-stream: session, stream_chunk, tool_call, tool_result, stream_end, usage, error, done
 *
 * Env:
 *   BRUCE_API             default https://bruce.us.iosense.io/backend/api
 *   BRUCE_KEY_AUTO / BRUCE_KEY_CEMENT / BRUCE_KEY_STEEL   agent API keys (Forge secrets)
 *   BRUCE_AGENT_AUTO / ... override the agent id per demo
 */
import { DEMOS, createDB, createTools } from '../web/src/shared/index.js';
import { createArtefact } from './store.mjs';
import { ARTEFACT_HELP } from '../web/src/shared/artefacts.js';
import { MIMICS } from '../web/src/shared/mimics.js';
import { ONTOLOGY, relationsOf, trace } from '../web/src/shared/ontology/index.js';

const CREATE = /(build|create|make|new|add|generate|prepare|draft|design|set up|setup|give me)\b.*\b(dashboard|board|view|twin|monitor|html|web ?page|one.?pager|scada|mimic|sld|diagram|network|circuit|rca|form|checklist|log ?sheet|logbook|inspection|permit|sheet|workbook|excel|spreadsheet|deck|presentation|slides|ppt|document|doc|note|report|scorecard|setpoint|advisor)/i;

/** Save every ```artefact {json}``` block in the answer to the Artefactory. */
function saveArtefacts(text, demo, emit) {
  const re = /```artefact\s*([\s\S]*?)```/g; let m; let n = 0;
  while ((m = re.exec(text)) && n < 3) {
    n++;
    try {
      const spec = JSON.parse(m[1]);
      const a = createArtefact({ demo, type: spec.type, name: spec.name, spec: spec.spec || {}, by: 'Plant Copilot (Bruce)', note: spec.note || 'Created from the Copilot' });
      emit({ type: 'artefact', artefact: a });
    } catch (e) { emit({ type: 'artefact_error', message: e.message }); }
  }
}

const API = (process.env.BRUCE_API || 'https://bruce.us.iosense.io/backend/api').replace(/\/$/, '');

const DEFAULTS = {
  auto: { id: '6b093960bee99942f628db17', name: 'Faclon Auto · Plant Copilot' },
  cement: { id: '6b093961bee99942f628db1b', name: 'Faclon Cement · Plant Copilot' },
  steel: { id: '6b093961bee99942f628db1f', name: 'Faclon Steel · Plant Copilot' },
  ems: { id: '6b099042bee99942f628ddd9', name: 'Faclon Energy · Plant Copilot' },
};
export const COPILOTS = Object.fromEntries(Object.entries(DEFAULTS).map(([demo, a]) => [demo, {
  id: process.env[`BRUCE_AGENT_${demo.toUpperCase()}`] || a.id,
  name: a.name,
  key: process.env[`BRUCE_KEY_${demo.toUpperCase().replace(/-/g, "_")}`] || '',
}]));

export const bruceDemos = () => Object.keys(COPILOTS).filter(d => COPILOTS[d].key);

/** "plant_data__get_kpis", "Plant Data.get_kpis", "mcp_plant-data_get_kpis" -> "get_kpis" when it is a known plantdb tool. */
const PLANTDB = ['uns_browse', 'uns_search', 'get_tag_history', 'get_kpis', 'get_kpi_trend', 'get_asset_health', 'diagnose_asset', 'get_production', 'get_oee_losses', 'get_energy', 'get_quality', 'list_messages', 'search_docs', 'list_agents', 'get_policy', 'list_demos'];
export function toolName(raw) {
  const s = String(raw || 'tool');
  return PLANTDB.find(t => s === t || s.endsWith(`__${t}`) || s.endsWith(`.${t}`) || s.endsWith(`_${t}`) || s.endsWith(`/${t}`)) || s;
}

/** Tool results arrive as objects, JSON text, or MCP content arrays; return the parsed value. */
function parseResult(v) {
  if (v == null) return null;
  if (Array.isArray(v) && v.every(x => x && typeof x === 'object' && 'type' in x)) {
    const text = v.filter(x => x.type === 'text').map(x => x.text).join('');
    return parseResult(text);
  }
  if (typeof v === 'object' && Array.isArray(v.content)) return parseResult(v.content);
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return v; } }
  return v;
}
const pick = (o, keys) => { for (const k of keys) if (o && o[k] != null) return o[k]; return undefined; };

/** Shrink long arrays so the attached data stays small. */
function compact(v) {
  if (Array.isArray(v)) return (v.length > 40 ? v.filter((_, i) => i % Math.ceil(v.length / 40) === 0 || i === v.length - 1) : v).map(compact);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, compact(x)]));
  return v;
}

/**
 * Live plant data for the question, read from plantdb before the agent runs.
 * Bruce skips person-scoped connectors for agent-key calls, so the app attaches the data itself.
 */
export function ontologyFor(demoId, asset) {
  const r = relationsOf(demoId, asset);
  return { asset, direct: { upstream: r.up, downstream: r.down }, upstream_chain: trace(demoId, asset, 'up').map(x => `${x.asset} ${x.rel} ${x.via}`), downstream_chain: trace(demoId, asset, 'down').map(x => `${x.via} ${x.rel} ${x.asset}`),
    causes: (ONTOLOGY[demoId] || []).filter(x => x[1] === 'causes' && (x[0] === asset || x[2] === asset)).map(x => `${x[0]} affects ${x[2]}: ${x[3]}`) };
}
export function prefetch(demoId, q, anchor) {
  const demo = DEMOS[demoId];
  const db = createDB(demo, { anchor: anchor || null });
  const t = createTools(db);
  const s = q.toLowerCase();
  const calls = [];
  const add = (name, input) => { if (!calls.some(c => c.name === name && JSON.stringify(c.input) === JSON.stringify(input))) calls.push({ name, input }); };
  const assets = db.assets.filter(a => new RegExp(`\\b${a.id.replace('-', '-?')}\\b`, 'i').test(q)).slice(0, 2);
  assets.forEach(a => add('diagnose_asset', { asset: a.id }));
  const kpi = demo.kpis.find(k => s.includes(k.name.toLowerCase())) || demo.kpis.find(k => new RegExp(`\\b${k.id}\\b`).test(s))
    || (/\boee\b/.test(s) && demo.kpis.find(k => k.id === 'oee')) || (/yield/.test(s) && demo.kpis.find(k => /yield/i.test(k.name)));
  if (kpi) add('get_kpi_trend', { id: kpi.id, days: 182 });
  if (/kpi|baseline|target|improv|performance|overall|summary|how (are|is) (we|the plant)|month|week/.test(s)) add('get_kpis', { days: 30 });
  if (/energy|power|kva|kwh|demand|tariff|fuel|compressed air|compressor|leak|heat/.test(s)) add('get_energy', { days: 7 });
  if (/oee|loss|cost|changeover|conversion|productiv|downtime|yield|utilis|utiliz/.test(s)) add('get_oee_losses', {});
  if (/quality|defect|reject|ppm|crack|hardness|free lime|blaine|strength|breakout|cobble|spc|vision/.test(s)) add('get_quality', { days: 30 });
  if (/production|output|plan|volume|throughput/.test(s)) add('get_production', { days: 14 });
  if (!assets.length && /health|risk|alarm|attention|failure|maintenance|vibration|bearing|gearbox|asset/.test(s)) add('get_asset_health', {});
  if (/attention|approval|alert|pending|today|now|messages?|inbox/.test(s)) add('list_messages', {});
  if (/manual|sop|procedure|document|rca|torque|spec|control plan|how (do|to)/.test(s)) add('search_docs', { q: q.slice(0, 120) });
  if (!calls.length) { add('get_kpis', { days: 30 }); add('get_asset_health', {}); }
  const out = calls.slice(0, 4).map(c => {
    const t0 = Date.now();
    let result, ok = true;
    try { result = t[c.name]({ ...c.input }); if (result?.error) ok = false; } catch (e) { result = { error: e.message }; ok = false; }
    return { ...c, ok, result, ms: Math.max(1, Date.now() - t0) };
  });
  /* ontology: for each asset named, what it connects to (upstream sources, downstream consumers, causes) */
  if (ONTOLOGY[demoId]) assets.forEach(a => out.push({ name: 'get_ontology', input: { asset: a.id }, ok: true, ms: 1, result: ontologyFor(demoId, a.id) }));
  return out;
}

/**
 * @param {{demo: string, message: string, session_id?: string, context?: string, anchor?: string, debug?: boolean}} req
 * @param {(event: object) => void} emit  app events: meta, tool_start, tool_end, text, final, done, raw
 */
export async function runBruce(req, emit, signal) {
  const a = COPILOTS[req.demo];
  if (!a?.key) throw new Error('No Bruce agent key for this demo.');
  emit({ type: 'meta', agent: { id: a.id, name: a.name }, model: 'Bruce', provider: 'bruce', bruce_agent_id: a.id });
  const pre = prefetch(req.demo, req.message, req.anchor);
  pre.forEach((c, i) => {
    emit({ type: 'tool_start', id: `pre${i}`, name: c.name, label: `plantdb.${c.name}`, input: c.input });
    emit({ type: 'tool_end', id: `pre${i}`, name: c.name, label: `plantdb.${c.name}`, input: c.input, ok: c.ok, ms: c.ms, result: c.result });
  });
  const now = new Date(createDB(DEMOS[req.demo], { anchor: req.anchor || null }).anchor);
  const live = pre.filter(c => c.ok).map(c => `### plantdb.${c.name}(${JSON.stringify({ demo: req.demo, ...c.input })})\n${JSON.stringify(compact(c.result))}`).join('\n\n').slice(0, 14000);
  const message = [
    req.message,
    '',
    `<plant_data source="Plant Data connector (plantdb, demo=${req.demo})" read_at="${now.toISOString().slice(0, 16)}Z" note="Live results the app read for this question. Use them as the data source; cite the tool and UNS path.">`,
    live,
    '</plant_data>',
    !req.session_id && req.context ? `\nThe user is looking at: ${req.context}` : '',
    CREATE.test(req.message) ? `\n<artefact_format note="The user wants an artefact saved in the Artefactory. Add exactly one fenced block with the language tag artefact holding JSON {type, name, spec}. The app saves it to the plant database and shows an Open button; the block itself is hidden. Use only asset ids, tag keys, KPI ids and form ids from the plant data. Then say in one or two sentences what it shows.">\n${ARTEFACT_HELP}\nForm ids in this plant: ${(DEMOS[req.demo].forms || []).map(f => f.id).join(', ')}. KPI ids: ${DEMOS[req.demo].kpis.map(k => k.id).join(', ')}. Mimic ids (process views): ${(MIMICS[req.demo] || []).map(m => `${m.id} (${m.name})`).join('; ') || 'none'}.\n</artefact_format>` : '',
  ].join('\n');
  const r = await fetch(`${API}/agents/v1/agents/${a.id}/chat`, {
    method: 'POST',
    headers: { 'X-API-Key': a.key, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ message, ...(req.session_id ? { session_id: req.session_id } : {}), timezone: 'Asia/Kolkata' }),
    signal,
  });
  if (!r.ok || !r.body) {
    let detail = '';
    try { const j = await r.json(); detail = typeof j.detail === 'string' ? j.detail : j.message || JSON.stringify(j.detail || j); } catch { /* not JSON */ }
    const why = r.status === 401 ? 'The Bruce agent key is not valid (401).' : r.status === 403 ? 'The Bruce agent key may not run this agent (403).' : r.status === 404 ? 'The Bruce agent was not found (404).' : `Bruce answered ${r.status}.`;
    throw new Error(`${why}${detail ? ` ${detail}` : ''}`);
  }

  let acc = '';
  let all = '';
  let afterTool = false;
  let n = 0;
  const open = new Map();
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  const handle = ev => {
    if (req.debug) emit({ type: 'raw', ev });
    switch (ev.type) {
      case 'session': emit({ type: 'session', session_id: ev.sessionId || ev.session_id }); break;
      case 'stream_chunk': {
        if (ev.role && ev.role !== 'assistant') break;
        const c = typeof ev.content === 'string' ? ev.content : '';
        if (!c) break;
        const delta = acc && c.startsWith(acc) && c.length > acc.length ? c.slice(acc.length) : c;
        acc += delta; all += delta;
        emit({ type: 'text', delta });
        break;
      }
      case 'block_delta': {
        if (ev.kind !== 'text' || typeof ev.delta !== 'string' || !ev.delta) break;
        if (afterTool && acc) { emit({ type: 'reset' }); acc = ''; }
        afterTool = false;
        acc += ev.delta; all += ev.delta;
        emit({ type: 'text', delta: ev.delta });
        break;
      }
      case 'block': {
        const b = ev.data || {};
        if (b.kind !== 'tool-call' || !b.detail) break;
        const d = b.detail;
        const id = String(d.toolCallId || b.id);
        const name = toolName(d.name);
        const label = PLANTDB.includes(name) ? `plantdb.${name}` : d.is_agent ? `agent · ${d.name}` : `bruce.${d.name}`;
        if (b.status === 'running') {
          if (!open.has(id)) { open.set(id, { name, input: d.input || {}, t0: Date.now() }); emit({ type: 'tool_start', id, name, label, input: d.input || {} }); }
          afterTool = true;
        } else {
          const o = open.get(id) || { name, input: d.input || {}, t0: Date.now() };
          open.delete(id);
          emit({ type: 'tool_end', id, name, label, input: o.input, ok: b.status === 'done', ms: d.duration_ms || Date.now() - o.t0, result: PLANTDB.includes(name) ? parseResult(d.output) : null });
          afterTool = true;
        }
        break;
      }
      case 'tool_call': {
        const id = String(pick(ev, ['toolCallId', 'tool_call_id', 'id', 'callId']) ?? `t${++n}`);
        const name = toolName(pick(ev, ['toolName', 'tool_name', 'name', 'tool']));
        const input = parseResult(pick(ev, ['args', 'arguments', 'input', 'params'])) || {};
        open.set(id, { name, input, t0: Date.now() });
        emit({ type: 'tool_start', id, name, input });
        break;
      }
      case 'tool_result': {
        const id = String(pick(ev, ['toolCallId', 'tool_call_id', 'id', 'callId']) ?? [...open.keys()].at(-1) ?? `t${n}`);
        const o = open.get(id) || { name: toolName(pick(ev, ['toolName', 'tool_name', 'name', 'tool'])), input: {}, t0: Date.now() };
        open.delete(id);
        const result = parseResult(pick(ev, ['result', 'output', 'content', 'data']));
        const ok = !(ev.isError || ev.is_error || ev.error || ev.status === 'error');
        emit({ type: 'tool_end', id, name: o.name, input: o.input, ok, ms: Date.now() - o.t0, result });
        break;
      }
      case 'stream_end': {
        const c = typeof ev.content === 'string' ? ev.content : '';
        if (c && !acc) emit({ type: 'final', text: c });
        if (c) all = c;
        break;
      }
      case 'usage': emit({ type: 'usage', usage: ev.data || {} }); break;
      case 'error': throw new Error(ev.message || ev.code || 'Bruce reported an error.');
      default: break; // thinking and other progress events
    }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let i;
    while ((i = buf.indexOf('\n\n')) > -1) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const data = chunk.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
      if (!data) continue;
      let ev; try { ev = JSON.parse(data); } catch { continue; }
      if (ev.type === 'done') { saveArtefacts(all, req.demo, emit); emit({ type: 'done' }); return; }
      handle(ev);
    }
  }
  saveArtefacts(all, req.demo, emit);
  emit({ type: 'done' });
}
