/* HTML decision reports for Energy & utilities (Meridian Industrial Park). Each takes c = { demo, db, tools } and returns a
   complete self-contained HTML page (inline CSS + inline SVG, no scripts) in the Faclon Labs style.

   emsBrief  · Daily energy briefing. Reader: plant head and energy manager at the 08:00 meeting.
               Answers: what did yesterday cost and was it on target? what must be decided today, by whom, worth how much?
               which alarms fired and why? which utility is in trouble? how close did we run to contract demand, and when?
   emsReview · Monthly energy review in ISO 50001 management-review form (clause 9.3 inputs): EnPIs vs baseline (EnB) and target,
               significant energy uses, cost and tariff, anomalies with RCA, action status, and the decisions asked of management
               (capex, contract demand, next month's targets). Last 30 days vs the previous 30 days. */
import { emsDay, emsMonth, fmtIN, hourIST, dateIST } from '../../shared/analytics/ems-rep.js';
import { esc, n, inr, pct, page, header, rail, pill, delta, metric, loadProfile, bullet, hbar, trendLine, stack } from './ems-ui.js';

const long = t => dateIST(t, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const short = t => dateIST(t, { day: 'numeric', month: 'short' });

/* =========================== daily energy briefing =========================== */
export function emsBrief(c) {
  const { demo } = c;
  const d = emsDay(c), m = d.metrics;
  const yLbl = short(d.y0), pLbl = short(d.y0 - 864e5);
  const over = m.cost.y - m.cost.budget;
  const alarmsBad = d.alarms.filter(a => a.severity === 'bad');
  const headline = `Yesterday cost ${inr(m.cost.y)} for ${n(m.energy.y / 1000, 1)} MWh, ${over > 0 ? `${inr(over, 2)} over` : `${inr(-over, 2)} under`} the ₹7.70/kWh budget. ${alarmsBad.length ? `${alarmsBad.map(a => a.asset).join(' and ')} ${alarmsBad.length > 1 ? 'are' : 'is'} in alarm and need${alarmsBad.length > 1 ? '' : 's'} a decision before the afternoon peak.` : 'No electrical alarm is open.'}`;

  const cards = [
    metric({ label: 'Grid energy', value: n(m.energy.y / 1000, 1), unit: 'MWh', lines: [`${delta(m.energy.y, m.energy.p, 'down')} vs ${esc(pLbl)}`, `30-day average ${n(m.energy.avg30 / 1000, 1)} MWh`] }),
    metric({ label: 'Electricity cost', value: inr(m.cost.y).replace(' lakh', ''), unit: 'lakh', lines: [`${delta(m.cost.y, m.cost.p, 'down')} vs ${esc(pLbl)}`, `Budget ${inr(m.cost.budget)} · ₹${n(m.cost.rateY, 2)} vs ₹7.70/kWh`] }),
    metric({ label: 'Maximum demand (15-min)', value: n(m.md.y), unit: 'kVA', lines: [`${delta(m.md.y, m.md.p, 'down')} vs ${esc(pLbl)}`, `${n(m.md.y / m.contract * 100, 0)} % of ${n(m.contract)} kVA contract · target ${n(m.md.k.target)}`] }),
    metric({ label: 'Plant specific energy (SEC)', value: n(m.sec.y, 2), unit: 'kWh/unit', prog: (m.sec.k.base - m.sec.y) / (m.sec.k.base - m.sec.k.target), lines: [`${delta(m.sec.y, m.sec.p, 'down')} vs ${esc(pLbl)}`, `Baseline ${n(m.sec.k.base, 2)} → target ${n(m.sec.k.target, 2)}`] }),
    metric({ label: 'Power factor (billing meter)', value: n(m.pf.y, 3), unit: '', prog: (m.pf.y - m.pf.k.base) / (m.pf.k.target - m.pf.k.base), lines: [`${delta(m.pf.y, m.pf.p, 'up', { asPct: false, dec: 3 })} vs ${esc(pLbl)}`, `Baseline ${n(m.pf.k.base, 3)} → target ${n(m.pf.k.target, 3)}`] }),
    metric({ label: 'Renewable share', value: n(m.re.y, 1), unit: '%', prog: (m.re.y - m.re.k.base) / (m.re.k.target - m.re.k.base), lines: [`${delta(m.re.y, m.re.p, 'up', { asPct: false, dec: 1, unit: 'pts' })} vs ${esc(pLbl)}`, `Rooftop ${n(d.solarKwh / 1000, 1)} MWh + green tariff · target ${n(m.re.k.target, 0)} %`] }),
  ].join('');

  const decisions = d.decisions.map(x => `<div class="card${x.n === 1 ? ' hi' : ''} dec"><div class="num">${x.n}</div>
<div><h3>${esc(x.title)}</h3><div class="sub" style="margin:0 0 4px">${esc(x.why)}</div><div>${esc(x.ask)}</div>
<div class="kv">Owner <b>${esc(x.owner)}</b> · Decide by <b>${esc(x.due)}</b> · Cost <b>${esc(x.cost)}</b></div></div>
<div class="imp"><b class="${x.kind === 'save' ? 'good' : 'bad'}">${esc(x.impact)}</b><span class="kv">${x.kind === 'save' ? 'Recurring saving' : 'Risk if not done'} · ${esc(x.area)}</span></div></div>`).join('');
  const saveL = d.decisions.filter(x => x.kind === 'save').reduce((a, x) => a + x.impactL, 0) + d.pending.reduce((a, x) => a + x.impactL, 0);

  const util = d.utilities.map(u => `<tr><td><b>${esc(u.name)}</b> <span class="only-ni">${pill(u.state)}</span></td><td class="only-w">${pill(u.state)}</td><td data-l="Used">${esc(u.use)}</td><td data-l="Efficiency"><b>${esc(u.eff)}</b><span class="s">${esc(u.note)}</span></td></tr>`).join('');

  const alarms = d.alarms.map(a => {
    const isNew = a.crossedAt >= d.y0;
    return `<tr><td><b>${esc(a.asset)}</b><span class="s">${esc(a.tagName)}</span></td><td>${pill(a.severity === 'bad' ? 'Alarm' : 'Watch')}${isNew ? ' <span class="pill p-info">New</span>' : ''}</td>
<td class="r" data-l="Now">${n(a.now, a.now < 10 ? 2 : 1)} ${esc(a.unit)}<span class="s">limit ${n(a.limit, a.limit < 10 ? 2 : 0)} ${esc(a.unit)}</span></td>
<td data-l="Since">${esc(short(a.crossedAt))}, ${esc(hourIST(a.crossedAt))}</td><td data-l="RCA">${esc(a.rca)}<span class="s">Confidence ${Math.round((a.confidence || 0) * 100)} % · ${esc(a.owner)}</span></td></tr>`;
  }).join('');

  const body = `${header(`<b>Daily energy briefing</b><br>${esc(demo.company)} · ${esc(demo.site)}, ${esc(demo.location.split(',')[0])}<br>Day reported: ${esc(long(d.y0))} (IST)`)}
<div class="eyebrow" style="margin-top:16px">What happened yesterday · what needs a decision today</div>
<h1>${esc(headline)}</h1>
<p class="lede">Grid energy, cost, demand and the ISO 50001 energy performance indicators for ${esc(yLbl)}, compared with ${esc(pLbl)} and with target. Below them: the three decisions for today with their ₹ impact, owner and deadline, the alarms with root cause, and the state of each utility.</p>
<div class="grid g3">${cards}</div>
<div class="cap">Arrows show the change against ${esc(pLbl)}; green is better, red is worse. Bars show progress from the 3-month baseline before go-live to target.</div>
${rail('Decisions needed today', 'blue')}
<div class="grid" style="gap:10px">${decisions}</div>
<div class="grid g21" style="margin-top:12px;align-items:start">
<div><div class="eyebrow" style="margin:4px 0 8px">Also waiting for approval</div><div class="chips">${d.pending.map(p => `<span class="chip">${esc(p.title)} · <b>₹${n(p.impactL, 0)} lakh/yr</b> · ${esc(p.owner)}</span>`).join('')}</div></div>
<div class="value"><b class="t">₹${n(saveL, 0)} lakh a year on the table</b>The steam-trap purchase and the three waiting items together. The electrical items protect TR-02 and the main PCC; they are not counted as savings.</div></div>
${rail('Load and utilities yesterday')}
<div class="card"><h3>Hourly load against contract demand</h3><div class="sub">Hourly average kVA at the 33 kV billing meter, ${esc(yLbl)}. The 15-min billing peak was ${n(m.md.y)} kVA; contract ${n(m.contract)} kVA.</div>
${loadProfile({ points: d.profile, contract: m.contract, target: m.md.k.target, tod: d.tod })}
<div class="legend"><span><i class="sq" style="background:#6F90FF"></i>Hourly kVA</span><span><i class="sq" style="background:#2F55D4"></i>Peak hour ${esc(hourIST(d.peakHour.t))}</span><span><i class="sq" style="background:#F1F5FA;border:1px solid #CBD5E2"></i>ToD peak tariff hours</span></div>
<div class="cap">Peak-tariff hours carry the ToD surcharge; the highest hour fell ${d.tod.some(([a, b]) => { const h = +hourIST(d.peakHour.t).slice(0, 2); return h >= a && h < b; }) ? 'inside' : 'outside'} them, so chiller sequencing (decision 1) also trims demand.</div></div>
<div class="tw" style="margin-top:12px"><table class="st"><thead><tr><th>Utility</th><th class="only-w">Status</th><th>Used yesterday</th><th>Efficiency and note</th></tr></thead><tbody>${util}</tbody></table></div>
${rail('Alarms open and their root cause')}
<div class="tw"><table class="st"><thead><tr><th>Asset</th><th>State</th><th class="r">Now</th><th>Over limit since</th><th>Root cause (agent RCA)</th></tr></thead><tbody>${alarms}</tbody></table></div>
<div class="cap">"New" marks an alarm that first crossed its limit on or after ${esc(yLbl)}. Times are IST, from the tag history.</div>`;
  return page({ title: `Daily energy briefing · ${short(d.y0)}`, desc: headline, body });
}

/* =========================== monthly energy review =========================== */
export function emsReview(c) {
  const { demo } = c;
  const M = emsMonth(c);
  const per = `${short(M.t0 + 864e5)} – ${dateIST(M.t1, { day: 'numeric', month: 'short', year: 'numeric' })}`, perP = `${short(M.s0 + 864e5)} – ${short(M.t0)}`;
  const sec = M.K('sec'), md = M.K('md');
  const openL = M.actions.filter(a => a.status !== 'Done').reduce((s, a) => s + a.lakhYr, 0);
  const closedL = M.closed.reduce((s, x) => s + x.lakhYr, 0);
  const costChg = pct(M.totalInr, M.totalInrP);
  const headline = `Energy cost ${inr(M.totalInr)} in 30 days, ${costChg <= 0 ? 'down' : 'up'} ${n(Math.abs(costChg), 1)} %. SEC at ${n(sec.cur, 2)} kWh/unit is ${n(sec.improvePct, 1)} % better than baseline, but ${M.open.length} open findings hold it above the ${n(sec.target, 2)} target.`;
  const improved = M.kp.filter(k => k.better30);

  /* 1 executive summary */
  const execCards = [
    metric({ label: 'Energy cost, all fuels', value: inr(M.totalInr).replace(' cr', ''), unit: 'cr', lines: [`${delta(M.totalInr, M.totalInrP, 'down')} vs previous 30 days`, `Grid ${inr(M.fuels[0].inr)} · PNG ${inr(M.fuels[1].inr)} · biomass ${inr(M.fuels[2].inr)}`] }),
    metric({ label: 'Plant specific energy (SEC)', value: n(sec.cur, 2), unit: 'kWh/unit', prog: sec.prog, lines: [`${delta(sec.cur, sec.prev, 'down')} vs previous 30 days`, `Baseline ${n(sec.base, 2)} → target ${n(sec.target, 2)}`] }),
    metric({ label: 'Highest 15-min demand', value: n(M.demand.max), unit: 'kVA', lines: [`${delta(M.demand.max, M.demand.maxP, 'down')} vs previous 30 days`, `${n(M.demand.max / M.demand.contract * 100, 0)} % of ${n(M.demand.contract)} kVA contract`] }),
    metric({ label: 'Savings realised vs baseline', value: `₹${n(M.realisedL, 0)}`, unit: 'lakh/yr', lines: [`From ${demo.kpis.filter(k => k.lakh).length} EnPIs, against the energy baseline`, `${improved.length} of ${M.kp.length} EnPIs better than last month`] }),
  ].join('');
  const well = [
    `${improved.length} of ${M.kp.length} EnPIs improved on the previous 30 days; SEC fell from ${n(sec.prev, 2)} to ${n(sec.cur, 2)} kWh/unit and blended power cost from ₹${n(M.rateP, 2)} to ₹${n(M.rate, 2)}/kWh.`,
    `${M.closed.length} anomalies closed with RCA, worth ₹${n(closedL, 0)} lakh a year (APFC steps, AHU schedules, TFH-01 burner, RO-01 CIP, DG-02 load sharing).`,
    `Highest demand fell from ${n(M.demand.maxP)} to ${n(M.demand.max)} kVA; power factor averaged ${n(M.K('pf').cur, 3)}.`,
  ];
  const attn = [
    `TR-02 winding (HF-01 filter offline) and BB-01 Y-phase joint are in alarm: an electrical risk to the main PCC, not a saving.`,
    `Steam lost through failed STZ-01 traps rose from ${n(M.trapLossP, 0)} t to ${n(M.trapLoss, 0)} t (${inr(M.trapLoss * M.steamRate)} this month); condensate recovery is ${n(M.K('cond').cur, 0)} % against 80 %.`,
    `Compressed-air leak load reached 30 % and CH-02 runs at 0.80 kW/TR from condenser fouling; together about ₹55 lakh a year.`,
    `Maximum demand sat above the ${n(M.demand.target)} kVA target on ${M.demand.overTarget} of ${M.demand.days} days.`,
  ];

  /* 2 EnPIs */
  const enpiRows = M.kp.map(k => `<tr><td><b>${esc(k.name.replace(/ \(contract.*\)/, ''))}</b><span class="s">${esc(k.unit || 'ratio')} · ${esc(k.owner)}</span></td>
<td class="r">${n(k.base, k.dec)}</td><td class="r">${n(k.prev, k.dec)}</td><td class="r"><b>${n(k.cur, k.dec)}</b></td><td class="r">${delta(k.cur, k.prev, k.better)}</td><td class="r">${n(k.target, k.dec)}</td>
<td>${bullet(k.prog, k.progPrev)}<span class="s">${Math.round(k.prog * 100)} % of the way · ${n(k.improvePct, 1)} % vs EnB</span></td><td>${pill(k.status)}</td></tr>`).join('');

  /* 3 SEUs */
  const maxMwh = Math.max(...M.seus.map(s => s.mwh));
  const seuRows = M.seus.map(s => `<tr><td><b>${esc(s.name)}</b><span class="s">${esc(s.type)}</span></td><td class="r">${n(s.mwh, 0)}</td>
<td style="white-space:nowrap">${hbar(s.mwh, maxMwh, s.type === 'Electricity' ? '#2F55D4' : '#008DD2', 90)} <span class="s" style="display:inline">${n(s.sharePct, 1)} %</span></td><td class="r">${inr(s.inr)}</td>
<td>${s.kpi ? `${esc(s.kpi.name.replace(/ \(.*\)/, ''))}: <b>${n(s.kpi.cur, s.kpi.dec)}</b> ${esc(s.kpi.unit)}<span class="s">target ${n(s.kpi.target, s.kpi.dec)} · ${Math.round(s.kpi.prog * 100)} % of gap closed</span>` : esc(s.eff || 'Not sub-metered for an EnPI')}</td>
<td>${s.significant ? pill(s.significant === 'Consumption' ? 'SEU · consumption' : 'SEU · potential') : '<span class="s">—</span>'}</td></tr>`).join('');

  /* 4 cost */
  const fuelCards = M.fuels.map(f => `<div class="card muted mc"><div class="lbl">${esc(f.name)}</div><div class="val" style="font-size:24px">${f.inr ? inr(f.inr) : `${n(f.mwh, 0)} <small>MWh</small>`}</div>
<div class="d">${n(f.qty, 0)} ${esc(f.unit)} · ${f.inr ? delta(f.inr, f.inrP, 'down') + ' vs previous' : delta(f.qty, f.qtyP, 'up') + ' generation'}</div></div>`).join('');
  const maxEl = Math.max(...M.elements.map(e => e.inr));
  const elRows = M.elements.map(e => `<tr><td>${esc(e.name)}</td><td class="r">₹${n(e.perKwh, 2)}</td><td class="r">${inr(e.inr)}</td><td class="hide-s">${hbar(e.inr, maxEl, '#2F55D4', 90)}</td></tr>`).join('')
    + `<tr class="tot"><td>Blended electricity</td><td class="r">₹${n(M.rate, 2)}</td><td class="r">${inr(M.fuels[0].inr)}</td><td class="hide-s"></td></tr>`;
  const maxB = Math.max(...M.bridge.map(b => Math.abs(b.d)));
  const brRows = M.bridge.map(b => `<tr><td>${esc(b.name)}</td><td class="r ${b.d > 0 ? 'bad' : 'good'}">${b.d > 0 ? '+' : '−'}₹${n(Math.abs(b.d), 2)}</td><td class="r">${b.d > 0 ? '+' : '−'}${inr(Math.abs(b.d) * M.kwh)}</td><td class="hide-s">${hbar(Math.abs(b.d), maxB, b.d > 0 ? '#B66363' : '#008542', 80)}</td></tr>`).join('');

  /* 5 anomalies */
  const openRows = M.open.map(a => `<tr><td><b>${esc(a.asset)}</b> ${pill('Open')}</td><td>${esc(a.title)}<span class="s">RCA: ${esc(a.rca)} (${Math.round((a.confidence || 0) * 100)} %)</span></td><td data-l="Since">${esc(short(a.crossedAt))}</td><td data-l="Owner">${esc(a.owner)}</td></tr>`).join('');
  const closedRows = M.closed.map(x => `<tr><td><b>${esc(x.asset)}</b> ${pill('Closed')}</td><td>${esc(x.title)}<span class="s">RCA and fix: ${esc(x.rca)}</span></td><td data-l="Closed">${esc(short(x.closedAt))}</td><td class="r" data-l="Value">₹${n(x.lakhYr, 0)} lakh/yr</td></tr>`).join('');

  /* 6 actions */
  const stColor = { 'Awaiting approval': '#D6A614', 'In progress': '#2F55D4', Planned: '#6F90FF', Done: '#008542' };
  const totA = M.byStatus.reduce((s, b) => s + b.lakhYr, 0);
  const actRows = M.actions.map(a => `<tr><td>${esc(a.title)}<span class="s">${esc(a.util)} · ${esc(a.owner)}</span></td><td>${pill(a.status)}</td><td data-l="Due">${esc(a.due)}</td><td class="r" data-l="Value">${a.lakhYr ? `₹${n(a.lakhYr, a.lakhYr % 1 ? 1 : 0)} lakh` : '<span class="s">Risk</span>'}</td></tr>`).join('');

  /* 7 decisions */
  const capex = M.capex.map(x => ({ ...x, payback: x.lakhYr ? x.capexL / x.lakhYr * 12 : null }));
  const nextRows = M.kp.filter(k => k.id !== 'cost' || true).map(k => `<tr><td>${esc(k.name.replace(/ \(.*\)/, ''))}</td><td class="r">${n(k.cur, k.dec)} ${esc(k.unit)}</td><td class="r"><b>${n(k.next, k.dec)} ${esc(k.unit)}</b></td><td class="r">${n(k.target, k.dec)} ${esc(k.unit)}</td><td>${esc(k.owner)}</td></tr>`).join('');
  const decs = [
    { t: `Approve capex: ${capex[0].title}`, ask: `₹${n(capex[0].capexL, 0)} lakh. ${capex[0].why}`, imp: `₹${n(capex[0].lakhYr, 0)} lakh/yr · payback ${n(capex[0].payback, 0)} months`, good: true },
    { t: `Approve capex: ${capex[1].title}`, ask: `₹${n(capex[1].capexL, 0)} lakh. ${capex[1].why}`, imp: 'Risk: transformer and PCC', good: false },
    { t: `Hold contract demand at ${n(M.demand.contract)} kVA; set an MD control target of ${n(M.demand.target)} kVA`, ask: `Highest demand was ${n(M.demand.max)} kVA (previous month ${n(M.demand.maxP)}). Cutting the contract to 7,600 kVA would leave about 1 % headroom and risk excess-demand penalties. Demand charge is ${inr(M.demand.charge)} a month (₹${n(M.demand.rate, 0)}/kVA), so holding MD at the target through load staggering is worth the saving shown. Review the contract in February with 90 days of data after HF-01 and chiller sequencing are fixed.`, imp: `₹${n(M.demand.toTargetLyr, 0)} lakh/yr at ${n(M.demand.target)} kVA`, good: true },
    { t: 'Release PR 1300 4471 for 14 steam traps and move STZ-01 to a monthly trap PM', ask: `₹2.9 lakh. Trap losses doubled this month to ${n(M.trapLoss, 0)} t of steam.`, imp: '₹42 lakh/yr · payback 4 weeks', good: true },
    { t: 'Adopt next month\'s EnPI targets (table below)', ask: 'Each target closes 30 % of the remaining gap to the annual target, so the annual targets stay unchanged.', imp: 'Targets for the next review', good: null },
  ];

  const body = `${header(`<b>Monthly energy review</b> · ISO 50001 management review<br>${esc(demo.company)} · ${esc(demo.site)}, ${esc(demo.location.split(',')[0])}<br>Period ${esc(per)} vs ${esc(perP)}`)}
<div class="eyebrow" style="margin-top:16px">Energy performance · last 30 days</div>
<h1>${esc(headline)}</h1>
<p class="lede">This review follows the ISO 50001:2018 management review inputs: energy performance indicators against the energy baseline (EnB, the 3 months before go-live) and target, significant energy uses, cost and tariff, anomalies with root cause, the status of actions, and the decisions we ask management to take for next month.</p>

${rail('1 · Executive summary', 'blue')}
<div class="grid g4">${execCards}</div>
<div class="grid g2" style="margin-top:12px">
<div class="card"><h3 class="good">What improved</h3><ul class="ol">${well.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
<div class="card"><h3 class="bad">What needs management attention</h3><ul class="ol">${attn.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
<div class="info" style="margin-top:12px"><b>ISO 50001 clause 9.3 inputs covered:</b> EnPIs and energy performance (section 2), significant energy uses (3), cost and tariff (4), nonconformities and corrective actions (5), status of actions from previous reviews (6), objectives, targets and resources (7).</div>

${rail('2 · Energy performance indicators vs baseline and target')}
<div class="card" style="padding:6px 8px"><div class="tw"><table class="wide"><thead><tr><th>EnPI</th><th class="r">Baseline</th><th class="r">Prev 30 d</th><th class="r">Last 30 d</th><th class="r">Change</th><th class="r">Target</th><th>Baseline → target</th><th>Status</th></tr></thead><tbody>${enpiRows}</tbody></table></div>
<div class="legend" style="padding:4px 8px"><span><i style="background:#2F55D4"></i>Last 30 days</span><span><i style="background:#40566D;width:3px;height:12px"></i>Previous 30 days</span><span><i style="background:#008542;width:3px;height:12px"></i>Target</span></div></div>
<div class="card" style="margin-top:12px"><h3>Figure 1 · Plant SEC, daily, last 60 days</h3><div class="sub">kWh per unit of finished output (ERP). The last 30 days averaged ${n(sec.cur, 2)} against ${n(sec.prev, 2)} before; the line is still ${n(sec.cur - sec.target, 2)} kWh/unit above target, the gap the open findings in section 5 explain.</div>
${trendLine({ points: M.secTrend, base: sec.base, target: sec.target, splitAt: M.t0, unit: 'kWh/unit', dec: 2 })}</div>

${rail('3 · Significant energy uses')}
<p class="sub">All energy types on one basis (MWh). Thermal fuels converted at net calorific value: PNG 10.0 kWh/Sm³, biomass briquettes 4,420 kWh/t. A use is significant when it falls in the top 80 % of consumption, or when its EnPI is less than 60 % of the way to target.</p>
<div class="card" style="padding:6px 8px"><div class="tw"><table class="wide"><thead><tr><th>Energy use</th><th class="r">MWh</th><th>Share</th><th class="r">Cost</th><th>Efficiency (EnPI)</th><th>SEU</th></tr></thead><tbody>${seuRows}
<tr class="tot"><td>Total</td><td class="r">${n(M.seuTotal, 0)}</td><td><span class="s" style="display:inline">${delta(M.seuTotal, M.seus.reduce((a, x) => a + x.mwhP, 0), 'down')} vs previous</span></td><td class="r">${inr(M.totalInr)}</td><td colspan="2"></td></tr></tbody></table></div>
<div class="legend" style="padding:4px 8px"><span><i class="sq" style="background:#2F55D4"></i>Electricity (sub-metered share of grid kWh)</span><span><i class="sq" style="background:#008DD2"></i>Thermal fuel</span></div></div>

${rail('4 · Cost and tariff')}
<div class="grid g4">${fuelCards}</div>
<div class="grid g2" style="margin-top:12px;align-items:start">
<div class="card" style="padding:6px 8px"><h3 style="padding:6px 8px 0">Electricity bill build-up</h3><div class="tw"><table><thead><tr><th>Element</th><th class="r">₹/kWh</th><th class="r">30 days</th><th class="hide-s"></th></tr></thead><tbody>${elRows}</tbody></table></div></div>
<div><div class="card" style="padding:6px 8px"><h3 style="padding:6px 8px 0">Why we are above the ₹${n(M.budget, 2)}/kWh budget</h3><div class="tw"><table><thead><tr><th>Driver</th><th class="r">₹/kWh</th><th class="r">30 days</th><th class="hide-s"></th></tr></thead><tbody>${brRows}</tbody></table></div></div>
<div class="info" style="margin-top:12px"><b>Demand:</b> highest 15-min demand ${n(M.demand.max)} kVA against a ${n(M.demand.contract)} kVA contract. Demand charge ${inr(M.demand.charge)} this month; every 100 kVA held off the peak saves about ₹${n(M.demand.rate * 100 * 12 / 1e5, 1)} lakh a year.</div></div></div>

${rail('5 · Anomalies and root cause')}
<div class="grid g2"><div class="card muted mc"><div class="lbl">Open</div><div class="val">${M.open.length}</div><div class="d">${M.open.filter(a => a.severity === 'bad').length} electrical alarms, ${M.open.filter(a => a.severity !== 'bad').length} efficiency findings</div></div>
<div class="card muted mc"><div class="lbl">Closed this month</div><div class="val">${M.closed.length}</div><div class="d">₹${n(closedL, 0)} lakh/yr recovered, each with RCA</div></div></div>
<h3 style="margin-top:14px">Open</h3><div class="tw"><table class="st"><thead><tr><th>Asset</th><th>Finding and root cause</th><th>Since</th><th>Owner</th></tr></thead><tbody>${openRows}</tbody></table></div>
<h3 style="margin-top:14px">Closed</h3><div class="tw"><table class="st"><thead><tr><th>Asset</th><th>Finding, root cause and fix</th><th>Closed</th><th class="r">Value</th></tr></thead><tbody>${closedRows}</tbody></table></div>

${rail('6 · Actions status')}
<div class="card"><h3>₹${n(totA, 0)} lakh a year across ${M.actions.length} actions</h3><div class="sub">Gross values; the air-leak and header-pressure savings overlap in part.</div>
${stack(M.byStatus.map(b => ({ label: `${b.status}: ₹${n(b.lakhYr, 0)} lakh/yr`, value: b.lakhYr, color: stColor[b.status] })))}
<div class="legend">${M.byStatus.map(b => `<span><i class="sq" style="background:${stColor[b.status]}"></i>${esc(b.status)} · ${b.n} · ₹${n(b.lakhYr, 0)} lakh/yr</span>`).join('')}</div></div>
<div class="tw" style="margin-top:12px"><table class="st"><thead><tr><th>Action</th><th>Status</th><th>Due</th><th class="r">Value per year</th></tr></thead><tbody>${actRows}</tbody></table></div>

${rail('7 · Recommendations and decisions requested', 'grad')}
<div class="grid" style="gap:10px">${decs.map((x, i) => `<div class="card dec${i === 0 ? ' hi' : ''}"><div class="num">${i + 1}</div><div><h3>${esc(x.t)}</h3><div class="sub" style="margin:0">${esc(x.ask)}</div></div><div class="imp"><b class="${x.good === true ? 'good' : x.good === false ? 'bad' : 'flat'}">${esc(x.imp)}</b></div></div>`).join('')}</div>
<h3 style="margin-top:16px">Proposed EnPI targets for next month</h3>
<div class="tw"><table class="mid"><thead><tr><th>EnPI</th><th class="r">Last 30 d</th><th class="r">Next month</th><th class="r">Annual target</th><th>Owner</th></tr></thead><tbody>${nextRows}</tbody></table></div>
<div class="value" style="margin-top:16px"><b class="t">₹${n(openL, 0)} lakh a year still open in the action register</b>Approving decisions 1, 3 and 4 adds ₹${n(capex[0].lakhYr + M.demand.toTargetLyr + 42, 0)} lakh a year for ₹${n(capex[0].capexL + 2.9, 1)} lakh of spend. ₹${n(M.realisedL, 0)} lakh a year is already realised against the baseline.</div>`;
  return page({ title: `Monthly energy review · ${short(M.t1)}`, desc: headline, body });
}
