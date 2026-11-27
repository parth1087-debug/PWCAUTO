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

/* ================= Real-time monitor ================= */
export function RealtimeView({ c, assets: wanted }) {
  const app = useApp();
  const ids = useMemo(() => {
    const valid = (wanted || c.demo.realtime?.assets || []).filter(x => c.db.assetById[x]);
    if (valid.length) return valid;
    const spot = c.db.assetById[c.demo.maintenance?.spotlight];
    return c.db.assets.filter(a => a.line === spot?.line || a.area.id === 'utilities').slice(0, 10).map(a => a.id).concat(c.db.assets.slice(0, 4).map(a => a.id)).filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 10);
  }, [c, wanted]);
  const rows = ids.map(id => { const a = c.db.assetById[id]; const evTag = (c.demo.events || []).find(e => e.asset === id && e.tag)?.tag; const tags = [...new Set([...(evTag ? [evTag] : []), ...c.demo.classes[a.cls].tags.map(t => t[0])])].slice(0, 3);
    const states = tags.map(t => stateOf(c.db.tagDef(id, t), c.db.live(id, t, app.tick)));
    const st = states.includes('bad') ? 'bad' : states.includes('warn') ? 'warn' : 'good'; return { a, tags, st }; });
  const n = k => rows.filter(r => r.st === k).length;
  const alerts = app.messages.filter(m => m.type === 'alert').slice(0, 5);
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="rt-strip card">
        <div className="rt-k"><span className="dot-s good" /><b>{n('good')}</b> normal</div>
        <div className="rt-k"><span className="dot-s warn" /><b>{n('warn')}</b> near limit</div>
        <div className="rt-k"><span className="dot-s bad" /><b>{n('bad')}</b> out of limits</div>
        <div className="grow" />
        <LiveBadge />
      </div>
      <div className="grid g31">
        <div className="rt-grid">{rows.map(({ a, tags, st }) => (
          <div key={a.id} className={`rt-card ${st}`}>
            <div className="row"><span className={`dot-s ${st}`} /><b className="mono" style={{ fontSize: 12 }}>{a.id}</b><span className="muted ellipsis" style={{ fontSize: 12 }}>{a.name}</span>
              <button className="ibtn right" style={{ width: 26, height: 26 }} title="Open twin" onClick={() => app.nav(`artefactory/${c.demo.id}-twin`)}><ChevronRight size={14} /></button></div>
            {tags.map(t => { const d = c.db.tagDef(a.id, t); const pts = c.db.history(a.id, t, c.db.anchor - D, c.db.anchor, 'hour').points.map(p => ({ v: p.v }));
              return <div key={t} className="rt-row"><span className="muted ellipsis">{d.name}</span><LiveValue c={c} asset={a.id} tag={t} /><div style={{ width: 70 }}><Spark data={pts} height={22} /></div></div>; })}
            <div className="muted" style={{ fontSize: 10.5, marginTop: 4 }}>{a.site.name} · {a.line.name}</div>
          </div>))}</div>
        <Card title="Event stream" sub="Alerts from the agents" flush>
          {alerts.length ? alerts.map(m => <button key={m.id} className="feed-i" onClick={() => app.nav('messages/' + m.id)}><span className={`rail ${m.sev}`} /><span><div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.title}</div><div className="muted" style={{ fontSize: 11.5 }}>{m.from} · {fmtRel(m.time)}</div></span></button>) : <Empty>No alerts.</Empty>}
        </Card>
      </div>
    </div>
  );
}
