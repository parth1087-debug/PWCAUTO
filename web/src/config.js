/* App configuration. Change the login here. This is a demo gate only: it runs in the browser and is not real security. */
export const LOGIN = { username: 'pwc', password: 'Demo@2026' };

/** One master user with access to every demo. Each sub user sees one industry demo and its own database. */
export const DEFAULT_USERS = [
  { id: 'master', name: 'Master', role: 'Global admin', demos: ['*'], color: '#1d1d1b', master: true },
  { id: 'auto', name: 'Auto components', role: 'Demo · Northstar Drive Components', demos: ['auto'], color: '#d04a02' },
  { id: 'cement', name: 'Cement', role: 'Demo · Aravali Cement', demos: ['cement'], color: '#8a5a00' },
  { id: 'steel', name: 'Steel', role: 'Demo · Konark Steel', demos: ['steel'], color: '#2459a6' },
];
