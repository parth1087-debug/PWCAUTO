/* Real-time monitor.
   Who uses it: the control room (shift in-charge, panel operators).
   Questions it answers:
   1. What is abnormal right now (out of limit or near limit), where, and since when?
   2. What should I do about it (linked diagnosis, else the first response for that kind of tag)?
   3. Which alarms are still unacknowledged?
   4. How are the key tags of each area moving (only tags with limits, with the limit drawn on the sparkline)? */
import React, { useMemo, useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { Card, Tag, Empty } from '../ui.jsx';
import { fmtNum, fmtRel, fmtTime } from '../../lib/data.js';
import { D, LiveBadge } from './live.jsx';
import { keyTags, tagState, hasLimit, abnormalSince, limitText, firstAction } from '../../shared/analytics/dash-en.js';
import { EnStyle, LimitSpark } from '../../pages/dash/dash-en-ui.jsx';

const SEV = { bad: 'Out of limit', warn: 'Near limit' };

export function RealtimeView({ c, assets: wanted }) {
  const app = useApp();
  const [acked, setAcked] = useState({});
  const [showAll, setShowAll] = useState(false);
  const ids = useMemo(() => {
    const valid = (wanted || c.demo.realtime?.assets || []).filter(x => c.db.assetById[x]);
    if (valid.length) return valid;
    const spot = c.db.assetById[c.demo.maintenance?.spotlight];
    return c.db.assets.filter(a => a.line === spot?.line || a.area.id === 'utilities').slice(0, 10).map(a => a.id).concat(c.db.assets.slice(0, 4).map(a => a.id)).filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 10);
  }, [c, wanted]);

  /* agent alarms (alerts and insights tied to an asset) */
  const alarms = app.messages.filter(m => (m.type === 'alert' || m.type === 'insight') && m.asset);
  const alarmFor = (a, t) => alarms.find(m => m.asset === a && m.tag === t);

  /* plant-wide scan of key tags with limits, at the live tick */
  const abnormal = useMemo(() => {
    const out = [];
    c.db.assets.forEach(a => keyTags(c.db, c.demo, a.id, 4).forEach(t => {
      const def = c.db.tagDef(a.id, t); if (!hasLimit(def)) return;
      const v = c.db.live(a.id, t, app.tick); const st = tagState(def, v);
      const m = alarmFor(a.id, t);
      if (st === 'good' && !(m && !m.state && m.type === 'alert')) return;
      const since = abnormalSince(c.db, a.id, t) || (m ? m.time : c.db.now - 10 * 60e3);
      const ev = (c.demo.events || []).find(e => e.asset === a.id && e.tag === t && e.diagnosis) || (c.demo.events || []).find(e => e.asset === a.id && e.diagnosis);
      out.push({ key: a.id + '.' + t, a, t, def, v, st: st === 'good' ? 'warn' : st, since: Math.min(since, m ? m.time : Infinity), m, reco: ev?.diagnosis?.reco || firstAction(def, v) });
    }));
    const alarmRank = r => (r.m && !r.m.state ? 0 : 1);
    return out.sort((x, y) => (x.st === y.st ? 0 : x.st === 'bad' ? -1 : 1) || alarmRank(x) - alarmRank(y) || x.since - y.since);
  }, [c, app.tick, app.messages]);

  const isAcked = r => !!(r.m?.state || acked[r.key]);
  const ack = r => {
    if (r.m) app.actions.setMsg(r.m.id, { state: 'Acknowledged', by: app.user.name, at: Date.now(), read: true });
    else setAcked(s => ({ ...s, [r.key]: { by: app.user.name, at: Date.now() } }));
    app.addLog('Access', 'alarm.ack', `${r.a.id}.${r.t}`, `Acknowledged by ${app.user.name}`);
    app.toast(`${r.a.id} ${r.def.name.toLowerCase()} acknowledged and logged.`);
  };
  const ackMsg = m => { app.actions.setMsg(m.id, { state: 'Acknowledged', by: app.user.name, at: Date.now(), read: true }); app.addLog('Access', 'alarm.ack', m.asset, m.title.slice(0, 50)); app.toast('Alarm acknowledged and logged.'); };

  const nBad = abnormal.filter(r => r.st === 'bad').length, nWarn = abnormal.filter(r => r.st === 'warn').length;
  const unack = abnormal.filter(r => !isAcked(r)).length + alarms.filter(m => !m.state && !abnormal.find(r => r.m?.id === m.id)).length;
  const sparkDays = Math.min(app.rng.days || 1, 7);
  const spFrom = c.db.anchor - sparkDays * D;

  /* monitored assets grouped by site and area; groups with problems first */
  const groups = useMemo(() => {
    const g = new Map();
    ids.forEach(id => { const a = c.db.assetById[id]; const key = c.db.sites.length > 1 ? a.site.name : a.area.name; if (!g.has(key)) g.set(key, []); g.get(key).push(a); });
    return [...g.entries()].map(([name, list]) => {
      const rows = list.map(a => { const tags = keyTags(c.db, c.demo, a.id, 3); const sts = tags.map(t => { const st = tagState(c.db.tagDef(a.id, t), c.db.live(a.id, t, app.tick)); const m = alarmFor(a.id, t); return st === 'good' && m && !m.state && m.type === 'alert' ? 'warn' : st; }); return { a, tags, st: sts.includes('bad') ? 'bad' : sts.includes('warn') ? 'warn' : 'good' }; });
      const rank = rows.some(r => r.st === 'bad') ? 0 : rows.some(r => r.st === 'warn') ? 1 : 2;
      return { name, rows: rows.sort((x, y) => ['bad', 'warn', 'good'].indexOf(x.st) - ['bad', 'warn', 'good'].indexOf(y.st)), rank };
    }).sort((x, y) => x.rank - y.rank);
  }, [ids, c, app.tick, app.messages]);

  const top = abnormal[0];
  const shown = showAll ? abnormal : abnormal.slice(0, 8);
  return (
    <div className="grid" style={{ gap: 16 }}>
      <EnStyle />
      <div className="rt-strip card">
        <div className="rt-k"><span className="dot-s bad" /><b>{nBad}</b> out of limit</div>
        <div className="rt-k"><span className="dot-s warn" /><b>{nWarn}</b> near limit</div>
        <div className="rt-k"><b style={{ color: unack ? 'var(--bad)' : undefined }}>{unack}</b> unacknowledged</div>
        <div className="grow" />
        <LiveBadge />
      </div>
      {top && <div className="en-head" style={{ margin: 0, borderLeftColor: `var(--${top.st})` }}><span><b>{top.a.id} {top.def.name.toLowerCase()} {fmtNum(top.v)} {top.def.unit}</b> ({SEV[top.st].toLowerCase()}, limit {limitText(top.def)}) in {top.a.area.name}{c.db.sites.length > 1 ? `, ${top.a.site.name}` : ''} since {fmtRel(top.since)}. <b>Do:</b> {top.reco}</span></div>}

      <Card title={abnormal.length ? `Abnormal now: ${abnormal.length} tags` : 'Nothing abnormal right now'} sub="plant-wide scan of tags with alarm limits · out of limit first, then longest running" flush>
        {abnormal.length ? <div className="en-tbl"><table className="t">
          <thead><tr><th>State</th><th>Where</th><th>Tag</th><th className="r">Now</th><th className="r">Limit</th><th>Since</th><th>What to do</th><th>Ack</th></tr></thead>
          <tbody>{shown.map(r => (
            <tr key={r.key}>
              <td><Tag c={r.st}>{SEV[r.st]}</Tag></td>
              <td><b className="mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{r.a.id}</b> <span className="muted">{r.a.name}</span><div className="muted" style={{ fontSize: 11 }}>{c.db.sites.length > 1 ? r.a.site.name.split(' · ')[0] : r.a.area.name}</div></td>
              <td>{r.def.name}</td>
              <td className="r num" style={{ color: `var(--${r.st})`, fontWeight: 650 }}>{fmtNum(r.v)} <span className="muted" style={{ fontWeight: 400 }}>{r.def.unit}</span></td>
              <td className="r num muted">{limitText(r.def)}</td>
              <td className="num" style={{ whiteSpace: 'nowrap' }}>{fmtRel(r.since)}<div className="muted" style={{ fontSize: 11 }}>{fmtTime(r.since)}</div></td>
              <td className="wrap" style={{ fontSize: 12.5 }}>{r.reco}{r.m && <> <button className="en-link" style={{ color: 'var(--brand)' }} onClick={() => app.nav('messages/' + r.m.id)}>diagnosis</button></>}</td>
              <td>{isAcked(r) ? <span className="muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}><Check size={12} style={{ verticalAlign: -2 }} /> {r.m?.by || acked[r.key]?.by}</span> : <button className="btn sm" onClick={() => ack(r)}>Ack</button>}</td>
            </tr>))}</tbody>
        </table>{abnormal.length > 8 && <div style={{ padding: '8px 16px' }}><button className="btn sm" onClick={() => setShowAll(v => !v)}>{showAll ? 'Show fewer' : `Show all ${abnormal.length}`}</button></div>}</div>
          : <Empty>All tags with alarm limits are inside their limits.</Empty>}
      </Card>

      <div className="grid g31">
        <div>
          {groups.map(g => (
            <section key={g.name} style={{ marginBottom: 14 }}>
              <div className="en-sec"><h4>{g.name}</h4><span className="muted" style={{ fontSize: 11.5 }}>{g.rows.length} assets · sparklines last {sparkDays === 1 ? '24 h' : sparkDays + ' days'} · red dashes = limit</span></div>
              <div className="rt2-grid">{g.rows.map(({ a, tags, st }) => (
                <div key={a.id} className={`rt-card ${st}`}>
                  <div className="row"><span className={`dot-s ${st}`} /><b className="mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{a.id}</b><span className="muted ellipsis" style={{ fontSize: 12 }}>{a.name}</span>
                    <button className="ibtn right" style={{ width: 26, height: 26 }} title={`Open ${a.id} in maintenance`} aria-label={`Open ${a.id}`} onClick={() => app.nav('d/maintenance/' + a.id)}><ChevronRight size={14} /></button></div>
                  {tags.map(t => {
                    const d = c.db.tagDef(a.id, t); const v = c.db.live(a.id, t, app.tick); const s = tagState(d, v);
                    const pts = c.db.history(a.id, t, spFrom, c.db.anchor, sparkDays <= 2 ? 'hour' : '4h').points;
                    return <div key={t} className="rt2-row"><span className="ellipsis" title={d.name}>{d.name}<span className="rt2-lim">{limitText(d)} {hasLimit(d) ? d.unit : ''}</span></span>
                      <span className={`lv-v ${s}`} key={app.tick}>{fmtNum(v)}<small> {d.unit}</small></span>
                      <LimitSpark points={pts} hi={d.hi} lo={d.lo} state={s} height={26} width={84} label={`${d.name} trend`} /></div>;
                  })}
                  {c.db.sites.length > 1 && <div className="muted" style={{ fontSize: 10.5, marginTop: 4 }}>{a.area.name}</div>}
                </div>))}</div>
            </section>))}
        </div>
        <Card title={`Alarms · ${alarms.filter(m => !m.state).length} to acknowledge`} sub="from the agents · newest first" flush>
          {alarms.length ? alarms.map(m => (
            <div key={m.id} className="feed-i" style={{ cursor: 'default' }}>
              <span className={`rail ${m.sev}`} />
              <span>
                <button className="en-link" style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'left', color: 'var(--text)' }} onClick={() => app.nav('messages/' + m.id)}>{m.title}</button>
                <div className="muted" style={{ fontSize: 11.5 }}>{m.asset} · {m.from} · {fmtRel(m.time)}</div>
                <div style={{ marginTop: 6 }}>{m.state ? <Tag c="good">{m.state} · {m.by}</Tag> : <button className="btn sm" onClick={() => ackMsg(m)}>Acknowledge</button>}</div>
              </span>
            </div>)) : <Empty>No alarms.</Empty>}
        </Card>
      </div>
    </div>
  );
}
