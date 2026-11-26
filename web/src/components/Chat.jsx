import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, ChevronRight, ThumbsUp, ThumbsDown, Layers } from 'lucide-react';
import { useApp } from '../App.jsx';
import { runQuery } from '../lib/copilot.js';
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
  useEffect(() => { body.current && (body.current.scrollTop = body.current.scrollHeight); }, [turns, pending]);

  const act = a => {
    if (!a) return;
    if (a.type === 'nav') { app.closePanel(); app.nav(a.to); }
    else if (a.type === 'ask') send(a.q);
    else if (a.type === 'wo') app.actions.raiseWO(a.asset, a.title);
    else if (a.type === 'pin') { app.actions.pin(a.key); app.toast('Added to Shortcuts'); }
    else if (a.type === 'art') { app.closePanel(); app.nav('artefactory/' + a.id); }
    else if (a.type === 'toast') app.toast(a.text);
  };

  function send(q) {
    q = (q || text).trim(); if (!q || pending) return;
    setText('');
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
        {!turns.length && !pending && (hello || <div className="hello"><Bot size={26} color="var(--brand)" /><h2 style={{ fontSize: 18 }}>Ask about {context ? 'this view' : 'the plant'}</h2><p className="muted">Answers use live plant data through the Bruce MCP gateway.</p></div>)}
        {turns.map((t, i) => <Turn key={i} t={t} onAct={act} />)}
        {pending && <Turn t={pending} running onAct={act} />}
      </div>
      <div className="chat-foot">
        <div className="sugg">{sugg.map(s => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
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
  const total = r.steps.reduce((a, s) => a + s.ms, 0);
  const [fb, setFb] = useState(null);
  return (
    <>
      <div className="msg-u">{t.q}</div>
      <div className="msg-b">
        <div className="route"><Bot size={14} />Routed to <b>{r.agent}</b> · {r.cap}</div>
        <details className="trace" open={running}>
          <summary><Layers size={12} />{running ? `Working · step ${Math.min(t.shown + 1, r.steps.length)} of ${r.steps.length}` : `${r.steps.length} tool calls · ${(total / 1000).toFixed(1)} s · via MCP gateway`}<ChevronRight size={12} style={{ marginLeft: 'auto' }} /></summary>
          {r.steps.map((s, i) => <div key={i} className={`step ${!running || i < t.shown ? 'done' : i === t.shown ? 'run' : ''}`}><span className="ic" /><span className="tl ellipsis">{s.tool}{Object.keys(s.args || {}).length ? <span className="muted"> {JSON.stringify(s.args)}</span> : ''}</span><span className="ms">{(!running || i < t.shown) ? s.ms + ' ms' : ''}</span></div>)}
        </details>
        {running ? <span className="typing"><i /><i /><i /></span> : <div className="ans"><Blocks blocks={r.blocks} onAct={onAct} />
          <div className="row" style={{ marginTop: 6, gap: 2 }}><button className="ibtn" style={{ width: 26, height: 26, color: fb === 1 ? 'var(--good)' : undefined }} aria-label="Useful" onClick={() => { setFb(1); app.toast('Thanks. Saved to the agent feedback loop.'); }}><ThumbsUp size={13} /></button><button className="ibtn" style={{ width: 26, height: 26, color: fb === 0 ? 'var(--bad)' : undefined }} aria-label="Not useful" onClick={() => { setFb(0); app.toast('Thanks. An SME will review this answer.'); }}><ThumbsDown size={13} /></button></div></div>}
      </div>
    </>
  );
}
