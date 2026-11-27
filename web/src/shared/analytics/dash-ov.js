/* Analytics for the Overview and KPI scorecard boards (dash-ov).
   Pure functions over a plant database (`db`) and its demo config. Nothing here changes stored data.
   Where the model has no number (₹ value of lost output, tariff, contribution margin), PLANT_ECON gives a
   fixed, per-plant assumption that is realistic for that industry and consistent with the plant's KPIs. */

const D = 864e5, H = 36e5;
const r = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Board profile per plant: decides which widgets make sense. */
export const PROFILE = {
  auto: 'discrete', pipes: 'discrete', 'pharma-formulation': 'discrete',
  cement: 'process', steel: 'process', 'pharma-api': 'process',
  solar: 'renewable', wind: 'renewable', ems: 'utility', power: 'power',
};
export const profileOf = demo => PROFILE[demo.id] || (demo.continuous ? 'process' : 'discrete');

/** Per-plant economics (demo assumptions, ₹).
    unitValue: ₹ of contribution lost per production unit not made (renewables: PPA tariff per MWh).
    loss: unit of demo.cost.losses (all quoted per 30 days) and ₹ lakh per loss unit.
    capacityMW: for PLF / CUF. */
export const PLANT_ECON = {
  auto: { unitValue: 18, loss: { unit: 'h', lakh: 0.375 }, lossBasis: '2,083 pcs/h × ₹18/pc contribution' },
  pipes: { unitValue: 25000, loss: { unit: 'h', lakh: 1.875 }, lossBasis: '7.5 t/h × ₹25,000/t contribution' },
  'pharma-formulation': { unitValue: 0.6, loss: { unit: 'h', lakh: 1.125 }, lossBasis: '1.9 lakh tablets/h × ₹0.60 contribution' },
  cement: { unitValue: 1200, loss: { unit: 'h', lakh: 3.6 }, lossBasis: '300 t/h × ₹1,200/t contribution' },
  steel: { unitValue: 4000, loss: { unit: 'h', lakh: 4.0 }, lossBasis: '100 t/h × ₹4,000/t contribution' },
  'pharma-api': { unitValue: 2500, loss: { unit: 'h', lakh: 0.44 }, lossBasis: '17.5 kg/h × ₹2,500/kg contribution' },
  solar: { unitValue: 2600, loss: { unit: 'MWh', lakh: 0.026 }, lossBasis: 'PPA tariff ₹2.60/kWh', capacityMW: 650 },
  wind: { unitValue: 3400, loss: { unit: 'MWh', lakh: 0.034 }, lossBasis: 'PPA tariff ₹3.40/kWh', capacityMW: 370 },
  ems: { unitValue: 0, loss: { unit: 'MWh', lakh: 0.0796 }, lossBasis: 'blended ₹7.96/kWh' },
  power: { unitValue: 1800, loss: { unit: '₹ L', lakh: 1 }, lossBasis: 'heat-rate gap × landed coal cost', capacityMW: 100 },
};
export const econOf = demo => PLANT_ECON[demo.id] || { unitValue: 0, loss: { unit: 'h', lakh: 0.5 }, lossBasis: 'estimate' };

/** ₹ lakh → short text: ₹4.3 L, ₹1.24 Cr */
export function fmtLakh(v, withSign) {
  if (v == null || Number.isNaN(v)) return '—';
  const s = withSign && v > 0 ? '+' : v < 0 ? '−' : '';
  const a = Math.abs(v);
  const t = a >= 100 ? `₹${(a / 100).toFixed(a >= 1000 ? 1 : 2)} Cr` : `₹${a >= 10 ? Math.round(a) : a.toFixed(1)} L`;
  return s + t;
}

/* ---------- KPI status, gap, value and movement ---------- */

const avgIn = (pts, f, t) => { const x = pts.filter(p => p.t >= f && p.t <= t); return x.length ? x.reduce((a, p) => a + p.v, 0) / x.length : null; };

/** Full status of one KPI over the period R = { from, to, days }. */
export function kpiStat(db, id, R) {
  const s = db.kpiSummary(id, R.from, R.to);
  const pts = db.kpiDaily(id);
  const up = s.better === 'up';
  const span = s.target - s.base || 1;
  const prog = (s.value - s.base) / span;                       // 0 = baseline, 1 = target, < 0 = worse than baseline
  const status = prog >= 0.999 ? 'On target' : prog >= 0.45 ? 'On track' : prog >= 0 ? 'At risk' : 'Off track';
  const gap = up ? s.target - s.value : s.value - s.target;      // > 0: still to go
  const len = R.to - R.from;
  const prevFrom = R.from - len;
  const prev = prevFrom >= pts[0].t ? avgIn(pts, prevFrom, R.from - 1) : null;
  const delta = prev == null ? null : s.value - prev;
  const deltaGood = delta == null ? null : (up ? delta > 0 : delta < 0);
  const deltaProg = delta == null ? null : delta / span;       // movement as a share of the baseline → target distance
  const curSpan = (s.cur - s.base) || span;
  const realised = s.lakh ? s.lakh * clamp((s.value - s.base) / curSpan, 0, 1.5) : 0;
  const potential = s.lakh ? s.lakh * Math.max(1, span / curSpan) : 0;
  return { ...s, prog, status, gap, gapMet: gap <= 0, prev, delta, deltaGood, deltaProg, realised: r(realised, 1), potential: r(potential, 1) };
}
export const kpiStats = (db, R) => db.demo.kpis.map(k => kpiStat(db, k.id, R));

export const STATUS_ORDER = ['Off track', 'At risk', 'On track', 'On target'];
export const statusTone = s => ({ 'On target': 'good', 'On track': 'info', 'At risk': 'warn', 'Off track': 'bad' }[s] || '');

/** Rolling mean (window in points) for a daily KPI series. */
export function rolling(pts, w = 7) {
  let sum = 0;
  return pts.map((p, i) => { sum += p.v; if (i >= w) sum -= pts[i - w].v; return { t: p.t, v: p.v, avg: i >= w - 1 ? r(sum / w, 3) : null }; });
}

/** Setpoint levers (recommendations) that act on a KPI. */
export const leversFor = (demo, id) => (demo.setpoints || []).filter(s => s.kpi === id);

/* ---------- output vs plan ---------- */

export function outputSummary(c, R) {
  const { db, demo, tools } = c;
  const e = econOf(demo);
  const p = tools.get_production({ from: new Date(R.from).toISOString(), to: new Date(R.to).toISOString() });
  const short = p.days.length < 3;
  const days = (short ? tools.get_production({ days: 7 }) : p).days.map(d => ({ t: new Date(d.t).getTime(), plan: d.plan, actual: d.actual }));
  const gap = p.actual - p.plan;
  const gapLakh = e.unitValue ? (gap * e.unitValue) / 1e5 : null;
  const below = days.filter(d => d.actual < d.plan * 0.95).length;
  /* month to date and run-rate forecast */
  const now = new Date(db.anchor);
  const m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const mtd = db.production(m0 + D, db.anchor).filter(x => x.t >= m0);
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const mA = mtd.reduce((a, x) => a + x.actual, 0), mP = mtd.reduce((a, x) => a + x.plan, 0);
  const left = Math.max(0, dim - mtd.length);
  const planDay = demo.production.planPerDay;
  const forecast = mtd.length ? mA + (mA / Math.max(1, mP)) * planDay * left : null;
  const monthPlan = mP + planDay * left;
  const hours = Math.max(24, p.days.length * 24);
  const plf = e.capacityMW ? (p.actual / (e.capacityMW * hours)) * 100 : null;
  return { unit: p.unit, plan: p.plan, actual: p.actual, pct: p.attainment_pct, gap, gapLakh, days, short, below,
    mtd: { actual: mA, plan: mP, days: mtd.length, forecast, monthPlan, pct: mP ? (mA / mP) * 100 : null, fcPct: monthPlan ? (forecast / monthPlan) * 100 : null }, plf };
}

/* ---------- losses in ₹ for the period ---------- */

export function lossPareto(demo, R) {
  const e = econOf(demo);
  const k = R.days / 30;
  const rows = (demo.cost.losses || []).map(([name, q]) => ({ name, qty: q * k, lakh: q * k * e.loss.lakh }));
  rows.sort((a, b) => b.lakh - a.lakh);
  const total = rows.reduce((a, x) => a + x.lakh, 0);
  let cum = 0;
  return { unit: e.loss.unit, basis: e.lossBasis, total, rows: rows.map(x => { cum += x.lakh; return { ...x, share: x.lakh / (total || 1), cum: cum / (total || 1) }; }) };
}

/* ---------- areas and sites ---------- */

/** Areas ranked worst first: alarm / watch counts, worst asset, its remaining life and finding. */
export function areaStatus(c, messages = []) {
  const { db, demo } = c;
  const health = db.healthAll();
  const titleOf = id => (demo.events || []).find(e => e.asset === id && e.title)?.title;
  return demo.areas.map(a => {
    const hs = health.filter(h => h.area === a.name);
    const low = hs[0];
    return { id: a.id, name: a.name, site: a.site?.name, n: hs.length, alarms: hs.filter(h => h.health < 50).length, watch: hs.filter(h => h.health >= 50 && h.health < 75).length,
      low, issue: low ? (titleOf(low.id) || (low.health < 75 ? low.finding : null)) : null };
  }).filter(a => a.n).sort((x, y) => (y.alarms - x.alarms) || (y.watch - x.watch) || ((x.low?.health ?? 100) - (y.low?.health ?? 100)));
}

const capOf = s => { const m = /([\d.]+)\s*MW/i.exec(s.name); return m ? +m[1] : 1; };

/** Multi-site renewables: export vs expected per site for the period, availability, PR or power-curve index, CUF, alarms. */
export function siteStatus(c, R) {
  const { db, demo } = c;
  const o = outputSummary(c, R);
  const cap = db.sites.map(capOf);
  const capT = cap.reduce((a, b) => a + b, 0);
  const health = db.healthAll();
  const hours = Math.max(24, o.days.length * 24);
  const rows = db.sites.map((s, i) => {
    const first = s.name.split(/[ ·]/)[0].toLowerCase();
    const lines = demo.cost.lines.filter(l => l[0].toLowerCase().startsWith(first));
    const avail = lines.length ? lines.reduce((a, l) => a + l[1], 0) / lines.length : 99;
    const perf = lines.length ? lines.reduce((a, l) => a + l[2], 0) / lines.length : 80;
    const worst = [...lines].sort((a, b) => a[1] * a[2] - b[1] * b[2])[0];
    const hs = health.filter(h => h.site === s.name);
    return { slug: s.slug, name: s.name.split(' · ')[0], cap: cap[i], share: cap[i] / capT, idx: avail * perf, avail, perf, topLoss: worst?.[4], worstBlock: worst?.[0],
      alarms: hs.filter(h => h.health < 50).length, watch: hs.filter(h => h.health >= 50 && h.health < 75).length, low: hs[0] };
  });
  const wIdx = rows.reduce((a, x) => a + x.share * x.idx, 0);
  const days = o.days;
  const planT = days.reduce((a, d) => a + d.plan, 0), actT = days.reduce((a, d) => a + d.actual, 0);
  return rows.map(x => {
    const expected = planT * x.share;
    const actual = actT * x.share * (x.idx / wIdx);
    return { ...x, expected, actual, pct: (actual / expected) * 100, gap: actual - expected, cuf: (actual / (x.cap * hours)) * 100 };
  }).sort((a, b) => a.pct - b.pct);
}

/* ---------- utilities (EMS): demand and energy ---------- */

export function demandSummary(c, R) {
  const { db, demo } = c;
  const [a, tag] = demo.energy.meter;
  const kvaS = db.series(a, tag), kwS = db.series(a, 'kw');
  const k = demo.energy.scale || 1;
  const n = kvaS.length;
  const fi = Math.max(0, Math.ceil(n - 1 - (db.anchor - R.from) / H));
  const hourly = R.days <= 2;
  const pts = []; let kwh = 0, peak = 0, peakT = null, dayMax = 0, dayKwh = 0, dayStart = fi;
  for (let i = fi; i < n; i++) {
    const v = kvaS[i] * k; const e = kwS ? kwS[i] * k : v * 0.97;
    kwh += e; if (v > peak) { peak = v; peakT = db.tsHour(i); }
    if (hourly) pts.push({ t: db.tsHour(i), v: Math.round(v) });
    else { dayMax = Math.max(dayMax, v); dayKwh += e; if ((i - fi) % 24 === 23 || i === n - 1) { pts.push({ t: db.tsHour(dayStart), v: Math.round(dayMax), mwh: r(dayKwh / 1000, 1) }); dayMax = 0; dayKwh = 0; dayStart = i + 1; } }
  }
  const cost = demo.kpis.find(x => x.id === 'cost' && x.unit === '₹/kWh') ? db.kpiSummary('cost', R.from, R.to).value : demo.cost.budget;
  const contract = demo.energy.contractKVA;
  return { pts, hourly, mwh: kwh / 1000, costLakh: (kwh * cost) / 1e5, rate: cost, peak: Math.round(peak), peakT, contract, peakPct: (peak / contract) * 100,
    over90: pts.filter(p => p.v > contract * 0.9).length };
}

/* ---------- decisions waiting ---------- */

const MONEY = /cost|amount|value|saving|₹/i;
export function decisions(messages) {
  const open = messages.filter(m => !m.state && (m.type === 'approval' || m.type === 'alert' || (m.type === 'insight' && m.sev === 'warn')));
  const rank = m => (m.type === 'approval' ? 0 : m.sev === 'bad' ? 1 : 2);
  return open.map(m => ({ ...m, money: (m.table || []).find(row => MONEY.test(row[0]) || /₹/.test(row[1]))?.[1] || (/₹[\d.,]+\s*(L|Cr|lakh)?/.exec(m.title) || [])[0] }))
    .sort((a, b) => rank(a) - rank(b) || b.time - a.time);
}
