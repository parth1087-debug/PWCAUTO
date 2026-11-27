import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, ChevronRight, ThumbsUp, ThumbsDown, Layers } from 'lucide-react';
import { useApp } from '../App.jsx';
import { runQuery } from '../lib/copilot.js';
import { createIntent, buildArtefact } from '../lib/copilot.js';
import { openInNewTab } from '../pages/Artefactory.jsx';
import { liveStatus, liveFor, staysLocal, pickAgent, streamChat, visualFor, actionsFor } from '../lib/live.js';
import Markdown from './Markdown.jsx';
import { Trend, Bars } from './charts.jsx';
import { fmtNum } from '../lib/data.js';

const md = s => String(s).split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : p));

export function Blocks({ blocks, onAct }) {
  return blocks.map((b, i) => {
    switch (b.type) {
      case 'text': return <p key={i}>{md(b.md)}</p>;
      case 'list': return <ul key={i}>{b.items.map((x, j) => <li key={j}>{md(x)}</li>)}</ul>;
      case 'kv': return <div key={i} className="box"><dl className="kv">{b.rows.map(r => <React.Fragment key={r[0]}><dt>{r[0]}</dt><dd>{r[1]}</dd></React.Fragment>)}</dl></div>;
      case 'table': return <div key={i} className="box scroll-x" style={{ padding: 0 }}><table className="t"><thead><tr>{b.head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k} className={typeof c === 'number' ? 'num' : ''}>{typeof c === 'number' ? fmtNum(c) : c}</td>)}</tr>)}</tbody></table></div>;
      case 'chart': return <div key={i} className="box"><div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{b.title}</div>
        {b.kind === 'bars' ? <Bars data={b.data} series={b.series} horizontal={b.horizontal} height={Math.max(160, b.data.length * 30)} /> : <Trend data={b.data} series={b.series} unit={b.unit} days={b.days} refs={b.refs} xRefs={b.xRefs} height={170} />}</div>;
      case 'quote': return <blockquote key={i} style={{ margin: '6px 0', padding: '8px 12px', borderLeft: '3px solid var(--brand)', background: 'var(--bg-2)', borderRadius: '0 6px 6px 0' }}>“{b.text}”<div className="muted" style={{ fontSize: 11.5 }}>{b.ref}</div></blockquote>;
      case 'code': return <pre key={i} className="code">{b.text}</pre>;
      case 'evidence': return <div key={i} className="chips">{b.items.map(e => <span key={e} className="tag line mono" style={{ fontSize: 10.5 }}>{e}</span>)}</div>;
      case 'actions': return <div key={i} className="chips" style={{ marginTop: 10 }}>{b.items.map(a => <button key={a.label} className={`btn sm ${a.pri ? 'pri' : ''}`} onClick={() => onAct(a.act)}>{a.label}</button>)}</div>;
      default: return null;
    }
  });
}

/** Chat thread. Page mode stores turns through onTurns; panel mode keeps them locally. */
export default function Chat({ turns: extTurns, onTurns, context, compact, hello }) {
  const app = useApp();
  const [local, setLocal] = useState([]);
  const turns = extTurns || local;
  const setTurns = onTurns || setLocal;
  const [pending, setPending] = useState(null);
  const [text, setText] = useState('');
  const body = useRef(null);
  useEffect(() => { if (body.current && (turns.length || pending)) body.current.scrollTop = body.current.scrollHeight; }, [turns, pending]);

  const act = a => {
    if (!a) return;
    if (a.type === 'nav') { app.closePanel(); app.nav(a.to); }
    else if (a.type === 'ask') send(a.q);
    else if (a.type === 'wo') app.actions.raiseWO(a.asset, a.title);
    else if (a.type === 'pin') { app.actions.pin(a.key); app.toast('Shortcuts updated'); }
    else if (a.type === 'tab') openInNewTab(a.id);
    else if (a.type === 'art') { app.closePanel(); app.nav('artefactory/' + a.id); }
    else if (a.type === 'toast') app.toast(a.text);
  };

  const abort = useRef(null);
  useEffect(() => () => abort.current?.abort(), []);

  const answerText = r => (r.live ? r.text : (r.blocks || []).filter(b => b.type === 'text' || b.type === 'list').map(b => (b.type === 'text' ? b.md : b.items.map(x => `- ${x}`).join('\n'))).join('\n'));

  async function send(q) {
    q = (q || text).trim(); if (!q || pending) return;
    setText('');
    if (app.prefs.live !== false && !staysLocal(q)) {
      setPending({ q, r: { agent: 'Connecting to agents…', cap: 'Live', steps: [], blocks: [], live: true, text: '' }, shown: 0 });
      const st = await liveStatus();
      if (liveFor(st, app.ctx.demo.id) && await sendLive(q)) return;
      setPending(null);
    }
    sendLocal(q);
  }

  /** Live: the demo's Bruce agent runs on Claude with the plantdb tools; the run streams in. Returns false to fall back. */
  async function sendLive(q) {
    const { demo, db } = app.ctx;
    const asset = db.assets.find(a => new RegExp(`\\b${a.id.replace('-', '-?')}\\b`, 'i').test(q));
    const agent = pickAgent(demo, q, asset?.id);
    const t0 = Date.now();
    const calls = []; const made = [];
    let r = { agent: agent.name, cap: 'Live', steps: [], blocks: [], live: true, text: '', model: '' };
    const show = () => setPending({ q, r: { ...r, steps: [...r.steps] }, shown: r.steps.filter(x => x.ms != null).length });
    show();
    const history = [...turns.slice(-5).flatMap(t => [{ role: 'user', content: t.q }, { role: 'assistant', content: answerText(t.r) || '(answer shown as a chart)' }]), { role: 'user', content: q }];
    const ctxText = context ? `${context.kind}: ${context.title}` : '';
    const session_id = [...turns].reverse().find(t => t.r?.live && t.r.sessionId)?.r.sessionId;
    abort.current = new AbortController();
    try {
      await streamChat({ demo: demo.id, agent: agent.id, messages: history, context: ctxText, anchor: app.anchor || null, ...(session_id ? { session_id } : {}) }, ev => {
        if (ev.type === 'meta') { r = { ...r, agent: ev.agent.name, model: ev.model, provider: ev.provider || 'claude', cap: ev.provider === 'bruce' ? 'Live on Bruce' : `Live · ${ev.model}` }; show(); }
        else if (ev.type === 'session') { r = { ...r, sessionId: ev.session_id }; }
        else if (ev.type === 'final') { r = { ...r, text: ev.text }; show(); }
        else if (ev.type === 'tool_start') { r.steps.push({ id: ev.id, tool: ev.label || `plantdb.${ev.name}`, args: ev.input, ms: null }); show(); }
        else if (ev.type === 'reset') { r = { ...r, text: '' }; show(); }
        else if (ev.type === 'tool_end') {
          const st = r.steps.find(x => x.id === ev.id); if (st) { st.ms = Math.max(1, ev.ms); st.ok = ev.ok; }
          if (ev.result != null) calls.push({ name: ev.name, input: ev.input, ok: ev.ok, result: ev.result }); show();
        }
        else if (ev.type === 'text') { r = { ...r, text: r.text + ev.delta }; show(); }
        else if (ev.type === 'artefact') { app.actions.addArtefact(ev.artefact); made.push(ev.artefact); r.steps.push({ tool: 'artefactory.create_artefact', args: { name: ev.artefact.name }, ms: 1, ok: true }); show(); }
        else if (ev.type === 'error') { throw new Error(ev.message); }
      }, abort.current.signal);
    } catch (e) {
      if (abort.current?.signal.aborted) return true;
      if (!r.text && !calls.length) { app.toast(`${e.message} Using the in-app engine.`); return false; }
      r = { ...r, text: `${r.text}\n\n> ${e.message}` };
    }
    const seen = new Set();
    const agentCharts = (r.text.match(/```chart/g) || []).length;
    const visuals = calls.filter(c => c.ok && !seen.has(c.name) && seen.add(c.name)).map(c => visualFor(c.name, c.input, c.result)).filter(Boolean).slice(0, agentCharts ? 0 : 2);
    /* creation asked but the agent saved nothing: build it from the plant model */
    if (!made.length && createIntent(q)) {
      const m = buildArtefact(q, { demo, db, asset, kpi: demo.kpis.find(k => q.toLowerCase().includes(k.name.toLowerCase())) });
      if (m) { const id = app.actions.createArtefact({ type: m.type, name: m.name, spec: m.spec, demo: demo.id, note: 'Created from prompt' }); made.push({ id, name: m.name }); r.steps.push({ tool: 'artefactory.create_artefact', args: { name: m.name }, ms: 1, ok: true }); }
    }
    const acts = made.length ? { type: 'actions', items: made.flatMap(a => [{ label: `Open ${a.name}`, act: { type: 'art', id: a.id }, pri: true }, { label: 'Pin to Shortcuts', act: { type: 'pin', key: a.id } }]) } : actionsFor(calls);
    const final = { ...r, ms: Date.now() - t0, blocks: [...visuals, ...(acts ? [acts] : [])], steps: r.steps.map(({ id, ...x }) => ({ ...x, ms: x.ms ?? 1 })) };
    app.addLog('Agents', 'copilot.session.live', final.agent, q.slice(0, 60));
    setPending(null);
    setTurns([...turns, { q, r: final, at: Date.now() }]);
    return true;
  }

  function sendLocal(q) {
    const r = runQuery(q, { ...app.ctx, context, actions: app.actions });
    app.addLog('Agents', 'copilot.session', r.agent, q.slice(0, 60));
    setPending({ q, r, shown: 0 });
    let i = 0;
    const tick = () => {
      i++;
      if (i > r.steps.length) { setPending(null); setTurns([...turns, { q, r, at: Date.now() }]); return; }
      setPending({ q, r, shown: i });
      setTimeout(tick, Math.min(700, r.steps[i - 1]?.ms || 300) * 0.7);
    };
    setTimeout(tick, 200);
  }

  const sugg = context ? (context.kind === 'artefact' ? ['Summarise this', 'What changed in the last version?', 'What needs my attention right now?'] : ['Summarise this', ...app.ctx.demo.suggestions.slice(1, 4)]) : app.ctx.demo.suggestions;

  return (
    <div className="chat">
      <div className="chat-body" ref={body}>
        {!turns.length && !pending && ((typeof hello === 'function' ? hello(send) : hello) || <div className="hello"><Bot size={26} color="var(--brand)" /><h2 style={{ fontSize: 18 }}>Ask about {context ? 'this view' : 'the plant'}</h2><p className="muted">Answers use live plant data through the plantdb MCP server.</p></div>)}
        {turns.map((t, i) => <Turn key={i} t={t} onAct={act} />)}
        {pending && <Turn t={pending} running onAct={act} />}
      </div>
      <div className="chat-foot">
        {(turns.length > 0 || pending || !hello) && <div className="sugg">{sugg.map(s => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>}
        <div className="composer">
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder={compact ? 'Ask about this…' : 'Ask about any asset, KPI, report or policy'} rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} aria-label="Message" />
          <button className="send" onClick={() => send()} disabled={!text.trim() || !!pending} aria-label="Send"><Send size={15} /></button>
        </div>
      </div>
    </div>
  );
}

function Turn({ t, running, onAct }) {
  const { r } = t; const app = useApp();
  const total = r.live ? (r.ms || 0) : r.steps.reduce((a, s) => a + s.ms, 0);
  const doneSteps = r.live ? r.steps.filter(s => s.ms != null).length : t.shown;
  const [fb, setFb] = useState(null);
  return (
    <>
      <div className="msg-u">{t.q}</div>
      <div className="msg-b">
        <div className="route"><Bot size={14} />Routed to <b>{r.agent}</b> · {r.cap}{r.live && <span className="tag good" style={{ marginLeft: 6, fontSize: 10.5 }}>Live</span>}</div>
        {(r.steps.length > 0 || !r.live) && <details className="trace" open={running}>
          <summary><Layers size={12} />{running ? (r.live ? `Working · ${doneSteps} of ${r.steps.length} tool calls done` : `Working · step ${Math.min(t.shown + 1, r.steps.length)} of ${r.steps.length}`) : `${r.steps.length} tool calls · ${(total / 1000).toFixed(1)} s · ${r.live ? (r.provider === 'bruce' ? 'live on Bruce' : 'live via plantdb MCP') : 'via MCP gateway'}`}<ChevronRight size={12} style={{ marginLeft: 'auto' }} /></summary>
          {r.steps.map((s, i) => { const done = r.live ? s.ms != null : (!running || i < t.shown); return <div key={i} className={`step ${done ? 'done' : (r.live || i === t.shown) ? 'run' : ''}`}><span className="ic" /><span className="tl ellipsis">{s.tool}{Object.keys(s.args || {}).length ? <span className="muted"> {JSON.stringify(s.args)}</span> : ''}</span><span className="ms">{done ? s.ms + ' ms' : ''}</span></div>; })}
        </details>}
        {running && r.live && r.text ? <div className="ans"><Markdown text={r.text} /></div> : running ? <span className="typing"><i /><i /><i /></span> : <div className="ans">{r.live && <Markdown text={r.text} />}<Blocks blocks={r.blocks} onAct={onAct} />
          <div className="row" style={{ marginTop: 6, gap: 2 }}><button className="ibtn" style={{ width: 26, height: 26, color: fb === 1 ? 'var(--good)' : undefined }} aria-label="Useful" onClick={() => { setFb(1); app.toast('Thanks. Saved to the agent feedback loop.'); }}><ThumbsUp size={13} /></button><button className="ibtn" style={{ width: 26, height: 26, color: fb === 0 ? 'var(--bad)' : undefined }} aria-label="Not useful" onClick={() => { setFb(0); app.toast('Thanks. An SME will review this answer.'); }}><ThumbsDown size={13} /></button></div></div>}
      </div>
    </>
  );
}
