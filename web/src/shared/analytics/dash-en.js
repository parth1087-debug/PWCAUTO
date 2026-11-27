/* Analytics for the Energy, Real-time monitor and Setpoint advisor boards (dash-en).
   Pure functions over db / demo. Where the plant model has no data (tariff, ToD slots, PF, rooftop solar,
   avoidable share per area), values are deterministic per plant (hash of the demo id) and realistic for India. */
import { hash } from '../engine.js';

const H = 36e5, D = 864e5;
const r = (v, d = 0) => { const p = Math.pow(10, d); return Math.round(v * p) / p; };
const h01 = s => (hash(s) % 10000) / 10000;           // stable 0..1
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const LAKH = 1e5;

/* ---------- tariffs (₹), per plant ---------- */
const TARIFF = {
  auto: { rate: 7.6, demand: 550, state: 'TANGEDCO HT-I' },
  cement: { rate: 7.2, demand: 400, state: 'JVVNL HT-5' },
  steel: { rate: 6.6, demand: 470, state: 'CSPDCL HV-4 (steel)' },
  'pharma-api': { rate: 7.7, demand: 475, state: 'TSSPDCL HT-I' },
  'pharma-formulation': { rate: 7.3, demand: 450, state: 'DGVCL HTP-I' },
  pipes: { rate: 7.4, demand: 450, state: 'MSEDCL HT-I' },
  ems: { rate: 7.96, demand: 500, state: 'MSEDCL HT-I (campus)' },
  power: { rate: 4.15, demand: 0, state: 'PPA energy charge' },
  solar: { rate: 2.62, demand: 0, state: 'SECI PPA' },
  wind: { rate: 3.18, demand: 0, state: 'State PPA / C&I open access' },
};
/* Typical Indian HT ToD structure: morning and evening peak at a surcharge, night at a rebate. */
const TOD = [
  { id: 'peak', name: 'Peak', hours: [6, 7, 8, 9, 18, 19, 20, 21], f: 1.2, note: '06–10 and 18–22 · +20 %' },
  { id: 'normal', name: 'Normal', hours: [10, 11, 12, 13, 14, 15, 16, 17], f: 1.0, note: '10–18' },
  { id: 'off', name: 'Off-peak', hours: [22, 23, 0, 1, 2, 3, 4, 5], f: 0.85, note: '22–06 · −15 %' },
];

export function energyMode(demo) {
  if (demo.id === 'solar' || demo.id === 'wind' || /solar|wind/i.test(demo.industry) && demo.production.unit === 'MWh' && demo.energy?.meter?.[1] === 'export_mw') return 'export';
  if (demo.id === 'power' || /thermal power/i.test(demo.industry)) return 'aux';
  return 'consumer';
}
export const tariffOf = demo => ({ ...(TARIFF[demo.id] || { rate: 7.5, demand: 450, state: 'HT industrial' }), tod: TOD });

/** The energy KPI that answers "specific energy vs target". */
export function primaryEnergyKpi(demo) {
  const en = demo.kpis.filter(k => k.group === 'energy');
  const mode = energyMode(demo);
  if (mode === 'export') return demo.kpis.find(k => k.id === 'p50') || demo.kpis.find(k => k.id === 'pr') || en[0] || demo.kpis[0];
  if (mode === 'aux') return demo.kpis.find(k => k.id === 'apc') || en[0];
  return en.find(k => /kwh/i.test(k.unit)) || en[0] || demo.kpis[0];
}
const kpiOwner = (demo, id) => demo.kpis.find(k => k.id === id)?.owner;

/* ---------- site load, in kW (consumer / aux) or export kW (export) ---------- */
function siteSeries(db, demo) {
  const [a, t] = demo.energy.meter; const s = db.series(a, t); const k = demo.energy.scale || 1;
  const unit = db.tagDef(a, t).unit;
  return { s, k, unit };
}
function pfOf(db, demo) {
  if (demo.id === 'ems') return db.kpiSummary('pf', db.anchor - 30 * D, db.anchor).value;
  return r(0.952 + h01(demo.id + 'pf') * 0.034, 3);
}

/** Hour indices covered by [from, to]. */
function idxRange(db, from, to) {
  const n = db.series(...db.demo.energy.meter).length;
  const f = Math.max(0, Math.ceil(n - 1 - (db.anchor - from) / H));
  const e = n - 1 - Math.max(0, Math.floor((db.anchor - to) / H));
  return [f, e];
}

/* ========================================================================
   Energy model for one plant and period
   ======================================================================== */
export function energyModel(db, demo, R) {
  const mode = energyMode(demo);
  const tf = tariffOf(demo);
  const { s, k, unit } = siteSeries(db, demo);
  const pf = mode === 'consumer' ? pfOf(db, demo) : 1;
  /* consumer: meter is kVA (or MW scaled to kVA) unless it reads kW; aux: kW; export: MW scaled to kW */
  const toKw = v => (mode === 'consumer' ? (unit === 'kW' ? v * k : v * k * pf) : mode === 'aux' ? v * k : v * k);
  const toKva = v => (mode === 'consumer' ? (unit === 'kW' ? (v * k) / pf : v * k) : v * k);
  const [fi, ti] = idxRange(db, R.from, R.to);
  const hours = Math.max(1, ti - fi + 1);
  const yr = 8760 / hours;                                   // annualise factor for the period

  /* hourly profile and daily max demand */
  const hourly = [], daily = [];
  let kwh = 0, peakKva = 0, peakAt = 0, cur = null;
  const tod = Object.fromEntries(TOD.map(x => [x.id, 0]));
  for (let i = fi; i <= ti; i++) {
    const t = db.tsHour(i); const kw = toKw(s[i]); const kva = toKva(s[i]);
    kwh += kw; if (kva > peakKva) { peakKva = kva; peakAt = t; }
    const hr = new Date(t).getHours();
    tod[TOD.find(x => x.hours.includes(hr)).id] += kw;
    hourly.push({ t, kw, kva });
    const day = Math.floor((t + 5.5 * H) / D);
    if (!cur || cur.day !== day) { cur = { day, t, peak: 0, kwh: 0 }; daily.push(cur); }
    cur.peak = Math.max(cur.peak, kva); cur.kwh += kw;
  }
  const contract = demo.energy.contractKVA;
  const avgKw = kwh / hours;

  /* demand risk (consumer) */
  const over90 = daily.filter(d => d.peak > 0.9 * contract).length;
  const over100 = daily.filter(d => d.peak > contract).length;
  const months = Math.max(1, Math.round(hours / 730));
  const excess = Math.max(0, peakKva - contract);
  const mdPenaltyLakh = mode === 'consumer' ? (excess * tf.demand * 2 * Math.min(months, Math.max(1, over100 ? Math.ceil(over100 / 3) : 0))) / LAKH : 0;
  const shaveTarget = 0.9 * contract;
  const shaveKva = mode === 'consumer' ? Math.max(0, peakKva - shaveTarget) : 0;

  /* weekday x hour (consumer, aux) or day x hour (export) heatmap; at least 7 days */
  const hf = Math.max(0, ti - Math.max(hours, 7 * 24) + 1);
  let heat;
  if (mode === 'export') {
    const nd = Math.min(14, Math.max(7, Math.round(hours / 24)));
    const start = ti - nd * 24 + 1; const rows = [], vals = [];
    for (let d0 = 0; d0 < nd; d0++) {
      const row = [];
      for (let h = 0; h < 24; h++) { const i = start + d0 * 24 + h; row.push(i >= 0 ? toKw(s[i]) / 1000 : 0); }
      const tt = db.tsHour(start + d0 * 24);
      rows.push(new Date(tt).toLocaleDateString('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' })); vals.push(row);
    }
    /* columns are hour-of-day starting at the first index; rotate so column 0 is 00:00 IST */
    const h0 = new Date(db.tsHour(start)).getHours();
    heat = { rows, values: vals.map(v => v.map((_, c) => v[(c - h0 + 24) % 24])), unit: 'MW', sub: `MW exported · day of month × hour · last ${nd} days` };
  } else {
    const sum = Array.from({ length: 7 }, () => Array(24).fill(0)), n = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (let i = hf; i <= ti; i++) { const d = new Date(db.tsHour(i)); const w = (d.getDay() + 6) % 7; sum[w][d.getHours()] += toKw(s[i]); n[w][d.getHours()]++; }
    heat = { rows: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: sum.map((row, i) => row.map((v, j) => v / (n[i][j] || 1))), unit: 'kW',
      sub: `average kW · weekday × hour · ${hours >= 7 * 24 ? R.label : 'last 7 days'}` };
  }

  /* idle / night load: non-production hours vs working hours */
  const idleH = [], workH = [];
  for (let i = hf; i <= ti; i++) {
    const d = new Date(db.tsHour(i)); const hr = d.getHours(); const sun = d.getDay() === 0;
    if ((!demo.continuous && sun) || hr >= 23 || hr < 5) idleH.push(toKw(s[i])); else if (!sun && hr >= 9 && hr < 18) workH.push(toKw(s[i]));
  }
  const idleKw = mean(idleH), workKw = mean(workH);
  /* benchmark night / weekend load as a share of working load; null for 24x7 process plants with no idle window */
  const IDLE_BENCH = { auto: 0.45, pipes: 0.6, 'pharma-api': 0.75, 'pharma-formulation': 0.6, ems: 0.7, cement: null, steel: null };
  const bench = mode !== 'consumer' ? null : demo.id in IDLE_BENCH ? IDLE_BENCH[demo.id] : demo.continuous ? 0.7 : 0.5;
  const idleRatio = workKw ? idleKw / workKw : 0;
  const idleHoursYr = (demo.continuous ? 6 / 24 : (6 / 24) * (6 / 7) + 1 / 7) * 8760;
  const idleSaveKw = bench == null ? 0 : Math.max(0, idleKw - bench * workKw) * 0.5;       // half of the gap to benchmark is realistic
  const idleLakh = (idleSaveKw * idleHoursYr * tf.rate) / LAKH;

  /* ToD */
  const todRows = TOD.map(x => ({ ...x, kwh: tod[x.id], share: tod[x.id] / (kwh || 1), rate: tf.rate * x.f, costLakh: (tod[x.id] * tf.rate * x.f) / LAKH }));
  const peakRow = todRows[0], offRow = todRows[2];
  const todShiftLakh = mode === 'consumer' ? (0.1 * peakRow.kwh * yr * (peakRow.rate - offRow.rate)) / LAKH : 0;
  const costLakh = mode === 'consumer' ? todRows.reduce((a, x) => a + x.costLakh, 0) + (contract * 0.85 * tf.demand * (hours / 730)) / LAKH : (kwh * tf.rate) / LAKH;

  /* power factor */
  const pfInfo = mode === 'consumer' ? (() => {
    const slab = 0.99, penalty = 0.95;
    const billYr = costLakh * yr;
    const lakhYr = pf < slab ? Math.min(1.5, ((slab - pf) / 0.01) * 0.25) / 100 * billYr : 0;
    return { value: pf, slab, penalty, lakhYr, status: pf < penalty ? 'bad' : pf < slab ? 'warn' : 'good' };
  })() : null;

  /* renewable share (consumer) */
  const ren = mode === 'consumer' ? (() => {
    if (demo.kpis.find(x => x.id === 're')) { const kk = db.kpiSummary('re', R.from, R.to); return { value: kk.value, target: kk.target, base: kk.base, src: 'rooftop solar + green tariff' }; }
    const v = r(3 + h01(demo.id + 'ren') * 9, 1);
    return { value: v, target: r(v + 6 + h01(demo.id + 'rt') * 6, 0), base: r(v * 0.7, 1), src: 'rooftop solar (est. from inverter logs)' };
  })() : null;

  /* areas / consumers / sites, with avoidable share */
  const areas = demo.energy.areas.map(([name, share]) => {
    const a_kwh = (kwh * share) / 100;
    const util = /util|air|hvac|chill|water|steam|boiler|lighting|cw |ct |fan|pump/i.test(name);
    const waste = mode === 'export' ? 0 : r((util ? 0.1 : 0.05) + h01(demo.id + name) * (util ? 0.12 : 0.08), 3);
    const sitePlan = mode === 'export' ? r(0.93 + h01(demo.id + name + 'p50') * 0.1, 3) : null;
    return { name, share, util, kwh: a_kwh, costLakh: (a_kwh * tf.rate) / LAKH, waste, wasteLakhYr: (a_kwh * waste * yr * tf.rate) / LAKH, vsPlan: sitePlan };
  });

  /* export-specific */
  let exp = null;
  if (mode === 'export') {
    const prod = db.production(R.from, R.to);
    const plan = prod.reduce((a, x) => a + x.plan, 0), act = prod.reduce((a, x) => a + x.actual, 0);
    const curtK = demo.kpis.find(x => x.id === 'curt');
    const curtMWh = curtK ? db.kpiSummary('curt', R.from, R.to).value * (hours / 730) : (1 - db.kpiSummary('grid', R.from, R.to).value / 100) * act * 1.6;
    const auxPct = demo.id === 'solar' ? 0.42 : 0.85;
    exp = { days: prod, plan, act, attain: act / (plan || 1), curtMWh, curtLakh: (curtMWh * 1000 * tf.rate) / LAKH, auxPct, auxMWh: (act * auxPct) / 100,
      auxLakh: (((act * auxPct) / 100) * 1000 * 7.8) / LAKH, revenueLakh: (act * 1000 * tf.rate) / LAKH, peakMw: peakKva / 1000, capMw: contract / 1000 };
  }

  /* aux-specific (thermal unit): generation and APC */
  let aux = null;
  if (mode === 'aux') {
    const gen = db.series('GEN-01', 'mw');
    let g = 0; for (let i = fi; i <= ti; i++) g += gen ? gen[i] * 1000 : 0;
    const consumers = demo.energy.utilities.map(([a, t]) => {
      const def = db.tagDef(a, t); const h = db.history(a, t, R.from, R.to, 'day');
      const avg = mean(h.points.map(p => p.v)); const design = def.base * (0.86 + h01(demo.id + a + 'des') * 0.1);
      return { asset: a, name: db.assetById[a]?.name, tag: t, unit: def.unit, avg, design, excessKw: Math.max(0, avg - design), lakhYr: (Math.max(0, avg - design) * 8760 * tf.rate) / LAKH };
    }).sort((x, y) => y.lakhYr - x.lakhYr);
    aux = { genMWh: g / 1000, apcPct: (kwh / (g || 1)) * 100, consumers };
  }

  /* SEC / primary KPI */
  const kp = primaryEnergyKpi(demo);
  const ks = db.kpiSummary(kp.id, R.from, R.to);
  const gap = kp.better === 'down' ? ks.value - kp.target : kp.target - ks.value;
  const annualKwh = kwh * yr;

  /* ---------- actions with ₹ per action ---------- */
  const owner = kpiOwner(demo, kp.id) || 'Energy manager';
  const actions = [];
  const enKpis = new Set(demo.kpis.filter(x => x.group === 'energy').map(x => x.id).concat(mode === 'aux' ? ['nhr', 'apc'] : mode === 'export' ? demo.kpis.map(x => x.id) : ['pf', 'md', 'cost', 're']));
  (demo.setpoints || []).filter(sp => enKpis.has(sp.kpi) && sp.status !== 'applied').forEach(sp => {
    const g = parseGain(sp.gain, demo, sp);
    actions.push({ id: 'sp-' + sp.asset + sp.tag, title: sp.name, where: sp.asset, lakhYr: g.lakh, basis: g.basis, kpi: sp.kpi, owner: kpiOwner(demo, sp.kpi) || owner,
      next: sp.status === 'approved' ? 'Approved · apply in next shift' : `Approve setpoint ${fmt(sp.current)} → ${fmt(sp.recommended)} ${sp.unit}`, status: sp.status, link: 'setpoints' });
  });
  (demo.events || []).filter(e => e.title && (/energy|power|utilit|air|steam|aux|grid|curtail|soiling|forecast/i.test(e.agent) || (mode === 'export' && /Performance|Power Curve|Soiling/i.test(e.agent)))).forEach(e => {
    const L = r(6 + h01(demo.id + e.id + 'L') * 24, 1);
    actions.push({ id: 'ev-' + e.id, title: e.diagnosis?.reco ? e.diagnosis.reco.split(/(?<=\.)\s/)[0] : e.title, where: e.asset, lakhYr: L, basis: 'est.', kpi: null, owner: e.agent, next: 'Open the alert and raise a work order', status: 'open', link: 'messages/' + demo.id + '-' + e.id });
  });
  if (mode === 'consumer') {
    if (idleLakh > 0.5) actions.push({ id: 'idle', title: `Cut idle and night base load by ${fmt(idleSaveKw, 0)} kW (switch-off SOP, auto-stop on idle compressors and HVAC setback)`, where: 'Site', lakhYr: idleLakh, basis: 'calc.', owner, next: 'Issue weekend and night switch-off checklist', status: 'open' });
    if (shaveKva > 0) actions.push({ id: 'md', title: `Shave peak demand by ${fmt(shaveKva, 0)} kVA to 90 % of contract (stagger furnace and compressor starts, demand controller alarm)`, where: 'Main incomer', lakhYr: (shaveKva * tf.demand * 12) / LAKH + mdPenaltyLakh * (yr > 1 ? 1 : 0), basis: 'calc.', owner, next: 'Set demand controller alarm at 90 % of contract', status: 'open' });
    if (todShiftLakh > 0.5) actions.push({ id: 'tod', title: 'Move 10 % of peak-slot energy to off-peak (batch furnaces, chiller pre-cooling, water pumping)', where: 'Site', lakhYr: todShiftLakh, basis: 'calc.', owner, next: 'Agree shifted schedule with production planning', status: 'open' });
    if (pfInfo.lakhYr > 0.5) actions.push({ id: 'pf', title: `Raise power factor ${fmt(pfInfo.value, 3)} → 0.99 to reach the incentive slab (APFC target and dead steps)`, where: 'APFC panels', lakhYr: pfInfo.lakhYr, basis: 'calc.', owner, next: 'Check APFC steps and raise target PF', status: 'open' });
  }
  if (mode === 'aux') aux.consumers.filter(x => x.lakhYr > 1).slice(0, 3).forEach(x => actions.push({ id: 'c-' + x.asset, title: `${x.asset} ${x.name}: ${fmt(x.excessKw, 0)} kW above design duty`, where: x.asset, lakhYr: x.lakhYr, basis: 'calc.', owner, next: 'Check recirculation, damper and VFD position', status: 'open' }));
  if (mode === 'export' && exp.curtMWh > 0) actions.push({ id: 'curt', title: 'Reduce curtailment: turbine/inverter-wise stop and schedule revision with SLDC', where: 'Pooling substations', lakhYr: exp.curtLakh * yr * 0.3, basis: 'calc.', owner, next: 'Revise day-ahead schedule with the forecast', status: 'open' });
  const topWaste = [...areas].filter(a => a.util).sort((a, b) => b.wasteLakhYr - a.wasteLakhYr)[0];
  if (mode === 'consumer' && topWaste && topWaste.wasteLakhYr > 2) actions.push({ id: 'area', title: `${topWaste.name}: energy walk and sub-meter audit (avoidable ${Math.round(topWaste.waste * 100)} %)`, where: topWaste.name, lakhYr: topWaste.wasteLakhYr * 0.5, basis: 'est.', owner, next: 'Schedule energy walk this week', status: 'open' });
  actions.sort((a, b) => b.lakhYr - a.lakhYr);
  /* share of the KPI gap each action closes (consumer: SEC equivalent = SEC × kWh saved / annual kWh) */
  const siteLevel = mode === 'consumer' && /kwh/i.test(kp.unit) && ['sec', 'power'].includes(kp.id);
  const unitRe = new RegExp('([\\d.]+)\\s*' + kp.unit.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'), 'i');
  actions.forEach(a => {
    const sp = a.id.startsWith('sp-') ? (demo.setpoints || []).find(x => 'sp-' + x.asset + x.tag === a.id) : null;
    const stated = sp && sp.kpi === kp.id ? String(sp.gain).replace(/,/g, '').match(unitRe) : null;
    a.kpiEq = stated ? parseFloat(stated[1]) : siteLevel ? (ks.value * (a.lakhYr * LAKH / tf.rate)) / (annualKwh || 1) : null;
  });

  return {
    mode, tariff: tf, pf, unit, kpi: ks, gap, owner,
    hourly, daily, heat, kwh, avgKw, peakKva, peakAt, contract, pctContract: peakKva / contract, over90, over100, mdPenaltyLakh, shaveKva,
    idle: { idleKw, workKw, ratio: idleRatio, bench, lakhYr: idleLakh, saveKw: idleSaveKw },
    tod: todRows, todShiftLakh, costLakh, pfInfo, ren, areas, actions, exp, aux, yr, hours, annualKwh,
  };
}

const fmt = (v, d) => (v == null ? '—' : (+v).toLocaleString('en-IN', { maximumFractionDigits: d ?? (Math.abs(v) < 10 ? 2 : 1) }));

/* ========================================================================
   Setpoints: ₹ value of a recommendation
   ======================================================================== */
/** Parse the gain text of a setpoint into ₹ lakh per year. basis: stated | per event | from MWh | est. */
export function parseGain(text = '', demo, sp = {}) {
  const t = String(text).replace(/,/g, '');
  let m = t.match(/₹\s*([\d.]+)\s*(Cr|crore|L|lakh)?\s*(?:\/\s*(yr|year|month))?/i);
  if (m) {
    let v = parseFloat(m[1]); const u = (m[2] || 'L').toLowerCase(); if (u.startsWith('cr')) v *= 100;
    if (m[3] && /month/i.test(m[3])) return { lakh: v * 12, basis: 'stated' };
    if (m[3]) return { lakh: v, basis: 'stated' };
    return { lakh: v, basis: 'per event' };
  }
  m = t.match(/([\d.]+)\s*MWh\s*\/\s*yr/i);
  if (m) { const rate = tariffOf(demo).rate; return { lakh: (parseFloat(m[1]) * 1000 * rate) / LAKH, basis: 'from MWh' }; }
  const k = demo.kpis.find(x => x.id === sp.kpi);
  const base = k && k.lakh ? k.lakh : 40;
  return { lakh: r(base * (0.05 + h01(demo.id + sp.asset + sp.tag) * 0.08), 1), basis: 'est.' };
}

/** What the gain text says about the KPI, without the ₹ part. */
export const kpiEffect = text => String(text || '').replace(/(about\s+)?₹\s*[\d.,]+\s*(Cr|crore|L|lakh)?(\s*\/\s*(yr|year|month))?/gi, '')
  .split('·').map(x => x.replace(/[()]/g, '').replace(/^[\s,]+|[\s,]+$/g, '').replace(/\s{2,}/g, ' ').replace(/\s+(costs?|of)$/, '')).filter(Boolean).join(' · ');

/** Deterministic decision history for a recommendation (seed data); user decisions are added on top. */
export function setpointHistory(demo, sp, now) {
  const seed = demo.id + sp.asset + sp.tag;
  const created = now - (6 + Math.floor(h01(seed + 'c') * 60)) * H;
  const agent = (demo.agents || []).find(a => a.domain === 'process' || a.domain === 'energy')?.name || 'Process Agent';
  const out = [{ at: created, who: agent, what: `Proposed ${fmt(sp.current)} → ${fmt(sp.recommended)} ${sp.unit}`, tone: 'brand' }];
  const ownerName = demo.kpis.find(k => k.id === sp.kpi)?.owner || 'Process head';
  if (sp.status === 'approved' || sp.status === 'applied') out.push({ at: created + (2 + h01(seed + 'a') * 10) * H, who: ownerName, what: 'Approved · change request raised (P-02)', tone: 'good' });
  if (sp.status === 'applied') out.push({ at: created + (14 + h01(seed + 'p') * 20) * H, who: 'Shift in-charge', what: 'Applied in DCS / PLC by the operator', tone: 'good' });
  return out.filter(x => x.at < now);
}

/* ========================================================================
   Real-time: key tags, abnormal state and since-when
   ======================================================================== */
export const tagState = (def, v) => {
  if (!def || v == null) return 'good';
  if ((def.hi != null && v > def.hi) || (def.lo != null && def.lo !== 0 && v < def.lo)) return 'bad';
  const span = def.hi != null && def.lo != null ? Math.abs(def.hi - def.lo) : Math.abs(def.hi ?? def.lo ?? 0);
  if ((def.hi != null && v > def.hi - span * 0.06) || (def.lo != null && def.lo !== 0 && v < def.lo + span * 0.04)) return 'warn';
  return 'good';
};
export const hasLimit = def => def && ((def.hi != null) || (def.lo != null && def.lo !== 0));

/** Up to n key tags for an asset: the event tag first, then tags with limits. */
export function keyTags(db, demo, assetId, n = 3) {
  const a = db.assetById[assetId]; if (!a) return [];
  const ev = (demo.events || []).filter(e => e.asset === assetId).map(e => e.tag);
  const all = demo.classes[a.cls].tags.map(t => t[0]);
  const lim = all.filter(t => hasLimit(db.tagDef(assetId, t)));
  const list = [...new Set([...ev, ...lim])];
  return list.length ? list.slice(0, n) : all.slice(0, Math.min(2, n));
}

/** Hours the tag has been in its current non-normal state (walks back through the hourly history). */
export function abnormalSince(db, assetId, tag) {
  const s = db.series(assetId, tag); const def = db.tagDef(assetId, tag); if (!s) return null;
  const st = tagState(def, s[s.length - 1]); if (st === 'good') return null;
  let i = s.length - 1;
  while (i > 0 && tagState(def, s[i - 1]) !== 'good') i--;
  return db.tsHour(i);
}

/** Limit text for a tag. */
export const limitText = def => (def.hi != null && def.lo != null && def.lo !== 0 ? `${fmt(def.lo)}${def.lo < 0 || def.hi < 0 ? ' to ' : '–'}${fmt(def.hi)}` : def.hi != null ? `≤ ${fmt(def.hi)}` : def.lo != null && def.lo !== 0 ? `≥ ${fmt(def.lo)}` : 'no limit');

/** Generic first response when no diagnosis is linked. */
export function firstAction(def, v) {
  const hiSide = def.hi != null && v > (def.hi + (def.lo ?? def.hi)) / 2;
  const n = def.name.toLowerCase();
  if (/temp/.test(n)) return hiSide ? 'Check cooling / lubrication and reduce load; inspect on next round' : 'Check heater and controller output';
  if (/vib/.test(n)) return 'Take a vibration spectrum; check alignment and bearing condition';
  if (/press|draft|dp|vacuum/.test(n)) return 'Check valve / damper position and for blockage or leakage';
  if (/flow/.test(n)) return hiSide ? 'Check for passing valve or leak' : 'Check pump, strainer and valve line-up';
  if (/pf|power factor/.test(n)) return 'Check APFC steps and capacitor bank';
  if (/power|kw|current|load/.test(n)) return hiSide ? 'Check for overload; shed non-critical load' : 'Check that the drive is running';
  return hiSide ? 'Bring back under the high limit per SOP' : 'Bring back over the low limit per SOP';
}
