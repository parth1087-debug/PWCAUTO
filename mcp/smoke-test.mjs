import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const client = new Client({ name: 'smoke-test', version: '1.0.0' });
await client.connect(new StdioClientTransport({ command: 'node', args: [new URL('./server.mjs', import.meta.url).pathname], env: { ...process.env, PLANTDB_DEMOS: 'auto,cement' } }));
const { tools } = await client.listTools();
console.log('tools:', tools.map(t => t.name).join(', '));
const call = async (name, args) => JSON.parse((await client.callTool({ name, arguments: args })).content[0].text);
console.log('demos:', (await call('list_demos', {})).map(d => d.id).join(', '));
const k = await call('get_kpis', { demo: 'auto', days: 7 });
console.log('auto KPIs:', k.kpis.slice(0, 3).map(x => `${x.name} ${x.value} ${x.unit}`).join(' | '));
const h = await call('get_tag_history', { demo: 'cement', path: 'aravali/unit-2/pyro/kiln-line-1/ph-01/c4_draft', days: 1 });
console.log('cement C4 draft points:', h.points.length, 'latest', h.points.at(-1));
const blocked = await client.callTool({ name: 'get_kpis', arguments: { demo: 'steel' } });
console.log('steel blocked:', blocked.isError ? 'yes' : 'no');
await client.close();
