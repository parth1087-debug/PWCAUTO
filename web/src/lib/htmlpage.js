/* Generated HTML artefacts. onePager(c): a self-contained plant one-pager in the Faclon style (inline CSS, no scripts). */
import { fmtNum, fmtDate } from './data.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export function onePager(c) {
  const { demo, db, tools } = c;
  const k = tools.get_kpis({ days: 30 }).kpis;
  const top = k.slice(0, 6);
  const health = db.healthAll().slice(0, 5);
  const evs = (demo.events || []).filter(e => e.title).slice(0, 4);
  const lakh = demo.kpis.reduce((n, x) => n + (x.lakh || 0), 0);
  const bar = (v, max) => `<span class="bar"><i style="width:${Math.max(4, Math.min(100, (v / (max || 1)) * 100))}%"></i></span>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(demo.company)} · plant one-pager</title>
<style>
:root{--blue:#2F55D4;--ink:#192839;--muted:#40566D;--line:#CBD5E2;--soft:#F1F5FA;--good:#008542;--bad:#c5221f}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:#fff;font-size:14px;line-height:1.5}
.wrap{max-width:980px;margin:0 auto;padding:28px 24px}
header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;border-bottom:2px solid var(--blue);padding-bottom:14px;margin-bottom:20px;flex-wrap:wrap}
.lock{font-weight:800;letter-spacing:.06em}.lock i{font-style:normal;font-weight:300;color:var(--blue);letter-spacing:.16em;margin-left:4px}
h1{margin:6px 0 0;font-size:26px;letter-spacing:-.01em}.sub{color:var(--muted)}
.eyebrow{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--blue)}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.card{border:1px solid var(--line);border-radius:8px;padding:14px}
.v{font-size:28px;font-weight:700;letter-spacing:-.02em}.v small{font-size:13px;color:var(--muted);font-weight:400}
.d{font-size:12px;color:var(--muted)}.up{color:var(--good);font-weight:600}
h2{color:var(--blue);font-size:18px;margin:26px 0 10px}
table{width:100%;border-collapse:collapse}td,th{padding:8px 6px;border-bottom:1px solid #E4E8EF;text-align:left;font-size:13px}th{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.bar{display:inline-block;width:110px;height:6px;background:var(--soft);border-radius:3px;vertical-align:middle}.bar i{display:block;height:100%;border-radius:3px;background:var(--blue)}
.ev{border-left:3px solid var(--bad);background:#FDF5F4;border-radius:0 6px 6px 0;padding:10px 12px;margin-bottom:8px}.ev b{display:block}
.value{background:#F3FBF4;border:1px solid var(--good);border-radius:4px;padding:14px 16px;margin-top:18px}.value b{color:var(--good)}
footer{display:flex;justify-content:space-between;border-top:1px solid #E4E8EF;margin-top:28px;padding-top:10px;font-size:11px;color:var(--muted);flex-wrap:wrap;gap:8px}footer span:last-child{color:var(--blue)}
@media(max-width:700px){.grid{grid-template-columns:1fr 1fr}}
</style></head><body><div class="wrap">
<header><div><div class="lock">FACLON<i>LABS</i></div><h1>${esc(demo.company)} · ${esc(demo.site)}</h1><div class="sub">${esc(demo.industry)} · ${esc(demo.location || '')}</div></div>
<div class="sub">Status at ${esc(fmtDate(db.anchor))} · last 30 days</div></header>
<div class="eyebrow">Key performance</div>
<div class="grid">${top.map(x => `<div class="card"><div class="d">${esc(x.name)}</div><div class="v">${esc(fmtNum(x.value))} <small>${esc(x.unit)}</small></div><div class="d"><span class="up">${x.improvement_pct > 0 ? '↑' : '↓'} ${esc(Math.abs(x.improvement_pct))} %</span> vs baseline ${esc(x.baseline)} · target ${esc(x.target)}</div></div>`).join('')}</div>
<div class="value"><b>Value realised: ₹${esc(fmtNum(lakh))} lakh per year</b> across ${demo.kpis.filter(x => x.lakh).length} KPIs, measured against the 3-month baseline before go-live.</div>
<h2>Open issues</h2>${evs.map(e => `<div class="ev"><b>${esc(e.title)}</b>${esc(e.asset)} · ${esc(e.agent)} · ${esc(e.diagnosis?.reco || '')}</div>`).join('')}
<h2>Asset health</h2><table><thead><tr><th>Asset</th><th>Health</th><th>Life left</th><th>Finding</th></tr></thead><tbody>
${health.map(h => `<tr><td><b>${esc(h.id)}</b> ${esc(h.name)}</td><td>${bar(h.health, 100)} ${esc(h.health)}</td><td>${esc(h.rulDays)} days</td><td>${esc(h.finding || '—')}</td></tr>`).join('')}</tbody></table>
<footer><span>Demo data. All terms are indicative and subject to mutual agreement.</span><span>www.faclon.com | Faclon Labs Pvt Ltd</span></footer>
</div></body></html>`;
}
