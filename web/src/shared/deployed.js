/** What is live in Faclon: the UNS workspace and the Bruce agents and skills created for each demo. */
export const UNS_BASE = 'https://uns.us.iosense.io/uns/';

/** The plantdb MCP server, hosted on Faclon Forge (project pwc-plantdb-mcp). Redeploy deployment dep-pwc-plantdb-mcp-adf6ef after server changes. */
export const PLANTDB_URL = 'https://pwc-plantdb.us.iosense.io/mcp';

export const DEPLOYED = {
  auto: {
    uns: { workspace: 'ws_ZsvYBbez4H', name: 'Faclon demo · Auto components', nodes: 94, edges: 27 },
    copilot: '6b093960bee99942f628db17', // Plant Copilot: the agent the app's Copilot talks to through the Bruce agent API
    agents: {
      'auto.asset-health': '6b09249bbee99942f628d582', 'auto.maintenance-planner': '6b0924c7bee99942f628d587',
      'auto.cost-conversion': '6b0924c8bee99942f628d58b', 'auto.quality': '6b0924c8bee99942f628d58f',
      'auto.energy': '6b0924c9bee99942f628d593', 'auto.shift-report': '6b0924cabee99942f628d597',
    },
  },
  cement: {
    uns: { workspace: 'ws_MKjfM9LH3n', name: 'Faclon demo · Cement', nodes: 62, edges: 15 },
    copilot: '6b093961bee99942f628db1b', // Plant Copilot: the agent the app's Copilot talks to through the Bruce agent API
    agents: {
      'cement.process': '6b0924cbbee99942f628d59b', 'cement.asset-health': '6b0924ccbee99942f628d59f',
      'cement.maintenance-planner': '6b0924ccbee99942f628d5a4', 'cement.quality': '6b0924fcbee99942f628d5bf',
      'cement.energy': '6b0924fdbee99942f628d5c3', 'cement.shift-report': '6b0924febee99942f628d5c7',
    },
  },
  ems: {
    uns: { workspace: 'ws_qFAh35wBgB', name: 'Faclon demo · Energy & utilities', nodes: 292, edges: 75 },
    copilot: '6b099042bee99942f628ddd9', // Plant Copilot on Claude; needs the Forge secret BRUCE_KEY_EMS to go live
    agents: {
      'ems.energy-optimizer': '6b099076bee99942f628ddde', 'ems.power-quality': '6b099076bee99942f628dde2',
      'ems.utility-health': '6b099076bee99942f628dde6', 'ems.demand-tariff': '6b099077bee99942f628ddea',
      'ems.thermal': '6b099077bee99942f628ddee', 'ems.daily-report': '6b099077bee99942f628ddf2',
    },
  },
  steel: {
    uns: { workspace: 'ws_TGBJVxMdCC', name: 'Faclon demo · Steel', nodes: 45, edges: 10 },
    copilot: '6b093961bee99942f628db1f', // Plant Copilot: the agent the app's Copilot talks to through the Bruce agent API
    agents: {
      'steel.asset-health': '6b0924febee99942f628d5cb', 'steel.maintenance-planner': '6b0924ffbee99942f628d5cf',
      'steel.yield': '6b092500bee99942f628d5d3', 'steel.quality': '6b092501bee99942f628d5d7',
      'steel.energy': '6b092502bee99942f628d5db', 'steel.shift-report': '6b092503bee99942f628d5df',
    },
  },
};
