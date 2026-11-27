/* UI helpers for the EMS supply plan and trend explorer boards (ems-plan).
   Colours come from CSS tokens (good / warn / bad / brand / muted), so light and dark themes both work. */
import React from 'react';
import { fmtNum } from '../../../lib/data.js';

export const inr = v => (v == null ? '—' : Math.abs(v) >= 1e7 ? `₹${fmtNum(v / 1e7, 2)} Cr` : Math.abs(v) >= 1e5 ? `₹${fmtNum(v / 1e5, Math.abs(v) >= 1e6 ? 1 : 2)} L` : `₹${fmtNum(Math.round(v))}`);
export const hh = h => `${String(((h % 24) + 24) % 24).padStart(2, '0')}:00`;
const TONE = { good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)', brand: 'var(--brand)', info: 'var(--info)', muted: 'var(--muted)' };

export const PL_CSS = `
.pl-head { display: flex; gap: 10px; align-items: flex-start; padding: 12px 16px; border: 1px solid var(--line); border-left: 4px solid var(--brand); border-radius: var(--radius); background: var(--bg); margin-bottom: 16px; font-size: 14px; line-height: 1.55; }
.pl-head.warn { border-left-color: var(--warn); } .pl-head.bad { border-left-color: var(--bad); } .pl-head.good { border-left-color: var(--good); }
.pl-head b { font-weight: 650; }
.pl-tiles { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.pl-tile { border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 14px 10px; background: var(--bg); min-width: 0; box-shadow: var(--shadow-md); }
.pl-tile .l { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px; }
.pl-tile .v { font-family: var(--display); font-size: 24px; font-weight: 550; letter-spacing: -.4px; margin-top: 2px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pl-tile .v small { font-size: 12px; color: var(--muted); font-weight: 400; margin-left: 3px; letter-spacing: 0; }
.pl-tile .f { font-size: 11.5px; color: var(--muted); margin-top: 3px; line-height: 1.45; }
.pl-tile .g { font-weight: 600; }
.pl-bar { height: 6px; border-radius: 3px; background: var(--bg-3); position: relative; margin-top: 8px; }
.pl-bar > i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 3px; }
.pl-bar > b { position: absolute; top: -3px; width: 2px; height: 12px; background: var(--text-2); }
.pl-tbl { overflow-x: auto; }
.pl-tbl table { min-width: 620px; }
.pl-tbl td.r, .pl-tbl th.r { text-align: right; white-space: nowrap; }
.pl-tbl td.wrap { white-space: normal; min-width: 220px; }
.pl-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: var(--text-2); margin-top: 8px; }
.pl-legend span { display: inline-flex; align-items: center; gap: 6px; }
.pl-legend i { width: 14px; height: 3px; border-radius: 2px; display: inline-block; }
.pl-legend i.sw { height: 10px; width: 12px; border-radius: 2px; }
.pl-legend i.dash { background: none !important; border-top: 2px dashed; height: 0; }
.pl-strip { overflow-x: auto; }
.pl-strip .gr { display: grid; grid-template-columns: 140px repeat(24, minmax(26px, 1fr)); gap: 2px; min-width: 820px; font-size: 11px; }
.pl-strip .rl { font-size: 12px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; align-self: center; padding-right: 6px; }
.pl-strip .c { height: 22px; border-radius: 3px; display: grid; place-items: center; font-variant-numeric: tabular-nums; color: var(--text-2); background: var(--bg-3); }
.pl-strip .c.on { background: var(--brand-soft); color: var(--brand); font-weight: 600; }
.pl-strip .c.lag { background: var(--warn-soft); color: var(--warn); font-weight: 600; }
.pl-strip .c.off { background: transparent; border: 1px dashed var(--line); color: var(--muted); }
.pl-strip .hd { text-align: center; color: var(--muted); font-size: 10.5px; }
.pl-strip .slot-A { background: color-mix(in srgb, var(--info) 14%, transparent); color: var(--info); }
.pl-strip .slot-B { background: var(--bg-3); color: var(--muted); }
.pl-strip .slot-C { background: color-mix(in srgb, var(--warn) 16%, transparent); color: var(--warn); }
.pl-strip .slot-D { background: color-mix(in srgb, var(--bad) 14%, transparent); color: var(--bad); }
.pl-kv { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; font-size: 12.5px; align-items: baseline; }
.pl-kv .num { text-align: right; }
.pl-verdict { padding: 10px 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; margin-top: 12px; }
.pl-verdict.good { background: var(--good-soft); } .pl-verdict.warn { background: var(--warn-soft); } .pl-verdict.bad { background: var(--bad-soft); }
.pl-sec { margin: 22px 0 10px; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.pl-sec h4 { margin: 0; font-size: 14px; font-weight: 650; }
.pl-sec span { font-size: 12.5px; color: var(--muted); }
.pl-act { display: inline-flex; gap: 4px; }
.pl-act button { height: 26px; padding: 0 9px; border-radius: 7px; border: 1px solid var(--line-2); background: var(--bg); font-size: 12px; font-weight: 550; cursor: pointer; white-space: nowrap; }
.pl-act button.ok.on { background: var(--good-soft); color: var(--good); border-color: var(--good); }
.pl-act button.no.on { background: var(--bad-soft); color: var(--bad); border-color: var(--bad); }
/* trend explorer */
.tx { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
.tx-pick { max-height: 640px; overflow-y: auto; margin: 8px -4px 0; padding: 0 4px; }
.tx-area { margin-top: 10px; }
.tx-area > .an { font-size: 11px; font-weight: 650; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); padding: 4px 0; }
.tx-asset { border-top: 1px solid var(--line); }
.tx-asset > button { width: 100%; display: flex; align-items: center; gap: 6px; padding: 6px 2px; background: none; border: 0; cursor: pointer; font-size: 12.5px; text-align: left; color: var(--text); }
.tx-asset > button .n { flex: none; min-width: 20px; height: 18px; border-radius: 9px; font-size: 11px; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand); font-weight: 600; padding: 0 5px; }
.tx-tag { display: flex; align-items: center; gap: 8px; padding: 4px 2px 4px 18px; font-size: 12.5px; cursor: pointer; }
.tx-tag input { accent-color: var(--brand); }
.tx-tag .u { color: var(--muted); margin-left: auto; font-size: 11.5px; white-space: nowrap; }
.tx-tag.dis { opacity: .45; cursor: not-allowed; }
.tx-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.tx-chip { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 4px 0 9px; border-radius: 13px; border: 1px solid var(--line-2); font-size: 12px; background: var(--bg); }
.tx-chip i { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.tx-chip button { border: 0; background: none; cursor: pointer; color: var(--muted); font-size: 14px; line-height: 1; padding: 0 4px; }
.tx-multi { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.tx-mini { border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px 6px; min-width: 0; }
.tx-mini .h { display: flex; gap: 6px; align-items: baseline; font-size: 12.5px; }
.tx-mini .h b { font-weight: 600; }
.tx-mini .h .lv { margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }
.tx-pre { display: flex; flex-wrap: wrap; gap: 6px; }
@media (max-width: 1200px) { .pl-tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 1000px) { .tx { grid-template-columns: 1fr; } .tx-pick { max-height: 320px; } }
@media (max-width: 900px) { .pl-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } .pl-tile .v { font-size: 20px; } .tx-multi { grid-template-columns: 1fr; } }
`;
export const PlStyle = () => <style>{PL_CSS}</style>;

export const Headline = ({ tone = '', children }) => <div className={`pl-head ${tone}`} role="status">{children}</div>;

export function Tile({ label, value, unit, tone, gap, foot, bar }) {
  return (
    <div className="pl-tile">
      <div className="l">{tone && <span className="dotc" style={{ background: TONE[tone] }} />}<span className="ellipsis">{label}</span></div>
      <div className="v">{value}{unit && <small>{unit}</small>}</div>
      {gap && <div className="f"><span className="g" style={{ color: TONE[gap.tone] || 'inherit' }}>{gap.text}</span>{gap.rest ? <> {gap.rest}</> : null}</div>}
      {foot && <div className="f">{foot}</div>}
      {bar && <Meter {...bar} />}
    </div>
  );
}
export function Meter({ value, max, mark, tone = 'brand' }) {
  const w = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return <div className="pl-bar" aria-hidden><i style={{ width: `${w}%`, background: TONE[tone] }} />{mark != null && <b style={{ left: `${Math.min(100, (mark / (max || 1)) * 100)}%` }} />}</div>;
}
export const Sec = ({ title, sub }) => <div className="pl-sec"><h4>{title}</h4>{sub && <span>{sub}</span>}</div>;

export function Legend({ items }) {
  return <div className="pl-legend">{items.map(it => <span key={it.label}><i className={it.kind || ''} style={it.kind === 'dash' ? { borderColor: it.color } : { background: it.color, opacity: it.opacity }} />{it.label}</span>)}</div>;
}

/** Approve / reject toggle (local state only). */
export function Decide({ value, onChange }) {
  return (
    <span className="pl-act">
      <button className={`ok ${value === 'ok' ? 'on' : ''}`} aria-pressed={value === 'ok'} onClick={() => onChange(value === 'ok' ? null : 'ok')}>Approve</button>
      <button className={`no ${value === 'no' ? 'on' : ''}`} aria-pressed={value === 'no'} onClick={() => onChange(value === 'no' ? null : 'no')}>Reject</button>
    </span>
  );
}
