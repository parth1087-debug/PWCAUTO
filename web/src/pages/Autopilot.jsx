import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { useApp } from '../App.jsx';
import { PageHead, Tabs, Tag, Toggle, Card } from '../components/ui.jsx';
import { fmtRel } from '../lib/data.js';

export default function Autopilot() {
  const app = useApp();
  const { ctx, prefs, setPrefs, actions, toast, addLog, extraLogs } = app;
  const [tab, setTab] = useState('schedules');
  const key = n => `${ctx.demo.id}|${n}`;
  const runs = [...extraLogs.filter(l => l.demo === ctx.demo.id && l.src === 'Autopilot'), ...ctx.logs.filter(l => l.src === 'Autopilot' || l.ev.startsWith('approval') || l.ev === 'session.start')];
  const runNow = s => {
    const type = s[1] === 'Excel' ? 'xlsx' : 'report';
    const kind = /asset/i.test(s[0]) ? 'assets' : /energy|heat/i.test(s[0]) ? 'energy' : 'daily';
    actions.createArtefact({ type, name: s[0], spec: { kind }, demo: ctx.demo.id, note: 'Run now from Autopilot' });
    addLog('Autopilot', 'schedule.run', s[0], `Run now by ${app.user.name}`);
    toast(`${s[0]} generated and saved to the Artefactory.`);
  };
  return (
    <div className="page">
      <PageHead title="Autopilot" sub="Reports and workflows that run on a schedule or a plant event. Anything that changes a plant system waits for a named approver." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'schedules', label: 'Report schedules', n: ctx.demo.schedules.length }, { id: 'workflows', label: 'Workflows', n: ctx.demo.workflows.length }, { id: 'runs', label: 'Run history' }]} />
      {tab === 'schedules' && <Card flush><div className="scroll-x"><table className="t"><thead><tr><th>Report</th><th>Format</th><th>Agent</th><th>Schedule</th><th>Recipients</th><th /><th>On</th></tr></thead><tbody>
        {ctx.demo.schedules.map(s => { const off = prefs.schedOff[key(s[0])]; return <tr key={s[0]}><td className="b">{s[0]}</td><td><Tag c={s[1] === 'Excel' ? 'good' : 'info'}>{s[1]}</Tag></td><td className="muted">{s[2]}</td><td>{s[3]}</td><td className="muted">{s[4]}</td>
          <td><button className="btn sm" onClick={() => runNow(s)}><Play />Run now</button></td>
          <td><Toggle on={!off} label={s[0]} onChange={v => { setPrefs(p => ({ ...p, schedOff: { ...p.schedOff, [key(s[0])]: !v } })); toast(`${s[0]} ${v ? 'turned on' : 'paused'}`); }} /></td></tr>; })}
      </tbody></table></div></Card>}
      {tab === 'workflows' && <div className="grid" style={{ gap: 12 }}>{ctx.demo.workflows.map(([name, steps]) => { const off = prefs.wfOff[key(name)]; return (
        <Card key={name} title={name} actions={<Toggle on={!off} label={name} onChange={v => { setPrefs(p => ({ ...p, wfOff: { ...p.wfOff, [key(name)]: !v } })); toast(`${name} ${v ? 'turned on' : 'paused'}`); }} />}>
          <div className="flow">{steps.map(([k, v], i) => <div key={i} className={`st ${k}`}><b>{k}</b>{v}</div>)}</div>
        </Card>); })}</div>}
      {tab === 'runs' && <Card flush><table className="t"><thead><tr><th>When</th><th>Run</th><th>Event</th><th>Result</th></tr></thead><tbody>
        {runs.slice(0, 30).map((l, i) => <tr key={i}><td className="num muted">{fmtRel(l.time)}</td><td className="b">{l.actor}</td><td className="mono" style={{ fontSize: 11.5 }}>{l.ev}</td><td>{l.obj} · <span className="muted">{l.msg}</span></td></tr>)}
      </tbody></table></Card>}
    </div>
  );
}
