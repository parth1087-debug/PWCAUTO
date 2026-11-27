/* Built-in dashboard: cost (renamed per plant by dashNames).
   Users: plant controller, production head (and asset manager / energy manager / performance engineer by plant type).
   Questions it answers:
     1. Where is cost per unit against budget, and how much money is the gap in the selected period?
     2. Which cost elements and drivers make the gap?
     3. Which losses cost the most, and what is the next action and owner? (loss tree / generation losses / heat-rate deviations)
     4. Which line, block or area to act on first?
     5. How much value is still left between today's KPIs and their targets?
   Content by plant family (shared/analytics/dash-cq.js):
     mfg   conversion cost build-up and variance, OEE loss tree in ₹, line comparison, cost trend vs budget
     res   generation losses in MWh and ₹ (energy waterfall, loss table, block ranking, daily export vs P50), O&M cost
     ems   blended ₹/kWh build-up and variance, avoidable utility losses in MWh and ₹, cost trend
     power heat-rate gap tree (design to actual) in kcal/kWh and ₹, fuel cost build-up, heat-rate trend */
import React from 'react';
import { useApp } from '../../App.jsx';
import { Card, Tag, Empty } from '../../components/ui.jsx';
import { fmtNum } from '../../lib/data.js';
import { D, KpiRow } from './common.jsx';
import * as A from '../../shared/analytics/dash-cq.js';
import { money, nf, Headline, Scroll, CellBar, DivBar, HWaterfall, LimitChart, DayBars } from './cq-ui.jsx';
import { usePalette } from '../../components/charts.jsx';

const pct = v => `${fmtNum(v * 100, 0)}\u00a0%`;

export default function Cost({ c, R }) {
  const f = A.family(c.demo);
  if (f === 'res') return <ResCost c={c} R={R} />;
  if (f === 'ems') return <EmsCost c={c} R={R} />;
  if (f === 'power') return <PowerCost c={c} R={R} />;
  return <MfgCost c={c} R={R} />;
}

/* ---------- shared cards ---------- */
function BuildUp({ cb, demo, title, sub }) {
  const p = usePalette();
  const mx = Math.max(...cb.elements.map(e => e.value));
  const dec = cb.actual >= 100 ? 0 : 2;
  return <Card title={title || `Cost build-up: ${nf(cb.actual, dec)} ${cb.unit}`} sub={sub || `Budget ${nf(cb.budget, dec)} ${cb.unit} · ₹ column is the selected period`} flush
    csv={{ name: 'cost-build-up', rows: () => cb.elements.map(e => ({ element: e.name, [cb.unit]: e.value, share_pct: Math.round(e.share * 100), inr_lakh_period: A.toLakh(e.value, cb.vol, demo).toFixed(2) })) }}>
    <Scroll><table className="t"><thead><tr><th>Element</th><th className="r">{cb.unit}</th><th>Share</th><th className="r">₹ in period</th></tr></thead><tbody>
      {cb.elements.map(e => <tr key={e.name}><td>{e.name}</td><td className="r num">{nf(e.value, dec)}</td><td style={{ whiteSpace: 'nowrap' }}><CellBar value={e.value} max={mx} color={p.c1} /> <span className="muted num" style={{ fontSize: 11.5 }}>{pct(e.share)}</span></td><td className="r num">{money(A.toLakh(e.value, cb.vol, demo))}</td></tr>)}
      <tr style={{ fontWeight: 600 }}><td>Total</td><td className="r num">{nf(cb.actual, dec)}</td><td /><td className="r num">{money(A.toLakh(cb.actual, cb.vol, demo))}</td></tr>
    </tbody></table></Scroll>
  </Card>;
}

function Drivers({ cb, demo, R }) {
  const mx = Math.max(...cb.drivers.map(d => Math.abs(d.delta)));
  const dec = cb.actual >= 100 ? 0 : 2;
  const over = cb.gap > 0;
  return <Card title={`${over ? 'Over' : 'Under'} budget by ${nf(Math.abs(cb.gap), dec)} ${cb.unit} (${fmtNum(Math.abs(cb.gapPct), 1)} %)`} sub={`${money(A.toLakh(cb.gap, cb.vol, demo), true)} in ${R.label} · variance by driver, red adds cost`} flush
    ask={{ kind: 'card', title: 'Cost variance', summary: [`Cost ${nf(cb.actual, dec)} vs budget ${nf(cb.budget, dec)} ${cb.unit}.`, ...cb.drivers.map(d => `${d.name}: ${d.delta > 0 ? '+' : ''}${nf(d.delta, dec)} ${cb.unit}`)] }}
    csv={{ name: 'cost-variance', rows: () => cb.drivers.map(d => ({ driver: d.name, delta: d.delta.toFixed(3), inr_lakh_period: A.toLakh(d.delta, cb.vol, demo).toFixed(2) })) }}>
    <Scroll><table className="t"><thead><tr><th>Driver</th><th className="r">Δ {cb.unit}</th><th style={{ textAlign: 'center' }}>vs budget</th><th className="r">₹ in period</th></tr></thead><tbody>
      {cb.drivers.map(d => <tr key={d.name}><td>{d.name}</td><td className="r num">{d.delta > 0 ? '+' : '−'}{nf(Math.abs(d.delta), dec)}</td><td style={{ textAlign: 'center' }}><DivBar v={d.delta} max={mx} /></td><td className="r num">{money(A.toLakh(d.delta, cb.vol, demo), true)}</td></tr>)}
    </tbody></table></Scroll>
  </Card>;
}

function ValueStake({ c, R, groups, title }) {
  const rows = A.valueAtStake(c.db, c.demo, R, groups);
  const tot = rows.reduce((a, b) => a + b.lakh, 0); const mx = Math.max(...rows.map(x => x.lakh), 1);
  return <Card title={title || `${money(tot)} a year still between today's KPIs and their targets`} sub="Remaining value per KPI, from the ₹ already realised per unit of improvement · largest first" flush
    csv={{ name: 'value-at-stake', rows: () => rows.map(x => ({ kpi: x.name, value: x.value, target: x.target, unit: x.unit, owner: x.owner, inr_lakh_yr: x.lakh.toFixed(1) })) }}>
    {rows.length ? <Scroll><table className="t"><thead><tr><th>KPI</th><th className="r">Now</th><th className="r">Target</th><th>Owner</th><th className="r">₹ / year</th><th /></tr></thead><tbody>
      {rows.map(x => <tr key={x.id}><td>{x.name}</td><td className="r num">{fmtNum(x.value, x.dec)} <span className="muted">{x.unit}</span></td><td className="r num">{fmtNum(x.target, x.dec)}</td><td className="muted">{x.owner}</td><td className="r num">{money(x.lakh)}</td><td><CellBar value={x.lakh} max={mx} w={70} /></td></tr>)}
    </tbody></table></Scroll> : <div className="cb"><div className="empty">All money-linked KPIs are at target for {R.label}.</div></div>}
  </Card>;
}

const Ctrl = ({ on }) => <Tag c={on ? 'brand' : 'line'}>{on ? 'Controllable' : 'External'}</Tag>;

/* ---------- discrete and process plants ---------- */
function MfgCost({ c, R }) {
  const d = c.demo;
  const ids = d.kpis.filter(k => k.group === 'cost').map(k => k.id).slice(0, 4);
  const cb = A.costBuild(c.db, d, R);
  const lt = A.lossTree(c.db, d, R);
  const ln = A.lineTable(c.db, d, R);
  const tr = A.costTrend(c.db, d, R);
  const dec = cb.actual >= 100 ? 0 : 2;
  const top = lt.rows[0], line = ln.lines[0], drv = cb.drivers.find(x => Math.sign(x.delta) === Math.sign(cb.gap)) || cb.drivers[0];
  const lmx = Math.max(...lt.rows.map(x => x.lakh));
  return <>
    <KpiRow c={c} ids={ids} R={R} />
    <Headline tone={cb.gap > 0 ? 'warn' : 'good'}>
      Conversion cost is <b className="num">{nf(cb.actual, dec)} {cb.unit}</b> against a budget of {nf(cb.budget, dec)} — <b>{money(A.toLakh(cb.gap, cb.vol, d), true)}</b> in {R.label} on {fmtNum(cb.vol / (A.cfg(d).perUnit || 1))} {d.production.unit}.
      Biggest driver: <b>{drv.name}</b> ({drv.delta > 0 ? '+' : '−'}{nf(Math.abs(drv.delta), dec)}). Act first on <b>{top.name.toLowerCase()}</b> ({money(top.lakh)} lost output) and <b>{line.line}</b> ({money(line.lakh)} to reach {fmtNum(ln.target, 1)} % OEE).
    </Headline>
    <div className="grid g2">
      <BuildUp cb={cb} demo={d} />
      <Drivers cb={cb} demo={d} R={R} />
    </div>
    <div className="grid g21 mt">
      <Card title={`Loss tree: ${fmtNum(lt.hours, 0)} line-hours lost, worth ${money(lt.tot)}`} sub={`OEE losses in ${R.label} · ₹ = lost contribution at ${money(lt.perHour)} per line-hour · worst first`} flush
        ask={{ kind: 'card', title: 'Loss tree', summary: lt.rows.map(x => `${x.name}: ${fmtNum(x.hours, 0)} h, ₹${x.lakh.toFixed(1)} L. Action: ${x.action} (${x.owner})`) }}
        csv={{ name: 'loss-tree', rows: () => lt.rows.map(x => ({ loss: x.name, hours: x.hours.toFixed(1), inr_lakh: x.lakh.toFixed(2), cum_pct: Math.round(x.cum * 100), action: x.action, owner: x.owner })) }}>
        <Scroll><table className="t"><thead><tr><th>Loss</th><th className="r">Hours</th><th className="r">₹</th><th /><th className="r">Cum.</th><th>Next action · owner</th></tr></thead><tbody>
          {lt.rows.map((x, i) => <tr key={x.name}><td style={{ fontWeight: i < 2 ? 600 : 400 }}>{x.name}</td><td className="r num">{fmtNum(x.hours, 0)}</td><td className="r num">{money(x.lakh)}</td><td><CellBar value={x.lakh} max={lmx} w={70} /></td><td className="r num muted">{pct(x.cum)}</td><td style={{ fontSize: 12, minWidth: 220 }}>{x.action}<div className="muted">{x.owner}</div></td></tr>)}
        </tbody></table></Scroll>
      </Card>
      <Card title={`${tr.pts.length ? 'Cost per unit vs budget' : 'Cost trend'}`} sub={`${cb.unit} · daily · ${tr.source}`}>
        {tr.pts.length > 1 ? <LimitChart pts={tr.pts} name="Cost" unit={cb.unit} days={R.days} target={cb.budget} height={260} /> : <div className="empty">Select a period of 2 days or more for a trend.</div>}
      </Card>
    </div>
    <Card className="mt" title={`${line.line} has the most to gain: ${money(line.lakh)} in ${R.label}`} sub={`OEE by line vs ${ln.targetLabel} ${fmtNum(ln.target, 1)} % · ₹ = extra contribution if the line reached it`} flush
      ask={{ kind: 'card', title: 'Line comparison', summary: ln.lines.map(l => `${l.line}: OEE ${l.oee} % (A ${l.a}, P ${l.p}, Q ${l.q}), top loss ${l.top}, ₹${l.lakh.toFixed(1)} L`) }}
      csv={{ name: 'lines', rows: () => ln.lines.map(l => ({ line: l.line, availability: l.a, performance: l.p, quality: l.q, oee: l.oee, top_loss: l.top, inr_lakh_period: l.lakh.toFixed(2) })) }}>
      <Scroll><table className="t"><thead><tr><th>Line</th><th className="r">Availability</th><th className="r">Performance</th><th className="r">Quality</th><th className="r">OEE</th><th className="r">Gap</th><th>Top loss</th><th className="r">₹ at stake</th></tr></thead><tbody>
        {ln.lines.map(l => { const worstF = Math.min(l.a, l.p, l.q); const hl = v => (v === worstF ? { fontWeight: 650, color: 'var(--warn)' } : undefined);
          return <tr key={l.line}><td>{l.line}</td><td className="r num" style={hl(l.a)}>{fmtNum(l.a, 1)} %</td><td className="r num" style={hl(l.p)}>{fmtNum(l.p, 1)} %</td><td className="r num" style={hl(l.q)}>{fmtNum(l.q, 1)} %</td>
            <td className="r num"><b>{fmtNum(l.oee, 1)} %</b></td><td className="r num">{l.gap > 0 ? <span style={{ color: 'var(--bad)' }}>−{fmtNum(l.gap, 1)} pp</span> : <Tag c="good">at target</Tag>}</td><td className="muted">{l.top}</td><td className="r num">{l.lakh > 0 ? money(l.lakh) : '—'}</td></tr>; })}
      </tbody></table></Scroll>
      <div className="muted" style={{ fontSize: 11.5, padding: '8px 16px 12px' }}>The weakest OEE factor of each line is highlighted.</div>
    </Card>
    <div className="mt"><ValueStake c={c} R={R} /></div>
  </>;
}

/* ---------- solar and wind: generation losses ---------- */
function ResCost({ c, R }) {
  const d = c.demo, k = A.cfg(d);
  const ids = d.kpis.filter(x => x.group === 'cost').map(x => x.id).slice(0, 4);
  const g = A.genLosses(c.db, d, R);
  const blocks = A.blockTable(c.db, d, R, g.lost);
  const cb = A.costBuild(c.db, d, R);
  const top = g.rows[0], topCtrl = g.rows.find(x => x.ctrl);
  const lmx = Math.max(...g.rows.map(x => x.mwh)); const bmx = Math.max(...blocks.map(x => x.perMw));
  const daily = g.days.map(x => ({ t: x.t, actual: x.actual }));
  const unitName = d.id === 'wind' ? 'Feeder' : 'Block';
  return <>
    <KpiRow c={c} ids={ids} R={R} />
    <Headline tone="warn">
      <b className="num">{fmtNum(g.lost, 0)} MWh</b> lost in {R.label}, worth <b>{money(g.lakh)}</b> at ₹{g.tariff}/kWh ({fmtNum((g.lost / g.potential) * 100, 1)} % of potential).
      {' '}{fmtNum((g.ctrl / g.lost) * 100, 0)} % is controllable. Biggest: <b>{top.name.toLowerCase()}</b> ({fmtNum(top.mwh, 0)} MWh{top.ctrl ? '' : ', external'}); biggest controllable: <b>{topCtrl.name.toLowerCase()}</b> ({money(topCtrl.lakh)}).
    </Headline>
    <div className="grid g2">
      <Card title={`Energy bridge: ${fmtNum(g.potential, 0)} MWh potential to ${fmtNum(g.actual, 0)} MWh exported`} sub={`MWh · ${R.label}`}
        csv={{ name: 'energy-bridge', rows: () => [{ step: 'Potential', mwh: g.potential.toFixed(0) }, ...g.rows.map(x => ({ step: x.name, mwh: (-x.mwh).toFixed(0) })), { step: 'Net export', mwh: g.actual.toFixed(0) }] }}>
        <HWaterfall unit="MWh" rows={[{ name: 'Potential (weather-corrected)', v: g.potential, kind: 'total' }, ...g.rows.map(x => ({ name: x.name, v: -x.mwh })), { name: 'Net export', v: g.actual, kind: 'total' }]} />
      </Card>
      <Card title="Daily net export vs P50 plan" sub={`MWh per day · dashed line = P50 plan ${fmtNum(d.production.planPerDay)} MWh`}>
        {daily.length > 1 ? <DayBars data={daily} keys={[{ key: 'actual', name: 'Net export' }]} unit="MWh" days={R.days} target={d.production.planPerDay} height={250} /> : <div className="empty">Select a period of 2 days or more for daily export.</div>}
      </Card>
    </div>
      <Card className="mt" title={`Where the ${fmtNum(g.lost, 0)} MWh went`} sub={`MWh and ₹ in ${R.label} · largest first`} flush
        ask={{ kind: 'card', title: 'Generation losses', summary: g.rows.map(x => `${x.name}: ${fmtNum(x.mwh, 0)} MWh, ₹${x.lakh.toFixed(1)} L, ${x.ctrl ? 'controllable' : 'external'}. ${x.action}`) }}
        csv={{ name: 'generation-losses', rows: () => g.rows.map(x => ({ loss: x.name, mwh: x.mwh.toFixed(0), inr_lakh: x.lakh.toFixed(1), controllable: x.ctrl, action: x.action, owner: x.owner })) }}>
        <Scroll><table className="t"><thead><tr><th>Loss</th><th className="r">MWh</th><th /><th className="r">₹</th><th>Type</th><th>Next action · owner</th></tr></thead><tbody>
          {g.rows.map(x => <tr key={x.name}><td>{x.name}</td><td className="r num">{fmtNum(x.mwh, 0)}</td><td><CellBar value={x.mwh} max={lmx} w={60} /></td><td className="r num">{money(x.lakh)}</td><td><Ctrl on={x.ctrl} /></td><td style={{ fontSize: 12, minWidth: 200 }}>{x.action}<div className="muted">{x.owner}</div></td></tr>)}
        </tbody></table></Scroll>
      </Card>
      <Card className="mt" title={`${blocks[0].name} loses the most per ${k.capUnit}`} sub={`${unitName}s ranked by lost MWh per ${k.capUnit} · ${R.label}`} flush
        csv={{ name: 'blocks', rows: () => blocks.map(x => ({ block: x.name, capacity: x.cap, availability: x.a, performance: x.p, lost_mwh: x.mwh.toFixed(0), inr_lakh: x.lakh.toFixed(1), top_loss: x.top })) }}>
        <Scroll><table className="t"><thead><tr><th>{unitName}</th><th className="r">{k.capUnit}</th><th className="r">Avail.</th><th className="r">{d.id === 'solar' ? 'PR' : 'Perf.'}</th><th className="r">Lost MWh</th><th className="r">MWh/{k.capUnit}</th><th /><th>Top loss</th></tr></thead><tbody>
          {blocks.map(x => <tr key={x.name}><td>{x.name}</td><td className="r num">{x.cap}</td><td className="r num">{fmtNum(x.a, 1)} %</td><td className="r num">{fmtNum(x.p, 1)} %</td><td className="r num">{fmtNum(x.mwh, 0)}</td><td className="r num">{fmtNum(x.perMw, 1)}</td><td><CellBar value={x.perMw} max={bmx} w={56} /></td><td className="muted">{x.top}</td></tr>)}
        </tbody></table></Scroll>
      </Card>
    <div className="grid g2 mt">
      <Drivers cb={cb} demo={d} R={R} />
      <BuildUp cb={cb} demo={d} title={`O&M cost: ${nf(cb.actual, 2)} ${cb.unit}`} sub={`Budget ${nf(cb.budget, 2)} · ₹ column = ${k.capacity} ${k.capUnit} over ${R.label}`} />
    </div>
  </>;
}

/* ---------- energy & utilities: energy cost and losses ---------- */
function EmsCost({ c, R }) {
  const d = c.demo;
  const e = c.tools.get_energy({ from: new Date(R.from).toISOString(), to: new Date(R.to).toISOString() });
  const cb = A.costBuild(c.db, d, R, e.energy_kwh);
  const ls = A.emsLosses(c.db, d, R, cb.actual);
  const tr = A.costTrend(c.db, d, R);
  const tot = ls.reduce((a, b) => a + b.lakh, 0), mwh = ls.reduce((a, b) => a + b.mwh, 0), lmx = Math.max(...ls.map(x => x.mwh));
  const drv = cb.drivers.find(x => Math.sign(x.delta) === Math.sign(cb.gap)) || cb.drivers[0];
  return <>
    <KpiRow c={c} ids={['cost', 'md', 'pf', 'sec']} R={R} />
    <Headline tone={cb.gap > 0 ? 'warn' : 'good'}>
      Blended energy cost is <b className="num">₹{nf(cb.actual, 2)}/kWh</b> against a budget of ₹{nf(cb.budget, 2)} — <b>{money(A.toLakh(cb.gap, cb.vol, d), true)}</b> on {fmtNum(e.energy_kwh / 1000, 0)} MWh in {R.label}. Biggest driver: <b>{drv.name}</b> ({drv.delta > 0 ? '+' : '−'}₹{nf(Math.abs(drv.delta), 2)}/kWh).
      {' '}Avoidable utility losses: <b>{fmtNum(mwh, 0)} MWh ({money(tot)})</b>, led by {ls[0].name.toLowerCase()}.
    </Headline>
    <div className="grid g2">
      <BuildUp cb={cb} demo={d} title={`Tariff build-up: ₹${nf(cb.actual, 2)}/kWh`} sub={`Budget ₹${nf(cb.budget, 2)}/kWh · ₹ column = ${fmtNum(e.energy_kwh / 1000, 0)} MWh in ${R.label}`} />
      <Drivers cb={cb} demo={d} R={R} />
    </div>
    <div className="grid g21 mt">
      <Card title={`Avoidable losses: ${fmtNum(mwh, 0)} MWh, ${money(tot)} in ${R.label}`} sub={`MWh-equivalent at ₹${nf(cb.actual, 2)}/kWh · largest first`} flush
        ask={{ kind: 'card', title: 'Utility losses', summary: ls.map(x => `${x.name}: ${fmtNum(x.mwh, 0)} MWh, ₹${x.lakh.toFixed(1)} L. ${x.action}`) }}
        csv={{ name: 'utility-losses', rows: () => ls.map(x => ({ loss: x.name, mwh: x.mwh.toFixed(1), inr_lakh: x.lakh.toFixed(2), action: x.action, owner: x.owner })) }}>
        <Scroll><table className="t"><thead><tr><th>Loss</th><th className="r">MWh</th><th /><th className="r">₹</th><th>Next action · owner</th></tr></thead><tbody>
          {ls.map(x => <tr key={x.name}><td>{x.name}</td><td className="r num">{fmtNum(x.mwh, 0)}</td><td><CellBar value={x.mwh} max={lmx} w={60} /></td><td className="r num">{money(x.lakh)}</td><td style={{ fontSize: 12, minWidth: 220 }}>{x.action}<div className="muted">{x.owner}</div></td></tr>)}
        </tbody></table></Scroll>
      </Card>
      <Card title="Blended cost vs budget" sub={`₹/kWh · daily · ${tr.source}`}>
        {tr.pts.length > 1 ? <LimitChart pts={tr.pts} name="₹/kWh" unit="₹/kWh" days={R.days} target={cb.budget} height={260} /> : <div className="empty">Select a period of 2 days or more for a trend.</div>}
      </Card>
    </div>
    <div className="mt"><ValueStake c={c} R={R} /></div>
  </>;
}

/* ---------- coal power plant: heat rate and losses ---------- */
function PowerCost({ c, R }) {
  const d = c.demo;
  const hr = A.heatRate(c.db, d, R);
  const cb = A.costBuild(c.db, d, R);
  const trend = c.db.kpiDaily('nhr').filter(x => x.t >= R.from - D && x.t <= R.to).map(x => ({ t: x.t, v: x.v }));
  const top = hr.rows[0];
  const yr = hr.rows.reduce((a, b) => a + b.lakhYr, 0);
  return <>
    <KpiRow c={c} ids={['nhr', 'apc', 'beff', 'scc']} R={R} />
    <Headline tone="warn">
      Net heat rate is <b className="num">{fmtNum(hr.actual, 0)} kcal/kWh</b> vs target {fmtNum(hr.target, 0)}: <b>{fmtNum(hr.dev, 0)} kcal/kWh</b> of controllable deviation from design costs <b>{money(hr.lakh)}</b> in {R.label} ({money(yr)} a year).
      {' '}Start with <b>{top.name.toLowerCase()}</b> ({fmtNum(top.kcal, 0)} kcal/kWh, {money(top.lakhYr)}/yr). Each kcal/kWh is worth ₹{fmtNum(hr.rsPerKcalMWh, 2)}/MWh.
    </Headline>
    <div className="grid g2">
      <Card title={`Heat-rate gap: design ${fmtNum(hr.design, 0)} to actual ${fmtNum(hr.actual, 0)} kcal/kWh`} sub="kcal/kWh · red adds heat rate">
        <HWaterfall upBad unit="kcal/kWh" rows={[{ name: 'Design net heat rate', v: hr.design, kind: 'total' }, ...hr.rows.map(x => ({ name: x.name, v: x.kcal })), { name: 'Actual net heat rate', v: hr.actual, kind: 'total' }]} />
      </Card>
      <Card title={`Deviations worth ${money(hr.lakh)} in ${R.label}`} sub={`On ${fmtNum(hr.gen, 0)} MWh generated · coal at landed cost`} flush
        ask={{ kind: 'card', title: 'Heat-rate deviations', summary: hr.rows.map(x => `${x.name}: ${x.kcal} kcal/kWh, ₹${x.lakhYr.toFixed(0)} L/yr. ${x.action}`) }}
        csv={{ name: 'heat-rate-deviations', rows: () => hr.rows.map(x => ({ item: x.name, kcal_per_kwh: x.kcal, inr_lakh_period: x.lakh.toFixed(2), inr_lakh_yr: x.lakhYr.toFixed(0), action: x.action, owner: x.owner })) }}>
        <Scroll><table className="t"><thead><tr><th>Deviation</th><th className="r">kcal/kWh</th><th className="r">₹ period</th><th className="r">₹ / year</th><th>Next action · owner</th></tr></thead><tbody>
          {hr.rows.map(x => <tr key={x.name}><td>{x.name}</td><td className="r num">{x.kcal}</td><td className="r num">{money(x.lakh)}</td><td className="r num">{money(x.lakhYr)}</td><td style={{ fontSize: 12, minWidth: 220 }}>{x.action}<div className="muted">{x.owner}</div></td></tr>)}
        </tbody></table></Scroll>
      </Card>
    </div>
    <div className="grid g2 mt">
      <Card title="Net heat rate vs target" sub="kcal/kWh · daily">
        {trend.length > 1 ? <LimitChart pts={trend} name="Net heat rate" unit="kcal/kWh" days={R.days} target={hr.target} height={250} /> : <div className="empty">Select a period of 2 days or more for a trend.</div>}
      </Card>
      <Drivers cb={cb} demo={d} R={R} />
    </div>
    <div className="grid g2 mt">
      <BuildUp cb={cb} demo={d} title={`Generation cost: ₹${fmtNum(cb.actual, 0)}/MWh`} />
      <ValueStake c={c} R={R} />
    </div>
  </>;
}
