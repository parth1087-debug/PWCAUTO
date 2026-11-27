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

/* ================= Anomalies: RCA and recommendations ================= */
export function RcaView({ c }) {
  const app = useApp();
  const evs = (c.demo.events || []).filter(e => e.title && c.db.assetById[e.asset]);
  const [sel, setSel] = useState(evs[0]?.id);
  const e = evs.find(x => x.id === sel) || evs[0];
  if (!e) return <Card><Empty>No open anomalies.</Empty></Card>;
  const a = c.db.assetById[e.asset]; const def = c.db.tagDef(e.asset, e.tag);
  const hist = c.db.history(e.asset, e.tag, c.db.anchor - 14 * D, c.db.anchor);
  const others = (c.demo.events || []).filter(x => x.asset === e.asset && x.id !== e.id && x.tag !== e.tag).map(x => x.tag).filter((t, i, arr) => arr.indexOf(t) === i && c.db.tagDef(e.asset, t));
  const bad = evs.filter(x => x.severity === 'bad').length;
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <div className="kpi"><div className="l">Open anomalies</div><div className="v">{evs.length}</div><div className="f">{bad} alarm · {evs.length - bad} warning</div></div>
        <div className="kpi"><div className="l">Diagnosed by agents</div><div className="v">{evs.filter(x => x.diagnosis).length}</div><div className="f">with evidence and confidence</div></div>
        <div className="kpi"><div className="l">Average confidence</div><div className="v">{Math.round((evs.reduce((n, x) => n + (x.diagnosis?.confidence || 0), 0) / evs.length) * 100)} %</div><div className="f">across open findings</div></div>
        <div className="kpi"><div className="l">Lowest remaining life</div><div className="v">{Math.min(...evs.map(x => c.db.health(x.asset).rulDays))} d</div><div className="f">{evs.slice().sort((x, y) => c.db.health(x.asset).rulDays - c.db.health(y.asset).rulDays)[0].asset}</div></div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(260px, 1fr) minmax(0, 2.2fr)', gap: 16 }}>
        <Card title="Anomalies" sub="newest first" flush>
          {evs.slice().sort((x, y) => x.minutesAgo - y.minutesAgo).map(x => <button key={x.id} className={`feed-i ${x.id === e.id ? 'on' : ''}`} onClick={() => setSel(x.id)} style={x.id === e.id ? { background: 'var(--brand-soft)' } : undefined}>
            <span className={`rail ${x.severity === 'bad' ? 'bad' : 'warn'}`} /><span><div style={{ fontSize: 12.5, fontWeight: 600 }}>{x.title}</div><div className="muted" style={{ fontSize: 11.5 }}>{x.asset} · {x.agent} · {x.minutesAgo < 90 ? `${x.minutesAgo} min ago` : `${Math.round(x.minutesAgo / 60)} h ago`}</div></span></button>)}
        </Card>
        <div className="grid" style={{ gap: 16 }}>
          <Card title={e.title} sub={`${e.asset} · ${a.name} · ${a.line.name}`} actions={<Tag c={e.severity === 'bad' ? 'bad' : 'warn'}>{e.severity === 'bad' ? 'Alarm' : 'Warning'}</Tag>}>
            <Trend data={hist.points} series={[{ key: 'v', name: def.name, type: 'area' }]} unit={def.unit} days={14} height={200} refs={[...(def.hi != null ? [{ y: def.hi, label: `High ${def.hi}` }] : []), ...(def.lo ? [{ y: def.lo, label: `Low ${def.lo}` }] : [])]} />
            {others.length > 0 && <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 8 }}><span className="muted" style={{ fontSize: 12 }}>Correlated tags:</span>{others.map(t => <Tag key={t} c="line">{c.db.tagDef(e.asset, t).name} <LiveValue c={c} asset={e.asset} tag={t} /></Tag>)}</div>}
          </Card>
          {e.diagnosis && <div className="grid g2">
            <Card title="Root cause" sub={`${e.agent} · confidence ${Math.round(e.diagnosis.confidence * 100)} %`}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{e.diagnosis.title}</div>
              <div className="conf"><i style={{ width: `${e.diagnosis.confidence * 100}%` }} /></div>
              <div className="muted" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.06em', margin: '4px 0' }}>Evidence</div>
              <ul className="evid">{e.diagnosis.points.map(p => <li key={p}>{p}</li>)}</ul>
            </Card>
            <Card title="Recommendation" sub="advisory · approval needed before any action">
              <div className="reco"><b>Do this</b>{e.diagnosis.reco}</div>
              <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn pri" onClick={() => app.actions.raiseWO(e.asset, e.diagnosis.title)}><Wrench />Raise work order</button>
                <button className="btn" onClick={() => app.nav(`artefactory/${c.demo.id}-twin/${e.asset}`)}>Asset twin</button>
                <button className="btn" onClick={() => app.openPanel({ kind: 'card', title: e.title, summary: [e.diagnosis.title, e.diagnosis.reco] })}><Sparkles />Ask</button>
              </div>
            </Card>
          </div>}
        </div>
      </div>
    </div>
  );
}
