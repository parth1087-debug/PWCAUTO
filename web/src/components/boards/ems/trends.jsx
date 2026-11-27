/* Trend explorer · monitoring board (EMS, "Live dashboards").
   Used by energy, electrical and utilities engineers to investigate a drift or an alarm across tags.
   Questions it answers:
   1. How has this tag moved over the period, and when did it cross its limit?
   2. Did two tags move together (cause and effect, e.g. HF-01 trip → TR-02 THD → winding temperature)?
   3. What are the min / average / max / last values and how many hours were out of limits?
   4. Which anomaly events started in the window, on which asset?
   Up to 6 series from the plant model; time range from the period selector; overlay or small multiples;
   CSV download. Presets cover common investigations. */
import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, Empty, Seg } from '../../ui.jsx';
import { useApp } from '../../../App.jsx';
import { themeOf } from '../../../lib/themes.js';
import { fmtNum, fmtDateTime } from '../../../lib/data.js';
import { HOURS } from '../../../shared/engine.js';
import { PlStyle } from './plan-ui.jsx';
import { MultiLine } from './plan-charts.jsx';
import { usePalette } from '../../charts.jsx';

const H = 36e5;
const MAX = 6;
/* categorical order, validated (light on #fff, dark on #111a2e) for lightness, chroma, CVD and contrast */
const COLORS = { light: ['#2F55D4', '#008542', '#8f7fd6', '#B66363', '#0090A8', '#9A6A12'], dark: ['#6F90FF', '#2fb36c', '#9886e0', '#d47a7a', '#2aa6c4', '#c08a2e'] };

const PRESETS_EMS = [
  { id: 'default', name: 'Open alerts', tags: [['GRID-01', 'kva'], ['TR-02', 'wind_temp'], ['AR-01', 'header_pressure'], ['CH-02', 'kw_tr']] },
  { id: 'demand', name: 'Demand & PF', tags: [['GRID-01', 'kva'], ['GRID-01', 'pf'], ['APFC-01', 'pf_bus'], ['APFC-01', 'steps_on'], ['SOL-01', 'ac_kw']] },
  { id: 'air', name: 'Compressed air', tags: [['AR-01', 'header_pressure'], ['AR-01', 'flow'], ['AR-01', 'leak_pct'], ['AR-01', 'plant_sp'], ['AC-03', 'kw']] },
  { id: 'chw', name: 'Chillers', tags: [['CH-01', 'kw_tr'], ['CH-02', 'kw_tr'], ['CH-02', 'cond_approach'], ['CH-01', 'cond_approach'], ['CT-01', 'approach'], ['CH-02', 'tr']] },
  { id: 'steam', name: 'Steam', tags: [['SH-01', 'steam_per_unit'], ['STZ-01', 'steam_loss'], ['CRS-01', 'recovery'], ['BLR-01', 'efficiency'], ['BLR-02', 'efficiency'], ['SH-01', 'pressure']] },
  { id: 'tr', name: 'Transformers', tags: [['TR-02', 'wind_temp'], ['TR-01', 'wind_temp'], ['TR-02', 'thd_i'], ['HF-01', 'comp_current'], ['TR-02', 'load_pct'], ['TR-02', 'oil_temp']] },
];

/** Presets for any plant: the energy meter, utilities and event tags (the board is seeded for EMS only). */
function presetsFor(c) {
  const d = c.demo, ok = ([a, t]) => !!c.db.tagDef(a, t);
  if (d.id === 'ems') return PRESETS_EMS.map(p => ({ ...p, tags: p.tags.filter(ok) }));
  const ev = (d.events || []).filter(e => e.title).map(e => [e.asset, e.tag]);
  return [{ id: 'default', name: 'Open alerts', tags: [d.energy.meter, ...ev].filter(ok).slice(0, 4) }, { id: 'util', name: 'Utilities', tags: (d.energy.utilities || []).filter(ok).slice(0, 6) }];
}

const winIdx = (db, from, to) => [Math.max(0, Math.ceil(HOURS - 1 - (db.anchor - from) / H)), Math.min(HOURS - 1, Math.floor(HOURS - 1 - (db.anchor - to) / H))];
const dec = v => (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : Math.abs(v) >= 1 ? 2 : 3);
const f = (v, ref) => (v == null || Number.isNaN(v) ? '—' : fmtNum(v, dec(ref ?? v)));

export default function TrendExplorer({ c }) {
  const { rng, tick, theme, openPanel } = useApp();
  const p = usePalette();
  const db = c.db;
  const presets = useMemo(() => presetsFor(c), [c]);
  const palette = COLORS[themeOf(theme).dark ? 'dark' : 'light'];
  const [sel, setSel] = useState(() => presets[0].tags.map(([a, t], i) => ({ a, t, ci: i })));
  const [mode, setMode] = useState('multi');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(() => new Set(presets[0].tags.map(x => x[0])));
  const [showEv, setShowEv] = useState(true);
  const [preset, setPreset] = useState('default');

  const isSel = (a, t) => sel.some(s => s.a === a && s.t === t);
  const toggle = (a, t) => {
    setPreset(null);
    setSel(cur => {
      if (cur.some(s => s.a === a && s.t === t)) return cur.filter(s => !(s.a === a && s.t === t));
      if (cur.length >= MAX) return cur;
      const used = new Set(cur.map(s => s.ci)); const ci = [0, 1, 2, 3, 4, 5].find(i => !used.has(i));
      return [...cur, { a, t, ci }];
    });
  };
  const applyPreset = pr => { setPreset(pr.id); setSel(pr.tags.slice(0, MAX).map(([a, t], i) => ({ a, t, ci: i }))); setOpen(new Set(pr.tags.map(x => x[0]))); };

  /* ---- picker tree: area → asset → tags, filtered by search ---- */
  const tree = useMemo(() => {
    const s = q.trim().toLowerCase();
    const areas = [];
    db.assets.forEach(a => {
      const tags = c.demo.classes[a.cls].tags.map(t => ({ key: t[0], name: t[1], unit: t[2] }));
      const hitA = !s || (a.id + ' ' + a.name + ' ' + a.line.name).toLowerCase().includes(s);
      const shown = hitA ? tags : tags.filter(t => (t.name + ' ' + t.key).toLowerCase().includes(s));
      if (!shown.length) return;
      let ar = areas.find(x => x.id === a.area.id); if (!ar) areas.push((ar = { id: a.area.id, name: a.area.name, assets: [] }));
      ar.assets.push({ id: a.id, name: a.name, tags: shown });
    });
    return areas;
  }, [db, c.demo, q]);

  /* ---- series data for the period ---- */
  const series = useMemo(() => sel.map(s => {
    const def = db.tagDef(s.a, s.t); if (!def) return null;
    const h = db.history(s.a, s.t, rng.from, rng.to, 'auto');
    const raw = db.series(s.a, s.t), [i0, i1] = winIdx(db, rng.from, rng.to);
    let mn = Infinity, mx = -Infinity, sum = 0, n = 0, out = 0;
    for (let i = i0; i <= i1; i++) { const v = raw[i]; mn = Math.min(mn, v); mx = Math.max(mx, v); sum += v; n++; if ((def.hi != null && v > def.hi) || (def.lo != null && v < def.lo)) out++; }
    const span = i1 - i0 + 1; let ps = 0, pn = 0;
    for (let i = Math.max(0, i0 - span); i < i0; i++) { ps += raw[i]; pn++; }
    const asset = db.assetById[s.a];
    return { ...s, key: `s${s.ci}`, color: palette[s.ci], def, asset, name: `${s.a} · ${def.name}`, unit: def.unit, pts: h.points, agg: h.agg,
      min: mn, max: mx, avg: n ? sum / n : null, prevAvg: pn ? ps / pn : null, outH: out, hours: n, last: db.live(s.a, s.t, tick) };
  }).filter(Boolean), [sel, db, rng.from, rng.to, tick, palette]);

  const units = [...new Set(series.map(s => s.unit))];
  const sameUnit = units.length <= 1;
  const scaleOf = s => (s.def.hi != null && s.def.hi > 0 ? s.def.hi : Math.max(Math.abs(s.max), 1e-9));
  const rows = useMemo(() => {
    const m = new Map();
    series.forEach(s => s.pts.forEach(pt => { let r = m.get(pt.t); if (!r) m.set(pt.t, (r = { t: pt.t })); r[s.key] = mode === 'overlay' && !sameUnit ? (pt.v / scaleOf(s)) * 100 : pt.v; }));
    return [...m.values()].sort((a, b) => a.t - b.t);
  }, [series, mode, sameUnit]);

  /* ---- events: anomaly starts on the selected assets inside the window ---- */
  const events = useMemo(() => (c.demo.events || []).filter(e => sel.some(s => s.a === e.asset) && (e.title || sel.some(s => s.a === e.asset && s.t === e.tag)))
    .map(e => ({ ...e, t: db.anchor - e.startHoursAgo * H, tagName: db.tagDef(e.asset, e.tag)?.name }))
    .filter(e => e.t >= rng.from && e.t <= rng.to).sort((a, b) => a.t - b.t), [c.demo, sel, db, rng.from, rng.to]);
  const evMarks = (filterFn = () => true) => (showEv ? events.filter(filterFn).map(e => ({ t: e.t, label: `${e.asset} ${e.title ? '▲' : '·'}`, color: e.severity === 'bad' ? p.bad : p.warn })) : []);

  const csv = () => [['Time (ISO)', ...series.map(s => `${s.a} ${s.def.name} (${s.unit || '-'})`)], ...rows.map(r => [new Date(r.t).toISOString(), ...series.map(s => {
    const v = r[s.key]; return v == null ? '' : mode === 'overlay' && !sameUnit ? +(v * scaleOf(s) / 100).toFixed(4) : v; })])];
  const aggLabel = series[0]?.agg === 'hour' ? 'hourly values' : series[0]?.agg === '4h' ? '4-hour averages' : 'daily averages';

  const overlayRefs = sameUnit
    ? [...new Map(series.flatMap(s => [s.def.hi != null && [`hi${s.def.hi}`, { y: s.def.hi, label: `High ${f(s.def.hi)} ${s.unit}`, color: p.bad }], s.def.lo != null && s.def.lo > 0 && [`lo${s.def.lo}`, { y: s.def.lo, label: `Low ${f(s.def.lo)} ${s.unit}`, color: p.warn }]].filter(Boolean))).values()]
    : series.some(s => s.def.hi != null) ? [{ y: 100, label: 'High limit = 100 %', color: p.bad }] : [];

  return (
    <div>
      <PlStyle />
      <div className="tx">
        <Card title="Tags" sub={`${sel.length} of ${MAX} selected · ${db.assets.length} assets`}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input className="inp" style={{ paddingLeft: 30 }} placeholder="Search asset or tag (e.g. TR-02, kW/TR)" value={q} onChange={e => setQ(e.target.value)} aria-label="Search assets and tags" />
          </div>
          <div className="tx-pick">
            {tree.length === 0 && <Empty>No asset or tag matches “{q}”.</Empty>}
            {tree.map(ar => (
              <div key={ar.id} className="tx-area">
                <div className="an">{ar.name}</div>
                {ar.assets.map(a => {
                  const n = sel.filter(s => s.a === a.id).length, isOpen = q.trim() || open.has(a.id);
                  return (
                    <div key={a.id} className="tx-asset">
                      <button onClick={() => setOpen(o => { const x = new Set(o); x.has(a.id) ? x.delete(a.id) : x.add(a.id); return x; })} aria-expanded={!!isOpen}>
                        <span className="muted" style={{ width: 10 }}>{isOpen ? '▾' : '▸'}</span><b style={{ fontWeight: 600 }}>{a.id}</b><span className="ellipsis muted" style={{ flex: 1 }}>{a.name.replace(a.id, '').replace(/^[\s·]+/, '')}</span>{n > 0 && <span className="n">{n}</span>}
                      </button>
                      {isOpen && a.tags.map(t => {
                        const on = isSel(a.id, t.key), dis = !on && sel.length >= MAX;
                        return (
                          <label key={t.key} className={`tx-tag ${dis ? 'dis' : ''}`} title={dis ? `Up to ${MAX} series` : undefined}>
                            <input type="checkbox" checked={on} disabled={dis} onChange={() => toggle(a.id, t.key)} />
                            <span className="ellipsis">{t.name}</span><span className="u">{t.unit}</span>
                          </label>);
                      })}
                    </div>);
                })}
              </div>))}
          </div>
        </Card>

        <div style={{ minWidth: 0 }}>
          <Card title="Trend" sub={`${rng.label} · ${aggLabel}${showEv && events.length ? ` · ${events.length} anomaly start${events.length > 1 ? 's' : ''} marked` : ''}`}
            csv={{ name: `trends-${c.demo.id}`, rows: csv }} ask={series.length ? `Explain the trend of ${series.map(s => `${s.a} ${s.def.name}`).join(', ')} over the last ${rng.label}` : undefined}
            actions={<Seg value={mode} onChange={setMode} options={[{ id: 'multi', label: 'Small multiples' }, { id: 'overlay', label: 'Overlay' }]} />}>
            <div className="tx-pre" style={{ marginBottom: 10 }}>
              <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>Presets</span>
              {presets.map(pr => <button key={pr.id} className={`btn sm ${preset === pr.id ? 'pri' : ''}`} onClick={() => applyPreset(pr)}>{pr.name}</button>)}
              <label className="row" style={{ gap: 6, fontSize: 12, marginLeft: 'auto' }}><input type="checkbox" checked={showEv} onChange={e => setShowEv(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />Event markers</label>
            </div>
            {series.length > 0 && <div className="tx-chips" style={{ marginBottom: 10 }}>
              {series.map(s => <span key={s.key} className="tx-chip"><i style={{ background: s.color }} />{s.a} · {s.def.name}{s.unit ? ` (${s.unit})` : ''}<button aria-label={`Remove ${s.name}`} onClick={() => toggle(s.a, s.t)}>×</button></span>)}
              <button className="btn sm ghost" onClick={() => { setSel([]); setPreset(null); }}>Clear</button>
            </div>}
            {series.length === 0 ? <Empty>Pick up to {MAX} tags on the left, or start from a preset.</Empty>
              : mode === 'overlay' ? (
                <>
                  {!sameUnit && <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Units differ ({units.join(', ')}), so each series is shown as a % of its high alarm limit (or of its period maximum where it has none). Hover for the values; switch to small multiples for real units.</div>}
                  <MultiLine data={rows} series={series.map(s => ({ key: s.key, name: s.name, color: s.color, unit: sameUnit ? s.unit : '%' }))} days={rng.days} height={360} refs={overlayRefs} events={evMarks()} />
                </>)
                : <div className="tx-multi">{series.map(s => {
                  const bad = (s.def.hi != null && s.last > s.def.hi) || (s.def.lo != null && s.last < s.def.lo);
                  return (
                    <div key={s.key} className="tx-mini">
                      <div className="h"><i className="dotc" style={{ background: s.color, flex: 'none' }} /><span className="ellipsis"><b>{s.a}</b> · {s.def.name}</span>
                        <span className="lv" style={{ color: bad ? 'var(--bad)' : undefined }}>{f(s.last, s.def.base)} <small className="muted" style={{ fontWeight: 400 }}>{s.unit}</small></span></div>
                      <MultiLine data={rows} series={[{ key: s.key, name: s.name, color: s.color, unit: s.unit }]} days={rng.days} height={170}
                        refs={[s.def.hi != null && { y: s.def.hi, label: `High ${f(s.def.hi)}`, color: p.bad }, s.def.lo != null && s.def.lo > 0 && { y: s.def.lo, label: `Low ${f(s.def.lo)}`, color: p.warn }].filter(Boolean)}
                        events={evMarks(e => e.asset === s.a)} />
                    </div>);
                })}</div>}
          </Card>

          {series.length > 0 && <Card title="Statistics" sub={`${rng.label}, from hourly data. Change compares the average with the previous ${rng.label}.`} style={{ marginTop: 16 }}>
            <div className="pl-tbl"><table className="t">
              <thead><tr><th>Series</th><th className="r">Min</th><th className="r">Avg</th><th className="r">Max</th><th className="r">Last</th><th className="r">Hours out</th><th className="r">Avg vs prev.</th></tr></thead>
              <tbody>{series.map(s => {
                const out = s.outH > 0, ch = s.prevAvg ? ((s.avg - s.prevAvg) / Math.abs(s.prevAvg)) * 100 : null;
                const lastBad = (s.def.hi != null && s.last > s.def.hi) || (s.def.lo != null && s.last < s.def.lo);
                return (
                  <tr key={s.key}>
                    <td><div className="row" style={{ gap: 8 }}><i className="dotc" style={{ background: s.color, flex: 'none' }} /><div><div style={{ whiteSpace: 'nowrap' }}><b style={{ fontWeight: 600 }}>{s.a}</b> · {s.def.name}</div><div className="muted" style={{ fontSize: 11.5 }}>{s.unit || 'no unit'}{s.def.hi != null ? ` · high ${f(s.def.hi)}` : ''}{s.def.lo != null && s.def.lo > 0 ? ` · low ${f(s.def.lo)}` : ''}</div></div></div></td>
                    <td className="r num">{f(s.min, s.def.base)}</td><td className="r num">{f(s.avg, s.def.base)}</td><td className="r num">{f(s.max, s.def.base)}</td>
                    <td className="r num" style={{ fontWeight: 600, color: lastBad ? 'var(--bad)' : undefined }}>{f(s.last, s.def.base)}</td>
                    <td className="r num" style={{ color: out ? 'var(--bad)' : 'var(--muted)' }}>{s.def.hi == null && !(s.def.lo > 0) ? '—' : `${s.outH} h${out ? ` (${Math.round((s.outH / s.hours) * 100)} %)` : ''}`}</td>
                    <td className="r num">{ch == null ? '—' : `${ch >= 0 ? '+' : '−'}${fmtNum(Math.abs(ch), 1)} %`}</td>
                  </tr>);
              })}</tbody>
            </table></div>
          </Card>}

          {series.length > 0 && <Card title="Events on the selected assets" sub={events.length ? 'Anomaly start times from the agents. Ask Copilot for the diagnosis.' : `No anomaly started on these assets in the last ${rng.label}.`} style={{ marginTop: 16 }}>
            {events.length ? <div className="pl-tbl"><table className="t" style={{ minWidth: 520 }}>
              <thead><tr><th>Start</th><th>Asset · tag</th><th>Event</th><th /></tr></thead>
              <tbody>{events.map(e => (
                <tr key={e.id}><td className="num" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(e.t)}</td><td style={{ whiteSpace: 'nowrap' }}><b style={{ fontWeight: 600 }}>{e.asset}</b> · {e.tagName}</td>
                  <td className="wrap">{e.title ? <><span className={`tag ${e.severity === 'bad' ? 'bad' : 'warn'}`} style={{ marginRight: 6 }}>{e.severity === 'bad' ? 'Alarm' : 'Warning'}</span>{e.title}</> : <span className="muted">Linked drift ({e.kind}) on {e.tagName}</span>}</td>
                  <td className="r">{e.title && <button className="btn sm" onClick={() => openPanel(`Why is ${e.asset} showing: ${e.finding || e.title}?`)}>Diagnose</button>}</td></tr>))}</tbody>
            </table></div> : null}
          </Card>}
        </div>
      </div>
    </div>
  );
}
