/* Analytics for the EMS "Invest" and "Plan" decision boards (ems-inv):
     - capexModel:  energy audit ECM register (ISO 50002 / BEE style) for the capex board
     - tariffModel: MSEDCL HT-I bill model, contract demand, ToD, PF and green power for the tariff advisory
   Pure functions over db / demo. Baselines are measured from the plant tags over the selected period.
   Where the plant model has no number (tariff rates, capex quotes, fuel price), the value is a fixed
   assumption listed in NOTES / TARIFF, realistic for a Maharashtra HT industrial consumer, and the
   energy charge is calibrated so the bill reproduces the plant's blended cost KPI (₹/kWh). */
import { hash } from '../engine.js';

const H = 36e5, D = 864e5;
const r = (v, d = 0) => { const p = 10 ** d; return Math.round(v * p) / p; };
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const h01 = s => (hash(s) % 10000) / 10000;
const LAKH = 1e5;

/* ======================================================================
   Assumptions shown in the auditor's notes
   ====================================================================== */
export const NOTES = {
  hours: 8400,            // operating hours per year (24 × 7 campus, ~15 days of shutdowns)
  chillerHours: 8000,
  ef: 0.71,               // tCO₂/MWh, grid emission factor (CEA baseline database)
  gasPrice: 52,           // ₹/Sm³ PNG, industrial
  gasNcv: 9.88,           // kWh/Sm³ (8,500 kcal/Sm³)
  gasEf: 2.0,             // kg CO₂/Sm³
  waterCost: 110,         // ₹/m³ raw water + RO + chemicals
  steamCost: 2800,        // ₹/t blended steam (plant figure)
  diesel: 92,             // ₹/L
  discount: 0.10, years: 10,
  solarYield: 1450,       // kWh/kWp/yr, Chakan, tilted rooftop
};

/* ======================================================================
   MSEDCL HT-I (industry) tariff, as configured from the bill and the MERC order (doc d6)
   ====================================================================== */
export const TARIFF = {
  name: 'MSEDCL HT-I(A) Industry · 33 kV · kVAh billing',
  demand: 500,            // ₹/kVA/month on billing demand
  floor: 0.75,            // billing demand = max(actual MD, 75 % of contract demand)
  excess: 1.5,            // demand above contract demand is billed at 150 % of the demand charge
  ed: 0.075,              // electricity duty, industrial, on the bill amount
  tose: 0.18,             // tax on sale of electricity, ₹/kWh
  greenPremium: 0.66,     // ₹/kWh, MSEDCL green tariff
  /* ToD slots (clock hours) and ₹/kWh over the base energy charge */
  tod: [
    { id: 'A', name: 'Night 22–06', hours: [22, 23, 0, 1, 2, 3, 4, 5], rate: -1.5, tone: 'good' },
    { id: 'B', name: 'Normal 06–09, 12–18', hours: [6, 7, 8, 12, 13, 14, 15, 16, 17], rate: 0, tone: 'neutral' },
    { id: 'C', name: 'Morning peak 09–12', hours: [9, 10, 11], rate: 0.8, tone: 'warn' },
    { id: 'D', name: 'Evening peak 18–22', hours: [18, 19, 20, 21], rate: 1.1, tone: 'bad' },
  ],
  /* PF incentive on the energy charge, monthly average PF (kVAh basis) */
  pfSlabs: [{ lo: 0.95, pct: 0.5 }, { lo: 0.96, pct: 1.0 }, { lo: 0.97, pct: 1.5 }, { lo: 0.98, pct: 2.0 }, { lo: 0.99, pct: 2.5 }],
  pfPenaltyBelow: 0.9,
  /* load factor incentive on the energy charge; LF = kWh / (CD × PF × hours); lost in a month when MD > CD */
  lf: lf => (lf < 0.75 ? 0 : lf <= 0.85 ? 0.75 : Math.min(15, 0.75 + (lf * 100 - 85))),
};
export const pfIncentivePct = pf => { let p = 0; TARIFF.pfSlabs.forEach(s => { if (pf >= s.lo) p = s.pct; }); return pf < TARIFF.pfPenaltyBelow ? -2 * Math.ceil((TARIFF.pfPenaltyBelow - pf) * 100) : p; };
const slotOf = h => TARIFF.tod.find(s => s.hours.includes(h));

/* Pune season factor for site load (HVAC driven) and solar output, by calendar month 0..11 */
const SEASON = [0.95, 0.97, 1.02, 1.05, 1.06, 1.01, 0.97, 0.96, 0.97, 1.0, 0.98, 0.95];
const SOLAR_SEASON = [1.05, 1.12, 1.18, 1.16, 1.1, 0.82, 0.66, 0.7, 0.86, 1.02, 1.05, 1.02];

/* ---------- helpers over db ---------- */
function idxRange(db, from, to) {
  const n = db.series('GRID-01', 'kw').length;
  const f = Math.max(0, Math.ceil(n - 1 - (db.anchor - from) / H));
  const e = n - 1 - Math.max(0, Math.floor((db.anchor - to) / H));
  return [f, e];
}
/** Mean of a tag over [from, to] from the hourly series (falls back to latest). */
export function avgTag(db, asset, tag, R) {
  const s = db.series(asset, tag); if (!s) return null;
  const [f, e] = idxRange(db, R.from, R.to);
  if (e < f) return s[s.length - 1];
  let sum = 0; for (let i = f; i <= e; i++) sum += s[i];
  return sum / (e - f + 1);
}
function kpiIn(db, id, from, to) { return db.kpiDaily(id).filter(p => p.t >= from && p.t < to); }

/* ---------- finance ---------- */
export function npv(capex, annual, years = NOTES.years, rate = NOTES.discount, degrade = 0) {
  let v = -capex; for (let y = 1; y <= years; y++) v += (annual * (1 - degrade) ** (y - 1)) / (1 + rate) ** y; return v;
}
export function irr(capex, annual, years = NOTES.years, degrade = 0) {
  if (annual <= 0) return null;
  let lo = -0.99, hi = 50;
  for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; let v = -capex; for (let y = 1; y <= years; y++) v += (annual * (1 - degrade) ** (y - 1)) / (1 + mid) ** y; if (v > 0) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/* ======================================================================
   CAPEX · ECM register
   ====================================================================== */
const DECISION = { now: 'Approve now', pilot: 'Pilot first', later: 'Next budget / later' };
export { DECISION };

/** ECM register for the selected baseline period R. ₹ in lakh, energy in kWh/yr, fuel in Sm³/yr. */
export function capexModel(db, demo, R) {
  const need = ['AR-01', 'AC-01', 'AC-02', 'CH-02', 'BLR-01', 'CRS-01', 'SH-01', 'TR-02', 'SOL-01'];
  if (!need.every(a => db.assetById[a])) return null;
  const A = (a, t) => avgTag(db, a, t, R);
  const N = NOTES;
  const costK = db.kpiSummary('cost', db.anchor - 30 * D, db.anchor);
  const tariff = demo.kpis.find(k => k.id === 'cost').cur;              // ₹/kWh blended (KPI)
  const demandPerKwh = (demo.cost?.elements || []).find(e => /demand/i.test(e[0]))?.[1] || 0.86;
  const energyOnly = tariff - demandPerKwh;                               // solar and fuel-side measures do not cut evening MD
  const ev = (asset, tag, d) => { const def = db.tagDef(asset, tag); const v = A(asset, tag); return { asset, tag, name: def?.name || tag, unit: def?.unit || '', v, d: d ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2) }; };

  const list = [];
  const add = e => list.push(e);

  /* 1 · compressed air leak programme */
  {
    const leak = A('AR-01', 'leak_pct'), flow = A('AR-01', 'flow'), sp = A('AR-01', 'plant_sp');
    const tgt = 10, dq = Math.max(0, flow * (leak - tgt) / 100), kw = dq * sp * 0.85;
    add({ id: 'air-leak', area: 'Compressed air', asset: 'AR-01', name: 'Compressed air leak programme: ultrasonic survey, repair, zone isolation valves',
      base: `Leak load ${r(leak)} % of ${r(flow)} m³/min (${r(flow * leak / 100, 1)} m³/min)`, prop: `≤ ${tgt} % with quarterly survey; isolate idle headers on weekends`,
      kwh: kw * N.hours, capex: 6.5, opex: 1.5, conf: leak > 18 ? 'High' : 'Medium',
      evidence: [ev('AR-01', 'leak_pct'), ev('AR-01', 'flow'), ev('AR-01', 'plant_sp'), ev('AC-03', 'kw')],
      risk: 'Leaks return within 6–9 months without a survey routine; budget ₹1.5 L/yr for repeat surveys.',
      mv: 'IPMVP Option B · no-production (Sunday) flow test before and after, compressor kWh per m³', owner: 'Utilities manager', when: 'This month' });
  }
  /* 2 · compressor master sequencer */
  {
    const k1 = A('AC-01', 'kw'), k2 = A('AC-02', 'kw'), k3 = A('AC-03', 'kw'), lp = A('AC-01', 'load_pct');
    const kw = 0.04 * (k1 + k2 + k3);
    add({ id: 'air-seq', area: 'Compressed air', asset: 'AC-01…04', name: 'Central compressor sequencer with narrow pressure band (AC-01…AC-04)',
      base: `Fixed-speed AC-01/02 ${r(lp)} % loaded, cascade band 7.3/6.9 bar`, prop: 'One master controller, AC-03 VSD always trim, band ±0.2 bar',
      kwh: kw * N.hours, capex: 6.0, conf: 'High',
      evidence: [ev('AC-01', 'load_pct'), ev('AC-01', 'kw'), ev('AC-02', 'kw'), ev('AC-03', 'kw'), ev('AR-01', 'header_pressure')],
      risk: 'Low. Needs a pressure transmitter at the paint line to protect the 6.0 bar user.',
      mv: 'IPMVP Option B · compressor-house kWh per m³ of FAD, 2 weeks before and after at like flow', owner: 'Utilities manager', when: 'This quarter' });
  }
  /* 3 · replace AC-02 with VSD */
  {
    const k2 = A('AC-02', 'kw'), kw = 0.12 * k2;
    add({ id: 'air-vsd', area: 'Compressed air', asset: 'AC-02', name: 'Replace AC-02 (160 kW fixed speed) with a 132 kW VSD compressor',
      base: `AC-02 ${r(k2)} kW avg on load/unload`, prop: 'Second VSD as trim after leaks are fixed, right-sized to the new demand',
      kwh: kw * N.hours, capex: 36, conf: 'Medium',
      evidence: [ev('AC-02', 'kw'), ev('AC-02', 'load_pct'), ev('AC-02', 'spec_power')],
      risk: 'Sized on today\'s leaky demand it would be oversized. Re-measure demand after the leak programme first.',
      mv: 'IPMVP Option B · kW and FAD logged on the new machine for 4 weeks', owner: 'Utilities manager', when: 'After leak programme', forceLater: true });
  }
  /* 4 · compressor heat recovery to boiler make-up water */
  {
    const kComp = A('AC-01', 'kw') + A('AC-02', 'kw');
    const steam = A('SH-01', 'total_flow'), rec = A('CRS-01', 'recovery'), eff = A('BLR-01', 'efficiency') / 100;
    const makeup = steam * (1 - Math.max(rec, 82) / 100);                // t/h, after the condensate ECM (savings not double counted)
    const sink = makeup * 1000 * 4.19 * (70 - 30) / 3600;                 // kWth to heat make-up 30 → 70 °C
    const kwth = Math.min(0.45 * kComp, sink) * 0.7;                      // 70 % utilisation
    const sm3 = (kwth * N.hours) / eff / N.gasNcv;
    add({ id: 'air-hr', area: 'Compressed air → steam', asset: 'AC-01, AC-02', name: 'Compressor oil-cooler heat recovery to boiler feed (make-up) water',
      base: `${r(kComp)} kW of compression heat rejected to air; make-up ${r(makeup, 1)} t/h at 30 °C (after condensate ECM)`, prop: `Plate heat exchangers recover about ${r(kwth)} kWth, make-up preheated to 70 °C`,
      kwh: 0, sm3, capex: 16, conf: 'Medium',
      evidence: [ev('AC-01', 'oil_temp'), ev('AC-01', 'kw'), ev('SH-01', 'total_flow'), ev('CRS-01', 'recovery')],
      risk: 'Recoverable heat falls as condensate recovery rises (less make-up). Oil temperature control must stay with the compressor.',
      mv: 'IPMVP Option B · BTU meter on the recovery loop, gas Sm³ per t of steam on BLR-01', owner: 'Boiler house in-charge', when: 'This quarter' });
  }
  /* 5 · CH-02 condenser tube cleaning + CT-02 blowdown */
  {
    const kwtr = A('CH-02', 'kw_tr'), tr = A('CH-02', 'tr'), app = A('CH-02', 'cond_approach');
    const kw = Math.max(0, (kwtr - 0.63) * tr);
    add({ id: 'ch2-clean', area: 'Chilled water', asset: 'CH-02', name: 'CH-02 condenser tube cleaning and CT-02 blowdown valve repair',
      base: `${r(kwtr, 2)} kW/TR at ${r(tr)} TR, approach ${r(app, 1)} °C`, prop: '0.63 kW/TR, approach ≤ 3 °C, cycles of concentration back to 4',
      kwh: kw * N.chillerHours, capex: 2.6, conf: kwtr > 0.7 ? 'High' : 'Medium',
      evidence: [ev('CH-02', 'kw_tr'), ev('CH-02', 'cond_approach'), ev('CH-01', 'cond_approach'), ev('CH-02', 'tr')],
      risk: 'One-shift outage with CH-01 + CH-03 leading. Fouling returns if water treatment is not fixed.',
      mv: 'IPMVP Option A · kW/TR at like load and CW inlet temperature, 7 days before and after', owner: 'HVAC in-charge', when: 'This week' });
  }
  /* 6 · automatic tube cleaning */
  {
    const tr1 = A('CH-01', 'tr'), tr2 = A('CH-02', 'tr');
    const kw = 0.03 * (tr1 + tr2);
    add({ id: 'ch-atcs', area: 'Chilled water', asset: 'CH-01, CH-02', name: 'Automatic condenser tube cleaning (ball system) on CH-01 and CH-02',
      base: 'Manual cleaning yearly; approach drifts 2–4 °C between cleanings', prop: 'Approach held near clean value all year',
      kwh: kw * N.chillerHours, capex: 26, conf: 'Medium',
      evidence: [ev('CH-01', 'cond_approach'), ev('CH-02', 'cond_approach'), ev('CH-02', 'kw_tr')],
      risk: 'Savings depend on how fast tubes foul after the water treatment fix; ball trap needs monthly check.',
      mv: 'IPMVP Option B · approach and kW/TR trend against a regression on load and CW inlet', owner: 'HVAC in-charge', when: 'Next budget' });
  }
  /* 7 · CH-02 replacement */
  {
    const tr2 = A('CH-02', 'tr'); const kw = (0.63 - 0.54) * tr2;
    add({ id: 'ch2-replace', area: 'Chilled water', asset: 'CH-02', name: 'Replace CH-02 with a 600 TR magnetic-bearing centrifugal chiller',
      base: '0.63 kW/TR when clean (16 years old)', prop: '0.54 kW/TR full load, better at part load',
      kwh: kw * N.chillerHours, capex: 255, conf: 'Medium',
      evidence: [ev('CH-02', 'kw_tr'), ev('CH-02', 'tr')],
      risk: 'Long payback; only attractive at end of life or with a refrigerant phase-out deadline.',
      mv: 'IPMVP Option B · 12 months of kW/TR against the pre-retrofit regression', owner: 'HVAC in-charge', when: 'At end of life', forceLater: true });
  }
  /* 8 · IE4 motors on primary CHW pumps */
  {
    const kw0 = A('PCHP-01', 'kw') + A('PCHP-02', 'kw'); const kw = kw0 * (1 - 0.930 / 0.954);
    add({ id: 'ie4', area: 'Chilled water', asset: 'PCHP-01, PCHP-02', name: 'IE4 motors on primary CHW pumps PCHP-01/02 (37 kW, IE2 today)',
      base: `${r(kw0)} kW at 93.0 % motor efficiency`, prop: '95.4 % (IE4)',
      kwh: kw * N.hours, capex: 4.8, conf: 'High',
      evidence: [ev('PCHP-01', 'kw'), ev('PCHP-02', 'kw'), ev('PCHP-01', 'dp')],
      risk: 'Small saving; best done at the next motor failure or rewind (replace instead of rewind).',
      mv: 'IPMVP Option A · spot kW at the same flow and head', owner: 'Electrical head', when: 'On failure' });
  }
  /* 9 · AHU VFDs on fixed-speed fans */
  {
    const hvac = A('MCC-03', 'kw'), metered = A('VFD-01', 'kw') + A('VFD-02', 'kw');
    const fixedFans = 6 * 18.5, kw = 0.25 * fixedFans;
    add({ id: 'ahu-vfd', area: 'HVAC', asset: 'MCC-03', name: 'VFDs with static-pressure reset on 6 fixed-speed AHU fans (22 kW)',
      base: `HVAC MCC ${r(hvac)} kW; only AHU-1/2 (${r(metered)} kW) are on VFD`, prop: 'Fan speed follows duct static pressure; −25 % fan kW',
      kwh: kw * N.hours, capex: 12.5, conf: 'Low',
      evidence: [ev('MCC-03', 'kw'), ev('VFD-01', 'freq'), ev('VFD-01', 'kw')],
      risk: 'The 6 fans are not metered: saving is estimated. Pilot on 2 AHUs with clamp-on logging first.',
      mv: 'IPMVP Option A · fan kW logged 2 weeks before and after on the pilot AHUs', owner: 'HVAC in-charge', when: 'Pilot this quarter' });
  }
  /* 10 · condensate recovery */
  {
    const rec = A('CRS-01', 'recovery'), steam = A('SH-01', 'total_flow'), tret = A('CRS-01', 'return_temp'), eff = A('BLR-01', 'efficiency') / 100;
    const tgt = 82, dt = Math.max(0, steam * (tgt - rec) / 100);       // t/h extra condensate
    const kwth = dt * 1000 * 4.19 * (tret - 30) / 3600;
    const sm3 = (kwth * N.hours) / eff / N.gasNcv, water = dt * N.hours;
    add({ id: 'condensate', area: 'Steam', asset: 'CRS-01', name: 'Raise condensate recovery: pumping traps and return lines in the process block',
      base: `Recovery ${r(rec)} % of ${r(steam, 1)} t/h steam`, prop: `${tgt} % (+${r(dt, 1)} t/h at ${r(tret)} °C)`,
      kwh: 0, sm3, water, capex: 24, conf: 'High',
      evidence: [ev('CRS-01', 'recovery'), ev('CRS-01', 'return_temp'), ev('SH-01', 'total_flow'), ev('STZ-01', 'failed_traps')],
      risk: 'Contamination risk from jacketed vessels: add conductivity dump valve. Fix failed traps first (PR 1300 4471).',
      mv: 'IPMVP Option B · condensate return flow and temperature, boiler make-up m³', owner: 'Utilities manager', when: 'This quarter' });
  }
  /* 11 · BLR-01 economiser + O2 trim */
  {
    const st = A('BLR-01', 'stack_temp'), o2 = A('BLR-01', 'stack_o2'), gas = A('BLR-01', 'gas_flow'), eff = A('BLR-01', 'efficiency');
    const gain = Math.max(0, (st - 130) / 22) + Math.max(0, (o2 - 2.0) * 0.5);   // % points
    const sm3 = gas * N.hours * gain / (eff + gain);
    add({ id: 'blr-econ', area: 'Steam', asset: 'BLR-01', name: 'BLR-01 feed-water economiser and O₂ trim control',
      base: `Stack ${r(st)} °C, O₂ ${r(o2, 1)} %, efficiency ${r(eff, 1)} %`, prop: `Stack 130 °C, O₂ 2.0 %, +${r(gain, 1)} % points efficiency`,
      kwh: 0, sm3, capex: 26, conf: 'High',
      evidence: [ev('BLR-01', 'stack_temp'), ev('BLR-01', 'stack_o2'), ev('BLR-01', 'gas_flow'), ev('BLR-01', 'efficiency')],
      risk: 'Low on natural gas (no acid dew point issue at 130 °C). One-week shutdown to tie in.',
      mv: 'IPMVP Option B · indirect efficiency (stack loss) and gas Sm³ per t steam, 4 weeks each side', owner: 'Boiler house in-charge', when: 'Next shutdown' });
  }
  /* 12 · harmonic filter N+1 + detuned APFC */
  {
    const thd = A('TR-02', 'thd_i'), wti = A('TR-02', 'wind_temp'), load = A('TR-02', 'load_pct');
    const kw = 3 + Math.max(0, thd - 5) * 0.35;                           // eddy + cable loss avoided
    const pfL = 6;                                                        // PF slab protection, ₹ L/yr
    add({ id: 'pq-filter', area: 'Power network', asset: 'TR-02, HF-01, APFC-01', name: 'Second 300 A active harmonic filter (N+1) on BB-02 and 7 % detuned APFC steps',
      base: `TR-02 THD-I ${r(thd, 1)} %, WTI ${r(wti)} °C at ${r(load)} % load; one filter, no redundancy`, prop: 'THD-I < 5 % with either filter out; capacitors protected from resonance',
      kwh: kw * 8760, extraL: pfL, capex: 19, conf: 'Medium',
      evidence: [ev('TR-02', 'thd_i'), ev('TR-02', 'wind_temp'), ev('HF-01', 'comp_current'), ev('APFC-01', 'pf_bus')],
      risk: 'Main value is risk: TR-02 ageing about 5× normal at 112 °C. A 3.15 MVA replacement is about ₹1.1 Cr and 16 weeks.',
      mv: 'IPMVP Option A · THD-I, WTI and transformer loss at like load; PF slab per bill', owner: 'Electrical head', when: 'This quarter' });
  }
  /* 13 · rooftop solar expansion */
  {
    const pr = A('SOL-01', 'pr'); const kwp = 800; const kwh = kwp * N.solarYield;
    add({ id: 'solar', area: 'Renewables', asset: 'SOL-01', name: 'Rooftop and carport solar: add 0.8 MWp (net-metered, behind GRID-01)',
      base: `1 MWp running at PR ${r(pr)} %`, prop: `1.8 MWp; +${r(kwh / 1e6, 2)} GWh/yr at ${N.solarYield} kWh/kWp`,
      kwh, value: energyOnly, capex: 336, opex: 4, degrade: 0.005, conf: 'High',
      evidence: [ev('SOL-01', 'pr'), ev('SOL-01', 'ac_kw'), ev('SOL-01', 'irradiance')],
      risk: 'Valued at ₹' + r(energyOnly, 2) + '/kWh: solar does not cut the 18–22 h maximum demand. Roof load check on 2 sheds.',
      mv: 'IPMVP Option B · inverter kWh against irradiance-expected kWh (PR)', owner: 'Sustainability head', when: 'Next budget', forceLater: true });
  }

  /* finance per ECM */
  const rows = list.map(e => {
    const value = e.value ?? tariff;
    const elecL = (e.kwh * value) / LAKH;
    const fuelL = ((e.sm3 || 0) * N.gasPrice) / LAKH;
    const waterL = ((e.water || 0) * N.waterCost) / LAKH;
    const gross = elecL + fuelL + waterL + (e.extraL || 0);
    const net = gross - (e.opex || 0);
    const pay = net > 0 ? e.capex / net : Infinity;
    const tco2 = (e.kwh * N.ef) / 1000 + ((e.sm3 || 0) * N.gasEf) / 1000;
    const i = irr(e.capex, net, N.years, e.degrade || 0);
    const v = npv(e.capex, net, N.years, N.discount, e.degrade || 0);
    let decision = 'later';
    if (!e.forceLater) {
      if (e.conf === 'Low') decision = 'pilot';
      else if (pay <= 2.5 && i != null && i >= 0.3) decision = 'now';
    }
    return { ...e, value, elecL, fuelL, waterL, gross, saveL: net, pay, irr: i, npv: v, tco2, decision, toe: (e.kwh * 0.086 / 1000) + ((e.sm3 || 0) * N.gasNcv * 0.086 / 1000) };
  }).sort((a, b) => a.pay - b.pay);

  const tot = sel => {
    const s = rows.filter(sel);
    const capex = s.reduce((a, x) => a + x.capex, 0), save = s.reduce((a, x) => a + x.saveL, 0);
    return { n: s.length, capex, save, kwh: s.reduce((a, x) => a + x.kwh, 0), sm3: s.reduce((a, x) => a + (x.sm3 || 0), 0), tco2: s.reduce((a, x) => a + x.tco2, 0),
      pay: save > 0 ? capex / save : null, npv: s.reduce((a, x) => a + x.npv, 0) };
  };
  /* cumulative curve: best payback first */
  let cc = 0, cs = 0;
  const curve = [{ capex: 0, save: 0, id: null }].concat(rows.map(x => { cc += x.capex; cs += x.saveL; return { capex: cc, save: cs, id: x.id, name: x.name, decision: x.decision }; }));

  const t1 = db.series('TR-01', 'load_pct'), t2 = db.series('TR-02', 'load_pct'); const [tf, te] = idxRange(db, R.from, R.to);
  let trLoad = Infinity; for (let i = tf; i <= te; i++) trLoad = Math.min(trLoad, t1[i] + t2[i]);
  const screened = [
    { name: 'Heat-of-compression dryer for ADR-01', why: 'AC-01…AC-04 are oil-injected screws; HOC dryers need oil-free compressors. Heat recovery (ECM above) captures the heat instead.' },
    { name: 'VFDs on cooling tower fans', why: 'CT-01/02 fans already run on VFD-04/05. The saving is in the approach setpoint (setpoint board), not in capex.' },
    { name: 'Run one transformer at low load', why: `Lowest combined TR-01 + TR-02 loading in the period is ${r(trLoad)} % of one unit: a single 3.15 MVA unit cannot carry it. Revisit after the ECMs.` },
    { name: 'Amorphous-core transformer replacement', why: 'Saves about 2 kW of no-load loss per unit (₹1.4 L/yr) against ₹45 L: payback over 25 years.' },
    { name: 'DG peak shaving', why: `DG energy costs about ₹${r(NOTES.diesel / demo.kpis.find(k => k.id === 'dgsfc').cur, 1)}/kWh against ₹${r(tariff + 1.1, 1)}/kWh for grid power in the evening peak.` },
  ];
  return {
    rows, curve, screened, tariff, energyOnly, costNow: costK.value,
    total: tot(() => true), byDecision: { now: tot(x => x.decision === 'now'), pilot: tot(x => x.decision === 'pilot'), later: tot(x => x.decision === 'later') },
    annualKwh: avgTag(db, 'GRID-01', 'kw', R) * 8760,
  };
}

/* ======================================================================
   TARIFF · monthly bills, contract demand, ToD, PF, green power
   ====================================================================== */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const phi = z => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
function Phi(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }

/** ToD shares of grid kWh over hour indices [f, e] (from GRID-01 kW). */
function todShares(db, f, e) {
  const s = db.series('GRID-01', 'kw'); const by = { A: 0, B: 0, C: 0, D: 0 }; let tot = 0;
  for (let i = f; i <= e; i++) { const sl = slotOf(new Date(db.tsHour(i)).getHours()).id; by[sl] += s[i]; tot += s[i]; }
  Object.keys(by).forEach(k => { by[k] = tot ? by[k] / tot : 0.25; });
  return by;
}

/** One month's bill. m: { kwh, md, pf, shares, hours }, E: base energy charge ₹/kVAh, cd: contract demand kVA */
export function billOf(m, E, cd, greenShare) {
  const T = TARIFF;
  const kvah = m.kwh / m.pf;
  const energy = kvah * E;
  const todC = m.kwh * (m.shares.C * 0.8 + m.shares.D * 1.1);
  const todA = m.kwh * m.shares.A * -1.5;
  const billing = Math.max(m.md, T.floor * cd);
  const demand = billing * T.demand;
  const excess = Math.max(0, m.md - cd) * T.demand * (T.excess - 1);
  const pfPct = pfIncentivePct(m.pf);
  const pfInc = -energy * pfPct / 100;
  const lf = m.kwh / (cd * m.pf * m.hours);
  const lfPct = m.md > cd ? 0 : T.lf(lf);
  const lfInc = -energy * lfPct / 100;
  const sub = energy + todC + todA + demand + excess + pfInc + lfInc;
  const ed = sub * T.ed, tose = m.kwh * T.tose;
  const green = m.kwh * greenShare * T.greenPremium;
  const total = sub + ed + tose + green;
  return { kvah, energy, todC, todA, billing, demand, excess, pfPct, pfInc, lf, lfPct, lfInc, ed, tose, green, total };
}

export function tariffModel(db, demo, R) {
  if (!db.assetById['GRID-01'] || !demo.kpis.find(k => k.id === 'md')) return null;
  const cd = demo.energy?.contractKVA || 8000;
  const kMd = demo.kpis.find(k => k.id === 'md'), kPf = demo.kpis.find(k => k.id === 'pf'), kCost = demo.kpis.find(k => k.id === 'cost'), kRe = demo.kpis.find(k => k.id === 're');
  const sKw = db.series('GRID-01', 'kw'); const n = sKw.length;
  const allShares = todShares(db, 0, n - 1);
  const meanKw = mean(Array.from(sKw));
  const dataFrom = db.tsHour(0);

  /* ---------- 12 billed months, ending last month ---------- */
  const a = new Date(db.anchor);
  const months = [];
  for (let k = 12; k >= 1; k--) {
    const st = new Date(a.getFullYear(), a.getMonth() - k, 1).getTime();
    const en = new Date(a.getFullYear(), a.getMonth() - k + 1, 1).getTime();
    const mi = new Date(st).getMonth(), hours = (en - st) / H;
    const cover = Math.max(0, Math.min(en, db.anchor) - Math.max(st, dataFrom)) / (en - st);
    let kwh, md, pf, shares, src;
    if (cover >= 0.5) {
      const [f, e] = idxRange(db, Math.max(st, dataFrom), en - H);
      let s = 0; for (let i = f; i <= e; i++) s += sKw[i];
      kwh = (s / (e - f + 1)) * hours;
      const mdd = kpiIn(db, 'md', st, en), pfd = kpiIn(db, 'pf', st, en);
      md = Math.max(...mdd.map(p => p.v)) * (1 + 0.012);                  // daily KPI → 15-min peak
      pf = mean(pfd.map(p => p.v)); shares = todShares(db, f, e); src = 'metered';
    } else {
      const j = h01(demo.id + 'bill' + st), j2 = h01(demo.id + 'pf' + st);
      kwh = meanKw * SEASON[mi] * hours;
      md = kMd.base * (1 + 0.55 * (SEASON[mi] - 1)) + (j - 0.5) * 140;
      pf = kPf.base + (j2 - 0.5) * 0.008; shares = allShares; src = 'bill';
    }
    const solar = 1000 * NOTES.solarYield / 12 * SOLAR_SEASON[mi];
    months.push({ t: st, label: `${MON[mi]} ${String(new Date(st).getFullYear()).slice(2)}`, mi, hours, kwh, md: r(md), pf: r(pf, 3), shares, src, solar, inPeriod: en > R.from && st < R.to });
  }

  /* green share of grid kWh from the RE KPI (rooftop + green tariff) */
  const siteKwh = mean(months.map(m => m.kwh + m.solar));
  const solarShare = mean(months.map(m => m.solar)) / siteKwh;
  const greenShare = Math.max(0, (kRe ? kRe.cur / 100 : 0) - solarShare) * siteKwh / mean(months.map(m => m.kwh));

  /* other-source cost per site kWh from the plant cost build-up */
  const el = name => (demo.cost?.elements || []).find(e => new RegExp(name, 'i').test(e[0]))?.[1] || 0;
  const dgPerKwh = el('DG'), solarOm = el('Solar');

  /* calibrate the base energy charge so the last 3 billed months reproduce the blended cost KPI */
  const last3 = months.slice(-3);
  const blendedAt = E => { let c = 0, k = 0; last3.forEach(m => { const b = billOf(m, E, cd, greenShare); const site = m.kwh + m.solar; c += b.total + site * (dgPerKwh + solarOm); k += site; }); return c / k; };
  const b0 = blendedAt(0), b1 = blendedAt(1);
  const E = r((kCost.cur - b0) / (b1 - b0), 2);

  months.forEach(m => { m.bill = billOf(m, E, cd, greenShare); m.site = m.kwh + m.solar; m.blended = (m.bill.total + m.site * (dgPerKwh + solarOm)) / m.site; m.exceed = m.md > cd; });
  const year = k => months.reduce((s, m) => s + (typeof k === 'function' ? k(m) : m.bill[k]), 0);

  /* ---------- contract demand options ---------- */
  /* MD level now: highest daily MD in the last 30 days (EMS live), de-seasonalised */
  const recent = kpiIn(db, 'md', db.anchor - 14 * D, db.anchor + 1).map(p => p.v);
  const sd = Math.sqrt(mean(recent.map(v => (v - mean(recent)) ** 2)));
  const postMd = ((recent.length ? mean(recent) + 1.5 * sd : kMd.cur) * 1.012) / (1 + 0.55 * (SEASON[a.getMonth()] - 1));
  const sigma = 110;
  const fwd = months.map(m => ({ ...m, mu: postMd * (1 + 0.55 * (SEASON[m.mi] - 1)) }));  // next 12 months, same calendar
  const evalCd = (c, shift = 0) => {
    let demand = 0, pen = 0, lfInc = 0, pExc = 0, pAny = 1;
    fwd.forEach(m => {
      const mu = m.mu - shift, z = (c - mu) / sigma, p = 1 - Phi(z);
      const eEx = sigma * phi(z) + (mu - c) * p;                          // expected kVA above CD
      demand += Math.max(mu, TARIFF.floor * c) * TARIFF.demand;
      pen += eEx * TARIFF.demand * (TARIFF.excess - 1);
      const energy = (m.kwh / m.pf) * E;
      lfInc += energy * TARIFF.lf(m.kwh / (c * m.pf * m.hours)) / 100 * (1 - p);
      pExc += p; pAny *= 1 - p;
    });
    const edK = 1 + TARIFF.ed;
    return { cd: c, demandL: demand * edK / LAKH, penL: pen * edK / LAKH, lfL: lfInc * edK / LAKH, netL: (demand + pen - lfInc) * edK / LAKH, monthsAtRisk: pExc, pYear: 1 - pAny, shift };
  };
  const cur = evalCd(cd);
  const options = [8400, 8000, 7800, 7600, 7400, 7200].map(c => ({ ...evalCd(c), delta: evalCd(c).netL - cur.netL }));
  const safe = options.filter(o => o.pYear <= 0.1).sort((x, y) => x.netL - y.netL)[0] || options[1];
  /* conditional case: MD held at the KPI target by the MD guard and load staggering */
  const shift = Math.max(0, postMd - kMd.target);
  const condCd = Math.ceil((kMd.target * (1 + 0.55 * 0.06) + 2.2 * sigma) / 50) * 50;
  const mdOnly = evalCd(cd, shift), cond = evalCd(condCd, shift);
  cond.mdSaveL = cur.netL - mdOnly.netL;          // value of holding MD at target, CD unchanged
  cond.cdSaveL = mdOnly.netL - cond.netL;         // extra value of then lowering CD (LF incentive in low months)
  cond.lfMonthsNow = months.filter(m => m.bill.lf < 0.75).length;

  /* ---------- ToD over the selected period ---------- */
  const [f, e] = idxRange(db, R.from, R.to);
  const byHour = Array.from({ length: 24 }, (_, h) => ({ h, sum: 0, n: 0 }));
  const slotKwh = { A: 0, B: 0, C: 0, D: 0 };
  for (let i = f; i <= e; i++) { const hr = new Date(db.tsHour(i)).getHours(); byHour[hr].sum += sKw[i]; byHour[hr].n++; slotKwh[slotOf(hr).id] += sKw[i]; }
  const profile = byHour.map(x => ({ h: x.h, label: String(x.h).padStart(2, '0'), kw: x.n ? x.sum / x.n : 0, slot: slotOf(x.h).id }));
  const totKwh = Object.values(slotKwh).reduce((s, v) => s + v, 0) || 1;
  const pfNow = db.kpiSummary('pf', R.from, R.to).value;
  const slots = TARIFF.tod.map(s => ({ ...s, kwh: slotKwh[s.id], share: slotKwh[s.id] / totKwh, rateAll: E / pfNow + s.rate, costL: slotKwh[s.id] * (E / pfNow + s.rate) * (1 + TARIFF.ed) / LAKH, todL: slotKwh[s.id] * s.rate * (1 + TARIFF.ed) / LAKH }));
  const periodDays = Math.max(1, (e - f + 1) / 24);
  const yrK = 365 / periodDays;
  const delta = (1.1 + 1.5) * (1 + TARIFF.ed);                          // ₹/kWh peak D → night A
  const roKw = avgTag(db, 'RO-01', 'kw', R), mcc1 = avgTag(db, 'MCC-01', 'kw', R);
  const shifts = [
    { id: 'mcc1', name: 'Move one process batch block (MCC-01, about 15 % of its load) from 18–22 to 22–02', kw: 0.15 * mcc1, h: 4, days: 300, effort: 'Medium', owner: 'Production planning', from: 'D', to: 'A' },
    { id: 'ro', name: 'Run RO-01 permeate production at night, fill the treated-water tank before 18:00', kw: roKw, h: 4, days: 365, effort: 'Low', owner: 'Utilities manager', from: 'D', to: 'A' },
    { id: 'etp', name: 'ETP-01 sludge press and transfer pumps on the night shift', kw: 18, h: 3, days: 300, effort: 'Low', owner: 'Utilities manager', from: 'D', to: 'A' },
  ].map(x => ({ ...x, kwhYr: x.kw * x.h * x.days, saveL: x.kw * x.h * x.days * delta / LAKH, mdKva: x.from === 'D' ? x.kw / pfNow : 0 }));

  /* ---------- PF ---------- */
  const pfMonths = months.map(m => ({ label: m.label, pf: m.pf, pct: pfIncentivePct(m.pf), incL: -m.bill.pfInc / LAKH, src: m.src, inPeriod: m.inPeriod }));
  const lastM = months[months.length - 1];
  const nextSlab = TARIFF.pfSlabs.find(s => s.lo > lastM.pf);
  const energyYr = year('energy');
  const pfUpL = nextSlab ? (energyYr * (nextSlab.pct - pfIncentivePct(lastM.pf)) / 100) * (1 + TARIFF.ed) / LAKH : 0;
  const kvahL = (year(m => m.kwh) * E * (1 / lastM.pf - 1 / 0.995)) * (1 + TARIFF.ed) / LAKH;

  /* ---------- green power options, to reach the RE target ---------- */
  const siteYr = year(m => m.site), solarYr = year(m => m.solar);
  const reTarget = kRe ? kRe.target / 100 : 0.2;
  const greenNow = greenShare * year(m => m.kwh);
  const Q = Math.max(greenNow, reTarget * siteYr - solarYr);              // kWh/yr of green power needed
  const gridVar = (E / lastM.pf + (lastM.shares.C * 0.8 + lastM.shares.D * 1.1 - lastM.shares.A * 1.5)) * (1 + TARIFF.ed) + TARIFF.tose;
  const green = [
    { id: 'grid', name: 'Grid power, no green attribute', landed: gridVar, re: (solarYr) / siteYr, tenor: '—', capex: '—', risk: 'No progress on the RE target; exposure to tariff revisions.' },
    { id: 'gt', name: 'MSEDCL green tariff (current route)', landed: gridVar + TARIFF.greenPremium, re: (solarYr + Q) / siteYr, tenor: 'Monthly opt-in', capex: 'None', risk: 'Premium can be revised by MERC each tariff order; certificates from the discom only.' },
    { id: 'oa', name: 'Green open access, third-party hybrid PPA', landed: 4.3 + 1.05 + 1.35 + 1.0 + 0.35 + 4.3 * TARIFF.ed * 0, re: (solarYr + Q) / siteYr, tenor: '10–15 yr PPA', capex: 'None', risk: 'Cross-subsidy and additional surcharge (₹1.35 + ₹1.00/kWh) are set each order and can wipe out the saving; 15-min scheduling and banking rules.' },
    { id: 'gc', name: 'Group captive solar-wind hybrid (green open access, 26 % equity)', landed: 4.1 + 1.05 + 0.3 + 0.25 + (4.1 + 1.05) * TARIFF.ed, re: (solarYr + Q) / siteYr, tenor: '20–25 yr', capex: `₹${r((Q / 2.9e6) * 5.6 * 0.26, 1)} Cr equity (${r(Q / 2.9e6, 1)} MW)`, risk: 'Captive status must be proved every year (26 % equity, 51 % consumption); developer counterparty risk. Exempt from cross-subsidy and additional surcharge.' },
  ].map(o => ({ ...o, deltaKwh: o.landed - gridVar, annualL: (o.landed - gridVar) * Q / LAKH }));

  return {
    cd, E, greenShare, months, year, totals: { kwh: year(m => m.kwh), site: siteYr, bill: year('total'), demand: year('demand'), excess: year('excess'), energy: energyYr, pfInc: year('pfInc'), lfInc: year('lfInc') },
    exceedMonths: months.filter(m => m.exceed), postMd, sigma, options, cur, safe, cond, condCd, shift,
    profile, slots, shifts, periodDays, yrK, pfNow, pfMonths, nextSlab, pfUpL, kvahL, green, Q, gridVar, dgPerKwh, solarOm,
    mdValuePerKva: TARIFF.demand * 12 * (1 + TARIFF.ed) / LAKH,
  };
}
