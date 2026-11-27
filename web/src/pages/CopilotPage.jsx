import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Sparkles, CheckCircle2, AlertTriangle, Wrench, Gauge, ArrowUpRight, MessageSquareText } from 'lucide-react';
import { liveStatus, liveFor } from '../lib/live.js';
import { useApp } from '../App.jsx';
import Chat from '../components/Chat.jsx';
import { runQuery } from '../lib/copilot.js';
import { fmtRel, fmtNum } from '../lib/data.js';
import { uid } from '../lib/store.js';

export default function CopilotPage({ id }) {
  const app = useApp();
  const { ctx, user, chats, setChats, nav, messages } = app;
  const key = `${user.id}|${ctx.demo.id}`;
  const threads = useMemo(() => {
    if (chats[key]) return chats[key];
    const seed = [ctx.demo.suggestions[1], ctx.demo.suggestions[2], ctx.demo.suggestions[4]].map((q, i) => ({ id: 's' + i, title: q, updated: Date.now() - (i + 1) * 5.3e6, turns: [{ q, r: runQuery(q, ctx), at: Date.now() - (i + 1) * 5.3e6 }] }));
    return seed;
  }, [chats, key, ctx]);
  const thread = threads.find(t => t.id === id);
  const save = list => setChats(c => ({ ...c, [key]: list }));

  const setTurns = turns => {
    if (thread) save(threads.map(t => (t.id === thread.id ? { ...t, turns, updated: Date.now() } : t)));
    else { const t = { id: uid(), title: turns[0].q.slice(0, 60), updated: Date.now(), turns }; save([t, ...threads]); nav('copilot/' + t.id); }
  };
  useEffect(() => {
    const f = e => { if (!thread) { const r = runQuery(e.detail, { ...ctx, actions: app.actions }); setTurns([{ q: e.detail, r, at: Date.now() }]); } };
    window.addEventListener('copilot-ask', f); return () => window.removeEventListener('copilot-ask', f);
  });

  const groups = [['Today', t => Date.now() - t.updated < 864e5], ['Earlier', t => Date.now() - t.updated >= 864e5]];
  const approvals = messages.filter(m => m.type === 'approval' && !m.state).length;
  const alerts = messages.filter(m => m.type === 'alert' && !m.state).length;
  const risk = ctx.db.healthAll().filter(a => a.health < 50);
  const oee = ctx.db.kpiSummary(ctx.demo.overview[0], ctx.db.anchor - 7 * 864e5, ctx.db.anchor);

  const [st, setSt] = useState(null);
  useEffect(() => { let on = true; liveStatus().then(v => on && setSt(v)); return () => { on = false; }; }, []);
  const live = app.prefs.live !== false && liveFor(st, ctx.demo.id);
  const h = new Date().getHours();
  const prompts = ctx.demo.suggestions.slice(0, 4);
  const hints = ['Ranked by impact, with the action for each', 'Diagnosis with evidence and remaining life', 'Against baseline and target, with the biggest loss', 'Peak demand, load profile and savings'];
  const cards = [
    { n: approvals, s: 'approvals waiting', to: 'messages', icon: CheckCircle2, tone: 'var(--brand)', bg: 'var(--brand-soft)' },
    { n: alerts, s: 'open alerts', to: 'messages', icon: AlertTriangle, tone: alerts ? 'var(--bad)' : 'var(--muted)', bg: alerts ? 'var(--bad-soft)' : 'var(--bg-3)' },
    { n: risk.length, s: `assets in alarm${risk[0] ? ` · ${risk[0].id}` : ''}`, to: 'd/maintenance', icon: Wrench, tone: risk.length ? 'var(--warn)' : 'var(--good)', bg: risk.length ? 'var(--warn-soft)' : 'var(--good-soft)' },
    { n: <>{fmtNum(oee.value, oee.dec)}<span className="muted" style={{ fontSize: 13, fontWeight: 500 }}> {oee.unit}</span></>, s: `${oee.name}, 7 days`, to: 'd/kpis', icon: Gauge, tone: 'var(--info)', bg: 'var(--info-soft)' },
  ];
  const hello = send => (
    <div className="hello2">
      <span className="pill">{live ? <><span className="live" />Live on Bruce · {ctx.demo.agents.length + 1} agents</> : <><Sparkles size={13} color="var(--brand)" />Copilot · {ctx.demo.agents.length} agents</>}</span>
      <h2>Good {h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}, <span>{user.name.split(' ')[0]}</span></h2>
      <p className="lead">{ctx.demo.company} · {ctx.demo.site}. Here is what needs you today.</p>
      <div className="brief2">{cards.map(c => (
        <button key={c.s} onClick={() => nav(c.to)}>
          <div className="row"><span className="i" style={{ background: c.bg, color: c.tone }}><c.icon size={15} /></span><ArrowUpRight size={14} className="right" color="var(--muted)" /></div>
          <div className="n">{c.n}</div><div className="s ellipsis">{c.s}</div>
        </button>))}</div>
      <div className="prompts">{prompts.map((q, i) => (
        <button key={q} onClick={() => send(q)}><MessageSquareText size={16} /><span><div className="q">{q}</div><div className="a">{hints[i] || 'Answered with live plant data'}</div></span></button>))}</div>
    </div>
  );

  return (
    <div className="page full">
      <div className="cp">
        <aside className="cp-hist">
          <button className="btn pri" style={{ width: '100%', justifyContent: 'center' }} onClick={() => nav('copilot')}><Plus />New chat</button>
          {groups.map(([g, f]) => threads.filter(f).length > 0 && <div key={g}><div className="g">{g}</div>
            {threads.filter(f).map(t => <a key={t.id} href={'#/copilot/' + t.id} className={`it ${t.id === id ? 'on' : ''}`}><span className="ellipsis" style={{ display: 'block' }}>{t.title}</span><small>{t.turns.at(-1).r.agent} · {fmtRel(t.updated)}</small></a>)}</div>)}
        </aside>
        <Chat key={thread ? thread.id : 'new|' + key} turns={thread ? thread.turns : []} onTurns={setTurns} hello={hello} />
      </div>
    </div>
  );
}
