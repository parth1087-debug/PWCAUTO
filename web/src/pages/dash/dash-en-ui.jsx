/* UI helpers for the Energy, Real-time monitor and Setpoint advisor boards (dash-en).
   Colours come from CSS tokens (good / warn / bad / brand / muted), so light and dark themes both work. */
import React from 'react';
import { fmtNum } from '../../lib/data.js';

/** ₹ lakh → "₹12.4 L" or "₹3.2 Cr". */
export const inr = (lakh, d) => (lakh == null ? '—' : Math.abs(lakh) >= 100 ? `₹${fmtNum(lakh / 100, d ?? (Math.abs(lakh) >= 1000 ? 0 : 1))} Cr` : `₹${fmtNum(lakh, d ?? (Math.abs(lakh) >= 10 ? 0 : 1))} L`);
export const pct = (v, d = 0) => `${fmtNum(v * 100, d)} %`;
const TONE = { good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)', brand: 'var(--brand)', info: 'var(--info)' };

export const EN_CSS = `
.en-head { display: flex; gap: 10px; align-items: flex-start; padding: 12px 16px; border: 1px solid var(--line); border-left: 4px solid var(--brand); border-radius: var(--radius); background: var(--bg); margin-bottom: 16px; font-size: 14px; line-height: 1.5; }
.en-head b { font-weight: 650; }
.en-tiles { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.en-tiles.n4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.en-tile { border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 14px 10px; background: var(--bg); min-width: 0; box-shadow: var(--shadow-md); }
.en-tile .l { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.en-tile .v { font-family: var(--display); font-size: 24px; font-weight: 550; letter-spacing: -.4px; margin-top: 2px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.en-tile .v small { font-size: 12px; color: var(--muted); font-weight: 400; margin-left: 3px; letter-spacing: 0; font-family: var(--sans, inherit); }
.en-tile .f { font-size: 11.5px; color: var(--muted); margin-top: 2px; line-height: 1.45; }
.en-tile .g { font-weight: 600; }
.en-bar { height: 6px; border-radius: 3px; background: var(--bg-3); position: relative; margin-top: 8px; }
.en-bar > i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 3px; }
.en-bar > b { position: absolute; top: -3px; width: 2px; height: 12px; background: var(--text-2); }
.en-tbl { overflow-x: auto; }
.en-tbl table { min-width: 560px; }
.en-tbl.sm table { min-width: 0; }
.en-tbl td.r, .en-tbl td.num { white-space: nowrap; }
.en-tbl td.wrap { white-space: normal; min-width: 220px; }
.en-mini { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; font-size: 12.5px; align-items: center; }
.en-link { background: none; border: 0; padding: 0; cursor: pointer; font: inherit; text-decoration: underline; text-underline-offset: 2px; text-decoration-color: var(--line-2); }
.en-sec { margin: 18px 0 8px; display: flex; align-items: baseline; gap: 8px; font-size: 13px; }
.en-sec h4 { margin: 0; font-size: 13.5px; font-weight: 650; }
.rt2-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.rt2-row { display: grid; grid-template-columns: minmax(0, 1fr) auto 84px; gap: 8px; align-items: center; padding: 5px 0; border-top: 1px dashed var(--line); font-size: 12.5px; }
.rt2-lim { font-size: 10.5px; color: var(--muted); display: block; }
.sp2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 20px; }
.sp2-hist { list-style: none; margin: 0; padding: 0; font-size: 12.5px; }
.sp2-hist li { display: grid; grid-template-columns: 10px 1fr; gap: 10px; padding: 5px 0; }
.sp2-hist li i { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; }
@media (max-width: 1200px) { .en-tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 900px) { .en-tiles, .en-tiles.n4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .sp2 { grid-template-columns: 1fr; } .en-tile .v { font-size: 20px; } }
`;
export const EnStyle = () => <style>{EN_CSS}</style>;

export function Headline({ children }) {
  return <div className="en-head" role="status">{children}</div>;
}

/** KPI tile: value, unit, target, gap and trend direction coloured by tone. */
export function Tile({ label, value, unit, tone, gap, foot, bar, title, onClick }) {
  const T = onClick ? 'button' : 'div';
  return (
    <T className="en-tile" title={title} onClick={onClick} style={onClick ? { textAlign: 'left', cursor: 'pointer' } : undefined}>
      <div className="l">{tone && <span className="dotc" style={{ background: TONE[tone], marginRight: 6, display: 'inline-block' }} />}{label}</div>
      <div className="v">{value}{unit && <small>{unit}</small>}</div>
      {gap && <div className="f"><span className="g" style={{ color: TONE[gap.tone] || 'inherit' }}>{gap.text}</span>{gap.rest ? <> {gap.rest}</> : null}</div>}
      {foot && <div className="f">{foot}</div>}
      {bar && <Meter {...bar} />}
    </T>
  );
}

/** Horizontal meter from zero, with an optional marker (e.g. target or limit). */
export function Meter({ value, max, mark, tone = 'brand' }) {
  const w = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return <div className="en-bar" aria-hidden><i style={{ width: `${w}%`, background: TONE[tone] }} />{mark != null && <b style={{ left: `${Math.min(100, (mark / (max || 1)) * 100)}%` }} />}</div>;
}

/** Tone for a value vs target given which way is better. */
export function toneVs(v, target, better, warnBand = 0.03) {
  const gap = better === 'down' ? v - target : target - v;
  if (gap <= 0) return 'good';
  return gap / Math.abs(target || 1) <= warnBand ? 'warn' : 'bad';
}

/** Sparkline (SVG) with limit lines and a shaded normal band. points: [{v}] */
export function LimitSpark({ points, lo, hi, height = 26, width = 84, state = 'good', label }) {
  const vals = points.map(p => p.v).filter(v => v != null);
  if (!vals.length) return <svg width={width} height={height} />;
  const lim = [hi, lo].filter(x => x != null && x !== 0);
  let mn = Math.min(...vals), mx = Math.max(...vals);
  /* show a limit only when it is close to the data, so the trace keeps its resolution */
  const span0 = (mx - mn) || Math.abs(mx) * 0.05 || 1;
  const shown = lim.filter(l => l >= mn - span0 * 1.2 && l <= mx + span0 * 1.2);
  shown.forEach(l => { mn = Math.min(mn, l); mx = Math.max(mx, l); });
  const span = (mx - mn) || 1;
  const y = v => 2 + (height - 4) * (1 - (v - mn) / span);
  const x = i => (i / Math.max(1, vals.length - 1)) * (width - 2) + 1;
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const col = state === 'bad' ? 'var(--bad)' : state === 'warn' ? 'var(--warn)' : 'var(--muted)';
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label || 'trend'}>
      {shown.map((l, i) => <line key={i} x1="0" x2={width} y1={y(l)} y2={y(l)} stroke="var(--bad)" strokeWidth="1" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" opacity=".7" />)}
      <path d={d} fill="none" stroke={col} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <circle cx={x(vals.length - 1)} cy={y(vals[vals.length - 1])} r="2" fill={col} />
    </svg>
  );
}

/** Ranked bar rows with a value label (bars from zero). items: [{name, value, label, tone, sub}] */
export function RankBars({ items, max, unitFmt = v => fmtNum(v), nameWidth = 170 }) {
  const m = max || Math.max(...items.map(i => i.value)) || 1;
  return <div>{items.map(i => (
    <div key={i.name} className="row" style={{ padding: '5px 0', fontSize: 12.5, gap: 10 }}>
      <span className="ellipsis" style={{ width: nameWidth, flex: 'none' }} title={i.name}>{i.name}{i.sub && <span className="muted" style={{ display: 'block', fontSize: 11 }}>{i.sub}</span>}</span>
      <div className="grow" style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden', minWidth: 40 }}><div style={{ width: `${Math.max(0, (i.value / m) * 100)}%`, height: '100%', background: TONE[i.tone] || 'var(--brand)', borderRadius: 4 }} /></div>
      <span className="num" style={{ minWidth: 70, textAlign: 'right' }}>{i.label ?? unitFmt(i.value)}</span>
    </div>))}</div>;
}
