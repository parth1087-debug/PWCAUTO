/**
 * Push agent definitions to a Bruce MCP gateway.
 *
 *   BRUCE_GATEWAY_URL=https://<your-bruce>/mcp BRUCE_TOKEN=... node bruce/push-to-bruce.mjs auto
 *
 * The script connects to the gateway, lists its tools and looks for a tool that creates or updates
 * agents (name matching /(create|upsert|register).*agent/). Set BRUCE_AGENT_TOOL to name it exactly.
 * With --dry-run it prints what it would send.
 */
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const demo = process.argv[2] || 'auto';
const dry = process.argv.includes('--dry-run');
const defs = JSON.parse(readFileSync(new URL(`./agents/${demo}.json`, import.meta.url)));
if (dry || !process.env.BRUCE_GATEWAY_URL) {
  console.log(dry ? 'Dry run.' : 'BRUCE_GATEWAY_URL is not set. Showing what would be sent.');
  defs.agents.forEach(a => console.log(`- ${a.id}  ${a.name}  v${a.version}  tools=${a.tools.length}  skills=${a.skills.join(',') || '-'}`));
  process.exit(0);
}
const client = new Client({ name: 'pwc-demo-push', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(process.env.BRUCE_GATEWAY_URL), {
  requestInit: { headers: process.env.BRUCE_TOKEN ? { Authorization: `Bearer ${process.env.BRUCE_TOKEN}` } : {} } }));
const { tools } = await client.listTools();
const tool = process.env.BRUCE_AGENT_TOOL || tools.map(t => t.name).find(n => /(create|upsert|register).*agent/i.test(n));
if (!tool) { console.error('No agent-creation tool found on the gateway. Tools:', tools.map(t => t.name).join(', ')); process.exit(1); }
for (const agent of defs.agents) {
  const r = await client.callTool({ name: tool, arguments: { agent, definition: agent } });
  console.log(r.isError ? 'FAILED' : 'ok', agent.id, r.content?.[0]?.text?.slice(0, 120) || '');
}
await client.close();
