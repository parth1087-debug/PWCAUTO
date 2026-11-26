/* ==========================================================================
   Plant KPIs, Autopilot, Reports and Tools pages
   ========================================================================== */

/* ---------- Plant KPIs against baseline ---------- */
const kpiFmt = (v, d) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-IN') : (+v).toFixed(d));
function kpiCalc(k) {
  const up = k.better === 'up';
  const improve = up ? k.cur - k.base : k.base - k.cur;
  const pctImp = (improve / Math.abs(k.base)) * 100;
  const prog = Math.max(0, Math.min(1, (k.cur - k.base) / (k.tgt - k.base || 1)));
  const status = prog >= 0.999 ? 'On target' : prog >= 0.45 ? 'On track' : 'At risk';
  return { improve, pctImp, prog, status };
}
function pageKpis() {
  if (!state.kpi) state.kpi = 'oee';
  const total = KPIS.reduce((a, k) => a + k.value, 0);
  const calcs = KPIS.map(kpiCalc);
  const improved = calcs.filter(c => c.improve > 0).length;
  const onTarget = calcs.filter(c => c.status === 'On target').length;
  const atRisk = calcs.filter(c => c.status === 'At risk').length;
  const groups = [...new Set(KPIS.map(k => k.g))];
  const rows = groups.map(g => {
    const ks = KPIS.filter(k => k.g === g);
    const gv = ks.reduce((a, k) => a + k.value, 0);
    return `<tr class="grp"><td colspan="9">${g}</td><td class="r num">${gv ? '₹' + gv + ' L' : ''}</td></tr>` + ks.map(k => {
      const c = kpiCalc(k);
      const ser = kpiSeries(k);
      return `<tr class="click ${state.kpi === k.id ? 'sel' : ''}" data-kpi="${k.id}">
        <td><div class="strong">${k.name}</div>${k.note ? `<div class="muted" style="font-size:11px">${k.note}</div>` : ''}</td>
        <td class="muted">${k.unit}</td>
        <td class="r num">${kpiFmt(k.base, k.dec)}</td>
        <td class="r num strong">${kpiFmt(k.cur, k.dec)}</td>
        <td class="r num muted">${kpiFmt(k.tgt, k.dec)}</td>
        <td class="r num" style="color:${c.improve > 0 ? 'var(--good)' : 'var(--bad)'}">${c.improve > 0 ? '▲' : '▼'} ${Math.abs(c.pctImp).toFixed(c.pctImp > 99 ? 0 : 1)} %</td>
        <td style="width:120px"><div class="bar-cell"><div class="bar-track"><div class="bar-fill ${c.status === 'At risk' ? 'warn' : ''}" style="width:${c.prog * 100}%"></div></div><span class="num muted" style="width:32px;text-align:right">${Math.round(c.prog * 100)}%</span></div></td>
        <td style="width:90px">${Charts.spark(ser.slice(-16), 'var(--c1)', 90, 20)}</td>
        <td><span class="chip ${c.status === 'On target' ? 'good' : c.status === 'On track' ? 'info' : 'warn'}">${c.status}</span></td>
        <td class="r num">${k.value ? '₹' + k.value + ' L' : '<span class="muted">—</span>'}</td></tr>`;
    }).join('');
  }).join('');
  const byArea = groups.map(g => ({ label: g.split(' ·')[0].replace('Productivity & cost conversion', 'Cost conversion'), value: KPIS.filter(k => k.g === g).reduce((a, k) => a + k.value, 0) }));

  return headerBlock('Plant KPIs', `Every KPI measured against the baseline before go-live (${BASELINE.period}). Go-live ${BASELINE.golive}.`,
    `<span class="chip outline">Baseline locked · signed off by plant head</span>${periodSeg('30 days')}`) +
    kpiStrip([
      { label: 'Value realised vs baseline', value: '₹' + (total / 100).toFixed(2), unit: 'Cr/yr', foot: 'annualised, finance-validated' },
      { label: 'KPIs improved', value: improved, unit: `of ${KPIS.length}`, foot: 'vs baseline' },
      { label: 'On target', value: onTarget, unit: 'KPIs', foot: 'target met or beaten' },
      { label: 'At risk', value: atRisk, unit: 'KPIs', foot: 'under 45 % of the way to target' },
      { label: 'Plant OEE', value: '71.8', unit: '%', delta: '5.6 pp', dir: 'up', good: true, foot: 'baseline 66.2 %' },
      { label: 'Conversion cost', value: '₹38.4', unit: '/kg', delta: '₹2.5', dir: 'down', good: true, foot: 'baseline ₹40.9' },
    ]) +
    `<div class="grid g-21">
      <section class="card" id="kpiDetail"></section>
      ${card('Value realised by area', '₹ lakh per year', `<div class="card-body"><div id="ch-value"></div><p class="muted" style="font-size:11px;margin:10px 0 0">Value is counted once, at the KPI that carries it. Conversion cost per kg is a roll-up and is not added again.</p></div>`)}
    </div>
    <div class="mt">${card('KPI scorecard', `${KPIS.length} KPIs · select a row to see its trend`, `<div class="card-body flush"><table class="tbl kpi-tbl"><thead><tr><th>KPI</th><th>Unit</th><th class="r">Baseline</th><th class="r">Current</th><th class="r">Target</th><th class="r">vs baseline</th><th>Progress to target</th><th>16 weeks</th><th>Status</th><th class="r">Value / yr</th></tr></thead><tbody>${rows}</tbody></table></div>`,
      `<button class="btn sm" data-goto-report="x1">${ico('download')} Export to Excel</button>`)}</div>`;
}
function drawKpis() {
  const k = KPIS.find(x => x.id === state.kpi);
  const c = kpiCalc(k);
  const ser = kpiSeries(k);
  $('#kpiDetail').innerHTML = `<div class="card-head"><h3>${k.name}</h3><span class="sub">${k.unit} · weekly · owner ${k.owner}</span><div class="right">${askBtn(`Why did ${k.name.toLowerCase()} change against the baseline?`, 'Ask Copilot')}</div></div>
    <div class="facts" style="margin-top:10px;border-top:1px solid var(--border)">
      <div class="fact"><div class="l">Baseline</div><div class="v">${kpiFmt(k.base, k.dec)}</div></div>
      <div class="fact"><div class="l">Current</div><div class="v">${kpiFmt(k.cur, k.dec)}</div></div>
      <div class="fact"><div class="l">Target</div><div class="v">${kpiFmt(k.tgt, k.dec)}</div></div>
      <div class="fact"><div class="l">Improvement</div><div class="v" style="color:${c.improve > 0 ? 'var(--good)' : 'var(--bad)'}">${c.improve > 0 ? '+' : ''}${Math.abs(c.pctImp).toFixed(1)} %</div></div></div>
    <div class="card-body"><div id="ch-kpi"></div><div class="legend"><span><i style="background:var(--c1)"></i>Actual</span><span><i style="background:var(--c5)"></i>Baseline</span><span><i style="background:var(--good)"></i>Target</span><span class="right-a">Shaded: baseline period</span></div></div>`;
  Charts.line($('#ch-kpi'), { labels: WEEKS, height: 220, dec: k.dec, unit: ' ' + k.unit,
    series: [{ name: k.name, color: 'var(--c1)', data: ser }],
    thresholds: [{ value: k.base, label: 'Baseline ' + kpiFmt(k.base, k.dec), color: 'var(--c5)' }, { value: k.tgt, label: 'Target ' + kpiFmt(k.tgt, k.dec), color: 'var(--good)' }],
    xBands: [{ from: 0, to: BASELINE.weeksBase - 1, color: 'var(--c5)', label: 'Baseline', opacity: 0.08 }],
    annotations: [{ i: BASELINE.weeksBase, label: 'Go-live' }] });
  const groups = [...new Set(KPIS.map(x => x.g))];
  Charts.hbars($('#ch-value'), { items: groups.map((g, i) => ({ label: g.split(' ·')[0].replace('Productivity & cost conversion', 'Cost conversion'), value: KPIS.filter(x => x.g === g).reduce((a, x) => a + x.value, 0), display: '₹' + KPIS.filter(x => x.g === g).reduce((a, x) => a + x.value, 0) + ' L', color: ['var(--c1)', 'var(--c3)', 'var(--c4)', 'var(--c2)'][i] })), labelW: 120, rowH: 40 });
}

/* ---------- Autopilot ---------- */
function pageAutopilot() {
  const tab = state.apTab || 'sched';
  const tabs = [['sched', 'Report schedules', SCHEDULES.length], ['wf', 'Workflows', WORKFLOWS.length], ['runs', 'Run history', AUTORUNS.length]];
  let body = '';
  if (tab === 'sched') {
    body = `<table class="tbl"><thead><tr><th>Report</th><th>Format</th><th>Agent</th><th>Schedule</th><th>Recipients</th><th>Channel</th><th>Last run</th><th>Next run</th><th>On</th></tr></thead><tbody>${SCHEDULES.map(s => `<tr>
      <td class="strong">${s.name}</td><td><span class="chip ${s.fmt === 'Excel' ? 'good' : 'info'}">${s.fmt}</span></td><td class="muted">${s.agent}</td><td>${s.cadence}</td><td class="muted">${s.to}</td><td class="muted">${s.ch}</td>
      <td>${s.ok ? `<span class="split"><span class="dot"></span>${s.last}</span>` : `<span class="split" style="color:var(--warn)"><span class="dot warn"></span>${s.last} · retried</span>`}</td>
      <td class="num">${s.on ? s.next : '<span class="muted">Paused</span>'}</td>
      <td><button class="toggle ${s.on ? 'on' : ''}" data-sched="${s.id}" aria-label="On or off"><i></i></button></td></tr>`).join('')}</tbody></table>`;
  } else if (tab === 'wf') {
    const icon = { trigger: 'bolt', agent: 'bot', approval: 'shield', action: 'send' };
    const lab = { trigger: 'Trigger', agent: 'Agent', approval: 'Approval', action: 'Action' };
    body = `<div class="wfs">${WORKFLOWS.map(w => `<div class="wf">
      <div class="wf-head"><div><div class="strong">${w.name}</div><div class="muted" style="font-size:11px">${w.runs} runs, 30 days · avg ${w.avg} · ${w.saved}</div></div>
        <button class="toggle ${w.on ? 'on' : ''}" data-wf="${w.id}" aria-label="On or off"><i></i></button></div>
      <div class="wf-steps">${w.steps.map(s => `<div class="wf-step ${s[0]}"><div class="wf-k">${ico(icon[s[0]])}${lab[s[0]]}</div><div>${s[1]}</div></div>`).join('<div class="wf-arrow">›</div>')}</div></div>`).join('')}</div>`;
  } else {
    body = `<table class="tbl"><thead><tr><th>Time</th><th>Schedule or workflow</th><th>Trigger</th><th>Result</th><th>Status</th></tr></thead><tbody>${AUTORUNS.map(r => `<tr>
      <td class="num">${r.t}</td><td class="strong">${r.name}</td><td class="muted">${r.trig}</td><td>${r.res}</td>
      <td>${r.state === 'Awaiting approval' ? '<button class="btn primary sm" data-approve>Approve</button>' : `<span class="chip ${r.state === 'Done' ? 'good' : 'warn'}">${r.state}</span>`}</td></tr>`).join('')}</tbody></table>`;
  }
  return headerBlock('Autopilot', 'Reports and workflows that run on their own, on a schedule or on a plant event. Anything that changes a plant system waits for a named approver.',
    `<button class="btn" data-ask="Create a weekly report of compressor specific power for the energy cell">${ico('spark')} New schedule by chat</button>`) +
    kpiStrip([
      { label: 'Report schedules', value: SCHEDULES.filter(s => s.on).length, unit: 'active', foot: `${SCHEDULES.length} in total` },
      { label: 'Workflows', value: WORKFLOWS.filter(w => w.on).length, unit: 'active', foot: '1 in trial' },
      { label: 'Runs, last 7 days', value: '1,246', unit: '', foot: '99.2 % successful' },
      { label: 'Pending approvals', value: '1', unit: '', foot: 'WO 4100 8821 · J. Thomas' },
      { label: 'Hours saved', value: '186', unit: 'h/month', foot: 'reports, checks, follow-ups' },
      { label: 'Reports delivered', value: '312', unit: 'this month', foot: 'email, Teams, WhatsApp' },
    ]) +
    `<section class="card"><div class="tabs">${tabs.map(t => `<button class="${t[0] === tab ? 'on' : ''}" data-aptab="${t[0]}">${t[1]} <span class="muted">${t[2]}</span></button>`).join('')}</div>
      <div class="card-body ${tab === 'wf' ? '' : 'flush'}" style="${tab === 'wf' ? '' : 'padding-top:0'}">${body}</div></section>`;
}

/* ---------- Reports ---------- */
const REPORT_CSS = `
.rep{font-family:"Helvetica Neue",Arial,sans-serif;color:#2d2d2d;background:#fff;font-size:12.5px;line-height:1.5;max-width:860px;margin:0 auto}
.rep .rh{display:flex;align-items:flex-start;gap:14px;border-bottom:3px solid #d04a02;padding:18px 22px 14px}
.rep .wm{font-family:Georgia,serif;font-weight:700;font-size:22px;position:relative;padding-top:7px}
.rep .wm:before{content:"";position:absolute;top:0;left:2px;width:34px;height:5px;background:linear-gradient(90deg,#ffb600,#eb8c00,#d04a02,#db536a)}
.rep .rt{flex:1}.rep h1{font-family:Georgia,serif;font-weight:400;font-size:22px;margin:0}
.rep .rm{color:#7a7672;font-size:11.5px;margin-top:3px}
.rep .rb{padding:16px 22px 24px}
.rep .tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid #e3e0db;margin:4px 0 16px}
.rep .tile{padding:10px 12px;border-right:1px solid #e3e0db}.rep .tile:last-child{border-right:0}
.rep .tile .l{font-size:10.5px;color:#7a7672}.rep .tile .v{font-size:20px;font-weight:300}.rep .tile .d{font-size:10.5px}
.rep .g{color:#1b8a55}.rep .b{color:#d0261c}
.rep h2{font-size:13px;margin:16px 0 6px;padding-bottom:4px;border-bottom:1px solid #e3e0db;color:#d04a02;text-transform:uppercase;letter-spacing:.04em}
.rep table{width:100%;border-collapse:collapse;font-size:11.5px;margin:4px 0 8px}
.rep th{text-align:left;background:#f4f3f1;font-weight:600;padding:6px 8px;border-bottom:1px solid #cfcac3}
.rep td{padding:6px 8px;border-bottom:1px solid #ece9e5}.rep td.r,.rep th.r{text-align:right}
.rep ul{margin:4px 0 8px;padding-left:18px}.rep li{margin:2px 0}
.rep .note{background:#fcebe1;border-left:3px solid #d04a02;padding:8px 12px;margin:8px 0}
.rep .rf{border-top:1px solid #e3e0db;color:#7a7672;font-size:10.5px;padding:10px 22px;display:flex;justify-content:space-between}`;
const tbl = (h, rows) => `<table><thead><tr>${h.map(x => `<th${x[0] === '>' ? ' class="r"' : ''}>${x.replace('>', '')}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${h[i][0] === '>' ? ' class="r"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const tiles = t => `<div class="tiles">${t.map(x => `<div class="tile"><div class="l">${x[0]}</div><div class="v">${x[1]}</div><div class="d ${x[3] || ''}">${x[2]}</div></div>`).join('')}</div>`;
const REPORT_BODY = {
  h1: () => tiles([['Production', '48,260 pcs', '96 % of plan', 'g'], ['Plant OEE', '71.4 %', '▲ 5.2 pp vs baseline', 'g'], ['First pass yield', '97.8 %', '▲ 1.7 pp vs baseline', 'g'], ['Specific energy', '1.93 kWh/kg', '▼ 7 % vs baseline', 'g']]) +
    `<h2>Summary</h2><p>Output was 96 % of plan. The main loss was on Sprocket Line 2 (HB-04 micro-stops, 2 h 10 min). Quality was steady. Energy per kg was 7 % better than baseline.</p>` +
    `<h2>Production by area</h2>` + tbl(['Area', '>Plan', '>Actual', '>OEE %', '>Rejects %'], [['Press Shop', '55,200', '54,380', '78.1', '0.9'], ['Machining', '28,800', '26,710', '64.8', '2.4'], ['Cold Forming', '1.42 M pcs', '1.40 M pcs', '78.6', '1.1'], ['Heat Treatment', '36.8 t', '36.1 t', '73.2', '0.6'], ['Chain Assembly', '42,600 m', '41,950 m', '71.0', '0.7']]) +
    `<h2>Top losses (₹)</h2>` + tbl(['Loss', 'Area', '>Minutes', '>₹'], [['HB-04 micro-stops', 'Sprocket Line 2', '130', '1,52,000'], ['Changeover overrun 428→520', 'Sprocket Line 2', '39', '46,000'], ['Under-loaded trays', 'MBF-01', '—', '51,000'], ['Plate feeding jams', 'Chain Assembly A', '28', '33,000']]) +
    `<h2>Agent findings and actions</h2><ul><li>HB-04 spindle bearing defect. Remaining life 9 days. WO 4100 8821 waiting for approval.</li><li>IH-02 quench flow low from 14:10. Lot hold QH-2611-07 raised.</li><li>Compressed air leak load 14 % at break time. Leak survey planned Sunday.</li></ul>` +
    `<div class="note"><b>Decisions needed today:</b> approve WO 4100 8821 (₹62,400) and confirm Saturday Shift C window.</div>`,
  h2: () => tiles([['Output vs plan', '96.2 %', '3 areas below plan', 'b'], ['OEE', '72.0 %', 'target 78 %', 'b'], ['FPY', '97.9 %', 'no customer complaint', 'g'], ['Energy', '16,240 kWh', '1.91 kWh/kg', 'g']]) +
    `<h2>Shift A · 26 Nov · 06:00–14:00</h2>` + tbl(['Area', '>Plan', '>Actual', '>OEE %'], [['Press Shop', '18,400', '18,120', '78.1'], ['Machining', '9,600', '8,830', '66.4'], ['Heat Treatment', '12.4 t', '12.1 t', '74.0'], ['Chain Assembly', '14,200 m', '13,980 m', '71.2']]) +
    `<h2>Losses above ₹50k</h2><ul><li>Sprocket Line 2: HB-04 micro-stops, 58 min (₹68k).</li><li>Chain Line B: changeover overrun, 31 min (₹54k).</li><li>MBF-01: under-loaded trays, 6 % extra energy (₹51k).</li></ul>` +
    `<h2>Safety and quality</h2><p>No incident. 2 lots on hold (QH-2611-05, QH-2611-06). PPE compliance 99.1 % (vision).</p>` +
    `<h2>Open actions for Shift B</h2>` + tbl(['Action', 'Owner', 'Due'], [['Check HB-04 feed rate (−8 %)', 'S. Iyer', 'Start of shift'], ['Confirm MBF-01 tray loading plan', 'V. Menon', '16:00'], ['Close QH-2611-05 after re-test', 'N. Shah', '18:00']]),
  h3: () => tiles([['Defect', 'Tooth crack', 'SPK-428-42T', ''], ['Rate', '0.99 %', 'baseline 0.31 %', 'b'], ['Parts held', '1,140', 'QH-2611-07', ''], ['Confidence', '0.86', 'root cause', 'g']]) +
    `<h2>D2 · Problem</h2><p>Tooth crack rejects at VI-01 rose from 0.31 % to 0.99 % from 14:10 on 26 Nov.</p>` +
    `<h2>D3 · Containment</h2><ul><li>Lot hold QH-2611-07 in SAP QM (1,140 pcs, lots L-26111-B3 to B5).</li><li>100 % hardness check on held lots.</li><li>Production moved to IH-01 during repair.</li></ul>` +
    `<h2>D4 · Root cause</h2>` + tbl(['Evidence', 'Finding'], [['MES genealogy', '94 % of cracked parts came through IH-02'], ['IH-02 quench flow', '18.2 → 14.6 L/min at 14:06 (r = −0.88)'], ['Pump current', 'No change: restriction is downstream of the pump'], ['LIMS', 'Make-up water hardness high since 21 Nov'], ['Hardness SPC', '7 points falling, last 49.8 HRC (spec 50–55)']]) +
    `<p>Root cause: quench strainer choke from scale.</p><h2>D5 · Corrective actions</h2>` + tbl(['Action', 'Owner', 'Due', 'Status'], [['Clean strainer and descale ring nozzle', 'Electrical', '26 Nov', 'Done'], ['Add flow interlock at 16 L/min', 'Automation', '5 Dec', 'Open'], ['Check softener regeneration', 'Utilities', '28 Nov', 'Open']]) +
    `<div class="note">Draft prepared by the Vision Quality Agent. Review and sign-off by the quality head is required.</div>`,
  h4: () => tiles([['Assets monitored', '214', '64 vibration nodes', ''], ['Alarm', '2', 'HB-04, IH-02', 'b'], ['Watch', '3', 'MBF-01, AC-02, PR-01', ''], ['MTBF', '142 h', '▲ 37 % vs baseline', 'g']]) +
    `<h2>Assets needing action</h2>` + tbl(['Asset', 'Health', 'Finding', '>Life left', 'Action'], [['HB-04', '38', 'Spindle bearing outer-race defect', '9 d', 'Replace bearing, Sat Shift C'], ['IH-02', '58', 'Quench strainer choke', '21 d', 'Cleaned 26 Nov, monitor'], ['MBF-01', '64', 'Belt drive drag', '34 d', 'Rollers in Sunday shutdown'], ['AC-02', '66', 'Oil cooler fouling', '40 d', 'Clean cooler 27 Nov'], ['PR-01', '71', 'Oil cooler effectiveness down', '52 d', 'Backflush at next die change']]) +
    `<h2>Work orders</h2><p>9 predictive WOs raised this week (34 % of all WOs, baseline 8 %). 1 waiting for approval.</p>`,
  h5: () => tiles([['Energy', '1,412 MWh', '▼ 4.8 % vs Sep', 'g'], ['Specific energy', '1.94 kWh/kg', 'baseline 2.08', 'g'], ['Max demand', '3,912 kVA', 'contract 4,200', ''], ['Carbon', '1,158 tCO₂e', '1.58 kg/kg', 'g']]) +
    `<h2>Consumption by area</h2>` + tbl(['Area', '>MWh', '>Share', '>vs baseline'], [['Heat Treatment', '518', '37 %', '−6.1 %'], ['Utilities', '279', '20 %', '−9.4 %'], ['Press Shop', '212', '15 %', '−2.2 %'], ['Machining', '159', '11 %', '+1.8 %'], ['Cold Forming', '115', '8 %', '−3.0 %'], ['Others', '129', '9 %', '−1.1 %']]) +
    `<h2>Opportunities</h2><ul><li>Fix Press Shop air leaks: ₹18.6 L/yr.</li><li>Move MBF-01 warm-up out of peak ToD: ₹11.2 L/yr.</li><li>Furnace idle mode on Sundays: ₹9.4 L/yr.</li></ul>`,
};
const EXCEL = {
  x1: [{ name: 'Summary', cols: ['Line', 'Availability %', 'Performance %', 'Quality %', 'OEE %', 'Top loss'], rows: COST.lines.map(l => [l.line, l.a, l.p, l.q, { v: +(l.a * l.p * l.q / 10000).toFixed(1), f: r => `=B${r}*C${r}*D${r}/10000` }, l.loss]) },
       { name: 'Six big losses', cols: ['Loss', 'Hours', 'Share %', '₹ lakh'], rows: COST.losses.map(l => [l.label, l.value, { v: +(l.value / 6.52).toFixed(1), f: r => `=B${r}/SUM(B$2:B$7)*100` }, { v: +(l.value * 0.071).toFixed(1), f: r => `=B${r}*0.071` }]) },
       { name: 'Loss events', cols: ['Time', 'Asset', 'Event', 'Minutes', 'Reason code'], rows: [['26-11 14:02', 'HB-04', 'Micro-stop', 3, 'ALM 2041'], ['26-11 13:51', 'HB-04', 'Micro-stop', 2, 'ALM 2041'], ['26-11 13:30', 'CA-02', 'Changeover', 52, 'CHG-428-520'], ['26-11 12:44', 'HB-04', 'Micro-stop', 4, 'ALM 2041'], ['26-11 11:10', 'PR-06', 'Coil change', 18, 'COIL'], ['26-11 10:05', 'DR-02', 'Starved', 11, 'NO-PART']] }],
  x2: [{ name: 'Defects', cols: ['Time', 'Station', 'Serial', 'Part', 'Defect', 'Confidence'], rows: Array.from({ length: 16 }, (_, i) => { const r = rng(300 + i); return [`25-11 ${String(6 + Math.floor(i / 2)).padStart(2, '0')}:${String(Math.floor(r() * 59)).padStart(2, '0')}`, ['VI-01', 'VI-02', 'VI-03'][i % 3], 'S' + (2610400 + Math.floor(r() * 9000)), ['SPK-428-42T', 'CHN-428H-118L', 'PLT-428-IN'][i % 3], QUALITY.defects[Math.floor(r() * 5)], +(0.88 + r() * 0.11).toFixed(2)]; }) },
       { name: 'By station', cols: ['Station', 'Inspected', 'Rejects', 'Reject %'], rows: [['VI-01', 58210, 1630, { v: 2.8, f: r => `=C${r}/B${r}*100` }], ['VI-02', 71540, 429, { v: 0.6, f: r => `=C${r}/B${r}*100` }], ['VI-03', 54570, 218, { v: 0.4, f: r => `=C${r}/B${r}*100` }]] }],
  x3: [{ name: 'Plan', cols: ['Day', 'Window', 'Asset', 'Job', 'Team', 'Hours', 'WO'], rows: [['Sat 29 Nov', 'Shift C', 'HB-04', 'Replace spindle bearing FAG 7014', 'Mech · 2', 4, '4100 8821'], ['Sun 30 Nov', '06:00', 'MBF-01', 'Inspect return rollers R5–R9', 'Mech · 3', 3, '4100 8809'], ['Sun 30 Nov', '06:00', 'AC-02', 'Clean oil cooler, change filter', 'Utility · 2', 2.5, '4100 8790'], ['Sun 30 Nov', '08:30', 'PR-01', 'Backflush hydraulic oil cooler', 'Hydraulics · 2', 2, '4100 8827'], ['Sun 30 Nov', '09:00', 'IH-02', 'Replace quench strainer', 'Elec · 2', 1.5, '4100 8828'], ['Tue 2 Dec', 'Shift A', 'CA-02', 'Riveting head check', 'Mech · 1', 1, '4100 8830']] },
       { name: 'Spares', cols: ['Material', 'Description', 'Need', 'In stock', 'Store'], rows: [['400221', 'Bearing FAG 7014', 1, 2, 'B-14'], ['512090', 'Oil filter AC 132 kW', 1, 4, 'U-02'], ['330415', 'Quench strainer 1.5"', 1, 3, 'E-07']] }],
  x4: [{ name: 'Daily kWh', cols: ['Meter', 'Area', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total'], rows: ENERGY.byArea.map((a, i) => { const d = WEEKDAYS.map((_, j) => Math.round(a.value * (j < 6 ? 1 : 0.45) * (0.95 + rng(i * 7 + j)() * 0.1))); return [`EM-${String(i + 1).padStart(3, '0')}`, a.label, ...d, { v: d.reduce((x, y) => x + y, 0), f: r => `=SUM(C${r}:I${r})` }]; }) }],
  x5: [{ name: 'By part', cols: ['Part no.', 'Description', 'Volume', 'Standard ₹', 'Actual ₹', 'Variance %'], rows: COST.parts.map(p => [p.pn, p.desc, p.vol, p.std, p.act, { v: +((p.act - p.std) / p.std * 100).toFixed(1), f: r => `=(E${r}-D${r})/D${r}*100` }]) }],
};
function reportDoc(r) {
  return `<div class="rep"><div class="rh"><div class="wm">pwc</div><div class="rt"><h1>${r.name}</h1><div class="rm">${CONFIG.customer} · ${CONFIG.plant} · ${r.period}</div></div>
    <div class="rm" style="text-align:right">Prepared by ${r.agent}<br>${r.when}</div></div>
    <div class="rb">${REPORT_BODY[r.id]()}</div>
    <div class="rf"><span>Generated by Faclon AI agents from live plant data. Figures are illustrative for this demo.</span><span>Page 1 of 1</span></div></div>`;
}
function pageReports() {
  if (!state.report) state.report = 'h1';
  const f = state.repFilter || 'All';
  const list = REPORTS.filter(r => f === 'All' || r.type === f);
  return headerBlock('Reports', 'Excel and HTML artefacts written by the agents, on schedule or on request from Copilot.',
    `<div class="seg">${['All', 'HTML', 'Excel'].map(x => `<button class="${x === f ? 'on' : ''}" data-repf="${x}">${x}</button>`).join('')}</div>`) +
    `<div class="rep-wrap">
      <section class="card rep-list">${list.map(r => `<button class="rep-item ${r.id === state.report ? 'on' : ''}" data-report="${r.id}">
        <span class="fi ${r.type === 'Excel' ? 'x' : 'h'}">${r.type === 'Excel' ? 'XLSX' : 'HTML'}</span>
        <span style="min-width:0;flex:1"><span class="t">${r.name}</span><span class="m">${r.period} · ${r.agent}</span></span>
        <span class="m" style="text-align:right">${r.when}<br>${r.size}</span></button>`).join('')}</section>
      <section class="card rep-view" id="repView"></section>
    </div>`;
}
function drawReports() {
  const r = REPORTS.find(x => x.id === state.report);
  const sch = SCHEDULES.find(s => s.id === r.sched);
  const head = `<div class="card-head"><h3>${r.name}</h3><span class="sub">${r.period} · ${r.size}${sch ? ' · ' + sch.cadence : ' · on request'}</span>
    <div class="right"><button class="btn sm" data-toast="Shared with the distribution list on Teams">Share</button><button class="btn primary sm" data-download="${r.id}">${ico('download')} Download ${r.type === 'Excel' ? 'Excel' : 'HTML'}</button></div></div>`;
  if (r.type === 'HTML') {
    $('#repView').innerHTML = head + `<div class="rep-frame">${reportDoc(r)}</div>`;
  } else {
    $('#repView').innerHTML = head + xlGrid(r.id);
  }
}
function xlGrid(repId) {
  state.sheet = state.sheet && state.sheet.rep === repId ? state.sheet : { rep: repId, i: 0 };
  const sheets = EXCEL[repId], sh = sheets[state.sheet.i];
  const letters = sh.cols.map((_, i) => String.fromCharCode(65 + i));
  const cell = c => (c && typeof c === 'object' ? c.v : c);
  return `<div class="xl">
      <div class="xl-bar"><span class="xl-ref" id="xlRef">A1</span><span class="xl-fx">fx</span><span id="xlVal">${sh.cols[0]}</span></div>
      <div class="xl-grid"><table><thead><tr><th></th>${letters.map(l => `<th>${l}</th>`).join('')}</tr></thead><tbody>
        <tr><th>1</th>${sh.cols.map((c, i) => `<td class="hd" data-cell="${letters[i]}1" data-v="${c}">${c}</td>`).join('')}</tr>
        ${sh.rows.map((row, ri) => `<tr><th>${ri + 2}</th>${row.map((c, ci) => { const v = cell(c); const fx = c && typeof c === 'object' ? c.f(ri + 2) : v; return `<td class="${typeof v === 'number' ? 'n' : ''}" data-cell="${letters[ci]}${ri + 2}" data-v="${String(fx).replace(/"/g, '&quot;')}">${typeof v === 'number' ? v.toLocaleString('en-IN') : v}</td>`; }).join('')}</tr>`).join('')}
        ${Array.from({ length: 4 }, (_, k) => `<tr><th>${sh.rows.length + 2 + k}</th>${letters.map(() => '<td></td>').join('')}</tr>`).join('')}
      </tbody></table></div>
      <div class="xl-tabs">${sheets.map((x, i) => `<button class="${i === state.sheet.i ? 'on' : ''}" data-sheet="${i}">${x.name}</button>`).join('')}</div></div>`;
}
function downloadReport(id) {
  const r = REPORTS.find(x => x.id === id);
  let blob, name;
  if (r.type === 'HTML') {
    blob = new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>${r.name}</title><style>${REPORT_CSS} body{margin:0;background:#f4f3f1;padding:24px}</style></head><body>${reportDoc(r)}</body></html>`], { type: 'text/html' });
    name = `${r.name.replace(/[^A-Za-z0-9]+/g, '-')}.html`;
  } else {
    const sheets = EXCEL[r.id];
    const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#F4F3F1" ss:Pattern="Solid"/></Style></Styles>` +
      sheets.map(s => `<Worksheet ss:Name="${s.name}"><Table><Row>${s.cols.map(c => `<Cell ss:StyleID="h"><Data ss:Type="String">${c}</Data></Cell>`).join('')}</Row>${s.rows.map(row => `<Row>${row.map(c => { const v = c && typeof c === 'object' ? c.v : c; return `<Cell><Data ss:Type="${typeof v === 'number' ? 'Number' : 'String'}">${v}</Data></Cell>`; }).join('')}</Row>`).join('')}</Table></Worksheet>`).join('') + `</Workbook>`;
    blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    name = `${r.name.replace(/[^A-Za-z0-9]+/g, '-')}.xls`;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  toast(`Downloaded ${name}`);
}

/* ---------- Tools (MCP Gateway) ---------- */
function pageTools() {
  return headerBlock('Tools', 'MCP connectors in the Bruce MCP Gateway that the agents can use. Each tool runs with the user\'s rights and the approval rules below.', readOnlyChip()) +
    kpiStrip([
      { label: 'Connectors', value: TOOLS.length, unit: '', foot: 'Faclon platforms and plant systems' },
      { label: 'Tools', value: TOOLS.reduce((a, t) => a + t.tools.length, 0), unit: '', foot: 'found by semantic tool search' },
      { label: 'Gated actions', value: TOOLS.reduce((a, t) => a + (t.access.includes('gated') ? t.tools.filter(x => /create|release|reserve/.test(x)).length : 0), 0), unit: '', foot: 'need a named approver' },
      { label: 'Tool calls today', value: '3,418', unit: '', foot: 'all logged in Foundry' },
      { label: 'Blocked calls', value: '3', unit: 'today', foot: 'outside role or policy' },
      { label: 'Control-system writes', value: '0', unit: '', foot: 'disabled by policy' },
    ]) +
    card('MCP connectors', 'Bruce MCP Gateway', `<div class="card-body flush"><table class="tbl"><thead><tr><th>Connector</th><th>System</th><th>Tools</th><th>Access</th><th>Approval rule</th><th>Used by</th></tr></thead><tbody>${TOOLS.map(t => `<tr>
      <td class="strong">${t.conn}</td><td class="muted">${t.sys}</td><td>${t.tools.map(x => `<span class="mono tool-n">${x}</span>`).join(' ')}</td>
      <td><span class="chip ${t.access === 'Read only' ? '' : t.access === 'Write disabled' ? 'bad' : 'brand'}">${t.access}</span></td><td class="muted">${t.rule}</td><td class="muted">${t.agents}</td></tr>`).join('')}</tbody></table></div>`);
}
const readOnlyChip = () => `<span class="chip outline">${ico('shield', 'style="width:12px;height:12px"')} Read only · managed by Faclon</span>`;
document.head.insertAdjacentHTML('beforeend', '<style>' + REPORT_CSS + '</style>');
