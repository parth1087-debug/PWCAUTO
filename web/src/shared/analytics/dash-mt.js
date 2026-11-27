/* Maintenance and reliability analytics for the Maintenance, Asset twin and RCA boards (owner: dash-mt).
   Pure functions over a demo database (`db` from engine.js). Where the plant model has no maintenance records
   (work orders, PM plan, spares, downtime causes), they are generated here: deterministic per demo id and asset
   (seeded with hash()), shaped to the plant's own maintenance KPIs (MTBF / MTTR where the demo has them) and
   improving after go-live like the rest of the demo data. Money is in ₹ lakh. */
import { hash, rng } from '../engine.js';

const H = 3600e3, D = 24 * H;
const CRIT_LOSS = { A: 1, B: 0.3, C: 0.08 };      // share of the asset class's downtime cost
const CRIT_MTBF = { A: 1, B: 1.7, C: 2.6 };       // B and C assets fail less often (or matter less when they do)
const CRIT_PM = { A: 14, B: 28, C: 56 };          // PM interval, days

/* ---------- per-plant maintenance profile (industry-realistic, ₹ lakh per hour = contribution lost) ---------- */
const P = {
  auto: { majorL: 3, failMult: 3.5, lossPerH: 0.45, mtbf: [104, 142], mttr: [3.4, 2.4], pm: [78, 92, 95], repairL: 0.6, crew: 6, pmMult: 1,
    window: { name: 'Sunday maintenance shift (plant weekly off)', dow: 0, hours: 10 },
    causes: [['Bearing failure', 5], ['Hydraulic leak', 3], ['Electrical or sensor fault', 4], ['Tooling breakage', 3], ['Lubrication', 2], ['Coolant and pneumatics', 2]] },
  cement: { majorL: 25, failMult: 3.5, lossPerH: 2.4, mtbf: [410, 620], mttr: [5.6, 4.2], pm: [74, 90, 95], repairL: 1.8, crew: 9, pmMult: 1,
    window: { name: 'Planned kiln stop (refractory and cyclone checks)', inDays: 9, hours: 72 },
    causes: [['Bearing and lubrication', 5], ['Cyclone jam and build-up', 4], ['Refractory', 2], ['Belt and conveyor', 3], ['Electrical drive trip', 3], ['Hydraulics', 2]] },
  steel: { majorL: 15, failMult: 3.5, lossPerH: 2.6, mtbf: [180, 260], mttr: [3.2, 2.3], pm: [72, 88, 93], repairL: 1.2, crew: 10, pmMult: 1,
    window: { name: 'Sunday roll change and mill maintenance', dow: 0, hours: 8 },
    causes: [['Gearbox and coupling', 4], ['Roll and guide failure', 4], ['Hydraulic leak', 3], ['Electrical drive trip', 3], ['Cooling water', 2], ['Burner and refractory', 2]] },
  'pharma-api': { majorL: 8, failMult: 3.5, lossPerH: 1.9, mtbf: [520, 700], mttr: [6.0, 4.5], pm: [85, 96, 98], repairL: 0.8, crew: 6, pmMult: 1,
    window: { name: 'Weekend stop (solvent recovery and Block B changeover)', dow: 0, hours: 24 },
    causes: [['Mechanical seal', 5], ['Agitator and gearbox', 3], ['Vacuum system', 3], ['Instrument or sensor', 3], ['Utility interruption (steam, brine)', 2], ['Valve failure', 2]] },
  'pharma-formulation': { majorL: 5, failMult: 3.5, lossPerH: 1.4, mtbf: [260, 360], mttr: [2.8, 2.0], pm: [88, 97, 98], repairL: 0.5, crew: 5, pmMult: 1,
    window: { name: 'Sunday window (changeover and line clearance)', dow: 0, hours: 16 },
    causes: [['Punch and die wear', 4], ['Sealing and heater fault', 3], ['Sensor or vision fault', 3], ['Pneumatic leak', 2], ['Drive and motor', 2], ['HVAC and filters', 2]] },
  solar: { majorL: 6, failMult: 4, lossPerH: 0.35, cls: { ptr: 2.4, idt: 0.25, inverter: 0.09, strinv: 0.006, tracker: 0.02, wms: 0, sms: 0 }, mtbf: [1800, 2600], mttr: [6.0, 3.8], pm: [82, 94, 96], repairL: 0.4, crew: 8, pmMult: 2,
    window: { name: 'Night window, 19:00–06:00 (no generation loss)', inDays: 0, hours: 11 },
    causes: [['IGBT or power module', 3], ['Cooling fan', 3], ['Tracker motor or controller', 4], ['SCADA communication loss', 3], ['DC string or fuse fault', 4], ['Transformer and switchgear', 1]] },
  wind: { majorL: 90, failMult: 12, lossPerH: 0.03, cls: { wtg21: 0.024, wtg30: 0.034, ss150: 1.9, ss120: 1.5, ss100: 1.3, metmast: 0 }, mtbf: [610, 860], mttr: [14.2, 9.6], pm: [80, 93, 96], repairL: 1.5, crew: 6, pmMult: 3,
    window: { name: 'Low-wind window (forecast below 4 m/s)', inDays: 4, hours: 30 },
    causes: [['Pitch system', 4], ['Gearbox and bearings', 3], ['Converter', 3], ['Yaw system', 2], ['Generator', 2], ['Grid or substation trip', 2]] },
  pipes: { majorL: 4, failMult: 3.5, lossPerH: 0.55, mtbf: [96, 131], mttr: [3.0, 2.2], pm: [70, 86, 92], repairL: 0.35, crew: 7, pmMult: 1,
    window: { name: 'Sunday planned stop (die and screen changes)', dow: 0, hours: 12 },
    causes: [['Heater band or thermocouple', 4], ['Screw and barrel wear', 2], ['Gearbox and drive', 3], ['Vacuum pump', 3], ['Haul-off and cutter', 3], ['Hydraulics (moulding)', 2]] },
  ems: { majorL: 6, failMult: 3.5, lossPerH: 0.5, cls: { incomer: 6, busbar: 6, transformer: 2.5, coupler: 2 }, mtbf: [900, 1250], mttr: [3.0, 2.2], pm: [76, 90, 95], repairL: 0.4, crew: 7, pmMult: 1.5,
    window: { name: 'Sunday low-load window (campus at 30 % load)', dow: 0, hours: 8 },
    causes: [['Breaker or busbar joint', 3], ['Compressor valve or unloader', 3], ['Chiller fouling, low ΔT', 3], ['Steam trap failure', 3], ['VFD fault', 2], ['Pump seal or bearing', 3]] },
  power: { majorL: 30, failMult: 4, lossPerH: 1.0, mtbf: [900, 1300], mttr: [7.0, 5.0], pm: [80, 93, 96], repairL: 2.5, crew: 12, pmMult: 1,
    window: { name: 'Night load reduction to 60 MW (grid-approved)', inDays: 2, hours: 8 },
    causes: [['Boiler tube leak', 3], ['Coal mill (rollers, classifier)', 4], ['Fan bearing and vibration', 3], ['Feed pump and seals', 2], ['C&I fault', 3], ['Coal handling', 3]] },
};
/* majorL: ₹ lakh repair cost of a run-to-failure on a criticality-A asset; failMult: its downtime as a multiple of MTTR */
const DEF = { majorL: 5, failMult: 3.5, lossPerH: 1, mtbf: [300, 420], mttr: [4, 3], pm: [78, 90, 95], repairL: 0.8, crew: 6, pmMult: 1, window: { name: 'Next planned stop', inDays: 7, hours: 12 }, causes: [['Mechanical', 3], ['Electrical', 2], ['Instrumentation', 2], ['Process', 1]] };

export const profile = demo => P[demo.id] || DEF;
const kpi = (demo, id) => demo.kpis.find(k => k.id === id && k.group === 'maintenance');

/* ---------- money and number helpers ---------- */
export function inr(lakh, short) {
  if (lakh == null || Number.isNaN(lakh)) return '—';
  const a = Math.abs(lakh), s = lakh < 0 ? '−' : '';
  if (a >= 100) return `${s}₹${(a / 100).toLocaleString('en-IN', { maximumFractionDigits: a >= 1000 ? 1 : 2 })} Cr`;
  if (a >= 1) return `${s}₹${a.toLocaleString('en-IN', { maximumFractionDigits: a >= 10 ? 0 : 1 })} L`;
  const r = Math.round(a * 1e5);
  return short && r >= 1000 ? `${s}₹${Math.round(r / 1000)}k` : `${s}₹${r.toLocaleString('en-IN')}`;
}
const u01 = s => (hash(s) % 10000) / 10000;
const pick = (arr, u) => { const tot = arr.reduce((n, x) => n + x[1], 0); let x = u * tot; for (const a of arr) { x -= a[1]; if (x <= 0) return a[0]; } return arr[arr.length - 1][0]; };
const lerp = (a, b, f) => a + (b - a) * f;

/* ---------- asset economics ---------- */
export function lossPerH(db, a) {
  const p = profile(db.demo);
  if (p.cls && p.cls[a.cls] != null) return p.cls[a.cls] * (a.crit === 'C' ? 0.5 : 1);
  return p.lossPerH * (CRIT_LOSS[a.crit] || 0.3);
}
/** improvement factor 0 → 1 from go-live over 60 days */
const gl = (db, t) => Math.max(0, Math.min(1, (t - db.goLive) / (60 * D)));
function mtbfAt(db, t) {
  const p = profile(db.demo); const k = kpi(db.demo, 'mtbf');
  const [b, c] = k ? [k.base, k.cur] : p.mtbf; return lerp(b, c, gl(db, t));
}
function mttrAt(db, t) {
  const p = profile(db.demo); const k = kpi(db.demo, 'mttr');
  const [b, c] = k ? [k.base, k.cur] : p.mttr; return lerp(b, c, gl(db, t));
}
const pmAt = (db, t) => { const p = profile(db.demo); return lerp(p.pm[0], p.pm[1], gl(db, t)) / 100; };
export const targets = demo => {
  const p = profile(demo); const kb = kpi(demo, 'mtbf'), kr = kpi(demo, 'mttr');
  return { pm: p.pm[2], mtbf: kb ? kb.target : Math.round(p.mtbf[1] * 1.15), mttr: kr ? kr.target : +(p.mttr[1] * 0.85).toFixed(1), backlog: 3 };
};

/* ---------- next planned window ---------- */
export function nextWindow(db) {
  const w = profile(db.demo).window; let inDays = w.inDays;
  if (w.dow != null) { const d = new Date(db.anchor).getDay(); inDays = ((w.dow - d + 7) % 7) || 7; }
  const p = profile(db.demo);
  return { ...w, inDays, start: db.anchor + inDays * D, crewHours: w.hours * p.crew, crew: p.crew };
}

/* ---------- remaining life and failure probability ---------- */
export function healthOf(db, id) {
  const h = db.health(id); if (!h) return null;
  const rul = h.rulDays != null ? h.rulDays : Math.max(3, Math.round((h.health - 22) * 1.1));
  return { ...h, rulDays: rul };
}
/** probability of failure within `days`, RUL read as characteristic life (Weibull, shape 3) */
export const pFail = (rul, days) => (days <= 0 ? 0 : 1 - Math.exp(-Math.pow(days / Math.max(0.5, rul), 3)));

/* ---------- work-order history (generated, 6 months) ---------- */
const memo = new WeakMap();
const cached = (db, key, fn) => { let m = memo.get(db); if (!m) memo.set(db, (m = {})); return m[key] || (m[key] = fn()); };

export function workOrders(db) {
  return cached(db, 'wo', () => {
    const p = profile(db.demo); const t0 = db.anchor - 183 * D; const out = [];
    let seq = 4100700000 + (hash(db.demo.id) % 90000) * 10;
    for (const a of db.assets) {
      const r = rng(hash(db.demo.id + '|wo|' + a.id));
      const jit = 0.7 + 0.7 * u01(db.demo.id + a.cls);   // class-level reliability spread
      const lph = lossPerH(db, a);
      /* breakdowns (random phase so the first months are not empty) */
      let t = t0 - r() * mtbfAt(db, t0) * (CRIT_MTBF[a.crit] || 2) * jit * H;
      for (;;) {
        const mtbf = mtbfAt(db, t) * (CRIT_MTBF[a.crit] || 2) * jit;
        t += (0.5 + r()) * mtbf * H;   // spread around MTBF (less noisy than exponential, so monthly KPIs stay readable)
        if (t > db.anchor) break;
        const n = (r() + r() + r() - 1.5) * 0.9;
        const downH = Math.max(0.3, +(mttrAt(db, t) * Math.exp(n)).toFixed(1));
        const cause = pick(p.causes, (r() + u01(a.cls + 'c')) % 1);
        out.push({ asset: a.id, cls: a.cls, crit: a.crit, type: 'BD', title: `Breakdown · ${cause.toLowerCase()}`, cause, raised: t, due: t, done: t + downH * H, downH, labourH: +(downH * (1.5 + r())).toFixed(1),
          costL: +(p.repairL * (0.2 + r() * 0.8) * (a.crit === 'A' ? 1 : 0.5)).toFixed(2), lossL: +(downH * lph).toFixed(2) });
      }
      /* preventive maintenance */
      const iv = (CRIT_PM[a.crit] || 28) * p.pmMult * D; let due = t0 + r() * iv; let acc = r();
      while (due < db.anchor + 30 * D) {
        acc += pmAt(db, due) + (r() - 0.5) * 0.2; const ok = acc >= 1; if (ok) acc -= 1; const late = ok ? r() * 1.5 : 3 + r() * 14;
        const done = due + late * D;
        out.push({ asset: a.id, cls: a.cls, crit: a.crit, type: 'PM', title: 'Preventive maintenance · inspection, lubrication, checks', raised: due - 7 * D, due, done: done <= db.anchor ? done : null,
          labourH: +((a.crit === 'A' ? 4 : 2) * (0.7 + r() * 0.8)).toFixed(1), costL: +(p.repairL * 0.08 * (0.5 + r())).toFixed(2), onTime: ok });
        due += iv;
      }
      /* corrective work from inspections */
      t = t0 + r() * 10 * D;
      while (t < db.anchor) {
        const done = t + (3 + r() * lerp(50, 28, gl(db, t))) * D;   // backlog clears faster after go-live
        out.push({ asset: a.id, cls: a.cls, crit: a.crit, type: 'CM', title: 'Corrective · defect found on inspection', raised: t, due: t + 14 * D, done: done <= db.anchor ? done : null,
          labourH: +(4 + r() * 8).toFixed(1), costL: +(p.repairL * 0.25 * (0.4 + r())).toFixed(2) });
        t += (6 + r() * 10) * (CRIT_MTBF[a.crit] || 2) * D;
      }
      /* predictive catches after go-live: failures found early and fixed in a planned stop */
      const [mb, mc] = kpi(db.demo, 'mtbf') ? [kpi(db.demo, 'mtbf').base, kpi(db.demo, 'mtbf').cur] : p.mtbf;
      const rate = Math.max(0, 1 / mb - 1 / mc) * 0.7 / ((CRIT_MTBF[a.crit] || 2) * jit);
      t = db.goLive + 5 * D;
      for (;;) {
        t += -Math.log(1 - r() * 0.999) / Math.max(rate, 1e-9) * H;
        if (t > db.anchor) break;
        const avoidedH = +(mttrAt(db, t) * (2 + r() * 1.5)).toFixed(1);
        const cause = pick(p.causes, (r() + u01(a.cls + 'c')) % 1);
        const done = t + (1 + r() * 8) * D;
        out.push({ asset: a.id, cls: a.cls, crit: a.crit, type: 'PdM', title: `Predictive · ${cause.toLowerCase()} found early`, cause, raised: t, due: t + 7 * D, done: done <= db.anchor ? done : null,
          labourH: +(4 + r() * 6).toFixed(1), costL: +(p.repairL * (0.2 + r() * 0.4)).toFixed(2), avoidedH, avoidedL: +(avoidedH * lph + p.repairL * 0.8).toFixed(2) });
      }
    }
    out.sort((x, y) => x.raised - y.raised);
    out.forEach(w => { w.id = `WO ${String(seq += 7 + (hash(w.asset + w.raised) % 5)).replace(/(\d{4})(\d{4})$/, '$1 $2')}`; });
    return out;
  });
}

/* ---------- reliability KPIs over a period ---------- */
function stats(db, from, to) {
  const wo = workOrders(db); const p = profile(db.demo);
  const nA = db.assets.filter(a => a.crit === 'A').length || db.assets.length;
  const bd = wo.filter(w => w.type === 'BD' && w.raised >= from && w.raised < to);
  const bdA = bd.filter(w => w.crit === 'A' || nA === db.assets.length);
  // MTBF and MTTR need enough failures: use at least a 30-day window ending at `to`
  // and widen it (up to 90 days) until there are at least 12 failures on critical assets
  const isA = w => w.type === 'BD' && (w.crit === 'A' || nA === db.assets.length);
  let f30 = Math.min(from, to - 30 * D), bdA30 = wo.filter(w => isA(w) && w.raised >= f30 && w.raised < to);
  while (bdA30.length < 12 && to - f30 < 90 * D) { f30 -= 15 * D; bdA30 = wo.filter(w => isA(w) && w.raised >= f30 && w.raised < to); }
  const hrs = (to - f30) / H;
  const mtbf = bdA30.length ? (nA * hrs - bdA30.reduce((n, w) => n + w.downH, 0)) / bdA30.length : null;
  const mttr = bdA30.length ? bdA30.reduce((n, w) => n + w.downH, 0) / bdA30.length : null;
  const pmFrom = Math.min(from, to - 28 * D);   // PM compliance on at least 4 weeks of due PMs
  const pmDue = wo.filter(w => w.type === 'PM' && w.due >= pmFrom && w.due < Math.min(to, db.anchor));
  const pmOk = pmDue.filter(w => w.onTime && w.done != null);
  const open = wo.filter(w => w.raised <= to && (w.done == null || w.done > to) && (w.type !== 'PM' || w.due <= to));
  const backlogH = open.reduce((n, w) => n + w.labourH, 0);
  const pdm = wo.filter(w => w.type === 'PdM' && w.raised >= from && w.raised < to);
  return {
    pm: pmDue.length ? (pmOk.length / pmDue.length) * 100 : null, pmDue: pmDue.length, pmLate: pmDue.length - pmOk.length, pmDays: Math.round((to - pmFrom) / D),
    mtbf, mttr, relDays: Math.round((to - f30) / D), failuresA: bdA30.length,
    breakdowns: bd.length, bdPer30: bd.length / ((to - from) / (30 * D)), downH: bd.reduce((n, w) => n + w.downH, 0), lossL: bd.reduce((n, w) => n + w.lossL, 0),
    backlogH, backlogWk: backlogH / (p.crew * 45 * 0.4), openWO: open.length, overduePM: open.filter(w => w.type === 'PM' && w.due < to).length,
    pdm: pdm.length, avoidedH: pdm.reduce((n, w) => n + w.avoidedH, 0), avoidedL: pdm.reduce((n, w) => n + w.avoidedL, 0),
  };
}
export function reliability(db, from, to) {
  return cached(db, `rel|${from}|${to}`, () => ({ now: stats(db, from, to), prev: stats(db, from - (to - from), from), base: stats(db, db.anchor - 183 * D, db.goLive) }));
}
/** weekly series ending at `to` (at least `minWeeks` weeks so a trend is visible) */
export function weekly(db, from, to, minWeeks = 12) {
  return cached(db, `wk|${from}|${to}|${minWeeks}`, () => {
    const n = Math.max(minWeeks, Math.ceil((to - from) / (7 * D))); const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const e = to - i * 7 * D, s = e - 7 * D; const st = stats(db, s, e);
      out.push({ t: s, pm: st.pm != null ? +st.pm.toFixed(1) : null, mtbf: st.mtbf != null ? Math.round(st.mtbf) : null, mttr: st.mttr != null ? +st.mttr.toFixed(1) : null,
        breakdowns: st.breakdowns, downH: +st.downH.toFixed(1), backlog: +st.backlogWk.toFixed(1), avoidedL: +st.avoidedL.toFixed(1), inPeriod: s >= from - 3 * D });
    }
    return out;
  });
}

/** downtime by cause (Pareto) in a period */
export function causes(db, from, to) {
  const m = {};
  workOrders(db).filter(w => w.type === 'BD' && w.raised >= from && w.raised < to).forEach(w => {
    const x = (m[w.cause] = m[w.cause] || { cause: w.cause, n: 0, h: 0, lossL: 0 }); x.n++; x.h += w.downH; x.lossL += w.lossL;
  });
  const list = Object.values(m).sort((a, b) => b.h - a.h); const tot = list.reduce((n, x) => n + x.h, 0); let cum = 0;
  return list.map(x => ({ ...x, h: +x.h.toFixed(1), lossL: +x.lossL.toFixed(2), cum: tot ? Math.round(((cum += x.h) / tot) * 100) : 0 }));
}

/** MTBF / MTTR by asset class (window of at least 90 days so classes have failures) */
export function byClass(db, from, to) {
  const f = Math.min(from, to - 90 * D); const hrs = (to - f) / H; const wo = workOrders(db); const rows = {};
  db.assets.forEach(a => { const r = (rows[a.cls] = rows[a.cls] || { cls: a.cls, label: db.demo.classes[a.cls].label, assets: 0, crit: a.crit, f: 0, h: 0, lossL: 0 }); r.assets++; if (a.crit < r.crit) r.crit = a.crit; });
  wo.filter(w => w.type === 'BD' && w.raised >= f && w.raised < to).forEach(w => { const r = rows[w.cls]; r.f++; r.h += w.downH; r.lossL += w.lossL; });
  return Object.values(rows).map(r => ({ ...r, days: Math.round((to - f) / D), mtbf: r.f ? Math.round((r.assets * hrs - r.h) / r.f) : null, mttr: r.f ? +(r.h / r.f).toFixed(1) : null,
    avail: +(100 * (1 - r.h / (r.assets * hrs))).toFixed(2), h: +r.h.toFixed(1), lossL: +r.lossL.toFixed(2) })).sort((a, b) => b.lossL - a.lossL || b.h - a.h);
}

/** bad actors: assets with the most breakdown downtime in the period */
export function badActors(db, from, to, n = 6) {
  const m = {};
  workOrders(db).filter(w => w.type === 'BD' && w.raised >= from && w.raised < to).forEach(w => {
    const x = (m[w.asset] = m[w.asset] || { asset: w.asset, n: 0, h: 0, lossL: 0, causes: {} }); x.n++; x.h += w.downH; x.lossL += w.lossL; x.causes[w.cause] = (x.causes[w.cause] || 0) + w.downH;
  });
  return Object.values(m).map(x => ({ ...x, name: db.assetById[x.asset].name, h: +x.h.toFixed(1), lossL: +x.lossL.toFixed(2), top: Object.entries(x.causes).sort((a, b) => b[1] - a[1])[0][0] }))
    .sort((a, b) => b.lossL - a.lossL).slice(0, n);
}

/* ---------- spares ---------- */
const SPARE_RULES = [[/igbt|power module/i, 'IGBT power module'], [/fan/i, 'Cooling fan assembly'], [/bearing/i, 'Bearing set (OEM)'], [/lube|lubric|oil/i, 'Lube pump filter and oil cooler kit'], [/refractor|coating|shell/i, 'Refractory bricks and castable'],
  [/seal/i, 'Mechanical seal kit'], [/gear/i, 'Gearbox bearing and seal kit'], [/pitch/i, 'Pitch motor and encoder'], [/yaw/i, 'Yaw drive pinion and brake pads'], [/tracker|stow/i, 'Tracker controller card'], [/winding|transformer|xfmr/i, 'Bushing and gasket set'],
  [/filter|dp\b|differential/i, 'Filter element set'], [/heater|zone|barrel/i, 'Heater band and thermocouple set'], [/vacuum|impeller/i, 'Vacuum pump impeller and seal kit'], [/joint|busbar|breaker/i, 'Busbar joint kit (bolts, washers, compound)'],
  [/trap/i, 'Steam trap internals'], [/quench|nozzle|spray/i, 'Spray nozzle set'], [/punch|die|weight/i, 'Punch and die set'], [/condenser|back.?pressure|tube/i, 'Condenser tube plugs and cleaning balls'], [/belt/i, 'Drive belt set'], [/cyclone|draft|build/i, 'Air blaster valve kit']];
export function spareFor(db, assetId, text) {
  const name = (SPARE_RULES.find(([re]) => re.test(text || '')) || [0, 'Spares kit as per BOM'])[1];
  const u = u01(db.demo.id + assetId + name);
  const status = u < 0.58 ? 'stock' : u < 0.86 ? 'order' : 'none';
  const eta = status === 'order' ? 2 + Math.round(u01(assetId + 'eta') * 9) : status === 'none' ? 15 + Math.round(u01(assetId + 'lt') * 25) : 0;
  return { name, status, eta, code: `MM ${600000 + (hash(name + db.demo.id) % 99999)}`, qty: 1 + (hash(assetId + name) % 2) };
}

/* ---------- failure forecast and risk ---------- */
export function forecast(db) {
  return cached(db, 'fc', () => {
    const p = profile(db.demo); const win = nextWindow(db);
    return db.assets.map(a => {
      const h = healthOf(db, a.id); const ev = (db.demo.events || []).find(e => e.asset === a.id && e.diagnosis);
      // an unplanned run-to-failure costs the lost production for a long repair plus a major repair (secondary damage, crane, express spares)
      const lph = lossPerH(db, a); const failH = mttrAt(db, db.anchor) * p.failMult;
      const consL = (failH * lph + p.majorL * (a.crit === 'A' ? 1 : a.crit === 'B' ? 0.4 : 0.15)) * (0.7 + 0.6 * u01(db.demo.id + a.cls + 'cons'));
      const p30 = pFail(h.rulDays, 30), pWin = pFail(h.rulDays, win.inDays || 0.5);
      const action = h.rulDays < Math.max(1, win.inDays) && (h.health < 75 || ev) ? 'now' : (h.health < 75 || p30 > 0.3 || ev) ? 'window' : 'monitor';
      return { ...h, asset: a, ev, lph, failH: +failH.toFixed(1), consL: +consL.toFixed(2), p30, pWin, riskL: +(p30 * consL).toFixed(2), failAt: db.anchor + h.rulDays * D, action };
    }).sort((x, y) => y.riskL - x.riskL || x.rulDays - y.rulDays);
  });
}

/* ---------- next-window job plan ---------- */
export function windowPlan(db) {
  return cached(db, 'plan', () => {
    const win = nextWindow(db); const p = profile(db.demo); const wo = workOrders(db);
    const fc = forecast(db).filter(f => f.action !== 'monitor');
    const jobs = fc.map(f => {
      const text = (f.ev ? f.ev.diagnosis.title + ' ' + f.ev.diagnosis.reco + ' ' + f.ev.tag : '') + ' ' + (f.finding || '');
      const hrs = Math.round((f.asset.crit === 'A' ? 8 : 5) * (0.6 + u01(f.id + 'jh')));
      const crew = 2 + (hash(f.id + 'crew') % 3);
      return { kind: 'pdm', asset: f.id, name: f.name, crit: f.crit, what: f.ev ? f.ev.diagnosis.reco.split(/(?<=\.)\s/)[0] : `Inspect and correct: ${f.finding || 'health below 75'}`,
        finding: f.finding, hours: hrs, crew, crewH: hrs * crew, costL: +(p.repairL * (0.4 + u01(f.id + 'jc')) * (f.crit === 'A' ? 1 : 0.5)).toFixed(2), spare: spareFor(db, f.id, text),
        riskL: f.riskL, pWin: f.pWin, rulDays: f.rulDays, urgent: f.action === 'now' };
    });
    // overdue PMs on critical assets also go into the window
    const od = wo.filter(w => w.type === 'PM' && w.done == null && w.due < db.anchor && w.crit === 'A').slice(-4).map(w => ({ kind: 'pm', asset: w.asset, name: db.assetById[w.asset].name, crit: w.crit,
      what: `Overdue PM (due ${Math.round((db.anchor - w.due) / D)} d ago)`, hours: Math.ceil(w.labourH / 2), crew: 2, crewH: Math.ceil(w.labourH / 2) * 2, costL: w.costL, spare: null, riskL: 0, wo: w.id }));
    const all = [...jobs.sort((a, b) => (b.urgent - a.urgent) || b.riskL - a.riskL), ...od];
    let used = 0;
    all.forEach(j => {
      const spareOk = !j.spare || j.spare.status === 'stock' || j.spare.eta <= win.inDays;
      if (j.urgent) j.fit = 'before'; else if (!spareOk) j.fit = 'spare'; else if (used + j.crewH <= win.crewHours) { j.fit = 'yes'; used += j.crewH; } else j.fit = 'next';
    });
    return { win, jobs: all, used, cap: win.crewHours };
  });
}

/* ---------- asset-level views (twin, RCA) ---------- */
export const assetWOs = (db, id) => workOrders(db).filter(w => w.asset === id);
export function assetReliability(db, id, days = 183) {
  const from = db.anchor - days * D; const ws = assetWOs(db, id).filter(w => w.raised >= from);
  const bd = ws.filter(w => w.type === 'BD'); const hrs = days * 24;
  const pm = ws.filter(w => w.type === 'PM' && w.due < db.anchor);
  return { breakdowns: bd.length, downH: +bd.reduce((n, w) => n + w.downH, 0).toFixed(1), lossL: +bd.reduce((n, w) => n + w.lossL, 0).toFixed(2),
    mtbf: bd.length ? Math.round((hrs - bd.reduce((n, w) => n + w.downH, 0)) / bd.length) : null, mttr: bd.length ? +(bd.reduce((n, w) => n + w.downH, 0) / bd.length).toFixed(1) : null,
    pm: pm.length ? Math.round((pm.filter(w => w.onTime && w.done).length / pm.length) * 100) : null, costL: +ws.reduce((n, w) => n + w.costL, 0).toFixed(2), avoidedL: +ws.filter(w => w.type === 'PdM').reduce((n, w) => n + w.avoidedL, 0).toFixed(2) };
}

/** daily health score history and projection to the end of remaining life */
export function healthTrend(db, id, days = 30) {
  const h = healthOf(db, id); const ev = (db.demo.events || []).find(e => e.asset === id && e.health != null);
  const r = rng(hash(db.demo.id + 'ht' + id)); const pts = [];
  const start = ev ? db.anchor - ev.startHoursAgo * H : null; const h0 = Math.min(97, Math.max(h.health + 18, 84));
  for (let i = days; i >= 0; i--) {
    const t = db.anchor - i * D; let v;
    if (!ev || t <= start) v = (ev ? h0 : h.health) + (r() - 0.5) * 3;
    else { const f = Math.min(1, (t - start) / (db.anchor - start || 1)); v = h0 + (h.health - h0) * Math.pow(f, ev.curve || 1.4); }
    pts.push({ t, health: Math.round(Math.max(0, Math.min(100, i === 0 ? h.health : v))) });
  }
  // projection: from now to the end of remaining life, health falls to the failure threshold (20)
  const pd = Math.min(h.rulDays, 60); const steps = Math.max(2, Math.min(12, pd));
  for (let i = 0; i <= steps; i++) {
    const t = db.anchor + (pd * i / steps) * D; const f = h.rulDays ? (pd * i / steps) / h.rulDays : 1;
    const v = h.health - (h.health - 20) * Math.pow(f, ev ? 1.2 : 3);
    const row = pts.find(x => x.t === t) || (pts.push({ t }), pts[pts.length - 1]); row.proj = Math.round(v);
  }
  return { points: pts, rulDays: h.rulDays, failAt: db.anchor + h.rulDays * D };
}

/** what changed on each tag: now vs the same hour 7 days ago (daily mean), with share of limit used */
export function tagChanges(db, id) {
  const a = db.assetById[id]; const tags = db.demo.classes[a.cls].tags.map(t => t[0]);
  return tags.map(tag => {
    const d = db.tagDef(id, tag); const s = db.series(id, tag); const n = s.length;
    const now = s.slice(n - 24).reduce((x, y) => x + y, 0) / 24; const was = s.slice(n - 24 * 8, n - 24 * 7).reduce((x, y) => x + y, 0) / 24;
    const delta = now - was; const scale = Math.max(Math.abs(d.base) * 0.02, d.noise * 2, 1e-6);
    const sig = Math.abs(delta) / scale; // multiples of normal movement
    return { tag, name: d.name, unit: d.unit, now, was, delta, pct: was ? (delta / Math.abs(was)) * 100 : null, sig, lo: d.lo, hi: d.hi };
  }).sort((x, y) => y.sig - x.sig);
}

/** RCA case facts for one anomaly: impact if not acted on, cost of the planned fix, status */
export function rcaCase(db, e, messages = []) {
  const f = forecast(db).find(x => x.id === e.asset); const win = nextWindow(db); const p = profile(db.demo);
  const pBefore = pFail(f.rulDays, Math.max(win.inDays, 1));
  const fixL = +(p.repairL * (0.4 + u01(e.asset + 'jc')) * (f.crit === 'A' ? 1 : 0.5)).toFixed(2);
  const spare = spareFor(db, e.asset, `${e.diagnosis?.title || ''} ${e.diagnosis?.reco || ''} ${e.tag}`);
  const appr = (db.demo.approvals || []).find(x => x.title.includes(e.asset));
  const raised = messages.find(m => m.title && m.title.includes('Approve work order') && m.title.includes(e.asset));
  const status = raised ? 'WO raised' : appr ? 'Awaiting approval' : e.minutesAgo < 15 ? 'New' : f.action === 'now' ? 'Action due now' : 'Diagnosed';
  // process anomalies (no health impact on the event: efficiency, quality drift) carry no failure exposure
  const process = e.health == null;
  const p30 = process ? 0 : f.p30;
  return { f, win, process, pBefore: process ? 0 : pBefore, p30, exposureH: +(f.failH * p30).toFixed(1), exposureL: +(f.consL * p30).toFixed(2), failH: f.failH, consL: f.consL, fixL, spare, status, appr };
}

/** major breakdowns in the period that would have had an RCA, with repeat counts (recurrence) */
export function closedRca(db, from, to, n = 6) {
  const wo = workOrders(db); const mttr = mttrAt(db, to);
  return wo.filter(w => w.type === 'BD' && w.raised >= from && w.raised < to && w.downH >= mttr * 1.6).sort((a, b) => b.lossL - a.lossL).slice(0, n).map(w => ({
    ...w, repeats: wo.filter(x => x.type === 'BD' && x.asset === w.asset && x.cause === w.cause && x.raised < w.raised && x.raised > w.raised - 120 * D).length,
    action: u01(w.id) < 0.7 ? 'Countermeasure done' : 'Countermeasure open' }));
}
