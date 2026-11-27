/* Data-source mapping: where every asset and tag in the plant model comes from.
   OT values come from the tag's source system (PLC, DCS, SCADA, meters, LIMS …) through I/O Connect,
   are historised, and are bound to the UNS path. Business systems (ERP, CMMS, MES) are bound at asset level. */
import { hash } from './engine.js';

const DEFAULT_SOURCES = {
  plc: { name: 'Plant PLCs', kind: 'OT · PLC', via: 'I/O Connect · OPC UA' },
  historian: { name: 'Process historian', kind: 'Historian', via: 'I/O Connect · PI Web API' },
  erp: { name: 'SAP S/4HANA', kind: 'ERP', via: 'MCP Gateway · OData' },
  cmms: { name: 'SAP PM', kind: 'CMMS', via: 'MCP Gateway · OData' },
};
export const sourcesOf = demo => ({ ...DEFAULT_SOURCES, ...(demo.sources || {}) });

const proto = via => (/opc ?ua/i.test(via) ? 'opcua' : /modbus/i.test(via) ? 'modbus' : /bacnet/i.test(via) ? 'bacnet' : /104/.test(via) ? 'iec104' : /mqtt/i.test(via) ? 'mqtt' : /odata|rest|api/i.test(via) ? 'api' : 'opcua');

/** Address the tag would have in its source system (stable, plausible). */
function address(kind, srcKey, assetId, tagKey) {
  const h = hash(assetId + tagKey);
  const a = assetId.replace(/[^A-Z0-9]/gi, '');
  switch (kind) {
    case 'opcua': return `ns=3;s=${a}.${tagKey.replace(/_(\w)/g, (_, c) => c.toUpperCase())}.PV`;
    case 'modbus': return `unit ${(h % 30) + 1} · HR ${40001 + (h % 900)}`;
    case 'bacnet': return `device ${2000 + (h % 500)} · AV:${h % 64}`;
    case 'iec104': return `IOA ${1000 + (h % 8000)}`;
    case 'mqtt': return `${srcKey}/${a.toLowerCase()}/${tagKey}`;
    default: return `${srcKey}:${a}/${tagKey}`;
  }
}

/** Every binding of one asset: tag sources, historian, ERP/CMMS/MES records and documents. */
export function assetSources(db, assetId) {
  const a = db.assetById[assetId]; if (!a) return null;
  const d = db.demo; const S = sourcesOf(d);
  const h = hash(d.id + assetId);
  const site = (a.site?.slug || d.siteSlug).slice(0, 4).toUpperCase();
  const tags = d.classes[a.cls].tags.map(t => {
    const def = db.tagDef(assetId, t[0]); const key = def.src; const s = S[key] || S.plc; const kind = proto(s.via);
    return { tag: t[0], name: t[1], unit: t[2], source: key, system: s.name, system_kind: s.kind, via: s.via, address: address(kind, key, assetId, t[0]),
      sampling: key === 'lims' ? 'per sample' : /meter|ems|energy/i.test(key) ? '1 min' : '1 s', historian: `${S.historian ? S.historian.name : 'Historian'} · ${a.id}.${t[0]}`, uns: db.unsPath(a, t[0]) };
  });
  const records = [];
  if (S.erp) records.push({ system: S.erp.name, kind: S.erp.kind, object: 'Functional location', id: `FL-${site}-${a.area.id.slice(0, 4).toUpperCase()}-${a.id}` });
  if (S.cmms) records.push({ system: S.cmms.name, kind: S.cmms.kind, object: 'Equipment', id: `EQ ${10000000 + (h % 89999999)}` });
  if (S.mes) records.push({ system: S.mes.name, kind: S.mes.kind, object: 'Work center', id: `${a.line.id.toUpperCase()}` });
  if (S.lims && tags.some(t => t.source === 'lims')) records.push({ system: S.lims.name, kind: S.lims.kind, object: 'Sampling point', id: `SP-${a.id}` });
  const docs = (d.docs || []).filter(x => (x.obj || '').includes(a.id) || (x.obj || '').toLowerCase().includes(a.line.name.toLowerCase())).map(x => ({ name: x.name, type: x.type }));
  return { asset: a.id, name: a.name, uns: db.unsPath(a), tags, records, docs };
}

/** Plant-wide summary: each source system with what it feeds. */
export function sourceSummary(db) {
  const S = sourcesOf(db.demo);
  const count = {}; const assetsBy = {};
  db.assets.forEach(a => db.demo.classes[a.cls].tags.forEach(t => { const k = db.tagDef(a.id, t[0]).src; count[k] = (count[k] || 0) + 1; (assetsBy[k] = assetsBy[k] || new Set()).add(a.id); }));
  return Object.entries(S).filter(([key]) => count[key] || (db.demo.sources || {})[key] || !['plc'].includes(key)).map(([key, s]) => ({ key, ...s, tags: count[key] || 0, assets: assetsBy[key] ? assetsBy[key].size : 0,
    role: count[key] ? 'Live tags' : key === 'historian' ? 'History for every tag' : /erp|cmms|mes/.test(key) ? 'Asset records' : 'Context' }));
}
