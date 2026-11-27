/* App configuration. Change the login here. This is a demo gate only: it runs in the browser and is not real security. */
export const LOGIN = { username: 'faclon', password: 'Demo@2026' };

/** One master user with access to every demo. Each sub user sees one industry demo and its own database. */
export const DEFAULT_USERS = [
  { id: 'master', name: 'Master', role: 'Global admin', demos: ['*'], color: '#192839', master: true },
  { id: 'auto', name: 'Auto components', role: 'Demo · Northstar Drive Components', demos: ['auto'], color: '#2F55D4' },
  { id: 'cement', name: 'Cement', role: 'Demo · Aravali Cement', demos: ['cement'], color: '#8a5a00' },
  { id: 'steel', name: 'Steel', role: 'Demo · Konark Steel', demos: ['steel'], color: '#2459a6' },
  { id: 'pharma-api', name: 'Pharma API', role: 'Demo · Vardhan Life Sciences', demos: ['pharma-api'], color: '#7a3db8' },
  { id: 'pharma-formulation', name: 'Pharma formulation', role: 'Demo · Aarogya Pharmaceuticals', demos: ['pharma-formulation'], color: '#0e8a7d' },
  { id: 'solar', name: 'Solar', role: 'Demo · Suryodaya Renewables', demos: ['solar'], color: '#c98a00' },
  { id: 'wind', name: 'Wind', role: 'Demo · Pavan Wind Energy', demos: ['wind'], color: '#2f7fb8' },
];
