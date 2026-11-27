/* Built-in dashboard: quality (renamed per plant by dashNames).
   Users: quality head, production head (performance engineer / electrical head / combustion engineer by plant type).
   Questions it answers:
     1. How much does poor quality cost in the selected period, and is it improving? (KPI tiles, headline)
     2. Which defects cost the most, and what is the cause, action and owner for each? (Pareto in ₹)
     3. Is the key process parameter capable and in control? (SPC chart with spec and control limits, Cp/Cpk, histogram)
   Content by plant family (shared/analytics/dash-cq.js):
     mfg   FPY / RFT tiles, cost-of-poor-quality Pareto, top causes and actions, SPC with Cpk
     solar performance ratio by block and trend, soiling ratio per site, thermography findings with MWh at risk
     wind  power-curve performance index per turbine, warranted vs measured curve, yaw SPC, component findings
     ems   power quality vs IEEE 519 / IEC limits per measuring point, PQ events with ₹ impact, PF and THD trends
     power coal quality (GCV, moisture, ash), UBC and fineness, O₂ SPC with Cpk, combustion excursions with ₹ */
import React from 'react';
import { Card, Tag } from '../../components/ui.jsx';
import { fmtNum } from '../../lib/data.js';
import { D, KpiRow } from './common.jsx';
import * as A from '../../shared/analytics/dash-cq.js';
import { money, nf, decOf, Headline, Tile, Scroll, CellBar, DivBar, LimitChart, Hist, CurveChart } from './cq-ui.jsx';

const pct = v => `${fmtNum(v * 100, 0)}\u00a0%`;

export default function Quality({ c, R }) {
  const f = A.family(c.demo);
  if (f === 'res') return c.demo.id === 'wind' ? <WindQuality c={c} R={R} /> : <SolarQuality c={c} R={R} />;
  if (f === 'ems') return <PowerQuality c={c} R={R} />;
  if (f === 'power') return <CoalQuality c={c} R={R} />;
  return <MfgQuality c={c} R={R} />;
}

/* ---------- shared ---------- */
const cpkTone = v => (v == null ? '' : v >= 1.33 ? 'good' : v >= 1 ? 'warn' : 'bad');
const cpkWord = v => (v >= 1.33 ? 'capable' : v >= 1 ? 'marginal' : 'not capable');

function SpcCards({ c, R, spc, title }) {
  const s = A.spcStats(c.db, spc.asset, spc.tag, spc.lsl, spc.usl, R);
  const unit = c.db.tagDef(spc.asset, spc.tag)?.unit || '';
  const dec = Math.min(4, decOf(Math.abs((spc.usl ?? s.max) - (spc.lsl ?? s.min))) + 1);
  const bins = A.histogram(s.values, spc.lsl, spc.usl);
  return <div className="grid g21 mt">
    <Card title={title || `${spc.name}: ${s.out ? `${s.out} hours outside limits` : 'all hours inside limits'}`} sub={`${unit ? unit + ' · ' : ''}${s.agg === 'day' ? 'daily mean' : s.agg === '4h' ? '4-hour mean' : 'hourly'} · last ${fmtNum(Math.min(R.days, 30), 0)} days (max 30) · solid = spec, dashed = control limits`}
      ask={{ kind: 'card', title: spc.name, summary: [`Mean ${fmtNum(s.mean, dec)}, σ ${fmtNum(s.sd, dec + 1)}, Cpk ${fmtNum(s.cpk, 2)}, ${s.out} of ${s.n} hours outside ${spc.lsl ?? '—'}–${spc.usl ?? '—'}.`] }}
      csv={{ name: 'spc', rows: () => s.pts.map(x => ({ time: new Date(x.t).toISOString(), value: x.v })) }}>
      <LimitChart pts={s.pts} name={spc.name} unit={unit} days={Math.min(30, R.days)} lsl={spc.lsl} usl={spc.usl} ucl={s.ucl} lcl={s.lcl} mean={s.mean} height={250} />
    </Card>
    <Card title={`Cpk ${fmtNum(s.cpk, 2)}: ${cpkWord(s.cpk)}`} sub="Hourly values · capability vs spec">
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <Tag c={cpkTone(s.cpk)}>Cpk {fmtNum(s.cpk, 2)}</Tag>{s.cp != null && <Tag c="line">Cp {fmtNum(s.cp, 2)}</Tag>}
        <Tag c="line">mean {fmtNum(s.mean, dec)}</Tag><Tag c="line">σ {fmtNum(s.sd, dec + 1)}</Tag><Tag c={s.out ? 'bad' : 'good'}>{fmtNum(s.outPct, 1)} % out</Tag>
      </div>
      <Hist bins={bins} lsl={spc.lsl} usl={spc.usl} unit={unit} height={190} />
      <div className="muted" style={{ fontSize: 11.5 }}>{s.cpk >= 1.33 ? 'Keep the current control plan.' : s.cp != null && s.cp >= 1.33 ? 'Spread is fine: re-centre the process.' : 'Reduce variation before tightening inspection.'}</div>
    </Card>
  </div>;
}

function ActionTable({ rows, valueHead = '₹', valueFmt = x => money(x.lakh), title, sub, name }) {
  const r = rows.filter(x => x.action).slice(0, 5);
  return <Card title={title} sub={sub} flush csv={{ name, rows: () => r.map(x => ({ item: x.name, cause: x.cause, action: x.action, owner: x.owner })) }}>
    <Scroll><table className="t"><thead><tr><th>Issue</th><th>Likely cause</th><th>Action</th><th>Owner</th><th className="r">{valueHead}</th></tr></thead><tbody>
      {r.map(x => <tr key={x.name}><td style={{ fontWeight: 600, minWidth: 130 }}>{x.name}</td><td style={{ fontSize: 12, minWidth: 180 }}>{x.cause}</td><td style={{ fontSize: 12, minWidth: 180 }}>{x.action}</td><td className="muted" style={{ fontSize: 12 }}>{x.owner}</td><td className="r num">{valueFmt(x)}</td></tr>)}
    </tbody></table></Scroll>
  </Card>;
}

/* ---------- discrete and process plants ---------- */
function MfgQuality({ c, R }) {
  const d = c.demo;
  const ids = d.kpis.filter(k => k.group === 'quality').map(k => k.id).slice(0, 4);
  const q = A.copq(d, R);
  const top = q.rows[0], mx = Math.max(...q.rows.map(x => x.lakh));
  const s = A.spcStats(c.db, d.quality.spc.asset, d.quality.spc.tag, d.quality.spc.lsl, d.quality.spc.usl, R);
  const n80 = q.rows.findIndex(x => x.cum >= 0.8) + 1;
  return <>
    <KpiRow c={c} ids={ids} R={R} />
    <Headline tone={s.cpk < 1 ? 'bad' : 'warn'}>
      Poor quality cost <b>{money(q.total)}</b> in {R.label} ({fmtNum(q.count)} cases). <b>{top.name}</b> is {pct(top.lakh / q.total)} of it — act there first; {n80} defect{n80 > 1 ? 's' : ''} make 80 %.
      {' '}{d.quality.spc.name} runs at <b>Cpk {fmtNum(s.cpk, 2)}</b> ({cpkWord(s.cpk)}).
    </Headline>
    <div className="grid g2">
      <Card title={`Cost of poor quality by defect: ${money(q.total)}`} sub={`Scrap, rework and reprocessing · ${R.label} · ranked by ₹, not by count`} flush
        ask={{ kind: 'card', title: 'Defect Pareto (₹)', summary: q.rows.map(x => `${x.name}: ${x.count} cases, ₹${x.lakh.toFixed(1)} L`) }}
        csv={{ name: 'defects-inr', rows: () => q.rows.map(x => ({ defect: x.name, cases: x.count, inr_lakh: x.lakh.toFixed(2), inr_per_case: Math.round(x.perCase), cum_pct: Math.round(x.cum * 100) })) }}>
        <Scroll><table className="t"><thead><tr><th>Defect</th><th className="r">Cases</th><th className="r">₹ / case</th><th className="r">₹</th><th /><th className="r">Cum.</th></tr></thead><tbody>
          {q.rows.map((x, i) => <tr key={x.name}><td style={{ fontWeight: i < n80 ? 600 : 400 }}>{x.name}</td><td className="r num">{fmtNum(x.count)}</td><td className="r num">{x.perCase >= 1e5 ? money(x.perCase / 1e5) : '₹' + fmtNum(Math.round(x.perCase))}</td><td className="r num">{money(x.lakh)}</td><td><CellBar value={x.lakh} max={mx} w={70} /></td><td className="r num muted">{pct(x.cum)}</td></tr>)}
        </tbody></table></Scroll>
      </Card>
      <ActionTable name="defect-actions" rows={q.rows} title="Top defect causes and actions" sub="Largest ₹ first · from RCAs and control plan" />
    </div>
    <SpcCards c={c} R={R} spc={d.quality.spc} />
  </>;
}

/* ---------- solar: performance ratio and module health ---------- */
function SolarQuality({ c, R }) {
  const d = c.demo;
  const pr = d.kpis.find(k => k.id === 'pr');
  const prS = c.db.kpiSummary('pr', R.from, R.to);
  const blocks = d.cost.lines.map(l => ({ name: l[0], v: l[2] }));
  const worst = [...blocks].sort((a, b) => a.v - b.v)[0];
  const trend = c.db.kpiDaily('pr').filter(x => x.t >= R.from - D && x.t <= R.to).map(x => ({ t: x.t, v: x.v }));
  const f = A.moduleFindings(d); const fmx = Math.max(...f.map(x => x.mwh));
  const fl = f.reduce((a, b) => a + b.lakh, 0), fm = f.reduce((a, b) => a + b.mwh, 0);
  const sms = c.db.assets.filter(a => a.cls === 'sms');
  return <>
    <KpiRow c={c} ids={['pr', 'soil', 'clean', 'inva']} R={R} />
    <Headline tone={prS.value < pr.target ? 'warn' : 'good'}>
      Portfolio PR is <b className="num">{fmtNum(prS.value, 1)} %</b> vs target {fmtNum(pr.target, 1)} % in {R.label}. <b>{worst.name}</b> is lowest at {fmtNum(worst.v, 1)} % — soiling; clean when the soiling ratio drops below 0.95.
      {' '}Open thermography findings put <b>{fmtNum(fm, 0)} MWh/yr ({money(fl)}/yr)</b> at risk; fix <b>{f[0].name}</b> first.
    </Headline>
    <div className="grid g2">
      <Card title={`Performance ratio by block: ${worst.name} lowest`} sub={`% · temperature-corrected · gap to target ${fmtNum(pr.target, 1)} %, worst first`} flush
        csv={{ name: 'pr-by-block', rows: () => blocks.map(b => ({ block: b.name, pr: b.v, gap_pp: (b.v - pr.target).toFixed(1) })) }}>
        <Scroll><table className="t"><thead><tr><th>Block</th><th className="r">PR</th><th className="r">vs target</th><th style={{ textAlign: 'center' }}>Gap</th></tr></thead><tbody>
          {[...blocks].sort((a, b) => a.v - b.v).map(b => { const g = b.v - pr.target; return <tr key={b.name}><td>{b.name}</td><td className="r num">{fmtNum(b.v, 1)} %</td><td className="r num" style={{ color: g < 0 ? 'var(--bad)' : 'var(--good)' }}>{g < 0 ? '−' : '+'}{fmtNum(Math.abs(g), 1)} pp</td><td style={{ textAlign: 'center' }}><DivBar v={-g} max={Math.max(...blocks.map(x => Math.abs(x.v - pr.target)))} /></td></tr>; })}
        </tbody></table></Scroll>
      </Card>
      <Card title="Portfolio PR vs target" sub="% · daily">
        {trend.length > 1 ? <LimitChart pts={trend} name="PR" unit="%" days={R.days} target={pr.target} height={240} /> : <div className="empty">Select a period of 2 days or more for a trend.</div>}
      </Card>
    </div>
    <div className="grid g3 mt">
      {sms.map(a => { const s = A.spcStats(c.db, a.id, 'soiling_ratio', 0.95, null, R); const last = s.pts[s.pts.length - 1]?.v;
        return <Card key={a.id} title={`${a.site.name.split(' ·')[0]}: soiling ratio ${fmtNum(last, 3)}`} sub={`${a.id} · red line = cleaning trigger 0.95`}>
          <LimitChart pts={s.pts} name="Soiling ratio" unit="" days={Math.min(30, R.days)} lsl={0.95} height={150} color={last < 0.96 ? 'var(--warn)' : undefined} />
        </Card>; })}
    </div>
    <div className="mt">
      <Card title={`Module findings: ${fmtNum(fm, 0)} MWh/yr at risk`} sub="Open thermography and IV-curve findings · ranked by energy at risk" flush
        ask={{ kind: 'card', title: 'Module findings', summary: f.map(x => `${x.name}: ${x.count} open, ${fmtNum(x.mwh, 0)} MWh/yr. ${x.action}`) }}
        csv={{ name: 'module-findings', rows: () => f.map(x => ({ finding: x.name, open: x.count, mwh_yr: x.mwh.toFixed(0), inr_lakh_yr: x.lakh.toFixed(1), action: x.action, owner: x.owner })) }}>
        <Scroll><table className="t"><thead><tr><th>Finding</th><th className="r">Open</th><th className="r">MWh / yr</th><th /><th className="r">₹ / yr</th><th>Action</th><th>Owner</th></tr></thead><tbody>
          {f.map(x => <tr key={x.name}><td>{x.name}</td><td className="r num">{x.count}</td><td className="r num">{fmtNum(x.mwh, 0)}</td><td><CellBar value={x.mwh} max={fmx} w={60} /></td><td className="r num">{money(x.lakh)}</td><td style={{ fontSize: 12, minWidth: 200 }}>{x.action}</td><td className="muted" style={{ fontSize: 12 }}>{x.owner}</td></tr>)}
        </tbody></table></Scroll>
      </Card>
    </div>
  </>;
}

/* ---------- wind: power-curve performance and turbine health ---------- */
function WindQuality({ c, R }) {
  const d = c.demo, k = A.cfg(d);
  const pc = d.kpis.find(x => x.id === 'pcpi'); const pcS = c.db.kpiSummary('pcpi', R.from, R.to);
  const t = A.turbines(c.db, d); const w = t[0];
  /* scale turbine deficits so they add up to the portfolio's power-curve loss on the cost board */
  const pcLoss = A.genLosses(c.db, d, R).rows.find(x => /power curve/i.test(x.name));
  const sc = pcLoss ? pcLoss.mwh / t.reduce((a, b) => a + b.mwhMonth, 0) : R.days / 30;
  const under = t.filter(x => x.pcpi < 97);
  const lostU = under.reduce((a, b) => a + b.mwhMonth, 0) * sc;
  const curve = A.powerCurve(w);
  const tmx = Math.max(...t.map(x => x.mwhMonth));
  const comp = d.quality.defects.map(x => { const cc = k.causes[x[0]] || []; return { name: x[0], count: x[1], lakh: x[1] * (k.sev[x[0]] || 1), cause: cc[0], action: cc[1], owner: cc[2] }; }).sort((a, b) => b.lakh - a.lakh);
  return <>
    <KpiRow c={c} ids={['pcpi', 'avail', 'mttr', 'gbxexc']} R={R} />
    <Headline tone="warn">
      Power-curve index is <b className="num">{fmtNum(pcS.value, 1)} %</b> vs target {fmtNum(pc.target, 1)} %. {under.length} turbine{under.length === 1 ? '' : 's'} below 97 % lose <b>{fmtNum(lostU, 0)} MWh ({money(lostU * 1000 * k.tariff / 1e5)})</b> in {R.label}.
      {' '}Worst: <b>{w.id}</b> at {fmtNum(w.pcpi, 1)} %{w.note ? ` — ${w.note.replace(/^[A-Z]{2}-WTG-\d+\s*/, '')}` : ''}.
    </Headline>
    <div className="grid g2">
      <Card title="Turbines ranked by power-curve index" sub={`Measured vs warranted curve (IEC 61400-12) · lost energy in ${R.label}`} flush
        csv={{ name: 'turbine-pcpi', rows: () => t.map(x => ({ turbine: x.id, site: x.site, rated_mw: x.rated, pcpi: x.pcpi, lost_mwh: (x.mwhMonth * sc).toFixed(1), inr_lakh: (x.lakhMonth * sc).toFixed(2) })) }}>
        <Scroll><table className="t"><thead><tr><th>Turbine</th><th>Site</th><th className="r">PCPI</th><th className="r">Lost MWh</th><th /><th className="r">₹</th></tr></thead><tbody>
          {t.slice(0, 10).map(x => <tr key={x.id}><td style={{ fontWeight: x.pcpi < 97 ? 600 : 400 }}>{x.id}</td><td className="muted">{x.site}</td><td className="r num" style={{ color: x.pcpi < 97 ? 'var(--bad)' : x.pcpi < pc.target ? 'var(--warn)' : undefined }}>{fmtNum(x.pcpi, 1)} %</td><td className="r num">{fmtNum(x.mwhMonth * sc, 0)}</td><td><CellBar value={x.mwhMonth} max={tmx} w={60} /></td><td className="r num">{money(x.lakhMonth * sc)}</td></tr>)}
        </tbody></table></Scroll>
        <div className="muted" style={{ fontSize: 11.5, padding: '8px 16px 12px' }}>Worst 10 of {t.length} turbines shown; CSV has all.</div>
      </Card>
      <Card title={`${w.id}: measured vs warranted power curve`} sub={`kW by wind-speed bin · ${w.rated} MW · deficit is in partial load (6–10 m/s)`}>
        <CurveChart data={curve} height={280} />
      </Card>
    </div>
    <SpcCards c={c} R={R} spc={d.quality.spc} title={`${d.quality.spc.name}: target band ±8°`} />
    <div className="mt">
      <ActionTable name="component-findings" rows={comp} title="Component findings and actions" sub="Open inspection findings · ₹ = estimated repair if deferred" valueHead="Open · ₹" valueFmt={x => `${x.count} · ${money(x.lakh)}`} />
    </div>
  </>;
}

/* ---------- energy & utilities: power quality ---------- */
function PowerQuality({ c, R }) {
  const d = c.demo;
  const pts = A.pqPoints(c.db, d, R);
  const ev = A.pqEvents(d, R); const evL = ev.reduce((a, b) => a + b.lakh, 0), evN = ev.reduce((a, b) => a + b.count, 0); const emx = Math.max(...ev.map(x => x.lakh), 0.01);
  const g = id => pts.find(x => x.asset === 'GRID-01' && x.tag === id);
  const pf = g('pf'), thdv = g('thd_v'), tdd = g('thd_i'), vu = g('v_unbal');
  const worst = pts[0];
  const tone = x => (x.outPct > 1 ? 'bad' : x.margin < Math.abs(x.limit) * 0.15 ? 'warn' : 'good');
  const pfS = A.spcStats(c.db, 'GRID-01', 'pf', 0.97, null, R);
  const tr2 = A.spcStats(c.db, 'TR-02', 'thd_i', null, 12, R);
  const fm = (x, v) => fmtNum(v, x.tag === 'pf' ? 3 : 1);
  return <>
    <div className="kpis">
      <Tile label="Power factor (billing meter)" value={fmtNum(pf.mean, 3)} unit="" tone={tone(pf)} foot={<span>5th pct {fmtNum(pf.worst, 3)} · limit ≥ 0.97 · {fmtNum(pf.outPct, 1)} % hours below</span>} />
      <Tile label="THD-V at PCC (95th pct)" value={fmtNum(thdv.worst, 1)} unit="%" tone={tone(thdv)} foot={<span>IEEE 519 limit 5 % · mean {fmtNum(thdv.mean, 1)} %</span>} />
      <Tile label="TDD at PCC (95th pct)" value={fmtNum(tdd.worst, 1)} unit="%" tone={tone(tdd)} foot={<span>IEEE 519 limit 8 % · {fmtNum(tdd.outPct, 1)} % hours over</span>} />
      <Tile label="Voltage unbalance (95th pct)" value={fmtNum(vu.worst, 2)} unit="%" tone={tone(vu)} foot={<span>Limit 2 % · mean {fmtNum(vu.mean, 2)} %</span>} />
      <Tile label="PQ events" value={fmtNum(evN)} unit="events" tone={evN > 20 ? 'warn' : 'good'} foot={<span>{money(evL)} impact in {R.label}</span>} />
    </div>
    <Headline tone={worst.outPct > 1 ? 'bad' : 'warn'}>
      <b>{worst.name}</b> is the main power-quality issue: {worst.dir === 'min' ? '5th percentile' : '95th percentile'} <b className="num">{fm(worst, worst.worst)} {worst.unit}</b> vs limit {fm(worst, worst.limit)} — {fmtNum(worst.outPct, 1)} % of hours out of limit in {R.label}.
      {' '}PQ events cost <b>{money(evL)}</b>; {ev[0].name.toLowerCase()} lead ({money(ev[0].lakh)}).
    </Headline>
    <div>
      <Card title="Compliance by measuring point" sub={`Hourly values in ${R.label} · worst first`} flush
        csv={{ name: 'pq-compliance', rows: () => pts.map(x => ({ point: x.name, asset: x.asset, standard: x.std, limit: x.limit, mean: x.mean.toFixed(3), p95_or_p5: x.worst, pct_hours_out: x.outPct.toFixed(1) })) }}>
        <Scroll><table className="t"><thead><tr><th>Point</th><th>Basis</th><th className="r">Limit</th><th className="r">Mean</th><th className="r">P95 / P5</th><th className="r">Hours out</th><th>Status</th></tr></thead><tbody>
          {pts.map(x => { const tn = tone(x); return <tr key={x.asset + x.tag}><td>{x.name}<div className="muted" style={{ fontSize: 11 }}>{x.asset}</div></td><td className="muted" style={{ fontSize: 12 }}>{x.std}</td><td className="r num">{x.dir === 'min' ? '≥ ' : '≤ '}{fm(x, x.limit)}</td><td className="r num">{fm(x, x.mean)}</td><td className="r num">{fm(x, x.worst)}</td><td className="r num">{fmtNum(x.outPct, 1)} %</td><td><Tag c={tn}>{tn === 'bad' ? 'Over limit' : tn === 'warn' ? 'Low margin' : 'OK'}</Tag></td></tr>; })}
        </tbody></table></Scroll>
      </Card>
      <Card className="mt" title={`PQ events: ${fmtNum(evN)} in ${R.label}, ${money(evL)}`} sub="₹ = production loss, penalties and equipment stress · largest first" flush
        ask={{ kind: 'card', title: 'Power-quality events', summary: ev.map(x => `${x.name}: ${x.count} events, ₹${x.lakh.toFixed(1)} L. ${x.action}`) }}
        csv={{ name: 'pq-events', rows: () => ev.map(x => ({ event: x.name, count: x.count, inr_lakh: x.lakh.toFixed(2), cause: x.cause, action: x.action, owner: x.owner })) }}>
        <Scroll><table className="t"><thead><tr><th>Event</th><th className="r">Count</th><th className="r">₹</th><th /><th>Action · owner</th></tr></thead><tbody>
          {ev.map(x => <tr key={x.name}><td>{x.name}<div className="muted" style={{ fontSize: 11 }}>{x.cause}</div></td><td className="r num">{x.count}</td><td className="r num">{money(x.lakh)}</td><td><CellBar value={x.lakh} max={emx} w={50} /></td><td style={{ fontSize: 12, minWidth: 180 }}>{x.action}<div className="muted">{x.owner}</div></td></tr>)}
        </tbody></table></Scroll>
      </Card>
    </div>
    <div className="grid g2 mt">
      <Card title={`Billing power factor: ${pfS.out ? `${pfS.out} hours below 0.97` : 'no hours below 0.97'}`} sub={`GRID-01 · ${pfS.agg === 'day' ? 'daily mean' : pfS.agg === '4h' ? '4-hour mean' : 'hourly'} · last ${fmtNum(Math.min(30, R.days), 0)} days`}>
        <LimitChart pts={pfS.pts} name="Power factor" unit="" days={Math.min(30, R.days)} lsl={0.97} target={0.99} height={230} />
      </Card>
      <Card title={`TR-02 LV current THD: ${fmtNum(tr2.p95, 1)} % (95th pct) vs 12 % limit`} sub="% · HF-01 active filter state drives this">
        <LimitChart pts={tr2.pts} name="THD-I" unit="%" days={Math.min(30, R.days)} usl={12} height={230} />
      </Card>
    </div>
  </>;
}

/* ---------- power plant: coal and combustion ---------- */
function CoalQuality({ c, R }) {
  const d = c.demo, k = A.cfg(d);
  const tiles = k.tiles.map(([asset, tag, label, limit, dir, unitOverride]) => { const s = A.tagStats(c.db, asset, tag, R); const out = s.v.filter(v => (dir === 'min' ? v < limit : v > limit)).length / (s.v.length || 1) * 100;
    return { asset, tag, label, limit, dir, unit: unitOverride || s.unit, mean: s.mean, out }; });
  const ev = A.combustion(d, R); const evL = ev.reduce((a, b) => a + b.lakh, 0);
  const gcv = tiles.find(x => x.tag === 'gcv'), mo = tiles.find(x => x.tag === 'moisture');
  const coal = [['gcv', 'GCV', 'kcal/kg', 3500, null], ['moisture', 'Total moisture', '%', null, 14], ['ash', 'Ash', '%', null, 42]].map(([tag, name, unit, lsl, usl]) => ({ tag, name, unit, lsl, usl, s: A.spcStats(c.db, 'CHP-01', tag, lsl, usl, R) }));
  const ubc = A.spcStats(c.db, 'ASH-01', 'ubc_fly', null, 2, R);
  const dec = v => (Math.abs(v) >= 1000 ? 0 : 1);
  return <>
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
      {tiles.map(x => <Tile key={x.tag} label={x.label} value={fmtNum(x.mean, dec(x.mean))} unit={x.unit} tone={x.out > 5 ? 'bad' : x.out > 0 ? 'warn' : 'good'}
        foot={<span>Limit {x.dir === 'min' ? '≥' : '≤'} {fmtNum(x.limit)} · {fmtNum(x.out, 1)} % hours out</span>} />)}
    </div>
    <Headline tone="warn">
      As-fired coal in {R.label}: GCV <b className="num">{fmtNum(gcv.mean, 0)} kcal/kg</b>, moisture {fmtNum(mo.mean, 1)} %{tiles.some(x => x.out > 0) ? `; ${tiles.filter(x => x.out > 0).map(x => x.label.toLowerCase()).join(', ')} out of limit at times` : '; all coal and combustion tiles inside limits on average'}.
      {' '}Combustion and coal excursions cost <b>{money(evL)}</b> in {R.label}; act first on <b>{ev[0].name.toLowerCase()}</b> ({money(ev[0].lakh)}).
    </Headline>
    <div className="grid g3">
      {coal.map(x => <Card key={x.tag} title={`Coal ${x.tag === 'gcv' ? 'GCV' : x.name.toLowerCase()}: ${fmtNum(x.s.mean, dec(x.s.mean))} ${x.unit}`} sub={`CHP-01 · limit ${x.lsl != null ? '≥ ' + fmtNum(x.lsl) : '≤ ' + fmtNum(x.usl)} ${x.unit}`}>
        <LimitChart pts={x.s.pts} name={x.name} unit={x.unit} days={Math.min(30, R.days)} lsl={x.lsl} usl={x.usl} height={160} />
      </Card>)}
    </div>
    <SpcCards c={c} R={R} spc={d.quality.spc} title={`${d.quality.spc.name}: band ${d.quality.spc.lsl}–${d.quality.spc.usl} %`} />
    <div className="grid g21 mt">
      <Card title={`Combustion and coal excursions: ${money(evL)}`} sub={`${R.label} · ₹ = heat-rate penalty, oil support and claims · largest first`} flush
        ask={{ kind: 'card', title: 'Combustion excursions', summary: ev.map(x => `${x.name}: ${x.count}, ₹${x.lakh.toFixed(1)} L. ${x.action}`) }}
        csv={{ name: 'combustion-excursions', rows: () => ev.map(x => ({ excursion: x.name, count: x.count, inr_lakh: x.lakh.toFixed(2), cause: x.cause, action: x.action, owner: x.owner })) }}>
        <Scroll><table className="t"><thead><tr><th>Excursion</th><th className="r">Count</th><th className="r">₹</th><th>Likely cause</th><th>Action · owner</th></tr></thead><tbody>
          {ev.map(x => <tr key={x.name}><td style={{ minWidth: 150 }}>{x.name}</td><td className="r num">{x.count}</td><td className="r num">{money(x.lakh)}</td><td style={{ fontSize: 12, minWidth: 160 }}>{x.cause}</td><td style={{ fontSize: 12, minWidth: 180 }}>{x.action}<div className="muted">{x.owner}</div></td></tr>)}
        </tbody></table></Scroll>
      </Card>
      <Card title={`Unburnt carbon in fly ash: ${fmtNum(ubc.mean, 2)} %`} sub="ASH-01 · limit 2 % · drives the unburnt-carbon heat-rate loss">
        <LimitChart pts={ubc.pts} name="UBC fly ash" unit="%" days={Math.min(30, R.days)} usl={2} height={230} />
      </Card>
    </div>
  </>;
}
