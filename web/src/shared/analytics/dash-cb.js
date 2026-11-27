/* Analytics for the custom widget boards (components/boards/custom.jsx).
   Pure functions over a demo database (engine.js createDB) and its demo config.
   Nothing here changes stored data. Where the model has no number (₹ value of a lost hour,
   per-site performance) the values are fixed per plant and match its KPIs and cost model. */

export const D = 864e5;
const H = 36e5;
const r = (v, d = 1) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);

/* ---------- money ---------- */
/** ₹ in lakh -> "₹1.2 Cr" | "₹42 L" | "₹0.6 L" */
export function fmtINR(lakh) {
  if (lakh == null || !isFinite(lakh)) return '—';
  const a = Math.abs(lakh), s = lakh < 0 ? '−' : '';
  if (a >= 100) return `${s}₹${r(a / 100, a >= 1000 ? 0 : 1)} Cr`;
  if (a >= 10) return `${s}₹${Math.round(a)} L`;
  return `${s}₹${r(a, 1)} L`;
}
/** Parse a gain text such as "₹9 L/yr scrap", "₹1.9 Cr/yr", "₹6.5 L/month" into ₹ lakh per year. null when no ₹. */
export function parseGainLakh(text = '') {
  const m = String(text).match(/₹\s?([\d.,]+)\s?(Cr|L)\b(\s?\/\s?(yr|year|month))?/i);
  if (!m) return null;
  let v = parseFloat(m[1].replace(/,/g, '')) * (/cr/i.test(m[2]) ? 100 : 1);
  if (m[4] && /month/i.test(m[4])) v *= 12;
  else if (!m[3]) return null;                       /* a one-off amount (e.g. "₹42 L" per event) is not a yearly gain */
  return v;
}

/* ---------- losses: unit and ₹ value per plant ----------
   demo.cost.losses holds one number per loss. Its unit differs by industry; the ₹ rate is the
   contribution lost per unit (lakh). period 'month' means the number is a monthly total and is
   scaled to the selected period; 'rate' means a standing deviation valued per year. */
const LOSS_META = {
  auto: { unit: 'h', label: 'lost hours', period: 'month', inr: 0.3, basis: 'contribution margin of a line hour' },
  cement: { unit: 'h', label: 'lost hours', period: 'month', inr: 4.5, basis: 'clinker and cement margin per kiln or mill hour' },
  steel: { unit: 'h', label: 'lost hours', period: 'month', inr: 2.6, basis: 'rolling margin per mill hour' },
  'pharma-api': { unit: 'h', label: 'lost train hours', period: 'month', inr: 0.85, basis: 'API contribution per train hour' },
  'pharma-formulation': { unit: 'h', label: 'lost line hours', period: 'month', inr: 0.55, basis: 'contribution per packing-line hour' },
  pipes: { unit: 'h', label: 'lost line hours', period: 'month', inr: 0.22, basis: 'pipe contribution per extrusion-line hour' },
  solar: { unit: 'MWh', label: 'lost energy', period: 'month', inr: 0.028, basis: 'PPA tariff ₹2.80/kWh' },
  wind: { unit: 'MWh', label: 'lost energy', period: 'month', inr: 0.034, basis: 'PPA tariff ₹3.40/kWh', scaleToKpi: 'lostprod' },  /* split the lost-production KPI by cause */
  ems: { unit: '₹ k', label: 'avoidable energy cost', period: 'month', inr: 0.01, basis: 'billed energy cost' },
  power: { unit: 'kcal/kWh', label: 'heat rate deviation', period: 'rate', inr: 10.8, basis: '≈ ₹10.8 L/yr of coal per kcal/kWh at 92 % PLF' },
};
export const lossMeta = demo => LOSS_META[demo.id] || { unit: 'h', label: 'lost hours', period: 'month', inr: 0, basis: '' };

/** Losses for the period, ranked, with cumulative share and ₹. */
export function lossItems(demo, days = 30) {
  const m = lossMeta(demo);
  let k = m.period === 'month' ? days / 30 : 1;
  const kk = m.scaleToKpi && demo.kpis.find(x => x.id === m.scaleToKpi);
  const raw = (demo.cost?.losses || []).reduce((s, l) => s + l[1], 0);
  if (kk && raw) k *= kk.cur / raw;
  const items = (demo.cost?.losses || []).map(([name, v]) => {
    let value = v, label = name;
    if (m.period === 'rate') { const x = name.match(/≈\s?([\d.]+)/); value = x ? +x[1] : v; label = name.replace(/\s*\(.*\)\s*$/, ''); }
    else value = v * k;
    return { name: label, value: r(value, value < 10 ? 1 : 0), inr: m.inr ? value * m.inr : null };
  }).sort((a, b) => b.value - a.value);
  const total = items.reduce((s, x) => s + x.value, 0) || 1;
  let cum = 0;
  items.forEach(x => { cum += x.value; x.share = (x.value / total) * 100; x.cum = (cum / total) * 100; });
  return { unit: m.unit, label: m.label, basis: m.basis, perYear: m.period === 'rate', total, totalInr: items.reduce((s, x) => s + (x.inr || 0), 0), items };
}
/** Defects for the period (Pareto). */
export function defectItems(demo, days = 30) {
  const k = Math.max(0.2, days / 30);
  const items = (demo.quality?.defects || []).map(([name, v]) => ({ name, value: Math.max(0, Math.round(v * k)) })).sort((a, b) => b.value - a.value);
  const total = items.reduce((s, x) => s + x.value, 0) || 1; let cum = 0;
  items.forEach(x => { cum += x.value; x.share = (x.value / total) * 100; x.cum = (cum / total) * 100; });
  return { unit: '', label: 'count', total, items };
}

/* ---------- KPI view: value, target gap, ₹ at stake ---------- */
export function kpiView(db, id, from, to) {
  const k0 = db.demo.kpis.find(x => x.id === id); if (!k0) return null;
  const k = db.kpiSummary(id, from, to);
  const up = k.better === 'up';
  const gap = up ? k.target - k.value : k.value - k.target;          /* > 0: still short of target */
  const rate = k.lakh && Math.abs(k.cur - k.base) > 0 ? k.lakh / Math.abs(k.cur - k.base) : 0;  /* ₹ lakh/yr per unit of KPI */
  const atStake = gap > 0 && rate ? gap * rate : 0;
  const daily = db.kpiDaily(id);
  const inR = daily.filter(p => p.t >= from - D && p.t <= to);
  const half = Math.max(1, Math.floor(inR.length / 2));
  const a = inR.slice(0, half), b = inR.slice(half);
  const avg = xs => xs.reduce((s, p) => s + p.v, 0) / (xs.length || 1);
  const delta = b.length && a.length ? avg(b) - avg(a) : 0;
  const improving = up ? delta > 0 : delta < 0;
  const flat = Math.abs(delta) < Math.abs(k.target - k.base) * 0.03;
  return { ...k, gap, onTarget: gap <= 0, atStake, rate, trend: flat ? 'flat' : improving ? 'better' : 'worse', points: inR };
}

/* ---------- tag statistics over a period ---------- */
export const limitsOf = def => ({ hi: def.hi != null ? def.hi : null, lo: def.lo != null && def.lo !== 0 ? def.lo : null });
export function tagStats(db, asset, tag, from, to) {
  const def = db.tagDef(asset, tag); const s = db.series(asset, tag); if (!def || !s) return null;
  const n = s.length;
  const f = Math.max(0, Math.ceil(n - 1 - (db.anchor - from) / H)), e = Math.min(n - 1, Math.floor(n - 1 - (db.anchor - to) / H));
  const { hi, lo } = limitsOf(def);
  let sum = 0, mn = Infinity, mx = -Infinity, above = 0, below = 0, cnt = 0;
  for (let i = f; i <= e; i++) { const v = s[i]; sum += v; cnt++; mn = Math.min(mn, v); mx = Math.max(mx, v); if (hi != null && v > hi) above++; if (lo != null && v < lo) below++; }
  let l24 = 0, c24 = 0; for (let i = Math.max(f, e - 23); i <= e; i++) { l24 += s[i]; c24++; }
  return { def, hi, lo, latest: s[e], avg: sum / (cnt || 1), min: mn, max: mx, hoursAbove: above, hoursBelow: below, hoursOut: above + below, hours: cnt, last24: l24 / (c24 || 1) };
}
/** state of a value against limits: bad beyond a limit, warn within 8 % of hi / 4 % of lo. */
export function stateOfValue(def, v) {
  const { hi, lo } = limitsOf(def);
  if ((hi != null && v > hi) || (lo != null && v < lo)) return 'bad';
  if (hi != null && lo != null) { const m = (hi - lo) * 0.08; return v > hi - m || v < lo + m ? 'warn' : 'good'; }
  if ((hi != null && hi > 0 && v > hi * 0.92) || (lo != null && lo > 0 && v < lo * 1.04)) return 'warn';
  return 'good';
}

/* ---------- lines / blocks / feeders (cost.lines) ---------- */
export function lineRows(demo) {
  const rows = (demo.cost?.lines || []).map(([name, a, p, q, loss]) => ({ name, a, p, q, oee: r((a * p * q) / 10000, 1), loss }));
  const best = Math.max(...rows.map(x => x.oee));
  rows.forEach(x => { x.gap = r(best - x.oee, 1); });
  return rows.sort((x, y) => x.oee - y.oee);
}
export const isGeneration = demo => demo.production?.unit === 'MWh';

/* ---------- production vs plan ---------- */
export function productionView(db, from, to) {
  const days = db.production(from, to).filter(x => x.t >= from - D);
  const plan = days.reduce((s, x) => s + x.plan, 0), actual = days.reduce((s, x) => s + x.actual, 0);
  const worst = days.slice().sort((a, b) => a.actual / a.plan - b.actual / b.plan)[0];
  return { days, plan, actual, att: plan ? (actual / plan) * 100 : 0, short: plan - actual, worst, below: days.filter(x => x.actual < x.plan * 0.95).length };
}

/* ---------- multi-site comparison (portfolios) ----------
   Availability and performance per site are the averages of that site's blocks or feeders in
   cost.lines (matched by the site's first word). Energy share comes from energy.areas. */
export function siteRows(db, messages = []) {
  const demo = db.demo;
  if (db.sites.length < 2) return [];
  const plan = demo.production.planPerDay;
  return db.sites.map(st => {
    const word = st.name.split(/[\s·]/)[0].toLowerCase();
    const lines = (demo.cost?.lines || []).filter(l => l[0].toLowerCase().includes(word));
    const avg = i => (lines.length ? lines.reduce((s, l) => s + l[i], 0) / lines.length : null);
    const area = (demo.energy?.areas || []).find(a => a[0].toLowerCase().includes(word));
    const share = area ? area[1] : 100 / db.sites.length;
    const cap = (st.name.match(/([\d,.]+)\s?(MWp|MW)/) || [])[1];
    const assets = db.assets.filter(a => a.site.slug === st.slug);
    const ids = new Set(assets.map(a => a.id));
    const health = assets.map(a => db.health(a.id)).sort((a, b) => a.health - b.health);
    const exp = assets.find(a => demo.classes[a.cls].tags.some(t => t[0] === 'export_mw'));
    const alerts = messages.filter(m => m.type === 'alert' && ids.has(m.asset));
    return { slug: st.slug, name: st.name.split(' · ')[0], location: st.location, capacity: cap ? parseFloat(cap.replace(/,/g, '')) : null, capUnit: (st.name.match(/MWp|MW/) || [''])[0],
      share, planDay: (plan * share) / 100, avail: avg(1), perf: avg(2), worstLine: lines.slice().sort((a, b) => a[1] * a[2] - b[1] * b[2])[0],
      exportAsset: exp ? exp.id : null, worst: health[0], alarms: health.filter(h => h.state === 'Alarm').length, watch: health.filter(h => h.state === 'Watch').length,
      alerts: alerts.length, critical: alerts.filter(m => m.sev === 'bad').length };
  });
}

/* ---------- demand (manufacturing and utilities) ---------- */
export function demandView(tools, demo, days) {
  const e = tools.get_energy({ days: Math.max(1, days) });
  const pts = e.load_profile.map(p => ({ t: new Date(p.t).getTime(), v: p.kva }));
  const near = pts.filter(p => p.v > e.contract_kva * 0.9).length;
  return { ...e, pts, util: (e.peak_kva / e.contract_kva) * 100, near, step: e.load_profile_kind === 'hourly' ? 'h' : 'days' };
}

/* ---------- asset next action ---------- */
export function nextAction(demo, assetId) {
  const ev = (demo.events || []).find(e => e.asset === assetId && e.title);
  return ev ? (ev.diagnosis?.reco || ev.finding || ev.title) : null;
}
