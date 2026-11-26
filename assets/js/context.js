/* ==========================================================================
   Messages, Context (skills, docs, connectors) and Settings
   ========================================================================== */

/* ---------- Messages: insights, alerts, approvals, reports from agents ---------- */
const MESSAGES = [
  { id: 'm1', type: 'approval', sev: 'appr', from: 'Maintenance Planner Agent', time: '14:52', title: 'Approve WO 4100 8821 · replace HB-04 spindle bearing', state: 'open', read: false,
    body: `<p>J. Thomas is on leave today, so this approval is delegated to you.</p>`, table: [['Equipment', 'HB-04 · CNC Hobbing Machine #4'], ['Job', 'Replace front spindle bearing FAG 7014'], ['Window', 'Sat 29 Nov · Shift C · 4 h'], ['Cost', '₹62,400 (approval needed above ₹50,000)'], ['Spares', 'MM 400221 reserved · store B-14'], ['Risk if delayed', 'Remaining life 9 days · 31 h breakdown last time']],
    evid: ['FFT · 162 Hz BPFO', 'RCA-2025-017', 'SAP MM 400221'], acts: [['approve', 'Approve', 1], ['reject', 'Reject'], ['ask:Why is HB-04 vibration rising and what should we do?', 'Ask Copilot']] },
  { id: 'm2', type: 'approval', sev: 'appr', from: 'Cost Conversion Agent', time: '13:40', title: 'Approve purchase: SMED kit for Sprocket Line 2 · ₹4.2 L', state: 'open', read: false,
    body: `<p>Changeovers on Sprocket Line 2 take 52–74 min against a 35 min standard. The kit pre-stages the hob arbor and fixture.</p>`, table: [['Purchase requisition', 'PR 1100 2391'], ['Amount', '₹4,20,000'], ['Payback', '5 weeks (₹38 L/yr)'], ['Vendor', 'Approved vendor · 3 quotes attached']],
    evid: ['Changeover log · 8 events', 'SMED analysis'], acts: [['approve', 'Approve', 1], ['reject', 'Reject'], ['ask:Why did OEE on Sprocket Line 2 drop this shift?', 'Ask Copilot']] },
  { id: 'm3', type: 'approval', sev: 'appr', from: 'Energy & Utilities Agent', time: 'Yesterday', title: 'Review change request CR-HT-0412 · SQF-01 setpoint', state: 'open', read: true,
    body: `<p>A user asked to raise the SQF-01 setpoint to 900 °C. The agent did not change it, because setpoint writes are blocked by policy. The request is outside the validated recipe window (870–890 °C).</p>`, table: [['Requested by', 'V. Menon'], ['Change', 'Zone 1 setpoint 880 → 900 °C'], ['Control plan', 'IATF: PCN record needed'], ['Agent view', 'Not recommended']],
    evid: ['Recipe 428H pins', 'Guardrail log'], acts: [['reject', 'Reject request', 1], ['approve', 'Approve for trial'], ['ask:Increase the SQF-01 furnace setpoint to 900 °C', 'Ask Copilot']] },
  { id: 'm4', type: 'alert', sev: 'bad', from: 'Vision Quality Agent', time: '14:31', title: 'IH-02 quench flow below limit · tooth crack rejects 3.2× up', state: 'open', read: false,
    body: `<p>Quench flow fell from 18.2 to 14.6 L/min at 14:06, below the 16 L/min limit. Tooth crack rejects on VI-01 rose from 0.31 % to 0.99 %. Lot hold QH-2611-07 is in place for 1,140 pcs.</p>`, chart: 'quench',
    evid: ['IH-02 QUENCH_FLOW', 'VI-01 · 6,240 images', 'MES genealogy'], acts: [['ack', 'Acknowledge', 1], ['link:#d/D4', 'Open Heat treatment cell'], ['ask:Why are tooth crack rejects up on 428-42T sprockets?', 'Ask Copilot']] },
  { id: 'm5', type: 'alert', sev: 'warn', from: 'Energy & Utilities Agent', time: '14:18', title: 'Max demand forecast 3,940 kVA in 15 min', state: 'open', read: false,
    body: `<p>The forecast is above the 3,900 kVA alert level (contract 4,200 kVA). The agent suggests deferring shot blasting (SB-01, 110 kW) by 20 minutes. The shift electrical engineer has been asked to approve.</p>`,
    evid: ['Load profile', 'Tariff model'], acts: [['ack', 'Acknowledge', 1], ['link:#dash/energy', 'Open Energy dashboard']] },
  { id: 'm6', type: 'alert', sev: 'warn', from: 'Asset Health Agent', time: '12:02', title: 'AC-02 oil temperature 96 °C · trip at 100 °C', state: 'open', read: true,
    body: `<p>Oil temperature has risen for 30 days. The likely cause is oil cooler fouling. Cleaning is planned for 27 Nov when AC-03 can carry the load.</p>`,
    evid: ['AC-02 OIL_T · 30 d'], acts: [['ack', 'Acknowledge', 1], ['link:#dash/maintenance', 'Open Maintenance dashboard']] },
  { id: 'm7', type: 'insight', sev: 'warn', from: 'Cost Conversion Agent', time: '13:58', title: 'Sprocket Line 2 OEE is 58 % this shift (target 75 %)', state: 'open', read: false,
    body: `<p>62 % of the loss is HB-04 micro-stops. 23 % is a 428→520 changeover that took 74 min (standard 35 min). Estimated loss: ₹1.9 L this shift.</p>`,
    evid: ['MES · OEE', 'PLC alarms · 41'], acts: [['ask:Why did OEE on Sprocket Line 2 drop this shift?', 'Open in Copilot', 1], ['link:#d/D2', 'Open war room'], ['done', 'Mark done']] },
  { id: 'm8', type: 'insight', sev: 'warn', from: 'Energy & Utilities Agent', time: '13:20', title: 'Air leak load at 14 % during lunch break · ₹18.6 L/yr', state: 'open', read: true,
    body: `<p>AC-02 stayed loaded at 41 % while production was stopped. Estimated leak flow is 3.1 m³/min, mostly in the Press Shop header.</p>`,
    evid: ['Energy meters', 'Pressure decay test'], acts: [['ask:How much compressed air are we losing to leaks?', 'Open in Copilot', 1], ['wo', 'Create work order'], ['done', 'Mark done']] },
  { id: 'm9', type: 'insight', sev: 'good', from: 'Maintenance Planner Agent', time: '11:40', title: 'MBF-01 belt drive inspection moved into Sunday shutdown', state: 'open', read: true,
    body: `<p>Belt motor current is up 17 % in 30 days. The job fits the planned 6 h window, so there is no production loss. Saving: ₹2.2 L.</p>`,
    evid: ['MBF-01 BELT_MTR_I'], acts: [['link:#autopilot', 'View in Autopilot', 1], ['done', 'Mark done']] },
  { id: 'm10', type: 'report', sev: 'info', from: 'Shift Report Agent', time: '14:05', title: 'Shift A handover is ready', state: 'open', read: true,
    body: `<p>Output 96.2 % of plan. 3 losses above ₹50k. 2 open actions carried to Shift B. Sent to 14 people.</p>`, art: 'R2', acts: [['art:R2', 'Open in Artefactory', 1]] },
  { id: 'm11', type: 'report', sev: 'info', from: 'Shift Report Agent', time: '07:30', title: 'Daily plant performance · 25 Nov', state: 'open', read: true,
    body: `<p>Output 96 % of plan. OEE 71.4 %. Energy per kg 7 % better than baseline.</p>`, art: 'R1', acts: [['art:R1', 'Open in Artefactory', 1]] },
  { id: 'm12', type: 'report', sev: 'info', from: 'N. Shah', time: '15:02', title: 'N. Shah shared "RCA · Tooth crack (8D draft)" v2 with you', state: 'open', read: false,
    body: `<p>D5 owners are confirmed. Your sign-off is needed before it goes to OEM A.</p>`, art: 'R3', acts: [['art:R3', 'Open in Artefactory', 1]] },
];
const unreadCount = () => MESSAGES.filter(m => !m.read).length;
const MTYPE = { approval: 'Approval', alert: 'Alert', insight: 'Insight', report: 'Report' };

function pageMessages() {
  const f = state.msgF || 'all';
  const counts = t => MESSAGES.filter(m => m.type === t && m.state === 'open').length;
  const list = MESSAGES.filter(m => f === 'all' || m.type === f);
  if (!list.find(m => m.id === state.msg)) state.msg = (list[0] || {}).id;
  return headerBlock('Messages', 'Insights, alerts, approvals and reports sent to you by the agents. Approvals here act on SAP, MES and Teams under your role.',
    `<button class="btn" data-msgall>Mark all as read</button>`) +
    `<div class="art-bar"><div class="tabs art-tabs">${[['all', 'All', MESSAGES.length], ['approval', 'Approvals', counts('approval')], ['alert', 'Alerts', counts('alert')], ['insight', 'Insights', counts('insight')], ['report', 'Reports', counts('report')]].map(t => `<button class="${t[0] === f ? 'on' : ''}" data-msgf="${t[0]}">${t[1]} <span class="muted">${t[2]}</span></button>`).join('')}</div></div>
    <div class="art-wrap msg-wrap">
      <section class="card art-list">${list.map(m => `<button class="msg-item ${m.id === state.msg ? 'on' : ''} ${m.read ? '' : 'unread'}" data-msg="${m.id}">
        <span class="rail ${m.sev}"></span>
        <span style="min-width:0;flex:1"><span class="mi-top"><span class="cap ${m.type === 'approval' ? '' : m.type === 'report' ? 'auto' : ''}">${MTYPE[m.type]}</span><span class="muted">${m.from}</span><span class="right-a muted num">${m.time}</span></span>
          <span class="t">${m.title}</span></span>${m.state !== 'open' ? `<span class="chip ${m.state === 'Approved' || m.state === 'Done' || m.state === 'Acknowledged' ? 'good' : 'bad'}">${m.state}</span>` : ''}</button>`).join('')}</section>
      <section class="card art-view" id="msgView"></section>
    </div>`;
}
function drawMessages() {
  const m = MESSAGES.find(x => x.id === state.msg); if (!m) return;
  if (!m.read) { m.read = true; renderNav(); const it = document.querySelector(`[data-msg="${m.id}"]`); if (it) it.classList.remove('unread'); }
  const acts = m.state === 'open' ? m.acts.map(a => `<button class="btn sm ${a[2] ? 'primary' : ''}" data-mact="${a[0]}">${a[1]}</button>`).join('') : `<span class="chip ${/Approved|Done|Acknowledged/.test(m.state) ? 'good' : 'bad'}">${m.state} by ${CONFIG.user.name} · just now</span>`;
  $('#msgView').innerHTML = `<div class="art-head"><span class="agent-mark" style="width:34px;height:34px">${ico(m.type === 'approval' ? 'shield' : m.type === 'alert' ? 'bell' : m.type === 'report' ? 'doc' : 'spark', 'style="width:17px;height:17px"')}</span>
      <div style="min-width:0;flex:1"><div class="split"><span class="cap">${MTYPE[m.type]}</span><span class="muted" style="font-size:11px">${m.from} · ${m.time}</span></div><h3 style="margin-top:4px">${m.title}</h3></div></div>
    <div class="card-body answer">${m.body}
      ${m.table ? `<div class="box"><table class="tbl">${m.table.map(r => `<tr><td class="muted" style="width:38%">${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table></div>` : ''}
      ${m.chart ? `<div class="box"><div id="msgChart"></div></div>` : ''}
      ${m.evid ? `<div class="evid">${m.evid.map(e => `<span class="chip outline">${e}</span>`).join('')}</div>` : ''}
      <div class="acts" style="margin-top:12px">${acts}</div></div>`;
  if (m.chart === 'quench') Charts.line($('#msgChart'), { labels: ['13:00', '13:20', '13:40', '14:00', '14:06', '14:20', '14:40', '15:00'], series: [{ name: 'Quench flow', color: 'var(--c1)', data: [18.2, 18.1, 18.2, 18.0, 15.1, 14.7, 14.6, 14.6], area: true }], thresholds: [{ value: 16, label: 'LCL 16 L/min' }], height: 150, unit: ' L/min', yMin: 12, yMax: 20 });
}
function msgClick(t) {
  if (t.dataset.msg) { state.msg = t.dataset.msg; $$('[data-msg]').forEach(b => b.classList.toggle('on', b.dataset.msg === state.msg)); drawMessages(); return true; }
  if (t.dataset.msgf) { state.msgF = t.dataset.msgf; render(); return true; }
  if (t.hasAttribute('data-msgall')) { MESSAGES.forEach(m => (m.read = true)); renderNav(); render(); return true; }
  if (t.dataset.mact) {
    const m = MESSAGES.find(x => x.id === state.msg); const a = t.dataset.mact;
    if (a.startsWith('ask:')) { Copilot.ask(a.slice(4)); return true; }
    if (a.startsWith('link:')) { location.hash = a.slice(5); return true; }
    if (a.startsWith('art:')) { const x = ARTEFACTS.find(y => y.id === a.slice(4)); state.art = x.id; state.artScope = x.scope; state.artF = 'all'; location.hash = '#artefactory'; return true; }
    const map = { approve: 'Approved', reject: 'Rejected', ack: 'Acknowledged', done: 'Done', wo: 'Done' };
    m.state = map[a];
    const msg = { approve: `${m.title.replace(/^Approve( purchase:)?\s*/, '').replace(/^Review /, '')} approved. Sent to SAP and logged.`, reject: 'Rejected. The agent and requester are notified.', ack: 'Acknowledged. Escalation stopped.', done: 'Marked as done.', wo: 'Work order 4100 8826 created for the leak points.' }[a];
    LOGS.unshift({ t: new Date().toTimeString().slice(0, 8) + '.000', lvl: 'INFO', src: 'Access', actor: CONFIG.user.name, ev: a === 'approve' ? 'approval.granted' : a === 'reject' ? 'approval.rejected' : 'message.' + a, obj: m.title.slice(0, 40), msg, trace: 'tr-' + Math.floor(Math.random() * 1e6).toString(16) });
    toast(msg); render(); return true;
  }
  return false;
}

/* ---------- Context: skills ---------- */
const SKILLS = [
  { id: 'k1', name: 'FFT bearing diagnosis', pack: 'Faclon · Reliability', ver: '3.2', agents: 'Asset Health', runs: 214, ok: 96, upd: '12 Nov', src: 'ISO 10816, bearing defect frequencies, 1,000+ past cases',
    steps: ['Resolve the asset and its bearings from the ontology (make, model, geometry).', 'Read 30 days of velocity and the latest raw waveform.', 'Compute BPFO, BPFI, BSF and FTF at the running speed.', 'Match spectral peaks and harmonics to the defect frequencies.', 'Grade severity by ISO 10816 zone and trend slope.', 'Estimate remaining life with the RUL model and give confidence.'] },
  { id: 'k2', name: 'Remaining life estimate', pack: 'Faclon · Reliability', ver: '2.4', agents: 'Asset Health', runs: 388, ok: 93, upd: '5 Nov', src: 'Deepsense RUL model, plant failure history',
    steps: ['Fetch health features for the asset class.', 'Run the RUL model and the survival curve.', 'Return days left with a confidence band.'] },
  { id: 'k3', name: 'Shutdown window planning', pack: 'Faclon · Maintenance', ver: '1.8', agents: 'Maintenance Planner', runs: 46, ok: 100, upd: '18 Nov', src: 'SAP PM, MES plan, roster',
    steps: ['List assets with health below 75.', 'Read the 7-day production plan and planned stops.', 'Check spares and technician roster.', 'Fit jobs into windows with the least production loss.', 'Draft work orders for approval.'] },
  { id: 'k4', name: 'OEE loss tree', pack: 'Faclon · Productivity', ver: '2.1', agents: 'Cost Conversion', runs: 302, ok: 98, upd: '2 Nov', src: 'Six big losses, ISO 22400',
    steps: ['Get OEE, A, P and Q for the line and period.', 'Classify stop events into the six big losses.', 'Cost each loss in ₹ using contribution per piece.', 'Return the ranked loss tree with the top cause.'] },
  { id: 'k5', name: 'Conversion cost bridge', pack: 'Faclon · Productivity', ver: '1.3', agents: 'Cost Conversion', runs: 38, ok: 100, upd: '30 Oct', src: 'SAP CO cost elements',
    steps: ['Read cost centre actuals and budget.', 'Normalise by tonnage produced.', 'Build the budget-to-actual bridge by element.'] },
  { id: 'k6', name: 'Process–defect correlation', pack: 'Faclon · Quality', ver: '2.6', agents: 'Vision Quality', runs: 64, ok: 91, upd: '20 Nov', src: 'MES genealogy, historian',
    steps: ['Get the defect rate change point from the vision station.', 'Trace defective serials to the process route (genealogy).', 'Correlate with upstream tags in the window.', 'Rank candidate causes with evidence and confidence.'] },
  { id: 'k7', name: '8D draft', pack: 'Faclon · Quality', ver: '1.4', agents: 'Vision Quality', runs: 11, ok: 100, upd: '14 Nov', src: 'IATF 16949 8D format',
    steps: ['Fill D2 to D5 from RCA evidence.', 'Propose owners and dates from the RACI.', 'Save to Artefactory and share with the quality head.'] },
  { id: 'k8', name: 'Air leak estimation', pack: 'Faclon · Energy', ver: '1.9', agents: 'Energy & Utilities', runs: 52, ok: 95, upd: '9 Nov', src: 'Compressor load at zero demand',
    steps: ['Find no-production windows from MES.', 'Read compressor load and header pressure in those windows.', 'Estimate leak flow and cost per year.'] },
  { id: 'k9', name: 'ToD load shifting', pack: 'Faclon · Energy', ver: '1.2', agents: 'Energy & Utilities', runs: 29, ok: 97, upd: '1 Nov', src: 'State tariff order 2026',
    steps: ['Forecast load for the next 24 h.', 'List deferrable loads and their constraints.', 'Shift loads out of peak windows and cost the saving.'] },
  { id: 'k10', name: 'Hosur shift report', pack: 'Private · Hosur plant', ver: '4.0', agents: 'Shift Report', runs: 93, ok: 100, upd: '21 Nov', src: 'Plant format agreed with plant head',
    steps: ['Get output vs plan by area.', 'List losses above ₹50k with cause.', 'Add quality and safety summary.', 'Carry open actions to the next shift.', 'Send by email and Teams.'] },
  { id: 'k11', name: 'Sprocket changeover checklist', pack: 'Private · Hosur plant', ver: '1.1', agents: 'Cost Conversion', runs: 17, ok: 100, upd: '20 Nov', src: 'SMED study on Sprocket Line 1',
    steps: ['List 12 external steps for 428 → 520.', 'Send to the line leader 30 min before the stop.', 'Record the actual changeover time.'] },
];
function pageSkills() {
  if (!state.skill) state.skill = 'k1';
  const k = SKILLS.find(x => x.id === state.skill);
  return headerBlock('Skills', 'Versioned procedures the agents follow, the way your best engineer would. Faclon skill packs plus private skills for this plant.', readOnlyChip()) +
    `<div class="grid g-32">${card('Skill library', `${SKILLS.length} skills`, `<div class="card-body flush"><table class="tbl"><thead><tr><th>Skill</th><th>Pack</th><th>Version</th><th>Used by</th><th class="r">Runs, 30 d</th><th class="r">Success</th></tr></thead><tbody>${SKILLS.map(s => `<tr class="click ${s.id === state.skill ? 'sel' : ''}" data-skill="${s.id}"><td class="strong">${s.name}</td><td><span class="chip ${s.pack.startsWith('Private') ? 'brand' : ''}">${s.pack}</span></td><td class="mono">v${s.ver}</td><td class="muted">${s.agents}</td><td class="r num">${s.runs}</td><td class="r num">${s.ok} %</td></tr>`).join('')}</tbody></table></div>`)}
      ${card(k.name, `v${k.ver} · updated ${k.upd}`, `<div class="card-body"><div class="muted" style="font-size:12px;margin-bottom:8px">Source: ${k.src}</div><ol class="skill-steps">${k.steps.map(s => `<li>${s}</li>`).join('')}</ol>
        <div class="muted" style="font-size:11px;margin-top:10px">Bruce proposes improvements from past sessions. Changes are tested on past sessions and approved before release.</div></div>`)}</div>`;
}

/* ---------- Context: documents ---------- */
const KB = [
  { id: 'c1', name: 'Gleason hobbing machine · OEM manual', type: 'OEM manual', obj: 'HB-03, HB-04', pages: 412, idx: '3 Sep', cited: 46, pass: [['Spindle bearing preload must be checked after any bearing change. Use torque 180 Nm on the spindle nut.', 'p. 214'], ['Alarm 2041 indicates spindle overload. Check bearing condition and hob sharpness.', 'p. 318']] },
  { id: 'c2', name: 'SOP · HB-04 spindle bearing replacement', type: 'SOP', obj: 'HB-01 to HB-04', pages: 6, idx: 'Today', cited: 12, pass: [['Torque spindle nut to 180 Nm and record the value.', 'Step 4']] },
  { id: 'c3', name: 'RCA-2025-017 · HB-02 spindle failure', type: 'Past RCA', obj: 'HB-02', pages: 9, idx: '3 Sep', cited: 21, pass: [['Root cause: under-torqued spindle nut after bearing replacement led to outer-race damage within 6 weeks.', 'Section D4']] },
  { id: 'c4', name: 'EFD induction hardening · operating manual', type: 'OEM manual', obj: 'IH-01, IH-02', pages: 268, idx: '3 Sep', cited: 18, pass: [['Quench flow below 16 L/min may cause uneven hardness and cracking at tooth roots.', 'p. 97']] },
  { id: 'c5', name: 'Control plan · SPK-428-42T', type: 'Control plan', obj: 'Sprocket lines', pages: 14, idx: '10 Oct', cited: 15, pass: [['Surface hardness 50–55 HRC. Frequency: 5 pcs per hour per machine.', 'Row 18']] },
  { id: 'c6', name: 'P&ID · compressed air network', type: 'P&ID', obj: 'AC-01 to AC-03', pages: 3, idx: '5 Sep', cited: 9, pass: [['Press Shop header P3 · 2" line · isolation valve V-214.', 'Sheet 2']] },
  { id: 'c7', name: 'Ipsen sealed quench furnace · manual', type: 'OEM manual', obj: 'SQF-01', pages: 356, idx: '3 Sep', cited: 7, pass: [['Do not exceed 900 °C for carburising cycles without recipe validation.', 'p. 141']] },
  { id: 'c8', name: 'Furnace recipes · 428H pins and bushes', type: 'Specification', obj: 'SQF-01, TF-01', pages: 8, idx: '12 Sep', cited: 11, pass: [['Carburise 870–890 °C, CP 0.80 ± 0.03 %C, temper 210 °C.', 'Recipe R-428H-03']] },
  { id: 'c9', name: 'Atlas Copco GA132 · service manual', type: 'OEM manual', obj: 'AC-01, AC-02', pages: 188, idx: '3 Sep', cited: 6, pass: [['Clean the oil cooler when oil temperature exceeds ambient by more than 60 °C.', 'p. 66']] },
  { id: 'c10', name: 'State tariff order 2026 · HT industrial', type: 'Regulation', obj: 'Plant', pages: 42, idx: '2 Apr', cited: 8, pass: [['Peak hours 06:00–09:00 and 18:00–22:00 carry a 20 % surcharge.', 'Clause 7.3']] },
  { id: 'c11', name: 'Shift logbooks · Jan–Nov 2026', type: 'Logbook', obj: 'All areas', pages: 2140, idx: 'Daily', cited: 33, pass: [['Shift B 14 Oct: HB-04 noisy at high feed, reported to maintenance.', 'Entry 14-10-B-12']] },
];
function pageDocs() {
  if (!state.kb) state.kb = 'c1';
  const q = (state.kbQ || '').toLowerCase();
  const list = KB.filter(d => !q || (d.name + d.type + d.obj).toLowerCase().includes(q));
  const d = KB.find(x => x.id === state.kb);
  return headerBlock('Docs', 'Manuals, SOPs, P&IDs, control plans, past RCAs and logbooks, indexed and linked to assets in the ontology. Answers quote the exact passage.', readOnlyChip()) +
    kpiStrip([
      { label: 'Documents indexed', value: '1,284', unit: '', foot: 'search by meaning' },
      { label: 'Pages', value: '96,410', unit: '', foot: 'incl. scanned manuals' },
      { label: 'Linked to assets', value: '91', unit: '%', foot: 'via the ontology' },
      { label: 'Cited in answers', value: '1,906', unit: 'this month', foot: 'with page reference' },
      { label: 'Languages', value: '3', unit: '', foot: 'English, Tamil, Hindi' },
      { label: 'Last indexed', value: 'Today', unit: '', foot: 'SOP HB-04 v7' },
    ]) +
    `<div class="grid g-32">${card('Library', `${list.length} shown`, `<div class="card-body" style="padding-bottom:4px"><label class="search" style="width:100%">${ico('search', 'style="width:13px;height:13px"')}<input id="kbQ" placeholder="Search documents" value="${state.kbQ || ''}"></label></div>
        <div class="card-body flush"><table class="tbl"><thead><tr><th>Document</th><th>Type</th><th>Linked to</th><th class="r">Pages</th><th class="r">Cited</th></tr></thead><tbody id="kbBody">${list.map(x => `<tr class="click ${x.id === state.kb ? 'sel' : ''}" data-kb="${x.id}"><td class="strong">${x.name}</td><td><span class="chip">${x.type}</span></td><td class="muted">${x.obj}</td><td class="r num">${x.pages.toLocaleString('en-IN')}</td><td class="r num">${x.cited}</td></tr>`).join('')}</tbody></table></div>`)}
      ${card(d.name, `${d.type} · indexed ${d.idx}`, `<div class="card-body"><div class="muted" style="font-size:12px">Linked to <b style="color:var(--text)">${d.obj}</b> · ${d.pages} pages · cited ${d.cited} times</div>
        <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;margin:14px 0 6px">Most cited passages</div>
        ${d.pass.map(p => `<blockquote class="pass">“${p[0]}”<span>${p[1]}</span></blockquote>`).join('')}</div>`)}</div>`;
}

/* ---------- Context: connectors (data + MCP tools) ---------- */
function pageConnectors() {
  return headerBlock('Connectors', 'Data connections into the plant data fabric (I/O Connect), and MCP connectors that agents use as tools (Bruce MCP Gateway).', readOnlyChip()) +
    kpiStrip([
      { label: 'Data connections', value: SYSTEMS.length, unit: '', foot: '18,628 tags live' },
      { label: 'MCP connectors', value: TOOLS.length, unit: '', foot: TOOLS.reduce((a, t) => a + t.tools.length, 0) + ' tools' },
      { label: 'Data latency', value: '1.8', unit: 's', foot: 'p95, OT to UDF' },
      { label: 'Tool calls today', value: '3,418', unit: '', foot: 'all logged' },
      { label: 'Blocked calls', value: '3', unit: 'today', foot: 'role or policy' },
      { label: 'Control-system writes', value: '0', unit: '', foot: 'disabled by policy' },
    ]) +
    card('Data connections', 'I/O Connect · DMZ', `<div class="card-body flush"><div class="systems">${SYSTEMS.map(s => `<div class="sys"><div class="sys-ico">${s.code}</div><div style="min-width:0"><div class="nm">${s.name}</div><div class="ds">${s.desc}</div></div><div class="st"><span class="dot ${s.status === 'warn' ? 'warn' : ''}"></span><div>${s.tags ? s.tags.toLocaleString('en-IN') + ' tags' : s.note}</div></div></div>`).join('')}</div></div>`) +
    `<div class="mt">${card('MCP connectors', 'tools the agents can call', `<div class="card-body flush"><table class="tbl"><thead><tr><th>Connector</th><th>System</th><th>Tools</th><th>Access</th><th>Approval rule</th><th>Used by</th></tr></thead><tbody>${TOOLS.map(t => `<tr>
      <td class="strong">${t.conn}</td><td class="muted">${t.sys}</td><td>${t.tools.map(x => `<span class="mono tool-n">${x}</span>`).join(' ')}</td>
      <td><span class="chip ${t.access === 'Read only' ? '' : t.access === 'Write disabled' ? 'bad' : 'brand'}">${t.access}</span></td><td class="muted">${t.rule}</td><td class="muted">${t.agents}</td></tr>`).join('')}</tbody></table></div>`)}</div>`;
}

/* ---------- Settings ---------- */
const SETTINGS_TABS = [['settings/usage', 'Usage'], ['settings/agents', 'Agents'], ['settings/users', 'Users & roles'], ['settings/guardrails', 'Guardrails'], ['settings/notifications', 'Notifications'], ['settings/logs', 'Logs']];
const setTabs = () => `<div class="set-tabs">${SETTINGS_TABS.map(t => `<a href="#${t[0]}" class="${current === t[0] ? 'on' : ''}">${t[1]}</a>`).join('')}</div>`;
function pageUsage() {
  return setTabs() + headerBlock('Usage', 'How the agents and Copilot are used, and what they cost, this month.', periodSeg('30 days')) +
    kpiStrip([
      { label: 'Copilot sessions', value: '1,842', unit: '', delta: '24 %', dir: 'up', good: true, foot: 'vs last month' },
      { label: 'Active users', value: '86', unit: 'of 112', foot: 'with a session this month' },
      { label: 'Autopilot runs', value: '5,310', unit: '', foot: 'schedules and workflows' },
      { label: 'Tokens', value: '41.6', unit: 'M', foot: '62 % on local LLM' },
      { label: 'AI cost', value: '₹1.84', unit: 'L', foot: 'budget ₹2.50 L / month' },
      { label: 'Cost per session', value: '₹9.8', unit: '', delta: '12 %', dir: 'down', good: true, foot: 'vs last month' },
    ]) +
    `<div class="grid g-21">${card('Sessions per day', 'Copilot and Autopilot', `<div class="card-body"><div id="ch-use"></div><div class="legend"><span><i style="background:var(--c1)"></i>Copilot</span><span><i style="background:var(--c2)"></i>Autopilot</span></div></div>`)}
      ${card('Model mix', 'share of tokens', `<div class="card-body"><div id="ch-mix"></div></div>`)}</div>
    <div class="grid g-2 mt">${card('By agent', 'runs this month', `<div class="card-body"><div id="ch-agent"></div></div>`)}
      ${card('Top users', 'this month', `<div class="card-body flush"><table class="tbl"><thead><tr><th>User</th><th>Role</th><th class="r">Sessions</th><th class="r">Actions approved</th></tr></thead><tbody>${[['Anand Rao', 'Plant head', 214, 31], ['S. Iyer', 'Production head', 188, 12], ['J. Thomas', 'Maintenance head', 176, 58], ['N. Shah', 'Quality head', 142, 19], ['G. Nair', 'Energy manager', 131, 8], ['V. Menon', 'Heat treatment in-charge', 97, 6]].map(r => `<tr><td class="strong">${r[0]}</td><td class="muted">${r[1]}</td><td class="r num">${r[2]}</td><td class="r num">${r[3]}</td></tr>`).join('')}</tbody></table></div>`)}</div>
    <div class="mt">${card('Monthly AI budget', '₹1.84 L of ₹2.50 L used · 26 days in', `<div class="card-body"><div class="bar-track" style="height:10px"><div class="bar-fill brand" style="width:73.6%"></div></div><div class="muted" style="font-size:11px;margin-top:6px">Forecast for the month: ₹2.12 L. Alerts at 80 % and 100 %.</div></div>`)}</div>`;
}
function drawUsage() {
  Charts.bars($('#ch-use'), { labels: DAYS30.slice(-14).map(d => d.split(' ')[0]), height: 200, stacked: true, series: [{ name: 'Copilot', color: 'var(--c1)', data: series(14, 62, 18, 501, { dec: 0 }) }, { name: 'Autopilot', color: 'var(--c2)', data: series(14, 175, 20, 502, { dec: 0 }) }], dec: 0 });
  Charts.donut($('#ch-mix'), { size: 150, items: [{ label: 'Local LLM (on site)', value: 62, color: 'var(--c1)', display: '25.8 M' }, { label: 'Frontier LLM (cloud)', value: 31, color: 'var(--c3)', display: '12.9 M' }, { label: 'ML and vision models', value: 7, color: 'var(--c2)', display: '2.9 M' }], center: '41.6 M', centerSub: 'tokens' });
  Charts.hbars($('#ch-agent'), { items: [['Vision Quality', 2106], ['Asset Health', 1284], ['Energy & Utilities', 964], ['Cost Conversion', 846], ['Maintenance Planner', 212], ['Shift Report', 93]].map(x => ({ label: x[0], value: x[1], display: x[1].toLocaleString('en-IN') })), labelW: 140 });
}
const USERS = [
  ['Anand Rao', 'Plant head', 'Hosur · all areas', 'Approver (all)', 'Now', true], ['J. Thomas', 'Maintenance head', 'Hosur · all assets', 'Approver · WO > ₹50k', 'On leave', true],
  ['S. Iyer', 'Production head', 'Press, Machining, Cold forming', 'Editor', '10 min ago', true], ['N. Shah', 'Quality head', 'Quality & Inspection', 'Approver · lot hold, 8D', '3 min ago', true],
  ['G. Nair', 'Energy manager', 'Utilities', 'Editor', '1 h ago', true], ['V. Menon', 'Heat treatment in-charge', 'Heat Treatment', 'Viewer + Copilot', '22 min ago', true],
  ['R. Kumar', 'Press shop in-charge', 'Press Shop', 'Viewer + Copilot', 'Yesterday', false], ['Shift in-charges (6)', 'Shift in-charge', 'Area of shift', 'Viewer + Copilot', 'Today', true],
  ['Plant controller', 'Finance', 'Cost data only', 'Viewer', '25 Nov', true], ['Faclon support', 'Vendor', 'Configs, read only on data', 'Admin · time-limited', 'Expires 31 Dec', true],
];
function pageUsers() {
  return setTabs() + headerBlock('Users & roles', 'Who can see and do what. Copilot and agents act with the rights of the user they work for. Managed in Foundry.', `<span class="chip outline">Single sign-on · Azure AD</span>`) +
    card('Users', `${USERS.length} entries`, `<div class="card-body flush"><table class="tbl"><thead><tr><th>User</th><th>Role</th><th>Scope</th><th>Permission</th><th>Last active</th><th>MFA</th></tr></thead><tbody>${USERS.map(u => `<tr><td class="strong">${u[0]}</td><td>${u[1]}</td><td class="muted">${u[2]}</td><td><span class="chip ${u[3].startsWith('Approver') ? 'brand' : u[3].startsWith('Admin') ? 'warn' : ''}">${u[3]}</span></td><td class="muted">${u[4]}</td><td>${u[5] ? '<span class="chip good">On</span>' : '<span class="chip warn">Pending</span>'}</td></tr>`).join('')}</tbody></table></div>`);
}
const RULES = [
  ['Write to PLC, DCS or SCADA', 'All agents', 'Blocked', '—'], ['Work order above ₹50,000', 'Maintenance Planner', 'Needs approval', 'Maintenance head (delegate: plant head)'],
  ['Purchase requisition', 'All agents', 'Needs approval', 'Plant head'], ['Quality lot hold', 'Vision Quality', 'Needs approval', 'QA in-charge'],
  ['Release a lot from hold', 'All agents', 'Needs approval', 'Quality head'], ['Recipe or setpoint change request', 'All agents', 'Draft only', 'Heat treatment in-charge + PCN'],
  ['Send message outside plant lists', 'All agents', 'Blocked', '—'], ['Share artefact outside company', 'All users', 'Blocked', '—'],
  ['Cost data (SAP CO)', 'Copilot', 'Role-based', 'Finance and plant head only'], ['Ontology change proposed by an agent', 'All agents', 'Needs approval', 'Faclon SME + plant SME'],
  ['Cloud LLM for documents marked confidential', 'All agents', 'Local LLM only', '—'], ['Monthly AI spend above budget', 'Platform', 'Alert', 'Plant head'],
];
function pageGuardrails() {
  return setTabs() + headerBlock('Guardrails', 'Rules that limit what agents may see and do. Every check is logged.', readOnlyChip()) +
    card('Policies', `${RULES.length} rules · 1,884 checks today · 3 blocked`, `<div class="card-body flush"><table class="tbl"><thead><tr><th>Action</th><th>Applies to</th><th>Rule</th><th>Approver</th></tr></thead><tbody>${RULES.map(r => `<tr><td class="strong">${r[0]}</td><td class="muted">${r[1]}</td><td><span class="chip ${r[2] === 'Blocked' ? 'bad' : r[2] === 'Needs approval' ? 'brand' : r[2] === 'Alert' ? 'warn' : ''}">${r[2]}</span></td><td class="muted">${r[3]}</td></tr>`).join('')}</tbody></table></div>`);
}
const NOTIF = { types: ['Approvals', 'Critical alerts', 'Warnings', 'Insights', 'Reports', 'Shared with me'], ch: ['In app', 'Email', 'Teams', 'WhatsApp', 'SMS'],
  on: [[1, 1, 1, 1, 0], [1, 1, 1, 1, 1], [1, 0, 1, 0, 0], [1, 0, 0, 0, 0], [1, 1, 0, 0, 0], [1, 0, 1, 0, 0]] };
function pageNotifications() {
  return setTabs() + headerBlock('Notifications', `How messages reach ${CONFIG.user.name}. Critical alerts escalate if not acknowledged in 15 minutes.`, '') +
    card('Channels', 'per message type', `<div class="card-body flush"><table class="tbl"><thead><tr><th>Message type</th>${NOTIF.ch.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${NOTIF.types.map((t, i) => `<tr><td class="strong">${t}</td>${NOTIF.ch.map((c, j) => `<td><button class="toggle ${NOTIF.on[i][j] ? 'on' : ''}" data-notif="${i}-${j}"><i></i></button></td>`).join('')}</tr>`).join('')}</tbody></table></div>`) +
    `<div class="mt">${card('Quiet hours', '', `<div class="card-body split"><span>22:00 – 06:00 · only approvals and critical alerts</span><button class="toggle on right-a" data-notif="q"><i></i></button></div>`)}</div>`;
}
function ctxClick(t) {
  if (msgClick(t)) return true;
  if (t.dataset.skill) { state.skill = t.dataset.skill; render(); return true; }
  if (t.dataset.kb) { state.kb = t.dataset.kb; render(); return true; }
  if (t.dataset.notif) { t.classList.toggle('on'); toast('Notification setting saved'); return true; }
  return false;
}
function drawDocs() { const q = $('#kbQ'); if (q) q.oninput = () => { state.kbQ = q.value; const pos = q.selectionStart; render(); const n = $('#kbQ'); n.focus(); n.setSelectionRange(pos, pos); }; }
