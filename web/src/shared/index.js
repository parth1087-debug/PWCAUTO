import auto from './demos/auto.js';
import cement from './demos/cement.js';
import steel from './demos/steel.js';
import pharmaApi from './demos/pharma-api.js';
import pharmaFormulation from './demos/pharma-formulation.js';
import solar from './demos/solar.js';
import wind from './demos/wind.js';
import pipes from './demos/pipes.js';
import ems from './demos/ems.js';
import power from './demos/power.js';
export { createDB, DAYS, HOURS, GO_LIVE_DAYS_AGO } from './engine.js';
export { POLICIES, ENTERPRISE_CONNECTORS } from './common.js';
export { createTools, TOOL_SPECS } from './tools.js';
export { messagesFor, logsFor } from './content.js';
export { DEPLOYED, UNS_BASE, PLANTDB_URL } from './deployed.js';
export { ONTOLOGY, REL_LABEL, relationsOf, trace } from './ontology/index.js';
export { plantBrief, plantDocs, policiesText, skillSteps } from './knowledge.js';

/** Add a new industry demo by creating shared/demos/<id>.js and listing it here. */
export const DEMOS = { auto, cement, steel, 'pharma-api': pharmaApi, 'pharma-formulation': pharmaFormulation, solar, wind, pipes, ems, power };
export const DEMO_LIST = Object.values(DEMOS).map(d => ({ id: d.id, name: d.name, industry: d.industry, company: d.company, site: d.site }));
