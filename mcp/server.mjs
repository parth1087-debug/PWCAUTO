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
 *   ANTHROPIC_API_KEY=...           enables /api/chat (live agents on Claude), see agent.mjs
 *   DEMO_KEY=...                    if set, /api/chat requires the header "X-Demo-Key"
 *   CHAT_LIMIT=30                   chat requests per IP per 10 minutes
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import http from 'node:http';
import { runAgent, errorText, liveEnabled, MODEL } from './agent.mjs';
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

  server.registerTool('list_agents', { title: 'List Bruce agents', description: 'Bruce agent definitions configured for a demo.', inputSchema: { demo: demoArg } },
    async ({ demo }) => json(DEMOS[demo].agents));
  server.registerTool('get_policy', { title: 'Get policy', description: 'Policy rule by id (for example P-03) or all policies.', inputSchema: { id: z.string().optional() } },
    async ({ id }) => json(id ? POLICIES.find(p => p.id === id) || { error: 'Unknown policy' } : POLICIES));
  return server;
}

/* ---------- live chat (/api/chat): POST {demo, agent, messages, context?, anchor?} -> text/event-stream ---------- */
const hits = new Map();
const LIMIT = Number(process.env.CHAT_LIMIT || 30);
function limited(ip) {
  const now = Date.now(), win = 10 * 60e3;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > LIMIT;
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
  if (!liveEnabled()) return fail(503, 'Live agents are not configured on this server (no model API key).');
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

  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  const ctrl = new AbortController();
  res.on('close', () => ctrl.abort());
  const emit = ev => { if (!res.writableEnded) res.write(`data: ${JSON.stringify(ev)}\n\n`); };
  const ping = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n'); }, 15e3);
  try {
    await runAgent({ demo: body.demo, agent: body.agent, messages: clean, context: typeof body.context === 'string' ? body.context.slice(0, 500) : '', anchor: typeof body.anchor === 'string' ? body.anchor : null }, emit, ctrl.signal);
  } catch (err) {
    if (!ctrl.signal.aborted) { console.error('chat error:', err?.status || '', err?.message); emit({ type: 'error', message: errorText(err) }); }
  } finally {
    clearInterval(ping);
    res.end();
  }
}

const httpIdx = process.argv.indexOf('--http');
if (httpIdx > -1) {
  const port = Number(process.argv[httpIdx + 1] || process.env.PORT || 8787);
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, X-Demo-Key', 'Access-Control-Expose-Headers': 'Mcp-Session-Id' };
  http.createServer(async (req, res) => {
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ name: 'plantdb', status: 'ok', mcp: '/mcp', demos: allowed, anchor: anchor || 'now' }));
      return;
    }
    if (req.url === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ live: liveEnabled(), model: liveEnabled() ? MODEL : null, demos: allowed }));
      return;
    }
    if (req.url === '/api/chat') { chat(req, res); return; }
    if (!req.url.startsWith('/mcp')) { res.writeHead(404).end(); return; }
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
