/* Faclon Labs page kit for the Energy & utilities HTML reports: CSS tokens, header/footer, SectionRail,
   MetricCard, ValueUnlock, InfoPanel, status pills and small inline-SVG charts. No scripts (the page runs in a sandboxed iframe). */
import { fmtIN, hourIST } from '../../shared/analytics/ems-rep.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const n = fmtIN;
/** ₹ in lakh or crore with Indian grouping */
export const inr = (v, d) => { const a = Math.abs(v); return a >= 1e7 ? `₹${fmtIN(v / 1e7, d ?? 2)} cr` : a >= 1e5 ? `₹${fmtIN(v / 1e5, d ?? 1)} lakh` : `₹${fmtIN(v, 0)}`; };
export const pct = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : 0);

const CSS = `
:root{--faclon-blue:#2F55D4;--faclon-blue-600:#3E56F1;--faclon-blue-400:#6F90FF;--faclon-blue-200:#D0D6E7;--faclon-blue-100:#E6EBFA;
--ink:#192839;--ink-muted:#40566D;--ink-soft:#5F5F5F;--surface:#FFFFFF;--surface-muted:#F1F5FA;--border:#CBD5E2;--divider:#ADBDCC;
--slate-700:#40566D;--slate-500:#9AA1B6;--slate-300:#D3DADE;--green-600:#008542;--green-fill:#F3FBF4;--teal-600:#008DD2;--coral-600:#B66363;
--bad:#C5221F;--bad-fill:#FDF5F4;--warn:#8A6A00;--warn-line:#D6A614;--warn-fill:#FFF8E6;
--font-display:"Outfit","Inter",system-ui,sans-serif;--font-ui:"Inter","Outfit",system-ui,sans-serif}
*{box-sizing:border-box}
html,body{margin:0;background:#fff}
body{font-family:var(--font-display);color:var(--ink);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
.wrap{max-width:980px;margin:0 auto;padding:28px 24px 20px}
header.top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px 24px;flex-wrap:wrap;padding-bottom:14px;border-bottom:2px solid var(--faclon-blue)}
.lock{font-family:var(--font-display);font-weight:800;letter-spacing:.06em;font-size:18px;color:var(--ink)}.lock i{font-style:normal;font-weight:300;color:var(--faclon-blue);letter-spacing:.24em;margin-left:5px}
.meta{font-family:var(--font-ui);font-size:12px;color:var(--ink-muted);text-align:right}.meta b{color:var(--ink);font-weight:600}
.eyebrow{font-family:var(--font-ui);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--faclon-blue)}
h1{font-size:28px;line-height:1.25;font-weight:700;letter-spacing:-.01em;margin:16px 0 6px}
.lede{font-size:15px;color:var(--ink-muted);margin:0 0 18px;max-width:860px}
h2{font-size:22px;font-weight:700;color:var(--faclon-blue);margin:0 0 4px}
h3{font-size:16px;font-weight:700;margin:0 0 6px}
.sub{font-size:13px;color:var(--ink-muted);margin:0 0 12px}
.rail{background:var(--slate-700);color:#fff;border-radius:4px;text-align:center;font-weight:700;font-size:14px;padding:7px 12px;margin:26px 0 12px;letter-spacing:.01em}
.rail.blue{background:var(--faclon-blue)}
.rail.grad{background:linear-gradient(90deg,#24A673,#2F55D4)}
.grid{display:grid;gap:12px}.g2{grid-template-columns:repeat(2,minmax(0,1fr))}.g3{grid-template-columns:repeat(3,minmax(0,1fr))}.g4{grid-template-columns:repeat(4,minmax(0,1fr))}
.g21{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr)}
.card{border:1px solid var(--border);border-radius:8px;background:#fff;padding:14px 16px}
.card.muted{background:var(--surface-muted)}.card.hi{border:2px solid var(--faclon-blue)}
.mc .lbl{font-family:var(--font-ui);font-size:12px;color:var(--ink-muted);font-weight:500}
.mc .val{font-weight:700;font-size:32px;line-height:1.1;letter-spacing:-.02em;margin:6px 0 4px;white-space:nowrap}
.mc .val small{font-size:14px;font-weight:500;color:var(--ink-muted);margin-left:3px;letter-spacing:0}
.mc .d{font-family:var(--font-ui);font-size:12px;color:var(--ink-muted);line-height:1.45}
.good{color:var(--green-600);font-weight:600}.bad{color:var(--bad);font-weight:600}.flat{color:var(--ink-muted);font-weight:600}
.track{height:6px;border-radius:3px;background:var(--surface-muted);margin-top:8px;position:relative;overflow:hidden}.track i{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:var(--faclon-blue)}
.value{border:1px solid var(--green-600);background:var(--green-fill);border-radius:4px;padding:14px 16px;color:#14361F}
.value b.t{display:block;color:var(--green-600);font-size:15px;margin-bottom:4px}
.value ul{margin:6px 0 0;padding-left:18px}.value li{margin:2px 0}
.info{background:var(--surface-muted);border:1px solid var(--border);border-radius:4px;padding:12px 14px;font-size:13px;color:var(--ink-muted)}
.info b{color:var(--ink)}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch}table.wide{min-width:680px}table.wide td:first-child{min-width:170px}table.mid{min-width:520px}
table{width:100%;border-collapse:collapse;font-family:var(--font-ui);font-size:13px}
th{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-muted);text-align:left;padding:8px;border-bottom:1px solid var(--divider);white-space:nowrap;background:var(--faclon-blue-100)}
td{padding:8px;border-bottom:1px solid #E4E8EF;vertical-align:top}
td.r,th.r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
td .s{display:block;color:var(--ink-muted);font-size:12px}
tr.tot td{font-weight:700;border-top:1px solid var(--divider)}
.pill{display:inline-block;font-family:var(--font-ui);font-size:11px;font-weight:600;border-radius:100px;padding:1px 9px;white-space:nowrap;border:1px solid}
.p-alarm{color:var(--bad);background:var(--bad-fill);border-color:#F1B9B6}.p-watch{color:var(--warn);background:var(--warn-fill);border-color:var(--warn-line)}
.p-ok{color:var(--green-600);background:var(--green-fill);border-color:#9ED3B2}.p-info{color:var(--faclon-blue);background:var(--faclon-blue-100);border-color:var(--faclon-blue-200)}
.p-slate{color:var(--ink-muted);background:var(--surface-muted);border-color:var(--border)}
.dec{display:grid;grid-template-columns:40px minmax(0,1fr) 190px;gap:4px 14px;align-items:start}
.dec .num{font-weight:900;font-size:30px;line-height:1;color:var(--faclon-blue)}
.dec .imp{text-align:right}.dec .imp b{display:block;font-size:18px;line-height:1.2}
.kv{font-family:var(--font-ui);font-size:12px;color:var(--ink-muted);margin-top:6px}.kv b{color:var(--ink);font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chip{border:1px solid var(--border);border-radius:4px;padding:6px 10px;font-family:var(--font-ui);font-size:12px;background:#fff}.chip b{color:var(--green-600)}
.legend{display:flex;flex-wrap:wrap;gap:4px 14px;font-family:var(--font-ui);font-size:11px;color:var(--ink-muted);margin-top:6px}
.legend span{display:inline-flex;align-items:center;gap:6px}.legend i{display:inline-block;width:14px;height:3px;border-radius:2px}
.legend i.sq{height:10px;width:10px}
svg{display:block;width:100%;height:auto;font-family:Inter,system-ui,sans-serif}
.cap{font-family:var(--font-ui);font-size:11px;color:var(--ink-muted);margin-top:6px}
.ol{margin:0;padding-left:20px}.ol li{margin:0 0 6px}
footer.ft{display:flex;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;border-top:1px solid #E4E8EF;margin-top:28px;padding-top:10px;font-family:var(--font-ui);font-size:11px;color:var(--ink-muted)}
footer.ft .brand{color:var(--faclon-blue);font-weight:600}
@media(max-width:760px){.g3,.g4{grid-template-columns:repeat(2,minmax(0,1fr))}.g21,.g2{grid-template-columns:minmax(0,1fr)}.dec{grid-template-columns:32px minmax(0,1fr)}.dec .imp{grid-column:2;text-align:left}.dec .imp b{display:inline;margin-right:8px}}
@media(max-width:480px){.wrap{padding:18px 16px}h1{font-size:22px}.lede{font-size:14px}h2{font-size:19px}.mc .val{font-size:24px}.card{padding:12px}.meta{text-align:left}.rail{font-size:13px}.hide-s{display:none}}
.only-n,.only-ni{display:none}
@media(max-width:560px){.only-w{display:none}.only-n{display:block}.only-ni{display:inline}
table.st thead{display:none}table.st tr{display:block;border-bottom:1px solid #E4E8EF;padding:8px 2px}table.st td{display:block;border:0;padding:2px 0;text-align:left;white-space:normal}
table.st td.only-w{display:none}table.st td[data-l]::before{content:attr(data-l) "  ";font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-muted);font-weight:700}
table.st td .s{display:inline}table.st td .s::before{content:" · "}}
@media print{.rail{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

export function page({ title, desc, body }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>${desc ? `<meta name="description" content="${esc(desc)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300..900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body><div class="wrap">${body}
<footer class="ft"><span>Demo data from the Meridian plant model. All terms are indicative and subject to mutual agreement.</span><span class="brand">www.faclon.com | Faclon Labs Pvt Ltd</span></footer>
</div></body></html>`;
}

export const header = (metaHtml) => `<header class="top"><div class="lock">FACLON<i>LABS</i></div><div class="meta">${metaHtml}</div></header>`;
export const rail = (text, tone = '') => `<div class="rail ${tone}">${esc(text)}</div>`;
export const pill = (text) => { const t = String(text); const cls = /alarm|open|overdue/i.test(t) ? 'p-alarm' : /watch|awaiting|risk/i.test(t) ? 'p-watch' : /normal|done|closed|on target/i.test(t) ? 'p-ok' : /progress|on track|planned/i.test(t) ? 'p-info' : 'p-slate'; return `<span class="pill ${cls}">${esc(t)}</span>`; };

/** change text with ↑/↓ and good/bad colour. better: 'up'|'down' */
export function delta(cur, ref, better, { unit = '', dec = 1, asPct = true, label = '' } = {}) {
  const diff = cur - ref; const rel = pct(cur, ref);
  const shown = asPct ? `${n(Math.abs(rel), dec)} %` : `${n(Math.abs(diff), dec)}${unit ? ' ' + unit : ''}`;
  if (Math.abs(asPct ? rel : diff) < (asPct ? 0.05 : Math.pow(10, -dec) / 2)) return `<span class="flat">→ flat</span>${label ? ' ' + esc(label) : ''}`;
  const good = better === 'up' ? diff > 0 : diff < 0;
  return `<span class="${good ? 'good' : 'bad'}">${diff > 0 ? '↑' : '↓'} ${esc(shown)}</span>${label ? ' ' + esc(label) : ''}`;
}

/** MetricCard: label, big value + unit, then lines of HTML, optional progress 0..1 */
export const metric = ({ label, value, unit = '', lines = [], prog = null, hi = false }) => `<div class="card mc${hi ? ' hi' : ''}"><div class="lbl">${esc(label)}</div>
<div class="val">${esc(value)}${unit ? `<small>${esc(unit)}</small>` : ''}</div>${lines.map(l => `<div class="d">${l}</div>`).join('')}${prog != null ? `<div class="track" title="progress from baseline to target"><i style="width:${Math.round(Math.max(0.03, Math.min(1, prog)) * 100)}%"></i></div>` : ''}</div>`;

/* ---------- charts (inline SVG, viewBox-scaled) ---------- */
const AX = '#ADBDCC', TXT = '#40566D';

/** hourly load profile: bars from zero, ToD peak windows shaded, contract and target lines */
export function loadProfile(o) { return `<div class="only-w">${loadProfile1({ ...o, W: 900, Hh: 250 })}</div><div class="only-n">${loadProfile1({ ...o, W: 360, Hh: 230, narrow: true })}</div>`; }
function loadProfile1({ points, contract, target, tod = [], W, Hh, narrow }) {
  const L = narrow ? 34 : 46, R = narrow ? 16 : 112, T = 16, B = 26, iw = W - L - R, ih = Hh - T - B;
  const lx = narrow ? L + 4 : L + iw + 6, lanchor = 'start', ldy = narrow ? -4 : 4;
  const max = Math.ceil(Math.max(contract * 1.05, ...points.map(p => p.kva)) / 1000) * 1000;
  const y = v => T + ih - (v / max) * ih, bw = iw / points.length;
  const istH = t => +hourIST(t).slice(0, 2);
  const peak = points.reduce((m, p) => (p.kva > m.kva ? p : m), points[0]);
  let s = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Hourly load yesterday against contract demand">`;
  points.forEach((p, i) => { const h = istH(p.t); if (tod.some(([a, b]) => h >= a && h < b)) s += `<rect x="${L + i * bw}" y="${T}" width="${bw}" height="${ih}" fill="#F1F5FA"/>`; });
  const lastTod = {}; points.forEach((p, i) => { const h = istH(p.t); tod.forEach(([a, b], j) => { if (h >= a && h < b) { lastTod[j] = lastTod[j] || i; } }); });
  if (!narrow) Object.values(lastTod).forEach(i => { s += `<text x="${L + i * bw + 3}" y="${T + 10}" font-size="10" fill="${TXT}">ToD peak</text>`; });
  for (let v = 0; v <= max; v += 2000) s += `<line x1="${L}" x2="${L + iw}" y1="${y(v)}" y2="${y(v)}" stroke="#E4E8EF"/><text x="${L - 6}" y="${y(v) + 4}" font-size="10" fill="${TXT}" text-anchor="end">${n(v)}</text>`;
  points.forEach((p, i) => { s += `<rect x="${L + i * bw + 1.5}" y="${y(p.kva)}" width="${bw - 3}" height="${T + ih - y(p.kva)}" rx="1.5" fill="${p === peak ? '#2F55D4' : '#6F90FF'}"><title>${esc(hourIST(p.t))} · ${n(p.kva)} kVA</title></rect>`; });
  s += `<line x1="${L}" x2="${L + iw}" y1="${y(contract)}" y2="${y(contract)}" stroke="#C5221F" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${lx}" y="${y(contract) + ldy}" text-anchor="${lanchor}" font-size="10" fill="#C5221F" font-weight="600">Contract ${n(contract)} kVA</text>`;
  s += `<line x1="${L}" x2="${L + iw}" y1="${y(target)}" y2="${y(target)}" stroke="#40566D" stroke-width="1" stroke-dasharray="2 3"/>${narrow ? '' : `<text x="${lx}" y="${y(target) + ldy}" font-size="10" fill="${TXT}">Target ${n(target)} kVA</text>`}`;
  const pi = points.indexOf(peak);
  s += `<text x="${L + pi * bw + bw / 2}" y="${y(peak.kva) - 5}" font-size="10" fill="#192839" font-weight="700" text-anchor="middle">${n(peak.kva)}</text>`;
  points.forEach((p, i) => { if (i % (narrow ? 6 : 3) === 0) s += `<text x="${L + i * bw + bw / 2}" y="${Hh - 8}" font-size="10" fill="${TXT}" text-anchor="middle">${esc(hourIST(p.t))}</text>`; });
  s += `<line x1="${L}" x2="${L + iw}" y1="${T + ih}" y2="${T + ih}" stroke="${AX}"/></svg>`;
  return s;
}

/** bullet: track from baseline (0) to target (1); filled to current, tick for previous period */
export function bullet(prog, progPrev) {
  const W = 150, x = v => 2 + Math.max(0, Math.min(1, v)) * (W - 4);
  return `<svg viewBox="0 0 ${W} 16" style="max-width:150px;min-width:110px" role="img" aria-label="${Math.round(prog * 100)} % of the way from baseline to target"><rect x="2" y="5" width="${W - 4}" height="6" rx="3" fill="#E6EBFA"/><rect x="2" y="5" width="${x(prog) - 2}" height="6" rx="3" fill="#2F55D4"/><line x1="${x(progPrev)}" x2="${x(progPrev)}" y1="1" y2="15" stroke="#40566D" stroke-width="2"/><line x1="${W - 2}" x2="${W - 2}" y1="1" y2="15" stroke="#008542" stroke-width="2"/></svg>`;
}

/** horizontal bar inside a table cell */
export const hbar = (v, max, color = '#2F55D4', w = 120) => `<svg viewBox="0 0 ${w} 10" style="max-width:${w}px;min-width:60px;display:inline-block;vertical-align:middle"><rect x="0" y="1" width="${w}" height="8" rx="2" fill="#F1F5FA"/><rect x="0" y="1" width="${Math.max(2, (v / (max || 1)) * w)}" height="8" rx="2" fill="${color}"/></svg>`;

/** daily line with baseline and target reference lines; split shading for the previous period */
export function trendLine(o) { return `<div class="only-w">${trendLine1({ ...o, W: 900, Hh: 230 })}</div><div class="only-n">${trendLine1({ ...o, W: 360, Hh: 220, narrow: true })}</div>`; }
function trendLine1({ points, base, target, splitAt, dec = 2, W, Hh, narrow }) {
  const L = 40, R = narrow ? 30 : 104, T = 14, B = 24, iw = W - L - R, ih = Hh - T - B;
  const lx = narrow ? L + iw - 4 : L + iw + 6, ldy = narrow ? -4 : 4, la = narrow ? 'end' : 'start';
  const vals = points.map(p => p.v).concat([base, target]);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.12; const y0 = lo - pad, y1 = hi + pad;
  const x = i => L + (i / (points.length - 1)) * iw, y = v => T + ih - ((v - y0) / (y1 - y0)) * ih;
  const si = points.findIndex(p => p.t > splitAt);
  let s = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Daily trend against baseline and target">`;
  if (si > 0) s += `<rect x="${L}" y="${T}" width="${x(si) - L}" height="${ih}" fill="#F1F5FA"/><text x="${L + 6}" y="${T + ih - 6}" font-size="10" fill="${TXT}">${narrow ? 'Prev. 30 d' : 'Previous 30 days'}</text><text x="${x(si) + 6}" y="${T + ih - 6}" font-size="10" fill="${TXT}">${narrow ? 'Last 30 d' : 'Last 30 days'}</text>`;
  const step = (y1 - y0) / 4;
  for (let k = 0; k <= 4; k++) { const v = y0 + k * step; s += `<text x="${L - 6}" y="${y(v) + 4}" font-size="10" fill="${TXT}" text-anchor="end">${n(v, dec)}</text>`; }
  s += `<line x1="${L}" x2="${L + iw}" y1="${y(base)}" y2="${y(base)}" stroke="#B66363" stroke-dasharray="5 4"/><text x="${lx}" y="${y(base) + ldy}" text-anchor="${la}" font-size="10" fill="#B66363" font-weight="600">Baseline ${n(base, dec)}</text>`;
  s += `<line x1="${L}" x2="${L + iw}" y1="${y(target)}" y2="${y(target)}" stroke="#008542" stroke-dasharray="5 4"/><text x="${lx}" y="${y(target) + ldy}" text-anchor="${la}" font-size="10" fill="#008542" font-weight="600">Target ${n(target, dec)}</text>`;
  s += `<polyline fill="none" stroke="#2F55D4" stroke-width="2" stroke-linejoin="round" points="${points.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}"/>`;
  const last = points[points.length - 1];
  s += `<circle cx="${x(points.length - 1)}" cy="${y(last.v)}" r="3.5" fill="#2F55D4"/><text x="${x(points.length - 1) + (narrow ? -4 : 6)}" y="${y(last.v) - 8}" text-anchor="${narrow ? 'end' : 'start'}" font-size="10" font-weight="700" fill="#192839">${n(last.v, dec)}</text>`;
  [0, Math.floor(points.length / 2), points.length - 1].forEach(i => { s += `<text x="${x(i)}" y="${Hh - 6}" font-size="10" fill="${TXT}" text-anchor="${i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}">${esc(new Date(points[i].t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }))}</text>`; });
  s += `<line x1="${L}" x2="${L + iw}" y1="${T + ih}" y2="${T + ih}" stroke="${AX}"/></svg>`;
  return s;
}

/** single stacked bar (segments [{label,value,color}]) */
export function stack(segs, { h = 18 } = {}) {
  const tot = segs.reduce((a, s) => a + s.value, 0) || 1; let x = 0;
  return `<svg viewBox="0 0 600 ${h}" preserveAspectRatio="none" style="height:${h}px">${segs.map(s => { const w = (s.value / tot) * 600; const r = `<rect x="${x}" y="0" width="${Math.max(0, w - 2)}" height="${h}" fill="${s.color}"><title>${esc(s.label)}</title></rect>`; x += w; return r; }).join('')}</svg>`;
}
