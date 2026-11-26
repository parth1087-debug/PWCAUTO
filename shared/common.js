/* Shared building blocks for every industry demo. */

export const PLANTDB_TOOLS = [
  'plantdb.uns_browse', 'plantdb.uns_search', 'plantdb.get_tag_history', 'plantdb.get_kpis', 'plantdb.get_kpi_trend',
  'plantdb.get_asset_health', 'plantdb.diagnose_asset', 'plantdb.get_production', 'plantdb.get_oee_losses',
  'plantdb.get_energy', 'plantdb.get_quality', 'plantdb.list_messages', 'plantdb.search_docs',
];

/** Bruce agent definitions, the same shape that bruce/push-to-bruce.mjs sends to the gateway. */
export function makeAgents(demo, specs) {
  return specs.map(s => ({
    id: `${demo}.${s.key}`,
    name: s.name,
    version: s.version || '1.0.0',
    status: 'active',
    model: { primary: s.model || 'frontier-llm', fallback: 'local-llm', confidential_route: 'local-llm' },
    instructions: s.instructions,
    skills: s.skills,
    tools: s.tools,
    triggers: s.triggers || [{ type: 'prompt' }],
    can_call: s.canCall || [],
    autonomy: s.autonomy || 'advise',
    policies: s.policies || ['P-01', 'P-06', 'P-07', 'P-10'],
    data_scope: { demo, uns: `${s.uns}/#` },
    domain: s.domain,
  }));
}

export const POLICIES = [
  { id: 'P-01', cat: 'Plant safety', name: 'No writes to control systems', mode: 'Block', scope: 'All agents', approver: '—', by: 'I/O Connect · MCP Gateway',
    stmt: 'Agents never write to PLC, DCS or SCADA. Setpoint changes are drafted as change requests only.',
    code: 'policy: P-01\nwhen:\n  tool.category: control_system_write\nthen: block\nnotify: [requesting_user, ot_lead]\nlog: foundry.audit' },
  { id: 'P-02', cat: 'Plant safety', name: 'Recipe and setpoint changes need a change notice', mode: 'Draft only', scope: 'All agents and users', approver: 'Process in-charge', by: 'Bruce approval service',
    stmt: 'Changes to recipes or process setpoints go to the process in-charge with a process change notice.',
    code: 'policy: P-02\nwhen:\n  action: change_request\n  object.type: [recipe, setpoint]\nthen:\n  draft_only: true\n  require_approval: process_incharge\nlog: foundry.audit' },
  { id: 'P-03', cat: 'Approvals', name: 'Work orders above ₹50,000', mode: 'Approval', scope: 'Maintenance Planner', approver: 'Maintenance head (delegate: plant head)', by: 'MCP Gateway · SAP PM',
    stmt: 'Work orders with estimated cost above ₹50,000 wait for the maintenance head. When away, the plant head approves.',
    code: 'policy: P-03\nwhen:\n  tool: sap_pm.create_order\n  order.cost_inr: "> 50000"\nthen:\n  require_approval: maintenance_head\n  delegate_when_absent: plant_head\nlog: foundry.audit' },
  { id: 'P-04', cat: 'Approvals', name: 'Purchase requisitions', mode: 'Approval', scope: 'All agents', approver: 'Plant head', by: 'MCP Gateway · SAP MM',
    stmt: 'Any purchase requisition raised by an agent needs the plant head, with quotes and payback attached.',
    code: 'policy: P-04\nwhen:\n  tool: sap_mm.create_purchase_req\nthen:\n  require_approval: plant_head\n  require_fields: [quotes, payback]\nlog: foundry.audit' },
  { id: 'P-05', cat: 'Approvals', name: 'Quality hold and release', mode: 'Approval', scope: 'Quality agent', approver: 'QA in-charge (hold) · Quality head (release)', by: 'MCP Gateway · SAP QM',
    stmt: 'Agents may raise a quality hold with QA approval. Only the quality head may release a hold.',
    code: 'policy: P-05\nrules:\n  - when: { tool: sap_qm.create_quality_hold }\n    then: { require_approval: qa_incharge }\n  - when: { tool: sap_qm.release_hold }\n    then: { require_approval: quality_head, agents: block }' },
  { id: 'P-06', cat: 'Data & privacy', name: 'Role-based data access', mode: 'Role-based', scope: 'All users and agents', approver: '—', by: 'Foundry policy engine',
    stmt: 'Users, Copilot and agents see only the demos, plants, areas and data their role allows. Each demo has its own database.',
    code: 'policy: P-06\nsubject: [user, copilot, agent]\nresource: [demo, plant, area, asset, data_type]\neffect: allow_if role.scope contains resource\nlog: foundry.audit' },
  { id: 'P-07', cat: 'Data & privacy', name: 'Confidential documents stay on site', mode: 'Local only', scope: 'All agents', approver: '—', by: 'Bruce model router',
    stmt: 'Documents marked confidential are processed only by the local LLM, never a cloud model.',
    code: 'policy: P-07\nwhen:\n  document.label: confidential\nthen:\n  model_route: local_llm\n  cloud_models: block' },
  { id: 'P-08', cat: 'AI & models', name: 'Agent-proposed ontology changes', mode: 'Approval', scope: 'All agents', approver: 'Faclon SME + plant SME', by: 'Ontology version control',
    stmt: 'Agents may propose new objects, links or tag mappings in the UNS. Two SMEs confirm before the change is applied.',
    code: 'policy: P-08\nwhen:\n  action: ontology.propose_change\nthen:\n  require_approval: [faclon_sme, plant_sme]\n  apply: new_version' },
  { id: 'P-09', cat: 'AI & models', name: 'New models run in shadow first', mode: 'Approval', scope: 'Deepsense models', approver: 'Model owner', by: 'Deepsense registry',
    stmt: 'A new model version runs beside the live one for 7 days before a named approver promotes it.',
    code: 'policy: P-09\nwhen:\n  action: model.promote\nthen:\n  require: shadow_days >= 7\n  require_approval: model_owner' },
  { id: 'P-10', cat: 'AI & models', name: 'Answers must cite plant data', mode: 'Enforced', scope: 'Copilot and all agents', approver: '—', by: 'Bruce evaluation harness',
    stmt: 'Answers that state a number or a cause must show the data source. Answers without evidence are marked unverified.',
    code: 'policy: P-10\nwhen:\n  answer.contains: [number, root_cause]\nthen:\n  require: evidence.sources >= 1\n  else: label_unverified' },
  { id: 'P-11', cat: 'Sharing', name: 'Messages only to plant lists', mode: 'Block', scope: 'All agents', approver: '—', by: 'MCP Gateway · messaging',
    stmt: 'Agents send email, Teams and WhatsApp messages only to approved distribution lists.',
    code: 'policy: P-11\nwhen:\n  tool: [send_email, send_message]\nthen:\n  allow_if: recipient in plant_lists\n  else: block' },
  { id: 'P-12', cat: 'Cost & audit', name: 'Monthly AI budget', mode: 'Alert', scope: 'Platform', approver: 'Plant head', by: 'Bruce usage meter',
    stmt: 'Alert at 80 % and 100 % of the monthly AI budget. Heavy jobs then move to the local LLM.',
    code: 'policy: P-12\nbudget_inr_month: 250000\nalerts: [0.8, 1.0]\non_exceed:\n  route_heavy_jobs: local_llm' },
  { id: 'P-13', cat: 'Cost & audit', name: 'Audit trail retention', mode: 'Enforced', scope: 'All products', approver: '—', by: 'Foundry audit log',
    stmt: 'Every sign-in, data access, tool call, approval and change is kept for 7 years and cannot be edited.',
    code: 'policy: P-13\nscope: [signin, data_access, tool_call, approval, config_change]\nretention: 7y\nstorage: append_only' },
];

export const ENTERPRISE_CONNECTORS = [
  { id: 'plantdb', name: 'Plant DB (demo)', kind: 'MCP', system: 'This app · segregated per demo', tools: 13, access: 'Read only', note: 'mcp/server.mjs' },
  { id: 'sap_pm', name: 'SAP PM', kind: 'MCP', system: 'SAP S/4HANA', tools: 5, access: 'Read + gated actions', note: 'P-03' },
  { id: 'sap_mm', name: 'SAP MM', kind: 'MCP', system: 'SAP S/4HANA', tools: 3, access: 'Read + gated actions', note: 'P-04' },
  { id: 'sap_qm', name: 'SAP QM', kind: 'MCP', system: 'SAP S/4HANA', tools: 3, access: 'Read + gated actions', note: 'P-05' },
  { id: 'mes', name: 'MES', kind: 'MCP', system: 'Production and genealogy', tools: 5, access: 'Read only', note: '' },
  { id: 'deepsense', name: 'Deepsense models', kind: 'MCP', system: 'Faclon Deepsense', tools: 5, access: 'Run models', note: 'P-09' },
  { id: 'docs', name: 'Documents', kind: 'MCP', system: 'SOPs, manuals, RCAs', tools: 2, access: 'Read only', note: 'P-07' },
  { id: 'msg', name: 'Teams · Email · WhatsApp', kind: 'MCP', system: 'Messaging', tools: 3, access: 'Send', note: 'P-11' },
  { id: 'ot', name: 'Control systems (PLC / DCS / SCADA)', kind: 'I/O Connect', system: 'OT network via DMZ', tools: 0, access: 'Write disabled', note: 'P-01' },
];
