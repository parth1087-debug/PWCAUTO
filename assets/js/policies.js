/* ==========================================================================
   Policies: what agents and users may see and do (Context, read only)
   ========================================================================== */
const POLICY_CATS = ['Plant safety', 'Approvals', 'Data & privacy', 'AI & models', 'Sharing', 'Cost & audit'];
const POLICIES = [
  { id: 'P-01', cat: 'Plant safety', name: 'No writes to control systems', stmt: 'Agents never write to PLC, DCS or SCADA. Setpoint changes are drafted as change requests only.', scope: 'All agents', mode: 'Block', approver: '—', by: 'I/O Connect · MCP Gateway', checks: 412, hits: 3, last: 'Today 14:46', ver: '1.0', upd: '1 Sep',
    code: 'policy: P-01\nwhen:\n  tool.category: control_system_write\nthen: block\nnotify: [requesting_user, ot_lead]\nlog: foundry.audit',
    events: [['Today 14:46', 'Energy & Utilities Agent', 'plc.write_setpoint · SQF-01', 'Blocked'], ['22 Nov 10:12', 'Copilot · V. Menon', 'scada.write · MBF-01 belt speed', 'Blocked'], ['14 Nov 16:40', 'Copilot · R. Kumar', 'plc.write · PR-02 stroke rate', 'Blocked']] },
  { id: 'P-02', cat: 'Plant safety', name: 'Recipe and setpoint changes need a PCN', stmt: 'Changes to heat treatment recipes or process setpoints go to the heat treatment in-charge with a process change notice (IATF 16949).', scope: 'All agents and users', mode: 'Draft only', approver: 'Heat treatment in-charge', by: 'Bruce approval service', checks: 6, hits: 2, last: 'Yesterday', ver: '1.1', upd: '18 Nov',
    code: 'policy: P-02\nwhen:\n  action: change_request\n  object.type: [recipe, setpoint]\nthen:\n  draft_only: true\n  require_approval: heat_treatment_incharge\n  attach: pcn_template\nlog: foundry.audit',
    events: [['Yesterday 16:02', 'Copilot · V. Menon', 'CR-HT-0412 · SQF-01 900 °C', 'Drafted, waiting'], ['3 Nov 11:20', 'Copilot · V. Menon', 'CR-HT-0398 · TF-01 temper 215 °C', 'Approved']] },
  { id: 'P-03', cat: 'Approvals', name: 'Work orders above ₹50,000', stmt: 'Work orders with estimated cost above ₹50,000 wait for the maintenance head. When the maintenance head is away, the plant head approves.', scope: 'Maintenance Planner Agent', mode: 'Approval', approver: 'Maintenance head (delegate: plant head)', by: 'MCP Gateway · SAP PM', checks: 64, hits: 9, last: 'Today 14:52', ver: '2.0', upd: '12 Oct',
    code: 'policy: P-03\nwhen:\n  tool: sap_pm.create_order\n  order.cost_inr: "> 50000"\nthen:\n  require_approval: maintenance_head\n  delegate_when_absent: plant_head\n  timeout: 8h -> escalate\nlog: foundry.audit',
    events: [['Today 14:52', 'Maintenance Planner Agent', 'WO 4100 8821 · ₹62,400', 'Waiting · delegated to A. Rao'], ['Today 11:40', 'Maintenance Planner Agent', 'WO 4100 8809 · ₹54,000', 'Approved · J. Thomas'], ['21 Nov 09:15', 'Maintenance Planner Agent', 'WO 4100 8702 · ₹1,18,000', 'Approved · J. Thomas']] },
  { id: 'P-04', cat: 'Approvals', name: 'Purchase requisitions', stmt: 'Any purchase requisition raised by an agent needs the plant head. Agents attach quotes and payback.', scope: 'All agents', mode: 'Approval', approver: 'Plant head', by: 'MCP Gateway · SAP MM', checks: 14, hits: 14, last: 'Today 13:40', ver: '1.0', upd: '1 Sep',
    code: 'policy: P-04\nwhen:\n  tool: sap_mm.create_purchase_req\nthen:\n  require_approval: plant_head\n  require_fields: [quotes, payback]\nlog: foundry.audit',
    events: [['Today 13:40', 'Cost Conversion Agent', 'PR 1100 2391 · SMED kit ₹4.2 L', 'Waiting'], ['19 Nov 15:05', 'Maintenance Planner Agent', 'PR 1100 2344 · bearings ₹38k', 'Approved']] },
  { id: 'P-05', cat: 'Approvals', name: 'Quality lot hold and release', stmt: 'Agents may raise a lot hold with QA in-charge approval. Only the quality head may release a lot from hold.', scope: 'Vision Quality Agent', mode: 'Approval', approver: 'QA in-charge (hold) · Quality head (release)', by: 'MCP Gateway · SAP QM', checks: 23, hits: 23, last: 'Today 14:31', ver: '1.2', upd: '30 Oct',
    code: 'policy: P-05\nrules:\n  - when: { tool: sap_qm.create_quality_hold }\n    then: { require_approval: qa_incharge }\n  - when: { tool: sap_qm.release_hold }\n    then: { require_approval: quality_head, agents: block }\nlog: foundry.audit',
    events: [['Today 14:31', 'Vision Quality Agent', 'QH-2611-07 · 1,140 pcs', 'Approved · QA in-charge'], ['24 Nov 18:10', 'Copilot · S. Iyer', 'Release QH-2611-02', 'Blocked · needs quality head']] },
  { id: 'P-06', cat: 'Data & privacy', name: 'Role-based data access', stmt: 'Users, Copilot and agents see only the plants, areas, assets and data types their role allows. Cost data is for finance and the plant head.', scope: 'All users and agents', mode: 'Role-based', approver: '—', by: 'Foundry policy engine', checks: 1240, hits: 1, last: 'Today 10:22', ver: '3.1', upd: '5 Nov',
    code: 'policy: P-06\nsubject: [user, copilot, agent]\nresource: [plant, area, asset, data_type]\neffect: allow_if role.scope contains resource\nexceptions:\n  sap_co: [finance, plant_head]\nlog: foundry.audit',
    events: [['Today 10:22', 'Copilot · V. Menon', 'sap_co.get_cost_centre_actuals', 'Denied · no finance scope']] },
  { id: 'P-07', cat: 'Data & privacy', name: 'Confidential documents stay on site', stmt: 'Documents marked confidential (drawings, costings, customer data) are processed only by the local LLM on plant servers, never a cloud model.', scope: 'All agents', mode: 'Local only', approver: '—', by: 'Bruce model router', checks: 318, hits: 318, last: 'Today 14:57', ver: '1.0', upd: '1 Sep',
    code: 'policy: P-07\nwhen:\n  document.label: confidential\nthen:\n  model_route: local_llm\n  cloud_models: block\nlog: foundry.audit',
    events: [['Today 14:57', 'Asset Health Agent', 'Gleason OEM manual p. 214', 'Routed to local LLM'], ['Today 14:31', 'Vision Quality Agent', 'Control plan SPK-428-42T', 'Routed to local LLM']] },
  { id: 'P-08', cat: 'AI & models', name: 'Agent-proposed ontology changes', stmt: 'Agents may propose new objects, links or tag mappings. A Faclon SME and a plant SME must confirm before the change is applied.', scope: 'All agents', mode: 'Approval', approver: 'Faclon SME + plant SME', by: 'Ontology version control', checks: 9, hits: 9, last: '20 Nov', ver: '1.0', upd: '1 Sep',
    code: 'policy: P-08\nwhen:\n  action: ontology.propose_change\nthen:\n  require_approval: [faclon_sme, plant_sme]\n  apply: new_version\nlog: foundry.audit',
    events: [['20 Nov 12:30', 'Asset Health Agent', 'Link AC-02 supplies HB-04', 'Approved · v1.14']] },
  { id: 'P-09', cat: 'AI & models', name: 'New model versions run in shadow first', stmt: 'A new model version runs beside the live one for at least 7 days. It goes live only after a named approver checks its accuracy.', scope: 'Deepsense models', mode: 'Approval', approver: 'Model owner', by: 'Deepsense registry', checks: 4, hits: 4, last: 'Today 02:10', ver: '1.0', upd: '1 Sep',
    code: 'policy: P-09\nwhen:\n  action: model.promote\nthen:\n  require: shadow_days >= 7\n  require_approval: model_owner\nlog: foundry.audit',
    events: [['Today 02:10', 'Deepsense', 'vision-defect v3.4 → live', 'Approved · N. Shah']] },
  { id: 'P-10', cat: 'AI & models', name: 'Answers must cite plant data', stmt: 'Copilot answers that state a number or a cause must show the data source or document passage. Answers without evidence are marked as unverified.', scope: 'Copilot and all agents', mode: 'Enforced', approver: '—', by: 'Bruce evaluation harness', checks: 1842, hits: 27, last: 'Today 13:02', ver: '1.3', upd: '8 Nov',
    code: 'policy: P-10\nwhen:\n  answer.contains: [number, root_cause]\nthen:\n  require: evidence.sources >= 1\n  else: label_unverified\nlog: bruce.trace',
    events: [['Today 13:02', 'Copilot · S. Iyer', 'Answer on tool life trend', 'Labelled unverified']] },
  { id: 'P-11', cat: 'Sharing', name: 'Messages only to plant lists', stmt: 'Agents send email, Teams and WhatsApp messages only to approved plant distribution lists and named users.', scope: 'All agents', mode: 'Block', approver: '—', by: 'MCP Gateway · messaging', checks: 860, hits: 0, last: '—', ver: '1.0', upd: '1 Sep',
    code: 'policy: P-11\nwhen:\n  tool: [send_email, send_message, post_channel]\nthen:\n  allow_if: recipient in plant_lists\n  else: block\nlog: foundry.audit', events: [] },
  { id: 'P-12', cat: 'Sharing', name: 'Artefacts stay inside the company', stmt: 'Dashboards, reports, decks and documents in the Artefactory can be shared only with company accounts. External links are off.', scope: 'All users', mode: 'Block', approver: '—', by: 'Artefactory · Foundry', checks: 38, hits: 1, last: '17 Nov', ver: '1.0', upd: '1 Sep',
    code: 'policy: P-12\nwhen:\n  action: artefact.share\nthen:\n  allow_if: recipient.domain == company_domain\n  external_links: block\nlog: foundry.audit',
    events: [['17 Nov 15:44', 'S. Iyer', 'Share OEE war room with vendor email', 'Blocked']] },
  { id: 'P-13', cat: 'Cost & audit', name: 'Monthly AI budget', stmt: 'Alert the plant head when AI spend reaches 80 % and 100 % of the monthly budget of ₹2.50 L. Autopilot keeps running; new heavy jobs move to the local LLM.', scope: 'Platform', mode: 'Alert', approver: 'Plant head', by: 'Bruce usage meter', checks: 26, hits: 0, last: '—', ver: '1.0', upd: '1 Sep',
    code: 'policy: P-13\nbudget_inr_month: 250000\nalerts: [0.8, 1.0]\non_exceed:\n  route_heavy_jobs: local_llm\nnotify: plant_head', events: [] },
  { id: 'P-14', cat: 'Cost & audit', name: 'Audit trail retention', stmt: 'Every sign-in, data access, tool call, approval and change is kept for 7 years and cannot be edited.', scope: 'All products', mode: 'Enforced', approver: '—', by: 'Foundry audit log', checks: 48212, hits: 0, last: 'Continuous', ver: '1.0', upd: '1 Sep',
    code: 'policy: P-14\nscope: [signin, data_access, tool_call, approval, config_change]\nretention: 7y\nstorage: append_only', events: [] },
];
const MODE_CLS = { Block: 'bad', Approval: 'brand', 'Draft only': 'warn', 'Role-based': 'info', 'Local only': 'info', Enforced: 'good', Alert: 'warn' };

function pagePolicies() {
  const f = state.polCat || 'All';
  const list = POLICIES.filter(p => f === 'All' || p.cat === f);
  if (!list.find(p => p.id === state.pol)) state.pol = list[0].id;
  const p = POLICIES.find(x => x.id === state.pol);
  return headerBlock('Policies', 'Rules on what agents, Copilot and users may see and do. Every check is enforced in the platform and logged in the audit trail.', readOnlyChip() + `<span class="chip outline">Policy set v3.1 · signed off 18 Nov</span>`) +
    kpiStrip([
      { label: 'Policies', value: POLICIES.length, unit: '', foot: `${POLICY_CATS.length} categories` },
      { label: 'Checks today', value: '1,884', unit: '', foot: 'every tool call and share', live: 'pol' },
      { label: 'Blocked', value: '3', unit: 'today', foot: 'control writes and role scope' },
      { label: 'Held for approval', value: '4', unit: '', foot: 'see Messages' },
      { label: 'Control-system writes', value: '0', unit: '', foot: 'since go-live' },
      { label: 'Policy changes', value: '2', unit: 'this month', foot: 'approved by plant head' },
    ]) +
    `<div class="seg pol-cats" style="margin-bottom:12px">${['All', ...POLICY_CATS].map(c => `<button class="${c === f ? 'on' : ''}" data-polcat="${c}">${c}</button>`).join('')}</div>
    <div class="grid g-2">
      ${card('Policy set', `${list.length} shown`, `<div class="card-body flush"><table class="tbl"><thead><tr><th>ID</th><th>Policy</th><th>Effect</th><th class="r">Checks, 30 d</th><th class="r">Fired</th></tr></thead><tbody>${list.map(x => `<tr class="click ${x.id === state.pol ? 'sel' : ''}" data-pol="${x.id}">
        <td class="mono">${x.id}</td><td><div class="strong">${x.name}</div><div class="muted" style="font-size:11px">${x.cat} · ${x.scope}</div></td><td><span class="chip ${MODE_CLS[x.mode]}">${x.mode}</span></td><td class="r num">${x.checks.toLocaleString('en-IN')}</td><td class="r num">${x.hits}</td></tr>`).join('')}</tbody></table></div>`)}
      <section class="card">
        <div class="art-head"><span class="agent-mark" style="width:34px;height:34px">${ico('shield', 'style="width:17px;height:17px"')}</span><div style="flex:1;min-width:0"><div class="split"><span class="mono muted">${p.id}</span><span class="chip ${MODE_CLS[p.mode]}">${p.mode}</span><span class="muted" style="font-size:11px">v${p.ver} · updated ${p.upd}</span></div><h3 style="margin-top:4px">${p.name}</h3></div></div>
        <div class="card-body" style="padding-top:0"><p style="margin:0 0 10px">${p.stmt}</p>
          <div class="cp-kv" style="padding:0"><div><span>Applies to</span><b>${p.scope}</b></div><div><span>Approver</span><b>${p.approver}</b></div><div><span>Enforced by</span><b>${p.by}</b></div><div><span>Last fired</span><b>${p.last}</b></div></div>
          <div class="pol-k">Policy as code</div><pre class="pol-code">${p.code}</pre>
          <div class="pol-k">Recent enforcement</div>
          ${p.events.length ? `<table class="tbl"><tbody>${p.events.map(e => `<tr><td class="num muted" style="white-space:nowrap">${e[0]}</td><td>${e[1]}</td><td class="mono" style="font-size:11px">${e[2]}</td><td><span class="chip ${/Blocked|Denied/.test(e[3]) ? 'bad' : /Waiting|Drafted|unverified/.test(e[3]) ? 'warn' : 'good'}">${e[3]}</span></td></tr>`).join('')}</tbody></table>` : '<div class="muted" style="font-size:12px">No events in the last 30 days.</div>'}
          <div class="acts" style="margin-top:12px"><button class="btn sm" data-ask="Explain policy ${p.id} ${p.name} and when it applies">${ico('spark')} Explain with Copilot</button><button class="btn sm" data-toast="Change request sent to the policy owners. Policy changes need plant head approval.">Request a change</button></div>
        </div></section>
    </div>`;
}
function polClick(t) {
  if (t.dataset.polcat) { state.polCat = t.dataset.polcat; render(); return true; }
  if (t.dataset.pol) { state.pol = t.dataset.pol; render(); return true; }
  return false;
}
