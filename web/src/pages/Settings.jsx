import React, { useMemo, useState, useEffect } from 'react';
import { Copy, Trash2, UserPlus, Search } from 'lucide-react';
import { useApp } from '../App.jsx';
import { PageHead, Tabs, Tag, Card, Toggle, Av, Seg, Empty } from '../components/ui.jsx';
import { Bars, Trend } from '../components/charts.jsx';
import { DEPLOYED } from '../shared/index.js';
import { liveStatus, LIVE_BASE } from '../lib/live.js';
import { DEMO_LIST, getDB, fmtNum, fmtDate, fmtDateTime, fmtRel } from '../lib/data.js';
import { uid } from '../lib/store.js';

const TABS = [{ id: 'users', label: 'Users' }, { id: 'agents', label: 'Agents' }, { id: 'data', label: 'Data' }, { id: 'usage', label: 'Usage' }, { id: 'notifications', label: 'Notifications' }, { id: 'logs', label: 'Logs' }];

export default function Settings({ tab }) {
  const { nav } = useApp();
  return (
    <div className="page">
      <PageHead title="Settings" />
      <Tabs value={tab} onChange={t => nav('settings/' + t)} tabs={TABS} />
      {tab === 'users' && <Users />}{tab === 'agents' && <Agents />}{tab === 'data' && <Data />}
      {tab === 'usage' && <Usage />}{tab === 'notifications' && <Notifications />}{tab === 'logs' && <Logs />}
    </div>
  );
}

function Users() {
  const { users, setUsers, user, setUserId, toast, addLog, nav } = useApp();
  const [name, setName] = useState(''); const [demo, setDemo] = useState(DEMO_LIST[0].id);
  const add = () => { if (!name.trim()) return; const u = { id: 'u-' + uid(), name: name.trim(), role: `Demo · ${DEMO_LIST.find(d => d.id === demo).company}`, demos: [demo], color: ['#2f7d6d', '#7a3fa0', '#a83250', '#4f6b2a'][users.length % 4] }; setUsers([...users, u]); addLog('Access', 'user.create', u.name, `demo ${demo}`); toast(`${u.name} added`); setName(''); };
  return <div className="grid g32">
    <Card title="Users" sub="One login. Switching users needs no password. Each sub user sees only its demo database." flush>
      <table className="t"><thead><tr><th>User</th><th>Access</th><th>Database</th><th /></tr></thead><tbody>{users.map(u => <tr key={u.id}>
        <td><div className="row"><Av u={u} /><div><div className="b">{u.name}</div><div className="muted" style={{ fontSize: 11.5 }}>{u.role}</div></div></div></td>
        <td>{u.master ? <Tag c="brand">All demos · admin</Tag> : <Tag>{DEMO_LIST.find(d => d.id === u.demos[0])?.name}</Tag>}</td>
        <td className="mono muted">{u.master ? 'plantdb/*' : `plantdb/${u.demos[0]}`}</td>
        <td className="r"><div className="row" style={{ justifyContent: 'flex-end' }}>{u.id === user.id ? <Tag c="good">Signed in</Tag> : <button className="btn sm" onClick={() => { setUserId(u.id); nav('copilot'); }}>Switch</button>}
          {user.master && !u.master && !['auto', 'cement', 'steel'].includes(u.id) && <button className="ibtn" title="Remove" onClick={() => setUsers(users.filter(x => x.id !== u.id))}><Trash2 /></button>}</div></td></tr>)}</tbody></table>
    </Card>
    <Card title="Add a demo user" sub={user.master ? 'Master only' : 'Switch to Master to add users'}>
      <label className="muted" style={{ fontSize: 12 }}>Name</label><input className="inp" value={name} onChange={e => setName(e.target.value)} placeholder="For example: Pune plant demo" disabled={!user.master} />
      <label className="muted" style={{ fontSize: 12, display: 'block', marginTop: 10 }}>Demo database</label>
      <select className="inp" value={demo} onChange={e => setDemo(e.target.value)} disabled={!user.master}>{DEMO_LIST.map(d => <option key={d.id} value={d.id}>{d.name} · {d.company}</option>)}</select>
      <button className="btn pri" style={{ marginTop: 14 }} onClick={add} disabled={!user.master || !name.trim()}><UserPlus />Add user</button>
      <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>To add a new industry, add a config in <span className="mono">web/src/shared/demos/</span>. It gets its own database, agents and UNS.</p>
    </Card>
  </div>;
}

function LiveCard() {
  const { prefs, setPrefs, toast } = useApp();
  const [st, setSt] = useState(null);
  useEffect(() => { liveStatus(true).then(setSt); }, []);
  const on = prefs.live !== false;
  return <Card title="Live agents" sub="Copilot answers from the Bruce Plant Copilot agents, through the Bruce agent API" actions={<Toggle on={on} label="Live agents" onChange={v => { setPrefs(p => ({ ...p, live: v })); toast(v ? 'Live agents on' : 'Using the in-app engine'); }} />}>
    <dl className="kv">
      <dt>Status</dt><dd>{st == null ? 'Checking…' : st.live ? <><Tag c="good">Online</Tag> <span className="muted">{(st.liveDemos || []).join(', ')}</span></> : <Tag c="warn">Not configured</Tag>}</dd>
      <dt>Agents</dt><dd>{st?.agents && Object.keys(st.agents).length ? Object.values(st.agents).map(a => a.name).join(' · ') : st?.model ? `Claude · ${st.model}` : '—'}</dd>
      <dt>Server</dt><dd className="mono">{LIVE_BASE}/api/chat</dd>
      <dt>Fallback</dt><dd>In-app engine, when live is off or not reachable</dd>
    </dl>
  </Card>;
}

function Agents() {
  const { ctx, prefs, toast } = useApp();
  const [sel, setSel] = useState(ctx.demo.agents[0].id);
  const a = ctx.demo.agents.find(x => x.id === sel) || ctx.demo.agents[0];
  const live = DEPLOYED[ctx.demo.id] || { agents: {} };
  const json = JSON.stringify({ bruce_agent_id: live.agents[a.id] || null, bruce_name: `PwC ${ctx.demo.name.split(' ')[0]} · ${a.name}`, bruce_skills: [`pwc-${ctx.demo.id}-plant-knowledge`, ...a.skills.map(s => `pwc-${ctx.demo.id}-${s}`)], bruce_connectors: ['UNS Graph', 'Plant Data'], uns_workspace: live.uns?.workspace, ...a }, null, 2);
  return <div className="grid" style={{ gap: 16 }}>
    <LiveCard />
    <Card title="Agents on Bruce" sub={`${ctx.demo.agents.length} live in Bruce · UNS ${live.uns?.workspace || '—'}`} flush>
      <div className="scroll-x"><table className="t"><thead><tr><th>Agent</th><th>Bruce ID</th><th>Version</th><th>Model</th><th>Triggers</th><th className="r">Tools</th><th>Skills</th><th>Autonomy</th><th>Policies</th><th>Status</th></tr></thead><tbody>
        {ctx.demo.agents.map(x => <tr key={x.id} className={`click ${x.id === a.id ? 'on' : ''}`} onClick={() => setSel(x.id)}><td><div className="b">{x.name}</div><div className="mono muted" style={{ fontSize: 11 }}>{x.id}</div></td><td className="mono" style={{ fontSize: 11 }}>{live.agents[x.id] || '—'}</td><td className="mono">{x.version}</td><td className="mono" style={{ fontSize: 11.5 }}>{x.model.primary}</td>
          <td className="mono" style={{ fontSize: 11.5 }}>{x.triggers.map(t => t.type).join(', ')}</td><td className="r num">{x.tools.length}</td><td className="mono" style={{ fontSize: 11.5 }}>{x.skills.length}</td><td><Tag c={x.autonomy === 'act' ? 'warn' : x.autonomy === 'advise' ? '' : 'brand'}>{x.autonomy}</Tag></td><td className="mono" style={{ fontSize: 11.5 }}>{x.policies.join(' ')}</td><td><Tag c="good">{x.status}</Tag></td></tr>)}
      </tbody></table></div>
    </Card>
    <Card title={a.id} sub="definition" actions={<><button className="btn sm" onClick={() => { navigator.clipboard?.writeText(json); toast('Definition copied'); }}><Copy />Copy JSON</button></>}>
      <pre className="code" style={{ maxHeight: 420, overflow: 'auto' }}>{json}</pre>
    </Card>
  </div>;
}

function Data() {
  const { anchor, setAnchor, allowed, prefs, setPrefs, toast, ctx } = useApp();
  const [v, setV] = useState(anchor || new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16));
  return <div className="grid" style={{ gap: 16 }}>
    <div className="grid g2">
      <Card title="Demo clock" sub="Data stays the same. Only the timestamps move.">
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}><Seg value={anchor ? 'fixed' : 'live'} onChange={m => { if (m === 'live') { setAnchor(null); toast('Live: newest data point is now'); } else { setAnchor(v); toast('Demo clock fixed'); } }} options={[{ id: 'live', label: 'Live (now)' }, { id: 'fixed', label: 'Fixed date' }]} />
          <input className="inp" type="datetime-local" value={v} onChange={e => { setV(e.target.value); if (anchor) setAnchor(e.target.value); }} style={{ width: 210 }} /></div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>Now showing data up to <b style={{ color: 'var(--text)' }}>{fmtDateTime(ctx.db.anchor)} IST</b>. Six months of hourly history ends at this point. The MCP server does the same with <span className="mono">PLANTDB_ANCHOR</span>.</p>
      </Card>
      <Card title="Bruce gateway" sub="Used by the push script and shown in agent configs">
        <input className="inp" placeholder="https://<your-bruce>/mcp" value={prefs.bruceUrl} onChange={e => setPrefs(p => ({ ...p, bruceUrl: e.target.value }))} />
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>Agents in this app run on the built-in demo runtime with the same tools. To create them in your Bruce: <span className="mono">node bruce/push-to-bruce.mjs {ctx.demo.id}</span></p>
      </Card>
    </div>
    <Card title="Databases" sub="one per demo, segregated · served by the plantdb MCP connector" flush>
      <table className="t"><thead><tr><th>Database</th><th>Company</th><th className="r">Assets</th><th className="r">Tags</th><th className="r">Data points</th><th>History</th><th>Access</th></tr></thead><tbody>
        {DEMO_LIST.map(d => { const ok = allowed.includes(d.id); const s = ok ? getDB(d.id, anchor).db : null; const st = s?.stats();
          return <tr key={d.id}><td className="mono b">plantdb/{d.id}</td><td>{d.company}<div className="muted" style={{ fontSize: 11.5 }}>{d.industry}</div></td><td className="r num">{st ? st.assets : '—'}</td><td className="r num">{st ? st.tags : '—'}</td><td className="r num">{st ? fmtNum(st.points) : '—'}</td><td className="muted">{s ? `${fmtDate(s.tsDay(0))} – ${fmtDate(s.anchor)} · hourly` : 'Hidden'}</td><td>{ok ? <Tag c="good">Allowed</Tag> : <Tag c="bad">No access</Tag>}</td></tr>; })}
      </tbody></table>
    </Card>
  </div>;
}

function Usage() {
  const { ctx } = useApp();
  const days = Array.from({ length: 14 }, (_, i) => ({ t: ctx.db.anchor - (13 - i) * 864e5, copilot: 40 + ((i * 37) % 29), autopilot: 150 + ((i * 53) % 41) }));
  const byAgent = ctx.demo.agents.map((a, i) => ({ name: a.name, runs: 120 + ((i * 97) % 300) }));
  return <>
    <div className="kpis">{[['Copilot sessions', '1,842', 'this month'], ['Active users', '86', 'of 112'], ['Autopilot runs', '5,310', 'schedules + workflows'], ['Tokens', '41.6 M', '62 % on local LLM'], ['AI cost', '₹1.84 L', 'budget ₹2.50 L'], ['Answers rated useful', '92 %', '1,206 ratings']].map(k => <div key={k[0]} className="kpi"><div className="l">{k[0]}</div><div className="v">{k[1]}</div><div className="f">{k[2]}</div></div>)}</div>
    <div className="grid g21">
      <Card title="Sessions per day"><Trend data={days} series={[{ key: 'copilot', name: 'Copilot', type: 'bar', stack: 's' }, { key: 'autopilot', name: 'Autopilot', type: 'bar', stack: 's', color: '#b5b3ae' }]} days={14} height={220} /></Card>
      <Card title="Runs by agent"><Bars data={byAgent} series={[{ key: 'runs', name: 'Runs' }]} horizontal height={Math.max(180, byAgent.length * 34)} /></Card>
    </div>
  </>;
}

function Notifications() {
  const { prefs, setPrefs, toast } = useApp();
  const types = ['Approvals', 'Critical alerts', 'Warnings', 'Insights', 'Reports', 'Shared with me'], ch = ['In app', 'Email', 'Teams', 'WhatsApp'];
  const def = (i, j) => j === 0 || (i < 2 && j < 3) || (i === 4 && j === 1);
  return <Card title="Channels" sub="per message type · critical alerts escalate after 15 minutes" flush>
    <table className="t"><thead><tr><th>Message type</th>{ch.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{types.map((t, i) => <tr key={t}><td className="b">{t}</td>{ch.map((c, j) => { const k = `${i}-${j}`; const on = prefs.notif[k] ?? def(i, j);
      return <td key={c}><Toggle on={on} label={`${t} ${c}`} onChange={v => { setPrefs(p => ({ ...p, notif: { ...p.notif, [k]: v } })); toast('Saved'); }} /></td>; })}</tr>)}</tbody></table>
  </Card>;
}

function Logs() {
  const { ctx, extraLogs } = useApp();
  const [src, setSrc] = useState('All'); const [lvl, setLvl] = useState('All'); const [q, setQ] = useState(''); const [live, setLive] = useState(true); const [tail, setTail] = useState([]); const [open, setOpen] = useState(null);
  useEffect(() => { if (!live) return; const pool = [['INFO', 'Data', 'I/O Connect', 'ingest.batch', 'OPC UA', () => `${11000 + Math.floor(Math.random() * 3000)} points`], ['INFO', 'Tools', ctx.demo.agents[0].name, 'tool.call plantdb.get_tag_history', ctx.db.unsPath(ctx.db.assets[0]), () => '168 points'], ['INFO', 'Agents', ctx.demo.agents[2].name, 'model.call', 'local-llm', () => `${1200 + Math.floor(Math.random() * 1800)} tokens`]];
    const t = setInterval(() => { const p = pool[Math.floor(Math.random() * pool.length)]; setTail(x => [{ time: Date.now(), lvl: p[0], src: p[1], actor: p[2], ev: p[3], obj: p[4], msg: p[5](), trace: 'tr-' + uid() }, ...x].slice(0, 60)); }, 3000);
    return () => clearInterval(t); }, [live, ctx]);
  const rows = [...tail, ...extraLogs.filter(l => l.demo === ctx.demo.id), ...ctx.logs].filter(l => (src === 'All' || l.src === src) && (lvl === 'All' || l.lvl === lvl) && (!q || JSON.stringify(l).toLowerCase().includes(q.toLowerCase())));
  return <Card flush>
    <div className="row" style={{ padding: '12px 14px', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
      <Seg value={src} onChange={setSrc} options={['All', 'Agents', 'Tools', 'Data', 'Access', 'Autopilot', 'System'].map(x => ({ id: x, label: x }))} />
      <Seg value={lvl} onChange={setLvl} options={['All', 'INFO', 'WARN', 'ERROR'].map(x => ({ id: x, label: x === 'All' ? 'All levels' : x }))} />
      <label className="search" style={{ width: 240, background: 'var(--bg)' }}><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search events or trace IDs" style={{ border: 0, outline: 0, background: 'transparent', width: '100%' }} /></label>
      <span className="row right"><span className="muted" style={{ fontSize: 12 }}>Live tail</span><Toggle on={live} onChange={setLive} label="Live tail" /></span>
    </div>
    <div className="scroll-x"><table className="t"><thead><tr><th>Time</th><th>Level</th><th>Source</th><th>Actor</th><th>Event</th><th>Object</th><th>Trace</th></tr></thead><tbody>
      {rows.slice(0, 120).map(l => <React.Fragment key={l.trace + l.time}><tr className="click" onClick={() => setOpen(open === l.trace ? null : l.trace)}><td className="mono muted" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(l.time)}</td><td><Tag c={l.lvl === 'ERROR' ? 'bad' : l.lvl === 'WARN' ? 'warn' : ''}>{l.lvl}</Tag></td><td className="muted">{l.src}</td><td>{l.actor}</td><td className="mono" style={{ fontSize: 11.5 }}>{l.ev}</td><td className="ellipsis" style={{ maxWidth: 260 }}>{l.obj}</td><td className="mono muted">{l.trace}</td></tr>
        {open === l.trace && <tr><td colSpan={7}><pre className="code">{JSON.stringify({ ...l, time: new Date(l.time).toISOString(), demo: ctx.demo.id }, null, 2)}</pre></td></tr>}</React.Fragment>)}
      {!rows.length && <tr><td colSpan={7}><Empty>No events match.</Empty></td></tr>}
    </tbody></table></div>
  </Card>;
}
