import * as XLSX from 'xlsx';
import { downloadBlob, fmtDate } from './data.js';

const M = 60e3;
const V = (v, by, minsAgo, note) => ({ v, by, when: Date.now() - minsAgo * M, note });

/** Seed library. The Artefactory is common to every user; each item belongs to one demo database. */
export function seedArtefacts() {
  return [
    { id: 'a-auto-d1', type: 'dash', demo: 'auto', name: 'Plant head daily view', owner: 'master', spec: { kpis: ['oee', 'fpy', 'sec', 'udt'], focus: 'overview' }, shared: ['auto'],
      versions: [V(6, 'Copilot for Master', 50, 'Added value-realised tile'), V(5, 'Master', 1500, 'Moved quality chart up'), V(4, 'Copilot for Master', 9000, 'Added top losses'), V(3, 'Master', 19000, 'Changed OEE target to 78 %')] },
    { id: 'a-auto-d2', type: 'dash', demo: 'auto', name: 'Sprocket Line 2 war room', owner: 'auto', spec: { kpis: ['oee', 'chg'], focus: 'cost' }, shared: ['master'],
      versions: [V(3, 'Copilot for Auto components', 38, 'Added micro-stops by machine'), V(2, 'Auto components', 8000, 'Added changeover timer'), V(1, 'Copilot for Auto components', 17000, 'Created from prompt')] },
    { id: 'a-auto-r1', type: 'report', demo: 'auto', name: 'Daily plant performance', owner: 'auto', spec: { kind: 'daily' }, shared: ['master'],
      versions: [V(58, 'Shift Report Agent', 95, 'Scheduled run'), V(57, 'Shift Report Agent', 95 + 1440, 'Scheduled run'), V(56, 'Shift Report Agent', 95 + 2880, 'Scheduled run')] },
    { id: 'a-auto-x1', type: 'xlsx', demo: 'auto', name: 'KPI and losses workbook', owner: 'auto', spec: { kind: 'daily' }, shared: [],
      versions: [V(12, 'Cost Conversion Agent', 400, 'Daily refresh'), V(11, 'Cost Conversion Agent', 1840, 'Daily refresh'), V(10, 'Auto components', 3000, 'Added reason-code sheet')] },
    { id: 'a-auto-p1', type: 'pptx', demo: 'auto', name: 'Monthly operations review', owner: 'master', spec: { kind: 'daily' }, shared: ['auto'],
      versions: [V(5, 'Master', 230, 'Edited decisions slide'), V(4, 'Copilot for Master', 260, 'Refreshed with month-to-date data'), V(3, 'Auto components', 1800, 'Added quality slide')] },
    { id: 'a-auto-w1', type: 'docx', demo: 'auto', name: 'Value realisation note', owner: 'master', spec: { kind: 'daily' }, shared: [],
      versions: [V(3, 'Plant controller', 1700, 'Finance validation added'), V(2, 'Master', 6000, 'Added energy section'), V(1, 'Copilot for Master', 7400, 'Drafted from KPI scorecard')] },
    { id: 'a-cem-d1', type: 'dash', demo: 'cement', name: 'Kiln command view', owner: 'cement', spec: { kpis: ['krf', 'heat', 'fcao', 'udt'], focus: 'overview' }, shared: ['master'],
      versions: [V(4, 'Copilot for Cement', 120, 'Added C4 draft trend'), V(3, 'Cement', 5000, 'Added free lime band')] },
    { id: 'a-cem-r1', type: 'report', demo: 'cement', name: 'Daily process report', owner: 'cement', spec: { kind: 'daily' }, shared: ['master'],
      versions: [V(41, 'Shift Report Agent', 130, 'Scheduled run'), V(40, 'Shift Report Agent', 1570, 'Scheduled run')] },
    { id: 'a-cem-p1', type: 'pptx', demo: 'cement', name: 'Kiln performance review', owner: 'master', spec: { kind: 'daily' }, shared: ['cement'],
      versions: [V(2, 'Master', 3000, 'Added heat balance slide'), V(1, 'Copilot for Master', 3100, 'Drafted')] },
    { id: 'a-stl-d1', type: 'dash', demo: 'steel', name: 'Mill war room', owner: 'steel', spec: { kpis: ['yield', 'util', 'cobbles', 'udt'], focus: 'cost' }, shared: ['master'],
      versions: [V(2, 'Copilot for Steel', 300, 'Added cobbles per shift'), V(1, 'Copilot for Steel', 9000, 'Created from prompt')] },
    { id: 'a-stl-x1', type: 'xlsx', demo: 'steel', name: 'Melt shop energy workbook', owner: 'steel', spec: { kind: 'energy' }, shared: [],
      versions: [V(7, 'Energy Agent', 380, 'Daily refresh'), V(6, 'Energy Agent', 1820, 'Daily refresh')] },
  ];
}
export const TYPE = { dash: { label: 'Dashboard', ext: 'HTML' }, report: { label: 'Report', ext: 'HTML' }, xlsx: { label: 'Workbook', ext: 'XLSX' }, pptx: { label: 'Presentation', ext: 'PPTX' }, docx: { label: 'Document', ext: 'DOCX' } };

/* ---------- workbook from live data ---------- */
export function workbookSheets(ctx, kind) {
  const { db, tools, demo } = ctx;
  const k = tools.get_kpis({ days: 30 });
  const o = tools.get_oee_losses();
  const p = tools.get_production({ days: 30 });
  const sheets = [
    { name: 'KPIs', cols: ['KPI', 'Unit', 'Baseline', 'Last 30 days', 'Target', 'Change %', 'Status'], rows: k.kpis.map(x => [x.name, x.unit, x.baseline, x.value, x.target, x.improvement_pct, x.status]) },
    { name: 'Production', cols: ['Date', 'Plan', 'Actual', 'Attainment %'], rows: p.days.map(x => [fmtDate(x.t), x.plan, x.actual, { v: Math.round((x.actual / x.plan) * 1000) / 10, f: r => `=C${r}/B${r}*100` }]) },
    { name: 'Lines', cols: ['Line', 'Availability %', 'Performance %', 'Quality %', 'OEE %', 'Top loss'], rows: o.lines.map(l => [l.line, l.availability, l.performance, l.quality, { v: l.oee, f: r => `=B${r}*C${r}*D${r}/10000` }, l.top_loss]) },
  ];
  if (kind === 'energy') {
    const e = tools.get_energy({ days: 7 });
    sheets.unshift({ name: 'Energy', cols: ['Area', 'kWh', 'Share %'], rows: e.by_area.map(a => [a.area, a.kwh, a.share_pct]) });
  }
  return sheets;
}
export function downloadWorkbook(name, sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => {
    const aoa = [s.cols, ...s.rows.map(r => r.map(c => (c && typeof c === 'object' ? c.v : c)))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    s.rows.forEach((r, ri) => r.forEach((c, ci) => { if (c && typeof c === 'object') ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })] = { t: 'n', v: c.v, f: c.f(ri + 2).slice(1) }; }));
    ws['!cols'] = s.cols.map(c => ({ wch: Math.max(12, c.length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  });
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${name.replace(/[^A-Za-z0-9]+/g, '-')}.xlsx`);
}
/** Save the rendered document element as a standalone HTML (or Word-readable .doc) file. */
export function downloadHTML(name, el, asWord) {
  const css = [...document.styleSheets].map(s => { try { return [...s.cssRules].map(r => r.cssText).join('\n'); } catch { return ''; } }).join('\n');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title><style>${css} body{background:#f4f4f2;padding:24px;height:auto}</style></head><body>${el.outerHTML}</body></html>`;
  downloadBlob(new Blob([html], { type: asWord ? 'application/msword' : 'text/html' }), `${name.replace(/[^A-Za-z0-9]+/g, '-')}.${asWord ? 'doc' : 'html'}`);
}
