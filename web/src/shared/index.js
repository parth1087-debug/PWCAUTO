import auto from './demos/auto.js';
import cement from './demos/cement.js';
import steel from './demos/steel.js';
export { createDB, DAYS, HOURS, GO_LIVE_DAYS_AGO } from './engine.js';
export { POLICIES, ENTERPRISE_CONNECTORS } from './common.js';
export { createTools, TOOL_SPECS } from './tools.js';
export { messagesFor, logsFor } from './content.js';

/** Add a new industry demo by creating shared/demos/<id>.js and listing it here. */
export const DEMOS = { auto, cement, steel };
export const DEMO_LIST = [auto, cement, steel].map(d => ({ id: d.id, name: d.name, industry: d.industry, company: d.company, site: d.site }));
