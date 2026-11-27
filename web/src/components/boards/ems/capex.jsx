/* Capex recommendations · energy audit (Invest).
   Who uses it: plant head and plant controller at the capex committee, with the energy manager as the auditor.
   Questions it answers:
   1. What is the total savings potential (kWh, gas, ₹, tCO₂), what does it cost and how fast does it pay back?
   2. Which energy conservation measures (ECMs) do I approve now, pilot first, or leave for a later budget?
   3. For each ECM: measured baseline, proposal, ₹ saving, payback, IRR, NPV, confidence, evidence, risk and M&V.
   4. Where is the knee of the curve: how much capex buys most of the saving?
   5. Which ideas were screened out, and on what assumptions does the audit rest?
   Baselines are measured from the plant tags over the selected period (the period selector sets the audit baseline). */
import React, { useMemo, useState } from 'react';
import { useApp } from '../../../App.jsx';
import { Card, Tag, Empty } from '../../ui.jsx';
import { fmtNum } from '../../../lib/data.js';
import { EnStyle, Headline, Tile, inr } from '../../../pages/dash/dash-en-ui.jsx';
import { capexModel, NOTES, DECISION } from '../../../shared/analytics/ems-inv.js';
import { InvStyle, PriorityMatrix, CumulativeCurve, DEC_TONE } from './inv-ui.jsx';

const gwh = kwh => (kwh >= 1e6 ? `${fmtNum(kwh / 1e6, 2)} GWh` : `${fmtNum(kwh / 1e3, 0)} MWh`);
const yrs = v => (isFinite(v) ? `${fmtNum(v, v < 1 ? 2 : 1)} yr` : '—');
const CONF = { High: 'good', Medium: 'warn', Low: 'bad' };

export default function CapexBoard({ c }) {
  const app = useApp();
  const R = app.rng;
  const m = useMemo(() => capexModel(c.db, c.demo, R), [c.db, c.demo, R.from, R.to]);
  const [sel, setSel] = useState(null);
  if (!m) return <Card><Empty>The energy audit needs the utility meters of an EMS site (compressed air, chillers, boilers, transformers). This plant has no such model.</Empty></Card>;

  const t = m.total, now = m.byDecision.now, pilot = m.byDecision.pilot, later = m.byDecision.later;
  const cur = m.rows.find(r => r.id === sel) || m.rows[0];
  const pctGrid = (t.kwh / m.annualKwh) * 100;
  const gasRows = m.rows.filter(r => r.sm3);
  const csv = () => m.rows.map((r, i) => ({ rank: i + 1, ecm: r.name, area: r.area, asset: r.asset, baseline: r.base, proposed: r.prop, kwh_yr: Math.round(r.kwh), gas_sm3_yr: Math.round(r.sm3 || 0), saving_inr_lakh_yr: r.saveL.toFixed(1), capex_inr_lakh: r.capex, payback_yr: isFinite(r.pay) ? r.pay.toFixed(2) : '', irr_pct: r.irr != null ? (r.irr * 100).toFixed(0) : '', npv_10yr_inr_lakh: r.npv.toFixed(1), tco2_yr: r.tco2.toFixed(0), confidence: r.conf, decision: DECISION[r.decision], mv: r.mv, owner: r.owner }));

  return (
    <div className="grid" style={{ gap: 16 }}>
      <EnStyle /><InvStyle />
      <Headline>
        <span>The audit finds <b>{m.rows.length} measures worth {inr(t.save)} a year</b> ({gwh(t.kwh)} of electricity, {fmtNum(t.sm3 / 1e5, 1)} lakh Sm³ of gas, {fmtNum(t.tco2, 0)} tCO₂) for <b>{inr(t.capex)}</b> of capex, a blended payback of <b>{yrs(t.pay)}</b>.
          {' '}Recommend approving <b>{now.n} now</b>: {inr(now.capex)} capex returns {inr(now.save)}/yr (payback {yrs(now.pay)}). The large items, rooftop solar and a new CH-02, wait for the next budget.</span>
      </Headline>

      <div className="en-tiles" style={{ margin: 0 }}>
        <Tile label="Electricity saving" value={gwh(t.kwh)} unit="/yr" tone="brand" foot={`${fmtNum(pctGrid, 1)} % of grid energy · ${fmtNum(t.kwh / NOTES.hours, 0)} kW average`} />
        <Tile label="Fuel saving (PNG)" value={fmtNum(t.sm3 / 1e5, 2)} unit="lakh Sm³/yr" foot={`${gasRows.length} thermal measures · ₹${NOTES.gasPrice}/Sm³`} />
        <Tile label="Money saved" value={inr(t.save)} unit="/yr" tone="good" foot={`electricity ${inr(m.rows.reduce((a, r) => a + r.elecL, 0))} · fuel and water ${inr(m.rows.reduce((a, r) => a + r.fuelL + r.waterL, 0))} · net of running costs`} />
        <Tile label="Emissions avoided" value={fmtNum(t.tco2, 0)} unit="tCO₂/yr" foot={`grid ${NOTES.ef} t/MWh · gas ${NOTES.gasEf} kg/Sm³`} />
        <Tile label="Capex" value={inr(t.capex)} foot={`${inr(now.capex)} now · ${inr(pilot.capex)} pilots · ${inr(later.capex)} later`} />
        <Tile label="Blended payback" value={yrs(t.pay)} tone={t.pay <= 3 ? 'good' : 'warn'} foot={`NPV 10 yr at 10 %: ${inr(t.npv)}`} />
      </div>

      <div className="inv-cols">
        {[['now', now, 'Fast, measured, low risk: release the purchase orders.'], ['pilot', pilot, 'Saving not yet metered: prove it on a small scope first.'], ['later', later, 'Long payback or depends on another measure: plan for the next budget.']].map(([k, s, why]) => (
          <div key={k} className="inv-col">
            <h4><Tag c={DEC_TONE[k]}>{DECISION[k]}</Tag><span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{s.n} measure{s.n === 1 ? '' : 's'}</span></h4>
            <div className="big">{inr(s.save)}<span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>/yr for {inr(s.capex)}</span></div>
            <div className="muted" style={{ fontSize: 12 }}>{why} Payback {yrs(s.pay)} · {fmtNum(s.tco2, 0)} tCO₂/yr</div>
            <div className="en-mini" style={{ marginTop: 8 }}>{m.rows.filter(r => r.decision === k).map(r => <React.Fragment key={r.id}><button className="en-link ellipsis" style={{ textAlign: 'left' }} onClick={() => setSel(r.id)}>{r.short}</button><span className="num">{inr(r.saveL)}/yr</span></React.Fragment>)}</div>
          </div>))}
      </div>

      <Card title="ECM register, fastest payback first" sub={`Baseline measured over ${R.label} · ₹ at ₹${fmtNum(m.tariff, 2)}/kWh blended (solar at ₹${fmtNum(m.energyOnly, 2)}/kWh), gas ₹${NOTES.gasPrice}/Sm³ · IRR and NPV over ${NOTES.years} years at ${NOTES.discount * 100} % · select a row for evidence, risk and M&V`} flush
        csv={{ name: 'ems-ecm-register', rows: csv }} ask="Which energy conservation measures should we approve first, and why?">
        <div className="en-tbl"><table className="t" style={{ minWidth: 1000 }}>
          <thead><tr><th>#</th><th>Measure</th><th>Measured → proposed</th><th className="r">Energy /yr</th><th className="r">₹ /yr</th><th className="r">Capex</th><th className="r">Payback</th><th className="r">IRR · NPV</th><th className="r">tCO₂ /yr</th><th>Decision</th></tr></thead>
          <tbody>{m.rows.map((r, i) => (
            <tr key={r.id} className={`click ${cur.id === r.id ? 'on' : ''}`} onClick={() => setSel(r.id)}>
              <td className="num muted">{i + 1}</td>
              <td className="wrap" style={{ minWidth: 200 }}><b style={{ fontWeight: 600 }}>{r.name}</b><div className="muted" style={{ fontSize: 11.5 }}>{r.area} · <span className="mono">{r.asset}</span></div></td>
              <td className="wrap" style={{ fontSize: 11.5, minWidth: 190 }}>{r.base}<div style={{ color: 'var(--brand)' }}>→ {r.prop}</div></td>
              <td className="r num">{r.kwh ? gwh(r.kwh) : ''}{r.sm3 ? <div>{fmtNum(r.sm3 / 1e3, 0)} k Sm³</div> : null}{r.water ? <div className="muted" style={{ fontSize: 11 }}>+{fmtNum(r.water / 1e3, 1)} k m³ water</div> : null}</td>
              <td className="r num"><b>{inr(r.saveL)}</b></td>
              <td className="r num">{inr(r.capex)}</td>
              <td className="r num" style={{ color: r.pay <= 1 ? 'var(--good)' : r.pay > 4 ? 'var(--warn)' : undefined }}>{yrs(r.pay)}</td>
              <td className="r num">{r.irr == null ? '—' : r.irr > 1 ? '> 100 %' : `${fmtNum(r.irr * 100, 0)} %`}<div style={{ fontSize: 11.5, color: r.npv < 0 ? 'var(--bad)' : 'var(--muted)' }}>{r.npv < 0 ? '−' : ''}{inr(Math.abs(r.npv))}</div></td>
              <td className="r num">{fmtNum(r.tco2, 0)}</td>
              <td><Tag c={DEC_TONE[r.decision]}>{DECISION[r.decision]}</Tag><div style={{ fontSize: 11, marginTop: 3 }}><span className="inv-dot" style={{ background: `var(--${CONF[r.conf]})`, width: 7, height: 7, marginRight: 5 }} />{r.conf} confidence</div></td>
            </tr>))}
            <tr><td /><td><b>Total</b></td><td /><td className="r num"><b>{gwh(t.kwh)}</b><div>{fmtNum(t.sm3 / 1e3, 0)} k Sm³</div></td><td className="r num"><b>{inr(t.save)}</b></td><td className="r num"><b>{inr(t.capex)}</b></td><td className="r num"><b>{yrs(t.pay)}</b></td><td className="r num"><b>{inr(t.npv)}</b></td><td className="r num"><b>{fmtNum(t.tco2, 0)}</b></td><td /></tr>
          </tbody>
        </table></div>
        <div className="inv-detail">
          <div>
            <h5>Selected · {cur.name}</h5>
            <div className="inv-ev" style={{ marginBottom: 10 }}>
              <span className="muted">Electricity</span><span className="num">{cur.kwh ? `${gwh(cur.kwh)} × ₹${fmtNum(cur.value, 2)} = ${inr(cur.elecL)}` : '—'}</span>
              {cur.sm3 ? <><span className="muted">Gas</span><span className="num">{fmtNum(cur.sm3, 0)} Sm³ × ₹{NOTES.gasPrice} = {inr(cur.fuelL)}</span></> : null}
              {cur.water ? <><span className="muted">Water and treatment</span><span className="num">{fmtNum(cur.water, 0)} m³ × ₹{NOTES.waterCost} = {inr(cur.waterL)}</span></> : null}
              {cur.extraL ? <><span className="muted">PF slab protected</span><span className="num">{inr(cur.extraL)}</span></> : null}
              {cur.opex ? <><span className="muted">Running cost</span><span className="num">− {inr(cur.opex)}</span></> : null}
              <span className="muted">Net saving · capex · payback</span><span className="num"><b>{inr(cur.saveL)}/yr</b> · {inr(cur.capex)} · {yrs(cur.pay)}</span>
            </div>
            <h5>Risk</h5><div style={{ marginBottom: 10 }}>{cur.risk}</div>
            <h5>Measurement and verification</h5><div>{cur.mv}</div>
            <div className="muted" style={{ marginTop: 8 }}>Owner: {cur.owner} · Timing: {cur.when}</div>
          </div>
          <div>
            <h5>Evidence · average over {R.label}</h5>
            <div className="inv-ev">{cur.evidence.map(e => <React.Fragment key={e.asset + e.tag}><span><span className="mono">{e.asset}</span> · {e.name}</span><span className="num"><b>{fmtNum(e.v, e.d)}</b> {e.unit}</span></React.Fragment>)}</div>
          </div>
        </div>
      </Card>

      <div className="grid g2">
        <Card title="Priority matrix: saving vs payback" sub="Bubble size = capex · colour = recommendation · numbers match the register · select a bubble">
          <div className="inv-legend">{['now', 'pilot', 'later'].map(k => <span key={k}><i className="inv-dot" style={{ background: `var(--${DEC_TONE[k]})` }} />{DECISION[k]}</span>)}</div>
          <PriorityMatrix rows={m.rows} sel={cur.id} onPick={setSel} />
        </Card>
        <Card title={`The first ${inr(now.capex)} buys ${fmtNum((now.save / t.save) * 100, 0)} % of the saving`} sub="Cumulative net saving against cumulative capex, measures added in payback order · dots coloured by recommendation">
          <div className="inv-legend">{['now', 'pilot', 'later'].map(k => <span key={k}><i className="inv-dot" style={{ background: `var(--${DEC_TONE[k]})` }} />{DECISION[k]}</span>)}</div>
          <CumulativeCurve curve={m.curve} budget={now.capex} />
        </Card>
      </div>

      <div className="grid g2">
        <Card title="Screened out" sub="Ideas checked against the plant data and not recommended">
          <table className="t"><tbody>{m.screened.map(s => <tr key={s.name}><td style={{ width: '36%', fontWeight: 600, verticalAlign: 'top' }}>{s.name}</td><td style={{ fontSize: 12.5, whiteSpace: 'normal' }}>{s.why}</td></tr>)}</tbody></table>
        </Card>
        <Card title="Auditor's notes" sub="Method: ISO 50002 type 2 audit on metered data · BEE energy auditor practice · savings net of interactions">
          <div className="inv-notes">
            <div><span>Electricity value</span><span>₹{fmtNum(m.tariff, 2)}/kWh blended (KPI); solar ₹{fmtNum(m.energyOnly, 2)}/kWh</span></div>
            <div><span>Grid emission factor</span><span>{NOTES.ef} tCO₂/MWh (CEA)</span></div>
            <div><span>Operating hours</span><span>{fmtNum(NOTES.hours)} h/yr · chillers {fmtNum(NOTES.chillerHours)} h</span></div>
            <div><span>Natural gas</span><span>₹{NOTES.gasPrice}/Sm³ · {NOTES.gasNcv} kWh/Sm³ · {NOTES.gasEf} kg CO₂/Sm³</span></div>
            <div><span>Water and treatment</span><span>₹{NOTES.waterCost}/m³</span></div>
            <div><span>Discount rate, horizon</span><span>{NOTES.discount * 100} %, {NOTES.years} years, no escalation</span></div>
            <div><span>Solar yield</span><span>{fmtNum(NOTES.solarYield)} kWh/kWp/yr, 0.5 %/yr degradation</span></div>
            <div><span>Baseline period</span><span>{R.label}, from tags</span></div>
          </div>
          <ul style={{ fontSize: 12.5, lineHeight: 1.55, margin: '10px 0 0', paddingLeft: 16 }}>
            <li>Savings are not simply additive: compressor heat recovery is sized on the make-up water left after the condensate measure.</li>
            <li>No-cost measures already on the setpoint board (header pressure, CHW reset, CT approach, APFC target) and the open steam-trap purchase are not counted here.</li>
            <li>Capex are budgetary (± 20 %), from recent Maharashtra vendor quotes; tax depreciation and subsidies are not counted.</li>
            <li>Approve now: payback ≤ 2.5 yr, IRR ≥ 30 %, confidence medium or high. Pilot: saving not yet metered.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
