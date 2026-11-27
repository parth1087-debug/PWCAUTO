import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronRight, Cpu, Database, FileText, Gauge, Radio, Send, ShieldCheck, Sparkles, Star, Wrench, X, Zap } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { Card, Kpi, Tag, HealthBar, Empty } from '../ui.jsx';
import { Trend, Spark, BarList, usePalette } from '../charts.jsx';
import Markdown from '../Markdown.jsx';
import { fmtNum, fmtRel, fmtTime, fmtDateTime } from '../../lib/data.js';
import { assetSources, sourcesOf } from '../../shared/sources.js';
import { hash } from '../../shared/engine.js';
import { api } from '../../lib/api.js';
import { D, stateOf, LiveBadge, LiveValue, Ring } from './live.jsx';

/* ================= Setpoint advisor ================= */
export function SetpointView({ c }) {
  const app = useApp();
  const [list, setList] = useState(() => (c.demo.setpoints || []).map(s => ({ ...s, status: s.status || 'proposed' })));
  const [busy, setBusy] = useState(null);
  useEffect(() => { let on = true; api.setpoints(c.demo.id).then(v => on && Array.isArray(v) && setList(v)).catch(() => {}); return () => { on = false; }; }, [c.demo.id]);
  const decide = async (s, status) => {
    setBusy(s.asset + s.tag);
    try { await api.decide({ demo: c.demo.id, asset: s.asset, tag: s.tag, status, by: app.user.name }); } catch { /* offline: keep locally */ }
    setList(l => l.map(x => (x.asset === s.asset && x.tag === s.tag ? { ...x, status } : x)));
    app.addLog('Agents', `setpoint.${status}`, `${s.asset}.${s.tag}`, `${s.current} → ${s.recommended} ${s.unit}`);
    app.toast(status === 'approved' ? 'Approved. A change request goes to the process in-charge (P-02). Nothing is written to the control system.' : 'Rejected and recorded with your name.');
    setBusy(null);
  };
  if (!list.length) return <Card><Empty>No setpoint recommendations for this plant yet.</Empty></Card>;
  const open = list.filter(s => s.status === 'proposed').length;
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <div className="kpi"><div className="l">Recommendations</div><div className="v">{list.length}</div><div className="f">from the overnight optimisation run</div></div>
        <div className="kpi"><div className="l">Waiting for you</div><div className="v" style={{ color: open ? 'var(--brand)' : undefined }}>{open}</div><div className="f">approve or reject</div></div>
        <div className="kpi"><div className="l">Approved or applied</div><div className="v">{list.filter(s => s.status === 'approved' || s.status === 'applied').length}</div><div className="f">change requests raised</div></div>
        <div className="kpi"><div className="l">Guardrail</div><div className="v" style={{ fontSize: 18 }}><ShieldCheck size={18} style={{ verticalAlign: -3, color: 'var(--good)' }} /> P-01 · P-02</div><div className="f">advisory only, no writes to control</div></div>
      </div>
      {list.map(s => {
        const d = c.db.tagDef(s.asset, s.tag); const a = c.db.assetById[s.asset];
        const hist = c.db.history(s.asset, s.tag, c.db.anchor - 7 * D, c.db.anchor);
        const lo = s.lo ?? Math.min(s.current, s.recommended) * 0.9, hi = s.hi ?? Math.max(s.current, s.recommended) * 1.1;
        const pos = v => `${Math.max(0, Math.min(100, ((v - lo) / ((hi - lo) || 1)) * 100))}%`;
        return (
          <Card key={s.asset + s.tag} title={s.name} sub={`${s.asset} · ${a?.name} · ${d?.name}`} actions={<Tag c={s.status === 'proposed' ? 'brand' : s.status === 'rejected' ? 'bad' : 'good'}>{s.status}</Tag>}>
            <div className="sp">
              <div className="sp-l">
                <div className="sp-move"><div><span>Current</span><b>{fmtNum(s.current)}</b><small>{s.unit}</small></div><ArrowRight size={20} color="var(--muted)" /><div><span>Recommended</span><b style={{ color: 'var(--brand)' }}>{fmtNum(s.recommended)}</b><small>{s.unit}</small></div></div>
                <div className="sp-band"><div className="tr" /><i className="cur" style={{ left: pos(s.current) }} title="Current" /><i className="rec" style={{ left: pos(s.recommended) }} title="Recommended" /><span style={{ left: 0 }}>{fmtNum(lo)}</span><span style={{ right: 0 }}>{fmtNum(hi)}</span></div>
                <div className="row" style={{ gap: 14, flexWrap: 'wrap', margin: '10px 0' }}><span><Zap size={13} style={{ verticalAlign: -2, color: 'var(--good)' }} /> <b>{s.gain}</b></span>{s.kpi && <span className="muted">KPI: {s.kpi}</span>}<span className="muted">Confidence {Math.round(s.confidence * 100)} %</span></div>
                <p style={{ margin: '0 0 12px', color: 'var(--text-2)' }}>{s.reason}</p>
                {s.status === 'proposed' ? <div className="row" style={{ gap: 8 }}><button className="btn pri" disabled={busy === s.asset + s.tag} onClick={() => decide(s, 'approved')}><Check />Approve change request</button><button className="btn" disabled={busy === s.asset + s.tag} onClick={() => decide(s, 'rejected')}><X />Reject</button></div>
                  : <div className="muted" style={{ fontSize: 12.5 }}><CheckCircle2 size={14} style={{ verticalAlign: -2 }} /> {s.status === 'applied' ? 'Applied by the process in-charge.' : s.status === 'approved' ? 'Change request raised to the process in-charge.' : 'Rejected.'}</div>}
              </div>
              <div className="sp-r"><Trend data={hist.points} series={[{ key: 'v', name: d?.name, type: 'area' }]} unit={s.unit} days={7} height={190} refs={[{ y: s.recommended, label: `Recommended ${s.recommended}`, color: 'var(--good)', solid: true }]} /></div>
            </div>
          </Card>);
      })}
    </div>
  );
}
