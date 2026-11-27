# Demo config schema

A demo is one file in `web/src/shared/demos/<id>.js` that default-exports an object. Read `auto.js` (discrete manufacturing), `cement.js` and `steel.js` (process) as complete examples. The engine (`../engine.js`) generates six months of hourly data for every asset tag from these definitions, and the tools (`../tools.js`) serve KPIs, health, production, losses, energy and quality from them. Everything is demo data, written to look real for an Indian plant (₹, lakh, IST, Indian locations).

Validate with: `node web/src/shared/validate.mjs web/src/shared/demos/<id>.js` (from the repo root). It must print `✓`.

## Fields (all required unless marked optional)

| Field | Meaning |
|---|---|
| `id`, `name`, `industry` | short id (used in URLs and `demo=` arguments), display name, one-line industry |
| `company`, `companySlug`, `site`, `siteSlug`, `location` | enterprise and default site; slugs are lower-case and URL-safe |
| `production` | `{ unit, planPerDay, label, massUnit }` daily plan in `unit` (pcs, t, kg, MWh, batches …) |
| `classes` | asset classes: `{ key: { label, src?, tags: [[key, name, unit, base, noise, cycle?, lo?, hi?, src?]] } }`. `base` is the normal value, `noise` the random movement, `cycle` a daily sine amplitude (use 0 for none), `lo`/`hi` alarm limits (optional), `src` the data source key for that tag (falls back to the class `src`, then `plc`). 2–5 tags per class. |
| `areas` | `[{ id, name, site?, lines: [{ id, name, assets: [[ASSET-ID, name, classKey, criticality 'A'|'B'|'C']] }] }]`. Asset ids are UPPER-CASE like `HB-04`, unique. **Multi-plant portfolios:** give each area `site: { slug, name, location }`; areas with the same site slug form one plant. |
| `kpis` | `[{ id, name, unit, group: 'cost'|'maintenance'|'quality'|'energy', base, cur, target, better: 'up'|'down', dec, lakh, owner }]`, 8–10 KPIs. `base` = 3 months before go-live, `cur` = now (better than base), `target` beyond cur. `lakh` = ₹ lakh per year realised (0 if not money). |
| `overview` | 6 KPI ids shown on the overview |
| `events` | anomalies: `{ id, asset, tag, kind: 'ramp'|'step', startHoursAgo, to, curve?, health?, rulDays?, severity: 'bad'|'warn', minutesAgo, title, agent, finding, diagnosis: { title, confidence, points: [..], reco } }`. 3–5 titled events (each becomes an alert with a diagnosis). Untitled events (no title) only shape a second tag. `to` is the value the tag ramps or steps to; it must cross the `lo`/`hi` limit for the main tag. |
| `cost` | `{ unitLabel, budget, elements: [[name, value]], bridge: [[name, delta]], lines: [[line name, availability %, performance %, quality %, top loss]], losses: [[loss name, hours]] }` (use the six big losses or the industry's own loss categories) |
| `quality` | `{ defects: [[defect, count]], spc: { asset, tag, name, lsl, usl }, inspect: ASSET-ID }` |
| `energy` | `{ contractKVA, scale, meter: [ASSET-ID, tag], areas: [[area, share %]] (sums to 100), utilities: [[ASSET-ID, tag], …] }` |
| `maintenance` | `{ spotlight: ASSET-ID }` the asset with the worst issue (used for the asset twin) |
| `approvals` | 2–3 `{ id, from, minutesAgo, title, policy: 'P-02'|'P-03'|'P-04'|'P-05', table: [[label, value]], prompt }` |
| `docs` | 5–6 `{ id, name, type, obj, pages, cited, pass: [[quoted passage, 'p. 12']] }` OEM manuals, SOPs, past RCAs, control plans, regulatory documents |
| `skills` | 4–6 `{ id, name, pack, ver, steps: [..] }` |
| `schedules` | 4–5 `[name, format: 'Report'|'Excel'|'Deck', agent name, schedule text, recipients]` |
| `workflows` | 3–4 `[name, [[ 'Trigger'|'Agent'|'Approval'|'Action', text ], …]]` |
| `agents` | `makeAgents('<id>', [ … 6 agents … ])` like `auto.js`; `domain` one of maintenance, cost, quality, energy, reports, process |
| `suggestions` | 6 Copilot prompts that name real asset ids and KPIs |
| `sources` | **new.** Systems that feed the plant model: `{ key: { name, kind, via, detail? } }`, e.g. `plc: { name: 'Siemens S7-1500 PLCs', kind: 'OT · PLC', via: 'I/O Connect · OPC UA' }`, `historian`, `mes`, `erp`, `lims`, `cmms`, `energy`, `vision`, `scada`, `dcs`, `weather`, `ems`. 6–9 sources. Every tag's `src` must be one of these keys. Include at least `historian`, `erp` and `cmms`. |
| `setpoints` | **new.** 3–5 setpoint recommendations: `{ asset, tag, name, current, recommended, unit, lo, hi, gain, kpi, reason, confidence, status: 'proposed'|'approved'|'applied' }`. `gain` is text like `'₹18 L/yr'` or `'−2.1 % specific energy'`; `reason` one or two sentences with evidence; `confidence` 0–1. |
| `forms` | **new.** 3 fillable forms the plant uses (shift handover, inspection, checklist, permit, deviation …): `{ id, name, desc, sections: [{ title, fields: [{ id, label, type, options?, unit?, required?, help?, placeholder? }] }] }`. Field `type`: text, textarea, number, select, radio, checkbox, checklist, date, datetime, time, rating, signature, asset. `select`/`radio`/`checklist` need `options`. 2–4 sections, 8–16 fields per form. |
| `dashNames` | optional: rename built-in dashboards for the industry, e.g. `{ cost: 'Generation losses', quality: 'Performance ratio', energy: 'Grid & auxiliaries' }` (keys: kpis, overview, maintenance, cost, quality, energy) |
| `realtime` | optional: `{ title, assets: [ASSET-ID, …] }` 6–12 assets for the real-time monitor; default is the spotlight asset's line plus utilities |
