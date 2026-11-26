import React, { useEffect, useMemo } from 'react';
import { Plus, Sparkles } from 'lucide-react';
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

  const hello = (
    <div className="hello">
      <Sparkles size={26} color="var(--brand)" />
      <h2>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]}</h2>
      <div className="muted">{ctx.demo.company} · {ctx.demo.site} · {ctx.demo.agents.length} agents on Bruce</div>
      <div className="brief">
        <button onClick={() => nav('messages')}><div className="n">{approvals}</div><div className="s">approvals waiting</div></button>
        <button onClick={() => nav('messages')}><div className="n" style={{ color: alerts ? 'var(--bad)' : undefined }}>{alerts}</div><div className="s">open alerts</div></button>
        <button onClick={() => nav('d/maintenance')}><div className="n">{risk.length}</div><div className="s">assets in alarm{risk[0] ? ` · ${risk[0].id}` : ''}</div></button>
        <button onClick={() => nav('d/kpis')}><div className="n">{fmtNum(oee.value, oee.dec)}<span className="muted" style={{ fontSize: 12 }}> {oee.unit}</span></div><div className="s">{oee.name}, 7 days</div></button>
      </div>
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
