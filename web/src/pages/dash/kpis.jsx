/* Built-in dashboard: KPI scorecard (value tracking).
   Who: leadership and the value-tracking office.
   Questions it answers:
     1. Which KPIs are on target, on track, at risk or off track?   → status mix tile, grouped scorecard
     2. How much value (₹ lakh/yr) is realised vs the potential?     → value tiles, realised-vs-potential bullets
     3. What moved this period, and which way?                       → change vs the previous equal period (diverging bars)
     4. For one KPI (URL sub-path selects it): where is it heading, how far from target, who owns it, what levers exist?
   All values are averages over the selected period; "previous period" is the same length immediately before it. */
import React, { useRef } from 'react';
import { useApp } from '../../App.jsx';
import { Card, Empty } from '../../components/ui.jsx';
import { fmtNum, fmtDate } from '../../lib/data.js';
import { kpiStats, rolling, leversFor, fmtLakh, STATUS_ORDER, statusTone, profileOf } from '../../shared/analytics/dash-ov.js';
import { KpiTrend, StatusTag, Bullet, Diverge, Legend } from './dash-ov-ui.jsx';

const GROUPS = {
  default: { cost: 'Productivity & cost', maintenance: 'Reliability & maintenance', quality: 'Quality', energy: 'Energy' },
  renewable: { cost: 'Generation & cost', maintenance: 'Availability & O&M', quality: 'Asset condition', energy: 'Grid & export' },
  utility: { cost: 'Cost & demand', maintenance: 'Recovery & upkeep', quality: 'Power quality', energy: 'Efficiency' },
  power: { cost: 'Heat rate & output', maintenance: 'Reliability', quality: 'Coal & water chemistry', energy: 'Cycle efficiency' },
};
const arrow = (k, d) => (d > 0 ? '▲' : d < 0 ? '▼' : '■');

export default function Kpis({ c, R, sel }) {
  const { nav } = useApp();
  const drill = useRef(null);
  const all = kpiStats(c.db, R);
  const k = all.find(x => x.id === sel) || all.find(x => x.status === 'Off track') || all.find(x => x.status === 'At risk') || all[0];
  const prof = profileOf(c.demo);
  const gName = GROUPS[prof] || GROUPS.default;
  const groups = ['cost', 'maintenance', 'quality', 'energy'].filter(g => all.some(x => x.group === g));
  const money = all.filter(x => x.lakh).sort((a, b) => b.potential - a.potential);
  const realised = money.reduce((a, x) => a + x.realised, 0), potential = money.reduce((a, x) => a + x.potential, 0);
  const left = [...money].sort((a, b) => (b.potential - b.realised) - (a.potential - a.realised));
  const counts = STATUS_ORDER.map(s => [s, all.filter(x => x.status === s).length]);
  const hasPrev = all.some(x => x.delta != null);
  const moved = all.filter(x => x.deltaProg != null).sort((a, b) => Math.abs(b.deltaProg) - Math.abs(a.deltaProg));
  const better = moved.filter(x => x.deltaGood && Math.abs(x.deltaProg) >= 0.01).length, worse = moved.filter(x => x.deltaGood === false && Math.abs(x.deltaProg) >= 0.01).length;
  const maxMove = Math.max(0.05, ...moved.map(x => Math.abs(x.deltaProg)));
  const series = rolling(c.db.kpiDaily(k.id), 7);
  const levers = leversFor(c.demo, k.id);
  const select = id => { nav(`artefactory/${c.demo.id}-kpis/${id}`); setTimeout(() => drill.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); };
  const flat = x => x.deltaProg != null && Math.abs(x.deltaProg) < 0.01;
  const dCol = x => x.delta == null || flat(x) ? undefined : x.deltaGood ? 'var(--good)' : 'var(--bad)';
  const dTxt = x => x.delta == null ? '—' : flat(x) ? '≈ 0' : `${arrow(x, x.delta)} ${fmtNum(Math.abs(x.delta), Math.min(3, x.dec + 1))}`;

  return <>
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      <div className="kpi"><div className="l">Value realised</div><div className="v">{fmtLakh(realised)}<small>/yr</small></div>
        <div style={{ margin: '6px 0 4px' }}><Bullet value={realised} max={potential} total={potential} tone="good" h={8} /></div>
        <div className="f"><span>{fmtNum((realised / (potential || 1)) * 100, 0)} % of {fmtLakh(potential)}/yr potential at target</span></div></div>
      <div className="kpi"><div className="l">Still to capture</div><div className="v">{fmtLakh(potential - realised)}<small>/yr</small></div>
        <div className="f" style={{ marginTop: 4 }}><span>Largest: {left[0] ? `${left[0].name} (${fmtLakh(left[0].potential - left[0].realised)})` : '—'}</span></div></div>
      <div className="kpi"><div className="l">KPI status · {all.length} KPIs</div>
        <div style={{ display: 'flex', height: 10, borderRadius: 4, overflow: 'hidden', gap: 2, margin: '12px 0 8px' }}>{counts.filter(([, n]) => n).map(([s, n]) => <div key={s} title={`${s}: ${n}`} style={{ flex: n, background: `var(--${statusTone(s)})` }} />)}</div>
        <div className="f" style={{ flexWrap: 'wrap', gap: '4px 10px' }}>{counts.map(([s, n]) => <span key={s} className="row" style={{ gap: 4 }}><span className="dotc" style={{ background: `var(--${statusTone(s)})` }} />{s} <b style={{ color: 'var(--text)' }}>{n}</b></span>)}</div></div>
      <div className="kpi"><div className="l">Moved vs previous {R.label}</div>
        {hasPrev ? <><div className="v"><span style={{ color: 'var(--good)' }}>{better}</span><small>better</small> <span style={{ color: worse ? 'var(--bad)' : 'var(--text)', marginLeft: 6 }}>{worse}</span><small>worse</small></div>
          <div className="f" style={{ marginTop: 4 }}><span className="ellipsis">Biggest: {moved[0].name} {moved[0].deltaGood ? 'improved' : 'slipped'} {fmtNum(Math.abs(moved[0].delta), Math.min(3, moved[0].dec + 1))} {moved[0].unit}</span></div></>
          : <><div className="v">—</div><div className="f"><span>No earlier period of this length in the data</span></div></>}</div>
    </div>

    <div ref={drill} style={{ scrollMarginTop: 80 }}>
      <Card title={<span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>{k.name}: {fmtNum(k.value, k.dec)} {k.unit} <StatusTag s={k.status} /></span>}
        sub={`${k.gapMet ? 'Target met' : `${fmtNum(k.gap, k.dec)} ${k.unit} to target`} · ${k.improvePct >= 0 ? 'better' : 'worse'} than baseline by ${Math.abs(k.improvePct)} % · owner ${k.owner} · average over ${R.label}`}
        ask={{ kind: 'card', title: k.name, summary: [`${k.name} averaged ${fmtNum(k.value, k.dec)} ${k.unit} over ${R.label}; baseline ${k.base}, target ${k.target}, status ${k.status}.`, k.delta != null ? `Change vs previous period: ${fmtNum(k.delta, k.dec)} ${k.unit}.` : ''] }}
        csv={{ name: k.id, rows: () => series.map(x => ({ date: new Date(x.t).toISOString().slice(0, 10), value: x.v, mean_7d: x.avg })) }}>
        <div className="grid g21" style={{ gap: 20 }}>
          <div>
            <KpiTrend data={series} k={k} goLive={c.db.goLive} baseFrom={c.db.baselineFrom} baseTo={c.db.baselineTo} from={R.from} to={R.to} />
            <Legend items={[['Daily value', 'var(--muted)'], ['7-day mean', 'var(--brand)'], ['Baseline', 'var(--muted)', true], ['Target', 'var(--good)', true]]} />
          </div>
          <div style={{ fontSize: 13 }}>
            <table className="t" style={{ fontSize: 13 }}><tbody style={{ whiteSpace: 'nowrap' }}>
              <tr><td className="muted">Baseline</td><td className="r num">{fmtNum(k.base, k.dec)}</td></tr>
              <tr><td className="muted">This period</td><td className="r num b">{fmtNum(k.value, k.dec)} {k.unit}</td></tr>
              <tr><td className="muted">Previous period</td><td className="r num">{k.prev == null ? '—' : fmtNum(k.prev, k.dec)}{k.delta != null && <span style={{ marginLeft: 6, color: dCol(k), fontWeight: 600 }}>{dTxt(k)}</span>}</td></tr>
              <tr><td className="muted">Target</td><td className="r num">{fmtNum(k.target, k.dec)}</td></tr>
              <tr><td className="muted">Way from baseline to target</td><td className="r"><div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}><div style={{ width: 80 }}><Bullet value={Math.max(0, Math.min(1, k.prog))} max={1} total={1} tone={statusTone(k.status)} h={8} /></div><span className="num">{Math.round(k.prog * 100)} %</span></div></td></tr>
              <tr><td className="muted">Value realised / at target</td><td className="r num">{k.lakh ? `${fmtLakh(k.realised)} / ${fmtLakh(k.potential)}` : 'not a ₹ KPI'}</td></tr>
            </tbody></table>
            <div className="muted" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', margin: '12px 0 4px' }}>Levers in flight</div>
            {levers.length ? levers.map(l => <div key={l.name} style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
              <div className="row" style={{ fontSize: 12.5 }}><b className="grow">{l.name}</b><span className={`tag ${l.status === 'applied' ? 'good' : l.status === 'approved' ? 'info' : ''}`}>{l.status}</span></div>
              <div className="muted" style={{ fontSize: 12 }}>{l.asset}: {fmtNum(l.current)} → {fmtNum(l.recommended)} {l.unit} · <span style={{ color: 'var(--text)' }}>{l.gain}</span></div></div>)
              : <div className="muted" style={{ fontSize: 12.5 }}>No setpoint recommendation is linked to this KPI. Ask Copilot for the drivers.</div>}
          </div>
        </div>
      </Card>
    </div>

    <div className="grid g2 mt">
      <Card title={`${fmtLakh(realised)}/yr realised of ${fmtLakh(potential)}/yr potential`} sub={`₹ KPIs, largest potential first · realised = value at the ${R.label} average`}
        csv={{ name: 'kpi-value', rows: () => money.map(x => ({ kpi: x.name, realised_lakh_yr: x.realised, potential_lakh_yr: x.potential })) }}>
        {money.length ? money.map(x => <button key={x.id} onClick={() => select(x.id)} className="row" style={{ width: '100%', padding: '5px 0', fontSize: 12.5, background: 'none', border: 0, color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
          <span className="ellipsis" style={{ width: 'clamp(96px, 32%, 160px)', flex: 'none', fontWeight: x.id === k.id ? 650 : 400 }}>{x.name}</span>
          <span className="grow"><Bullet value={x.realised} max={x.potential} total={money[0].potential} tone="good" /></span>
          <span className="num" style={{ width: 132, textAlign: 'right', whiteSpace: 'nowrap', fontSize: 12 }}>{fmtLakh(x.realised)} <span className="muted">/ {fmtLakh(x.potential)}</span></span></button>)
          : <Empty>No KPI carries a ₹ value.</Empty>}
        <Legend items={[['Realised', 'var(--good)'], ['Potential at target', 'var(--bg-3)']]} />
      </Card>
      <Card title={hasPrev ? `${better} KPIs improved, ${worse} slipped vs previous ${R.label}` : 'What moved'} sub="Change as a share of the baseline → target distance · right is better">
        {hasPrev ? moved.map(x => <button key={x.id} onClick={() => select(x.id)} className="row" style={{ width: '100%', padding: '5px 0', fontSize: 12.5, background: 'none', border: 0, color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
          <span className="ellipsis" style={{ width: 'clamp(96px, 32%, 160px)', flex: 'none', fontWeight: x.id === k.id ? 650 : 400 }}>{x.name}</span>
          <span className="grow"><Diverge v={(x.deltaGood ? 1 : -1) * Math.abs(x.deltaProg) / maxMove} good={x.deltaGood} /></span>
          <span className="num" style={{ width: 110, textAlign: 'right', whiteSpace: 'nowrap', color: dCol(x) }}>{dTxt(x)} <span className="muted" style={{ fontSize: 11 }}>{x.unit.length < 8 ? x.unit : ''}</span></span></button>)
          : <Empty>The selected period covers the whole data history, so there is no earlier period to compare. Pick 90 days or less.</Empty>}
      </Card>
    </div>

    <Card title="Scorecard" sub={`Average over ${R.label} (${fmtDate(R.from)} – ${fmtDate(R.to)})${R.from < c.db.goLive ? ` · includes ${Math.round((c.db.goLive - R.from) / 864e5)} days before go-live, so values sit closer to baseline` : ''} · click a KPI to drill down`} flush className="mt"
      csv={{ name: 'kpis', rows: () => all.map(x => ({ kpi: x.name, unit: x.unit, owner: x.owner, baseline: x.base, value: x.value, target: x.target, gap_to_target: Math.round(x.gap * 1000) / 1000, change_vs_previous: x.delta, progress_pct: Math.round(x.prog * 100), status: x.status, realised_lakh_yr: x.realised, potential_lakh_yr: x.potential })) }}>
      <div className="scroll-x"><table className="t"><thead><tr><th>KPI</th><th className="r">Baseline</th><th className="r">Period</th><th className="r">Target</th><th className="r">Gap</th><th className="r">vs prev.</th><th>Progress</th><th>Status</th><th className="r">₹ L/yr real. / pot.</th><th>Owner</th></tr></thead>
        <tbody>{groups.map(g => <React.Fragment key={g}><tr><td colSpan={10} className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', background: 'var(--bg-2)' }}>{gName[g]}</td></tr>
          {all.filter(x => x.group === g).map(x => <tr key={x.id} className={`click ${x.id === k.id ? 'on' : ''}`} onClick={() => select(x.id)}>
            <td className="b">{x.name} <span className="muted" style={{ fontWeight: 400 }}>{x.unit}</span></td>
            <td className="r num muted">{fmtNum(x.base, x.dec)}</td><td className="r num b">{fmtNum(x.value, x.dec)}</td><td className="r num">{fmtNum(x.target, x.dec)}</td>
            <td className="r num" style={{ color: x.gapMet ? 'var(--good)' : undefined }}>{x.gapMet ? 'met' : fmtNum(x.gap, x.dec)}</td>
            <td className="r num" style={{ color: dCol(x) }}>{dTxt(x)}</td>
            <td><div className="row" style={{ gap: 6 }}><div style={{ width: 90 }}><Bullet value={Math.max(0, Math.min(1, x.prog))} max={1} total={1} tone={statusTone(x.status)} h={8} /></div><span className="num muted" style={{ fontSize: 12 }}>{Math.round(x.prog * 100)}%</span></div></td>
            <td><StatusTag s={x.status} /></td>
            <td className="r num">{x.lakh ? <>{fmtNum(x.realised, 0)} <span className="muted">/ {fmtNum(x.potential, 0)}</span></> : <span className="muted">—</span>}</td>
            <td className="muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{x.owner}</td></tr>)}</React.Fragment>)}</tbody></table></div>
    </Card>
  </>;
}
