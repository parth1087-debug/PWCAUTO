import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronRight, Cpu, Database, FileText, Gauge, Radio, Send, ShieldCheck, Sparkles, Star, Wrench, X, Zap, ClipboardList, PenLine, History } from 'lucide-react';
import { useApp } from '../App.jsx';
import { Card, Kpi, Tag, HealthBar, Empty } from './ui.jsx';
import { Trend, Spark, BarList, usePalette } from './charts.jsx';
import Markdown from './Markdown.jsx';
import { fmtNum, fmtRel, fmtTime, fmtDateTime } from '../lib/data.js';
import { assetSources, sourcesOf } from '../shared/sources.js';
import { hash } from '../shared/engine.js';
import { api } from '../lib/api.js';

const D = 864e5;
const stateOf = (def, v) => (def.hi != null && v > def.hi) || (def.lo != null && def.lo !== 0 && v < def.lo) ? 'bad' : (def.hi != null && v > def.hi * 0.92) || (def.lo != null && def.lo !== 0 && v < def.lo * 1.04) ? 'warn' : 'good';

/* ---------- live helpers ---------- */
function useTickAge() {
  const { tickAt } = useApp(); const [, f] = useState(0);
  useEffect(() => { const i = setInterval(() => f(x => x + 1), 1000); return () => clearInterval(i); }, []);
  return Math.max(0, Math.round((Date.now() - tickAt) / 1000));
}
export function LiveBadge() {
  const age = useTickAge();
  return <span className="live-badge"><span className="live" />Live · updated {age}s ago · refresh 10 s</span>;
}
function LiveValue({ c, asset, tag }) {
  const { tick } = useApp();
  const def = c.db.tagDef(asset, tag); const v = c.db.live(asset, tag, tick);
  const st = stateOf(def, v);
  return <span className={`lv-v ${st}`} key={tick}>{fmtNum(v)}<small> {def.unit}</small></span>;
}

/* ---------- health ring ---------- */
function Ring({ v, size = 92 }) {
  const r = size / 2 - 7, C = 2 * Math.PI * r; const col = v < 50 ? 'var(--bad)' : v < 75 ? 'var(--warn)' : 'var(--good)';
  return <svg width={size} height={size} role="img" aria-label={`Health ${v}`}><circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-3)" strokeWidth="8" fill="none" />
    <circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${(C * v) / 100} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    <text x="50%" y="48%" textAnchor="middle" fontSize="22" fontWeight="650" fill="var(--text)">{v}</text><text x="50%" y="66%" textAnchor="middle" fontSize="10" fill="var(--muted)">health</text></svg>;
}

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

/* ================= Custom widget board (agent-made) ================= */
export function CustomBoard({ c, widgets = [] }) {
  const app = useApp(); const R = { ...app.rng, from: c.db.anchor - app.rng.days * D, to: c.db.anchor };
  return <div className="cb-grid">{widgets.map((w, i) => {
    switch (w.type) {
      case 'kpis': return <div key={i} className="span-all kpis" style={{ gridTemplateColumns: `repeat(${Math.min(6, Math.max(2, w.ids.length))}, minmax(0,1fr))`, margin: 0 }}>{w.ids.map(id => { const k = c.db.kpiSummary(id, R.from, R.to); return <Kpi key={id} k={k} onClick={() => app.nav(`artefactory/${c.demo.id}-kpis/${id}`)} spark={<Spark data={c.db.kpiDaily(id).filter(p => p.t >= R.from - D).map(p => ({ v: p.v }))} />} />; })}</div>;
      case 'kpi_trend': { const k = c.demo.kpis.find(x => x.id === w.id) || c.demo.kpis[0]; return <Card key={i} title={`${k.name}, daily`} sub={`baseline ${k.base} · target ${k.target} ${k.unit}`}><Trend data={c.db.kpiDaily(k.id).filter(p => p.t >= R.from - D)} series={[{ key: 'v', name: k.name, type: 'area' }]} unit={k.unit} days={R.days} height={200} refs={[{ y: k.base, label: 'Baseline', color: '#98a2b3' }, { y: k.target, label: 'Target', color: '#079455' }]} /></Card>; }
      case 'tag_trend': { const d = c.db.tagDef(w.asset, w.tag); if (!d) return null; return <Card key={i} title={`${w.asset} · ${d.name}`} sub="last 7 days"><Trend data={c.db.history(w.asset, w.tag, c.db.anchor - 7 * D, c.db.anchor).points} series={[{ key: 'v', name: d.name, type: 'area' }]} unit={d.unit} days={7} height={200} refs={d.hi != null && d.hi > 0 ? [{ y: d.hi, label: `High ${d.hi}` }] : []} /></Card>; }
      case 'asset_health': return <Card key={i} title="Asset health" sub="lowest first" flush><table className="t"><tbody>{c.db.healthAll().slice(0, 6).map(x => <tr key={x.id}><td><b>{x.id}</b> <span className="muted">{x.name}</span></td><td><HealthBar v={x.health} w={90} /></td><td className="r num">{x.rulDays} d</td></tr>)}</tbody></table></Card>;
      case 'losses': return <Card key={i} title="Top losses" sub="hours this month"><BarList items={c.demo.cost.losses.map(l => ({ name: l[0], value: l[1] }))} unit="h" /></Card>;
      case 'energy': { const e = c.tools.get_energy({ days: 7 }); return <Card key={i} title={`Peak ${fmtNum(e.peak_kva)} kVA`} sub={`contract ${fmtNum(e.contract_kva)} kVA · 7 days`}><Trend data={e.load_profile.map(p => ({ t: new Date(p.t).getTime(), v: p.kva }))} series={[{ key: 'v', name: 'Load', type: 'area' }]} unit="kVA" days={7} height={200} refs={[{ y: e.contract_kva, label: 'Contract' }]} /></Card>; }
      case 'alerts': return <Card key={i} title="Needs attention" flush>{app.messages.filter(m => m.type === 'alert' || m.type === 'approval').slice(0, 4).map(m => <button key={m.id} className="feed-i" onClick={() => app.nav('messages/' + m.id)}><span className={`rail ${m.sev}`} /><span><div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.title}</div><div className="muted" style={{ fontSize: 11.5 }}>{m.from} · {fmtRel(m.time)}</div></span></button>)}</Card>;
      case 'setpoints': return <Card key={i} title="Setpoint recommendations" flush><table className="t"><tbody>{(c.demo.setpoints || []).map(s => <tr key={s.asset + s.tag} className="click" onClick={() => app.nav(`artefactory/${c.demo.id}-setpoints`)}><td><b>{s.asset}</b> <span className="muted">{s.name}</span></td><td className="num">{fmtNum(s.current)} → <b style={{ color: 'var(--brand)' }}>{fmtNum(s.recommended)}</b> {s.unit}</td><td className="muted">{s.gain}</td></tr>)}</tbody></table></Card>;
      case 'live': { const ids = (w.assets || []).filter(x => c.db.assetById[x]).slice(0, 6); return <Card key={i} title="Live values" actions={<LiveBadge />} flush><table className="t"><tbody>{ids.flatMap(id => c.demo.classes[c.db.assetById[id].cls].tags.slice(0, 2).map(t => <tr key={id + t[0]}><td><b className="mono" style={{ fontSize: 12 }}>{id}</b> <span className="muted">{t[1]}</span></td><td className="r"><LiveValue c={c} asset={id} tag={t[0]} /></td></tr>))}</tbody></table></Card>; }
      case 'text': return <Card key={i} className="span-all"><div className="ans"><Markdown text={w.md} /></div></Card>;
      default: return null;
    }
  })}</div>;
}

/* ================= Forms ================= */
function Signature({ value, onChange }) {
  const ref = useRef(null); const drawing = useRef(false);
  useEffect(() => { const cv = ref.current; const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); if (value) { const img = new Image(); img.onload = () => g.drawImage(img, 0, 0); img.src = value; } }, []); // eslint-disable-line
  const pt = e => { const r = ref.current.getBoundingClientRect(); const p = e.touches ? e.touches[0] : e; return [(p.clientX - r.left) * (ref.current.width / r.width), (p.clientY - r.top) * (ref.current.height / r.height)]; };
  const start = e => { drawing.current = true; const g = ref.current.getContext('2d'); g.lineWidth = 2.2; g.lineCap = 'round'; g.strokeStyle = getComputedStyle(document.body).color; g.beginPath(); g.moveTo(...pt(e)); };
  const move = e => { if (!drawing.current) return; e.preventDefault(); const g = ref.current.getContext('2d'); g.lineTo(...pt(e)); g.stroke(); };
  const end = () => { if (!drawing.current) return; drawing.current = false; onChange(ref.current.toDataURL('image/png')); };
  return <div className="sig"><canvas ref={ref} width={520} height={130} onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end} aria-label="Signature pad" />
    <div className="row"><span className="muted" style={{ fontSize: 11.5 }}><PenLine size={12} style={{ verticalAlign: -2 }} /> Sign with mouse or finger</span>{value && <button type="button" className="btn sm ghost right" onClick={() => { ref.current.getContext('2d').clearRect(0, 0, 520, 130); onChange(''); }}>Clear</button>}</div></div>;
}

function Field({ f, v, set, c }) {
  const common = { id: f.id, 'aria-required': !!f.required };
  switch (f.type) {
    case 'textarea': return <textarea {...common} className="inp" rows={3} value={v || ''} placeholder={f.placeholder} onChange={e => set(e.target.value)} style={{ height: 'auto', padding: 10 }} />;
    case 'number': return <div className="inp-u"><input {...common} className="inp" type="number" inputMode="decimal" value={v ?? ''} placeholder={f.placeholder} onChange={e => set(e.target.value === '' ? '' : Number(e.target.value))} />{f.unit && <span>{f.unit}</span>}</div>;
    case 'select': return <select {...common} className="inp" value={v || ''} onChange={e => set(e.target.value)}><option value="">Select…</option>{f.options.map(o => <option key={o}>{o}</option>)}</select>;
    case 'asset': return <select {...common} className="inp" value={v || ''} onChange={e => set(e.target.value)}><option value="">Select asset…</option>{c.db.assets.map(a => <option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}</select>;
    case 'radio': return <div className="pills" role="radiogroup">{f.options.map(o => <button type="button" key={o} role="radio" aria-checked={v === o} className={v === o ? 'on' : ''} onClick={() => set(o)}>{o}</button>)}</div>;
    case 'checkbox': return <button type="button" className={`check ${v ? 'on' : ''}`} aria-pressed={!!v} onClick={() => set(!v)}><span>{v ? <Check size={13} /> : null}</span>{v ? 'Yes' : 'No'}</button>;
    case 'checklist': { const arr = Array.isArray(v) ? v : []; return <div className="cl">{f.options.map(o => <button type="button" key={o} className={`check ${arr.includes(o) ? 'on' : ''}`} onClick={() => set(arr.includes(o) ? arr.filter(x => x !== o) : [...arr, o])}><span>{arr.includes(o) ? <Check size={13} /> : null}</span>{o}</button>)}</div>; }
    case 'rating': return <div className="stars">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} className={n <= (v || 0) ? 'on' : ''} onClick={() => set(n)} aria-label={`${n} of 5`}><Star size={20} /></button>)}</div>;
    case 'signature': return <Signature value={v} onChange={set} />;
    case 'date': case 'datetime': case 'time': return <input {...common} className="inp" type={f.type === 'datetime' ? 'datetime-local' : f.type} value={v || ''} onChange={e => set(e.target.value)} />;
    default: return <input {...common} className="inp" value={v || ''} placeholder={f.placeholder} onChange={e => set(e.target.value)} />;
  }
}
const filled = (f, v) => (f.type === 'checkbox' ? v === true : Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '');

export function FormView({ c, a }) {
  const app = useApp();
  const form = typeof a.spec?.form === 'object' ? a.spec.form : (c.demo.forms || []).find(f => f.id === a.spec?.form);
  const [tab, setTab] = useState('fill');
  const [vals, setVals] = useState({});
  const [done, setDone] = useState(null);
  const [subs, setSubs] = useState([]);
  const [err, setErr] = useState('');
  const [view, setView] = useState(null);
  useEffect(() => { api.submissions(a.id).then(setSubs).catch(() => {}); }, [a.id, done]);
  if (!form) return <Card><Empty>This form has no fields yet.</Empty></Card>;
  const fields = form.sections.flatMap(s => s.fields);
  const req = fields.filter(f => f.required);
  const pct = Math.round((fields.filter(f => filled(f, vals[f.id])).length / (fields.length || 1)) * 100);
  const submit = async e => {
    e.preventDefault(); setErr('');
    const miss = req.filter(f => !filled(f, vals[f.id]));
    if (miss.length) { setErr(`Fill in ${miss.length} required field${miss.length > 1 ? 's' : ''}: ${miss.slice(0, 3).map(f => f.label).join(', ')}${miss.length > 3 ? '…' : ''}.`); document.getElementById(miss[0].id)?.focus(); return; }
    let s;
    try { s = await api.submit(a.id, vals, app.user.name); } catch { s = { id: 'local', ref: `${c.demo.id.toUpperCase()}-LOCAL`, at: Date.now(), by: app.user.name, values: vals }; }
    app.addLog('Access', 'form.submit', form.name, s.ref); setDone(s); setVals({});
  };
  const label = f => fields.find(x => x.id === f)?.label || f;
  const show = v => (Array.isArray(v) ? v.join(', ') : v === true ? 'Yes' : v === false ? 'No' : typeof v === 'string' && v.startsWith('data:image') ? '✍ signed' : String(v ?? '—'));
  return (
    <div className="form-wrap">
      <div className="seg" style={{ marginBottom: 14 }}><button className={tab === 'fill' ? 'on' : ''} onClick={() => setTab('fill')}><ClipboardList size={13} /> Fill in</button><button className={tab === 'subs' ? 'on' : ''} onClick={() => setTab('subs')}><History size={13} /> Submissions · {subs.length}</button></div>
      {tab === 'subs' ? (
        <Card flush>{subs.length ? <div className="scroll-x"><table className="t"><thead><tr><th>Reference</th><th>By</th><th>Submitted</th><th>{label(fields[0]?.id)}</th><th /></tr></thead><tbody>
          {subs.map(s => <React.Fragment key={s.id}><tr className="click" onClick={() => setView(view === s.id ? null : s.id)}><td className="mono">{s.ref}</td><td>{s.by}</td><td className="num">{fmtDateTime(s.at)}</td><td className="ellipsis" style={{ maxWidth: 240 }}>{show(s.values[fields[0]?.id])}</td><td className="r"><ChevronRight size={14} /></td></tr>
            {view === s.id && <tr><td colSpan={5} style={{ background: 'var(--bg-2)' }}><dl className="kv">{Object.entries(s.values).map(([k, v]) => <React.Fragment key={k}><dt>{label(k)}</dt><dd>{typeof v === 'string' && v.startsWith('data:image') ? <img src={v} alt="signature" style={{ height: 50, background: '#fff', borderRadius: 6 }} /> : show(v)}</dd></React.Fragment>)}</dl></td></tr>}</React.Fragment>)}
        </tbody></table></div> : <Empty>No submissions yet. They are stored in the plant database.</Empty>}</Card>
      ) : done ? (
        <div className="card form-done"><CheckCircle2 size={40} color="var(--good)" /><h2>Submitted</h2><p className="muted">Reference <b className="mono" style={{ color: 'var(--text)' }}>{done.ref}</b> · {fmtDateTime(done.at)} · {done.by}</p><div className="row" style={{ gap: 8, justifyContent: 'center' }}><button className="btn pri" onClick={() => setDone(null)}>Fill another</button><button className="btn" onClick={() => { setDone(null); setTab('subs'); }}>See submissions</button></div></div>
      ) : (
        <form className="form-doc" onSubmit={submit} noValidate>
          <div className="form-head card">
            <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}><span className="form-ic"><ClipboardList size={20} /></span><div className="grow"><h2>{form.name}</h2><p className="muted">{form.desc || a.name} · {c.demo.company}, {c.demo.site}</p></div><span className="muted mono" style={{ fontSize: 11.5 }}>v{a.versions[0].v}</span></div>
            <div className="prog"><i style={{ width: `${pct}%` }} /></div><div className="muted" style={{ fontSize: 11.5 }}>{pct} % complete · {req.length} required</div>
          </div>
          {form.sections.map((s, si) => (
            <section key={si} className="card form-sec"><h3><span>{si + 1}</span>{s.title}</h3>
              <div className="form-grid">{s.fields.map(f => (
                <label key={f.id} className={`fld ${['textarea', 'checklist', 'signature'].includes(f.type) ? 'wide' : ''}`} htmlFor={f.id}>
                  <span className="fl">{f.label}{f.required && <em aria-hidden> *</em>}</span>
                  <Field f={f} v={vals[f.id]} set={v => setVals(x => ({ ...x, [f.id]: v }))} c={c} />
                  {f.help && <span className="fh">{f.help}</span>}
                </label>))}</div>
            </section>))}
          {err && <div className="err card" role="alert" style={{ padding: '10px 14px' }}>{err}</div>}
          <div className="form-foot"><span className="muted" style={{ fontSize: 12 }}><Database size={12} style={{ verticalAlign: -2 }} /> Saved to the plant database with your name and time</span><button className="btn pri" type="submit"><Send />Submit</button></div>
        </form>
      )}
    </div>
  );
}
