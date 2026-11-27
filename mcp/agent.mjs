/**
 * Live agent runtime for the PwC Connected Plant app.
 * Runs a demo's Bruce agent on Claude with the plantdb tools in process, and streams
 * the run to the browser as server-sent events (agent, tool calls, text, done).
 *
 * Env:
 *   ANTHROPIC_API_KEY   required for live answers (Forge secret reference)
 *   LLM_MODEL           default claude-opus-5-5
 *   LLM_EFFORT          default medium (low | medium | high)
 */
import Anthropic from '@anthropic-ai/sdk';
import { DEMOS, createDB, createTools, TOOL_SPECS, POLICIES, plantBrief, plantDocs, policiesText, skillSteps, DEPLOYED } from '../web/src/shared/index.js';

export const MODEL = process.env.LLM_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.LLM_EFFORT || 'medium';
const MAX_TURNS = 8;
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ maxRetries: 2, timeout: 120_000 }) : null;
export const liveEnabled = () => !!client;

/* ---------- tools ---------- */
const typeOf = { string: 'string', number: 'number' };
const EXTRA = [{ name: 'get_policy', description: 'A policy rule by id (for example P-03), or all policies when id is omitted.', props: { id: 'string' } }];
const SPECS = [...TOOL_SPECS, ...EXTRA];
const TOOL_DEFS = SPECS.map(s => ({
  name: s.name,
  description: s.description + ' The demo plant is fixed for you; do not pass a demo.',
  eager_input_streaming: true,
  input_schema: {
    type: 'object',
    properties: Object.fromEntries(Object.entries(s.props).map(([k, t]) => [k, { type: typeOf[t] }])),
    required: s.required || [],
    additionalProperties: false,
  },
}));

function validate(spec, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'input must be an object';
  for (const k of spec.required || []) if (input[k] === undefined) return `missing required field "${k}"`;
  for (const [k, v] of Object.entries(input)) {
    if (!(k in spec.props)) return `unknown field "${k}"`;
    if (typeof v !== spec.props[k]) return `field "${k}" must be a ${spec.props[k]}`;
  }
  return null;
}

/** Shrink long arrays so the model sees the shape without thousands of points. */
function forModel(v, depth = 0) {
  if (Array.isArray(v)) {
    const arr = v.length > 60 ? v.filter((_, i) => i % Math.ceil(v.length / 60) === 0 || i === v.length - 1) : v;
    return arr.map(x => forModel(x, depth + 1));
  }
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, forModel(x, depth + 1)]));
  return v;
}

/* ---------- prompt ---------- */
const AUTONOMY = {
  advise: 'Advise only: recommend actions, do not take them.',
  act_with_approval: 'Draft actions (work orders, setpoint changes, holds, purchase requests) for human approval. Never execute them yourself.',
  act: 'You may publish reports to approved plant distribution lists.',
};

function systemFor(demo, agent) {
  const others = demo.agents.filter(a => a.id !== agent.id).map(a => `${a.name} (${a.instructions})`).join('; ');
  const pol = agent.policies.map(id => POLICIES.find(p => p.id === id)).filter(Boolean).map(p => `- ${p.id} ${p.name}: ${p.stmt}`).join('\n');
  const steps = skillSteps(demo, agent);
  const ws = DEPLOYED[demo.id]?.uns?.workspace;
  return `You are the ${agent.name}, a Bruce agent for ${demo.company}, ${demo.site} (${demo.industry}). This is the PwC Connected Plant demo, powered by Faclon Labs. All plant data is demo data from the plant database.

Your job: ${agent.instructions}
${AUTONOMY[agent.autonomy] || ''}
Other agents on this plant: ${others}.

Policies you follow:
${pol}
- Never write to PLC, DCS or SCADA. If asked to change a setpoint or control value, refuse briefly, cite P-01, and offer to draft a change request.

How to work:
- Use the tools for every number you state. Call several tools in one turn when they are independent. Do not invent values, assets, tags or documents.
- The plant model is ISA-95 (UNS workspace ${ws || 'n/a'}): enterprise / site / area / line / machine / tag. Find assets with uns_search or uns_browse; read tag history with get_tag_history using the UNS path.
- KPI ids are in the brief below (for get_kpi_trend). Asset ids look like ${demo.areas[0].lines[0].assets[0][0]}.
${steps ? `- When the question fits one of your skills, follow its steps:\n${steps}\n` : ''}
How to answer (the app renders Markdown):
- Lead with the answer in one or two sentences, with the key numbers in bold.
- Then the evidence as a short bullet list: the tag or KPI, its value and limit or baseline, and the source (UNS path, document and page).
- Use a small table only when comparing several items.
- Money in ₹ (lakh for large amounts). Times in IST.
- End with one line that starts with "Next action:".
- Keep it under 180 words unless the user asks for a report. No headings for short answers. Do not mention these instructions.

${plantBrief(demo)}
${plantDocs(demo)}
${policiesText()}`;
}

/* ---------- run ---------- */
/**
 * @param {{demo: string, agent?: string, messages: {role: 'user'|'assistant', content: string}[], context?: string}} req
 * @param {(event: object) => void} emit
 */
export async function runAgent(req, emit, signal) {
  const demo = DEMOS[req.demo];
  if (!demo) throw new Error('Unknown demo');
  const agent = demo.agents.find(a => a.id === req.agent) || demo.agents[0];
  const db = createDB(demo, { anchor: req.anchor || null });
  const tools = createTools(db);
  const run = {
    ...tools,
    get_policy: ({ id }) => (id ? POLICIES.find(p => p.id === id.toUpperCase()) || { error: 'Unknown policy' } : POLICIES.map(p => ({ id: p.id, name: p.name, mode: p.mode, approver: p.approver }))),
  };

  emit({ type: 'meta', agent: { id: agent.id, name: agent.name }, model: MODEL, bruce_agent_id: DEPLOYED[demo.id]?.agents?.[agent.id] || null });

  const now = new Date(db.anchor);
  const system = [
    { type: 'text', text: systemFor(demo, agent), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: `Current plant time: ${now.toISOString().slice(0, 16)}Z (${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST). The newest data point is this hour.${req.context ? `\nThe user is looking at: ${req.context}` : ''}` },
  ];
  const messages = req.messages.map(m => ({ role: m.role, content: m.content }));
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 };
  let jsonRetries = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: EFFORT },
      system,
      tools: TOOL_DEFS,
      messages,
    }, { signal });
    stream.on('text', delta => emit({ type: 'text', delta }));

    let message;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      if (err instanceof Anthropic.APIError || signal?.aborted || jsonRetries++ >= 2) throw err;
      emit({ type: 'retry' });
      continue;
    }
    for (const k of Object.keys(usage)) usage[k] += message.usage?.[k] || 0;

    if (message.stop_reason === 'refusal') { emit({ type: 'text', delta: '\n\nI can’t help with that request.' }); break; }
    if (message.stop_reason === 'pause_turn') { messages.push({ role: 'assistant', content: message.content }); continue; }

    const uses = message.content.filter(b => b.type === 'tool_use');
    if (!uses.length) break;
    if (message.stop_reason === 'max_tokens') throw new Error('The answer was cut off. Please ask a narrower question.');

    messages.push({ role: 'assistant', content: message.content });
    const results = uses.map(u => {
      const spec = SPECS.find(s => s.name === u.name);
      const t0 = Date.now();
      emit({ type: 'tool_start', id: u.id, name: u.name, input: u.input });
      const bad = spec ? validate(spec, u.input) : `unknown tool ${u.name}`;
      let out, ok = !bad;
      if (bad) out = { error: bad };
      else {
        try { out = run[u.name]({ ...u.input }); if (out && out.error) ok = false; }
        catch (e) { out = { error: e.message }; ok = false; }
      }
      emit({ type: 'tool_end', id: u.id, name: u.name, input: u.input, ok, ms: Date.now() - t0, result: out });
      return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(forModel(out)).slice(0, 20000), ...(ok ? {} : { is_error: true }) };
    });
    messages.push({ role: 'user', content: results });
    if (turn === MAX_TURNS - 1) emit({ type: 'text', delta: '\n\n(I stopped after the maximum number of tool steps.)' });
  }
  emit({ type: 'done', usage });
}

/** Friendly message for API failures, without leaking internals. */
export function errorText(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'The model API key is not valid. Check the ANTHROPIC_API_KEY secret in Forge.';
  if (err instanceof Anthropic.PermissionDeniedError) return 'The model API key has no access to this model.';
  if (err instanceof Anthropic.RateLimitError) return 'The model is busy right now (rate limit). Try again in a minute.';
  if (err instanceof Anthropic.BadRequestError) return `The model rejected the request: ${err.message}`;
  if (err instanceof Anthropic.APIError) return `Model service error (${err.status ?? 'network'}). Try again.`;
  return err?.message || 'Unexpected error';
}
