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
const API = (process.env.BRUCE_API || 'https://bruce.us.iosense.io/backend/api').replace(/\/$/, '');

const DEFAULTS = {
  auto: { id: '6b093960bee99942f628db17', name: 'PwC Auto · Plant Copilot' },
  cement: { id: '6b093961bee99942f628db1b', name: 'PwC Cement · Plant Copilot' },
  steel: { id: '6b093961bee99942f628db1f', name: 'PwC Steel · Plant Copilot' },
};
export const COPILOTS = Object.fromEntries(Object.entries(DEFAULTS).map(([demo, a]) => [demo, {
  id: process.env[`BRUCE_AGENT_${demo.toUpperCase()}`] || a.id,
  name: a.name,
  key: process.env[`BRUCE_KEY_${demo.toUpperCase()}`] || '',
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

/**
 * @param {{demo: string, message: string, session_id?: string, context?: string, debug?: boolean}} req
 * @param {(event: object) => void} emit  app events: meta, tool_start, tool_end, text, final, done, raw
 */
export async function runBruce(req, emit, signal) {
  const a = COPILOTS[req.demo];
  if (!a?.key) throw new Error('No Bruce agent key for this demo.');
  const message = !req.session_id && req.context ? `(The user is looking at: ${req.context})\n\n${req.message}` : req.message;
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

  emit({ type: 'meta', agent: { id: a.id, name: a.name }, model: 'Bruce', provider: 'bruce', bruce_agent_id: a.id });
  let acc = '';
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
        acc += delta;
        emit({ type: 'text', delta });
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
        if (c && c !== acc) emit({ type: 'final', text: c });
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
      if (ev.type === 'done') { emit({ type: 'done' }); return; }
      handle(ev);
    }
  }
  emit({ type: 'done' });
}
