/* ==========================================================================
   App shell, router and pages
   ========================================================================== */
const I = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  rupee: '<path d="M6 4h12M6 9h12M6 4h3a5 5 0 0 1 0 10H6l9 7"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  graph: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M6 8l5 8M18 8l-5 8"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
  pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  doc: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  plant: '<path d="M2 21V10l6 4V10l6 4V4h8v17z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  auto: '<path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3"/><circle cx="12" cy="12" r="4"/><path d="m11 10 3 2-3 2z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  dash: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
};
const ico = (k, s = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${s}>${I[k]}</svg>`;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const inr = v => '₹' + v;

const NAV = [
  { k: 'kpis', t: 'Plant KPIs', icon: 'target' },
  { group: 'Configs', note: 'read only', items: [{ k: 'ontology', t: 'Ontology', icon: 'graph' }, { k: 'agents', t: 'Agents', icon: 'bot' }, { k: 'tools', t: 'Tools', icon: 'tool' }] },
  { k: 'copilot', t: 'Copilot', icon: 'chat' },
  { k: 'autopilot', t: 'Autopilot', icon: 'auto', badge: 1 },
  { group: 'Dashboards', note: 'live', items: [{ k: 'dash/overview', t: 'Plant overview', icon: 'home' }, { k: 'dash/maintenance', t: 'Asset maintenance', icon: 'wrench', badge: 2 }, { k: 'dash/cost', t: 'Cost conversion', icon: 'rupee' }, { k: 'dash/quality', t: 'Quality · AI vision', icon: 'eye', badge: 1 }, { k: 'dash/energy', t: 'Energy & utilities', icon: 'bolt' }] },
  { k: 'reports', t: 'Reports', icon: 'folder' },
];
let current = 'kpis';
const state = { asset: 'HB-04', ontoSel: 'HB-04', ontoOpen: new Set(['ENT', 'HSR', 'MCH', 'MCH-SL2']), station: 'VI-01', costView: 'kg' };

/* ---------- Shell ---------- */
function shell() {
  const link = i => `<a href="#${i.k}" data-page="${i.k}">${ico(i.icon)}<span>${i.t}</span>${i.badge ? `<span class="badge">${i.badge}</span>` : ''}</a>`;
  const nav = NAV.map(n => n.group
    ? `<div class="nav-group"><div class="nav-label">${n.group}<span class="nav-note">${n.note}</span></div><div class="nav-sub">${n.items.map(link).join('')}</div></div>`
    : link(n)).join('');
  $('#app').innerHTML = `
  <aside class="sidebar">
    <div class="brand">
      <div class="wordmark"><i></i><i></i><i></i><i></i>pwc</div>
      <div class="brand-sub"><b>Connected Plant</b>Intelligence</div>
    </div>
    <div class="user-card">
      <div class="avatar">${CONFIG.user.initials}</div>
      <div style="min-width:0;flex:1"><div class="u-name">${CONFIG.user.name}</div><div class="u-role">${CONFIG.user.role} · ${CONFIG.plant}</div></div>
      <span class="u-dot" title="Signed in with SSO"></span>
    </div>
    <nav class="nav">${nav}</nav>
    <div class="sidebar-foot">
      <div style="display:flex;align-items:center;gap:6px"><span class="dot pulse"></span> 18,628 tags live · 42 M points/day</div>
      <div class="powered">AI agents powered by <b>Faclon Labs</b></div>
    </div>
  </aside>
  <div class="nav-scrim" id="navScrim"></div>
  <div class="main">
    <header class="topbar">
      <button class="icon-btn menu-btn" id="menuBtn" title="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
      <div class="crumbs"><span>${CONFIG.customer}</span><span>/</span>
        <span class="select">${ico('plant')}<b>${CONFIG.plant}</b>${ico('chev')}</span></div>
      <span class="select">${CONFIG.shift} · 14:00–22:00 ${ico('chev')}</span>
      <div class="spacer"></div>
      <label class="search">${ico('search', 'style="width:14px;height:14px"')}<input id="globalSearch" placeholder="Search assets, tags, work orders"><kbd>/</kbd></label>
      <span class="live-pill"><span class="dot pulse"></span><span id="clock" class="num">14:58:12</span></span>
      <button class="icon-btn" id="themeBtn" title="Switch theme">${ico('moon')}</button>
      <button class="icon-btn" title="Alerts">${ico('bell')}<span class="count">4</span></button>
      <button class="copilot-btn" id="copilotBtn">${ico('spark')} Ask Copilot</button>
    </header>
    <main class="content" id="content"></main>
  </div>`;
}

/* ---------- helpers ---------- */
function kpiStrip(items) {
  return `<div class="kpis">${items.map(k => `
    <div class="kpi"><div class="label">${k.label}</div>
      <div class="value"${k.live ? ` data-live="${k.live}"` : ''}>${k.value}<small>${k.unit || ''}</small></div>
      <div class="foot">${k.delta ? `<span class="delta ${k.dir} ${k.good ? 'good' : 'bad'}">${k.dir === 'up' ? '▲' : '▼'} ${k.delta}</span>` : ''}<span>${k.foot || ''}</span></div>
      ${k.spark ? `<div class="spark">${Charts.spark(k.spark, k.good === false ? 'var(--bad)' : 'var(--c1)')}</div>` : ''}
    </div>`).join('')}</div>`;
}
const card = (title, sub, body, right = '', cls = '') => `<section class="card ${cls}"><div class="card-head"><h3>${title}</h3>${sub ? `<span class="sub">${sub}</span>` : ''}<div class="right">${right}</div></div>${body}</section>`;
const healthCls = h => (h >= 75 ? '' : h >= 50 ? 'warn' : 'bad');
const stateDot = s => ({ run: '', alarm: 'bad', warn: 'warn', chg: 'info', idle: 'idle' }[s] ?? '');
const capTag = (c) => `<span class="cap ${['Notes and reports', 'Automated planning', 'Automate tasks'].includes(c) ? 'auto' : ''}">${c}</span>`;
const askBtn = (q, label = 'Ask Copilot') => `<button class="btn sm" data-ask="${q.replace(/"/g, '&quot;')}">${ico('spark')} ${label}</button>`;

function insightsFeed(list) {
  return `<div class="feed">${list.map(i => `
    <div class="insight"><div class="rail ${i.sev}"></div><div>
      <div class="meta">${capTag(i.cap)}<span>·</span><span>${i.agent}</span><span class="right-a num">${i.time}</span></div>
      <h4>${i.title}</h4><p><span class="muted">${i.area} · </span>${i.body}</p>
      <div class="acts">${i.impact ? `<span class="impact">${i.impact}</span>` : ''}<span class="right-a"></span>${askBtn(i.prompt, 'Open in Copilot')}</div>
    </div></div>`).join('')}</div>`;
}

function headerBlock(title, desc, actions = '') {
  return `<div class="page-head"><div><h1>${title}</h1><p>${desc}</p></div><div class="actions">${actions}</div></div>`;
}
const periodSeg = (on = 'Today') => `<div class="seg">${['Shift', 'Today', '7 days', '30 days'].map(p => `<button class="${p === on ? 'on' : ''}">${p}</button>`).join('')}</div>`;

/* ==========================================================================
   Pages
   ========================================================================== */
function pageOverview() {
  const areas = ONTOLOGY.children[0].children;
  const map = areas.map(a => {
    const units = a.children.flatMap(w => w.children);
    return `<div class="area"><div class="area-head">${a.name}<span class="oee">${AREA_OEE[a.id] != null ? 'OEE ' + AREA_OEE[a.id] + ' %' : units.length + ' assets'}</span></div>
      <div class="units">${units.map(u => `<span class="unit" data-goto-asset="${u.id}" title="${u.name}"><span class="dot ${stateDot(UNIT_STATE[u.id])}"></span>${u.id}</span>`).join('')}</div></div>`;
  }).join('');
  const systems = SYSTEMS.map(s => `<div class="sys"><div class="sys-ico">${s.code}</div><div style="min-width:0"><div class="nm">${s.name}</div><div class="ds">${s.desc}</div></div>
    <div class="st"><span class="dot ${s.status === 'warn' ? 'warn' : ''}"></span><div>${s.tags ? s.tags.toLocaleString('en-IN') + ' tags' : s.note}</div></div></div>`).join('');

  return headerBlock('Plant overview', `${CONFIG.plant} · live view of all shops, utilities and connected systems`, periodSeg('Today')) +
    kpiStrip([
      { label: 'Plant OEE', value: '71.8', unit: '%', delta: '2.4 pp', dir: 'down', good: false, foot: 'target 78 %', spark: series(20, 72, 3, 5), live: 'oee' },
      { label: 'Conversion cost', value: '₹38.4', unit: '/kg', delta: '9.7 %', dir: 'up', good: false, foot: 'budget ₹35.0', spark: series(20, 37, 1, 6) },
      { label: 'First pass yield', value: '97.6', unit: '%', delta: '0.4 pp', dir: 'down', good: false, foot: 'target 98.5 %', spark: QUALITY.fpy.slice(-20) },
      { label: 'Specific energy', value: '1.92', unit: 'kWh/kg', delta: '3.1 %', dir: 'up', good: false, foot: 'target 1.80', spark: ENERGY.sec.slice(-20) },
      { label: 'Production today', value: '48,260', unit: 'pcs', delta: '96 %', dir: 'up', good: true, foot: 'of plan', spark: series(20, 100, 6, 9), live: 'prod' },
      { label: 'Value found by agents', value: '₹2.86', unit: 'Cr/yr', delta: '14 open', dir: 'up', good: true, foot: 'actions', spark: series(20, 2, 0.1, 10, { trend: 0.04 }) },
    ]) +
    `<div class="grid g-21">
      ${card('Live plant status', '37 assets · 8 areas', `<div class="card-body"><div class="plant-map">${map}</div>
        <div class="legend mt"><span><span class="dot"></span>Running</span><span><span class="dot info"></span>Changeover</span><span><span class="dot warn"></span>Watch</span><span><span class="dot bad"></span>Alarm</span><span><span class="dot idle"></span>Idle</span><span class="right-a">Select an asset to open it in the ontology</span></div></div>`,
        `<span class="chip good"><span class="dot pulse"></span>Live</span>`)}
      ${card('Agent insights', 'last 4 hours', insightsFeed(INSIGHTS.slice(0, 3)), `<a href="#agents" class="btn ghost sm">All agents</a>`)}
    </div>
    <div class="grid g-32 mt">
      ${card('Production vs plan, today', 'pieces per hour', `<div class="card-body"><div id="ch-prod"></div><div class="legend"><span><i style="background:var(--c1)"></i>Actual</span><span><i style="background:var(--c5)"></i>Plan</span></div></div>`)}
      ${card('Connected systems', '10 sources · 18,628 tags', `<div class="card-body flush"><div class="systems">${systems}</div></div>`, `<span class="chip">Sync 2 s</span>`)}
    </div>`;
}
function drawOverview() {
  const hrs = HOURS24.slice(6, 15);
  Charts.bars($('#ch-prod'), { labels: hrs.map(h => h.slice(0, 2)), height: 210, unit: ' pcs', dec: 0,
    series: [{ name: 'Actual', color: 'var(--c1)', data: [2010, 2140, 2180, 1920, 2210, 2050, 1720, 1890, 2060], colorFn: v => (v < 1900 ? 'var(--bad)' : 'var(--c1)') },
             { name: 'Plan', color: 'var(--c5)', data: [2100, 2100, 2100, 2100, 2100, 2100, 2100, 2100, 2100] }] });
}

/* ---------- Asset maintenance ---------- */
function pageMaintenance() {
  const rows = ASSETS.map(a => `<tr class="click ${a.id === state.asset ? 'sel' : ''}" data-asset="${a.id}">
    <td><div class="strong">${a.id} <span class="chip outline" style="margin-left:4px">${a.crit}</span></div><div class="muted" style="font-size:11px">${a.name}</div></td>
    <td style="width:120px"><div class="bar-cell"><div class="bar-track"><div class="bar-fill ${healthCls(a.health)}" style="width:${a.health}%"></div></div><span class="num">${a.health}</span></div></td>
    <td>${a.anomaly === '—' ? '<span class="muted">—</span>' : a.anomaly}</td>
    <td class="r num ${a.rul < 15 ? 'strong' : ''}" style="${a.rul < 15 ? 'color:var(--bad)' : ''}">${a.rul} d</td>
    <td><span class="chip ${a.state === 'Alarm' ? 'bad' : a.state === 'Watch' ? 'warn' : 'good'}">${a.state}</span></td></tr>`).join('');
  const wo = WORK_ORDERS.map(w => `<tr><td class="mono">${w.no}</td><td class="strong">${w.asset}</td><td><span class="chip outline">${w.type}</span></td><td>${w.desc}</td>
    <td class="muted">${w.by}</td><td class="num">${w.due}</td><td><span class="chip ${w.status === 'Completed' ? 'good' : w.status === 'Awaiting approval' ? 'brand' : w.status === 'In progress' ? 'info' : ''}">${w.status}</span></td></tr>`).join('');

  return headerBlock('Asset maintenance', 'Condition monitoring, failure prediction and maintenance planning on 214 assets', periodSeg('30 days') + `<button class="btn">${ico('download')} Export</button>`) +
    kpiStrip([
      { label: 'Asset availability', value: '96.2', unit: '%', delta: '0.8 pp', dir: 'up', good: true, foot: 'vs last month' },
      { label: 'MTBF (critical assets)', value: '142', unit: 'h', delta: '11 %', dir: 'up', good: true, foot: 'vs last month' },
      { label: 'MTTR', value: '1.8', unit: 'h', delta: '0.3 h', dir: 'down', good: true, foot: 'vs last month' },
      { label: 'Predicted failures, 14 days', value: '2', unit: 'assets', foot: 'HB-04, IH-02' },
      { label: 'PM compliance', value: '91', unit: '%', delta: '3 pp', dir: 'up', good: true, foot: 'target 95 %' },
      { label: 'Breakdown hours, MTD', value: '18.5', unit: 'h', delta: '42 %', dir: 'down', good: true, foot: 'vs last month' },
    ]) +
    `<div class="grid g-2">
      ${card('Asset health', 'sorted by risk', `<div class="card-body flush"><table class="tbl"><thead><tr><th>Asset</th><th>Health</th><th>Anomaly</th><th class="r">Life left</th><th>State</th></tr></thead><tbody>${rows}</tbody></table></div>`, `<button class="btn sm">${ico('filter')} Criticality A</button>`)}
      <section class="card" id="assetDetail"></section>
    </div>
    <div class="mt">${card('Work orders', 'SAP PM · raised by agents and schedules', `<div class="card-body flush"><table class="tbl"><thead><tr><th>Order</th><th>Asset</th><th>Type</th><th>Description</th><th>Raised by</th><th>Due</th><th>Status</th></tr></thead><tbody>${wo}</tbody></table></div>`)}</div>`;
}
function drawAssetDetail() {
  const a = ASSETS.find(x => x.id === state.asset);
  const d = ASSET_DETAIL[a.id] || defaultDetail(a);
  $('#assetDetail').innerHTML = `
    <div class="detail-head">${Charts.ring(a.health)}<div style="flex:1;min-width:0"><h2>${a.id} · ${a.name}</h2><div class="sub">${d.sub}</div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><span class="chip ${a.state === 'Alarm' ? 'bad' : a.state === 'Watch' ? 'warn' : 'good'}">${a.state}</span>${a.anomaly !== '—' ? `<span class="chip outline">${a.anomaly}</span>` : ''}</div></div>
      <div>${askBtn(`What is the health of ${a.id} and what should we do?`, 'Ask about this asset')}</div></div>
    <div class="facts">${d.facts.map(f => `<div class="fact"><div class="l">${f[0]}</div><div class="v">${f[1]}</div></div>`).join('')}</div>
    <div class="card-body"><div class="muted" style="font-size:12px;margin-bottom:6px">${d.chartTitle}</div><div id="ch-asset"></div></div>
    <div class="agent-note"><div class="who"><span class="agent-mark">${ico('pulse')}</span><b>Asset Health Agent</b> · Automated RCA · confidence ${a.health < 60 ? '0.91' : '0.78'}</div>
      <h4>${d.rca.title}</h4><ul>${d.rca.points.map(p => `<li>${p}</li>`).join('')}</ul>
      <div style="margin-top:8px"><b>Recommendation:</b> ${d.rca.reco}</div>
      ${a.health < 75 ? `<div style="display:flex;gap:8px;margin-top:10px"><button class="btn primary sm" data-toast="Work order sent to SAP PM for approval by maintenance head">Raise work order</button><button class="btn sm" data-toast="Recommendation shared with shift in-charge on Teams">Notify shift in-charge</button></div>` : ''}
    </div>`;
  Charts.line($('#ch-asset'), { labels: DAYS30, series: d.series, bands: d.bands, thresholds: d.thresholds, yMin: d.yMin, yMax: d.yMax, unit: d.unit, height: 200, area: true });
}

/* ---------- Cost conversion ---------- */
function pageCost() {
  const lines = COST.lines.map(l => { const oee = (l.a * l.p * l.q) / 10000; return `<tr>
    <td class="strong">${l.line}</td>
    <td style="width:140px"><div class="bar-cell"><div class="bar-track"><div class="bar-fill ${oee >= 75 ? '' : oee >= 65 ? 'warn' : 'bad'}" style="width:${oee}%"></div></div><span class="num">${oee.toFixed(1)}</span></div></td>
    <td class="r num">${l.a}</td><td class="r num">${l.p}</td><td class="r num">${l.q}</td><td class="muted">${l.loss}</td></tr>`; }).join('');
  const parts = COST.parts.map(p => { const v = ((p.act - p.std) / p.std) * 100; return `<tr><td class="mono">${p.pn}</td><td>${p.desc}</td><td class="r num">${p.vol}</td>
    <td class="r num">₹${p.std.toFixed(1)}</td><td class="r num">₹${p.act.toFixed(1)}</td><td class="r num" style="color:${v > 5 ? 'var(--bad)' : v > 2 ? 'var(--warn)' : 'var(--text)'}">+${v.toFixed(1)} %</td></tr>`; }).join('');
  const recos = COST.recos.map(r => `<div class="insight"><div class="rail"></div><div><div class="meta">${capTag(r.cap)}<span>·</span><span>Cost Conversion Agent</span></div><h4>${r.title}</h4><p>${r.body}</p><div class="acts"><span class="impact">${r.impact}</span></div></div></div>`).join('');

  return headerBlock('Productivity & cost conversion', 'OEE, six big losses and conversion cost per kg and per part, calculated live from machines, MES and SAP CO', periodSeg('30 days')) +
    kpiStrip([
      { label: 'Conversion cost', value: '₹38.4', unit: '/kg', delta: '₹3.4', dir: 'up', good: false, foot: 'vs budget ₹35.0' },
      { label: 'Plant OEE', value: '71.8', unit: '%', delta: '2.4 pp', dir: 'down', good: false, foot: 'target 78 %' },
      { label: 'Labour productivity', value: '118', unit: 'pcs/man-h', delta: '4 %', dir: 'up', good: true, foot: 'vs last month' },
      { label: 'Tool cost', value: '₹612', unit: '/1000 pcs', delta: '9 %', dir: 'up', good: false, foot: 'vs last month' },
      { label: 'Scrap & rework', value: '1.9', unit: '%', delta: '0.3 pp', dir: 'up', good: false, foot: 'target 1.2 %' },
      { label: 'Savings identified', value: '₹79', unit: 'L/yr', foot: '3 actions open' },
    ]) +
    `<div class="grid g-2">
      ${card('Conversion cost bridge, November', '₹ per kg · budget to actual', `<div class="card-body"><div id="ch-bridge"></div></div>`, askBtn('Why is conversion cost per kg above budget this month?'))}
      ${card('Conversion cost trend', '₹ per kg by element', `<div class="card-body"><div id="ch-cost"></div><div class="legend">${COST.monthly.series.map(s => `<span><i class="sq" style="background:${s.color}"></i>${s.name}</span>`).join('')}</div></div>`)}
    </div>
    <div class="grid g-32 mt">
      ${card('OEE by line', 'this month', `<div class="card-body flush"><table class="tbl"><thead><tr><th>Line</th><th>OEE %</th><th class="r">Avail. %</th><th class="r">Perf. %</th><th class="r">Quality %</th><th>Top loss</th></tr></thead><tbody>${lines}</tbody></table></div>`, askBtn('Why did OEE on Sprocket Line 2 drop this shift?'))}
      ${card('Six big losses', 'hours lost this month', `<div class="card-body"><div id="ch-loss"></div></div>`)}
    </div>
    <div class="grid g-32 mt">
      ${card('Conversion cost by part', '₹ per piece · standard vs actual', `<div class="card-body flush"><table class="tbl"><thead><tr><th>Part no.</th><th>Description</th><th class="r">Volume MTD</th><th class="r">Standard</th><th class="r">Actual</th><th class="r">Variance</th></tr></thead><tbody>${parts}</tbody></table></div>`)}
      ${card('Recommended actions', '₹79 L/yr', `<div class="feed">${recos}</div>`)}
    </div>`;
}
function drawCost() {
  Charts.waterfall($('#ch-bridge'), { start: 35.0, startLabel: 'Budget', endLabel: 'Actual', steps: COST.bridge, upBad: true, yMin: 30, height: 240 });
  Charts.bars($('#ch-cost'), { labels: COST.monthly.labels, series: COST.monthly.series, stacked: true, height: 214, unit: ' ₹/kg', valueLabels: true, barWidth: 0.5,
    thresholds: [{ value: 35, label: 'Budget ₹35.0', color: 'var(--good)' }] });
  Charts.hbars($('#ch-loss'), { items: COST.losses.map((l, i) => ({ ...l, display: l.value + ' h', color: i < 3 ? 'var(--c1)' : 'var(--c5)' })), labelW: 130 });
}

/* ---------- Quality · AI vision ---------- */
function sprocketSVG(defect) {
  const teeth = 42, cx = 160, cy = 120, R = 92, r = 80;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2, a1 = ((i + 0.3) / teeth) * Math.PI * 2, a2 = ((i + 0.55) / teeth) * Math.PI * 2, a3 = ((i + 0.85) / teeth) * Math.PI * 2;
    d += `${i ? 'L' : 'M'}${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} L${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)} L${cx + R * Math.cos(a2)} ${cy + R * Math.sin(a2)} L${cx + r * Math.cos(a3)} ${cy + r * Math.sin(a3)} `;
  }
  const holes = [0, 1, 2, 3, 4].map(k => { const a = (k / 5) * Math.PI * 2 - Math.PI / 2; return `<circle cx="${cx + 52 * Math.cos(a)}" cy="${cy + 52 * Math.sin(a)}" r="9" fill="#0e0e0e" stroke="#555"/>`; }).join('');
  const box = defect ? (() => { const a = defect.angle; const bx = cx + 88 * Math.cos(a), by = cy + 88 * Math.sin(a); return `
      <rect x="${bx - 16}" y="${by - 16}" width="32" height="32" fill="none" stroke="#ff5a4e" stroke-width="2"/>
      <rect x="${bx - 16}" y="${by - 30}" width="${defect.label.length * 6 + 34}" height="13" fill="#ff5a4e"/>
      <text x="${bx - 13}" y="${by - 20}" fill="#fff" style="font:10px var(--mono)">${defect.label} ${defect.conf}</text>`; })() : '';
  return `<svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid meet">
    <defs><radialGradient id="sg" cx="45%" cy="40%"><stop offset="0" stop-color="#b9b9b9"/><stop offset="1" stop-color="#6d6d6d"/></radialGradient></defs>
    <rect width="320" height="240" fill="#141414"/>
    <path d="${d}Z" fill="url(#sg)" stroke="#8a8a8a" stroke-width=".6"/>
    <circle cx="${cx}" cy="${cy}" r="70" fill="none" stroke="#5f5f5f"/>
    <circle cx="${cx}" cy="${cy}" r="22" fill="#0e0e0e" stroke="#777"/>${holes}
    <line x1="20" y1="120" x2="300" y2="120" stroke="#3ec27f" stroke-opacity=".25" stroke-dasharray="3 4"/>
    <line x1="160" y1="16" x2="160" y2="224" stroke="#3ec27f" stroke-opacity=".25" stroke-dasharray="3 4"/>${box}</svg>`;
}
function pageQuality() {
  const st = QUALITY.stations.map(s => `<button class="${s.id === state.station ? 'on' : ''}" data-station="${s.id}">${s.id}</button>`).join('');
  return headerBlock('Quality · AI vision', '100 % inspection on 12 camera stations, with defects linked back to the process that caused them', periodSeg('Today')) +
    kpiStrip([
      { label: 'First pass yield', value: '97.6', unit: '%', delta: '0.4 pp', dir: 'down', good: false, foot: 'target 98.5 %' },
      { label: 'Customer PPM (OEM)', value: '38', unit: 'ppm', delta: '22 %', dir: 'down', good: true, foot: 'vs last quarter' },
      { label: 'Parts inspected today', value: '184,320', unit: '', foot: '12 stations', live: 'insp' },
      { label: 'Defects caught', value: '2,941', unit: '', foot: '1.6 % of inspected', live: 'def' },
      { label: 'Model accuracy', value: '98.1', unit: '%', foot: 'audited vs manual, weekly' },
      { label: 'Cost of poor quality', value: '₹6.4', unit: 'L/MTD', delta: '11 %', dir: 'down', good: true, foot: 'vs last month' },
    ]) +
    `<div class="grid g-21">
      <section class="card"><div class="card-head"><h3>Live inspection</h3><span class="sub" id="stationName">Sprocket Vision Station · SPK-428-42T</span><div class="right"><div class="seg">${st}</div></div></div>
        <div class="vision"><div class="cam" id="cam"></div><div class="vlog" id="vlog"></div></div></section>
      ${card('Defect Pareto', 'today · all stations', `<div class="card-body"><div id="ch-pareto"></div></div>`)}
    </div>
    <div class="grid g-2 mt">
      <section class="card"><div class="card-head"><h3>Surface hardness, SPK-428-42T</h3><span class="sub">HRC · individual readings · spec 50–55</span><div class="right">${askBtn('Why are tooth crack rejects up on 428-42T sprockets?')}</div></div>
        <div class="card-body"><div id="ch-hrc"></div></div>
        <div class="agent-note"><div class="who"><span class="agent-mark">${ico('eye')}</span><b>Vision Quality Agent</b> · Automated RCA · confidence 0.86</div>
          <h4>Tooth crack rejects are linked to low quench flow on IH-02</h4>
          <ul><li>Tooth crack rate on VI-01 went from 0.31 % to 0.99 % at 14:10.</li><li>MES genealogy: 94 % of cracked parts came through IH-02.</li><li>IH-02 quench flow fell from 18.2 to 14.6 L/min. Hardness shows a run of 7 points down.</li></ul>
          <div style="display:flex;gap:8px;margin-top:10px"><button class="btn primary sm" data-toast="Lot hold QH-2611-07 raised in SAP QM for 1,140 pcs">Hold suspect lot</button><button class="btn sm" data-toast="8D draft created and shared with the quality head">Draft 8D</button></div></div>
      </section>
      ${card('First pass yield and customer PPM', 'last 30 days', `<div class="card-body"><div id="ch-fpy"></div><div class="legend"><span><i style="background:var(--c1)"></i>FPY %</span></div><div id="ch-ppm" class="mt"></div><div class="legend"><span><i style="background:var(--c2)"></i>Customer PPM</span></div></div>`)}
    </div>`;
}
let vTimer = null;
function drawQuality() {
  Charts.hbars($('#ch-pareto'), { items: QUALITY.pareto.map((p, i) => ({ ...p, color: i === 0 ? 'var(--bad)' : 'var(--c1)' })), labelW: 140, rowH: 44 });
  const lab = Array.from({ length: 40 }, (_, i) => `#${i + 1}`);
  Charts.line($('#ch-hrc'), { labels: lab, series: [{ name: 'Hardness', color: 'var(--c1)', data: QUALITY.hardness, marks: [35, 36, 37, 38, 39] }], height: 190, unit: ' HRC', yMin: 48, yMax: 56,
    thresholds: [{ value: 55, label: 'USL 55' }, { value: 50, label: 'LSL 50' }, { value: 52.6, label: 'Mean 52.6', color: 'var(--good)' }], annotations: [{ i: 33, label: '14:10' }] });
  Charts.line($('#ch-fpy'), { labels: DAYS30, series: [{ name: 'FPY', color: 'var(--c1)', data: QUALITY.fpy }], height: 110, unit: ' %', thresholds: [{ value: 98.5, label: 'Target 98.5', color: 'var(--good)' }] });
  Charts.line($('#ch-ppm'), { labels: DAYS30, series: [{ name: 'PPM', color: 'var(--c2)', data: QUALITY.ppm }], height: 110, dec: 0 });
  startVision();
}
function startVision() {
  clearInterval(vTimer);
  const log = [];
  const r = rng(Date.now() % 1000);
  const tick = () => {
    if (!$('#cam')) { clearInterval(vTimer); return; }
    const bad = r() < 0.28;
    const def = bad ? QUALITY.defects[Math.floor(r() * QUALITY.defects.length)] : null;
    const conf = (0.88 + r() * 0.11).toFixed(2);
    const ser = 'S' + (2611000 + Math.floor(r() * 9999));
    $('#cam').innerHTML = `${sprocketSVG(def ? { angle: r() * Math.PI * 2, label: def, conf } : null)}
      <div class="hud"><span>${state.station} · CAM-A · 24 fps</span><span class="rec">● REC</span></div>
      <div class="verdict ${def ? '' : 'ok'}">${def ? 'REJECT · ' + def : 'OK'} · ${ser}</div>`;
    const t = new Date();
    log.unshift({ t: t.toTimeString().slice(0, 8), ser, def, conf });
    if (log.length > 11) log.pop();
    $('#vlog').innerHTML = `<div class="muted" style="font-size:11px;margin-bottom:4px">Inspection log</div>` + log.map((l, i) => `<div class="row ${i === 0 ? 'new' : ''}"><span class="mono muted">${l.t}</span><span>${l.ser} ${l.def ? '· ' + l.def : ''}</span><span class="chip ${l.def ? 'bad' : 'good'}">${l.def ? 'NG' : 'OK'} ${l.conf}</span></div>`).join('');
  };
  for (let k = 0; k < 10; k++) { tick(); log[0].t = new Date(Date.now() - (10 - k) * 1600).toTimeString().slice(0, 8); }
  vTimer = setInterval(tick, 1600);
}

/* ---------- Energy & utilities ---------- */
function pageEnergy() {
  const util = ENERGY.utilities.map(u => `<tr><td class="strong">${u.asset}</td><td class="num">${u.kpi}</td>
    <td style="width:130px"><div class="bar-cell"><div class="bar-track"><div class="bar-fill brand" style="width:${u.load}%"></div></div><span class="num">${u.load}%</span></div></td>
    <td><span class="chip ${u.state === 'warn' ? 'warn' : 'good'}">${u.state === 'warn' ? 'Watch' : 'Normal'}</span></td><td class="muted">${u.note}</td></tr>`).join('');
  const opps = ENERGY.opps.map(r => `<div class="insight"><div class="rail"></div><div><div class="meta">${capTag(r.cap)}<span>·</span><span>Energy & Utilities Agent</span></div><h4>${r.title}</h4><p>${r.body}</p><div class="acts"><span class="impact">${r.impact}</span></div></div></div>`).join('');
  const total = ENERGY.byArea.reduce((a, b) => a + b.value, 0);
  return headerBlock('Energy & utilities', '186 energy meters, compressors, furnaces and cooling water, with tariff and demand in one view', periodSeg('Today')) +
    kpiStrip([
      { label: 'Energy today', value: total.toLocaleString('en-IN'), unit: 'kWh', foot: 'till 15:00', live: 'kwh' },
      { label: 'Specific energy', value: '1.92', unit: 'kWh/kg', delta: '3.1 %', dir: 'up', good: false, foot: 'target 1.80' },
      { label: 'Max demand', value: '3,864', unit: 'kVA', foot: 'contract 4,200 kVA', live: 'kva' },
      { label: 'Power factor', value: '0.982', unit: '', foot: 'incentive band > 0.98' },
      { label: 'Energy cost today', value: '₹4.36', unit: 'L', foot: 'avg ₹8.9/kWh' },
      { label: 'Savings identified', value: '₹39', unit: 'L/yr', foot: '3 actions open' },
    ]) +
    `<div class="grid g-21">
      ${card('Load profile vs contract demand', 'kVA · today · ToD tariff windows', `<div class="card-body"><div id="ch-load"></div></div>`, askBtn('Compare kWh per piece for sprockets across lines this week'))}
      ${card('Consumption by area', 'kWh today', `<div class="card-body"><div id="ch-donut"></div></div>`)}
    </div>
    <div class="grid g-2 mt">
      ${card('Weekly load pattern', 'kW · hour of day × weekday', `<div class="card-body"><div id="ch-heat"></div></div>`)}
      ${card('Utilities', 'live', `<div class="card-body flush"><table class="tbl"><thead><tr><th>Asset</th><th>Efficiency</th><th>Load</th><th>State</th><th>Note</th></tr></thead><tbody>${util}</tbody></table></div>`, askBtn('How much compressed air are we losing to leaks?'))}
    </div>
    <div class="grid g-2 mt">
      ${card('Specific energy consumption', 'kWh per kg · last 30 days', `<div class="card-body"><div id="ch-sec"></div></div>`)}
      ${card('Saving opportunities', '₹39 L/yr', `<div class="feed">${opps}</div>`)}
    </div>`;
}
function drawEnergy() {
  Charts.line($('#ch-load'), { labels: HOURS24.map(h => h.slice(0, 2)), series: [{ name: 'Demand', color: 'var(--c1)', data: ENERGY.loadProfile, area: true }], height: 230, unit: ' kVA', dec: 0, yMin: 1500, yMax: 4500,
    thresholds: [{ value: 4200, label: 'Contract demand 4,200 kVA' }, { value: 3900, label: 'Agent alert 3,900 kVA', color: 'var(--warn)' }],
    xBands: [{ from: 6, to: 9, color: 'var(--bad)', label: 'Peak' }, { from: 18, to: 22, color: 'var(--bad)', label: 'Peak' }, { from: 22, to: 23, color: 'var(--good)', label: 'Off-peak' }, { from: 0, to: 5, color: 'var(--good)', label: 'Off-peak' }] });
  Charts.donut($('#ch-donut'), { items: ENERGY.byArea.map(a => ({ ...a, display: a.value.toLocaleString('en-IN') })), center: '48.6k', centerSub: 'kWh today' });
  Charts.heatmap($('#ch-heat'), { rows: WEEKDAYS, cols: HOURS24.map(h => h.slice(0, 2)), values: ENERGY.heat, unit: 'kW' });
  Charts.line($('#ch-sec'), { labels: DAYS30, series: [{ name: 'SEC', color: 'var(--c1)', data: ENERGY.sec }], height: 200, unit: ' kWh/kg', dec: 2, thresholds: [{ value: 1.8, label: 'Target 1.80', color: 'var(--good)' }] });
}

/* ---------- Ontology ---------- */
const ONTO_INDEX = {};
(function index(n, parent) { ONTO_INDEX[n.id] = { ...n, parent }; (n.children || []).forEach(c => index(c, n.id)); })(ONTOLOGY, null);
const ISA = [['L0', 'Enterprise', 'Company'], ['L1', 'Site', 'Plant'], ['L2', 'Area', 'Shop / department'], ['L3', 'Work Center', 'Line / process cell / unit'], ['L4', 'Work Unit', 'Equipment'], ['L5', 'Tag', 'Signal / parameter']];
function treeHTML(n) {
  const has = n.children && n.children.length, open = state.ontoOpen.has(n.id);
  return `<div><div class="tnode ${state.ontoSel === n.id ? 'sel' : ''}" data-node="${n.id}"><span class="tw">${has ? (open ? '▼' : '▶') : ''}</span><span>${n.level === 'Work Unit' ? `<span class="mono">${n.id}</span> ` : ''}${n.name}</span><span class="lv">${ISA.find(l => l[1] === n.level)[0]}</span></div>
    ${has && open ? `<div class="tchildren">${n.children.map(treeHTML).join('')}</div>` : ''}</div>`;
}
function pageOntology() {
  const units = Object.values(ONTO_INDEX).filter(n => n.level === 'Work Unit');
  const tagCount = units.reduce((a, u) => a + (CLASS_TAGS[u.cls] || []).length, 0);
  return headerBlock('Ontology', 'ISA-95 equipment hierarchy with assets, tags, relationships and documents. The shared plant context for every agent.', readOnlyChip() + `<button class="btn">${ico('download')} Export OWL / JSON-LD</button>`) +
    kpiStrip([
      { label: 'Hierarchy levels', value: '6', unit: '', foot: 'ISA-95 role-based model' },
      { label: 'Areas · work centers', value: '8 · 18', unit: '', foot: 'Hosur plant' },
      { label: 'Equipment classes', value: Object.keys(CLASS_TAGS).length, unit: '', foot: 'with tag templates' },
      { label: 'Work units modelled', value: units.length, unit: '', foot: '214 incl. sub-assets' },
      { label: 'Relationships', value: RELATIONS.length + 1840, unit: '', foot: 'feeds · supplies · cools · tests' },
      { label: 'Tags mapped', value: '18,628', unit: '', foot: `${tagCount} key tags shown` },
    ]) +
    `<div class="isa-levels" id="isaLevels">${ISA.map(l => `<div class="isa-level" data-lv="${l[1]}"><div class="n">${l[0]}</div><div class="t">${l[1]}</div><div class="c">${l[2]}</div></div>`).join('')}</div>
    <div class="onto">
      ${card('Equipment hierarchy', '', `<div class="tree" id="tree">${treeHTML(ONTOLOGY)}</div>`, `<button class="btn sm" id="expandAll">Expand all</button>`)}
      <div id="ontoDetail"></div>
    </div>`;
}
function relsFor(id) { return RELATIONS.filter(r => r[0] === id || r[2] === id); }
function graphSVG(id) {
  const rels = relsFor(id);
  const w = 640, h = 260, cx = w / 2, cy = h / 2;
  const left = rels.filter(r => r[2] === id), right = rels.filter(r => r[0] === id);
  const node = (x, y, label, sub, main) => `<g><rect x="${x - 70}" y="${y - 17}" width="140" height="34" rx="4" style="fill:${main ? 'var(--primary)' : 'var(--surface-2)'};stroke:${main ? 'var(--primary)' : 'var(--border-strong)'}"/>
    <text x="${x}" y="${y - 2}" text-anchor="middle" style="${main ? 'fill:#fff;font-weight:600' : ''}">${label}</text><text x="${x}" y="${y + 11}" text-anchor="middle" style="font-size:9px;fill:${main ? '#ffe3d2' : 'var(--muted)'}">${sub}</text></g>`;
  const nm = k => (ONTO_INDEX[k] ? ONTO_INDEX[k].name : k);
  let out = '';
  const place = (list, side) => list.forEach((r, i) => {
    const other = side === 'L' ? r[0] : r[2];
    const y = list.length === 1 ? cy : 30 + (i * (h - 60)) / (list.length - 1);
    const x = side === 'L' ? 90 : w - 90;
    out += `<path d="M${side === 'L' ? x + 70 : cx + 70} ${side === 'L' ? y : cy} C ${(x + cx) / 2} ${side === 'L' ? y : cy}, ${(x + cx) / 2} ${side === 'L' ? cy : y}, ${side === 'L' ? cx - 70 : x - 70} ${side === 'L' ? cy : y}" style="fill:none;stroke:var(--border-strong);stroke-width:1.2" marker-end="url(#arr)"/>`;
    out += `<text class="edge-l" x="${(x + cx) / 2}" y="${(y + cy) / 2 - 4}" text-anchor="middle">${r[1]}</text>`;
    out += node(x, y, other, (nm(other) || '').replace(/ #\d+$/, '').slice(0, 24), false);
  });
  place(left, 'L'); place(right, 'R');
  return `<svg class="graph" viewBox="0 0 ${w} ${h}" style="width:100%;height:auto"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10z" style="fill:var(--border-strong)"/></marker></defs>${out}${node(cx, cy, id, ONTO_INDEX[id].cls.replace(' Machine', '').slice(0, 24), true)}</svg>`;
}
function pathOf(id) { const p = []; let n = ONTO_INDEX[id]; while (n) { p.unshift(n); n = n.parent ? ONTO_INDEX[n.parent] : null; } return p; }
function drawOntoDetail() {
  const n = ONTO_INDEX[state.ontoSel];
  $$('#isaLevels .isa-level').forEach(el => el.classList.toggle('on', el.dataset.lv === n.level));
  const path = pathOf(n.id).map(p => p.name).join(' › ');
  const tagPrefix = pathOf(n.id).slice(1).map(p => p.id.split('-').pop()).join('.');
  let body = '';
  if (n.level === 'Work Unit') {
    const tags = (CLASS_TAGS[n.cls] || []).map(t => `<tr><td class="mono">${CONFIG.plantCode}.${tagPrefix.replace(/-/g, '')}.${t[0]}</td><td>${t[1]}</td><td class="r num" data-tag="${t[3]}|${t[4]}">${t[3]}</td><td class="muted">${t[2]}</td><td class="muted">${n.cls.includes('Vision') ? 'Edge GPU' : ['Transformer', 'Screw Air Compressor', 'Cooling Tower', 'Chiller'].includes(n.cls) ? 'Modbus' : n.cls.startsWith('CNC') ? 'FOCAS' : 'OPC UA'}</td></tr>`).join('');
    const asset = ASSETS.find(a => a.id === n.id);
    const props = [['ISA-95 level', 'Work Unit (L4)'], ['Equipment class', n.cls], ['Make', n.make], ['Criticality', n.crit], ['Health score', asset ? asset.health : n.health], ['SAP functional location', `${CONFIG.plantCode}-${n.parent}-${n.id}`], ['SAP equipment no.', '1000' + (4200 + n.id.charCodeAt(0) * 3 + n.id.length * 11)], ['Documents', 'OEM manual, SOP, 3 past RCAs'], ['Agents subscribed', n.cls.includes('Vision') ? 'Vision Quality' : n.id.startsWith('AC') || n.id.startsWith('TR') ? 'Energy & Utilities, Asset Health' : 'Asset Health, Cost Conversion']];
    body = `${card('Relationships', 'from the knowledge graph', `<div class="card-body">${relsFor(n.id).length ? graphSVG(n.id) : '<div class="empty-note">No direct relationships modelled.</div>'}</div>`)}
      <div class="mt">${card('Tags', `${(CLASS_TAGS[n.cls] || []).length} key tags · live`, `<div class="card-body flush"><table class="tbl"><thead><tr><th>Tag</th><th>Description</th><th class="r">Value</th><th>Unit</th><th>Source</th></tr></thead><tbody>${tags}</tbody></table></div>`, `<span class="chip good"><span class="dot pulse"></span>Live</span>`)}</div>`;
    return ($('#ontoDetail').innerHTML = `<section class="card"><div class="detail-head"><div style="flex:1"><div class="muted" style="font-size:11px">${path}</div><h2 style="margin-top:4px">${n.id} · ${n.name}</h2></div>${askBtn(`What is the health of ${n.id} and what should we do?`, 'Ask about this asset')}</div>
      <div class="props">${props.map(p => `<div class="prop"><div class="l">${p[0]}</div><div class="v">${p[1]}</div></div>`).join('')}</div></section><div class="mt">${body}</div>`);
  }
  const kids = n.children || [];
  const units = (function all(x) { return x.level === 'Work Unit' ? [x] : (x.children || []).flatMap(all); })(n);
  const props = Object.entries(n.props || { 'Class': n.cls, 'Children': kids.length });
  const rows = kids.map(k => { const u = (function all(x) { return x.level === 'Work Unit' ? [x] : (x.children || []).flatMap(all); })(k);
    return `<tr class="click" data-node="${k.id}"><td class="strong">${k.level === 'Work Unit' ? k.id + ' · ' : ''}${k.name}</td><td>${k.level}</td><td class="muted">${k.cls}</td><td class="r num">${u.length}</td><td class="r num">${u.reduce((a, x) => a + (CLASS_TAGS[x.cls] || []).length, 0)}</td></tr>`; }).join('');
  $('#ontoDetail').innerHTML = `<section class="card"><div class="detail-head"><div style="flex:1"><div class="muted" style="font-size:11px">${path}</div><h2 style="margin-top:4px">${n.name}</h2><div class="sub">${n.level} · ${n.cls} · ${units.length} work units</div></div></div>
    <div class="props">${[['ISA-95 level', n.level + ' (' + ISA.find(l => l[1] === n.level)[0] + ')'], ['Class', n.cls], ...props].slice(0, 9).map(p => `<div class="prop"><div class="l">${p[0]}</div><div class="v">${p[1]}</div></div>`).join('')}</div></section>
    <div class="mt">${card('Contains', kids.length + ' items', `<div class="card-body flush"><table class="tbl"><thead><tr><th>Name</th><th>ISA-95 level</th><th>Class</th><th class="r">Work units</th><th class="r">Key tags</th></tr></thead><tbody>${rows}</tbody></table></div>`)}</div>`;
}
function drawOntology() { drawOntoDetail(); }

/* ---------- Agents ---------- */
function pageAgents() {
  const cards = AGENTS.map(a => `<section class="card agent">
    <div class="top"><div class="ico">${ico(a.icon)}</div><div style="flex:1;min-width:0"><h3>${a.name}</h3><div class="muted" style="font-size:11px">${a.domain}</div></div><span class="chip good"><span class="dot pulse"></span>${a.status}</span></div>
    <div class="purpose">${a.purpose}</div>
    <div class="k">Capabilities</div><div class="rowk">${a.caps.map(c => `<span class="chip brand">${c}</span>`).join('')}</div>
    <div class="k">Skills</div><div class="rowk">${a.skills.map(c => `<span class="chip">${c}</span>`).join('')}</div>
    <div class="k">MCP connectors</div><div class="rowk">${a.tools.map(c => `<span class="chip outline">${c}</span>`).join('')}</div>
    <div style="height:14px;flex:none"></div><div class="stats"><div><div class="l">Runs, 30 days</div><div class="v">${a.runs.toLocaleString('en-IN')}</div></div><div><div class="l">Avg. response</div><div class="v">${a.resp}</div></div><div><div class="l">Autonomy</div><div class="v" style="font-size:12px;padding-top:2px">${a.autonomy}</div></div></div>
    <div class="foot">${askBtn(a.prompt, 'Try in Copilot')}<span class="muted right-a" style="font-size:11px">v2.${a.runs % 7} · Bruce</span></div></section>`).join('');
  const runs = AGENT_RUNS.map(r => `<tr><td class="mono">${r.t}</td><td class="strong">${r.agent}</td><td>${r.trigger}</td><td class="muted">${r.tools}</td><td>${r.out}</td>
    <td>${r.state === 'Awaiting approval' ? `<button class="btn primary sm" data-approve>Approve</button>` : `<span class="chip good">Done</span>`}</td></tr>`).join('');
  const stack = [
    ['Plant data', ['PLC · CNC · SCADA', 'Historian', 'SAP · MES', 'Sensors · meters', 'Cameras', 'SOPs · manuals']],
    ['Plant context', ['ISA-95 ontology', 'Knowledge graph', 'Skills', 'SME libraries', 'Native DBs']],
    ['Reasoning', ['Frontier LLMs', 'Local LLMs', 'ML & CV models', 'Memory', 'Feedback loop']],
    ['Control', ['MCP connectors', 'MCP gateway', 'Guardrails', 'Role-based access', 'Audit log']],
    ['Capabilities', ['Data retrieval · dashboards', 'Problem detection · RCA', 'Recommendations', 'Reports · planning', 'Task automation']],
  ];
  return headerBlock('Agents', 'Industrial agents running on the Bruce agent runtime, grounded in the plant ontology and reachable from Copilot',
    readOnlyChip() + `<a class="btn" href="#tools">${ico('tool')} View tools</a>`) +
    kpiStrip([
      { label: 'Agents in production', value: AGENTS.length, unit: '', foot: 'on Bruce runtime' },
      { label: 'Runs today', value: '412', unit: '', foot: '61 by users, 351 automatic', live: 'runs' },
      { label: 'Avg. response', value: '7.1', unit: 's', foot: 'p95 16.4 s' },
      { label: 'Answers rated useful', value: '92', unit: '%', foot: '1,206 ratings' },
      { label: 'Guardrail checks', value: '1,884', unit: '', foot: '3 actions blocked' },
      { label: 'Pending approvals', value: '1', unit: '', foot: 'WO 4100 8821' },
    ]) +
    `${card('How the agents work', 'Faclon AI agent stack', `<div class="stack">${stack.map(s => `<div class="col"><h5>${s[0]}</h5>${s[1].map(i => `<div class="it">${i}</div>`).join('')}</div>`).join('')}</div>`)}
    <div class="agents mt">${cards}</div>
    <div class="mt">${card('Agent activity', 'today', `<div class="card-body flush"><table class="tbl"><thead><tr><th>Time</th><th>Agent</th><th>Trigger</th><th>Tools called</th><th>Output</th><th>Status</th></tr></thead><tbody>${runs}</tbody></table></div>`)}</div>`;
}

/* ==========================================================================
   Router, events, live updates
   ========================================================================== */
const RENDER = {
  kpis: [pageKpis, drawKpis], ontology: [pageOntology, drawOntology], agents: [pageAgents, () => {}], tools: [pageTools, () => {}],
  copilot: [() => Copilot.page(), () => Copilot.mount()], autopilot: [pageAutopilot, () => {}], reports: [pageReports, drawReports],
  'dash/overview': [pageOverview, drawOverview], 'dash/maintenance': [pageMaintenance, drawAssetDetail], 'dash/cost': [pageCost, drawCost],
  'dash/quality': [pageQuality, drawQuality], 'dash/energy': [pageEnergy, drawEnergy],
};
function render() {
  const k = (location.hash || '#kpis').slice(1);
  current = RENDER[k] ? k : 'kpis';
  $('.app').classList.toggle('nav-open', false);
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.page === current));
  const c = $('#content');
  c.classList.toggle('flush-page', current === 'copilot');
  c.innerHTML = RENDER[current][0]();
  c.scrollTop = 0;
  if (current !== 'copilot') Copilot.setContext(current.replace('dash/', ''));
  RENDER[current][1]();
}
function redraw() { if (RENDER[current]) RENDER[current][1](); }

function toast(msg) {
  let t = $('#toast');
  t.innerHTML = `<span class="dot"></span>${msg}`;
  t.classList.add('on');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('on'), 2800);
}

function bind() {
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-kpi],[data-aptab],[data-sched],[data-wf],[data-report],[data-repf],[data-sheet],[data-cell],[data-download],[data-goto-report],[data-ask],[data-asset],[data-goto-asset],[data-node],[data-station],[data-toast],[data-approve],#themeBtn,#copilotBtn,#expandAll,#menuBtn,#navScrim,.nav a,.seg button');
    if (!t) return;
    if (t.id === 'menuBtn') { $('.app').classList.toggle('nav-open'); return; }
    if (t.id === 'navScrim' || t.matches('.nav a')) { $('.app').classList.remove('nav-open'); if (t.id === 'navScrim') return; }
    if (t.dataset.ask) { Copilot.ask(t.dataset.ask); return; }
    if (t.dataset.kpi) { state.kpi = t.dataset.kpi; $$('tr[data-kpi]').forEach(r => r.classList.toggle('sel', r.dataset.kpi === state.kpi)); drawKpis(); return; }
    if (t.dataset.aptab) { state.apTab = t.dataset.aptab; render(); return; }
    if (t.dataset.sched || t.dataset.wf) { t.classList.toggle('on'); const on = t.classList.contains('on'); const o = t.dataset.sched ? SCHEDULES.find(x => x.id === t.dataset.sched) : WORKFLOWS.find(x => x.id === t.dataset.wf); o.on = on; toast(`${o.name} ${on ? 'turned on' : 'paused'}`); return; }
    if (t.dataset.report) { state.report = t.dataset.report; $$('[data-report]').forEach(b => b.classList.toggle('on', b.dataset.report === state.report)); drawReports(); return; }
    if (t.dataset.repf) { state.repFilter = t.dataset.repf; const l = REPORTS.filter(r => t.dataset.repf === 'All' || r.type === t.dataset.repf); if (!l.find(r => r.id === state.report)) state.report = l[0].id; render(); return; }
    if (t.dataset.sheet) { state.sheet.i = +t.dataset.sheet; drawReports(); return; }
    if (t.dataset.cell) { $$('.xl td.sel').forEach(x => x.classList.toggle('sel', false)); t.classList.add('sel'); $('#xlRef').textContent = t.dataset.cell; $('#xlVal').textContent = t.dataset.v || ''; return; }
    if (t.dataset.download) { downloadReport(t.dataset.download); return; }
    if (t.dataset.gotoReport) { state.report = t.dataset.gotoReport; location.hash = '#reports'; return; }
    if (t.dataset.asset) { state.asset = t.dataset.asset; $$('tr[data-asset]').forEach(r => r.classList.toggle('sel', r.dataset.asset === state.asset)); drawAssetDetail(); return; }
    if (t.dataset.gotoAsset) { const id = t.dataset.gotoAsset; state.ontoSel = id; pathOf(id).forEach(p => state.ontoOpen.add(p.id)); location.hash = '#ontology'; return; }
    if (t.dataset.node) {
      const id = t.dataset.node;
      if (state.ontoSel === id && t.classList.contains('tnode')) { state.ontoOpen.has(id) ? state.ontoOpen.delete(id) : state.ontoOpen.add(id); }
      else { state.ontoSel = id; state.ontoOpen.add(id); pathOf(id).forEach(p => state.ontoOpen.add(p.id)); }
      $('#tree').innerHTML = treeHTML(ONTOLOGY); drawOntoDetail(); return;
    }
    if (t.dataset.station) {
      state.station = t.dataset.station;
      $$('[data-station]').forEach(b => b.classList.toggle('on', b.dataset.station === state.station));
      const s = QUALITY.stations.find(x => x.id === state.station);
      $('#stationName').textContent = `${s.name} · ${s.part}`; return;
    }
    if (t.dataset.toast) { toast(t.dataset.toast); t.disabled = true; t.textContent = 'Done'; return; }
    if (t.hasAttribute('data-approve')) { t.outerHTML = '<span class="chip good">Approved</span>'; toast('WO 4100 8821 released in SAP PM. Planner notified.'); return; }
    if (t.id === 'themeBtn') { setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); return; }
    if (t.id === 'copilotBtn') { location.hash = '#copilot'; return; }
    if (t.id === 'expandAll') { Object.keys(ONTO_INDEX).forEach(k => state.ontoOpen.add(k)); $('#tree').innerHTML = treeHTML(ONTOLOGY); return; }
    if (t.matches('.seg button') && !t.dataset.station) { $$('button', t.parentElement).forEach(b => b.classList.toggle('on', b === t)); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); $('#globalSearch').focus(); }
  });
  $('#globalSearch').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim().toUpperCase();
    const hit = Object.values(ONTO_INDEX).find(n => n.id.toUpperCase() === q || n.name.toUpperCase().includes(q));
    if (hit) { state.ontoSel = hit.id; pathOf(hit.id).forEach(p => state.ontoOpen.add(p.id)); location.hash = '#ontology'; if (current === 'ontology') render(); }
    else { Copilot.ask(e.target.value); }
    e.target.value = '';
  });
  window.addEventListener('hashchange', render);
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(redraw, 200); });
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  $('#themeBtn').innerHTML = ico(t === 'dark' ? 'sun' : 'moon');
  try { localStorage.setItem('pwc-theme', t); } catch (e) {}
}

const LIVE = { oee: [71.8, 0.15, 1, '%'], prod: [48260, 0, 0, 'pcs', 38], insp: [184320, 0, 0, '', 42], def: [2941, 0, 0, '', 1], kwh: [48620, 0, 0, 'kWh', 22], kva: [3864, 40, 0, 'kVA'], runs: [412, 0, 0, '', 0.3] };
function liveTick() {
  const now = new Date();
  const c = $('#clock'); if (c) c.textContent = now.toTimeString().slice(0, 8);
  Object.entries(LIVE).forEach(([k, v]) => {
    if (v[4]) v[0] += Math.random() * v[4]; else v[0] += (Math.random() - 0.5) * v[1];
    $$(`[data-live="${k}"]`).forEach(el => { const small = el.querySelector('small'); el.firstChild.nodeValue = v[2] ? v[0].toFixed(v[2]) : Math.round(v[0]).toLocaleString('en-IN'); if (small) el.appendChild(small); });
  });
  $$('[data-tag]').forEach(el => { const [b, n] = el.dataset.tag.split('|').map(Number); if (n) { const dec = b < 10 ? 2 : b < 100 ? 1 : 0; el.textContent = (b + (Math.random() - 0.5) * n).toFixed(dec); } });
}

document.addEventListener('DOMContentLoaded', () => {
  let t = 'light';
  try { t = localStorage.getItem('pwc-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (e) {}
  shell();
  setTheme(t);
  bind();
  render();
  setInterval(liveTick, 2000);
});
