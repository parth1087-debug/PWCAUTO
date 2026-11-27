/** Plant knowledge as text: the same brief, documents and policies the Bruce knowledge skills carry. */
import { POLICIES } from './common.js';

export function plantBrief(d) {
  const kpis = d.kpis.map(k => `| ${k.id} | ${k.name} | ${k.unit} | ${k.base} | ${k.cur} | ${k.target} | ${k.better === 'up' ? 'higher' : 'lower'} | ${k.lakh || '—'} | ${k.owner} |`).join('\n');
  const ev = d.events.filter(e => e.title).map(e => `### ${e.asset} · ${e.title}\n- Agent: ${e.agent}. Severity: ${e.severity}. Health ${e.health ?? '—'}, life left ${e.rulDays ?? '—'} days.\n- Diagnosis: ${e.diagnosis.title} (confidence ${e.diagnosis.confidence}).\n${e.diagnosis.points.map(p => `- ${p}`).join('\n')}\n- Recommendation: ${e.diagnosis.reco}`).join('\n\n');
  const appr = d.approvals.map(a => `- ${a.title} (${a.from}, policy ${a.policy}): ${a.table.map(r => `${r[0]}: ${r[1]}`).join('; ')}`).join('\n');
  const assets = d.areas.map(a => `- **${a.name}**: ${a.lines.map(l => `${l.name} (${l.assets.map(x => `${x[0]} ${x[1]}, crit ${x[3]}`).join('; ')})`).join(' · ')}`).join('\n');
  return `# Plant brief · ${d.company}, ${d.site}\n\n${d.industry}. Location: ${d.location}. Plan: ${d.production.planPerDay} ${d.production.unit} per day. Contract demand: ${d.energy.contractKVA} kVA.\nBaseline = the 3 months before go-live; go-live was about 3 months ago. Demo data.\n\n## KPIs (id, name, unit, baseline, current, target, better, ₹ lakh/yr realised, owner)\n\n| id | KPI | Unit | Baseline | Current | Target | Better | ₹ lakh/yr | Owner |\n|---|---|---|---|---|---|---|---|---|\n${kpis}\n\n## Open issues\n\n${ev}\n\n## Approvals waiting\n\n${appr}\n\n## Assets\n\n${assets}\n\n## Losses (this month)\n\n${d.cost.losses.map(l => `- ${l[0]}: ${l[1]} h`).join('\n')}\n\nOEE by line: ${d.cost.lines.map(l => `${l[0]} A${l[1]} P${l[2]} Q${l[3]} (top loss: ${l[4]})`).join('; ')}.\n`;
}

export function plantDocs(d) {
  return `# Documents · ${d.company}\n\n${d.docs.map(x => `## ${x.name}\n\nType: ${x.type}. Linked to: ${x.obj}. ${x.pages} pages.\n\n${x.pass.map(p => `> ${p[0]} (${p[1]})`).join('\n\n')}`).join('\n\n')}\n`;
}

export function policiesText() {
  return `# Policies\n\n${POLICIES.map(p => `## ${p.id} · ${p.name} (${p.mode})\n\n${p.stmt} Approver: ${p.approver}. Enforced by: ${p.by}.`).join('\n\n')}\n`;
}

export function skillSteps(d, agent) {
  return d.skills.filter(s => agent.skills.includes(s.id)).map(s => `### ${s.name} (pwc-${d.id}-${s.id})\n${s.steps.map((x, i) => `${i + 1}. ${x}`).join('\n')}`).join('\n\n');
}
