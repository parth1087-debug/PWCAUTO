/* Ontology relations per plant (on top of the ISA-95 tree). */
import { RELATIONS as ems, REL_LABEL } from './ems.js';
export { REL_LABEL };
export const ONTOLOGY = { ems };
/** Relations of one asset: { up: [...], down: [...] } each { asset, rel, note }. */
export function relationsOf(demoId, assetId) {
  const all = ONTOLOGY[demoId] || [];
  return { down: all.filter(r => r[0] === assetId).map(r => ({ asset: r[2], rel: r[1], note: r[3] })), up: all.filter(r => r[2] === assetId).map(r => ({ asset: r[0], rel: r[1], note: r[3] })) };
}
/** Walk upstream (sources) or downstream (consumers) from an asset. dir: 'up' | 'down'. */
export function trace(demoId, assetId, dir = 'up', kinds = ['feeds', 'supplies', 'drives'], max = 40) {
  const all = (ONTOLOGY[demoId] || []).filter(r => kinds.includes(r[1]) && !/normally open/.test(r[3] || '')); /* a normally-open tie is not a live path */ const seen = new Set([assetId]); const out = []; let frontier = [[assetId, 0]];
  while (frontier.length && out.length < max) { const next = [];
    for (const [id, d] of frontier) for (const r of all) { const hit = dir === 'up' ? r[2] === id : r[0] === id; if (!hit) continue; const other = dir === 'up' ? r[0] : r[2];
      if (seen.has(other)) continue; seen.add(other); out.push({ asset: other, rel: r[1], via: id, depth: d + 1, note: r[3] }); next.push([other, d + 1]); }
    frontier = next; }
  return out;
}
