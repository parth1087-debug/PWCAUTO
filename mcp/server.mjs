#!/usr/bin/env node
/**
 * plantdb MCP server
 * One MCP connector for the app's demo databases. Each industry demo has its own database;
 * a demo is chosen per call and can be restricted with PLANTDB_DEMOS.
 * Values are fixed (seeded); timestamps are anchored to now, or to PLANTDB_ANCHOR.
 *
 *   node server.mjs                 stdio transport (Claude Desktop, Claude Code, Bruce gateway)
 *   node server.mjs --http 8787     Streamable HTTP at http://localhost:8787/mcp
 *
 * Env:
 *   PLANTDB_DEMOS=auto,cement       limit which demo databases this connector can read
 *   PLANTDB_ANCHOR=2026-11-26T10:00 fix the "now" used for timestamps
 *   PLANTDB_TOKEN=secret            require "Authorization: Bearer secret" in HTTP mode
 *   BRUCE_KEY_AUTO=agv2_...         enables /api/chat through the demo's Bruce Plant Copilot agent, see bruce.mjs
 *   ANTHROPIC_API_KEY=...           fallback runtime: the agents on Claude directly, see agent.mjs
 *   DEMO_KEY=...                    if set, /api/chat requires the header "X-Demo-Key"
 *   CHAT_LIMIT=30                   chat requests per IP per 10 minutes
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAgent, errorText, liveEnabled, MODEL } from './agent.mjs';
import { runBruce, bruceDemos, COPILOTS } from './bruce.mjs';
import * as store from './store.mjs';
import { MIMICS } from '../web/src/shared/mimics.js';
import { ARTEFACT_HELP } from '../web/src/shared/artefacts.js';
import { assetSources, sourceSummary } from '../web/src/shared/sources.js';
import { DEMOS, DEMO_LIST, createDB, createTools, TOOL_SPECS, POLICIES } from '../web/src/shared/index.js';

const allowed = (process.env.PLANTDB_DEMOS || Object.keys(DEMOS).join(',')).split(',').map(s => s.trim()).filter(id => DEMOS[id]);
const anchor = process.env.PLANTDB_ANCHOR || null;
const dbFor = id => { const db = createDB(DEMOS[id], { anchor }); return { db, tools: createTools(db) }; };
const json = v => ({ content: [{ type: 'text', text: JSON.stringify(v, null, 2) }] });
const zType = { string: z.string(), number: z.number() };

function buildServer() {
  const server = new McpServer({ name: 'plantdb', version: '1.0.0' });
  const demoArg = z.enum(allowed).describe(`Demo database: ${allowed.join(', ')}`);

  server.registerTool('list_demos', { title: 'List demo databases', description: 'Industry demo databases this connector can read.', inputSchema: {} },
    async () => json(DEMO_LIST.filter(d => allowed.includes(d.id))));

  for (const spec of TOOL_SPECS) {
    const shape = { demo: demoArg };
    Object.entries(spec.props).forEach(([k, t]) => { shape[k] = (spec.required || []).includes(k) ? zType[t] : zType[t].optional(); });
    server.registerTool(spec.name, { title: spec.name.replace(/_/g, ' '), description: spec.description, inputSchema: shape },
      async ({ demo, ...args }) => json(dbFor(demo).tools[spec.name](args)));
  }

  /* ---------- Artefactory (shared database) ---------- */
  const typeArg = z.enum(['dashboard', 'sheet', 'presentation', 'document', 'form']);
  const T2 = { dash: 'dashboard', xlsx: 'sheet', pptx: 'presentation', docx: 'document', form: 'form' };
  const brief = a => ({ id: a.id, type: T2[a.type], name: a.name, demo: a.demo, version: a.versions[0].v, updated: new Date(a.versions[0].when).toISOString(), view: a.spec?.view, open: `#/artefactory/${a.id}` });
  server.registerTool('list_artefacts', { title: 'List artefacts', description: 'Dashboards, sheets, presentations, documents and forms in the Artefactory for a demo.', inputSchema: { demo: demoArg, type: typeArg.optional() } },
    async ({ demo, type }) => json(store.listArtefacts({ demo, type: type && Object.keys(T2).find(k => T2[k] === type) }).map(brief)));
  server.registerTool('get_artefact', { title: 'Get artefact', description: 'One artefact with its spec and version history.', inputSchema: { id: z.string() } },
    async ({ id }) => json(store.getArtefact(id) || { error: 'Artefact not found' }));
  server.registerTool('create_artefact', { title: 'Create artefact', description: `Create an artefact in the Artefactory (it appears in the app at once). ${ARTEFACT_HELP}`,
    inputSchema: { demo: demoArg, type: typeArg, name: z.string(), spec: z.record(z.any()).optional(), note: z.string().optional() } },
    async ({ demo, type, name, spec, note }) => { try { return json(brief(store.createArtefact({ demo, type, name, spec: spec || {}, by: 'Agent via MCP', note: note || 'Created by an agent' }))); } catch (e) { return json({ error: e.message }); } });
  server.registerTool('update_artefact', { title: 'Update artefact', description: 'Save a new version of an artefact: new name and/or spec. Earlier versions are kept.',
    inputSchema: { id: z.string(), name: z.string().optional(), spec: z.record(z.any()).optional(), note: z.string() } },
    async ({ id, name, spec, note }) => { try { return json(brief(store.addVersion(id, { name, spec, note, by: 'Agent via MCP' }))); } catch (e) { return json({ error: e.message }); } });
  server.registerTool('submit_form', { title: 'Submit form', description: 'Submit values to a form artefact (field id → value).', inputSchema: { id: z.string(), values: z.record(z.any()) } },
    async ({ id, values }) => { try { return json(store.submitForm(id, { values, by: 'Agent via MCP' })); } catch (e) { return json({ error: e.message }); } });
  server.registerTool('list_form_submissions', { title: 'List form submissions', description: 'Submissions of a form artefact, newest first.', inputSchema: { id: z.string() } },
    async ({ id }) => json(store.listSubmissions(id)));
  server.registerTool('get_setpoints', { title: 'Setpoint recommendations', description: 'Setpoint recommendations with current value, recommended value, expected gain, evidence and approval status.', inputSchema: { demo: demoArg } },
    async ({ demo }) => json(store.setpointsFor(demo)));
  server.registerTool('get_mimics', { title: 'Process and asset views', description: 'Interactive SCADA-style process and asset views (mimics) available for the plant: id, name, display level (L1 area, L2 unit, L3 equipment) and what they show. Create one in the Artefactory with create_artefact type dashboard, spec { view: "mimic", mimic: "<id>" }.', inputSchema: { demo: demoArg } },
    async ({ demo }) => json(MIMICS[demo] || []));
  server.registerTool('get_data_sources', { title: 'Data sources', description: 'Source systems feeding the plant model, or for one asset: each tag\'s source system, protocol address and historian path, plus ERP, CMMS and MES records.', inputSchema: { demo: demoArg, asset: z.string().optional() } },
    async ({ demo, asset }) => { const { db } = dbFor(demo); return json(asset ? (assetSources(db, asset) || { error: 'Unknown asset' }) : sourceSummary(db)); });

  server.registerTool('list_agents', { title: 'List Bruce agents', description: 'Bruce agent definitions configured for a demo.', inputSchema: { demo: demoArg } },
    async ({ demo }) => json(DEMOS[demo].agents));
  server.registerTool('get_policy', { title: 'Get policy', description: 'Policy rule by id (for example P-03) or all policies.', inputSchema: { id: z.string().optional() } },
    async ({ id }) => json(id ? POLICIES.find(p => p.id === id) || { error: 'Unknown policy' } : POLICIES));
  return server;
}

/* ---------- live chat (/api/chat): POST {demo, agent, messages, context?, anchor?} -> text/event-stream ---------- */
const hits = new Map();
const LIMIT = Number(process.env.CHAT_LIMIT || 30);
function limited(ip, max = LIMIT) {
  const now = Date.now(), win = 10 * 60e3;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > max;
}
function readJson(req, max = 64e3) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > max) { reject(new Error('Request too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
async function chat(req, res) {
  const fail = (code, message) => res.writeHead(code, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: message }));
  if (req.method !== 'POST') return fail(405, 'Use POST');
  if (!liveEnabled() && !bruceDemos().length) return fail(503, 'Live agents are not configured on this server (no Bruce agent key or model API key).');
  if (process.env.DEMO_KEY && req.headers['x-demo-key'] !== process.env.DEMO_KEY) return fail(401, 'Unauthorized');
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return fail(429, 'Too many questions in a short time. Wait a few minutes.');
  let body;
  try { body = await readJson(req); } catch (e) { return fail(400, e.message); }
  const msgs = Array.isArray(body.messages) ? body.messages : [];
  const clean = msgs.slice(-12).filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim()).map(m => ({ role: m.role, content: m.content.slice(0, 6000) }));
  while (clean.length && clean[0].role !== 'user') clean.shift();
  if (!clean.length || clean[clean.length - 1].role !== 'user') return fail(400, 'The last message must be from the user.');
  if (!allowed.includes(body.demo)) return fail(400, 'Unknown demo');
  const viaBruce = bruceDemos().includes(body.demo);
  if (!viaBruce && !liveEnabled()) return fail(503, `Live agents are not configured for the ${body.demo} demo.`);

  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  const ctrl = new AbortController();
  res.on('close', () => ctrl.abort());
  const emit = ev => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(ev)}\n\n`); };
  const ping = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n'); }, 15e3);
  try {
    const context = typeof body.context === 'string' ? body.context.slice(0, 500) : '';
    if (viaBruce) {
      const session_id = typeof body.session_id === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(body.session_id) ? body.session_id : undefined;
      await runBruce({ demo: body.demo, message: clean[clean.length - 1].content, session_id, context, anchor: typeof body.anchor === 'string' ? body.anchor : null, debug: body.debug === true }, emit, ctrl.signal);
    } else {
      await runAgent({ demo: body.demo, agent: body.agent, messages: clean, context, anchor: typeof body.anchor === 'string' ? body.anchor : null }, emit, ctrl.signal);
    }
  } catch (err) {
    if (!ctrl.signal.aborted) { console.error('chat error:', err?.status || '', err?.message); emit({ type: 'error', message: errorText(err) }); }
  } finally {
    clearInterval(ping);
    res.end();
  }
}

/* ---------- the web app (built into web/dist), served at / ---------- */
const DIST = process.env.WEB_DIST || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web/dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
function serveApp(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  let file = path.resolve(DIST, '.' + rel);
  if (!file.startsWith(DIST + path.sep) && file !== DIST) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Web app not built'); return; }
  const isAsset = file.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options': 'nosniff' });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(file).pipe(res);
}

/* ---------- REST for the app: artefacts, forms, setpoints, data sources ---------- */
async function rest(req, res) {
  const send = (code, v) => res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(v));
  const u = new URL(req.url, 'http://x'); const p = u.pathname.split('/').filter(Boolean); // ['api', ...]
  try {
    if (p[1] === 'artefacts') {
      if (req.method === 'GET' && !p[2]) return send(200, store.listArtefacts({ demo: u.searchParams.get('demo') || undefined }));
      if (req.method === 'GET' && p[2] && !p[3]) { const a = store.getArtefact(p[2]); return a ? send(200, a) : send(404, { error: 'Not found' }); }
      if (req.method === 'GET' && p[3] === 'submissions') return send(200, store.listSubmissions(p[2]));
      if (req.method !== 'POST') return send(405, { error: 'Method not allowed' });
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (limited("w:" + ip, 120)) return send(429, { error: 'Too many changes in a short time.' });
      const body = await readJson(req, 200e3);
      if (!p[2]) return send(201, store.createArtefact(body));
      if (p[3] === 'versions') return send(200, store.addVersion(p[2], body));
      if (p[3] === 'submissions') return send(201, store.submitForm(p[2], body));
      if (p[3] === 'archive') return send(200, store.archiveArtefact(p[2], body.by));
      return send(404, { error: 'Not found' });
    }
    if (p[1] === 'setpoints') {
      if (req.method === 'GET') return send(200, store.setpointsFor(u.searchParams.get('demo')));
      if (req.method === 'POST') return send(200, store.decideSetpoint(await readJson(req)));
    }
    if (p[1] === 'sources' && req.method === 'GET') {
      const demo = u.searchParams.get('demo'); if (!allowed.includes(demo)) return send(400, { error: 'Unknown demo' });
      const { db } = dbFor(demo); const asset = u.searchParams.get('asset');
      return send(200, asset ? assetSources(db, asset) : sourceSummary(db));
    }
    if (p[1] === 'store') return send(200, store.storeInfo());
    return send(404, { error: 'Not found' });
  } catch (e) { return send(400, { error: e.message }); }
}

const httpIdx = process.argv.indexOf('--http');
if (httpIdx > -1) {
  const port = Number(process.argv[httpIdx + 1] || process.env.PORT || 8787);
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, X-Demo-Key', 'Access-Control-Expose-Headers': 'Mcp-Session-Id' };
  http.createServer(async (req, res) => {
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ name: 'plantdb', status: 'ok', mcp: '/mcp', demos: allowed, anchor: anchor || 'now' }));
      return;
    }
    if (req.url === '/api/status') {
      const viaBruce = bruceDemos().filter(d => allowed.includes(d));
      const liveDemos = liveEnabled() ? allowed : viaBruce;
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({
        live: liveDemos.length > 0, liveDemos, demos: allowed,
        provider: Object.fromEntries(liveDemos.map(d => [d, viaBruce.includes(d) ? 'bruce' : 'claude'])),
        agents: Object.fromEntries(viaBruce.map(d => [d, { id: COPILOTS[d].id, name: COPILOTS[d].name }])),
        model: liveEnabled() ? MODEL : null,
      }));
      return;
    }
    if (req.url === '/api/chat') { chat(req, res); return; }
    if (req.url.startsWith('/api/')) { rest(req, res); return; }
    if (!req.url.startsWith('/mcp')) { serveApp(req, res); return; }
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }).end('Use POST (stateless Streamable HTTP)'); return; }
    if (process.env.PLANTDB_TOKEN && req.headers.authorization !== `Bearer ${process.env.PLANTDB_TOKEN}`) { res.writeHead(401).end('Unauthorized'); return; }
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', async () => {
      const server = buildServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => { transport.close(); server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
    });
  }).listen(port, () => console.error(`plantdb MCP on http://localhost:${port}/mcp · demos: ${allowed.join(', ')}`));
} else {
  await buildServer().connect(new StdioServerTransport());
}
