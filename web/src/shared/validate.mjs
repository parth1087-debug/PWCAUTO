#!/usr/bin/env node
/**
 * Validate a demo config: node web/src/shared/validate.mjs <demo-id> [more ids]
 * Checks references (assets, tags, KPIs, sources, setpoints, forms) and runs every plantdb tool.
 */
import { DEMOS as REG, createDB, createTools, plantBrief } from './index.js';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FIELD_TYPES = ['text', 'textarea', 'number', 'select', 'radio', 'checkbox', 'checklist', 'date', 'datetime', 'time', 'rating', 'signature', 'asset'];
const DEMOS = { ...REG };
const args = process.argv.slice(2);
for (const a of args.filter(x => x.endsWith('.js'))) { const m = await import(pathToFileURL(path.resolve(a)).href); DEMOS[m.default.id] = m.default; args[args.indexOf(a)] = m.default.id; }
const ids = args.length ? args : Object.keys(DEMOS);
let bad = 0;
for (const id of ids) {
  const d = DEMOS[id];
  const errs = [], warn = [];
  const E = m => errs.push(m), W = m => warn.push(m);
  if (!d) { console.log(`✗ ${id}: not listed in web/src/shared/index.js`); bad++; continue; }
  try {
    for (const k of ['id', 'name', 'industry', 'company', 'companySlug', 'site', 'siteSlug', 'location', 'production', 'classes', 'areas', 'kpis', 'overview', 'events', 'cost', 'quality', 'energy', 'maintenance', 'approvals', 'docs', 'skills', 'schedules', 'workflows', 'agents', 'suggestions', 'sources', 'setpoints', 'forms'])
      if (d[k] == null) E(`missing top-level field "${k}"`);
    const db = createDB(d, {});
    const t = createTools(db);
    const assetIds = new Set();
    for (const a of db.assets) { if (assetIds.has(a.id)) E(`duplicate asset id ${a.id}`); assetIds.add(a.id); if (!d.classes[a.cls]) E(`asset ${a.id} uses unknown class ${a.cls}`); }
    const hasTag = (asset, tag) => !!db.tagDef(asset, tag);
    for (const [ck, c] of Object.entries(d.classes)) {
      if (!c.label || !Array.isArray(c.tags) || !c.tags.length) E(`class ${ck} needs label and tags`);
      for (const tg of c.tags || []) {
        if (tg.length < 5 || typeof tg[3] !== 'number' || typeof tg[4] !== 'number') E(`class ${ck} tag ${tg[0]} must be [key,name,unit,base,noise,(cycle),(lo),(hi),(src)]`);
        const src = tg[8] || c.src || 'plc';
        if (d.sources && !d.sources[src]) E(`class ${ck} tag ${tg[0]} source "${src}" is not in sources`);
      }
    }
    for (const k of d.overview || []) if (!d.kpis.find(x => x.id === k)) E(`overview KPI ${k} not in kpis`);
    for (const k of d.kpis) for (const f of ['id', 'name', 'unit', 'group', 'base', 'cur', 'target', 'better', 'dec', 'owner']) if (k[f] == null) E(`KPI ${k.id} missing ${f}`);
    for (const e of d.events || []) { if (!assetIds.has(e.asset)) E(`event ${e.id} asset ${e.asset} unknown`); else if (!hasTag(e.asset, e.tag)) E(`event ${e.id} tag ${e.asset}.${e.tag} unknown`); if (e.title && !e.diagnosis) E(`event ${e.id} has title but no diagnosis`); }
    if (!(d.events || []).filter(e => e.title).length) E('need at least 3 titled events (alerts)');
    if (!assetIds.has(d.maintenance?.spotlight)) E('maintenance.spotlight must be an asset id');
    const sp = d.quality?.spc; if (!sp || !hasTag(sp.asset, sp.tag)) E('quality.spc must reference a real asset tag');
    if (d.quality?.inspect && !assetIds.has(d.quality.inspect)) E('quality.inspect must be an asset id');
    const m = d.energy?.meter; if (!m || !hasTag(m[0], m[1])) E('energy.meter must be [asset, tag]');
    for (const [a, tg] of d.energy?.utilities || []) if (!hasTag(a, tg)) E(`energy.utilities ${a}.${tg} unknown`);
    for (const s of d.setpoints || []) { if (!hasTag(s.asset, s.tag)) E(`setpoint ${s.asset}.${s.tag} unknown`); for (const f of ['name', 'current', 'recommended', 'unit', 'gain', 'reason', 'confidence']) if (s[f] == null) E(`setpoint ${s.asset}.${s.tag} missing ${f}`); }
    if ((d.setpoints || []).length < 3) E('need at least 3 setpoints');
    for (const f of d.forms || []) {
      if (!f.id || !f.name || !Array.isArray(f.sections)) { E(`form ${f.id || '?'} needs id, name, sections`); continue; }
      for (const sec of f.sections) for (const fl of sec.fields || []) { if (!FIELD_TYPES.includes(fl.type)) E(`form ${f.id} field ${fl.id} has unknown type ${fl.type}`); if ((fl.type === 'select' || fl.type === 'radio' || fl.type === 'checklist') && !fl.options?.length) E(`form ${f.id} field ${fl.id} needs options`); }
    }
    if ((d.forms || []).length < 3) E('need at least 3 forms');
    for (const [k, s] of Object.entries(d.sources || {})) for (const f of ['name', 'kind', 'via']) if (!s[f]) E(`source ${k} missing ${f}`);
    for (const ag of d.agents) for (const sk of ag.skills) if (!d.skills.find(x => x.id === sk)) E(`agent ${ag.id} uses unknown skill ${sk}`);
    for (const a of d.approvals || []) if (!a.table || !a.policy) E(`approval ${a.id} needs table and policy`);
    // run every tool
    const calls = [['uns_browse', {}], ['uns_search', { q: db.assets[0].id }], ['get_tag_history', { asset: db.assets[0].id, tag: d.classes[db.assets[0].cls].tags[0][0], days: 7 }], ['get_kpis', { days: 30 }], ['get_kpi_trend', { id: d.kpis[0].id, days: 90 }],
      ['get_asset_health', {}], ['diagnose_asset', { asset: d.maintenance.spotlight }], ['get_production', { days: 14 }], ['get_oee_losses', {}], ['get_energy', { days: 7 }], ['get_quality', { days: 30 }], ['list_messages', {}], ['search_docs', { q: d.docs[0]?.name.split(' ')[0] || 'manual' }]];
    for (const [n, args] of calls) { try { const r = t[n](args); if (r == null || r.error) E(`tool ${n} returned ${JSON.stringify(r).slice(0, 120)}`); } catch (e) { E(`tool ${n} threw ${e.message}`); } }
    plantBrief(d);
    if (d.suggestions.length < 6) W('fewer than 6 suggestions');
    const st = db.stats();
    console.log(`${errs.length ? '✗' : '✓'} ${id}: ${db.sites.length} site(s), ${st.assets} assets, ${st.tags} tags, ${d.kpis.length} KPIs, ${(d.events || []).filter(e => e.title).length} alerts, ${(d.setpoints || []).length} setpoints, ${(d.forms || []).length} forms, ${d.agents.length} agents`);
  } catch (e) { E(`crashed: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); console.log(`✗ ${id}`); }
  errs.forEach(x => console.log('   error:', x)); warn.forEach(x => console.log('   warn:', x));
  if (errs.length) bad++;
}
process.exit(bad ? 1 : 0);
