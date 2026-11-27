/* ==========================================================================
   EMS supply & demand planning analytics (ems-plan).
   Pure functions over the demo database (db) for the Meridian EMS demo:
   - day-ahead / two-day hourly demand forecast from the metered history
     (same hour over the last 14 days, blended with the same weekday over 4 weeks)
   - rooftop solar forecast (clear-sky model × weather cloud cover × SOL-01 PR)
   - grid import, 15-min MD projection vs contract and the 90 % alert
   - ToD-aware load shifts, peak shaving actions, chiller / compressor staging
   - DG economics from DG SFC tags and a diesel price
   - steam plan: biomass (BLR-02) vs gas (BLR-01) cost per tonne from fuel tags,
     with the PNG take-or-pay floor
   - forecast back-test (MAPE) for yesterday and each day of the selected period
   Tariff, fuel prices and planned ERP loads below are demo planning inputs.
   ========================================================================== */
import { hash, rng as seeded, HOURS } from '../engine.js';

const H = 36e5, D = 864e5;
const r0 = v => Math.round(v);
const r1 = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/* ---------- planning inputs (demo) ---------- */
/** MSEDCL HT-I style ToD tariff (demo values). ₹/kWh energy charge plus ToD adder; demand charge ₹/kVA/month. */
export const TARIFF = {
  name: 'HT-I industrial · ToD (demo tariff)', energy: 7.6, demand: 600, excessMult: 1.5,
  slots: [
    { id: 'A', name: 'Off-peak', hours: '22:00–06:00', adder: -1.5 },
    { id: 'B', name: 'Normal', hours: '06:00–09:00, 12:00–18:00', adder: 0 },
    { id: 'C', name: 'Morning peak', hours: '09:00–12:00', adder: 0.8 },
    { id: 'D', name: 'Evening peak', hours: '18:00–22:00', adder: 1.1 },
  ],
};
export const slotOf = h => TARIFF.slots[h >= 22 || h < 6 ? 0 : h >= 9 && h < 12 ? 2 : h >= 18 && h < 22 ? 3 : 1];
export const rateAt = h => r1(TARIFF.energy + slotOf(h).adder, 2);
export const PRICES = {
  diesel: 90.5,          // ₹/L HSD, Pune
  dgOM: 1.8,             // ₹/kWh DG lube, wear and O&M
  png: 52,               // ₹/Sm³ industrial PNG
  briquette: 7200,       // ₹/t biomass briquettes (delivered)
  greenShare: 11.6,      // % of grid energy bought on the green tariff
  pngDCQ: 12000,         // Sm³/day daily contract quantity
  pngMinPct: 85,         // take-or-pay floor, % of DCQ
  bioMax: 9.0,           // t/h sustained BLR-02 (10 TPH MCR, 90 %)
  gasMin: 2.0,           // t/h BLR-01 minimum firing (turndown, swing duty)
};
export const CONTRACT = { kva: 8000, alertPct: 90 };
const PEAK15 = 1.025;    // 15-min block above the hourly mean (demand log)

/** ERP production plan additions not in the history shape (day offset from tomorrow, hours, kW). */
const ERP_ADDERS = [{ day: 0, from: 10, to: 17, kw: 300, name: 'Export order: 3 extra heat-treatment batches on the process block (MCC-01), 100 kW each', asset: 'MCC-01' }];

/* ---------- helpers over the db ---------- */
const cache = new WeakMap();
function memo(db, key, fn) {
  let m = cache.get(db); if (!m) cache.set(db, (m = new Map()));
  if (!m.has(key)) m.set(key, fn());
  return m.get(key);
}
const idxOf = (db, t) => HOURS - 1 + Math.round((t - db.anchor) / H);
const sOf = (db, a, t) => db.series(a, t) || new Float64Array(HOURS);
const avgLast = (db, a, t, hrs = 168) => { const s = sOf(db, a, t); let n = 0, sum = 0; for (let i = HOURS - hrs; i < HOURS; i++) { sum += s[i]; n++; } return sum / n; };

/** site demand (kW) = grid import + rooftop solar (DG sets are on standby and excluded) */
function demandArr(db) {
  return memo(db, 'demand', () => {
    const g = sOf(db, 'GRID-01', 'kw'), s = sOf(db, 'SOL-01', 'ac_kw');
    const out = new Float64Array(HOURS);
    for (let i = 0; i < HOURS; i++) out[i] = g[i] + Math.max(0, s[i]);
    return out;
  });
}

/** Forecast at hour index idx with data up to index cut: 50 % last 14 days same hour + 50 % same weekday (4 weeks). */
function profileAt(arr, idx, cut) {
  const recent = [], same = [];
  for (let k = 1; k <= 35 && (recent.length < 14 || same.length < 4); k++) {
    const j = idx - 24 * k; if (j > cut) continue; if (j < 0) break;
    if (recent.length < 14) recent.push(arr[j]);
    if (k % 7 === 0 && same.length < 4) same.push(arr[j]);
  }
  const m = mean(recent), w = same.length ? mean(same) : m;
  const sd = Math.sqrt(mean(recent.map(x => (x - m) ** 2)));
  return { v: 0.5 * m + 0.5 * w, sd };
}

/* ---------- weather and solar ---------- */
const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
export function weatherFor(demo, t) {
  const r = seeded(hash(demo.id + 'wx' + dayKey(t)));
  const cloud = Math.round(4 + r() * 42);
  return { cloud, sky: cloud < 15 ? 'Clear' : cloud < 32 ? 'Partly cloudy' : 'Mostly cloudy', tmax: r1(28.5 + r() * 3.5), tmin: r1(12.5 + r() * 3.5), wetBulb: r1(17 + r() * 3), rain: cloud > 38 ? Math.round(r() * 20) : 0 };
}
/** Rooftop 1 MWp AC output (kW) for an hour starting at h, late-November Pune sun (06:45–17:57). */
export function solarKw(h, cloud, pr) {
  let sum = 0;
  for (let q = 0; q < 4; q++) {
    const x = h + (q + 0.5) / 4, rise = 6.75, set = 17.95;
    if (x > rise && x < set) sum += 1000 * 0.93 * (pr / 100) * Math.pow(Math.sin(Math.PI * (x - rise) / (set - rise)), 1.25) * (1 - 0.72 * cloud / 100);
  }
  return sum / 4;
}

/* ---------- the plan ---------- */
export function supplyPlan(db) {
  return memo(db, 'plan', () => {
    const demo = db.demo;
    const dem = demandArr(db);
    const start = (() => { const d = new Date(db.anchor); d.setHours(24, 0, 0, 0); return d.getTime(); })();
    const i0 = idxOf(db, start);
    const pf = avgLast(db, 'GRID-01', 'pf');
    const pr = avgLast(db, 'SOL-01', 'pr');
    const wx = [weatherFor(demo, start), weatherFor(demo, start + D)];

    /* utility forecasts (same method) */
    const fcTag = (a, t) => { const s = sOf(db, a, t); return k => profileAt(s, i0 + k, HOURS - 1).v; };
    const trF = [fcTag('CH-01', 'tr'), fcTag('CH-02', 'tr')], chKwF = [fcTag('CH-01', 'kw'), fcTag('CH-02', 'kw')];
    const airF = fcTag('AR-01', 'flow'), steamF = fcTag('SH-01', 'total_flow'), tfhF = fcTag('TFH-01', 'gas_flow');
    const kwtr = { 'CH-01': db.latest('CH-01', 'kw_tr'), 'CH-02': db.latest('CH-02', 'kw_tr'), 'CH-03': Math.min(0.66, db.latest('CH-03', 'kw_tr')) };
    const compKw = db.latest('AC-01', 'kw') + db.latest('AC-02', 'kw') + db.latest('AC-03', 'kw');

    const hours = [];
    for (let k = 0; k < 48; k++) {
      const t = start + k * H, h = new Date(t).getHours(), day = k < 24 ? 0 : 1;
      const p = profileAt(dem, i0 + k, HOURS - 1);
      const add = ERP_ADDERS.filter(a => a.day === day && h >= a.from && h < a.to).reduce((s, a) => s + a.kw, 0);
      const demand = p.v + add;
      const band = p.sd * 1.28 * (1 + 0.2 * day);
      const solar = solarKw(h, wx[day].cloud, pr);
      const grid = Math.max(0, demand - solar);
      const tr = trF[0](k) + trF[1](k);
      const air = airF(k);
      hours.push({ k, t, h, day, slot: slotOf(h).id, rate: rateAt(h), adder: add, demand, lo: demand - band, hi: demand + band, solar, grid,
        kva: grid / pf, kva15: (grid / pf) * PEAK15, tr, air, steam: steamF(k), tfhGas: tfhF(k), chKw: chKwF[0](k) + chKwF[1](k) });
    }

    /* ---- chiller staging: CH-01 + CH-03 lead (screw, clean), CH-02 lag only above 92 % of 800 TR ---- */
    const lead = 800 * 0.92;
    hours.forEach(x => {
      const lag = Math.max(0, x.tr - lead);
      x.chillers = lag > 0 ? ['CH-01', 'CH-03', 'CH-02'] : ['CH-01', 'CH-03'];
      x.ch02tr = lag;
      /* today's practice: CH-01 + CH-02 share the load ~45/55 */
      const base = x.tr * 0.45 * kwtr['CH-01'] + x.tr * 0.55 * kwtr['CH-02'];
      const planned = Math.min(x.tr, lead) / 2 * (kwtr['CH-01'] + kwtr['CH-03']) + lag * kwtr['CH-02'];
      x.chSave = Math.max(0, base - planned);
    });
    /* ---- compressor staging: VSD AC-03 trims 6–21 m³/min, fixed units base-load 24 m³/min each ---- */
    hours.forEach(x => {
      const fixed = Math.max(0, Math.ceil((x.air - 21) / 24));
      x.comps = ['AC-01', 'AC-02', 'AC-04'].slice(0, fixed).concat('AC-03');
      x.vsdPct = Math.round(Math.max(30, Math.min(100, ((x.air - fixed * 24) / 21) * 100)));
    });

    /* ---- load shifts (ToD energy) and peak shaving (MD) actions ---- */
    const roKw = Math.max(20, db.latest('RO-01', 'kw'));
    const chAvg = mean(hours.slice(10, 13).map(x => x.chKw));
    const shifts = [
      { id: 's1', short: 'RO-01 permeate', name: 'RO-01 permeate production', asset: 'RO-01', kw: r0(roKw), from: [18, 22], to: [22, 2], owner: 'Utilities manager', note: 'Treated-water tanks hold 9 h; refill off-peak.' },
      { id: 's2', short: 'Batch mill B-2', name: 'Raw-material batch mill B-2 (MCC-01)', asset: 'MCC-01', kw: 220, from: [18, 21], to: [23, 2], owner: 'Process block planner', note: 'Mill feeds next-day stock; 2 bins of buffer.' },
      { id: 's3', short: 'Forklift charging', name: 'Forklift and AGV battery charging', asset: 'MCC-01', kw: 60, from: [18, 22], to: [22, 2], owner: 'Stores in-charge', note: 'Opportunity charging only at lunch break.' },
      { id: 's4', short: 'ETP filter press', name: 'ETP-01 filter press and sludge dewatering', asset: 'ETP-01', kw: 18, from: [9, 12], to: [22, 1], owner: 'Utilities manager', note: 'Sludge sump holds one day.' },
    ].map(s => {
      const hrs = (s.from[1] - s.from[0] + 24) % 24, kwh = s.kw * hrs;
      const gain = rateAt(s.from[0]) - rateAt(s.to[0]);
      return { ...s, hrs, kwh, gain: r1(gain, 2), inr: r0(kwh * gain) };
    });
    /* pre-cooling: over-cool the loop and building 07–09 (CHWS 6.0 °C), reset CHWS to 8 °C 10–13 (≈3 %/°C) */
    const preCool = { kwUp: r0(chAvg * 0.03), kwDown: r0(chAvg * 0.03) };

    const day1 = hours.slice(0, 24);
    const peakHr = day1.reduce((a, b) => (b.kva15 > a.kva15 ? b : a));
    const ph = peakHr.h;
    const peakActions = [
      { id: 'p1', short: 'Batch 3 to night shift', name: 'Run export batch 3 of 3 on C shift (22:00–05:00, off-peak)', asset: 'MCC-01', kva: ph >= 10 && ph < 17 ? r0(100 / pf) : 0, hours: [10, 17], owner: 'Process block planner', cost: `Same output · saves ₹${fmt(700 * (rateAt(12) - rateAt(23)))} on ToD` },
      { id: 'p2', short: 'Stagger batch starts', name: 'Stagger the other 2 batch starts 40 min apart', asset: 'MCC-01', kva: ph >= 10 && ph < 13 ? 60 : 0, hours: [10, 13], owner: 'Process block planner', cost: 'No cost' },
      { id: 'p3', short: 'CH-02 to lag', name: 'Run CH-02 as lag chiller; CH-01 + CH-03 lead', asset: 'CH-02', kva: r0(peakHr.chSave / pf), hours: [0, 24], owner: 'HVAC in-charge', cost: `Saves ${fmt(mean(day1.map(x => x.chSave)))} kW all day` },
      { id: 'p4', short: 'Pre-cool, CHWS reset', name: 'Pre-cool 07–09 h at CHWS 6.0 °C, reset CHWS to 8.0 °C 10–13 h', asset: 'CH-01', kva: ph >= 10 && ph < 13 ? r0(preCool.kwDown / pf) : 0, hours: [7, 13], owner: 'HVAC in-charge', cost: 'Net energy ≈ 0' },
      { id: 'p5', short: 'Hold RO-01', name: 'Hold RO-01 off 10–14 h (tank buffer), refill off-peak', asset: 'RO-01', kva: ph >= 10 && ph < 14 ? r0(roKw / pf) : 0, hours: [10, 14], owner: 'Utilities manager', cost: 'No cost' },
      { id: 'p6', short: 'Air at 6.4 bar', name: 'Air header setpoint 6.9 → 6.4 bar (AR-01)', asset: 'AR-01', kva: r0(compKw * 0.035 / pf), hours: [0, 24], owner: 'Utilities manager', cost: '−3.5 % compressor kWh' },
    ];
    /* apply actions and shifts to the hourly plan (tomorrow; the night batch runs into day 2) */
    const inR = (h, [a, b]) => (a < b ? h >= a && h < b : h >= a || h < b);
    hours.forEach(x => {
      let d = 0;
      if (x.k >= 22 && x.k < 29) d += 100; /* batch 3 on C shift */
      if (x.day === 0) {
        d -= x.chSave + compKw * 0.035;
        if (x.adder) d -= 100;
        if (x.h >= 10 && x.h < 13) d -= (x.adder ? 60 : 0) + preCool.kwDown;
        if (x.h >= 7 && x.h < 9) d += preCool.kwUp;
        if (x.h >= 10 && x.h < 14) d -= roKw;
        shifts.forEach(s => { if (inR(x.h, s.from)) d -= s.kw; if (inR(x.h, s.to)) d += s.kw; });
      }
      x.gridPlan = Math.max(0, x.grid + d);
      x.kvaPlan = x.gridPlan / pf; x.kva15Plan = x.kvaPlan * PEAK15;
    });
    const peakPlanHr = day1.reduce((a, b) => (b.kva15Plan > a.kva15Plan ? b : a));

    /* ---- MD month to date ---- */
    const ms = (() => { const d = new Date(db.anchor); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    const kvaS = sOf(db, 'GRID-01', 'kva'); let mdMTD = 0;
    for (let i = Math.max(0, idxOf(db, ms)); i < HOURS; i++) mdMTD = Math.max(mdMTD, kvaS[i]);
    const newMonth = new Date(start).getDate() === 1;
    const mdBase = newMonth ? 0.75 * CONTRACT.kva : mdMTD; /* billing demand floor is 75 % of contract */
    const mdRisk = kva => Math.max(0, kva - mdBase) * TARIFF.demand + Math.max(0, kva - CONTRACT.kva) * TARIFF.demand * (TARIFF.excessMult - 1);

    /* ---- DG economics ---- */
    const dg = ['DG-01', 'DG-02'].map(id => {
      const sfc = avgLast(db, id, 'sfc', 720);
      return { id, sfc: r1(sfc, 2), cost: r1(PRICES.diesel / sfc + PRICES.dgOM, 2) };
    });
    const peakRate = Math.max(...TARIFF.slots.map(s => TARIFF.energy + s.adder));
    const dgBest = dg.reduce((a, b) => (b.cost < a.cost ? b : a));
    /* DG to lop a peak above contract only pays when the excess-demand charge saved beats the fuel premium */
    const lopHours = day1.filter(x => x.kva15Plan > CONTRACT.kva).length;

    /* ---- steam and gas ---- */
    const gasPerT = avgLast(db, 'BLR-01', 'gas_flow') / avgLast(db, 'BLR-01', 'steam_flow');
    const bioPerT = avgLast(db, 'BLR-02', 'fuel_feed') / avgLast(db, 'BLR-02', 'steam_flow');
    const cost = { gas: gasPerT * PRICES.png, bio: bioPerT * PRICES.briquette };
    const nowGas = avgLast(db, 'BLR-01', 'steam_flow', 24), nowBio = avgLast(db, 'BLR-02', 'steam_flow', 24);
    const bioShareNow = nowBio / (nowGas + nowBio);
    const tfhDay = day1.reduce((s, x) => s + x.tfhGas, 0);
    let bioCap = PRICES.bioMax;
    const floorSm3 = PRICES.pngDCQ * PRICES.pngMinPct / 100;
    const splitFor = cap => day1.map(x => { const bio = Math.min(cap, Math.max(0, x.steam - PRICES.gasMin)); return { bio, gas: x.steam - bio }; });
    let split = splitFor(bioCap);
    const gasDay = sp => sp.reduce((s, x) => s + x.gas * gasPerT, 0) + tfhDay;
    /* gas up to the take-or-pay floor is paid for anyway, so burn it before biomass */
    while (gasDay(split) < floorSm3 && bioCap > 4) { bioCap = r1(bioCap - 0.1, 1); split = splitFor(bioCap); }
    day1.forEach((x, i) => { x.bio = split[i].bio; x.gas = split[i].gas; x.bioNow = x.steam * bioShareNow; x.gasNow = x.steam * (1 - bioShareNow); });
    const steamT = day1.reduce((s, x) => s + x.steam, 0);
    const bioT = day1.reduce((s, x) => s + x.bio, 0), gasT = steamT - bioT;
    const costPlan = bioT * cost.bio + gasT * cost.gas;
    const costNow = day1.reduce((s, x) => s + x.bioNow * cost.bio + x.gasNow * cost.gas, 0);
    const briqStock = r0(46 + seeded(hash(db.demo.id + 'briq' + dayKey(start)))() * 22);
    const briqNeed = bioT * bioPerT;
    const steam = {
      gasPerT: r1(gasPerT, 1), bioPerT: r1(bioPerT, 3), costGas: r0(cost.gas), costBio: r0(cost.bio), bioCap, bioShareNow, bioSharePlan: bioT / steamT,
      steamT: r1(steamT, 0), costPlan, costNow, save: costNow - costPlan, gasDaySm3: r0(gasDay(split)), gasNowSm3: r0(day1.reduce((s, x) => s + x.gasNow * gasPerT, 0) + tfhDay),
      floorSm3, dcq: PRICES.pngDCQ, briqStock, briqNeed: r1(briqNeed, 1), briqDays: r1(briqStock / briqNeed, 1), tfhDay: r0(tfhDay),
    };

    /* ---- totals ---- */
    const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
    const demandKwh = sum(day1, x => x.demand), solarKwh = sum(day1, x => x.solar);
    const gridKwh = sum(day1, x => x.grid), gridKwhPlan = sum(day1, x => x.gridPlan);
    const costGrid = sum(day1, x => x.grid * x.rate), costGridPlan = sum(day1, x => x.gridPlan * x.rate);
    const solarShare = solarKwh / demandKwh;
    const reShare = solarShare + (PRICES.greenShare / 100) * (gridKwhPlan / demandKwh);
    const bySlot = TARIFF.slots.map(s => ({ ...s, kwh: sum(day1.filter(x => x.slot === s.id), x => x.grid), kwhPlan: sum(day1.filter(x => x.slot === s.id), x => x.gridPlan) }));

    return {
      start, hours, day1, wx, pf: r1(pf, 3), pr: r1(pr, 1), kwtr, peak: { t: peakHr.t, h: peakHr.h, kva15: peakHr.kva15 }, peakPlan: { t: peakPlanHr.t, h: peakPlanHr.h, kva15: peakPlanHr.kva15Plan },
      alertKva: CONTRACT.kva * CONTRACT.alertPct / 100, contractKva: CONTRACT.kva, mdMTD, mdBase, newMonth, mdRisk, peakActions, shifts, preCool, adders: ERP_ADDERS,
      dg, dgBest, peakRate, lopHours, steam, demandKwh, solarKwh, gridKwh, gridKwhPlan, costGrid, costGridPlan, solarShare, reShare, bySlot,
      solarDay2: sum(hours.slice(24), x => x.solar), demandDay2: sum(hours.slice(24), x => x.demand), peakDay2: Math.max(...hours.slice(24).map(x => x.kva15)),
    };
  });
}
const fmt = v => Math.round(v).toLocaleString('en-IN');

/* ---------- forecast back-test ---------- */
/** Hourly forecast vs actual for the local day starting at t0 (forecast made with data up to the previous midnight). */
export function backtestDay(db, t0) {
  const dem = demandArr(db), i0 = idxOf(db, t0);
  if (i0 < 24 * 15 || i0 + 23 > HOURS - 1) return null;
  const pr = avgLast(db, 'SOL-01', 'pr'), cloud = weatherFor(db.demo, t0).cloud;
  const sol = sOf(db, 'SOL-01', 'ac_kw');
  const pts = [];
  for (let k = 0; k < 24; k++) {
    const fc = profileAt(dem, i0 + k, i0 - 1).v, act = dem[i0 + k];
    const h = new Date(t0 + k * H).getHours();
    const sAct = h >= 7 && h < 18 ? Math.max(0, sol[i0 + k]) : 0;
    pts.push({ t: t0 + k * H, fc, act, ape: Math.abs(act - fc) / act, sFc: solarKw(h, cloud, pr), sAct });
  }
  const mape = mean(pts.map(p => p.ape));
  const pkF = Math.max(...pts.map(p => p.fc)), pkA = Math.max(...pts.map(p => p.act));
  const eF = pts.reduce((s, p) => s + p.fc, 0), eA = pts.reduce((s, p) => s + p.act, 0);
  const sF = pts.reduce((s, p) => s + p.sFc, 0), sA = pts.reduce((s, p) => s + p.sAct, 0);
  return { t0, pts, mape, peakErr: (pkF - pkA) / pkA, energyErr: (eF - eA) / eA, solarErr: sA ? (sF - sA) / sA : 0 };
}
export function yesterday(db) {
  const d = new Date(db.anchor); d.setHours(0, 0, 0, 0);
  return backtestDay(db, d.getTime() - D);
}
/** Daily MAPE for every full local day in [from, to]. */
export function mapeByDay(db, from, to) {
  return memo(db, `mape|${from}|${to}`, () => {
    const out = [];
    const d = new Date(from); d.setHours(0, 0, 0, 0);
    for (let t = d.getTime(); t + D <= to + H; t += D) { const b = backtestDay(db, t); if (b) out.push({ t, mape: r1(b.mape * 100, 2), peakErr: r1(b.peakErr * 100, 1) }); }
    return out;
  });
}
