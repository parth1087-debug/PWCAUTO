/**
 * Writes Bruce agent definitions and the UNS ontology for every demo:
 *   bruce/agents/<demo>.json   agents to create in Bruce
 *   bruce/uns/<demo>.json      ISA-95 Unified Namespace tree (enterprise/site/area/work center/work unit/tag)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { DEMOS, createDB } from '../web/src/shared/index.js';

const dir = new URL('.', import.meta.url).pathname;
mkdirSync(dir + 'agents', { recursive: true }); mkdirSync(dir + 'uns', { recursive: true });
for (const [id, demo] of Object.entries(DEMOS)) {
  const db = createDB(demo);
  writeFileSync(`${dir}agents/${id}.json`, JSON.stringify({ demo: id, connector: { name: 'plantdb', transport: 'stdio', command: 'node mcp/server.mjs', env: { PLANTDB_DEMOS: id } }, agents: demo.agents }, null, 2));
  writeFileSync(`${dir}uns/${id}.json`, JSON.stringify(db.unsTree(), null, 2));
  console.log(`${id}: ${demo.agents.length} agents, ${db.stats().tags} UNS tags`);
}
