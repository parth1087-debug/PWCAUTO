/* ==========================================================================
   Plant Copilot — routes questions to agents on the Bruce runtime.
   Responses are scripted for the demo; the trace shows the real tool flow.
   ========================================================================== */
const Copilot = (() => {
  let el, body, ctx = 'overview', busy = false, uid = 0;

  const SUGGEST = {
    overview: ['What needs my attention in the plant right now?', 'Why did OEE on Sprocket Line 2 drop this shift?', 'Write the shift report for Shift A', 'How many 428-42T sprockets did we make today?'],
    maintenance: ['Why is HB-04 vibration rising and what should we do?', 'Plan maintenance for this Sunday shutdown', 'Raise a work order for the HB-04 spindle bearing', 'What is the health of IH-02 and what should we do?'],
    cost: ['Why is conversion cost per kg above budget this month?', 'Why did OEE on Sprocket Line 2 drop this shift?', 'How many 428-42T sprockets did we make today?'],
    quality: ['Why are tooth crack rejects up on 428-42T sprockets?', 'Show me the defect trend by shift for VI-01', 'Raise a work order for the HB-04 spindle bearing'],
    energy: ['How much compressed air are we losing to leaks?', 'Compare kWh per piece for sprockets across lines this week', 'Increase the SQF-01 furnace setpoint to 900 °C'],
    ontology: ['What is upstream and downstream of HB-04?', 'What is the health of IH-02 and what should we do?', 'Which assets does compressor AC-02 supply?'],
    agents: ['What needs my attention in the plant right now?', 'Write the shift report for Shift A', 'Increase the SQF-01 furnace setpoint to 900 °C'],
  };

  const S = (tool, label, ms) => ({ tool, label, ms });
  const table = (head, rows) => `<table class="tbl"><thead><tr>${head.map(h => `<th${h.startsWith('>') ? ' class="r"' : ''}>${h.replace('>', '')}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${head[i].startsWith('>') ? ' class="r num"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const evid = list => `<div class="evid">${list.map(e => `<span class="chip outline">${e}</span>`).join('')}</div>`;
  const acts = list => `<div class="acts">${list.map(([k, l, p]) => `<button class="btn sm ${p ? 'primary' : ''}" data-cp-action="${k}">${l}</button>`).join('')}</div>`;

  /* ---------- scripted intents ---------- */
  const INTENTS = [
    { id: 'attention', match: /attention|right now|summary|what.*(happening|going on)|priorit/i, agent: 'Plant Copilot · multi-agent', cap: 'Data retrieval',
      steps: [S('ontology.query', 'Load plant context · Hosur', 380), S('agents.fanout', 'Ask 5 domain agents for open issues', 900), S('rank.by_impact', 'Rank issues by ₹ impact and urgency', 420)],
      answer: () => `<p>Four items need attention this shift, ranked by impact:</p>
        <ol><li><b>HB-04 spindle bearing</b> is failing. Remaining life is about 9 days. Sprocket Line 2 output is at risk. <span class="muted">Asset Health Agent</span></li>
        <li><b>Tooth crack rejects on 428-42T</b> are 3.2× up since 14:10. The cause is low quench flow on IH-02. 1,140 pcs are suspect. <span class="muted">Vision Quality Agent</span></li>
        <li><b>Sprocket Line 2 OEE is 58 %</b> against 75 % target. The loss is HB-04 micro-stops and a long changeover. <span class="muted">Cost Conversion Agent</span></li>
        <li><b>Air leaks</b> are 14 % of compressor load at break time, about ₹18.6 L/yr. <span class="muted">Energy & Utilities Agent</span></li></ol>
        ${acts([['hold', 'Hold suspect lot', 1], ['wo', 'Raise HB-04 work order'], ['notify', 'Send to shift in-charge']])}` },

    { id: 'hb04', match: /hb-?04.*(vib|rising|bearing)|spindle bearing.*(why|rising)|vibration rising/i, agent: 'Asset Health Agent', cap: 'Automated RCA',
      steps: [S('ontology.resolve', 'Resolve HB-04 → Sprocket Line 2 · Gleason hobber', 320), S('historian.read', 'Read SPDL_VIB, SPDL_T, SPDL_RPM · 30 days', 640), S('ml.fft_diagnose', 'FFT on raw waveform · bearing defect frequencies', 980), S('kb.search', 'Search past RCAs and OEM manual', 520), S('sap.mm.stock', 'Check spare bearing stock', 380)],
      answer: () => `<p><b>Diagnosis:</b> outer-race defect on the front spindle bearing (FAG 7014). Confidence 0.91.</p>
        <div class="box"><div id="cpc-${uid}"></div></div>
        <ul><li>Velocity went from 2.1 to 4.6 mm/s in 6 days. This is now ISO 10816 zone D.</li>
        <li>A BPFO peak at 162 Hz with harmonics matches the bearing at 1,450 rpm.</li>
        <li>Bearing temp is up 13 °C. Lube pressure is normal.</li>
        <li>The same failure on HB-02 in March 2025 caused 31 h of breakdown (RCA-2025-017).</li></ul>
        <p><b>Recommendation:</b> replace the bearing in a 4 h window on Saturday Shift C. Until then, cut the feed rate by 8 %. Spares are in stock (MM 400221, store B-14).</p>
        ${evid(['Historian · 30 d', 'FFT · 162 Hz BPFO', 'RCA-2025-017', 'SAP MM 400221'])}
        ${acts([['wo', 'Raise work order', 1], ['feed', 'Send feed-rate change to operator'], ['plan', 'Add to weekend plan']])}`,
      chart: id => Charts.line(document.getElementById(id), { labels: DAYS30, series: [{ name: 'Vibration', color: 'var(--c1)', data: ASSET_DETAIL['HB-04'].series[0].data, area: true }], height: 140, unit: ' mm/s', yMin: 0, yMax: 6, thresholds: [{ value: 4.5, label: 'Zone D 4.5' }] }) },

    { id: 'health', match: /health of|status of/i, agent: 'Asset Health Agent', cap: 'Data retrieval',
      steps: [S('ontology.resolve', 'Resolve asset in ISA-95 model', 300), S('historian.read', 'Read condition tags · 30 days', 600), S('ml.health_score', 'Score health and remaining life', 700)],
      answer: q => {
        const id = (q.match(/[A-Z]{2,3}-\d{2}/i) || ['HB-04'])[0].toUpperCase();
        const a = ASSETS.find(x => x.id === id) || { id, name: (ONTO_INDEX[id] || {}).name || id, health: (ONTO_INDEX[id] || {}).health || 85, rul: 120, anomaly: '—', state: 'Normal', nextPm: '20 Dec', kpi: '' };
        const d = ASSET_DETAIL[id];
        return `<p><b>${a.id} · ${a.name}</b> has health score <b>${a.health}</b> and about <b>${a.rul} days</b> of remaining life. State: ${a.state}.</p>
          ${d ? `<p><b>${d.rca.title}.</b></p><ul>${d.rca.points.slice(0, 3).map(p => `<li>${p}</li>`).join('')}</ul><p><b>Recommendation:</b> ${d.rca.reco}</p>` : '<p>All monitored parameters are inside their normal bands. Continue with the PM calendar.</p>'}
          ${a.health < 75 ? acts([['wo', 'Raise work order', 1], ['notify', 'Notify shift in-charge']]) : ''}`;
      } },

    { id: 'oee', match: /oee/i, agent: 'Cost Conversion Agent', cap: 'Automated RCA',
      steps: [S('mes.oee', 'Get OEE for Sprocket Line 2 · Shift B', 420), S('plc.events', 'Read stop events from HB-03, HB-04, DR-02', 760), S('mes.changeover', 'Compare changeover vs standard', 380), S('loss.tree', 'Build loss tree and cost it', 520)],
      answer: () => `<p>Sprocket Line 2 OEE is <b>58.0 %</b> this shift, against a target of 75 %. The line lost <b>2 h 46 min</b>, about <b>₹1.9 L</b>.</p>
        <div class="box"><div id="cpc-${uid}"></div></div>
        <ul><li><b>62 %</b> of the loss: 41 micro-stops on HB-04 (spindle overload alarm 2041). This is linked to the bearing fault.</li>
        <li><b>23 %</b>: the 428 → 520 changeover took 74 min. The standard is 35 min. The hob arbor was not pre-staged.</li>
        <li><b>15 %</b>: DR-02 starved, waiting for parts from HB-04.</li></ul>
        <p><b>Recommendation:</b> fix the HB-04 bearing, and use the SMED checklist for the next changeover at 19:30.</p>
        ${evid(['MES · OEE', 'PLC alarms · 41', 'Changeover log'])}
        ${acts([['wo', 'Raise HB-04 work order', 1], ['smed', 'Send SMED checklist to line leader']])}`,
      chart: id => Charts.hbars(document.getElementById(id), { items: [{ label: 'HB-04 micro-stops', value: 103, display: '103 min', color: 'var(--bad)' }, { label: 'Changeover overrun', value: 39, display: '39 min' }, { label: 'DR-02 starved', value: 24, display: '24 min', color: 'var(--c5)' }], labelW: 130 }) },

    { id: 'costkg', match: /conversion cost|cost per kg|above budget|cost.*budget/i, agent: 'Cost Conversion Agent', cap: 'Automated RCA',
      steps: [S('sap.co.actuals', 'Get November cost centre actuals', 520), S('mes.production', 'Get tonnage produced', 360), S('energy.meters', 'Get energy by area', 440), S('cost.bridge', 'Build budget-to-actual bridge', 600)],
      answer: () => `<p>Conversion cost is <b>₹38.4/kg</b> against a budget of <b>₹35.0/kg</b>. The gap is ₹3.4/kg, about <b>₹21 L</b> this month.</p>
        <div class="box"><div id="cpc-${uid}"></div></div>
        <ul><li><b>Power +₹1.4/kg:</b> the furnaces ran under-loaded (MBF-01 at 78 % tray fill), and there are air leaks.</li>
        <li><b>Tooling +₹0.9/kg:</b> hob cost per 1,000 pcs on HB-03/04 is 21 % above HB-01.</li>
        <li><b>Scrap +₹0.6/kg:</b> mostly tooth crack rejects from IH-02.</li></ul>
        <p>Three actions worth <b>₹79 L/yr</b> are on the Cost conversion page.</p>
        ${acts([['dash', 'Pin as dashboard'], ['notify', 'Share with plant controller']])}`,
      chart: id => Charts.waterfall(document.getElementById(id), { start: 35, startLabel: 'Budget', endLabel: 'Actual', steps: COST.bridge, upBad: true, yMin: 30, height: 190 }) },

    { id: 'crack', match: /crack|reject|defect.*(up|rise|increase)|428-42t/i, agent: 'Vision Quality Agent', cap: 'Automated RCA',
      steps: [S('vision.stats', 'Get defect rate by class · VI-01', 420), S('mes.genealogy', 'Trace cracked parts to process route', 640), S('historian.correlate', 'Correlate with 86 upstream tags', 1100), S('lims.read', 'Read hardness and water quality', 420)],
      answer: () => `<p>Tooth crack rate on VI-01 rose from <b>0.31 %</b> to <b>0.99 %</b> at 14:10.</p>
        <div class="box"><div id="cpc-${uid}"></div></div>
        <ul><li>94 % of cracked parts came through <b>IH-02</b> (MES genealogy).</li>
        <li>Out of 86 upstream tags, the best match is <b>IH-02 quench water flow</b>. It fell from 18.2 to 14.6 L/min at 14:06 (r = −0.88).</li>
        <li>Hardness readings show a run of 7 points falling. The last value is 49.8 HRC (spec 50–55).</li>
        <li>Probable cause: quench strainer choke from scale. Make-up water hardness is high since 21 Nov.</li></ul>
        <p><b>Actions:</b> hold the 1,140 pcs made on IH-02 since 14:10. Clean the strainer (45 min). Route production to IH-01 meanwhile.</p>
        ${evid(['VI-01 · 6,240 images', 'MES genealogy', 'IH-02 QUENCH_FLOW', 'LIMS hardness'])}
        ${acts([['hold', 'Hold suspect lot', 1], ['wo2', 'Raise strainer cleaning WO'], ['8d', 'Draft 8D']])}`,
      chart: id => Charts.line(document.getElementById(id), { labels: ['13:00', '13:20', '13:40', '14:00', '14:10', '14:20', '14:30', '14:40', '14:50'], series: [{ name: 'Crack rate %', color: 'var(--bad)', data: [0.3, 0.32, 0.29, 0.31, 0.52, 0.81, 0.94, 0.99, 0.97] }, { name: 'Quench flow ÷20', color: 'var(--c2)', data: [0.91, 0.91, 0.9, 0.89, 0.76, 0.74, 0.73, 0.73, 0.73], dash: '4 3' }], height: 140, dec: 2 }) },

    { id: 'trend', match: /defect trend|by shift/i, agent: 'Vision Quality Agent', cap: 'Dashboards on demand',
      steps: [S('vision.stats', 'Get defects by class and shift · 7 days', 520), S('dash.build', 'Build chart', 380)],
      answer: () => `<p>Defects on VI-01 by shift, last 7 days. Shift B is higher on 5 of 7 days. Most of it is burr on tooth tip.</p><div class="box"><div id="cpc-${uid}"></div><div class="legend"><span><i class="sq" style="background:var(--c1)"></i>Shift A</span><span><i class="sq" style="background:var(--c3)"></i>Shift B</span><span><i class="sq" style="background:var(--c5)"></i>Shift C</span></div></div>${acts([['dash', 'Pin as dashboard']])}`,
      chart: id => Charts.bars(document.getElementById(id), { labels: WEEKDAYS, height: 160, series: [{ name: 'Shift A', color: 'var(--c1)', data: [38, 42, 35, 40, 44, 31, 12] }, { name: 'Shift B', color: 'var(--c3)', data: [52, 49, 41, 58, 61, 44, 15] }, { name: 'Shift C', color: 'var(--c5)', data: [33, 36, 38, 31, 35, 29, 10] }], dec: 0 }) },

    { id: 'air', match: /air|leak|compressor/i, agent: 'Energy & Utilities Agent', cap: 'Problem detection',
      steps: [S('energy.meters', 'Read AC-01/02/03 power and load · 7 days', 480), S('mes.schedule', 'Find no-production windows', 360), S('ml.leak_estimate', 'Estimate leak flow from load at zero demand', 720)],
      answer: () => `<p>Leaks take about <b>3.1 m³/min</b>. This is <b>14 %</b> of compressed air. The cost is about <b>₹18.6 L/yr</b> (2.1 lakh kWh).</p>
        <div class="box"><div id="cpc-${uid}"></div></div>
        <ul><li>In the lunch break, with no production, AC-02 stayed loaded at 41 %.</li>
        <li>The pressure decay test on Sunday points to the <b>Press Shop header</b>. Pressure drop there is 0.6 bar against 0.2 bar elsewhere.</li>
        <li>AC-02 also has 9 % worse specific power than AC-01. Its oil cooler is fouled.</li></ul>
        <p><b>Recommendation:</b> fix the 9 tagged leak points in the Press Shop. Lower the header pressure from 7.1 to 6.6 bar. This saves a further 3.5 %.</p>
        ${acts([['wo3', 'Raise leak-fix work order', 1], ['plan2', 'Plan compressor sequence for tomorrow']])}`,
      chart: id => Charts.bars(document.getElementById(id), { labels: ['12:00', '12:30', '13:00', '13:30', '14:00'], height: 140, unit: ' %', series: [{ name: 'Compressor load', color: 'var(--c1)', data: [84, 41, 42, 83, 86], colorFn: v => (v < 50 ? 'var(--bad)' : 'var(--c1)') }], valueLabels: true, dec: 0 }) },

    { id: 'kwhpc', match: /kwh per|per piece|compare.*energy|energy.*compare|dashboard/i, agent: 'Energy & Utilities Agent', cap: 'Dashboards on demand',
      steps: [S('ontology.query', 'Find energy meters under Sprocket Lines 1 and 2', 360), S('energy.meters', 'Sum kWh by line · 7 days', 520), S('mes.production', 'Get good pieces by line', 420), S('dash.build', 'Build chart', 400)],
      answer: () => `<p>Energy per good sprocket this week. Line 2 uses <b>18 % more</b> energy per piece than Line 1. Most of it comes from HB-04 idle running between micro-stops.</p>
        <div class="box"><div id="cpc-${uid}"></div><div class="legend"><span><i class="sq" style="background:var(--c2)"></i>Sprocket Line 1</span><span><i class="sq" style="background:var(--c1)"></i>Sprocket Line 2</span></div></div>
        ${acts([['dash', 'Pin as dashboard', 1], ['notify', 'Share with energy cell']])}`,
      chart: id => Charts.bars(document.getElementById(id), { labels: WEEKDAYS.slice(0, 6), height: 170, unit: ' kWh/pc', dec: 2, series: [{ name: 'Line 1', color: 'var(--c2)', data: [0.41, 0.42, 0.4, 0.41, 0.43, 0.42] }, { name: 'Line 2', color: 'var(--c1)', data: [0.46, 0.48, 0.47, 0.5, 0.51, 0.53] }] }) },

    { id: 'report', match: /report/i, agent: 'Shift Report Agent', cap: 'Notes and reports',
      steps: [S('mes.production', 'Get Shift A output vs plan', 420), S('mes.losses', 'Get losses above ₹50k', 380), S('sap.pm.orders', 'Get work orders opened and closed', 360), S('agents.insights', 'Collect agent findings', 340), S('doc.compose', 'Write report', 900)],
      answer: () => `<div class="box report"><h5>Shift A report · 26 Nov · 06:00–14:00</h5>
        ${table(['Area', '>Plan', '>Actual', '>OEE %'], [['Press Shop', '18,400', '18,120', '78.1'], ['Machining', '9,600', '8,830', '66.4'], ['Heat Treatment', '12.4 t', '12.1 t', '74.0'], ['Chain Assembly', '14,200 m', '13,980 m', '71.2']])}
        <h5>Losses above ₹50k</h5><ul><li>Sprocket Line 2: HB-04 micro-stops, 58 min (₹68k).</li><li>Chain Line B: changeover overrun, 31 min (₹54k).</li><li>MBF-01: under-loaded trays, 6 % extra energy (₹51k).</li></ul>
        <h5>Quality</h5><p>FPY 97.9 %. No customer complaint. 2 lots on hold.</p>
        <h5>Open actions for Shift B</h5><ul><li>Check HB-04 feed rate (S. Iyer).</li><li>Confirm MBF-01 tray loading plan (V. Menon).</li></ul></div>
        <p class="muted">Sent to 14 people on email and Teams at 14:05.</p>${acts([['notify', 'Send again'], ['pdf', 'Download PDF']])}` },

    { id: 'plan', match: /plan.*(maint|shutdown|sunday)|shutdown|schedule.*maint/i, agent: 'Maintenance Planner Agent', cap: 'Automated planning',
      steps: [S('assets.health', 'Get assets with health < 75', 380), S('mes.plan', 'Read production plan · next 7 days', 420), S('sap.mm.stock', 'Check spares', 360), S('hr.roster', 'Check technician roster', 320), S('opt.schedule', 'Fit jobs into the 6 h window', 820)],
      answer: () => `<p>Plan for <b>Sunday 30 Nov, 06:00–12:00</b>. All jobs fit in the window and all spares are in stock.</p>
        ${table(['Time', 'Asset', 'Job', 'Team'], [['06:00', 'MBF-01', 'Inspect and lubricate return rollers R5–R9', 'Mech · 3'], ['06:00', 'AC-02', 'Clean oil cooler, change oil filter', 'Utility · 2'], ['08:30', 'PR-01', 'Backflush hydraulic oil cooler', 'Hydraulics · 2'], ['09:00', 'IH-02', 'Descale ring nozzle, replace strainer', 'Elec · 2']])}
        <p>HB-04 bearing replacement is planned for <b>Saturday Shift C</b>. It cannot wait until Sunday because remaining life is short.</p>
        ${acts([['release', 'Release work orders to SAP PM', 1], ['notify', 'Share with maintenance head']])}` },

    { id: 'wo', match: /work order|raise.*wo|create.*order/i, agent: 'Maintenance Planner Agent', cap: 'Automate tasks',
      steps: [S('sap.pm.check', 'Check for duplicate open orders', 360), S('sap.mm.stock', 'Reserve spare bearing MM 400221', 420), S('guardrail.check', 'Policy: work order > ₹50k needs approval', 260), S('sap.pm.create', 'Create notification and order', 620)],
      answer: () => `<p>Work order created in SAP PM and sent for approval.</p>
        <div class="box">${table(['Field', 'Value'], [['Order', '<span class="mono">4100 8821</span>'], ['Equipment', 'HB-04 · CNC Hobbing Machine #4'], ['Type', 'PdM · Replace front spindle bearing FAG 7014'], ['Planned', 'Sat 29 Nov · Shift C · 4 h'], ['Spares', 'MM 400221 × 1 reserved'], ['Est. cost', '₹62,400'], ['Approver', 'Maintenance head · J. Thomas']])}</div>
        <p class="muted">Guardrail: orders above ₹50k need human approval. The approver is notified on Teams.</p>` },

    { id: 'setpoint', match: /setpoint|increase.*(temp|furnace)|change.*(temp|furnace)/i, agent: 'Energy & Utilities Agent', cap: 'Guardrails',
      steps: [S('ontology.resolve', 'Resolve SQF-01 · Sealed Quench Furnace', 300), S('guardrail.check', 'Policy: setpoint write to heat treatment', 280)],
      answer: () => `<p><b>I cannot change this setpoint.</b> Writing to heat treatment setpoints is outside this agent's permissions. It is a process change controlled by the IATF control plan.</p>
        <ul><li>900 °C is outside the validated recipe window for 428H pins (870–890 °C).</li><li>Changes need approval from the heat treatment in-charge and a PCN record.</li></ul>
        <p>I can raise a change request with the current data attached.</p>${acts([['cr', 'Raise change request']])}` },

    { id: 'qty', match: /how many|produced|output|make today/i, agent: 'Cost Conversion Agent', cap: 'Data retrieval',
      steps: [S('mes.production', 'Query good output · SPK-428-42T · today', 420)],
      answer: () => `<p>Today, the plant made <b>6,412</b> good SPK-428-42T sprockets: 3,980 on Line 1 and 2,432 on Line 2. That is <b>93 %</b> of plan. Another 61 pcs were rejected at VI-01, and 1,140 pcs are on hold.</p>` },

    { id: 'graph', match: /upstream|downstream|supply|supplies|feeds|connected to/i, agent: 'Plant Copilot · Ontology', cap: 'Data retrieval',
      steps: [S('ontology.traverse', 'Walk the knowledge graph · 2 hops', 420)],
      answer: q => {
        const id = (q.match(/[A-Z]{2,3}-\d{2}/i) || ['HB-04'])[0].toUpperCase();
        const up = RELATIONS.filter(r => r[2] === id), dn = RELATIONS.filter(r => r[0] === id);
        return `<p><b>${id}</b> in the plant ontology:</p><ul>${up.length ? `<li><b>Inputs:</b> ${up.map(r => `${r[0]} (${r[1]})`).join(', ')}</li>` : ''}${dn.length ? `<li><b>Outputs:</b> ${dn.map(r => `${r[2]} (${r[1]})`).join(', ')}</li>` : ''}</ul>
          <p class="muted">A fault on ${id} affects ${dn.length} item(s) directly downstream.</p>`;
      } },
  ];

  const ORDER = ['setpoint', 'wo', 'attention', 'qty', 'graph', 'hb04', 'health', 'oee', 'costkg', 'crack', 'trend', 'air', 'kwhpc', 'report', 'plan'];
  INTENTS.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

  const FOLLOW = {
    wo: () => INTENTS.find(i => i.id === 'wo'),
    hold: () => ({ agent: 'Vision Quality Agent', cap: 'Automate tasks', steps: [S('mes.genealogy', 'Find lots from IH-02 since 14:10', 360), S('sap.qm.hold', 'Create quality hold', 420)], answer: () => `<p>Quality hold <span class="mono">QH-2611-07</span> created in SAP QM for <b>1,140 pcs</b> (lots L-26111-B3 to B5). The parts are blocked for dispatch. QA is notified for 100 % hardness check.</p>` }),
    wo2: () => ({ agent: 'Maintenance Planner Agent', cap: 'Automate tasks', steps: [S('sap.pm.create', 'Create corrective order', 480)], answer: () => `<p>Order <span class="mono">4100 8817</span> is created and assigned to the electrical team. Production moves to IH-01 for 45 min.</p>` }),
    wo3: () => ({ agent: 'Maintenance Planner Agent', cap: 'Automate tasks', steps: [S('sap.pm.create', 'Create order for 9 leak points', 480)], answer: () => `<p>Order <span class="mono">4100 8826</span> is created for the 9 tagged leaks in the Press Shop header. Planned for Sunday 30 Nov.</p>` }),
    '8d': () => ({ agent: 'Vision Quality Agent', cap: 'Notes and reports', steps: [S('doc.compose', 'Draft 8D from RCA evidence', 900)], answer: () => `<div class="box report"><h5>8D draft · Tooth crack on SPK-428-42T</h5><p><b>D2 Problem:</b> crack rate 0.99 % vs 0.31 % baseline from 14:10, VI-01.</p><p><b>D3 Containment:</b> hold QH-2611-07, 100 % hardness check, move to IH-01.</p><p><b>D4 Root cause:</b> quench strainer choke from hard make-up water. Flow 14.6 L/min.</p><p><b>D5 Corrective action:</b> clean strainer; add flow interlock at 16 L/min; check softener.</p></div><p class="muted">Shared with the quality head for review.</p>` }),
    feed: () => ({ agent: 'Asset Health Agent', cap: 'Automate tasks', steps: [S('teams.send', 'Send to HB-04 operator and line leader', 300)], answer: () => `<p>Sent to the HB-04 operator and line leader: reduce feed rate by 8 % until the bearing is changed. They must acknowledge it on the HMI.</p>` }),
    plan: () => INTENTS.find(i => i.id === 'plan'),
    plan2: () => ({ agent: 'Energy & Utilities Agent', cap: 'Automated planning', steps: [S('mes.plan', 'Read tomorrow production plan', 360), S('opt.sequence', 'Optimise compressor sequence', 700)], answer: () => `<p>Plan for tomorrow: AC-01 runs base load. AC-03 (VSD) trims. AC-02 is off for cooler cleaning from 10:00 to 13:00. Header pressure is 6.6 bar. Expected saving: <b>1,180 kWh</b> (₹10.5k).</p>` }),
    notify: () => ({ agent: 'Plant Copilot', cap: 'Automate tasks', steps: [S('teams.send', 'Send summary on Teams', 300)], answer: () => `<p>Sent on Teams with the evidence attached.</p>` }),
    smed: () => ({ agent: 'Cost Conversion Agent', cap: 'Automate tasks', steps: [S('kb.fetch', 'Get SMED checklist · 428→520', 300), S('teams.send', 'Send to line leader', 260)], answer: () => `<p>The SMED checklist for the 428 → 520 changeover is sent to the Sprocket Line 2 leader. It covers 12 external steps to finish before the 19:30 stop.</p>` }),
    dash: () => ({ agent: 'Plant Copilot', cap: 'Dashboards on demand', steps: [S('dash.save', 'Save chart to My dashboards', 300)], answer: () => `<p>Saved to <b>My dashboards</b>. It refreshes every 15 min.</p>` }),
    release: () => ({ agent: 'Maintenance Planner Agent', cap: 'Automate tasks', steps: [S('guardrail.check', 'Policy: release needs planner role', 220), S('sap.pm.release', 'Release 4 orders', 520)], answer: () => `<p>4 orders released in SAP PM: <span class="mono">4100 8809, 8790, 8827, 8828</span>. Technicians are assigned from the Sunday roster.</p>` }),
    cr: () => ({ agent: 'Plant Copilot', cap: 'Automate tasks', steps: [S('doc.compose', 'Draft change request', 500)], answer: () => `<p>Change request <span class="mono">CR-HT-0412</span> is drafted and sent to the heat treatment in-charge. No setpoint was changed.</p>` }),
    pdf: () => ({ agent: 'Shift Report Agent', cap: 'Notes and reports', steps: [S('doc.export', 'Export PDF', 300)], answer: () => `<p>PDF is ready: <span class="mono">Shift-A-26Nov.pdf</span></p>` }),
  };

  const FALLBACK = { agent: 'Plant Copilot', cap: 'Data retrieval', steps: [S('ontology.search', 'Search plant context', 400), S('agents.route', 'Find the right agent', 300)],
    answer: () => `<p>I can answer that with data from the plant. Here are examples of what the agents can do:</p>
      <ul><li><b>Maintenance:</b> "Why is HB-04 vibration rising?", "Plan maintenance for this Sunday shutdown"</li>
      <li><b>Cost:</b> "Why is conversion cost per kg above budget this month?"</li>
      <li><b>Quality:</b> "Why are tooth crack rejects up on 428-42T sprockets?"</li>
      <li><b>Energy:</b> "How much compressed air are we losing to leaks?"</li>
      <li><b>Reports:</b> "Write the shift report for Shift A"</li></ul>` };

  /* ---------- UI ---------- */
  function init() {
    document.body.insertAdjacentHTML('beforeend', `<div class="scrim" id="cpScrim"></div>
    <aside class="copilot" id="copilot" aria-label="Copilot">
      <div class="cp-head"><span class="agent-mark" style="width:28px;height:28px">${ico('spark', 'style="width:15px;height:15px"')}</span>
        <div><h3>Plant Copilot</h3><div class="sub">${AGENTS.length} agents on Bruce · grounded in plant ontology</div></div>
        <div class="right"><button class="icon-btn" id="cpReset" title="New chat">${ico('refresh')}</button><button class="icon-btn" id="cpClose" title="Close">${ico('close')}</button></div></div>
      <div class="cp-route">Route to <select id="cpAgent"><option>Auto (best agent)</option>${AGENTS.map(a => `<option>${a.name}</option>`).join('')}</select>
        <span class="right-a" style="display:flex;align-items:center;gap:5px">${ico('shield', 'style="width:12px;height:12px"')} Role: ${CONFIG.user.role}</span></div>
      <div class="cp-body" id="cpBody"></div>
      <div class="cp-sugg" id="cpSugg"></div>
      <div class="cp-input"><textarea id="cpText" placeholder="Ask about any asset, line, cost or report"></textarea><button class="copilot-btn" id="cpSend" title="Send">${ico('send')}</button></div>
      <div class="cp-foot">Answers use live plant data. Actions that change plant systems need approval.</div>
    </aside>`);
    el = $('#copilot'); body = $('#cpBody');
    reset();
    $('#cpClose').onclick = close;
    $('#cpScrim').onclick = close;
    $('#cpReset').onclick = reset;
    $('#cpSend').onclick = send;
    $('#cpText').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    el.addEventListener('click', e => {
      const s = e.target.closest('[data-sugg]'); if (s) { ask(s.dataset.sugg); return; }
      const a = e.target.closest('[data-cp-action]');
      if (a && !busy) { a.disabled = true; const f = FOLLOW[a.dataset.cpAction]; if (f) run(a.textContent, f(), a.textContent); }
    });
  }
  function reset() {
    body.innerHTML = `<div class="cp-empty">${ico('spark', 'style="width:28px;height:28px;color:var(--primary)"')}<h4>Good afternoon, ${CONFIG.user.name.split(' ')[0]}</h4>Ask about any asset, line, cost, quality or energy question. The right agent answers with evidence from plant data.</div>`;
    renderSugg();
  }
  function renderSugg() { $('#cpSugg').innerHTML = (SUGGEST[ctx] || SUGGEST.overview).map(q => `<button data-sugg="${q}">${q}</button>`).join(''); }
  function setContext(c) { ctx = c; if (el) renderSugg(); }
  function open() { el.classList.add('open'); $('#cpScrim').classList.add('on'); setTimeout(() => $('#cpText').focus(), 250); }
  function close() { el.classList.remove('open'); $('#cpScrim').classList.remove('on'); }
  function toggle() { el.classList.contains('open') ? close() : open(); }
  function send() { const v = $('#cpText').value.trim(); if (!v) return; $('#cpText').value = ''; ask(v); }

  function ask(q) {
    if (busy) return;
    const intent = INTENTS.find(i => i.match.test(q)) || FALLBACK;
    run(q, intent, q);
  }

  function run(userText, intent, q) {
    busy = true;
    const empty = body.querySelector('.cp-empty'); if (empty) empty.remove();
    body.insertAdjacentHTML('beforeend', `<div class="msg user">${userText.replace(/</g, '&lt;')}</div>`);
    const id = ++uid;
    const forced = $('#cpAgent').value;
    const agent = forced.startsWith('Auto') ? intent.agent : forced;
    const total = intent.steps.reduce((a, s) => a + s.ms, 0);
    body.insertAdjacentHTML('beforeend', `<div class="msg bot" id="m${id}">
      <div class="route"><span class="agent-mark">${ico('bot')}</span>Routed to <b>${agent}</b> · <span class="cap ${['Notes and reports', 'Automated planning', 'Automate tasks'].includes(intent.cap) ? 'auto' : ''}">${intent.cap}</span></div>
      <details class="trace" open><summary>${ico('layers', 'style="width:12px;height:12px"')}<span class="tr-sum">Working · ${intent.steps.length} steps</span></summary>
      <div class="steps">${intent.steps.map((s, i) => `<div class="step" data-i="${i}"><span class="ic"></span><span><span class="tool">${s.tool}</span> · ${s.label}</span><span class="ms"></span></div>`).join('')}</div></details>
      <div class="answer"><span class="typing"><i></i><i></i><i></i></span></div></div>`);
    scroll();
    const m = $('#m' + id);
    const steps = $$('.step', m);
    let i = 0;
    const next = () => {
      if (i > 0) { steps[i - 1].classList.remove('run'); steps[i - 1].classList.add('done'); steps[i - 1].querySelector('.ms').textContent = intent.steps[i - 1].ms + ' ms'; }
      if (i >= steps.length) {
        $('.tr-sum', m).textContent = `${intent.steps.length} steps · ${(total / 1000).toFixed(1)} s · via MCP gateway`;
        setTimeout(() => { $('details', m).open = false; }, 400);
        uid = id;
        $('.answer', m).innerHTML = intent.answer(q || '');
        if (intent.chart) intent.chart('cpc-' + id);
        busy = false; scroll(); return;
      }
      steps[i].classList.add('run');
      setTimeout(next, intent.steps[i++].ms * 0.9);
      scroll();
    };
    setTimeout(next, 250);
  }
  function scroll() { body.scrollTop = body.scrollHeight; }

  return { init, open, close, toggle, ask, setContext };
})();
