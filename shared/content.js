/* Messages and logs derived from each demo's events, approvals and schedules. Times are relative to now. */

export function messagesFor(db) {
  const d = db.demo;
  const out = [];
  d.approvals.forEach(a => out.push({ id: `${d.id}-${a.id}`, type: 'approval', sev: 'approval', from: a.from, time: db.at(a.minutesAgo),
    title: a.title, table: a.table, policy: a.policy, prompt: a.prompt, actions: ['approve', 'reject'] }));
  d.events.filter(e => e.title).forEach(e => out.push({ id: `${d.id}-${e.id}`, type: e.severity === 'bad' ? 'alert' : 'insight', sev: e.severity,
    from: e.agent, time: db.at(e.minutesAgo), title: e.title, asset: e.asset, tag: e.tag, diagnosis: e.diagnosis,
    evid: [db.unsPath(db.assetById[e.asset], e.tag)], prompt: `Why is ${e.asset} ${db.tagDef(e.asset, e.tag).name.toLowerCase()} changing?`,
    actions: e.severity === 'bad' ? ['ack'] : ['done'] }));
  out.push({ id: `${d.id}-r1`, type: 'report', sev: 'info', from: 'Shift Report Agent', time: db.at(95), title: `Daily performance report · ${new Date(db.at(24 * 60)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, report: 'daily', actions: [] });
  out.push({ id: `${d.id}-r2`, type: 'report', sev: 'info', from: 'Asset Health Agent', time: db.at(60 * 30), title: 'Weekly asset health report', report: 'assets', actions: [] });
  out.push({ id: `${d.id}-r3`, type: 'report', sev: 'info', from: 'Energy Agent', time: db.at(60 * 52), title: 'Energy and utilities summary · last 30 days', report: 'energy', actions: [] });
  return out.sort((a, b) => b.time - a.time);
}

export function logsFor(db) {
  const d = db.demo;
  const rows = [];
  const add = (m, lvl, src, actor, ev, obj, msg) => rows.push({ time: db.at(m), lvl, src, actor, ev, obj, msg, trace: 'tr-' + ((m * 7919 + d.id.length * 131) % 1048576).toString(16) });
  d.events.filter(e => e.title).forEach(e => {
    add(e.minutesAgo, e.severity === 'bad' ? 'WARN' : 'INFO', 'Agents', e.agent, 'session.end', e.asset, e.diagnosis.title);
    add(e.minutesAgo + 0.2, 'INFO', 'Tools', e.agent, 'tool.call plantdb.get_tag_history', db.unsPath(db.assetById[e.asset], e.tag), '168 points');
    add(e.minutesAgo + 0.4, 'INFO', 'Agents', e.agent, 'session.start', e.asset, 'Trigger: event');
  });
  d.approvals.forEach(a => add(a.minutesAgo, 'INFO', 'Access', a.from, 'approval.requested', a.title.slice(0, 48), `Policy ${a.policy}`));
  add(47, 'WARN', 'Tools', 'Energy Agent', 'tool.denied control.write_setpoint', d.areas[1].lines[0].assets[0][0], 'Blocked by policy P-01');
  add(130, 'WARN', 'Data', 'I/O Connect', 'tag.frozen', db.unsPath(db.assets[db.assets.length - 1], db.demo.classes[db.assets[db.assets.length - 1].cls].tags[0][0]), 'No change for 12 min');
  add(205, 'ERROR', 'Data', 'I/O Connect', 'connector.timeout', 'SAP CO OData', 'Timeout after 30 s · retry 2 of 3 succeeded');
  add(300, 'INFO', 'Autopilot', 'Shift Report Agent', 'schedule.run', d.schedules[0][0], 'Sent');
  add(420, 'INFO', 'Access', 'Master', 'user.signin', 'SSO · MFA', 'Hosur laptop');
  add(600, 'INFO', 'System', 'Deepsense', 'model.promoted', 'anomaly-detector v3.4', 'Shadow → live');
  add(900, 'INFO', 'System', 'Forge', 'backup.completed', `plantdb/${d.id}`, 'Snapshot 18 min');
  return rows.sort((a, b) => b.time - a.time);
}
