/* Sidebar sections. Decision boards tell a story and prompt a decision (briefings, RCA, recommendations, plans, capex).
   Monitoring is for watching the plant live (live KPI boards, SCADA-like views, networks, trends).
   A curated catalogue per plant sets { section, group, order } on seeded artefacts; other artefacts are classified by type. */
export const SECTION_LABEL = { decision: 'Decision boards', monitoring: 'Monitoring' };

/* artefact key (without the '<demo>-' prefix) → [section, group, order, name?] */
export const CATALOGUE = {
  ems: {
    'brief': ['decision', 'Briefings and reports', 1, 'Daily energy briefing'],
    'review': ['decision', 'Briefings and reports', 2, 'Monthly energy review'],
    'rca': ['decision', 'Act now', 3, 'Alerts · RCA and recommendations'],
    'maintenance': ['decision', 'Act now', 4, 'Utility maintenance recommendations'],
    'setpoints': ['decision', 'Optimise', 5, 'Utility setpoint optimisation'],
    'cost': ['decision', 'Optimise', 6, 'Energy cost and loss reduction'],
    'supply': ['decision', 'Plan', 7, 'Energy supply and demand plan'],
    'tariff': ['decision', 'Plan', 8, 'Tariff and contract demand advisory'],
    'capex': ['decision', 'Invest', 9, 'Capex recommendations · energy audit'],
    'overview': ['monitoring', 'Live dashboards', 1, 'Energy overview · live'],
    'energy': ['monitoring', 'Live dashboards', 2],
    'd-spec': ['monitoring', 'Live dashboards', 3],
    'd-demand': ['monitoring', 'Live dashboards', 4],
    'realtime': ['monitoring', 'Live dashboards', 5, 'Utilities live monitor'],
    'trends': ['monitoring', 'Live dashboards', 6, 'Trend explorer'],
    'mimic-energy-flow': ['monitoring', 'Power network', 7],
    'mimic-sld': ['monitoring', 'Power network', 8],
    'mimic-busbar': ['monitoring', 'Power network', 9],
    'd-transformers': ['monitoring', 'Power network', 10],
    'mimic-power-quality': ['monitoring', 'Power network', 11, 'Power quality · live panel'],
    'quality': ['monitoring', 'Power network', 12, 'Power quality · compliance'],
    'mimic-dg-vfd': ['monitoring', 'Power network', 13],
    'mimic-air-network': ['monitoring', 'Utility networks', 14],
    'mimic-chw-circuit': ['monitoring', 'Utility networks', 15],
    'mimic-steam-network': ['monitoring', 'Utility networks', 16],
    'mimic-gas-network': ['monitoring', 'Utility networks', 17],
  },
};

/** Extra EMS decision artefacts (seeded only for plants that list them). key → { type, name, spec } */
export const EXTRA_DECISION = {
  ems: [
    { key: 'brief', type: 'html', spec: { kind: 'ems-brief' } },
    { key: 'review', type: 'html', spec: { kind: 'ems-review' } },
    { key: 'supply', type: 'dash', spec: { view: 'supply-plan' } },
    { key: 'tariff', type: 'dash', spec: { view: 'tariff' } },
    { key: 'capex', type: 'dash', spec: { view: 'capex' } },
    { key: 'trends', type: 'dash', spec: { view: 'trends' } },
  ],
};

/** Section of an artefact: its own spec.section, else a default by type (plants not yet curated). */
export function sectionOf(a) {
  if (a.spec?.section) return a.spec.section === 'none' ? null : a.spec.section;
  const v = a.spec?.view;
  if (a.type === 'dash' && ['mimic', 'realtime', 'twin', 'overview', 'energy', 'trends'].includes(v)) return 'monitoring';
  if ((a.type === 'dash' && ['rca', 'setpoints', 'maintenance', 'supply-plan', 'tariff', 'capex', 'cost'].includes(v)) || a.type === 'html') return 'decision';
  return null;
}
export const groupOf = a => a.spec?.group || (sectionOf(a) === 'monitoring' ? (a.spec?.view === 'mimic' ? 'Process views' : 'Live dashboards') : a.type === 'html' ? 'Briefings and reports' : 'Recommendations');
