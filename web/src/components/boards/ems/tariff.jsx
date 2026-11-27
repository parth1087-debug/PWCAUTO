/* Tariff and contract demand advisory (Plan).
   Who uses it: electrical head and plant controller, at the yearly contract demand review and the monthly bill check.
   Questions it answers:
   1. Should we change the contract demand (CD), and what does each option save or risk (excess-demand penalty)?
   2. How much do we pay in each ToD slot, and which loads can move to the night rebate slot for how much?
   3. Is power factor in the best incentive slab, and what is the next slab worth?
   4. What makes up the HT bill (demand, energy, ToD, PF, load factor, duty, green premium)?
   5. Should green power come from the MSEDCL green tariff, open access or group captive?
   Bills are monthly (12 billed months, months inside the selected period are highlighted); the ToD profile follows the period. */
import React, { useMemo } from 'react';
import { useApp } from '../../../App.jsx';
import { Card, Tag, Empty } from '../../ui.jsx';
import { fmtNum } from '../../../lib/data.js';
import { EnStyle, Headline, Tile, inr } from '../../../pages/dash/dash-en-ui.jsx';
import { tariffModel, TARIFF } from '../../../shared/analytics/ems-inv.js';
import { InvStyle, DemandChart, TodProfile, PfChart, LandedBars, Share } from './inv-ui.jsx';

const L = v => v / 1e5;                                  // ₹ → ₹ lakh
const pctS = (v, d = 0) => `${fmtNum(v * 100, d)} %`;
const sgn = v => (v > 0.05 ? '+' : v < -0.05 ? '−' : '');

export default function TariffAdvisory({ c }) {
  const app = useApp();
  const R = app.rng;
  const m = useMemo(() => tariffModel(c.db, c.demo, R), [c.db, c.demo, R.from, R.to]);
  if (!m) return <Card><Empty>The tariff advisory needs an HT grid incomer with maximum demand and power factor. This plant has no such meter.</Empty></Card>;

  const last = m.months[m.months.length - 1], b = last.bill;
  const md12 = Math.max(...m.months.map(x => x.md));
  const exc = m.exceedMonths;
  const recCd = m.options.filter(o => o.pYear <= 0.25 && o.cd <= m.cd).sort((x, y) => x.netL - y.netL)[0] || m.options.find(o => o.cd === m.cd);
  const shiftL = m.shifts.reduce((s, x) => s + x.saveL, 0);
  const gc = m.green.find(g => g.id === 'gc'), gt = m.green.find(g => g.id === 'gt');
  const greenSwitchL = gt.annualL - gc.annualL;
  const pfL = m.pfUpL + m.kvahL;
  const totalL = m.cond.mdSaveL + m.cond.cdSaveL + pfL + shiftL + greenSwitchL;
  const peak = m.slots.filter(s => s.rate > 0).reduce((s, x) => s + x.share, 0);
  const lfNow = m.months.slice(-3).reduce((s, x) => s + x.bill.lf, 0) / 3;
  const greenNowL = L(m.year(x => x.bill.green));

  const billLines = [
    ['Energy charge (kVAh × ₹' + fmtNum(m.E, 2) + ')', b.energy, `${fmtNum(b.kvah / 1e5, 2)} lakh kVAh at PF ${fmtNum(last.pf, 3)}`],
    ['Demand charge', b.demand, `${fmtNum(b.billing)} kVA billing × ₹${TARIFF.demand}`],
    ['Excess demand penalty', b.excess, last.md > m.cd ? `${fmtNum(last.md - m.cd)} kVA above CD at 150 %` : 'MD within contract'],
    ['ToD surcharge 09–12, 18–22', b.todC, `+₹0.80 and +₹1.10/kWh`],
    ['ToD night rebate 22–06', b.todA, `−₹1.50/kWh on ${pctS(last.shares.A)} of energy`],
    ['PF incentive', b.pfInc, `${fmtNum(b.pfPct, 1)} % of energy charge at PF ${fmtNum(last.pf, 3)}`],
    ['Load factor incentive', b.lfInc, `LF ${pctS(b.lf, 1)} → ${fmtNum(b.lfPct, 2)} %`],
    ['Electricity duty 7.5 %', b.ed, 'on the charges above'],
    ['Tax on sale ₹0.18/kWh', b.tose, ''],
    ['Green tariff premium', b.green, `${pctS(m.greenShare)} of energy at +₹${TARIFF.greenPremium}/kWh`],
  ];
  const maxLine = Math.max(...billLines.map(x => Math.abs(x[1])));

  const decisions = [
    { what: `Keep contract demand at ${fmtNum(m.cd)} kVA this year; arm the MD guard at 7,600 kVA`, save: 0, note: `Lower CD saves nothing while MD (about ${fmtNum(Math.round(m.postMd / 10) * 10)} kVA) sits above the 75 % floor; ${pctS(m.options.find(o => o.cd === 7800).pYear)} chance of at least one excess a year at 7,800`, effort: 'Low', owner: 'Electrical head', when: 'Now' },
    { what: `Hold MD at ${fmtNum(c.demo.kpis.find(k => k.id === 'md').target)} kVA: stagger CH-02 start and MCC-01 batches in 18–22`, save: m.cond.mdSaveL, note: `${fmtNum(m.shift, 0)} kVA × ₹${TARIFF.demand} × 12, incl. duty`, effort: 'Low', owner: 'Electrical head', when: 'This month' },
    { what: 'APFC target 0.995 and HF-01 back in service: PF ≥ 0.99 every month', save: pfL, note: `next slab ${inr(m.pfUpL)} + lower kVAh ${inr(m.kvahL)}`, effort: 'Low', owner: 'Electrical head', when: 'This week' },
    { what: 'Move deferrable loads from the evening peak to the night slot', save: shiftL, note: `${m.shifts.length} loads, ₹${fmtNum((1.1 + 1.5) * (1 + TARIFF.ed), 2)}/kWh peak-to-night gap`, effort: 'Medium', owner: 'Production planning', when: 'Next month' },
    { what: `Apply for CD ${fmtNum(m.condCd)} kVA after 6 months with MD ≤ ${fmtNum(c.demo.kpis.find(k => k.id === 'md').target)} kVA`, save: m.cond.cdSaveL, note: `load factor ≥ 75 % in all months keeps the LF incentive (lost in ${m.cond.lfMonthsNow} of 12 months today)`, effort: 'Low', owner: 'Plant controller', when: 'After 6 months at target' },
    { what: `Replace the green tariff with group captive hybrid power (${fmtNum(m.Q / 1e6, 1)} MU/yr)`, save: greenSwitchL, note: `₹${fmtNum(gc.landed, 2)} vs ₹${fmtNum(gt.landed, 2)}/kWh landed · equity ${gc.capex}`, effort: 'High', owner: 'Sustainability head', when: 'RFQ this quarter' },
  ];
  const decCsv = () => decisions.map(d => ({ action: d.what, saving_inr_lakh_yr: d.save.toFixed(1), basis: d.note, effort: d.effort, owner: d.owner, when: d.when }));

  return (
    <div className="grid" style={{ gap: 16 }}>
      <EnStyle /><InvStyle />
      <Headline>
        <span><b>Keep the contract demand at {fmtNum(m.cd)} kVA.</b> Since the EMS went live the monthly peak runs at about {fmtNum(Math.round(m.postMd / 10) * 10)} kVA (daily MD KPI {fmtNum(c.demo.kpis.find(k => k.id === 'md').cur)} kVA), so the 75 % floor ({fmtNum(0.75 * m.cd)} kVA) never sets the bill and a lower CD saves nothing yet, only adds excess-demand risk.
          {' '}The money is in how and where power is bought: <b>{inr(totalL)}/yr</b> in {decisions.length - 1} changes, led by group captive green power ({inr(greenSwitchL)}), PF at 0.99 or above ({inr(pfL)}) and holding MD at target ({inr(m.cond.mdSaveL)}).</span>
      </Headline>

      <div className="en-tiles" style={{ margin: 0 }}>
        <Tile label="HT bill, last 12 months" value={inr(L(m.totals.bill))} foot={`${fmtNum(m.totals.kwh / 1e6, 1)} MU grid · ₹${fmtNum(m.totals.bill / m.totals.kwh, 2)}/kWh · blended site ₹${fmtNum(last.blended, 2)}`} />
        <Tile label="Max demand, 12 months" value={fmtNum(md12)} unit="kVA" tone={exc.length ? 'bad' : 'good'} gap={{ text: `${exc.length} month${exc.length === 1 ? '' : 's'} above CD`, tone: exc.length ? 'bad' : 'good', rest: `· peak now about ${fmtNum(Math.round(m.postMd / 10) * 10)} kVA` }} bar={{ value: md12, max: m.cd * 1.1, mark: m.cd, tone: md12 > m.cd ? 'bad' : 'brand' }} />
        <Tile label="Load factor (3 months)" value={pctS(lfNow, 1)} tone={lfNow >= 0.75 ? 'good' : 'warn'} foot={`incentive from 75 %; below it in ${m.cond.lfMonthsNow} of 12 months`} />
        <Tile label={`Power factor, ${last.label}`} value={fmtNum(last.pf, 3)} tone={last.pf >= 0.99 ? 'good' : 'warn'} foot={`slab ${fmtNum(b.pfPct, 1)} %${m.nextSlab ? ` · next ${fmtNum(m.nextSlab.pct, 1)} % at ${m.nextSlab.lo}` : ''}`} />
        <Tile label="Energy in peak slots" value={pctS(peak)} tone={peak > 0.3 ? 'warn' : 'good'} foot={`09–12 and 18–22 · night ${pctS(m.slots[0].share)} · ${R.label}`} />
        <Tile label="Green premium paid" value={inr(greenNowL)} unit="/yr" foot={`${pctS(m.greenShare)} of grid energy at +₹${TARIFF.greenPremium}/kWh`} />
      </div>

      <div className="grid g32">
        <Card title={`Maximum demand vs contract: ${exc.length} of 12 months above ${fmtNum(m.cd)} kVA`} sub={`Billing demand = max(MD, 75 % of CD) · faded bars from bills before metering · ${exc.length ? `excess penalty paid ${inr(L(m.totals.excess), 1)}` : 'no excess penalty'}`}>
          <div className="inv-legend"><span><i style={{ background: 'var(--brand)' }} />Max demand within CD</span><span><i style={{ background: 'var(--bad)' }} />Above CD (penalty month)</span><span><i className="ln" style={{ borderColor: 'var(--bad)' }} />Contract {fmtNum(m.cd)} kVA</span><span><i className="ln" style={{ borderColor: 'var(--muted)', borderTopStyle: 'dotted' }} />75 % floor {fmtNum(0.75 * m.cd)} kVA</span></div>
          <DemandChart months={m.months} cd={m.cd} floor={0.75 * m.cd} />
          <div className="inv-note">Every month&apos;s MD is above the 75 % floor, so demand charges follow actual MD: each 100 kVA of MD avoided is worth {inr(m.mdValuePerKva * 100)}/yr. {exc.length ? <>Last excess: {exc[exc.length - 1].label}{exc[exc.length - 1] !== last ? `; none since` : ''}.</> : 'No excess in 12 months.'}</div>
        </Card>
        <Card title="Contract demand options, next 12 months" sub={`Monthly peak projected at ${fmtNum(Math.round(m.postMd / 10) * 10)} kVA with seasonal swing, σ ${m.sigma} kVA · demand charge + expected penalty − LF incentive, incl. duty`} flush>
          <div className="en-tbl sm"><table className="t">
            <thead><tr><th>CD kVA</th><th className="r">Risk mo.</th><th className="r">P(excess)</th><th className="r">Net /yr</th><th className="r">vs now</th></tr></thead>
            <tbody>{m.options.map(o => (
              <tr key={o.cd} className={o.cd === recCd.cd ? 'on' : ''}>
                <td className="num"><b>{fmtNum(o.cd)}</b>{o.cd === recCd.cd ? <> <Tag c="good">{o.cd === m.cd ? 'keep' : 'best'}</Tag></> : o.cd === m.cd ? <span className="muted"> now</span> : null}</td>
                <td className="r num">{fmtNum(o.monthsAtRisk, 1)}</td>
                <td className="r num" style={{ color: o.pYear > 0.5 ? 'var(--bad)' : o.pYear > 0.2 ? 'var(--warn)' : undefined }}>{pctS(o.pYear)}</td>
                <td className="r num">{inr(o.netL)}</td>
                <td className="r num" style={{ color: o.delta > 0.5 ? 'var(--bad)' : o.delta < -0.5 ? 'var(--good)' : undefined }}>{Math.abs(o.delta) < 0.5 ? '—' : `${sgn(o.delta)}${inr(Math.abs(o.delta))}`}</td>
              </tr>))}
              <tr><td colSpan={5} className="wrap" style={{ fontSize: 12, background: 'var(--bg-2)' }}>
                <b>If MD is held at {fmtNum(c.demo.kpis.find(k => k.id === 'md').target)} kVA:</b> demand charges fall {inr(m.cond.mdSaveL)}/yr, and a CD of {fmtNum(m.condCd)} kVA then adds {inr(m.cond.cdSaveL)}/yr of load factor incentive with a {pctS(m.cond.pYear)} chance of one excess a year.
              </td></tr>
            </tbody>
          </table></div>
        </Card>
      </div>

      <div className="grid g2">
        <Card title={`ToD: ${pctS(peak)} of energy in the two peak slots`} sub={`Average grid load by hour, ${R.label} · ${TARIFF.name}`}>
          <TodProfile profile={m.profile} slots={m.slots} />
          <div className="en-tbl sm" style={{ marginTop: 8 }}><table className="t">
            <thead><tr><th>Slot</th><th className="r">Share</th><th className="r">MWh</th><th className="r">₹/kWh landed</th><th className="r">ToD ₹ in period</th></tr></thead>
            <tbody>{m.slots.map(s => <tr key={s.id}><td>{s.name}</td><td className="r num">{pctS(s.share)}</td><td className="r num">{fmtNum(s.kwh / 1e3, 0)}</td><td className="r num">{fmtNum(s.rateAll * (1 + TARIFF.ed), 2)}</td><td className="r num" style={{ color: s.todL < 0 ? 'var(--good)' : s.todL > 0 ? 'var(--bad)' : undefined }}>{s.todL ? `${sgn(s.todL)}${inr(Math.abs(s.todL), 1)}` : '—'}</td></tr>)}</tbody>
          </table></div>
        </Card>
        <Card title={`Load shifting: ${inr(shiftL, 1)}/yr from the evening peak to the night slot`} sub={`₹${fmtNum((1.1 + 1.5) * (1 + TARIFF.ed), 2)}/kWh saved per kWh moved (peak surcharge + night rebate, incl. duty) · loads sized from their meters over ${R.label}`} flush>
          <div className="en-tbl"><table className="t">
            <thead><tr><th>Load to move</th><th className="r">kW × h × days</th><th className="r">MWh/yr</th><th className="r">₹/yr</th><th>Effort</th></tr></thead>
            <tbody>{m.shifts.map(s => <tr key={s.id}><td className="wrap" style={{ fontSize: 12.5, minWidth: 200 }}>{s.name}<div className="muted" style={{ fontSize: 11 }}>{s.owner}</div></td><td className="r num">{fmtNum(s.kw, 0)} × {s.h} × {s.days}</td><td className="r num">{fmtNum(s.kwhYr / 1e3, 0)}</td><td className="r num"><b>{inr(s.saveL, 1)}</b></td><td><Tag c={s.effort === 'Low' ? 'good' : 'warn'}>{s.effort}</Tag></td></tr>)}</tbody>
          </table></div>
          <div className="inv-note">Moving the MCC-01 block out of 18–22 also lowers the evening peak that sets MD by about {fmtNum(m.shifts[0].mdKva, 0)} kVA. Running DG sets in the peak is not worth it: diesel power costs about ₹{fmtNum(92 / c.demo.kpis.find(k => k.id === 'dgsfc').cur, 0)}/kWh.</div>
        </Card>
      </div>

      <div className="grid g2">
        <Card title={`Power factor: ${fmtNum(last.pf, 3)} in ${last.label}, slab ${fmtNum(b.pfPct, 1)} %`} sub="Monthly average PF at the billing meter (kVAh basis) · shaded bands = incentive slabs, % of the energy charge">
          <PfChart months={m.pfMonths} slabs={TARIFF.pfSlabs} />
          <div className="inv-note">PF rose from {fmtNum(m.pfMonths[0].pf, 3)} to {fmtNum(last.pf, 3)} after go-live. Holding it at 0.99 or above every month adds {inr(m.pfUpL)}/yr of incentive{m.nextSlab ? ` (${fmtNum(m.nextSlab.pct, 1)} % slab)` : ''}, and kVAh billing at 0.995 cuts billed energy by a further {inr(m.kvahL)}/yr. Incentive earned in 12 months: {inr(-L(m.totals.pfInc))}.</div>
        </Card>
        <Card title={`What makes up the ${last.label} bill: ${inr(L(b.total))}`} sub={`${fmtNum(last.kwh / 1e6, 2)} MU · ₹${fmtNum(b.total / last.kwh, 2)}/kWh · charges from the meter data and the tariff`} flush
          csv={{ name: 'ems-bill-decomposition', rows: () => billLines.map(x => ({ line: x[0], inr: Math.round(x[1]), inr_per_kwh: (x[1] / last.kwh).toFixed(3), basis: x[2] })) }}>
          <div className="en-tbl sm"><table className="t">
            <thead><tr><th>Line</th><th className="r">₹</th><th className="r">₹/kWh</th><th style={{ width: 90 }} /></tr></thead>
            <tbody>{billLines.map(x => (
              <tr key={x[0]}><td className="wrap" style={{ fontSize: 12.5, minWidth: 160 }}>{x[0]}<div className="muted" style={{ fontSize: 11 }}>{x[2]}</div></td>
                <td className="r num" style={{ color: x[1] < 0 ? 'var(--good)' : undefined }}>{x[1] < 0 ? '−' : ''}{inr(Math.abs(L(x[1])), 1)}</td>
                <td className="r num">{fmtNum(x[1] / last.kwh, 2)}</td>
                <td><Share v={x[1]} max={maxLine} color={x[1] < 0 ? 'var(--good)' : 'var(--brand)'} /></td></tr>))}
              <tr><td><b>Grid bill</b></td><td className="r num"><b>{inr(L(b.total), 1)}</b></td><td className="r num"><b>{fmtNum(b.total / last.kwh, 2)}</b></td><td /></tr>
            </tbody>
          </table></div>
        </Card>
      </div>

      <Card title={`Green power: group captive saves ${inr(greenSwitchL)}/yr against the green tariff`} sub={`To reach the ${c.demo.kpis.find(k => k.id === 're')?.target ?? 20} % renewable target: ${fmtNum(m.Q / 1e6, 1)} MU/yr of green power beyond the rooftop · landed ₹/kWh incl. charges and duty · grid energy today ₹${fmtNum(m.gridVar, 2)}/kWh (dashed)`} flush>
        <div>
          <div style={{ padding: '8px 16px 4px', maxWidth: 640 }}>
            <LandedBars items={m.green.map(g => ({ ...g, short: { grid: 'Grid', gt: 'Green tariff', oa: 'Open access PPA', gc: 'Group captive' }[g.id] }))} refV={m.gridVar} />
          </div>
          <div className="en-tbl"><table className="t" style={{ minWidth: 720 }}>
            <thead><tr><th>Route</th><th className="r">Landed ₹/kWh</th><th className="r">₹/yr vs grid</th><th className="r">RE share</th><th>Commitment</th><th>Capex / equity</th><th>Main risk</th></tr></thead>
            <tbody>{m.green.map(g => (
              <tr key={g.id} className={g.id === 'gc' ? 'on' : ''}>
                <td className="wrap" style={{ minWidth: 170, fontWeight: 600 }}>{g.name}</td>
                <td className="r num">{fmtNum(g.landed, 2)}</td>
                <td className="r num" style={{ color: g.annualL < -0.5 ? 'var(--good)' : g.annualL > 0.5 ? 'var(--bad)' : undefined }}>{Math.abs(g.annualL) < 0.5 ? '—' : `${sgn(g.annualL)}${inr(Math.abs(g.annualL))}`}</td>
                <td className="r num">{pctS(g.re)}</td>
                <td style={{ fontSize: 12 }}>{g.tenor}</td>
                <td style={{ fontSize: 12 }}>{g.capex}</td>
                <td className="wrap" style={{ fontSize: 12, minWidth: 220 }}>{g.risk}</td>
              </tr>))}</tbody>
          </table></div>
        </div>
        <div className="inv-note">Open access rates are indicative: hybrid PPA ₹4.30, transmission and wheeling ₹1.05, cross-subsidy surcharge ₹1.35, additional surcharge ₹1.00, banking and losses ₹0.35/kWh. Group captive is exempt from both surcharges under the Green Energy Open Access Rules 2022. Demand charges stay with MSEDCL on every route. Confirm against the MERC order in force and developer quotes.</div>
      </Card>

      <Card title={`Decisions: ${inr(totalL)}/yr across ${decisions.length} actions`} sub="What to change, what it is worth, effort and owner · ₹ include electricity duty" flush csv={{ name: 'ems-tariff-decisions', rows: decCsv }} ask="Which tariff and contract demand changes should we make this year?">
        <div className="en-tbl"><table className="t" style={{ minWidth: 820 }}>
          <thead><tr><th>#</th><th>Change</th><th className="r">Saving ₹/yr</th><th>Basis</th><th>Effort</th><th>Owner</th><th>When</th></tr></thead>
          <tbody>{decisions.map((d, i) => (
            <tr key={i}><td className="num muted">{i + 1}</td><td className="wrap" style={{ fontWeight: 600, minWidth: 240 }}>{d.what}</td><td className="r num"><b>{d.save > 0.05 ? inr(d.save) : '—'}</b></td><td className="wrap" style={{ fontSize: 12, minWidth: 200 }}>{d.note}</td>
              <td><Tag c={d.effort === 'Low' ? 'good' : d.effort === 'Medium' ? 'warn' : 'bad'}>{d.effort}</Tag></td><td style={{ fontSize: 12 }}>{d.owner}</td><td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{d.when}</td></tr>))}</tbody>
        </table></div>
        <div className="inv-note">Tariff as configured from the bill and the MERC HT-I order (doc d6): demand ₹{TARIFF.demand}/kVA/month on max(MD, 75 % CD); excess over CD at 150 %; ToD −₹1.50 (22–06), +₹0.80 (09–12), +₹1.10 (18–22); PF incentive {TARIFF.pfSlabs.map(s => `${s.lo}+ ${s.pct} %`).join(', ')}; LF incentive 0.75 % from 75 %, +1 % per point above 85 %, lost in an excess month; base energy charge ₹{fmtNum(m.E, 2)}/kVAh calibrated so the last 3 bills match the blended cost KPI (₹{fmtNum(c.demo.kpis.find(k => k.id === 'cost').cur, 2)}/kWh). Check every rate against the next bill: MERC revises ToD slots and surcharges in each tariff order.</div>
      </Card>
    </div>
  );
}
