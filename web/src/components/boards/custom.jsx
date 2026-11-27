/* ================= Custom widget boards (made by people, agents and the Copilot) =================
   Who uses them: plant heads, line and shift leads, utility and O&M managers, each on a board built
   for their job (see EXTRA in shared/artefacts.js).
   Every widget answers one question and states the answer in its title:
   - Are we on target, and what is the gap worth?            kpis, kpi_compare, kpi_trend, gauge, headline
   - Where do we lose time, energy or money, worst first?     pareto, losses, table (lines), site_compare
   - Which asset or value needs action now?                    asset_health, tag_trend, live, alerts, table (tags)
   - What can we change, and what is it worth?                 setpoints
   - Are we making the plan?                                   production, energy
   Everything time-based follows the period selector (useApp().rng). Unknown KPI ids, assets or tags
   are skipped, because agents and the Copilot write these specs. */
import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from 'recharts';
import { AlertTriangle, CheckCircle2, Sparkles, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { Card, Tag, HealthBar, Empty } from '../ui.jsx';
import { Spark, usePalette } from '../charts.jsx';
import Markdown from '../Markdown.jsx';
import { fmtNum, fmtRel, axisTime, fmtDateTime } from '../../lib/data.js';
import { D, LiveBadge } from './live.jsx';
import { fmtINR, parseGainLakh, lossMeta, lossItems, defectItems, kpiView, tagStats, stateOfValue, lineRows, isGeneration, productionView, siteRows, demandView, nextAction } from '../../shared/analytics/dash-cb.js';

/* ---------- layout: 12-column grid, rows filled edge to edge ---------- */
const DEFAULT_SPAN = { kpis: 12, headline: 12, text: 12, site_compare: 12, table: 12, gauge: 4, kpi_compare: 6 };
const NAMED = { full: 12, half: 6, third: 4, twothirds: 8, quarter: 3 };
const spanOf = w => Math.max(3, Math.min(12, NAMED[w.span] || (typeof w.span === 'number' ? w.span : DEFAULT_SPAN[w.type] || 6)));
function pack(items) {
  const out = []; let row = [], used = 0;
  const flush = () => {
    let extra = 12 - used, i = row.length - 1;
    while (extra > 0 && row.length) { row[i].span += 1; extra -= 1; i = i === 0 ? row.length - 1 : i - 1; }
    out.push(...row); row = []; used = 0;
  };
  items.forEach(x => { if (used + x.span > 12) flush(); row.push(x); used += x.span; if (used === 12) flush(); });
  flush();
  return out;
}
function useNarrow() {
  const q = '(max-width: 900px)';
  const [n, setN] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => { const m = window.matchMedia(q); const f = () => setN(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return n;
}

/* ---------- small helpers ---------- */
const dec = (unit, v) => (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : Math.abs(v) >= 1 ? 2 : 3);
const fv = (v, d) => fmtNum(v, d ?? dec('', v));
const plural = (n, s, p = s + 's') => `${n} ${n === 1 ? s : p}`;
/* one tick per day (first point of each date), or the default for hourly views */
const dayTicks = (data, days) => { if (days <= 2 || !data.length) return undefined; const seen = new Set(); const out = []; data.forEach(x => { const k = axisTime(x.t, days); if (!seen.has(k)) { seen.add(k); out.push(x.t); } }); return out.length > 1 ? out : undefined; };
const limText = def => { const lo = def.lo != null && def.lo !== 0 ? def.lo : null, hi = def.hi; return lo != null && hi != null ? `Limits ${fv(lo)} to ${fv(hi)} ${def.unit}` : hi != null ? `High limit ${fv(hi)} ${def.unit}` : lo != null ? `Low limit ${fv(lo)} ${def.unit}` : 'No alarm limit set'; };
const limShort = def => { const lo = def.lo != null && def.lo !== 0 ? def.lo : null, hi = def.hi; return lo != null && hi != null ? `${fv(lo)} to ${fv(hi)}` : hi != null ? `≤ ${fv(hi)}` : lo != null ? `≥ ${fv(lo)}` : '—'; };
/* ₹ lakh/yr of a setpoint gain; MWh/yr gains of generation plants are valued at the plant tariff */
const gainLakh = (demo, text) => { const v = parseGainLakh(text); if (v != null) return v; const m = String(text).match(/\+?([\d,.]+)\s?MWh\/yr/); const lm = lossMeta(demo); return m && lm.unit === 'MWh' ? parseFloat(m[1].replace(/,/g, '')) * lm.inr : null; };
const periodText = rng => (rng.label && !/–/.test(rng.label) ? `last ${rng.label}` : rng.label || `last ${rng.days} days`);
const gapText = v => `${fmtNum(Math.abs(v.gap), v.dec)} ${String(v.unit).startsWith('%') ? 'pts' : v.unit}`;
const STATE = { good: 'Normal', warn: 'Near limit', bad: 'Outside limit' };
const STATUS_CLS = { 'On target': 'good', 'On track': 'info', 'At risk': 'warn' };
function niceScale(lo, hi, n = 4) {
  if (!isFinite(lo) || !isFinite(hi)) return { domain: ['auto', 'auto'], ticks: undefined, d: 1 };
  if (hi - lo < 1e-9) { const p = Math.abs(hi) * 0.05 || 1; lo -= p; hi += p; }
  const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
  const ticks = []; for (let v = a; v <= b + step / 2; v += step) ticks.push(+v.toFixed(6));
  const d = step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step) - 1e-9) + (String(step).includes('25') ? 1 : 0));
  return { domain: [a, b], ticks, d };
}

/* ---------- time-series chart with honest scale, target and limit lines ---------- */
function TrendX({ data, series, unit, days, refs = [], xRefs = [], height = 210, zeroBase }) {
  const p = usePalette();
  const vals = data.flatMap(x => series.map(s => x[s.key])).filter(v => v != null && isFinite(v));
  const ry = refs.map(r => r.y).filter(v => v != null && isFinite(v));
  let lo = Math.min(...vals, ...ry), hi = Math.max(...vals, ...ry);
  const pad = (hi - lo) * 0.06; lo -= pad; hi += pad;
  if ((zeroBase && lo > 0) || (Math.min(...vals) >= 0 && lo < 0)) lo = 0;
  const sc = niceScale(lo, hi);
  const bars = series.some(s => s.bar);
  const tip = ({ active, payload, label }) => active && payload?.length ? (
    <div className="tt"><div style={{ fontWeight: 600, marginBottom: 2 }}>{days <= 3 ? fmtDateTime(label) : fmtDateTime(label).split(',')[0]}</div>
      {payload.map(x => <div key={x.dataKey} className="row"><span className="dotc" style={{ background: x.stroke }} />{x.name}: <b className="num">{fmtNum(x.value, Math.max(sc.d, 1))} {unit}</b></div>)}</div>) : null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={p.grid} vertical={false} />
        <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={dayTicks(data, days)} padding={bars ? { left: 14, right: 14 } : undefined} tickFormatter={t => axisTime(t, days)} stroke={p.axis} tickLine={false} axisLine={false} minTickGap={44} fontSize={11} />
        <YAxis stroke={p.axis} tickLine={false} axisLine={false} width={56} fontSize={11} domain={sc.domain} ticks={sc.ticks} allowDataOverflow tickFormatter={v => fmtNum(v, sc.d)} />
        <Tooltip content={tip} />
        {refs.filter(r => r.band).map((r, i) => <ReferenceArea key={'b' + i} y1={r.band === 'above' ? r.y : sc.domain[0]} y2={r.band === 'above' ? sc.domain[1] : r.y} fill={p.bad} fillOpacity={0.06} ifOverflow="hidden" />)}
        {refs.map((r, i) => <ReferenceLine key={i} y={r.y} stroke={r.color || p.bad} strokeDasharray={r.solid ? undefined : '4 3'} strokeWidth={1.5} label={{ value: r.label, position: r.pos || 'insideTopRight', fontSize: 10.5, fill: r.color || p.bad }} />)}
        {xRefs.map((r, i) => <ReferenceLine key={'x' + i} x={r.x} stroke={p.axis} strokeDasharray="2 3" label={{ value: r.label, position: 'insideTopLeft', fontSize: 10.5, fill: p.axis }} />)}
        {series.map(s => s.bar ? <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color || p.bar} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} /> : s.area
          ? <Area key={s.key} dataKey={s.key} name={s.name} stroke={s.color || p.c1} fill={s.color || p.c1} fillOpacity={0.08} strokeWidth={2} dot={false} isAnimationActive={false} />
          : <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color || p.c1} strokeWidth={s.width || 2} strokeDasharray={s.dash} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: p.bg }} isAnimationActive={false} />)}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ---------- KPI tile: value, target, gap, ₹ at stake, direction ---------- */
function KpiTile({ v, onClick }) {
  const p = usePalette();
  const TrendI = v.trend === 'flat' ? Minus : (v.better === 'up') === (v.trend === 'better') ? TrendingUp : TrendingDown;
  return (
    <button className="kpi" onClick={onClick} title={`${v.name}: ${v.status}. Owner: ${v.owner}`} style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="l"><span className="ellipsis">{v.name}</span></div>
      <div className="v">{fmtNum(v.value, v.dec)}<small>{v.unit}</small></div>
      <div className="f">
        {v.onTarget ? <span className="up-good"><CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> Target met</span>
          : <span className={v.status === 'At risk' ? 'up-bad' : ''} style={{ fontWeight: 600 }}>{gapText(v)} to target</span>}
        <span className="right muted">Target {fmtNum(v.target, v.dec)}</span>
      </div>
      <div className="f" style={{ marginTop: 4 }}>
        <Tag c={STATUS_CLS[v.status]}>{v.status}</Tag>
        <span className={v.trend === 'better' ? 'up-good' : v.trend === 'worse' ? 'up-bad' : 'muted'}><TrendI size={12} style={{ verticalAlign: -2 }} /> {v.trend === 'flat' ? 'flat' : v.trend === 'better' ? 'improving' : 'slipping'}</span>
      </div>
      <div className="f muted" style={{ minHeight: 17 }}>{v.atStake > 0.5 ? `${fmtINR(v.atStake)}/yr at stake` : ''}</div>
      <div style={{ marginTop: 'auto' }}><Spark data={v.points.map(x => ({ v: x.v }))} color={v.trend === 'worse' ? p.bad : undefined} /></div>
    </button>
  );
}

/* ---------- Pareto (ranked bars, cumulative share, ₹) ---------- */
function Pareto({ data, unit, inrNote, limit = 7 }) {
  const items = data.items.slice(0, limit);
  const mx = Math.max(...items.map(x => x.value), 1);
  const vital = items.findIndex(x => x.cum >= 80);
  const money = String(unit).startsWith('₹');
  return (
    <div>
      <div style={{ overflowX: 'auto' }}><table className="t">
        <thead><tr><th>Cause</th><th style={{ width: '38%', maxWidth: 260 }} />{!money && <th className="r">{unit === 'h' ? 'Hours' : unit || 'Count'}</th>}<th className="r">Cum.</th>{data.items.some(x => x.inr) && <th className="r">₹ value</th>}</tr></thead>
        <tbody>{items.map((x, i) => (
          <tr key={x.name}>
            <td><span className="ellipsis" style={{ display: 'block', maxWidth: 220 }} title={x.name}>{x.name}</span></td>
            <td><div style={{ height: 8, minWidth: 48, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${(x.value / mx) * 100}%`, height: '100%', borderRadius: 4, background: i <= vital ? 'var(--brand)' : 'var(--line-2)' }} /></div></td>
            {!money && <td className="r num" style={{ whiteSpace: 'nowrap' }}>{fmtNum(x.value, Number.isInteger(x.value) || x.value >= 10 ? 0 : 1)}</td>}
            <td className="r num muted" style={{ whiteSpace: 'nowrap' }}>{Math.round(x.cum)} %</td>
            {data.items.some(y => y.inr) && <td className="r num" style={{ whiteSpace: 'nowrap' }}>{x.inr != null ? fmtINR(x.inr) : '—'}</td>}
          </tr>))}</tbody>
      </table></div>
      {inrNote && <div className="muted" style={{ fontSize: 11.5, padding: '8px 14px' }}>{inrNote}</div>}
    </div>
  );
}

/* ---------- semicircle gauge with limit or target zones ---------- */
function Gauge({ value, min, max, zones = [], marks = [], unit, d = 1, state }) {
  const W = 220, R = 84, cx = W / 2, cy = 100;
  const ang = v => Math.PI * (1 - Math.max(0, Math.min(1, (v - min) / (max - min || 1))));
  const pt = (v, rr) => [cx + rr * Math.cos(ang(v)), cy - rr * Math.sin(ang(v))];
  const arc = (a, b) => { const [x1, y1] = pt(a, R), [x2, y2] = pt(b, R); return `M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2}`; };
  const col = { good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)' };
  return (
    <svg viewBox={`0 0 ${W} 128`} width="100%" style={{ maxWidth: 260, display: 'block', margin: '0 auto' }} role="img" aria-label={`${fmtNum(value, d)} ${unit}`}>
      <path d={arc(min, max)} stroke="var(--bg-3)" strokeWidth="14" fill="none" />
      {zones.map((z, i) => <path key={i} d={arc(Math.max(min, z[0]), Math.min(max, z[1]))} stroke={col[z[2]]} strokeOpacity={0.35} strokeWidth="14" fill="none" />)}
      <path d={arc(min, Math.max(min, Math.min(max, value)))} stroke={col[state] || 'var(--brand)'} strokeWidth="6" fill="none" strokeLinecap="round" />
      {marks.map((m, i) => { const [x1, y1] = pt(m.v, R - 11), [x2, y2] = pt(m.v, R + 11); const [tx, ty] = pt(m.v, R + 20); return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text)" strokeWidth="2" /><text x={tx} y={ty} fontSize="9.5" textAnchor="middle" fill="var(--muted)">{m.label}</text></g>; })}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" fontWeight="650" fill="var(--text)">{fmtNum(value, d)}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11" fill="var(--muted)">{unit}</text>
      <text x={cx - R} y={cy + 22} textAnchor="middle" fontSize="10" fill="var(--muted)">{fmtNum(min, d)}</text>
      <text x={cx + R} y={cy + 22} textAnchor="middle" fontSize="10" fill="var(--muted)">{fmtNum(max, d)}</text>
    </svg>
  );
}

/* ================= the board ================= */
export function CustomBoard({ c, widgets = [] }) {
  const app = useApp(); const narrow = useNarrow();
  const R = { ...app.rng, from: app.rng.from ?? c.db.anchor - app.rng.days * D, to: app.rng.to ?? c.db.anchor };
  const items = pack((widgets || []).filter(Boolean).map((w, i) => ({ w, i, span: spanOf(w) })));
  return (
    <div className="cb-grid" style={{ gridTemplateColumns: narrow ? 'minmax(0,1fr)' : 'repeat(12, minmax(0,1fr))' }}>
      {items.map(({ w, i, span }) => {
        return <div key={i} style={{ gridColumn: narrow ? 'auto' : `span ${span}`, minWidth: 0, display: 'flex', flexDirection: 'column' }} className="cb-cell"><Safe><Widget w={w} c={c} R={R} app={app} /></Safe></div>;
      })}
    </div>
  );
}

const fill = { flex: 1, margin: 0 };
/* one bad widget spec (from an agent or the Copilot) must not blank the whole board */
class Safe extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() { return this.state.err ? <Card style={fill} title="Widget could not be drawn"><Empty>Check the widget's asset, tag or KPI ids.</Empty></Card> : this.props.children; }
}

function Widget({ w, c, R, app }) {
  const { db, demo } = c; const p = usePalette();
  const kpiIds = ids => (ids || []).filter(id => demo.kpis.find(k => k.id === id));
  switch (w.type) {
    /* ---------- one-line insight ---------- */
    case 'headline': {
      const ids = kpiIds(w.ids).length ? kpiIds(w.ids) : demo.overview;
      const vs = ids.map(id => kpiView(db, id, R.from, R.to)).filter(Boolean);
      const worst = vs.filter(v => !v.onTarget).sort((a, b) => (b.atStake - a.atStake) || (a.progress - b.progress))[0];
      const met = vs.filter(v => v.onTarget).length;
      const L = lossItems(demo, R.days); const top = L.items[0];
      const al = app.messages.filter(m => m.type === 'alert');
      const crit = al.filter(m => m.sev === 'bad');
      const stake = vs.reduce((s, v) => s + v.atStake, 0);
      return (
        <Card style={fill}>
          <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <Sparkles size={18} style={{ color: 'var(--brand)', flex: 'none', marginTop: 2 }} />
            <div style={{ fontSize: 14.5, lineHeight: 1.55 }}>
              <b>{met} of {vs.length} KPIs on target</b> ({periodText(R)}).{' '}
              {worst && <>Biggest gap: <b>{worst.name} {fmtNum(worst.value, worst.dec)} {worst.unit}</b> vs target {fmtNum(worst.target, worst.dec)}{worst.atStake > 0.5 ? <> — <b>{fmtINR(worst.atStake)}/yr</b> at stake</> : ''}. </>}
              {top && <>Top loss: <b>{top.name}</b>, {fmtNum(top.value, top.value < 10 ? 1 : 0)} {L.unit}{L.perYear ? '' : ` (${periodText(R)})`}{top.inr ? <>, about <b>{fmtINR(top.inr)}</b>{L.perYear ? '/yr' : ''}</> : ''}. </>}
              {crit.length ? <><b style={{ color: 'var(--bad)' }}>{plural(crit.length, 'critical alert')}</b>: {crit[0].title}.</> : al.length ? <>{plural(al.length, 'open alert')}, none critical.</> : 'No open alerts.'}
              {stake > 0.5 && <span className="muted"> Total value still open on these KPIs: {fmtINR(stake)}/yr.</span>}
            </div>
          </div>
        </Card>
      );
    }
    /* ---------- KPI tiles ---------- */
    case 'kpis': {
      const ids = kpiIds(w.ids).slice(0, 6); if (!ids.length) return null;
      const vs = ids.map(id => kpiView(db, id, R.from, R.to));
      return (
        <div className="kpis" style={{ gridTemplateColumns: `repeat(${Math.min(6, Math.max(2, ids.length))}, minmax(0,1fr))`, margin: 0 }}>
          {vs.map(v => <KpiTile key={v.id} v={v} onClick={() => app.nav(`artefactory/${demo.id}-kpis/${v.id}`)} />)}
        </div>
      );
    }
    /* ---------- progress to target, all KPIs on one scale (baseline 0 % → target 100 %) ---------- */
    case 'kpi_compare': {
      const ids = kpiIds(w.ids).length ? kpiIds(w.ids) : demo.kpis.map(k => k.id);
      const vs = ids.map(id => kpiView(db, id, R.from, R.to)).map(v => ({ ...v, pct: Math.round(((v.better === 'up' ? v.value - v.base : v.base - v.value) / Math.abs(v.target - v.base || 1)) * 100) })).sort((a, b) => a.pct - b.pct);
      const met = vs.filter(v => v.onTarget).length;
      return (
        <Card style={fill} title={`${met} of ${vs.length} KPIs at target · furthest behind: ${vs[0].name} (${Math.max(0, vs[0].pct)} %)`} sub={`Progress from baseline (0 %) to target (100 %), ${periodText(R)}`} flush>
          <div style={{ overflowX: 'auto' }}><table className="t"><thead><tr><th>KPI</th><th style={{ width: '40%' }}>Progress to target</th><th className="r">Now</th><th className="r">Target</th></tr></thead>
            <tbody>{vs.map(v => (
              <tr key={v.id} className="click" onClick={() => app.nav(`artefactory/${demo.id}-kpis/${v.id}`)}>
                <td><span className="ellipsis" style={{ display: 'block', maxWidth: 190 }} title={v.name}>{v.name}</span></td>
                <td><div className="row" style={{ gap: 8 }}><div className="grow" style={{ position: 'relative', height: 8, background: 'var(--bg-3)', borderRadius: 4 }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, v.pct))}%`, height: '100%', borderRadius: 4, background: v.onTarget ? 'var(--good)' : v.status === 'At risk' ? 'var(--warn)' : 'var(--brand)' }} /></div>
                  <span className="num muted" style={{ width: 40, textAlign: 'right', fontSize: 11.5 }}>{Math.max(0, v.pct)} %</span></div></td>
                <td className="r num">{fmtNum(v.value, v.dec)} <span className="muted">{v.unit}</span></td>
                <td className="r num muted">{fmtNum(v.target, v.dec)}</td>
              </tr>))}</tbody></table></div>
        </Card>
      );
    }
    /* ---------- one KPI, daily, with baseline, target and go-live ---------- */
    case 'kpi_trend': {
      const k = demo.kpis.find(x => x.id === w.id) || demo.kpis.find(x => x.id === demo.overview[0]);
      const days = Math.max(14, R.days); const from = R.to - days * D;
      const v = kpiView(db, k.id, R.from, R.to);
      const data = db.kpiDaily(k.id).filter(p => p.t >= from && p.t <= R.to);
      const xRefs = db.goLive >= from ? [{ x: db.goLive, label: 'Go-live' }] : [];
      return (
        <Card style={fill} title={v.onTarget ? `${k.name} ${fmtNum(v.value, k.dec)} ${k.unit} · target met` : `${k.name} ${fmtNum(v.value, k.dec)} ${k.unit} · ${gapText(v)} short of target`}
          sub={`Daily, ${days > R.days ? `last ${days} days` : periodText(R)} · ${v.trend === 'better' ? 'improving' : v.trend === 'worse' ? 'slipping' : 'flat'}${v.atStake > 0.5 ? ` · ${fmtINR(v.atStake)}/yr at stake` : ''}`}>
          <TrendX data={data} series={[{ key: 'v', name: k.name }]} unit={k.unit} days={days}
            refs={[{ y: k.target, label: `Target ${fmtNum(k.target, k.dec)}`, color: p.good }, { y: k.base, label: `Baseline ${fmtNum(k.base, k.dec)}`, color: p.axis, pos: 'insideBottomRight' }]} xRefs={xRefs} />
        </Card>
      );
    }
    /* ---------- one tag, with limits and time outside them ---------- */
    case 'tag_trend': {
      const st = tagStats(db, w.asset, w.tag, R.from, R.to); if (!st) return null;
      const d = st.def; const h = db.history(w.asset, w.tag, R.from, R.to);
      const refs = [];
      if (st.hi != null) refs.push({ y: st.hi, label: `High limit ${fv(st.hi)}`, band: 'above' });
      if (st.lo != null) refs.push({ y: st.lo, label: `Low limit ${fv(st.lo)}`, band: 'below', pos: 'insideBottomRight' });
      const now = stateOfValue(d, st.latest);
      const name = `${w.asset} · ${d.name}`;
      const title = st.hoursOut ? `${name} ${fv(st.latest)} ${d.unit} · ${st.hoursOut} h outside limits`
        : refs.length ? `${name} ${fv(st.latest)} ${d.unit} · inside limits` : `${name} ${fv(st.latest)} ${d.unit}`;
      return (
        <Card style={fill} title={title} actions={<Tag c={now}>{STATE[now]}</Tag>}
          sub={`${periodText(R)} · avg ${fv(st.avg)} · min ${fv(st.min)} · max ${fv(st.max)} ${d.unit}${!refs.length ? ' · no alarm limit set' : ''}`}>
          <TrendX data={h.points} series={[{ key: 'v', name: d.name }]} unit={d.unit} days={R.days} refs={refs} />
        </Card>
      );
    }
    /* ---------- gauge for a KPI ({id}) or a tag ({asset, tag}) ---------- */
    case 'gauge': {
      if (w.id) {
        const v = kpiView(db, w.id, R.from, R.to); if (!v) return null;
        const lo = Math.min(v.base, v.target, v.value), hi = Math.max(v.base, v.target, v.value); const pad = (hi - lo) * 0.25 || 1;
        const sc = niceScale(lo - pad, hi + pad, 4); const [mn, mx] = sc.domain;
        const zones = v.better === 'up' ? [[mn, v.base, 'bad'], [v.base, v.target, 'warn'], [v.target, mx, 'good']] : [[mn, v.target, 'good'], [v.target, v.base, 'warn'], [v.base, mx, 'bad']];
        return <Card style={fill} title={v.name} sub={v.onTarget ? 'Target met' : `${gapText(v)} to target · ${periodText(R)}`} actions={<Tag c={STATUS_CLS[v.status]}>{v.status}</Tag>}>
          <Gauge value={v.value} min={mn} max={mx} zones={zones} marks={[{ v: v.target, label: 'Target' }]} unit={v.unit} d={v.dec} state={v.onTarget ? 'good' : v.status === 'At risk' ? 'bad' : 'warn'} /></Card>;
      }
      const def = db.tagDef(w.asset, w.tag); if (!def) return null;
      const val = db.live(w.asset, w.tag, app.tick); const st = stateOfValue(def, val);
      const hi = def.hi != null ? def.hi : def.base * 1.5, lo = def.lo != null ? def.lo : 0;
      const span = hi - lo || Math.abs(def.base) || 1;
      const mn = def.lo != null && def.lo !== 0 ? lo - span * 0.15 : Math.min(lo, val), mx = Math.max(hi + span * 0.15, val);
      const zones = []; if (def.lo != null && def.lo !== 0) zones.push([mn, def.lo, 'bad']); if (def.hi != null) { zones.push([def.hi * 0.92, def.hi, 'warn']); zones.push([def.hi, mx, 'bad']); }
      return <Card style={fill} title={`${w.asset} · ${def.name}`} sub={limText(def)} actions={<Tag c={st}>{STATE[st]}</Tag>}>
        <Gauge value={val} min={mn} max={mx} zones={zones} marks={def.hi != null ? [{ v: def.hi, label: 'Limit' }] : []} unit={def.unit} d={dec('', val)} state={st} /></Card>;
    }
    /* ---------- assets, worst first, with next action ---------- */
    case 'asset_health': {
      let rows = db.healthAll();
      if (Array.isArray(w.assets) && w.assets.length) { const set = new Set(w.assets); rows = rows.filter(x => set.has(x.id)); }
      rows = rows.slice(0, w.limit || 6);
      if (!rows.length) return <Card style={fill} title="Asset health"><Empty>No matching assets in this plant.</Empty></Card>;
      const bad = rows.filter(x => x.state !== 'Normal');
      return (
        <Card style={fill} flush title={bad.length ? `${plural(bad.length, 'asset')} ${bad.length === 1 ? 'needs' : 'need'} action · lowest ${rows[0].id} at ${rows[0].health}` : `All ${rows.length} assets healthy`} sub="Lowest health first · remaining useful life · next action from the diagnosis">
          <div style={{ overflowX: 'auto' }}><table className="t"><thead><tr><th>Asset</th><th>Health</th><th className="r">Life left</th><th className="hide-sm">Next action</th></tr></thead>
            <tbody>{rows.map(x => { const act = nextAction(demo, x.id); return (
              <tr key={x.id} className="click" onClick={() => app.nav(`artefactory/${demo.id}-twin/${x.id}`)}>
                <td><b className="mono" style={{ fontSize: 12 }}>{x.id}</b> <span className="muted">{x.crit}</span><div className="muted ellipsis" style={{ fontSize: 11.5, maxWidth: 170 }}>{x.name}</div></td>
                <td><HealthBar v={x.health} w={70} /></td>
                <td className="r num" style={{ color: x.rulDays < 30 ? 'var(--bad)' : undefined, fontWeight: x.rulDays < 30 ? 600 : 400 }}>{x.rulDays != null ? `${x.rulDays} d` : '—'}</td>
                <td className="hide-sm" style={{ fontSize: 12, maxWidth: 260 }}>{act ? <span title={act} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{act}</span> : <span className="muted">Routine PM</span>}</td>
              </tr>); })}</tbody></table></div>
        </Card>
      );
    }
    /* ---------- losses or defects as a Pareto ---------- */
    case 'losses':
    case 'pareto': {
      const src = w.type === 'losses' ? 'losses' : (w.source || 'losses');
      if (src === 'defects') {
        const P = defectItems(demo, R.days); if (!P.items.length) return null;
        const n80 = P.items.findIndex(x => x.cum >= 80) + 1;
        return <Card style={fill} flush title={`${plural(n80, 'cause')} make ${Math.round(P.items[n80 - 1].cum)} % of ${dashLabel(demo, 'defects')}`} sub={`${fmtNum(P.total)} in ${periodText(R)} · worst first`}><Pareto data={P} unit="Count" /></Card>;
      }
      const L = lossItems(demo, R.days); if (!L.items.length) return null;
      const top3 = L.items.slice(0, 3).reduce((s, x) => s + x.value, 0) / L.total * 100;
      return (
        <Card style={fill} flush title={`Top 3 losses are ${Math.round(top3)} % of ${L.label}${L.totalInr ? ` · ${fmtINR(L.totalInr)}${L.perYear ? '/yr' : ''} in total` : ''}`}
          sub={L.perYear ? `Net heat rate gap by cause, kcal/kWh · valued per year` : L.unit.startsWith('₹') ? `Avoidable cost in ${periodText(R)} · worst first` : `${fmtNum(L.total)} ${L.unit} in ${periodText(R)} · worst first`}>
          <Pareto data={L} unit={L.unit} inrNote={L.basis ? `₹ value at ${L.basis}.` : null} />
        </Card>
      );
    }
    /* ---------- plan vs actual ---------- */
    case 'production': {
      const days = Math.max(7, R.days); const from = R.to - days * D;
      const P = productionView(db, from, R.to); const u = demo.production.unit;
      const data = P.days.map(x => ({ t: x.t, actual: x.actual, plan: x.plan }));
      return (
        <Card style={fill} title={`${isGeneration(demo) ? 'Export' : 'Output'} ${fmtNum(P.att, 1)} % of plan · ${P.short > 0 ? `${fmtNum(P.short)} ${u} short` : `${fmtNum(-P.short)} ${u} ahead`}`}
          sub={<span>{days > R.days ? `Last ${days} days` : periodText(R)} · {P.below} days below 95 % of plan · <span className="dotc" style={{ background: p.bar, borderRadius: 2 }} /> actual <span style={{ display: 'inline-block', width: 14, borderTop: `2px dashed ${p.c2}`, verticalAlign: 3 }} /> plan</span>}>
          <TrendX data={data} series={[{ key: 'actual', name: 'Actual', bar: true }, { key: 'plan', name: 'Plan', dash: '5 4', color: p.c2, width: 1.5 }]} unit={u} days={days} zeroBase />
        </Card>
      );
    }
    /* ---------- demand vs contract (for generation plants: export vs plan) ---------- */
    case 'energy': {
      if (isGeneration(demo) && demo.id !== 'power') return <Widget w={{ type: 'production' }} c={c} R={R} app={app} />;
      const E = demandView(c.tools, demo, R.days);
      const isAux = demo.id === 'power';
      const u = isAux ? 'kW' : 'kVA';
      return (
        <Card style={fill} title={`${isAux ? 'Auxiliary load peak' : 'Peak hourly demand'} ${fmtNum(E.peak_kva)} ${u} · ${Math.round(E.util)} % of ${isAux ? 'UAT rating' : 'contract'}`}
          sub={`${periodText(R)} · ${E.load_profile_kind === 'hourly' ? `${E.near} h above 90 % of ${fmtNum(E.contract_kva)} ${isAux ? 'kVA rating' : 'kVA contract'}` : `${E.near} days peaked above 90 % of ${fmtNum(E.contract_kva)} kVA`} · ${fmtNum(Math.round(E.energy_kwh / 1000))} MWh`}>
          <TrendX data={E.pts} series={[{ key: 'v', name: E.load_profile_kind === 'hourly' ? 'Load' : 'Daily peak', area: true }]} unit={u} days={R.days} zeroBase
            refs={[{ y: E.contract_kva, label: `${isAux ? 'Rating' : 'Contract'} ${fmtNum(E.contract_kva)}`, band: 'above' }, { y: E.contract_kva * 0.9, label: '', color: p.warn }]} />
        </Card>
      );
    }
    /* ---------- alerts and approvals ---------- */
    case 'alerts': {
      let ms = app.messages.filter(m => m.type === 'alert' || m.type === 'approval');
      if (Array.isArray(w.assets) && w.assets.length) { const set = new Set(w.assets); ms = ms.filter(m => m.type === 'approval' || set.has(m.asset)); }
      const sevRank = m => (m.sev === 'bad' ? 0 : m.type === 'approval' ? 1 : m.sev === 'warn' ? 2 : 3);
      ms = ms.slice().sort((a, b) => sevRank(a) - sevRank(b) || b.time - a.time);
      const crit = ms.filter(m => m.sev === 'bad').length, appr = ms.filter(m => m.type === 'approval').length;
      return (
        <Card style={fill} flush title={ms.length ? `${plural(ms.length, 'item')} ${ms.length === 1 ? 'needs' : 'need'} attention · ${crit} critical, ${plural(appr, 'approval')}` : 'Nothing needs attention'} sub="Critical first, then approvals waiting for you">
          {ms.length ? ms.slice(0, w.limit || 5).map(m => (
            <button key={m.id} className="feed-i" onClick={() => app.nav('messages/' + m.id)}><span className={`rail ${m.type === 'approval' ? 'approval' : m.sev}`} />
              <span><div className="row" style={{ gap: 6 }}><Tag c={m.type === 'approval' ? 'brand' : m.sev}>{m.type === 'approval' ? 'Approve' : m.sev === 'bad' ? 'Critical' : 'Warning'}</Tag>{m.asset && <b className="mono" style={{ fontSize: 11.5 }}>{m.asset}</b>}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 3 }}>{m.title}</div><div className="muted" style={{ fontSize: 11.5 }}>{m.from} · {fmtRel(m.time)}</div></span></button>))
            : <Empty>No open alerts or approvals.</Empty>}
        </Card>
      );
    }
    /* ---------- setpoint recommendations, valued ---------- */
    case 'setpoints': {
      const sp = demo.setpoints || []; if (!sp.length) return <Card style={fill} title="Setpoint recommendations"><Empty>No recommendations for this plant yet.</Empty></Card>;
      const open = sp.filter(s => s.status !== 'applied');
      const val = open.reduce((s, x) => s + (gainLakh(demo, x.gain) || 0), 0);
      return (
        <Card style={fill} flush title={`${plural(open.length, 'setpoint change')} open${val ? ` · ${fmtINR(val)}/yr` : ''}`} sub="Current → recommended · value and confidence from the Process Agent">
          <div style={{ overflowX: 'auto' }}><table className="t"><thead><tr><th>Setpoint</th><th className="r">Change</th><th className="hide-sm">Gain</th><th className="r">Conf.</th></tr></thead>
            <tbody>{sp.map(s => (
              <tr key={s.asset + s.tag} className="click" onClick={() => app.nav(`artefactory/${demo.id}-setpoints`)}>
                <td><b className="mono" style={{ fontSize: 12 }}>{s.asset}</b> <span className="muted">{s.name}</span>{s.status !== 'proposed' && <> <Tag c={s.status === 'applied' ? 'good' : 'info'}>{s.status}</Tag></>}</td>
                <td className="r num" style={{ whiteSpace: 'nowrap' }}>{fv(s.current)} → <b style={{ color: 'var(--brand)' }}>{fv(s.recommended)}</b> <span className="muted">{s.unit}</span></td>
                <td className="hide-sm" style={{ fontSize: 12 }}>{s.gain}</td>
                <td className="r num muted">{Math.round((s.confidence || 0) * 100)} %</td>
              </tr>))}</tbody></table></div>
        </Card>
      );
    }
    /* ---------- live values with limits ---------- */
    case 'live': {
      const ids = (w.assets || []).filter(x => db.assetById[x]).slice(0, 8); if (!ids.length) return null;
      const rows = ids.flatMap(id => {
        const tags = demo.classes[db.assetById[id].cls].tags;
        const withLim = tags.filter(t => t[7] != null || (t[6] != null && t[6] !== 0));
        const pick = (withLim.length ? [...withLim, ...tags.filter(t => !withLim.includes(t))] : tags).slice(0, ids.length > 4 ? 2 : 3);
        return pick.map(t => { const def = db.tagDef(id, t[0]); const v = db.live(id, t[0], app.tick); const lim = def.hi != null || (def.lo != null && def.lo !== 0); return { id, def, v, st: lim ? stateOfValue(def, v) : 'none' }; });
      });
      const out = rows.filter(x => x.st === 'bad').length, near = rows.filter(x => x.st === 'warn').length;
      return (
        <Card style={fill} flush title={out ? `${out} of ${rows.length} live values outside limits` : near ? `${near} of ${rows.length} live values near a limit` : `All ${rows.filter(x => x.st !== 'none').length} limited values normal`} actions={<LiveBadge />}>
          <div style={{ overflowX: 'auto' }}><table className="t"><thead><tr><th>Asset · value</th><th className="r">Now</th><th className="r hide-sm">Limit</th><th className="r">State</th></tr></thead>
            <tbody>{rows.map(x => (
              <tr key={x.id + x.def.key}>
                <td><b className="mono" style={{ fontSize: 12 }}>{x.id}</b> <span className="muted">{x.def.name}</span></td>
                <td className="r num" style={{ fontWeight: 600, whiteSpace: 'nowrap', color: x.st === 'good' || x.st === 'none' ? undefined : `var(--${x.st})` }}>{fmtNum(x.v)} <small className="muted" style={{ fontWeight: 400 }}>{x.def.unit}</small></td>
                <td className="r num muted hide-sm" style={{ whiteSpace: 'nowrap' }}>{limShort(x.def)}</td>
                <td className="r">{x.st === 'none' ? <span className="muted" style={{ fontSize: 11.5 }}>no limit</span> : <Tag c={x.st}>{STATE[x.st]}</Tag>}</td>
              </tr>))}</tbody></table></div>
        </Card>
      );
    }
    /* ---------- tables: lines, a tag across assets, or a KPI scorecard ---------- */
    case 'table': {
      if (w.of === 'tags' && w.tag) {
        const assets = (Array.isArray(w.assets) && w.assets.length ? w.assets : db.assets.map(a => a.id)).filter(id => db.tagDef(id, w.tag));
        if (!assets.length) return null;
        const rows = assets.map(id => tagStats(db, id, w.tag, R.from, R.to)).map((s, i) => ({ id: assets[i], ...s, st: stateOfValue(s.def, s.latest) }));
        const hiBad = rows[0].def.hi != null || !(rows[0].def.lo != null && rows[0].def.lo !== 0);
        rows.sort((a, b) => (b.hoursOut - a.hoursOut) || (hiBad ? b.latest - a.latest : a.latest - b.latest));
        const d0 = rows[0].def; const outN = rows.filter(r => r.hoursOut > 0).length;
        if (!rows.some(x => x.hi != null || x.lo != null)) {
          /* no alarm limits (e.g. motor power): rank by consumption and show each share */
          rows.sort((a, b) => b.avg - a.avg);
          const tot = rows.reduce((t, x) => t + x.avg, 0) || 1; const shown = rows.slice(0, w.limit || 6);
          const top = shown.slice(0, 3).reduce((t, x) => t + x.avg, 0);
          return (
            <Card style={fill} flush title={`${d0.name}: top 3 take ${Math.round((top / tot) * 100)} % of ${fmtNum(tot)} ${d0.unit} across ${rows.length} assets`} sub={`${periodText(R)} · average, highest first · no alarm limit on this value`}>
              <div style={{ overflowX: 'auto' }}><table className="t"><thead><tr><th>Asset</th><th className="r">Now</th><th className="r">Avg</th><th className="r hide-sm">Max</th><th style={{ width: '24%' }} className="hide-sm">Share of total</th></tr></thead>
                <tbody>{shown.map(x => (
                  <tr key={x.id} className="click" onClick={() => app.nav(`artefactory/${demo.id}-twin/${x.id}`)}>
                    <td><b className="mono" style={{ fontSize: 12 }}>{x.id}</b> <span className="muted hide-sm">{db.assetById[x.id].name}</span></td>
                    <td className="r num" style={{ fontWeight: 600 }}>{fv(x.latest)}</td><td className="r num">{fv(x.avg)}</td><td className="r num hide-sm">{fv(x.max)}</td>
                    <td className="hide-sm"><div className="row" style={{ gap: 6 }}><div className="grow" style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4 }}><div style={{ width: `${(x.avg / shown[0].avg) * 100}%`, height: '100%', borderRadius: 4, background: 'var(--brand)' }} /></div><span className="num muted" style={{ fontSize: 11.5, width: 36, textAlign: 'right' }}>{Math.round((x.avg / tot) * 100)} %</span></div></td>
                  </tr>))}</tbody></table></div>
            </Card>
          );
        }
        return (
          <Card style={fill} flush title={`${d0.name}: ${outN ? `${plural(outN, 'asset')} went outside limits` : `all ${rows.length} assets inside limits`}`} sub={`${periodText(R)} · worst first · ${d0.unit}`}>
            <div style={{ overflowX: 'auto' }}><table className="t"><thead><tr><th>Asset</th><th className="r">Now</th><th className="r">Avg</th><th className="r hide-sm">Max</th><th className="r hide-sm">Limit</th><th className="r">Hours out</th></tr></thead>
              <tbody>{rows.slice(0, w.limit || 6).map(x => (
                <tr key={x.id} className="click" onClick={() => app.nav(`artefactory/${demo.id}-twin/${x.id}`)}>
                  <td><b className="mono" style={{ fontSize: 12 }}>{x.id}</b> <span className="muted hide-sm">{db.assetById[x.id].name}</span></td>
                  <td className="r num" style={{ fontWeight: 600, color: x.st === 'good' ? undefined : `var(--${x.st})` }}>{fv(x.latest)}</td>
                  <td className="r num">{fv(x.avg)}</td><td className="r num hide-sm">{fv(x.max)}</td>
                  <td className="r num muted hide-sm" style={{ whiteSpace: 'nowrap' }}>{limShort(x.def)}</td>
                  <td className="r num" style={{ color: x.hoursOut ? 'var(--bad)' : undefined }}>{x.hoursOut}</td>
                </tr>))}</tbody></table></div>
          </Card>
        );
      }
      if (w.of === 'kpis') {
        const ids = kpiIds(w.ids).length ? kpiIds(w.ids) : demo.kpis.map(k => k.id);
        const vs = ids.map(id => kpiView(db, id, R.from, R.to)).sort((a, b) => b.atStake - a.atStake || a.progress - b.progress);
        const stake = vs.reduce((s, v) => s + v.atStake, 0);
        return (
          <Card style={fill} flush title={`KPI scorecard · ${vs.filter(v => v.onTarget).length} of ${vs.length} on target${stake > 0.5 ? ` · ${fmtINR(stake)}/yr still open` : ''}`} sub={`${periodText(R)} · largest ₹ gap first`}>
            <div style={{ overflowX: 'auto' }}><table className="t"><thead><tr><th>KPI</th><th className="r">Now</th><th className="r">Target</th><th className="r">Gap</th><th className="r hide-sm">₹/yr at stake</th><th className="hide-sm">Owner</th><th className="r">Status</th></tr></thead>
              <tbody>{vs.map(v => (
                <tr key={v.id} className="click" onClick={() => app.nav(`artefactory/${demo.id}-kpis/${v.id}`)}>
                  <td>{v.name} <span className="muted">{v.unit}</span></td><td className="r num">{fmtNum(v.value, v.dec)}</td><td className="r num muted">{fmtNum(v.target, v.dec)}</td>
                  <td className="r num">{v.onTarget ? '—' : fmtNum(Math.abs(v.gap), v.dec)}</td><td className="r num hide-sm">{v.atStake > 0.5 ? fmtINR(v.atStake) : '—'}</td>
                  <td className="muted hide-sm">{v.owner}</td><td className="r"><Tag c={STATUS_CLS[v.status]}>{v.status}</Tag></td>
                </tr>))}</tbody></table></div>
          </Card>
        );
      }
      /* default: lines / blocks / feeders */
      const rows = lineRows(demo); if (!rows.length) return null;
      const gen = isGeneration(demo);
      const unitName = demo.id === 'solar' ? 'block' : demo.id === 'wind' ? 'feeder' : demo.id === 'power' ? 'section' : 'line';
      const hl = w.highlight ? String(w.highlight).toLowerCase() : null;
      return (
        <Card style={fill} flush title={`Worst ${unitName}: ${rows[0].name} at ${fmtNum(rows[0].oee, 1)} % · ${fmtNum(rows[0].gap, 1)} pts behind the best`} sub={`${gen ? 'Availability × performance × grid/quality factor' : 'Availability × performance × quality = OEE'} · worst first · top loss is the next action`}>
          <div style={{ overflowX: 'auto' }}><table className="t"><thead><tr><th>{unitName[0].toUpperCase() + unitName.slice(1)}</th><th className="r">Avail.</th><th className="r">Perf.</th><th className="r hide-sm">{gen ? 'Grid / Q' : 'Quality'}</th><th className="r">{gen ? 'Index' : 'OEE'}</th><th className="hide-sm">Top loss</th></tr></thead>
            <tbody>{rows.map(x => (
              <tr key={x.name} style={hl && x.name.toLowerCase().includes(hl) ? { background: 'var(--brand-soft)' } : undefined}>
                <td>{x.name}</td><td className="r num">{fmtNum(x.a, 1)}</td><td className="r num">{fmtNum(x.p, 1)}</td><td className="r num hide-sm">{fmtNum(x.q, 1)}</td>
                <td className="r num" style={{ fontWeight: 600 }}>{fmtNum(x.oee, 1)} %</td><td className="hide-sm" style={{ fontSize: 12 }}>{x.loss}</td>
              </tr>))}</tbody></table></div>
        </Card>
      );
    }
    /* ---------- sites side by side (portfolios); single-site plants fall back to lines ---------- */
    case 'site_compare': {
      const rows = siteRows(db, app.messages);
      if (!rows.length) return <Widget w={{ type: 'table', of: 'lines' }} c={c} R={R} app={app} />;
      const P = productionView(db, R.from, R.to); const u = demo.production.unit; const gen = isGeneration(demo);
      const worst = rows.slice().sort((a, b) => (a.avail * a.perf) - (b.avail * b.perf))[0];
      const mxShare = Math.max(...rows.map(r => r.share));
      return (
        <Card style={fill} flush title={`${rows.length} sites · weakest: ${worst.name} (availability ${fmtNum(worst.avail, 1)} %, performance ${fmtNum(worst.perf, 1)} %)`} sub={`${periodText(R)} · portfolio ${fmtNum(P.att, 1)} % of plan · availability and performance from block and feeder data · CUF on ${demo.id === 'solar' ? 'DC' : 'rated'} capacity`}>
          <div style={{ overflowX: 'auto' }}><table className="t"><thead><tr><th>Site</th><th className="r hide-sm">Capacity</th><th style={{ width: '18%' }} className="hide-sm">Share of energy</th><th className="r">{isGeneration(demo) ? `Energy, ${u}` : `Output, ${u}`}</th><th className="r">Avail.</th><th className="r">Perf.</th><th className="r hide-sm">{gen ? 'CUF' : 'Share'}</th><th className="r">Alerts</th><th className="hide-sm">Weakest unit</th></tr></thead>
            <tbody>{rows.map(s => (
              <tr key={s.slug}>
                <td><b>{s.name}</b><div className="muted" style={{ fontSize: 11.5 }}>{s.location.split(',').slice(-1)[0].trim()}</div></td>
                <td className="r num hide-sm">{s.capacity ? `${fmtNum(s.capacity)} ${s.capUnit}` : '—'}</td>
                <td className="hide-sm"><div className="row" style={{ gap: 6 }}><div className="grow" style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4 }}><div style={{ width: `${(s.share / mxShare) * 100}%`, height: '100%', borderRadius: 4, background: 'var(--brand)' }} /></div><span className="num muted" style={{ fontSize: 11.5 }}>{s.share} %</span></div></td>
                <td className="r num">{fmtNum(Math.round((P.actual * s.share) / 100))}</td>
                <td className="r num" style={{ color: s.avail != null && s.avail < 98 ? 'var(--warn)' : undefined }}>{s.avail != null ? fmtNum(s.avail, 1) : '—'}</td>
                <td className="r num">{s.perf != null ? fmtNum(s.perf, 1) : '—'}</td>
                <td className="r num hide-sm">{gen && s.capacity ? `${fmtNum((P.actual * s.share / 100) / (s.capacity * 24 * P.days.length) * 100, 1)} %` : `${s.share} %`}</td>
                <td className="r">{s.critical ? <Tag c="bad">{s.critical} critical</Tag> : s.alerts ? <Tag c="warn">{s.alerts}</Tag> : <Tag c="good">0</Tag>}</td>
                <td className="hide-sm" style={{ fontSize: 12 }}>{s.worst ? <><b className="mono">{s.worst.id}</b> <span className="muted">health {s.worst.health}</span></> : '—'}</td>
              </tr>))}</tbody></table></div>
        </Card>
      );
    }
    case 'text': return <Card style={fill}><div className="ans"><Markdown text={w.md || ''} /></div></Card>;
    default: return null;
  }
}

const dashLabel = (demo, what) => (what === 'defects' ? (isGeneration(demo) ? 'findings' : 'defects') : what);
