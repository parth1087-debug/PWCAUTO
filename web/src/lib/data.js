import { DEMOS, DEMO_LIST, createDB, createTools, messagesFor, logsFor, POLICIES, ENTERPRISE_CONNECTORS } from '../shared/index.js';
export { DEMOS, DEMO_LIST, POLICIES, ENTERPRISE_CONNECTORS };

const H = 36e5, D = 864e5;
const cache = new Map();
/** One database per demo. Live mode re-anchors every hour so the newest point is always the current hour. */
export function getDB(demoId, anchor) {
  const key = `${demoId}|${anchor || 'live:' + Math.floor(Date.now() / H)}`;
  if (!cache.has(key)) {
    const db = createDB(DEMOS[demoId], { anchor: anchor || null });
    cache.set(key, { db, tools: createTools(db), demo: DEMOS[demoId], messages: messagesFor(db), logs: logsFor(db) });
  }
  return cache.get(key);
}

export const RANGES = [
  { id: '24h', label: '24 h', days: 1 }, { id: '7d', label: '7 days', days: 7 }, { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 }, { id: '6m', label: '6 months', days: 182 },
];
export function resolveRange(range, db) {
  if (range.id === 'custom' && range.from && range.to) {
    const from = Math.max(db.tsDay(0), new Date(range.from).getTime()), to = Math.min(db.anchor, new Date(range.to).getTime() + D - H);
    return { from, to, days: Math.max(1, Math.round((to - from) / D)), label: `${fmtDate(from)} – ${fmtDate(to)}` };
  }
  const r = RANGES.find(x => x.id === range.id) || RANGES[2];
  return { from: db.anchor - r.days * D, to: db.anchor, days: r.days, label: r.label };
}

/* ---------- formatting (IST) ---------- */
const TZ = 'Asia/Kolkata';
export const fmtNum = (v, d) => (v == null || Number.isNaN(v) ? '—' : Math.abs(v) >= 1000 && d == null ? Math.round(v).toLocaleString('en-IN') : (+v).toLocaleString('en-IN', { maximumFractionDigits: d ?? 2, minimumFractionDigits: d ?? 0 }));
export const fmtTime = t => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
export const fmtDate = t => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: TZ });
export const fmtDateTime = t => `${fmtDate(t)}, ${fmtTime(t)}`;
export function fmtRel(t, now = Date.now()) {
  const m = Math.round((now - t) / 60e3);
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); return d === 1 ? 'yesterday' : `${d} days ago`;
}
export const axisTime = (t, days) => (days <= 2 ? fmtTime(t) : fmtDate(t));

/* ---------- CSV export ---------- */
export function downloadCSV(name, rows) {
  if (!rows || !rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv' }), `${name}.csv`);
}
export function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Merge relative-time seed data with what users did in this browser. */
export const healthCls = h => (h < 50 ? 'bad' : h < 75 ? 'warn' : '');
export const statusCls = s => ({ 'On target': 'good', 'On track': 'info', 'At risk': 'warn' }[s] || '');
