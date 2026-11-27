/** What is live in Faclon: the UNS workspace and the Bruce agents and skills created for each demo. */
export const UNS_BASE = 'https://uns.us.iosense.io/uns/';

export const DEPLOYED = {
  auto: {
    uns: { workspace: 'ws_ZsvYBbez4H', name: 'PwC demo · Auto components', nodes: 94, edges: 27 },
    agents: {
      'auto.asset-health': '6b09249bbee99942f628d582', 'auto.maintenance-planner': '6b0924c7bee99942f628d587',
      'auto.cost-conversion': '6b0924c8bee99942f628d58b', 'auto.quality': '6b0924c8bee99942f628d58f',
      'auto.energy': '6b0924c9bee99942f628d593', 'auto.shift-report': '6b0924cabee99942f628d597',
    },
  },
  cement: {
    uns: { workspace: 'ws_MKjfM9LH3n', name: 'PwC demo · Cement', nodes: 62, edges: 15 },
    agents: {
      'cement.process': '6b0924cbbee99942f628d59b', 'cement.asset-health': '6b0924ccbee99942f628d59f',
      'cement.maintenance-planner': '6b0924ccbee99942f628d5a4', 'cement.quality': '6b0924fcbee99942f628d5bf',
      'cement.energy': '6b0924fdbee99942f628d5c3', 'cement.shift-report': '6b0924febee99942f628d5c7',
    },
  },
  steel: {
    uns: { workspace: 'ws_TGBJVxMdCC', name: 'PwC demo · Steel', nodes: 45, edges: 10 },
    agents: {
      'steel.asset-health': '6b0924febee99942f628d5cb', 'steel.maintenance-planner': '6b0924ffbee99942f628d5cf',
      'steel.yield': '6b092500bee99942f628d5d3', 'steel.quality': '6b092501bee99942f628d5d7',
      'steel.energy': '6b092502bee99942f628d5db', 'steel.shift-report': '6b092503bee99942f628d5df',
    },
  },
};
