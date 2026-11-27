/* Shared live helpers for boards: state from limits, live badge, live value, health ring. */
import React, { useEffect, useState } from 'react';
import { useApp } from '../../App.jsx';
import { fmtNum } from '../../lib/data.js';

export const D = 864e5;
export const stateOf = (def, v) => (def.hi != null && v > def.hi) || (def.lo != null && def.lo !== 0 && v < def.lo) ? 'bad' : (def.hi != null && v > def.hi * 0.92) || (def.lo != null && def.lo !== 0 && v < def.lo * 1.04) ? 'warn' : 'good';

/* ---------- live helpers ---------- */
function useTickAge() {
  const { tickAt } = useApp(); const [, f] = useState(0);
  useEffect(() => { const i = setInterval(() => f(x => x + 1), 1000); return () => clearInterval(i); }, []);
  return Math.max(0, Math.round((Date.now() - tickAt) / 1000));
}
export function LiveBadge() {
  const age = useTickAge();
  return <span className="live-badge"><span className="live" />Live · updated {age}s ago · refresh 10 s</span>;
}
export function LiveValue({ c, asset, tag }) {
  const { tick } = useApp();
  const def = c.db.tagDef(asset, tag); const v = c.db.live(asset, tag, tick);
  const st = stateOf(def, v);
  return <span className={`lv-v ${st}`} key={tick}>{fmtNum(v)}<small> {def.unit}</small></span>;
}

/* ---------- health ring ---------- */
export function Ring({ v, size = 92 }) {
  const r = size / 2 - 7, C = 2 * Math.PI * r; const col = v < 50 ? 'var(--bad)' : v < 75 ? 'var(--warn)' : 'var(--good)';
  return <svg width={size} height={size} role="img" aria-label={`Health ${v}`}><circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-3)" strokeWidth="8" fill="none" />
    <circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${(C * v) / 100} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    <text x="50%" y="48%" textAnchor="middle" fontSize="22" fontWeight="650" fill="var(--text)">{v}</text><text x="50%" y="66%" textAnchor="middle" fontSize="10" fill="var(--muted)">health</text></svg>;
}
