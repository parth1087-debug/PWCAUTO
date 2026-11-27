/* Data for the Energy & utilities HTML reports (daily energy briefing, monthly energy review).
   Pure functions over c = { demo, db, tools } for the `ems` demo, plus a small set of fixed plant data
   that the model does not hold (fuel tariffs, closed anomalies, done actions, capex asks).
   Everything derived here is consistent with demos/ems.js: KPIs from db.kpiDaily / kpiSummary,
   energy and peaks from tools.get_energy, utility values from tag series. */

const H = 36e5, D = 864e5, IST = 5.5 * H;
const r = (v, d = 0) => { const p = 10 ** d; return Math.round(v * p) / p; };
const istMidnight = t => Math.floor((t + IST) / D) * D - IST;

/* ---------- fixed plant data (Meridian Industrial Park, Campus 1) ---------- */
export const TARIFF = {
  budgetPerKwh: 7.7,                               // demo.cost.budget, ₹/kWh blended
  png: { rate: 46, kwhPerScm: 10.0, label: 'PNG (MNGL, industrial)' },              // ₹/Sm³, NCV about 8,600 kcal/Sm³
  biomass: { rate: 7200, kwhPerT: 4420, label: 'Biomass briquettes' },             // ₹/t, GCV about 3,800 kcal/kg
  steamPerT: 2800,                                 // ₹/t blended steam cost (m5 diagnosis)
  tod: [[9, 12], [18, 22]],                        // MSEDCL ToD peak windows, IST hours
};

/* anomalies found and closed in the last 30 days (daysAgo = closed) */
const CLOSED = [
  { asset: 'APFC-01', title: 'APFC-01 steps 7 and 8 out of service, night PF down to 0.968', rca: 'Welded contactor on step 7 and a blown fuse on step 8; both replaced, steps tested.', lakhYr: 11, opened: 27, daysAgo: 24, owner: 'Electrical head', util: 'Power' },
  { asset: 'AHU', title: 'AHU-1 and AHU-2 running on Sundays and nights with no occupancy', rca: 'BMS time schedule lost after a controller firmware update; schedules restored and locked.', lakhYr: 13, opened: 22, daysAgo: 19, owner: 'HVAC in-charge', util: 'Chilled water' },
  { asset: 'TFH-01', title: 'TFH-01 stack O₂ at 5.2 %, burner running lean', rca: 'Air damper linkage slipped; burner re-tuned to 3.8 % O₂ with CO below 50 ppm.', lakhYr: 6, opened: 18, daysAgo: 15, owner: 'Utilities manager', util: 'Gas' },
  { asset: 'RO-01', title: 'RO-01 specific energy up to 1.32 kWh/m³', rca: 'Membrane fouling (ΔP up 28 %); CIP done, specific energy back to 1.10 kWh/m³.', lakhYr: 3, opened: 16, daysAgo: 11, owner: 'Utilities manager', util: 'Water' },
  { asset: 'DG-02', title: 'DG-02 ran 14 h at 22 % load during grid dips', rca: 'Load-share set to equal split; DG-01 made lead with DG-02 on load-demand start above 900 kW.', lakhYr: 4, opened: 12, daysAgo: 8, owner: 'Utilities manager', util: 'Power' },
];

/* actions not visible elsewhere in the model (done ones) */
const DONE = [
  { title: 'Replace APFC-01 step 7 and 8 contactors and fuses', util: 'Power', owner: 'Electrical head', lakhYr: 11, daysAgo: 24 },
  { title: 'Restore and lock AHU-1/AHU-2 BMS schedules', util: 'Chilled water', owner: 'HVAC in-charge', lakhYr: 13, daysAgo: 19 },
  { title: 'Re-tune TFH-01 burner to 3.8 % O₂', util: 'Gas', owner: 'Utilities manager', lakhYr: 6, daysAgo: 15 },
  { title: 'RO-01 membrane CIP', util: 'Water', owner: 'Utilities manager', lakhYr: 3, daysAgo: 11 },
];

/* capex asks for management (estimates from vendor budgetary quotes) */
export const CAPEX = [
  { title: 'Online condenser tube cleaning (ball system) on CH-02', capexL: 14, lakhYr: 19, why: 'CH-02 fouled twice in 10 months; approach rose from 2.1 to 5.6 °C in 3 weeks. Keeps approach under 2.5 °C without a shutdown.', owner: 'HVAC in-charge' },
  { title: 'Second active harmonic filter (300 A) on BB-02 in N+1 with HF-01', capexL: 18, lakhYr: 0, why: 'HF-01 is a single point of failure: one fan failure doubled TR-02 THD and took the winding to 112 °C. Protects a 3.15 MVA transformer (replacement about ₹55 lakh, 16–20 weeks).', owner: 'Electrical head' },
];

/* ---------- helpers ---------- */
function sumTag(db, asset, tag, from, to) {
  const s = db.series(asset, tag); if (!s) return { sum: 0, avg: 0, max: 0, min: 0, n: 0 };
  const N = s.length, f = Math.max(0, Math.ceil(N - 1 - (db.anchor - from) / H)), e = Math.min(N - 1, Math.floor(N - 1 - (db.anchor - to) / H));
  let sum = 0, max = -Infinity, min = Infinity, n = 0;
  for (let i = f; i <= e; i++) { sum += s[i]; max = Math.max(max, s[i]); min = Math.min(min, s[i]); n++; }
  return { sum, avg: n ? sum / n : 0, max, min, n };
}
const kpiAt = (db, id, back) => { const d = db.kpiDaily(id); return d[d.length - 1 - back].v; };
const kpi = (demo, id) => demo.kpis.find(k => k.id === id);
const lakhOf = gain => { const m = String(gain || '').match(/₹\s?([\d.]+)\s?L/); return m ? +m[1] : 0; };

/* titled events with the hour the main tag first crossed its limit (from the series, not the message time) */
export function alarms(c) {
  const { demo, db } = c;
  return (demo.events || []).filter(e => e.title).map(e => {
    const s = db.series(e.asset, e.tag), d = db.tagDef(e.asset, e.tag), N = s.length;
    let first = -1;
    for (let i = Math.max(0, N - e.startHoursAgo); i < N; i++) if ((d.hi != null && s[i] > d.hi) || (d.lo != null && s[i] < d.lo)) { first = i; break; }
    const owner = { 'BB-01': 'Electrical head', 'TR-02': 'Electrical head', 'AR-01': 'Utilities manager', 'CH-02': 'HVAC in-charge', 'STZ-01': 'Utilities manager' }[e.asset] || 'Energy manager';
    return { id: e.id, asset: e.asset, tag: e.tag, tagName: d.name, unit: d.unit, limit: d.hi != null ? d.hi : d.lo, now: s[N - 1], severity: e.severity, title: e.title,
      crossedAt: first < 0 ? null : db.tsHour(first), rca: e.diagnosis?.title, confidence: e.diagnosis?.confidence, reco: e.diagnosis?.reco, health: e.health, owner };
  }).sort((a, b) => (a.severity === b.severity ? (b.crossedAt || 0) - (a.crossedAt || 0) : a.severity === 'bad' ? -1 : 1));
}

/* ---------- daily briefing ---------- */
export function emsDay(c) {
  const { demo, db, tools } = c;
  const y0 = istMidnight(db.anchor) - D, y1 = y0 + D - 1, p0 = y0 - D, p1 = y0 - 1;
  const eY = tools.get_energy({ from: new Date(y0).toISOString(), to: new Date(y1).toISOString() });
  const eP = tools.get_energy({ from: new Date(p0).toISOString(), to: new Date(p1).toISOString() });
  const e30 = tools.get_energy({ days: 30 });
  const k = id => ({ y: kpiAt(db, id, 1), p: kpiAt(db, id, 2), k: kpi(demo, id), avg30: db.kpiSummary(id, db.anchor - 30 * D, db.anchor).value });
  const cost = k('cost');
  const kwhY = eY.energy_kwh, kwhP = eP.energy_kwh;
  const metrics = {
    energy: { y: kwhY, p: kwhP, avg30: e30.energy_kwh / 30 },
    cost: { y: kwhY * cost.y, p: kwhP * cost.p, budget: kwhY * TARIFF.budgetPerKwh, rateY: cost.y, rateP: cost.p },
    md: k('md'), sec: k('sec'), pf: k('pf'), re: k('re'), kwtr: k('kwtr'), air: k('air'), blreff: k('blreff'),
    contract: demo.energy.contractKVA,
  };
  /* hourly load profile, IST hours */
  const profile = eY.load_profile.map(p => ({ t: new Date(p.t).getTime(), kva: p.kva }));
  const sol = sumTag(db, 'SOL-01', 'ac_kw', y0, y1);

  /* utility-by-utility status for yesterday */
  const T = (a, t) => sumTag(db, a, t, y0, y1);
  const tr2 = T('TR-02', 'wind_temp'), bb1 = T('BB-01', 'joint_y');
  const acKw = ['AC-01', 'AC-02', 'AC-03', 'AC-04'].reduce((n, a) => n + T(a, 'kw').sum, 0);
  const air = { flow: T('AR-01', 'flow'), sp: T('AR-01', 'plant_sp'), leak: T('AR-01', 'leak_pct'), hp: T('AR-01', 'header_pressure') };
  const chTr = ['CH-01', 'CH-02', 'CH-03'].reduce((n, a) => n + T(a, 'tr').sum, 0);
  const ch2 = T('CH-02', 'kw_tr'), ch2a = T('CH-02', 'cond_approach');
  const steam = { gen: T('SH-01', 'total_flow'), spu: T('SH-01', 'steam_per_unit'), loss: T('STZ-01', 'steam_loss'), cond: T('CRS-01', 'recovery') };
  const gas = { flow: T('GMS-01', 'flow'), o2: T('TFH-01', 'stack_o2'), pout: T('PRS-01', 'p_out') };
  const fixed = v => r(v, 1);
  const utilities = [
    { name: 'Power', use: `${fmtIN(kwhY / 1000, 1)} MWh grid · ${fmtIN(sol.sum / 1000, 1)} MWh solar`, eff: `PF ${metrics.pf.y.toFixed(3)} · peak ${fmtIN(metrics.md.y)} kVA`,
      state: tr2.max > 105 || bb1.max > 85 ? 'Alarm' : 'Normal',
      note: `TR-02 winding peaked at ${fixed(tr2.max)} °C (alarm 105 °C) with HF-01 offline; BB-01 Y-phase joint at ${fixed(bb1.max)} °C (alarm 85 °C).` },
    { name: 'Compressed air', use: `${fmtIN(air.flow.sum * 60)} m³ FAD · ${fmtIN(acKw / 1000, 1)} MWh`, eff: `${air.sp.avg.toFixed(2)} kW/(m³/min) · target ${kpi(demo, 'air').target.toFixed(1)} (30-day ${metrics.air.avg30.toFixed(1)})`,
      state: air.leak.avg > 25 ? 'Watch' : 'Normal', note: `Leak load ${fixed(air.leak.avg)} % of flow (limit 25 %); header held at ${air.hp.avg.toFixed(1)} bar for a 6.0 bar need.` },
    { name: 'Chilled water', use: `${fmtIN(chTr)} TR·h cooling`, eff: `${metrics.kwtr.y.toFixed(2)} kW/TR plant · target ${kpi(demo, 'kwtr').target.toFixed(2)}`,
      state: ch2.avg > 0.75 ? 'Watch' : 'Normal', note: `CH-02 at ${ch2.avg.toFixed(2)} kW/TR, condenser approach ${ch2a.avg.toFixed(1)} °C (normal 2.1 °C).` },
    { name: 'Steam', use: `${fmtIN(steam.gen.sum, 0)} t generated`, eff: `${metrics.blreff.y.toFixed(1)} % boiler efficiency · ${steam.spu.avg.toFixed(1)} kg/unit`,
      state: steam.loss.avg > 150 ? 'Watch' : 'Normal', note: `Failed traps on STZ-01 lose ${fmtIN(steam.loss.avg)} kg/h; condensate recovery ${fixed(steam.cond.avg)} % (target 80 %).` },
    { name: 'Natural gas', use: `${fmtIN(gas.flow.sum)} Sm³ PNG`, eff: `TFH-01 stack O₂ ${gas.o2.avg.toFixed(1)} %`,
      state: 'Normal', note: `Supply steady; PRS-01 outlet ${gas.pout.avg.toFixed(1)} bar. Burner trim from 15 days ago is holding.` },
  ];

  /* the top decisions for today, worst risk first then ₹ */
  const a = alarms(c);
  const sunday = (() => { const t = istMidnight(db.anchor); for (let i = 1; i <= 7; i++) { const d = new Date(t + i * D + IST); if (d.getUTCDay() === 0) return t + i * D + 6 * H; } return t + 2 * D; })();
  const peakHour = profile.reduce((m, p) => (p.kva > m.kva ? p : m), profile[0] || { kva: 0, t: y0 });
  const appr = id => (demo.approvals || []).find(x => x.id === id);
  const sp = (asset) => (demo.setpoints || []).find(x => x.asset === asset);
  const decisions = [
    { n: 1, title: 'Return HF-01 to service and cap TR-02 at 60 % load', area: 'Power', owner: 'Electrical head',
      ask: 'Approve the fan swap from the electrical store today and sequence CH-02 behind CH-01 until HF-01 is back.',
      why: a.find(x => x.asset === 'TR-02') ? `TR-02 winding at ${fixed(a.find(x => x.asset === 'TR-02').now)} °C (trip 120 °C); insulation ageing about 5 × normal.` : '',
      impact: 'Protects a ₹55 lakh transformer', impactL: 55, kind: 'risk', due: `Today, before the ${hourIST(peakHour.t)} peak`, cost: 'Spare in store' },
    { n: 2, title: 'Approve PR 1300 4471 · 14 steam traps', area: 'Steam', owner: 'Utilities manager',
      ask: 'Approve ₹2.9 lakh so the 8 leaking and 3 choked traps on STZ-01 are replaced this week.',
      why: `${fmtIN(steam.loss.avg)} kg/h of live steam is lost; steam per unit is up from 13.4 to ${steam.spu.avg.toFixed(1)} kg.`,
      impact: '₹42 lakh/yr saved', impactL: 42, kind: 'save', due: 'Today · payback about 4 weeks', cost: '₹2,90,000', approval: appr('a3')?.title },
    { n: 3, title: 'Approve the BB-01 Sunday shutdown (WO 4300 2216)', area: 'Power', owner: 'Electrical head',
      ask: `Approve a 4 h section shutdown ${dateIST(sunday)} 06:00 with BC-01 closed, once HF-01 is back.`,
      why: a.find(x => x.asset === 'BB-01') ? `Y-phase joint at ${fixed(a.find(x => x.asset === 'BB-01').now)} °C against 58–61 °C on R and B; above 30 °C phase difference is a major defect.` : '',
      impact: 'Avoids a PCC flashover', impactL: 1.3, kind: 'risk', due: `Sat ${dateIST(sunday - D).replace(/^\w+ /, '')}, to issue the permit`, cost: '₹48,500' },
  ];
  const pending = [
    { title: `Header pressure ${sp('AR-01')?.current} → ${sp('AR-01')?.recommended} bar (AR-01)`, impactL: lakhOf(sp('AR-01')?.gain), owner: 'Utilities manager' },
    { title: 'Brush-clean CH-02 condenser tubes (one shift)', impactL: 19, owner: 'HVAC in-charge' },
    { title: `CT fan approach setpoint ${sp('CT-01')?.current} → ${sp('CT-01')?.recommended} °C`, impactL: lakhOf(sp('CT-01')?.gain), owner: 'HVAC in-charge' },
  ];
  return { y0, y1, metrics, profile, peakHour, solarKwh: sol.sum, utilities, alarms: a, decisions, pending, tod: TARIFF.tod };
}

/* ---------- monthly review: last 30 days vs previous 30 days ---------- */
export function emsMonth(c) {
  const { demo, db, tools } = c;
  const t1 = db.anchor, t0 = t1 - 30 * D, s0 = t0 - 30 * D;
  const iso = t => new Date(t).toISOString();
  const eC = tools.get_energy({ from: iso(t0), to: iso(t1) }), eP = tools.get_energy({ from: iso(s0), to: iso(t0) });
  const kp = demo.kpis.map(k => {
    const cur = db.kpiSummary(k.id, t0, t1), prev = db.kpiSummary(k.id, s0, t0);
    const gap = k.target - k.base, prog = gap ? (cur.value - k.base) / gap : 1;
    const next = r(cur.value + (k.target - cur.value) * 0.3, k.dec);
    return { ...k, cur: cur.value, prev: prev.value, improvePct: cur.improvePct, prog: Math.max(0, Math.min(1, prog)), progPrev: Math.max(0, Math.min(1, gap ? (prev.value - k.base) / gap : 1)), status: cur.status, next,
      better30: k.better === 'up' ? cur.value > prev.value : cur.value < prev.value };
  });
  const K = id => kp.find(x => x.id === id);
  const rate = K('cost').cur, rateP = K('cost').prev;
  const kwh = eC.energy_kwh, kwhP = eP.energy_kwh;

  /* fuels */
  const T = (a, t, f, to) => sumTag(db, a, t, f, to);
  const png = T('GMS-01', 'flow', t0, t1).sum, pngP = T('GMS-01', 'flow', s0, t0).sum;
  const bio = T('BLR-02', 'fuel_feed', t0, t1).sum, bioP = T('BLR-02', 'fuel_feed', s0, t0).sum;
  const sol = T('SOL-01', 'ac_kw', t0, t1).sum, solP = T('SOL-01', 'ac_kw', s0, t0).sum;
  const steam = T('SH-01', 'total_flow', t0, t1).sum, steamP = T('SH-01', 'total_flow', s0, t0).sum;
  const trapLoss = T('STZ-01', 'steam_loss', t0, t1).sum / 1000, trapLossP = T('STZ-01', 'steam_loss', s0, t0).sum / 1000;
  const fuels = [
    { name: 'Grid electricity', qty: kwh, unit: 'kWh', mwh: kwh / 1000, inr: kwh * rate, inrP: kwhP * rateP, qtyP: kwhP },
    { name: TARIFF.png.label, qty: png, unit: 'Sm³', mwh: png * TARIFF.png.kwhPerScm / 1000, inr: png * TARIFF.png.rate, inrP: pngP * TARIFF.png.rate, qtyP: pngP },
    { name: TARIFF.biomass.label, qty: bio, unit: 't', mwh: bio * TARIFF.biomass.kwhPerT / 1000, inr: bio * TARIFF.biomass.rate, inrP: bioP * TARIFF.biomass.rate, qtyP: bioP },
    { name: 'Rooftop solar (own)', qty: sol, unit: 'kWh', mwh: sol / 1000, inr: 0, inrP: 0, qtyP: solP },
  ];
  const totalInr = fuels.reduce((n, f) => n + f.inr, 0), totalInrP = fuels.reduce((n, f) => n + f.inrP, 0);
  const totalMwh = fuels.reduce((n, f) => n + f.mwh, 0);

  /* significant energy uses: electrical areas from sub-metering, thermal users from fuel meters */
  const effOf = { 'Process MCCs': 'sec', 'HVAC & chilled water': 'kwtr', 'Compressed air': 'air', 'Steam & boiler auxiliaries': 'blreff' };
  const seus = demo.energy.areas.map(([name, share]) => ({ name, type: 'Electricity', mwh: kwh * share / 100000, mwhP: kwhP * share / 100000, inr: kwh * share / 100 * rate, kpi: K(effOf[name]) }))
    .concat([
      { name: 'Gas boiler BLR-01 + TFH-01', type: 'PNG', mwh: fuels[1].mwh, mwhP: pngP * TARIFF.png.kwhPerScm / 1000, inr: fuels[1].inr, kpi: null, eff: `${T('BLR-01', 'efficiency', t0, t1).avg.toFixed(1)} % boiler efficiency` },
      { name: 'Biomass boiler BLR-02', type: 'Biomass', mwh: fuels[2].mwh, mwhP: bioP * TARIFF.biomass.kwhPerT / 1000, inr: fuels[2].inr, kpi: null, eff: `${T('BLR-02', 'efficiency', t0, t1).avg.toFixed(1)} % boiler efficiency` },
    ]).sort((a, b) => b.mwh - a.mwh);
  const seuTotal = seus.reduce((n, s) => n + s.mwh, 0);
  let cum = 0; seus.forEach(s => { cum += s.mwh; s.cumPct = cum / seuTotal * 100; s.sharePct = s.mwh / seuTotal * 100; s.significant = s.cumPct - s.sharePct < 80 ? 'Consumption' : (s.kpi && s.kpi.prog < 0.6 ? 'Improvement potential' : ''); });

  /* cost build-up, scaled to the 30-day average rate */
  const elSum = demo.cost.elements.reduce((n, e) => n + e[1], 0);
  const elements = demo.cost.elements.map(([name, v]) => ({ name, perKwh: v * rate / elSum, inr: kwh * v * rate / elSum }));
  const bridge = demo.cost.bridge.map(([name, d]) => ({ name, d }));
  const mdDays = db.kpiDaily('md').filter(p => p.t > t0 && p.t <= t1), mdPrev = db.kpiDaily('md').filter(p => p.t > s0 && p.t <= t0);
  const mdMax = Math.max(...mdDays.map(p => p.v)), mdMaxP = Math.max(...mdPrev.map(p => p.v));
  const dCharge = elements.find(e => /demand/i.test(e.name))?.inr || 0;
  const mdTarget = kpi(demo, 'md').target;
  const demand = { max: mdMax, maxP: mdMaxP, contract: demo.energy.contractKVA, target: mdTarget, charge: dCharge, rate: dCharge / mdMax,
    overTarget: mdDays.filter(p => p.v > mdTarget).length, days: mdDays.length, toTargetLyr: (mdMax - mdTarget) * (dCharge / mdMax) * 12 / 1e5 };

  /* anomalies: open from the model, closed from plant data */
  const open = alarms(c);
  const closed = CLOSED.map(x => ({ ...x, closedAt: istMidnight(t1) - x.daysAgo * D, openedAt: istMidnight(t1) - x.opened * D }));

  /* actions register */
  const stOf = s => ({ applied: 'Done', approved: 'In progress', proposed: 'Awaiting approval' }[s] || 'Planned');
  const utilOf = { AR: 'Compressed air', CH: 'Chilled water', CT: 'Chilled water', BLR: 'Steam', APFC: 'Power' };
  const own = id => kpi(demo, id)?.owner || 'Energy manager';
  const actions = [
    ...(demo.setpoints || []).map(s => ({ title: `${s.name}: ${s.current} → ${s.recommended}${s.unit ? ' ' + s.unit : ''} (${s.asset})`, util: utilOf[s.asset.split('-')[0]] || 'Power', owner: own(s.kpi), lakhYr: lakhOf(s.gain), status: stOf(s.status), due: s.status === 'applied' ? 'Applied 18 Nov' : s.status === 'approved' ? '7 days' : 'Needs approval' })),
    { title: 'Ultrasonic leak walk-down, close 9 open leak tags (process block)', util: 'Compressed air', owner: 'Utilities manager', lakhYr: 36, status: 'In progress', due: 'This week' },
    { title: 'Replace 8 leaking and clear 3 choked traps on STZ-01', util: 'Steam', owner: 'Utilities manager', lakhYr: 42, status: 'Awaiting approval', due: 'PR ₹2.9 lakh' },
    { title: 'Brush-clean CH-02 condenser; repair CT-02 blowdown valve', util: 'Chilled water', owner: 'HVAC in-charge', lakhYr: 19, status: 'Planned', due: 'Next shift window' },
    { title: 'Replace HF-01 cooling fan, return filter to service', util: 'Power', owner: 'Electrical head', lakhYr: 0, status: 'In progress', due: 'Today' },
    { title: 'Re-torque BB-01 Y-phase joint, thermography after', util: 'Power', owner: 'Electrical head', lakhYr: 1.3, status: 'Awaiting approval', due: 'Sunday 06:00' },
    ...DONE.map(x => ({ title: x.title, util: x.util, owner: x.owner, lakhYr: x.lakhYr, status: 'Done', due: `Closed ${dateIST(istMidnight(t1) - x.daysAgo * D)}` })),
  ];
  const order = ['Awaiting approval', 'In progress', 'Planned', 'Done'];
  const byStatus = order.map(s => ({ status: s, n: actions.filter(a => a.status === s).length, lakhYr: actions.filter(a => a.status === s).reduce((n, a) => n + a.lakhYr, 0) }));
  actions.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.lakhYr - a.lakhYr);

  /* SEC daily for the last 60 days */
  const secTrend = db.kpiDaily('sec').filter(p => p.t > s0 && p.t <= t1);
  const realisedL = demo.kpis.reduce((n, k) => n + (k.lakh || 0), 0);
  return { t0, t1, s0, kp, K, kwh, kwhP, rate, rateP, fuels, totalInr, totalInrP, totalMwh, seus, seuTotal, elements, bridge, demand, open, closed, actions, byStatus,
    secTrend, realisedL, trapLoss, trapLossP, steam, steamP, sol, solP, capex: CAPEX, budget: TARIFF.budgetPerKwh, steamRate: TARIFF.steamPerT };
}

/* ---------- formatting (IST, Indian grouping) ---------- */
export function fmtIN(v, d = 0) { return v == null || Number.isNaN(v) ? '—' : (+v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }); }
export function hourIST(t) { return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }); }
export function dateIST(t, opts = { weekday: 'short', day: 'numeric', month: 'short' }) { return new Date(t).toLocaleDateString('en-GB', { ...opts, timeZone: 'Asia/Kolkata' }); }
