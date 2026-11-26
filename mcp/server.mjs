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
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import http from 'node:http';
import { DEMOS, DEMO_LIST, createDB, createTools, TOOL_SPECS, POLICIES } from '../shared/index.js';

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

const httpIdx = process.argv.indexOf('--http');
if (httpIdx > -1) {
  const port = Number(process.argv[httpIdx + 1] || 8787);
  http.createServer(async (req, res) => {
    if (!req.url.startsWith('/mcp')) { res.writeHead(404).end(); return; }
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
