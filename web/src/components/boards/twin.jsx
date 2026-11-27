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

/* ================= Asset twin ================= */
export function TwinView({ c, asset: assetId }) {
  const app = useApp();
  const id = assetId || c.demo.maintenance?.spotlight;
  const a = c.db.assetById[id];
  const [sel, setSel] = useState(null);
  if (!a) return <Card><Empty>Asset {id} not found in this plant.</Empty></Card>;
  const h = c.db.health(id);
  const ev = (c.demo.events || []).find(e => e.asset === id && e.title);
  const tags = c.demo.classes[a.cls].tags.map(t => t[0]);
  const src = assetSources(c.db, id);
  const focus = sel || ev?.tag || tags[0];
  const def = c.db.tagDef(id, focus);
  const hist = c.db.history(id, focus, c.db.anchor - 14 * D, c.db.anchor);
  const r = n => (hash(id + n) % 1000) / 1000;
  const wos = [
    { id: `WO ${41008000 + (hash(id) % 900)}`, what: ev ? ev.diagnosis.reco.split('.')[0] : 'Planned preventive maintenance', state: ev ? 'Awaiting approval' : 'Planned', when: c.db.anchor + 2 * D },
    { id: `WO ${41007000 + (hash(id + 'p') % 900)}`, what: 'Preventive maintenance · lubrication and inspection', state: 'Closed', when: c.db.anchor - Math.round(20 + r('pm') * 30) * D },
    { id: `WO ${41006000 + (hash(id + 'b') % 900)}`, what: 'Breakdown · sensor cable replaced', state: 'Closed', when: c.db.anchor - Math.round(70 + r('bd') * 60) * D },
  ];
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="twin-hero card">
        <div className="row" style={{ gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <Ring v={h.health} />
          <div className="grow" style={{ minWidth: 220 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}><span className="mono muted">{a.id}</span><Tag c={h.state === 'Alarm' ? 'bad' : h.state === 'Watch' ? 'warn' : 'good'}>{h.state}</Tag><Tag c="line">Criticality {a.crit}</Tag><LiveBadge /></div>
            <h2 style={{ margin: '4px 0 2px', fontSize: 22, letterSpacing: '-.02em' }}>{a.name}</h2>
            <div className="muted">{c.demo.classes[a.cls].label} · {a.site.name} › {a.area.name} › {a.line.name}</div>
          </div>
          <div className="twin-facts">
            <div><span>Remaining life</span><b style={{ color: h.rulDays < 15 ? 'var(--bad)' : undefined }}>{h.rulDays} d</b></div>
            <div><span>Finding</span><b>{h.finding || 'None'}</b></div>
            <div><span>Open work</span><b>{ev ? '1 awaiting' : 'None'}</b></div>
          </div>
          <div className="row" style={{ gap: 6 }}>{ev && <button className="btn pri" onClick={() => app.actions.raiseWO(id, ev.diagnosis.title)}><Wrench />Raise work order</button>}<button className="btn" onClick={() => app.openPanel({ kind: 'card', title: `${a.id} · ${a.name}`, summary: [ev ? ev.diagnosis.reco : `${a.name} is healthy.`] })}><Sparkles />Ask</button></div>
        </div>
      </div>

      <div className="tag-grid">{tags.map(t => {
        const d = c.db.tagDef(id, t); const v = c.db.live(id, t, app.tick); const st = stateOf(d, v);
        const pts = c.db.history(id, t, c.db.anchor - D, c.db.anchor, 'hour').points.map(p => ({ v: p.v }));
        return <button key={t} className={`tag-tile ${focus === t ? 'on' : ''} ${st}`} onClick={() => setSel(t)}>
          <div className="row"><span className="ellipsis grow">{d.name}</span><span className={`dot-s ${st}`} /></div>
          <div className="tv" key={app.tick}>{fmtNum(v)}<small> {d.unit}</small></div>
          <div className="muted" style={{ fontSize: 11 }}>{d.lo != null || d.hi != null ? `limits ${d.lo ?? '—'} – ${d.hi ?? '—'} ${d.unit}` : `normal ≈ ${fmtNum(d.base)} ${d.unit}`}</div>
          <Spark data={pts} color={st === 'bad' ? 'var(--bad)' : undefined} height={30} />
        </button>;
      })}</div>

      <div className="grid g21">
        <Card title={`${def.name}, last 14 days`} sub={`${src.tags.find(x => x.tag === focus)?.system} · ${src.tags.find(x => x.tag === focus)?.address}`}>
          <Trend data={hist.points} series={[{ key: 'v', name: def.name, type: 'area' }]} unit={def.unit} days={14} height={240} refs={[...(def.hi != null && def.hi > 0 ? [{ y: def.hi, label: `High ${def.hi}` }] : []), ...(def.lo ? [{ y: def.lo, label: `Low ${def.lo}` }] : [])]} />
        </Card>
        <Card title={ev ? 'Diagnosis' : 'Condition'} sub={ev ? `${ev.agent} · confidence ${Math.round(ev.diagnosis.confidence * 100)} %` : 'No open findings'}>
          {ev ? <>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{ev.diagnosis.title}</div>
            <div className="conf"><i style={{ width: `${ev.diagnosis.confidence * 100}%` }} /></div>
            <ul className="evid">{ev.diagnosis.points.map(p => <li key={p}>{p}</li>)}</ul>
            <div className="reco"><b>Recommendation</b>{ev.diagnosis.reco}</div>
          </> : <div className="muted">All tags are within limits. Next preventive maintenance in {Math.round(10 + r('n') * 20)} days.</div>}
        </Card>
      </div>

      <div className="grid g2">
        <Card title="Data sources" sub="Where each tag comes from, bound to the UNS" flush>
          <div className="scroll-x"><table className="t"><thead><tr><th>Tag</th><th>Source system</th><th>Address</th><th>Sampling</th></tr></thead><tbody>
            {src.tags.map(t => <tr key={t.tag}><td><b style={{ fontWeight: 600 }}>{t.name}</b><div className="mono muted" style={{ fontSize: 10.5 }}>{t.uns}</div></td><td>{t.system}<div className="muted" style={{ fontSize: 11 }}>{t.via}</div></td><td className="mono" style={{ fontSize: 11 }}>{t.address}</td><td className="muted">{t.sampling}</td></tr>)}
          </tbody></table></div>
        </Card>
        <div className="grid" style={{ gap: 16 }}>
          <Card title="Business records" sub="ERP, CMMS and MES objects linked to this asset" flush>
            <div className="scroll-x"><table className="t"><tbody>{src.records.map(x => <tr key={x.object}><td className="muted">{x.object}</td><td className="mono">{x.id}</td><td>{x.system}</td></tr>)}</tbody></table></div>
          </Card>
          <Card title="Work history" flush>
            <div className="scroll-x"><table className="t"><tbody>{wos.map(w => <tr key={w.id}><td className="mono">{w.id}</td><td>{w.what}</td><td><Tag c={w.state === 'Closed' ? 'line' : 'warn'}>{w.state}</Tag></td><td className="muted num">{fmtDateTime(w.when).split(',')[0]}</td></tr>)}</tbody></table></div>
          </Card>
          {src.docs.length > 0 && <Card title="Documents" flush><table className="t"><tbody>{src.docs.map(d => <tr key={d.name}><td><FileText size={14} style={{ verticalAlign: -2, marginRight: 6, color: 'var(--muted)' }} />{d.name}</td><td className="muted">{d.type}</td></tr>)}</tbody></table></Card>}
        </div>
      </div>
    </div>
  );
}
