/* Energy supply and demand plan · decision board (EMS, group "Plan").
   Used by the energy manager at the afternoon day-ahead call with the electrical head, HVAC in-charge,
   utilities manager, boiler house and the process block planner.
   Questions it answers:
   1. Will tomorrow's 15-min peak cross the 90 % alert or the 8,000 kVA contract, and which actions keep it under?
   2. What will tomorrow's energy cost, and how much of it is renewable?
   3. Which loads move to off-peak, and which chillers, compressors and boilers run in each hour?
   4. Should a DG set run for cost or peak shaving, or stay on standby?
   5. How good was the forecast yesterday and over the selected period (MAPE)?
   Forecast and plan are for tomorrow and the day after; the accuracy section follows the period selector. */
import React, { useMemo, useState } from 'react';
import { Card, Empty } from '../../ui.jsx';
import { useApp } from '../../../App.jsx';
import { fmtNum, fmtDate, downloadCSV } from '../../../lib/data.js';
import { supplyPlan, yesterday, mapeByDay, TARIFF, PRICES, rateAt, slotOf } from '../../../shared/analytics/ems-plan.js';
import { PlStyle, Headline, Tile, Sec, Legend, Decide, inr, hh } from './plan-ui.jsx';
import { ForecastChart, PeakBridge, SteamChart, BacktestChart, MapeBars, slotFill } from './plan-charts.jsx';
import { usePalette } from '../../charts.jsx';

const H = 36e5;
const dayName = t => new Date(t).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const pctOf = (v, base) => Math.round((v / base) * 100);

export default function SupplyPlan({ c }) {
  const { rng, openPanel } = useApp();
  const p = usePalette();
  const db = c.db;
  const isEms = c.demo.id === 'ems' && db.assetById['GRID-01'] && db.assetById['BLR-02'];
  const plan = useMemo(() => (isEms ? supplyPlan(db) : null), [db, isEms]);
  const bt = useMemo(() => (isEms ? yesterday(db) : null), [db, isEms]);
  const mape = useMemo(() => (isEms ? mapeByDay(db, rng.from, rng.to) : []), [db, isEms, rng.from, rng.to]);
  const [dec, setDec] = useState({});
  if (!plan) return <Card><Empty>The supply and demand plan needs a grid incomer, rooftop solar, DG sets and boilers in the plant model. It is set up for the energy and utilities demo.</Empty></Card>;

  const pf = plan.pf, d1 = plan.day1;
  const overAlert = plan.peak.kva15 > plan.alertKva, planOk = plan.peakPlan.kva15 <= plan.alertKva;
  const gridSave = plan.costGrid - plan.costGridPlan;
  const steamSave = plan.steam.save;
  const mdSave = plan.mdRisk(plan.peak.kva15) - plan.mdRisk(plan.peakPlan.kva15);
  const dg = plan.dgBest, dgCheaper = dg.cost < plan.peakRate;
  const mAvg = mape.length ? mape.reduce((s, x) => s + x.mape, 0) / mape.length : null;
  const tomorrow = dayName(plan.start);

  /* ---- planned actions, by start hour ---- */
  const actions = [
    ...plan.peakActions.map(a => ({ id: a.id, from: a.hours[0], to: a.hours[1], what: a.name, asset: a.asset, effect: a.kva ? `−${fmtNum(a.kva, 0)} kVA at ${hh(plan.peak.h)}` : '—', note: a.cost, owner: a.owner, kind: 'Peak' })),
    ...plan.shifts.map(s => ({ id: s.id, from: s.to[0], to: s.to[1], what: `Move ${s.name[0].toLowerCase() + s.name.slice(1)} from ${hh(s.from[0])}–${hh(s.from[1])} to ${hh(s.to[0])}–${hh(s.to[1])}`, asset: s.asset, effect: `${fmtNum(s.kwh, 0)} kWh · ${inr(s.inr)}`, note: s.note, owner: s.owner, kind: 'ToD' })),
    { id: 'b1', from: 0, to: 24, what: `Base-load BLR-02 (biomass) up to ${plan.steam.bioCap} t/h; BLR-01 (gas) on swing, min ${PRICES.gasMin} t/h`, asset: 'BLR-02', effect: `${inr(steamSave)} vs today’s split`, note: `Gas kept at the take-or-pay floor (${fmtNum(plan.steam.floorSm3, 0)} Sm³)`, owner: 'Boiler house in-charge', kind: 'Steam' },
    plan.steam.briqDays < 2 && { id: 'b2', from: 9, to: 10, what: `Raise a briquette call-off: stock ${plan.steam.briqStock} t covers ${plan.steam.briqDays} days at plan`, asset: 'BLR-02', effect: `${fmtNum(plan.steam.briqNeed, 0)} t/day`, note: 'Lead time 2 days from the Chakan depot', owner: 'Stores and purchase', kind: 'Steam' },
    { id: 'g1', from: 0, to: 24, what: `DG-01 / DG-02 on mains-failure standby; no peak lopping`, asset: 'DG-01', effect: `₹${fmtNum(dg.cost, 1)}/kWh vs ₹${fmtNum(plan.peakRate, 2)} grid peak`, note: plan.lopHours ? `Lop only in ${plan.lopHours} h above contract` : 'Weekly off-load test 15 min at 15:00 (normal slot)', owner: 'Electrical head', kind: 'DG' },
  ].filter(Boolean).sort((a, b) => a.from - b.from);
  const nOk = actions.filter(a => dec[a.id] === 'ok').length, nNo = actions.filter(a => dec[a.id] === 'no').length;

  const csvRows = () => [['Hour', 'ToD slot', 'Tariff ₹/kWh', 'Demand kW', 'Solar kW', 'Grid kW forecast', 'Grid kW with plan', 'Grid 15-min kVA forecast', 'Grid 15-min kVA with plan', 'Cooling load TR', 'Chillers', 'Air flow m³/min', 'Compressors', 'Steam t/h', 'BLR-02 t/h', 'BLR-01 t/h'],
    ...d1.map(x => [new Date(x.t).toISOString(), x.slot, x.rate, Math.round(x.demand), Math.round(x.solar), Math.round(x.grid), Math.round(x.gridPlan), Math.round(x.kva15), Math.round(x.kva15Plan), Math.round(x.tr), x.chillers.join('+'), x.air.toFixed(1), x.comps.join('+'), x.steam.toFixed(1), x.bio.toFixed(1), x.gas.toFixed(1)])];

  return (
    <div>
      <PlStyle />
      <Headline tone={overAlert && !planOk ? 'bad' : overAlert ? 'warn' : 'good'}>
        <span>
          <b>{tomorrow}:</b> the 15-min peak is forecast at <b>{fmtNum(plan.peak.kva15, 0)} kVA at {hh(plan.peak.h)}</b> ({pctOf(plan.peak.kva15, plan.contractKva)} % of contract{overAlert ? ', above the 90 % alert' : ''}){plan.adders.length ? ', with the export-order batches on the process block' : ''}.{' '}
          {overAlert ? <>The {plan.peakActions.filter(a => a.kva > 0).length} actions below bring it to <b>{fmtNum(plan.peakPlan.kva15, 0)} kVA ({pctOf(plan.peakPlan.kva15, plan.contractKva)} %)</b>{mdSave > 0 ? <> and avoid {inr(mdSave)} of extra demand charge this month</> : null}. </> : null}
          Approving the plan saves <b>{inr(gridSave + steamSave)}</b> tomorrow ({inr(gridSave)} power, {inr(steamSave)} steam). DG stays on standby: ₹{fmtNum(dg.cost, 1)}/kWh against ₹{fmtNum(plan.peakRate, 2)} at grid peak.
        </span>
      </Headline>

      <div className="pl-tiles">
        <Tile label="Peak tomorrow, with plan" value={fmtNum(plan.peakPlan.kva15, 0)} unit="kVA" tone={planOk ? 'good' : 'bad'}
          gap={{ text: `${pctOf(plan.peakPlan.kva15, plan.contractKva)} % of contract`, tone: planOk ? 'good' : 'bad', rest: `· alert ${fmtNum(plan.alertKva, 0)}` }}
          foot={`Without plan ${fmtNum(plan.peak.kva15, 0)} kVA at ${hh(plan.peak.h)}`} bar={{ value: plan.peakPlan.kva15, max: plan.contractKva, mark: plan.alertKva, tone: planOk ? 'good' : 'bad' }} />
        <Tile label="Grid energy tomorrow" value={fmtNum(plan.gridKwhPlan / 1000, 1)} unit="MWh"
          gap={{ text: inr(plan.costGridPlan), rest: `energy charge · ${inr(gridSave)} saved by ToD shifts` }}
          foot={`Site demand ${fmtNum(plan.demandKwh / 1000, 1)} MWh · avg ₹${fmtNum(plan.costGridPlan / plan.gridKwhPlan, 2)}/kWh`} />
        <Tile label="Renewable share tomorrow" value={fmtNum(plan.reShare * 100, 1)} unit="%" tone={plan.reShare * 100 >= 20 ? 'good' : 'warn'}
          gap={{ text: `${fmtNum(20 - plan.reShare * 100, 1)} pts below 20 % target`, tone: 'warn' }}
          foot={`Rooftop ${fmtNum(plan.solarShare * 100, 1)} % (${fmtNum(plan.solarKwh / 1000, 1)} MWh, ${plan.wx[0].sky.toLowerCase()}) + green tariff ${fmtNum(plan.reShare * 100 - plan.solarShare * 100, 1)} %`} />
        <Tile label="Steam tomorrow · fuel cost" value={inr(plan.steam.costPlan)} tone="good"
          gap={{ text: `−${inr(steamSave)}`, tone: 'good', rest: 'vs today’s boiler split' }}
          foot={`${fmtNum(plan.steam.steamT, 0)} t steam · biomass ${Math.round(plan.steam.bioSharePlan * 100)} % (today ${Math.round(plan.steam.bioShareNow * 100)} %)`} />
        <Tile label="Forecast accuracy · yesterday" value={bt ? fmtNum(bt.mape * 100, 1) : '—'} unit="% MAPE" tone={bt && bt.mape * 100 <= 5 ? 'good' : 'warn'}
          gap={bt ? { text: bt.mape * 100 <= 5 ? 'Within 5 % target' : 'Above 5 % target', tone: bt.mape * 100 <= 5 ? 'good' : 'bad' } : null}
          foot={bt ? `Peak error ${bt.peakErr >= 0 ? '+' : ''}${fmtNum(bt.peakErr * 100, 1)} % · energy ${bt.energyErr >= 0 ? '+' : ''}${fmtNum(bt.energyErr * 100, 1)} %` : null} />
      </div>

      <Card title={`48 h forecast · ${tomorrow} and ${dayName(plan.start + 24 * H)}`}
        sub="Hourly. Demand from the last 14 days at the same hour blended with the same weekday, plus ERP planned loads; solar from the weather forecast and SOL-01 PR. Grid shown as the 15-min peak kVA."
        csv={{ name: 'ems-supply-plan-hourly', rows: csvRows }} ask="Explain tomorrow's demand forecast and what drives the peak">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {plan.wx.map((w, i) => (
            <span key={i} className="tag line" style={{ height: 'auto', minHeight: 21, whiteSpace: 'normal', padding: '2px 8px' }} title="Weather service forecast for Chakan">
              {dayName(plan.start + i * 24 * H)} · {w.sky} · cloud {w.cloud} % · {fmtNum(w.tmin, 0)}–{fmtNum(w.tmax, 0)} °C · solar {fmtNum((i ? plan.solarDay2 : plan.solarKwh) / 1000, 1)} MWh
            </span>))}
          <span className="tag line">PF {fmtNum(pf, 3)} · PR {fmtNum(plan.pr, 0)} %</span>
        </div>
        <ForecastChart plan={plan} />
        <Legend items={[
          { label: 'Site demand (kVA)', color: p.c2 }, { label: 'P10–P90 range', color: p.c2, kind: 'sw', opacity: 0.25 }, { label: 'Rooftop solar (kW)', color: p.c4, kind: 'sw', opacity: 0.4 },
          { label: 'Grid 15-min peak, forecast', color: p.c1, kind: 'dash' }, { label: 'Grid with plan (tomorrow)', color: p.c1 },
        ]} />
        <Legend items={TARIFF.slots.filter(s => s.adder !== 0).map(s => { const [col, o] = slotFill(p, s.id); return { label: `${s.name} ${s.hours} · ₹${fmtNum(TARIFF.energy + s.adder, 2)}/kWh`, color: col, kind: 'sw', opacity: o * 4 }; }).concat([{ label: `Normal · ₹${fmtNum(TARIFF.energy, 2)}/kWh`, color: 'var(--bg-3)', kind: 'sw' }])} />
      </Card>

      <div className="grid g21" style={{ marginTop: 16 }}>
        <Card title="Peak shaving · keep MD under the 90 % alert" sub={`Tomorrow's 15-min peak, kVA. Month-to-date MD ${fmtNum(plan.mdMTD, 0)} kVA; demand charge ₹${TARIFF.demand}/kVA-month.`} ask="Which loads drive tomorrow's peak and how do we keep MD under 7,200 kVA?">
          <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 560 }}><PeakBridge plan={plan} /></div></div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {mdSave > 0 ? <>Unshaved, tomorrow would set this month's MD {fmtNum(plan.peak.kva15 - plan.mdBase, 0)} kVA above the {fmtNum(plan.mdBase, 0)} kVA so far: <b style={{ color: 'var(--text)' }}>{inr(plan.mdRisk(plan.peak.kva15))}</b> more on the bill. With the plan: {inr(plan.mdRisk(plan.peakPlan.kva15))}.</> : <>Tomorrow's planned peak stays below this month's MD so far; no extra demand charge.</>}
          </div>
        </Card>
        <Card title="DG standby rule" sub="Run a DG set only on a grid outage, or when DG ₹/kWh is below the grid tariff in that slot." ask="Should we run the DG sets tomorrow? Compare DG cost per kWh with the grid tariff">
          <div className="pl-kv">
            <span>Diesel price</span><span className="num">₹{fmtNum(PRICES.diesel, 1)}/L</span>
            {plan.dg.map(d => <React.Fragment key={d.id}><span>{d.id} SFC, 30-day avg</span><span className="num">{fmtNum(d.sfc, 2)} kWh/L</span></React.Fragment>)}
            <span>DG cost (fuel ÷ SFC + ₹{fmtNum(PRICES.dgOM, 1)} O&M)</span><span className="num"><b>₹{fmtNum(dg.cost, 2)}/kWh</b></span>
            <span>Grid, evening peak (highest slot)</span><span className="num">₹{fmtNum(plan.peakRate, 2)}/kWh</span>
            <span>Grid, off-peak</span><span className="num">₹{fmtNum(rateAt(23), 2)}/kWh</span>
            <span>DG premium over grid peak</span><span className="num">₹{fmtNum(dg.cost - plan.peakRate, 2)}/kWh</span>
          </div>
          <div className={`pl-verdict ${dgCheaper ? 'warn' : 'good'}`}>
            {dgCheaper ? <><b>Run DG in peak slots:</b> DG is cheaper than grid peak.</> : <><b>Standby only.</b> DG costs {fmtNum(dg.cost / plan.peakRate, 1)}× the grid peak tariff. A 500 kW peak lop for 1 h costs about {inr((dg.cost - plan.peakRate) * 500)}; use it only if the 15-min forecast crosses the {fmtNum(plan.contractKva, 0)} kVA contract, where excess demand is billed at {TARIFF.excessMult}×. Hours above contract tomorrow: <b>{plan.lopHours}</b>.</>}
          </div>
        </Card>
      </div>

      <Card title={`Run plan · ${tomorrow}, hour by hour`} sub="Which chillers, compressors and boilers run, and where loads move. Chillers: CH-01 + CH-03 lead (clean screws), CH-02 lag only above 736 TR while its condenser is fouled. Compressors: fixed units base-load, AC-03 VSD trims." style={{ marginTop: 16 }}
        ask="Explain tomorrow's chiller and compressor staging plan">
        <RunStrip plan={plan} />
      </Card>

      <Card title="Planned actions · approve or reject" sub={`${actions.length} actions for ${tomorrow}. ${nOk} approved, ${nNo} rejected, ${actions.length - nOk - nNo} open. Decisions are kept on this screen only.`} style={{ marginTop: 16 }}
        actions={<button className="btn sm" onClick={() => setDec(Object.fromEntries(actions.map(a => [a.id, 'ok'])))}>Approve all</button>}>
        <div className="pl-tbl"><table className="t">
          <thead><tr><th>When</th><th>Type</th><th>Action</th><th>Effect</th><th>Owner</th><th className="r">Decision</th></tr></thead>
          <tbody>{actions.map(a => (
            <tr key={a.id}>
              <td className="num" style={{ whiteSpace: 'nowrap' }}>{a.from === 0 && a.to === 24 ? 'All day' : `${hh(a.from)}–${hh(a.to)}`}</td>
              <td><span className={`tag ${a.kind === 'Peak' ? 'warn' : a.kind === 'ToD' ? 'info' : a.kind === 'DG' ? 'line' : 'brand'}`}>{a.kind}</span></td>
              <td className="wrap"><div>{a.what}</div><div className="muted" style={{ fontSize: 11.5 }}>{a.asset} · {a.note}</div></td>
              <td className="num" style={{ whiteSpace: 'nowrap' }}>{a.effect}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{a.owner}</td>
              <td className="r"><Decide value={dec[a.id]} onChange={v => setDec(d => ({ ...d, [a.id]: v }))} /></td>
            </tr>))}</tbody>
        </table></div>
      </Card>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <Card title="Load shifting to off-peak (ToD)" sub={`Deferrable loads out of peak slots. Off-peak is ₹${fmtNum(-TARIFF.slots[0].adder, 2)}/kWh below normal; evening peak ₹${fmtNum(TARIFF.slots[3].adder, 2)} above.`} ask="Which more loads can we move out of the ToD peak slots?">
          <div className="pl-tbl"><table className="t" style={{ minWidth: 440 }}>
            <thead><tr><th>Load</th><th>From → to</th><th className="r">kWh/day</th><th className="r">₹/day</th></tr></thead>
            <tbody>{plan.shifts.map(s => (
              <tr key={s.id}><td><div style={{ whiteSpace: 'nowrap' }}>{s.short}</div><div className="muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>{s.asset} · {fmtNum(s.kw, 0)} kW × {s.hrs} h</div></td>
                <td className="num" style={{ whiteSpace: 'nowrap' }}><div>{hh(s.from[0])}–{hh(s.from[1])} → {hh(s.to[0])}–{hh(s.to[1])}</div><div className="muted" style={{ fontSize: 11.5 }}>₹{fmtNum(s.gain, 2)}/kWh cheaper</div></td>
                <td className="r num">{fmtNum(s.kwh, 0)}</td><td className="r num">{inr(s.inr)}</td></tr>))}
              <tr><td className="b">Total</td><td className="muted">≈ {inr(plan.shifts.reduce((s, x) => s + x.inr, 0) * 300)} a year at 300 days</td><td className="r num b">{fmtNum(plan.shifts.reduce((s, x) => s + x.kwh, 0), 0)}</td><td className="r num b">{inr(plan.shifts.reduce((s, x) => s + x.inr, 0))}</td></tr>
            </tbody></table></div>
          <div className="pl-tbl" style={{ marginTop: 12 }}><table className="t" style={{ minWidth: 440 }}>
            <thead><tr><th>Tariff slot tomorrow</th><th className="r">₹/kWh</th><th className="r">Grid MWh</th><th className="r">With plan</th></tr></thead>
            <tbody>{plan.bySlot.map(s => (
              <tr key={s.id}><td><div style={{ whiteSpace: 'nowrap' }}>{s.name}</div><div className="muted" style={{ fontSize: 11.5 }}>{s.hours}</div></td><td className="r num">{fmtNum(TARIFF.energy + s.adder, 2)}</td>
                <td className="r num">{fmtNum(s.kwh / 1000, 1)}</td>
                <td className="r num"><div>{fmtNum(s.kwhPlan / 1000, 1)}</div><div style={{ fontSize: 11.5, color: Math.abs(s.kwhPlan - s.kwh) < 50 ? 'var(--muted)' : (s.kwhPlan - s.kwh) * (s.adder || -1) < 0 || (s.adder < 0 && s.kwhPlan > s.kwh) ? 'var(--good)' : 'var(--muted)' }}>{s.kwhPlan - s.kwh >= 0 ? '+' : '−'}{fmtNum(Math.abs(s.kwhPlan - s.kwh) / 1000, 1)}</div></td></tr>))}</tbody>
          </table></div>
        </Card>
        <Card title="Steam and gas plan" sub="Cost per tonne of steam from the last 7 days of fuel and steam tags. Gas up to the take-or-pay floor is paid for anyway, so it is burnt before extra biomass." ask="Compare BLR-01 gas and BLR-02 biomass steam cost and tomorrow's boiler loading">
          <div className="pl-tbl"><table className="t" style={{ minWidth: 480 }}>
            <thead><tr><th>Boiler</th><th className="r">Fuel per t steam</th><th className="r">₹ per t steam</th><th className="r">Today</th><th className="r">Plan</th></tr></thead>
            <tbody>
              <tr><td><div>BLR-02 · biomass 10 TPH</div><div className="muted" style={{ fontSize: 11.5 }}>Briquettes ₹{fmtNum(PRICES.briquette, 0)}/t</div></td><td className="r num">{fmtNum(plan.steam.bioPerT * 1000, 0)} kg</td><td className="r num b">₹{fmtNum(plan.steam.costBio, 0)}</td><td className="r num">{fmtNum(plan.steam.bioShareNow * 100, 0)} %</td><td className="r num">{fmtNum(plan.steam.bioSharePlan * 100, 0)} %</td></tr>
              <tr><td><div>BLR-01 · gas 8 TPH</div><div className="muted" style={{ fontSize: 11.5 }}>PNG ₹{fmtNum(PRICES.png, 0)}/Sm³</div></td><td className="r num">{fmtNum(plan.steam.gasPerT, 1)} Sm³</td><td className="r num b">₹{fmtNum(plan.steam.costGas, 0)}</td><td className="r num">{fmtNum((1 - plan.steam.bioShareNow) * 100, 0)} %</td><td className="r num">{fmtNum((1 - plan.steam.bioSharePlan) * 100, 0)} %</td></tr>
            </tbody></table></div>
          <SteamChart hours={d1} />
          <Legend items={[{ label: 'BLR-02 biomass (t/h)', color: p.c4, kind: 'sw' }, { label: 'BLR-01 gas (t/h)', color: p.c1, kind: 'sw' }, { label: 'Biomass at today’s split', color: p.c2, kind: 'dash' }]} />
          <div className="pl-kv" style={{ marginTop: 10 }}>
            <span>PNG nomination tomorrow (BLR-01 + TFH-01 {fmtNum(plan.steam.tfhDay, 0)} Sm³)</span><span className="num"><b>{fmtNum(plan.steam.gasDaySm3, 0)} Sm³</b></span>
            <span>Daily contract quantity · take-or-pay floor {PRICES.pngMinPct} %</span><span className="num">{fmtNum(plan.steam.dcq, 0)} · {fmtNum(plan.steam.floorSm3, 0)} Sm³</span>
            <span>At today's split</span><span className="num">{fmtNum(plan.steam.gasNowSm3, 0)} Sm³</span>
            <span>Briquette stock · need at plan</span><span className="num" style={{ color: plan.steam.briqDays < 2 ? 'var(--warn)' : undefined }}>{plan.steam.briqStock} t · {fmtNum(plan.steam.briqNeed, 0)} t/day ({fmtNum(plan.steam.briqDays, 1)} days)</span>
          </div>
        </Card>
      </div>

      <Sec title="Plan against actual" sub={`Demand forecast back-tested: each day forecast from the data up to the midnight before. Period: ${rng.label}.`} />
      <div className="grid g2">
        <Card title={bt ? `Yesterday · ${fmtDate(bt.t0)} · MAPE ${fmtNum(bt.mape * 100, 1)} %` : 'Yesterday'} sub="Site demand, kW: forecast (dashed) vs metered actual (grid + solar).">
          {bt ? <><BacktestChart bt={bt} /><Legend items={[{ label: 'Forecast', color: p.c2, kind: 'dash' }, { label: 'Actual', color: p.c1 }]} /></> : <Empty>Not enough history for a back-test.</Empty>}
        </Card>
        <Card title={`Daily forecast error · ${rng.label}`} sub={mAvg != null ? `Average MAPE ${fmtNum(mAvg, 1)} % over ${mape.length} days; ${mape.filter(m => m.mape > 5).length} days above the 5 % target.` : 'No full days in the period.'}
          csv={{ name: 'ems-forecast-mape', rows: () => [['Date', 'MAPE %', 'Peak error %'], ...mape.map(m => [new Date(m.t).toISOString().slice(0, 10), m.mape, m.peakErr])] }}>
          {mape.length ? <MapeBars rows={mape} days={rng.days} /> : <Empty>Pick a period of at least one full day.</Empty>}
        </Card>
      </div>
    </div>
  );
}

/** Hour-by-hour run strip for tomorrow. */
function RunStrip({ plan }) {
  const d1 = plan.day1;
  const cell = (key, cls, txt, title) => <div key={key} className={`c ${cls}`} title={title}>{txt}</div>;
  const row = (label, fn) => <React.Fragment key={label}><div className="rl">{label}</div>{d1.map((x, i) => fn(x, i))}</React.Fragment>;
  const shiftRows = plan.shifts.slice(0, 3);
  const inR = (h, [a, b]) => (a < b ? h >= a && h < b : h >= a || h < b);
  return (
    <div className="pl-strip"><div className="gr">
      <div />{d1.map(x => <div key={x.h} className="hd">{String(x.h).padStart(2, '0')}</div>)}
      {row('ToD slot · ₹/kWh', x => cell(x.h, `slot-${x.slot}`, fmtNum(x.rate, 1), `${slotOf(x.h).name} · ₹${x.rate}/kWh`))}
      {row('Grid, k kVA (15-min)', x => cell(x.h, x.kva15Plan > plan.alertKva ? 'lag' : '', fmtNum(x.kva15Plan / 1000, 1), `${fmtNum(x.kva15Plan, 0)} kVA with plan · ${fmtNum(x.kva15, 0)} kVA forecast`))}
      {row('Cooling load, TR', x => cell(x.h, '', fmtNum(x.tr, 0), `${fmtNum(x.tr, 0)} TR`))}
      {['CH-01', 'CH-03', 'CH-02'].map(ch => row(`${ch}${ch === 'CH-02' ? ' (lag)' : ''}`, x => {
        const on = x.chillers.includes(ch);
        return cell(x.h, on ? (ch === 'CH-02' ? 'lag' : 'on') : 'off', on ? (ch === 'CH-02' ? fmtNum(x.ch02tr, 0) : 'On') : '–', on ? `${ch} running${ch === 'CH-02' ? `, ${fmtNum(x.ch02tr, 0)} TR` : ''}` : `${ch} off`);
      }))}
      {row('Air demand, m³/min', x => cell(x.h, '', fmtNum(x.air, 0), `${fmtNum(x.air, 1)} m³/min`))}
      {['AC-01', 'AC-02', 'AC-03', 'AC-04'].map(ac => row(`${ac}${ac === 'AC-03' ? ' VSD %' : ac === 'AC-04' ? ' (standby)' : ''}`, x => {
        const on = x.comps.includes(ac);
        return cell(x.h, on ? 'on' : 'off', on ? (ac === 'AC-03' ? x.vsdPct : 'On') : '–', on ? `${ac} running${ac === 'AC-03' ? `, ${x.vsdPct} % speed` : ''}` : `${ac} off`);
      }))}
      {row('BLR-02 biomass, t/h', x => cell(x.h, 'on', fmtNum(x.bio, 1), `${fmtNum(x.bio, 1)} t/h`))}
      {row('BLR-01 gas, t/h', x => cell(x.h, x.gas > PRICES.gasMin + 0.05 ? 'lag' : 'on', fmtNum(x.gas, 1), `${fmtNum(x.gas, 1)} t/h`))}
      {shiftRows.map(s => row(s.short, x => {
        const from = inR(x.h, s.from) || (s.id === 's1' && x.h >= 10 && x.h < 14), to = inR(x.h, s.to);
        return cell(x.h, to ? 'on' : from ? 'off' : '', to ? 'Run' : from ? 'Off' : '', to ? `Runs here (moved), ${s.kw} kW` : from ? 'Moved out of this slot' : '');
      }))}
      {row('DG-01 / DG-02', x => cell(x.h, 'off', 'SB', 'Mains-failure standby'))}
    </div></div>
  );
}
