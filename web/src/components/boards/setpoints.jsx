/* Setpoint advisor.
   Who uses it: the process head (with the shift in-charge who applies approved changes).
   Questions it answers:
   1. How much value is waiting for my decision (₹ per year of pending recommendations)?
   2. For each recommendation: current vs recommended, expected gain in ₹ and KPI, confidence and evidence.
   3. Is the move inside the safe operating window, and what has the tag done over the selected period?
   4. Approval status and history: who proposed, approved and applied it, and when. */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../../App.jsx';
import { Card, Tag, Empty } from '../ui.jsx';
import { Trend, usePalette } from '../charts.jsx';
import { fmtNum, fmtDateTime, fmtRel } from '../../lib/data.js';
import { api } from '../../lib/api.js';
import { D } from './live.jsx';
import { parseGain, kpiEffect, setpointHistory } from '../../shared/analytics/dash-en.js';
import { EnStyle, Headline, Tile, Meter, inr } from '../../pages/dash/dash-en-ui.jsx';

const ORDER = { proposed: 0, approved: 1, applied: 2, rejected: 3 };
const TONE = { proposed: 'brand', approved: 'good', applied: 'good', rejected: 'bad' };
const keyOf = s => s.asset + '|' + s.tag;

export function SetpointView({ c }) {
  const app = useApp(); const p = usePalette();
  const R = { ...app.rng, from: c.db.anchor - app.rng.days * D, to: c.db.anchor };
  const [list, setList] = useState(() => (c.demo.setpoints || []).map(s => ({ ...s, status: s.status || 'proposed' })));
  const [busy, setBusy] = useState(null);
  const [sel, setSel] = useState(null);
  useEffect(() => { let on = true; api.setpoints(c.demo.id).then(v => on && Array.isArray(v) && v.length && setList(v)).catch(() => {}); return () => { on = false; }; }, [c.demo.id]);

  const rows = useMemo(() => list.map(s => {
    const g = parseGain(s.gain, c.demo, s); const k = c.demo.kpis.find(x => x.id === s.kpi);
    return { ...s, lakh: g.lakh, basis: g.basis, k, effect: kpiEffect(s.gain) };
  }).sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || b.lakh - a.lakh), [list, c.demo]);

  const decide = async (s, status) => {
    setBusy(keyOf(s));
    try { await api.decide({ demo: c.demo.id, asset: s.asset, tag: s.tag, status, by: app.user.name }); } catch { /* offline: keep locally */ }
    setList(l => l.map(x => (keyOf(x) === keyOf(s) ? { ...x, status, decidedBy: app.user.name, decidedAt: Date.now() } : x)));
    app.addLog('Agents', `setpoint.${status}`, `${s.asset}.${s.tag}`, `${s.current} → ${s.recommended} ${s.unit}`);
    app.toast(status === 'approved' ? 'Approved. A change request goes to the process in-charge (P-02). Nothing is written to the control system.' : 'Rejected and recorded with your name.');
    setBusy(null);
  };

  if (!rows.length) return <Card><EnStyle /><Empty>No setpoint recommendations for this plant yet.</Empty></Card>;
  const sum = st => rows.filter(r => st.includes(r.status)).reduce((a, r) => a + r.lakh, 0);
  const pend = rows.filter(r => r.status === 'proposed');
  const conf = pend.length ? pend.reduce((a, r) => a + r.confidence, 0) / pend.length : 0;
  const cur = rows.find(r => keyOf(r) === sel) || pend[0] || rows[0];

  return (
    <div className="grid" style={{ gap: 16 }}>
      <EnStyle />
      <Headline>
        {pend.length ? <span><b>{inr(sum(['proposed']))} a year</b> is waiting for your decision across <b>{pend.length}</b> recommendation{pend.length > 1 ? 's' : ''}. Largest: <b>{pend[0].name}</b> ({inr(pend[0].lakh)}/yr, confidence {Math.round(pend[0].confidence * 100)} %).</span>
          : <span>No recommendation is waiting. <b>{inr(sum(['approved', 'applied']))}/yr</b> approved or applied.</span>}
      </Headline>
      <div className="en-tiles n4" style={{ margin: 0 }}>
        <Tile label="Pending your decision" value={inr(sum(['proposed']))} unit="/yr" tone={pend.length ? 'brand' : 'good'} foot={`${pend.length} of ${rows.length} recommendations`} />
        <Tile label="Approved, not yet applied" value={inr(sum(['approved']))} unit="/yr" foot={`${rows.filter(r => r.status === 'approved').length} change request(s) with the shift in-charge`} />
        <Tile label="Applied" value={inr(sum(['applied']))} unit="/yr" tone="good" foot={`${rows.filter(r => r.status === 'applied').length} running in the plant · tracked against KPI`} />
        <Tile label="Confidence of pending" value={pend.length ? `${Math.round(conf * 100)} %` : '—'} foot={<><ShieldCheck size={12} style={{ verticalAlign: -2, color: 'var(--good)' }} /> advisory only (P-01, P-02): no writes to control</>} bar={pend.length ? { value: conf, max: 1, mark: 0.75, tone: conf >= 0.75 ? 'good' : 'warn' } : undefined} />
      </div>

      <Card title="Recommendations, pending first and largest value first" sub="₹ per year: stated = engineering estimate in the recommendation · from MWh = energy gain × PPA tariff · per event = cost avoided once · est. = agent estimate · select a row for evidence and history" flush
        csv={{ name: 'setpoints', rows: () => rows.map(r => ({ status: r.status, name: r.name, asset: r.asset, tag: r.tag, current: r.current, recommended: r.recommended, unit: r.unit, inr_lakh_yr: r.lakh.toFixed(1), basis: r.basis, kpi: r.k?.name, effect: r.effect, confidence: r.confidence })) }}>
        <div className="en-tbl"><table className="t" style={{ minWidth: 760 }}>
          <thead><tr><th>Status</th><th>Recommendation</th><th className="r">Current → recommended</th><th className="r">Gain ₹/yr</th><th>KPI effect</th><th>Confidence</th><th>Decision</th></tr></thead>
          <tbody>{rows.map(r => {
            const ch = r.current ? ((r.recommended - r.current) / Math.abs(r.current)) * 100 : null;
            return (
              <tr key={keyOf(r)} className={`click ${keyOf(cur) === keyOf(r) ? 'on' : ''}`} onClick={() => setSel(keyOf(r))}>
                <td><Tag c={TONE[r.status]}>{r.status}</Tag></td>
                <td className="wrap"><b style={{ fontWeight: 600 }}>{r.name}</b><div className="muted" style={{ fontSize: 11.5 }}><span className="mono">{r.asset}</span> · {c.db.tagDef(r.asset, r.tag)?.name || r.tag}</div></td>
                <td className="r num">{fmtNum(r.current)} → <b style={{ color: 'var(--brand)' }}>{fmtNum(r.recommended)}</b> <span className="muted">{r.unit}</span>{ch != null && isFinite(ch) && <div className="muted" style={{ fontSize: 11 }}>{ch > 0 ? '+' : ''}{fmtNum(ch, 1)} %</div>}</td>
                <td className="r num"><b>{inr(r.lakh)}</b><div className="muted" style={{ fontSize: 10.5 }}>{r.basis}</div></td>
                <td className="wrap" style={{ fontSize: 12, minWidth: 180 }}>{r.k && <span className="muted">{r.k.name}: </span>}{r.effect || '—'}</td>
                <td style={{ minWidth: 90 }}><span className="num">{Math.round(r.confidence * 100)} %</span><Meter value={r.confidence} max={1} mark={0.75} tone={r.confidence >= 0.75 ? 'good' : 'warn'} /></td>
                <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>{r.status === 'proposed'
                  ? <><button className="btn sm pri" disabled={busy === keyOf(r)} onClick={() => decide(r, 'approved')} aria-label={`Approve ${r.name}`}><Check />Approve</button> <button className="btn sm" disabled={busy === keyOf(r)} onClick={() => decide(r, 'rejected')} aria-label={`Reject ${r.name}`}><X /></button></>
                  : <span className="muted" style={{ fontSize: 12 }}>{r.decidedBy ? `${r.decidedBy} · ${fmtRel(r.decidedAt)}` : r.status === 'applied' ? 'running' : 'with shift in-charge'}</span>}</td>
              </tr>);
          })}</tbody>
        </table></div>
      </Card>

      {cur && <Detail c={c} R={R} s={cur} p={p} />}
    </div>
  );
}

function Detail({ c, R, s, p }) {
  const d = c.db.tagDef(s.asset, s.tag); const a = c.db.assetById[s.asset];
  const hist = d ? c.db.history(s.asset, s.tag, R.from, R.to) : null;
  const lo = s.lo ?? Math.min(s.current, s.recommended) * 0.9, hi = s.hi ?? Math.max(s.current, s.recommended) * 1.1;
  const pos = v => `${Math.max(0, Math.min(100, ((v - lo) / ((hi - lo) || 1)) * 100))}%`;
  const ks = s.k ? c.db.kpiSummary(s.k.id, R.from, R.to) : null;
  const history = [...setpointHistory(c.demo, s, c.db.now), ...(s.decidedAt ? [{ at: s.decidedAt, who: s.decidedBy, what: s.status === 'approved' ? 'Approved · change request raised (P-02)' : 'Rejected', tone: s.status === 'approved' ? 'good' : 'bad' }] : [])].sort((x, y) => y.at - x.at);
  const vals = hist ? hist.points.map(x => x.v) : [];
  const yl = Math.min(...vals, s.current, s.recommended), yh = Math.max(...vals, s.current, s.recommended); const pad = (yh - yl) * 0.1 || Math.abs(yh) * 0.05 || 1;
  return (
    <Card title={s.name} sub={`${s.asset} · ${a?.name || ''} · ${d?.name || s.tag}${a ? ' · ' + a.area.name : ''}`} actions={<Tag c={TONE[s.status]}>{s.status}</Tag>}>
      <div className="sp2">
        <div>
          <div className="sp-move"><div><span>Current</span><b>{fmtNum(s.current)}</b><small>{s.unit}</small></div><ArrowRight size={20} color="var(--muted)" /><div><span>Recommended</span><b style={{ color: 'var(--brand)' }}>{fmtNum(s.recommended)}</b><small>{s.unit}</small></div></div>
          <div className="sp-band" title="Safe operating window"><div className="tr" /><i className="cur" style={{ left: pos(s.current) }} title="Current" /><i className="rec" style={{ left: pos(s.recommended) }} title="Recommended" /><span style={{ left: 0 }}>{fmtNum(lo)}</span><span style={{ right: 0 }}>{fmtNum(hi)} {s.unit}</span></div>
          <div className="muted" style={{ fontSize: 11.5, margin: '2px 0 12px' }}>Safe operating window {fmtNum(lo)}–{fmtNum(hi)} {s.unit}; both values are inside it.</div>
          <div className="en-mini" style={{ marginBottom: 12 }}>
            <span className="muted">Expected gain</span><b className="num" style={{ textAlign: 'right' }}>{inr(s.lakh)}/yr <span className="muted" style={{ fontWeight: 400 }}>({s.basis})</span></b>
            {s.effect && <><span className="muted">KPI effect</span><span style={{ textAlign: 'right' }}>{s.effect}</span></>}
            {ks && <><span className="muted">{ks.name} now</span><span className="num" style={{ textAlign: 'right' }}>{fmtNum(ks.value, ks.dec)} {ks.unit} · target {fmtNum(ks.target, ks.dec)}</span></>}
            <span className="muted">Confidence</span><span className="num" style={{ textAlign: 'right' }}>{Math.round(s.confidence * 100)} %</span>
          </div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 4 }}>Evidence</div>
          <p style={{ margin: '0 0 14px', color: 'var(--text-2)', lineHeight: 1.55 }}>{s.reason}</p>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 4 }}>History</div>
          <ul className="sp2-hist">{history.map((h, i) => <li key={i}><i style={{ background: `var(--${h.tone})` }} /><span><b style={{ fontWeight: 600 }}>{h.what}</b><div className="muted" style={{ fontSize: 11.5 }}>{h.who} · {fmtDateTime(h.at)}</div></span></li>)}</ul>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{d?.name} over {R.label}: current setpoint (grey), recommended (green), window limits (red)</div>
          {hist ? <Trend data={hist.points} series={[{ key: 'v', name: d?.name, type: 'line' }]} unit={s.unit} days={R.days} height={240} yDomain={[+(Math.min(yl, lo) - pad).toPrecision(4), +(Math.max(yh, hi) + pad).toPrecision(4)]}
            refs={[{ y: s.recommended, label: `Recommended ${fmtNum(s.recommended)}`, color: p.good, solid: true }, { y: s.current, label: `Current ${fmtNum(s.current)}`, color: p.axis }, ...(s.lo != null ? [{ y: s.lo, label: `Min ${fmtNum(s.lo)}` }] : []), ...(s.hi != null ? [{ y: s.hi, label: `Max ${fmtNum(s.hi)}` }] : [])]} />
            : <Empty>No history for this tag.</Empty>}
        </div>
      </div>
    </Card>
  );
}
