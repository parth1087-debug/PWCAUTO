/* Power plant recommendation screens (Faclon Power Plant AI): auxiliary scheduler, soot blowing and setpoints.
   Advisory only: every button asks for a confirmation and records the decision; nothing is written to the DCS. */
import React, { useState } from 'react';
import { Mimic, Equip, Val, Pipe, Fan, Lamp, Lbl, Title, Zone, Flame, Generator, MiniTrend, useMimic } from './kit.jsx';
import { useApp } from '../App.jsx';
import { fmtNum } from '../lib/data.js';

/* ---------------- shared local pieces ---------------- */
const BRAND = 'var(--brand)', WARN = '#e8a317', BAD = 'var(--bad)';
const T = (size, weight, fill = 'var(--m-text)', extra) => ({ fontSize: size, fontWeight: weight, fill, ...extra });
const MUT = 'var(--m-muted)';

/** Word wrap to lines of about n characters. */
function wrap(s, n) {
  const out = []; let line = '';
  String(s).split(' ').forEach(w => { if ((line + ' ' + w).trim().length > n && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); });
  if (line) out.push(line); return out;
}
const hh = h => `${String(((h % 24) + 24) % 24).padStart(2, '0')}:00`;
const nf = (v, d = 0) => (v == null || Number.isNaN(v) ? '—' : v.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }));

/** SVG button. */
function Btn({ x, y, w = 120, h = 26, label, pri, onClick, small }) {
  return <g role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onClick && onClick(); }} onKeyDown={e => (e.key === 'Enter' && onClick ? onClick() : null)}>
    <rect x={x} y={y} width={w} height={h} rx="5" style={{ fill: pri ? BRAND : 'var(--bg)', stroke: pri ? BRAND : 'var(--m-eq-3)', strokeWidth: 1.2 }} />
    <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" style={T(small ? 10.5 : 11.5, 600, pri ? '#fff' : 'var(--m-text)')}>{label}</text>
  </g>;
}
/** Status chip. */
function Chip({ x, y, label, kind = 'muted', w }) {
  const col = kind === 'now' ? BRAND : kind === 'soon' ? WARN : kind === 'bad' ? BAD : kind === 'good' ? 'var(--good)' : 'var(--m-edge)';
  const ww = w || label.length * 6.2 + 14;
  return <g><rect x={x} y={y} width={ww} height={18} rx="9" style={{ fill: 'var(--bg)', stroke: col, strokeWidth: 1.3 }} />
    <text x={x + ww / 2} y={y + 12.5} textAnchor="middle" style={T(10, 650, col)}>{label}</text></g>;
}
/** Compact live number (for table rows), coloured by the tag state, clickable. */
function TVal({ a, t, x, y, anchor = 'end', dec, size = 11.5, unit }) {
  const m = useMimic(); const r = m.read(a, t);
  const col = r.st === 'bad' ? BAD : r.st === 'warn' ? '#b7791f' : 'var(--m-text)';
  const v = r.v == null ? '—' : dec != null ? r.v.toFixed(dec) : fmtNum(r.v);
  return <text x={x} y={y} textAnchor={anchor} key={m.tick} onClick={e => { e.stopPropagation(); m.select(a); }}
    style={{ ...T(size, 600, col), cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }}>{v}{unit && <tspan style={T(size - 2, 400, MUT)}> {r.unit}</tspan>}</text>;
}
/** Confirmation dialog drawn inside the SVG. d: { title, body, ok, toast, onOk } */
function Dialog({ W, H, d, close }) {
  const app = useApp();
  if (!d) return null;
  const w = 460, lines = wrap(d.body, 70), h = 112 + lines.length * 15, x = (W - w) / 2, y = (H - h) / 2;
  const ok = () => { d.onOk && d.onOk(); app.toast(d.toast || 'Recorded. Nothing is written to the control system.'); close(); };
  return <g>
    <rect x={0} y={0} width={W} height={H} style={{ fill: 'var(--m-bg)', opacity: 0.72 }} onClick={close} />
    <rect x={x} y={y} width={w} height={h} rx="8" style={{ fill: 'var(--bg)', stroke: 'var(--m-eq-3)', strokeWidth: 1.2 }} />
    <text x={x + 18} y={y + 28} style={T(14, 700)}>{d.title}</text>
    {lines.map((l, i) => <text key={i} x={x + 18} y={y + 52 + i * 15} style={T(11.5, 400)}>{l}</text>)}
    <text x={x + 18} y={y + 60 + lines.length * 15} style={T(10.5, 400, MUT)}>Advisory: the shift in-charge carries out each step. Nothing is written to the DCS.</text>
    <Btn x={x + w - 230} y={y + h - 40} w={120} label={d.ok || 'Confirm'} pri onClick={ok} />
    <Btn x={x + w - 100} y={y + h - 40} w={82} label="Cancel" onClick={close} />
  </g>;
}
/** Horizontal bar for one tag (or a computed value) with trigger, limit and design marks. */
function HBar({ a, t, x, y, w = 100, min, max, label, trig, design, v: vOver, unit: uOver, dec = 0 }) {
  const m = useMimic(); const r = t ? m.read(a, t) : { v: vOver, st: 'good', def: null, unit: uOver };
  const v = vOver != null ? vOver : r.v; const unit = uOver || r.unit;
  const X = val => x + w * Math.max(0, Math.min(1, (val - min) / (max - min)));
  const lim = r.def ? (r.def.hi != null ? r.def.hi : r.def.lo) : null;
  const fill = r.st === 'bad' ? BAD : r.st === 'warn' ? WARN : 'var(--m-edge)';
  return <g style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); m.select(a); }}>
    <text x={x} y={y + 10} style={T(9.5, 400, MUT)}>{label}</text>
    <text x={x + w} y={y + 10} textAnchor="end" key={m.tick} style={{ ...T(11, 650, r.st === 'bad' ? BAD : r.st === 'warn' ? '#b7791f' : 'var(--m-text)'), fontVariantNumeric: 'tabular-nums' }}>{v == null ? '—' : v.toFixed(dec)}<tspan style={T(9, 400, MUT)}> {unit}</tspan></text>
    <rect x={x} y={y + 16} width={w} height={8} rx="2" style={{ fill: 'var(--m-eq-3)', opacity: 0.45 }} />
    {v != null && <rect x={x} y={y + 16} width={Math.max(1, X(v) - x)} height={8} rx="2" style={{ fill }} />}
    {design != null && <line x1={X(design)} y1={y + 14} x2={X(design)} y2={y + 26} style={{ stroke: 'var(--m-text)', strokeWidth: 1.2, opacity: 0.6 }} />}
    {trig != null && <line x1={X(trig)} y1={y + 13} x2={X(trig)} y2={y + 27} style={{ stroke: BRAND, strokeWidth: 2, strokeDasharray: '2 2' }} />}
    {lim != null && lim !== 0 && lim > min && lim < max && <line x1={X(lim)} y1={y + 13} x2={X(lim)} y2={y + 27} style={{ stroke: BAD, strokeWidth: 1.5 }} />}
  </g>;
}

/* =====================================================================================
   1. Auxiliary scheduler
   ===================================================================================== */
const AUX_ROWS = [
  ['Draught fans', ['ID-A', 'ID-B', 'FD-A', 'FD-B', 'PA-A', 'PA-B']],
  ['Coal mills', ['MILL-A', 'MILL-B', 'MILL-C', 'MILL-D', 'MILL-E']],
  ['Feed pumps', ['BFP-A', 'BFP-B', 'BFP-C']],
  ['Condensate', ['CEP-A', 'CEP-B']],
  ['CW pumps', ['CWP-A', 'CWP-B']],
  ['CT fans', ['CTF-1', 'CTF-2', 'CTF-3', 'CTF-4', 'CTF-5', 'CTF-6']],
];
const GX = 272, GW = 720, PX = GW / 24; // gantt x, width, px per hour
const MILL_OFF_MW = 76, WB6 = 21, WB5 = 19, TARIFF = 4.0;
const cyc = (h, peak) => 0.5 + 0.5 * Math.cos((2 * Math.PI * (h - peak)) / 24);
const loadShape = h => cyc(h, 15) + 0.12 * Math.exp(-((h - 20) ** 2) / 4);

function AuxBody() {
  const m = useMimic(); const rd = (a, t) => m.read(a, t).v ?? 0;
  const [dlg, setDlg] = useState(null); const [status, setStatus] = useState(null);
  const h0 = new Date().getHours();
  const L = rd('TG-01', 'load'), wbNow = rd('CT-01', 'wet_bulb'), bp = rd('COND-01', 'back_pressure');
  /* 24-hour forecast from the live load and wet bulb with a daily shape */
  const decay = i => Math.exp(-i / 3); // the live offset fades into the daily profile over a few hours
  const loadProf = h => 70 + 30 * loadShape(h), wbProf = h => 17 + 10 * cyc(h, 14);
  const fc = Array.from({ length: 25 }, (_, i) => {
    const hc = (h0 + i) % 24;
    return { load: Math.max(58, Math.min(100, loadProf(hc) + (L - loadProf(h0)) * decay(i))), wb: Math.max(10, wbProf(hc) + (wbNow - wbProf(h0)) * decay(i)) };
  });
  const mid = i => ({ load: (fc[i].load + fc[i + 1].load) / 2, wb: (fc[i].wb + fc[i + 1].wb) / 2 });
  const millOff = [], ct6 = [], ct5 = [];
  for (let i = 0; i < 24; i++) { const f = mid(i); millOff.push(f.load < MILL_OFF_MW); ct6.push(f.wb < WB6); ct5.push(f.wb < WB5); }
  const running = a => rd(a, 'kw') > 5;
  const plan = (a, i) => {
    const run = running(a);
    if (a === 'MILL-D' && run && millOff[i]) return 'stop';
    if (a === 'CTF-6' && run && ct6[i]) return 'stop';
    if (a === 'CTF-5' && run && ct5[i]) return 'stop';
    return run ? 'run' : 'sb';
  };
  /* savings */
  const kwD = rd('MILL-D', 'kw'), ctKw = rd('CTF-6', 'kw');
  const millSave = kwD * 0.6 + 35; // the 3 remaining mills load up; PA fan duty falls
  const ctSave = Math.max(0, ctKw - 20); // fan power less the turbine output lost to vacuum
  const nMill = millOff.filter(Boolean).length, n6 = ct6.filter(Boolean).length, n5 = ct5.filter(Boolean).length;
  const kwh = nMill * millSave + n6 * ctSave + n5 * ctSave;
  const peakKw = Math.max(...Array.from({ length: 24 }, (_, i) => (millOff[i] ? millSave : 0) + (ct6[i] ? ctSave : 0) + (ct5[i] ? ctSave : 0)));
  const genMWh = fc.slice(0, 24).reduce((s, f) => s + f.load, 0);
  const apcPP = (kwh / 1000 / genMWh) * 100;
  const span = arr => { const i0 = arr.indexOf(true); if (i0 < 0) return null; let i1 = i0; while (i1 + 1 < 24 && arr[i1 + 1]) i1++; return `${hh(h0 + i0)}–${hh(h0 + i1 + 1)}`; };
  const minLoad = Math.min(...fc.map(f => f.load)), maxLoad = Math.max(...fc.map(f => f.load));
  const coal = ['MILL-A', 'MILL-B', 'MILL-C', 'MILL-D'].reduce((s, a) => s + rd(a, 'coal_flow'), 0);
  const loading3 = ((coal * (minLoad / Math.max(L, 1))) / (3 * 17)) * 100;
  const scoopPeak = rd('BFP-A', 'scoop') * (maxLoad / Math.max(L, 1));

  /* geometry */
  const FY0 = 52, FY1 = 148, ly = v => FY1 - ((v - 55) / (105 - 55)) * (FY1 - FY0), wy = v => FY1 - ((v - 10) / (35 - 10)) * (FY1 - FY0);
  const xi = i => GX + i * PX;
  const rows = []; let y = 186;
  AUX_ROWS.forEach(([g, ids], gi) => { ids.forEach((a, k) => { rows.push({ g: k === 0 ? g : null, a, y }); y += 19; }); y += gi < AUX_ROWS.length - 1 ? 6 : 0; });
  const nightBands = []; for (let i = 0; i < 24; i++) { const hc = (h0 + i) % 24; if (hc >= 22 || hc < 6) nightBands.push(i); }
  const W = 1280, H = 720;

  const blocks = a => { const out = []; for (let i = 0; i < 24; i++) { const s = plan(a, i); const l = out[out.length - 1]; if (l && l.s === s) l.i1 = i + 1; else out.push({ s, i0: i, i1: i + 1 }); } return out; };

  return <>
    <Title x={24} y={28}>Auxiliary scheduler · next 24 hours</Title>
    <Lbl x={400} y={28} muted size={11}>Faclon Power Plant AI · advisory schedule, the shift in-charge approves and starts or stops each drive</Lbl>

    {/* live context */}
    <Val a="TG-01" t="load" x={24} y={52} w={112} label="Unit load now" />
    <Val a="CT-01" t="wet_bulb" x={144} y={52} w={112} label="Wet bulb now" />
    <Val a="CT-01" t="approach" x={24} y={96} w={112} label="CT approach" />
    <Val a="COND-01" t="back_pressure" x={144} y={96} w={112} label="Back pressure" />

    {/* night shading across forecast and gantt */}
    {nightBands.map(i => <rect key={i} x={xi(i)} y={FY0 - 4} width={PX} height={y - FY0 + 4} style={{ fill: 'var(--m-eq-3)', opacity: 0.16 }} />)}
    {/* forecast */}
    <rect x={GX} y={FY0} width={GW} height={FY1 - FY0} style={{ fill: 'none', stroke: 'var(--m-eq-3)', strokeWidth: 1 }} />
    {[60, 80, 100].map(v => <g key={v}><line x1={GX} y1={ly(v)} x2={GX + GW} y2={ly(v)} style={{ stroke: 'var(--m-eq-3)', strokeWidth: 0.6, opacity: 0.7 }} /><text x={GX - 5} y={ly(v) + 3.5} textAnchor="end" style={T(9, 400, MUT)}>{v}</text></g>)}
    <line x1={GX} y1={ly(MILL_OFF_MW)} x2={GX + GW} y2={ly(MILL_OFF_MW)} style={{ stroke: BRAND, strokeWidth: 1.2, strokeDasharray: '5 4' }} />
    <text x={GX + 8} y={ly(MILL_OFF_MW) - 5} style={T(9.5, 600, BRAND)}>4 → 3 mills below {MILL_OFF_MW} MW</text>
    <path d={'M' + fc.map((f, i) => `${xi(i)} ${wy(f.wb)}`).join(' L')} style={{ fill: 'none', stroke: 'var(--m-water)', strokeWidth: 1.6, strokeDasharray: '5 3' }} />
    <path d={'M' + fc.map((f, i) => `${xi(i)} ${ly(f.load)}`).join(' L')} style={{ fill: 'none', stroke: 'var(--m-text)', strokeWidth: 2 }} />
    <circle cx={xi(0)} cy={ly(fc[0].load)} r="3.5" style={{ fill: 'var(--m-text)' }} />
    <line x1={24} y1={150} x2={44} y2={150} style={{ stroke: 'var(--m-text)', strokeWidth: 2 }} /><text x={50} y={153.5} style={T(10, 500)}>Load forecast, MW (left scale)</text>
    <line x1={24} y1={164} x2={44} y2={164} style={{ stroke: 'var(--m-water)', strokeWidth: 1.6, strokeDasharray: '5 3' }} /><text x={50} y={167.5} style={T(10, 500)}>Wet bulb forecast, °C (right scale)</text>
    {[15, 25].map(v => <text key={v} x={GX + GW + 5} y={wy(v) + 3.5} style={T(9, 400, 'var(--m-water)')}>{v}</text>)}
    {/* hour axis */}
    {Array.from({ length: 9 }, (_, k) => k * 3).map(i => <g key={i}>
      <line x1={xi(i)} y1={FY1} x2={xi(i)} y2={y} style={{ stroke: 'var(--m-eq-3)', strokeWidth: 0.6, opacity: 0.8 }} />
      <text x={xi(i)} y={FY1 + 13} textAnchor="middle" style={T(9.5, i === 0 ? 650 : 400, i === 0 ? 'var(--m-text)' : MUT)}>{i === 0 ? 'Now' : hh(h0 + i)}</text></g>)}
    <line x1={xi(0)} y1={FY0 - 4} x2={xi(0)} y2={y} style={{ stroke: 'var(--m-text)', strokeWidth: 1.5 }} />

    {/* table header */}
    <text x={24} y={180} style={T(9.5, 650, MUT, { letterSpacing: '.06em' })}>EQUIPMENT</text>
    <text x={196} y={180} textAnchor="end" style={T(9.5, 650, MUT)}>kW</text>
    <text x={240} y={180} textAnchor="end" style={T(9.5, 650, MUT)}>A</text>

    {rows.map(r => <g key={r.a}>
      {r.g && <text x={24} y={r.y + 13} style={T(9.5, 600, MUT, { textTransform: 'uppercase', letterSpacing: '.04em' })}>{r.g}</text>}
      <g style={{ cursor: 'pointer' }} onClick={() => m.select(r.a)}><text x={142} y={r.y + 13} textAnchor="end" style={{ ...T(10.5, 600), fontFamily: 'var(--mono)' }}>{r.a}</text></g>
      <TVal a={r.a} t="kw" x={196} y={r.y + 13} size={11} />
      <TVal a={r.a} t="current" x={240} y={r.y + 13} size={11} />
      <Lamp a={r.a} x={256} y={r.y + 9} r={4.5} />
      {blocks(r.a).map((b, k, arr) => {
        const x0 = xi(b.i0) + 1, w = (b.i1 - b.i0) * PX - 2, yy = r.y + 2, hgt = 15;
        const prev = arr[k - 1];
        if (b.s === 'run') return <g key={k}>
          <rect x={x0} y={yy} width={w} height={hgt} rx="2" style={{ fill: 'var(--m-eq-3)', stroke: 'var(--m-edge)', strokeWidth: 0.8 }} />
          {prev && prev.s === 'stop' ? <><rect x={x0} y={yy} width={4} height={hgt} style={{ fill: BRAND }} />{w > 70 && <text x={x0 + 8} y={yy + 11} style={T(9.5, 700, BRAND)}>START {hh(h0 + b.i0)}</text>}</>
            : w > 40 && <text x={x0 + 6} y={yy + 11} style={T(9.5, 600)}>RUN</text>}
        </g>;
        if (b.s === 'sb') return <g key={k}><rect x={x0} y={yy} width={w} height={hgt} rx="2" style={{ fill: 'none', stroke: 'var(--m-edge)', strokeWidth: 0.9, strokeDasharray: '4 3' }} />
          {w > 70 && <text x={x0 + 6} y={yy + 11} style={T(9.5, 500, MUT)}>STANDBY · auto-start armed</text>}</g>;
        return <g key={k}><rect x={x0} y={yy} width={w} height={hgt} rx="2" style={{ fill: 'var(--brand-soft)', stroke: BRAND, strokeWidth: 1.3, strokeDasharray: '5 2' }} />
          <text x={x0 + 6} y={yy + 11} style={T(9.5, 700, BRAND)}>{w > 120 ? `STOP ${hh(h0 + b.i0)}–${hh(h0 + b.i1)}` : 'STOP'}</text></g>;
      })}
    </g>)}

    {/* legend */}
    <g transform={`translate(${GX} ${y + 14})`}>
      <rect x={0} y={0} width={22} height={11} rx="2" style={{ fill: 'var(--m-eq-3)', stroke: 'var(--m-edge)', strokeWidth: 0.8 }} /><text x={28} y={9.5} style={T(10, 400)}>Run</text>
      <rect x={70} y={0} width={22} height={11} rx="2" style={{ fill: 'none', stroke: 'var(--m-edge)', strokeDasharray: '4 3' }} /><text x={98} y={9.5} style={T(10, 400)}>Standby</text>
      <rect x={160} y={0} width={22} height={11} rx="2" style={{ fill: 'var(--brand-soft)', stroke: BRAND, strokeDasharray: '5 2' }} /><text x={188} y={9.5} style={T(10, 400)}>Recommended stop</text>
      <rect x={300} y={0} width={4} height={11} style={{ fill: BRAND }} /><text x={310} y={9.5} style={T(10, 400)}>Recommended start</text>
      <rect x={430} y={0} width={22} height={11} style={{ fill: 'var(--m-eq-3)', opacity: 0.3 }} /><text x={458} y={9.5} style={T(10, 400)}>Night 22:00–06:00</text>
    </g>

    {/* right panel */}
    <Zone x={1012} y={40} w={254} h={668} label="Recommended vs now" />
    <text x={1024} y={78} style={T(9.5, 650, MUT)}>Drive group</text><text x={1112} y={78} style={T(9.5, 650, MUT)}>Now</text><text x={1182} y={78} style={T(9.5, 650, MUT)}>Next 24 h</text>
    {[
      ['Coal mills', '4 + 1 SB', nMill ? '3 at night' : '4 (hold)', nMill > 0],
      ['CT cells', '6', n5 ? '6 → 5 → 4' : n6 ? '6 → 5' : '6 (hold)', n6 > 0],
      ['CW pumps', '2', '2 (hold)', false],
      ['Feed pumps', '2 + 1 SB', 'no change', false],
      ['Condensate', '1 + 1 SB', 'no change', false],
      ['ID / FD / PA', '2 / 2 / 2', 'no change', false],
    ].map(([g, now, rec, ch], i) => <g key={g}>
      <text x={1024} y={96 + i * 18} style={T(10.5, 500)}>{g}</text>
      <text x={1112} y={96 + i * 18} style={T(10.5, 400, MUT)}>{now}</text>
      <text x={1182} y={96 + i * 18} style={T(10.5, ch ? 700 : 400, ch ? BRAND : MUT)}>{rec}</text></g>)}
    <line x1={1024} y1={210} x2={1254} y2={210} style={{ stroke: 'var(--m-eq-3)' }} />
    <text x={1024} y={228} style={T(9.5, 650, MUT, { letterSpacing: '.06em' })}>APC SAVING IF APPROVED</text>
    <text x={1024} y={252} style={{ ...T(20, 700), fontVariantNumeric: 'tabular-nums' }}>{nf(kwh)} <tspan style={T(11, 400, MUT)}>kWh/day</tspan></text>
    <text x={1024} y={270} style={T(10.5, 400)}>Average {nf(kwh / 24)} kW · peak {nf(peakKw)} kW</text>
    <text x={1024} y={286} style={T(10.5, 600)}>₹{nf(kwh * TARIFF)} per day <tspan style={T(10, 400, MUT)}>at ₹{TARIFF.toFixed(1)}/kWh</tspan></text>
    <text x={1024} y={302} style={T(10.5, 400)}>APC −{apcPP.toFixed(2)} percentage points</text>
    <Val a="UAT-01" t="apc" x={1024} y={314} w={112} label="APC now" />
    <Val a="UAT-01" t="kw" x={1142} y={314} w={112} label="Auxiliary load" />

    <text x={1024} y={372} style={T(9.5, 650, MUT, { letterSpacing: '.06em' })}>RULES USED</text>
    {(() => {
      const rules = [
        `Mill loading > 70 % after a stop: 3 mills carry ${loading3.toFixed(0)} % at the ${minLoad.toFixed(0)} MW low. MILL-E stays on standby.`,
        `4 mills above ${MILL_OFF_MW} MW for flame stability and PF fineness.`,
        `BFP margin: 2 × 50 % pumps, scoop at peak ${scoopPeak.toFixed(0)} % (limit 85 %). BFP-C auto-start armed.`,
        `CT approach ≤ 5 °C: stop cell 6 below ${WB6} °C wet bulb, cell 5 below ${WB5} °C.`,
        `CW pumps: hold 2 while back pressure > 10.5 kPa (now ${bp.toFixed(1)}).`,
        'ID, FD, PA: no single-fan running above 60 MW.',
      ];
      let yy = 388; const out = [];
      rules.forEach((r, i) => wrap(r, 44).forEach((l, k) => { out.push(<text key={`${i}-${k}`} x={k ? 1034 : 1024} y={yy} style={T(10, 400)}>{k ? l : '• ' + l}</text>); yy += 13; }));
      return out;
    })()}
    <line x1={1024} y1={572} x2={1254} y2={572} style={{ stroke: 'var(--m-eq-3)' }} />
    <Val a="ID-B" t="vib" x={1024} y={582} w={112} label="ID-B NDE vibration" />
    {wrap('Keep both ID fans in service; ID-B bearing check is planned.', 18).map((l, i) => <text key={i} x={1144} y={594 + i * 12} style={T(9.5, 400, MUT)}>{l}</text>)}

    <Btn x={1024} y={644} w={132} label="Approve schedule" pri onClick={() => setDlg({ title: 'Approve the 24-hour auxiliary schedule?', ok: 'Approve',
      body: `${nMill ? `Stop MILL-D ${span(millOff)} and restart it before load rises above ${MILL_OFF_MW} MW. ` : ''}${n6 ? `Stop CTF-6 ${span(ct6)}. ` : ''}${n5 ? `Stop CTF-5 ${span(ct5)}. ` : ''}Expected saving ${nf(kwh)} kWh, about ₹${nf(kwh * TARIFF)} for the day.`,
      toast: 'Schedule approved. Each start and stop goes to the shift in-charge as a task. Nothing is written to the control system.', onOk: () => setStatus('approved') })} />
    <Btn x={1164} y={644} w={90} label="Reject" onClick={() => setDlg({ title: 'Reject this schedule?', ok: 'Reject', body: 'The current combination stays. The agent records your decision and learns from it.', toast: 'Schedule rejected and recorded with your name.', onOk: () => setStatus('rejected') })} />
    <text x={1024} y={692} style={T(10, 600, status === 'approved' ? 'var(--good)' : status === 'rejected' ? BAD : MUT)}>{status === 'approved' ? 'Approved · tasks sent to shift in-charge' : status === 'rejected' ? 'Rejected · current combination kept' : 'Status: proposed · awaiting approval'}</text>
    <Dialog W={W} H={H} d={dlg} close={() => setDlg(null)} />
  </>;
}
const AuxScheduler = ({ c }) => <Mimic c={c} w={1280} h={720} note="advisory schedule, nothing is written to the DCS"><AuxBody /></Mimic>;

/* =====================================================================================
   2. Soot blowing
   ===================================================================================== */
const SECT = [
  { a: 'WW-01', name: 'Water walls', kind: 'Wall blowers (IR)', trig: 85, maxH: 24, ids: 'IR-01…IR-12', n: 12, steam: 0.08, min: 2 },
  { a: 'SH-01', name: 'Platen + final SH', kind: 'LRSB', trig: 80, maxH: 16, ids: 'L-01…L-06', n: 6, steam: 0.75, min: 6 },
  { a: 'RH-01', name: 'Reheater', kind: 'LRSB', trig: 80, maxH: 16, ids: 'L-07…L-10', n: 4, steam: 0.75, min: 6 },
  { a: 'ECO-01', name: 'Economiser', kind: 'LRSB', trig: 80, maxH: 16, ids: 'L-11…L-14', n: 4, steam: 0.75, min: 6 },
  { a: 'APH-01', name: 'Air preheater', kind: 'Rotary blowers', trig: 145, maxH: 8, ids: 'AB-1, AB-2', n: 2, steam: 1.0, min: 15 },
];
const TIMER_PER_DAY = 3;
const TIMER_T = TIMER_PER_DAY * SECT.reduce((s, x) => s + x.n * x.steam, 0);

function advice(m, s) {
  const r = (t) => m.read(s.a, t).v ?? 0;
  if (s.a === 'APH-01') { const g = r('gas_out'), dp = r('dp'); return g > s.trig || dp > 130 ? 'now' : g > s.trig - 4 || dp > 125 ? 'soon' : 'none'; }
  const cf = r('cf'), h = r('sb_hours');
  return cf < s.trig ? 'now' : cf < s.trig + 3 || h > s.maxH ? 'soon' : 'none';
}
const ADV_COL = { now: BRAND, soon: WARN, none: 'var(--m-eq-3)' };
const ADV_TXT = { now: 'Blow now', soon: 'Soon', none: 'Not needed' };

/** One soot blower: carriage box + lance. dir: 'l' (from left), 'r' (from right), 'd' (from roof). */
function Blower({ x, y, len, dir, adv, id, a }) {
  const m = useMimic(); const col = ADV_COL[adv];
  const solid = adv === 'now';
  const box = dir === 'd' ? [x - 6, y - 26, 12, 24] : dir === 'l' ? [x - 34, y - 6, 30, 12] : [x + 4, y - 6, 30, 12];
  const lance = dir === 'd' ? [x, y - 2, x, y + len] : dir === 'l' ? [x - 4, y, x + len, y] : [x + 4, y, x - len, y];
  return <g style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); m.select(a); }}>
    <title>{`${id} · ${ADV_TXT[adv]}`}</title>
    <line x1={lance[0]} y1={lance[1]} x2={lance[2]} y2={lance[3]} style={{ stroke: solid ? BRAND : 'var(--m-edge)', strokeWidth: solid ? 2 : 1.2, strokeDasharray: solid ? undefined : '3 3', opacity: solid ? 0.9 : 0.6 }} />
    <rect x={box[0]} y={box[1]} width={box[2]} height={box[3]} rx="2" style={{ fill: solid ? BRAND : adv === 'soon' ? 'var(--bg)' : 'var(--m-eq)', stroke: adv === 'none' ? 'var(--m-edge)' : col, strokeWidth: adv === 'none' ? 1 : 1.8 }} />
    {dir !== 'd' && <text x={box[0] + box[2] / 2} y={box[1] + 9} textAnchor="middle" style={{ ...T(7.5, 600, solid ? '#fff' : 'var(--m-text)'), fontFamily: 'var(--mono)' }}>{id}</text>}
  </g>;
}
/** Wall blower (IR): short nozzle on the furnace wall. */
function WallBlower({ x, y, side, adv, a, id }) {
  const m = useMimic(); const col = ADV_COL[adv]; const dx = side === 'l' ? -1 : 1;
  return <g style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); m.select(a); }}><title>{`${id} · ${ADV_TXT[adv]}`}</title>
    <line x1={x} y1={y} x2={x + dx * 12} y2={y} style={{ stroke: 'var(--m-edge)', strokeWidth: 1.2 }} />
    <circle cx={x + dx * 16} cy={y} r={5} style={{ fill: adv === 'now' ? BRAND : adv === 'soon' ? 'var(--bg)' : 'var(--m-eq)', stroke: adv === 'none' ? 'var(--m-edge)' : col, strokeWidth: adv === 'none' ? 1 : 1.8 }} /></g>;
}

/** Two-pass PF boiler cross-section. Returns the drawing; blowers are coloured by advice. */
function BoilerSection({ adv, on }) {
  const tubes = (x0, x1, y0, y1, n) => Array.from({ length: n }, (_, i) => { const y = y0 + ((y1 - y0) * i) / (n - 1); return `M${x0} ${y} H${x1}`; }).join(' ');
  return <g>
    {/* furnace */}
    <Equip a="WW-01" x={90} y={232} w={160} h={156} noId>
      <path d="M90 80 H250 V250 L232 268 V560 L190 640 H150 L108 560 V80" className="m-body" style={{ opacity: 0.35 }} />
    </Equip>
    <path d="M90 80 V560 L150 640 H190 L250 560 V270 L232 252 V232" className="m-edge" />
    <path d="M96 86 V556 M244 556 V276" style={{ stroke: 'var(--m-edge)', strokeWidth: 3, strokeDasharray: '1 3', opacity: 0.5, fill: 'none' }} />
    {/* burners, 5 elevations, corner fired */}
    {[410, 440, 470, 500, 530].map((y, i) => <g key={y}><rect x={84} y={y - 5} width={14} height={10} rx="1" className="m-body" /><rect x={84} y={y - 5} width={14} height={10} rx="1" className="m-edge" />
      {on && i < 4 && <Flame x={112} y={y + 4} s={10} />}{on && i < 4 && <Flame x={226} y={y + 4} s={10} />}</g>)}
    <text x={170} y={600} textAnchor="middle" style={T(9.5, 400, MUT)}>bottom ash hopper</text>
    {/* roof, horizontal pass and backpass */}
    <path d="M90 80 H450 V560 H340 V232 H250" className="m-edge" />
    <line x1={340} y1={80} x2={340} y2={232} style={{ stroke: 'var(--m-edge)', strokeWidth: 1, strokeDasharray: '4 3', opacity: 0.6 }} />
    {/* gas path */}
    <Pipe d="M200 560 V180 Q200 150 230 150 H300 Q395 150 395 200 V540" kind="flue" w={3} speed={1.4} />
    {/* platen SH panels + final SH */}
    <Equip a="SH-01" x={118} y={96} w={212} h={124} noId>
      {[124, 144, 164, 184, 204].map(x => <rect key={x} x={x} y={98} width={8} height={118} rx="2" className="m-body" />)}
      {[124, 144, 164, 184, 204].map(x => <rect key={'e' + x} x={x} y={98} width={8} height={118} rx="2" className="m-edge" />)}
      {[264, 284, 304].map(x => <path key={x} d={`M${x} 92 V206 Q${x + 7} 216 ${x + 14} 206 V92`} className="m-glyph" />)}
    </Equip>
    <text x={142} y={234} textAnchor="middle" style={T(10, 650)}>SH-01 platen</text>
    <text x={292} y={234} textAnchor="middle" style={T(10, 650)}>final SH</text>
    {/* reheater (top of backpass) */}
    <Equip a="RH-01" x={350} y={110} w={90} h={150} noId>
      <path d={tubes(354, 436, 116, 254, 9)} style={{ stroke: 'var(--m-edge)', strokeWidth: 2.2, fill: 'none', opacity: 0.75 }} />
    </Equip>
    <text x={395} y={276} textAnchor="middle" style={T(10, 650)}>RH-01</text>
    {/* economiser */}
    <Equip a="ECO-01" x={350} y={330} w={90} h={150} noId>
      <path d={tubes(354, 436, 336, 474, 12)} style={{ stroke: 'var(--m-edge)', strokeWidth: 2, fill: 'none', opacity: 0.75 }} />
    </Equip>
    <text x={395} y={496} textAnchor="middle" style={T(10, 650)}>ECO-01</text>
    <text x={145} y={302} textAnchor="middle" style={T(10, 650)}>WW-01 furnace</text>
    {/* APH (rotary, bi-sector) */}
    <Pipe d="M450 530 H520 V452" kind="flue" w={8} speed={1.2} />
    <Equip a="APH-01" x={486} y={440} w={72} h={130} noId>
      <rect x={490} y={444} width={64} height={122} rx="6" fill="url(#m-metal)" className="m-body" /><rect x={490} y={444} width={64} height={122} rx="6" className="m-edge" />
      <line x1={522} y1={444} x2={522} y2={566} className="m-glyph" />
      {[462, 480, 498, 516, 534, 552].map(y => <line key={y} x1={494} y1={y} x2={550} y2={y} style={{ stroke: 'var(--m-edge)', strokeWidth: 0.8, opacity: 0.5 }} />)}
    </Equip>
    <text x={522} y={432} textAnchor="middle" style={T(10, 650)}>APH-01</text>
    <Pipe d="M522 566 V612 H584" kind="flue" w={8} speed={1.2} />
    <text x={556} y={632} textAnchor="middle" style={T(9.5, 400, MUT)}>to ESP</text>
    {/* blowers */}
    {[252, 276, 300, 324, 348, 372].map((y, i) => <g key={y}><WallBlower x={90} y={y} side="l" adv={adv['WW-01']} a="WW-01" id={`IR-${String(i * 2 + 1).padStart(2, '0')}`} />
      <WallBlower x={232} y={y + 12} side="r" adv={adv['WW-01']} a="WW-01" id={`IR-${String(i * 2 + 2).padStart(2, '0')}`} /></g>)}
    <text x={44} y={392} style={T(9, 600, MUT)}>IR-01…12</text>
    {[120, 160, 200].map((y, i) => <Blower key={y} x={86} y={y} len={136} dir="l" adv={adv['SH-01']} a="SH-01" id={`L-0${i + 1}`} />)}
    {[262, 284, 306].map((x, i) => <Blower key={x} x={x + 7} y={80} len={118} dir="d" adv={adv['SH-01']} a="SH-01" id={`L-0${i + 4}`} />)}
    <text x={284} y={46} textAnchor="middle" style={T(9, 600, MUT)}>L-04…06</text>
    {[140, 175, 210, 245].map((y, i) => <Blower key={y} x={454} y={y} len={96} dir="r" adv={adv['RH-01']} a="RH-01" id={`L-${String(i + 7).padStart(2, '0')}`} />)}
    {[350, 385, 420, 455].map((y, i) => <Blower key={y} x={454} y={y} len={96} dir="r" adv={adv['ECO-01']} a="ECO-01" id={`L-${i + 11}`} />)}
    <Blower x={558} y={470} len={30} dir="r" adv={adv['APH-01']} a="APH-01" id="AB-1" />
    <Blower x={558} y={540} len={30} dir="r" adv={adv['APH-01']} a="APH-01" id="AB-2" />
  </g>;
}

function SootBody() {
  const m = useMimic(); const rd = (a, t) => m.read(a, t).v ?? 0;
  const [dlg, setDlg] = useState(null); const [started, setStarted] = useState(false);
  const W = 1280, H = 720;
  const adv = {}; SECT.forEach(s => { adv[s.a] = advice(m, s); });
  const on = rd('TG-01', 'load') > 20;
  /* recommended sequence: blow-now sections, worst first (APH last so it catches what the ECO blow drops), then soon */
  const margin = s => (s.a === 'APH-01' ? -(rd('APH-01', 'gas_out') - s.trig) / 2 : rd(s.a, 'cf') - s.trig);
  const nowList = SECT.filter(s => adv[s.a] === 'now' && s.a !== 'APH-01').sort((p, q) => margin(p) - margin(q));
  const seq = [...nowList, ...SECT.filter(s => s.a === 'APH-01' && adv[s.a] === 'now'), ...SECT.filter(s => adv[s.a] === 'soon')];
  const hold = SECT.filter(s => adv[s.a] === 'none');
  const seqSteam = seq.filter(s => adv[s.a] === 'now').reduce((t, s) => t + s.n * s.steam, 0);
  const seqMin = seq.filter(s => adv[s.a] === 'now').reduce((t, s) => t + s.min, 0);
  const gasExit = rd('APH-01', 'gas_out');
  const fgDrop = adv['APH-01'] === 'now' || adv['ECO-01'] === 'now' ? Math.max(0, gasExit - 140) : 0;
  const spray = rd('ATT-01', 'sh_spray');
  const sprayDrop = adv['SH-01'] === 'now' ? Math.max(0, spray - 8) * 0.6 : 0;
  const kcal = fgDrop * 1.2 + sprayDrop * 0.6;
  const NEED_T = TIMER_T * 0.77;
  const gain = s => ({ 'ECO-01': `ECO gas out −${Math.max(0, rd('ECO-01', 'gas_out') - 362).toFixed(0)} °C`, 'APH-01': `gas exit −${fgDrop.toFixed(0)} °C`, 'SH-01': `SH spray −${sprayDrop.toFixed(0)} t/h`, 'RH-01': 'RH spray −0.5 t/h', 'WW-01': 'FEGT −15 °C' }[s.a]);

  /* table geometry */
  const TX = 612, cols = [TX + 118, TX + 228, TX + 338, TX + 448], RY0 = 78, RH = 44;
  const cells = s => {
    const d = t => m.read(s.a, t).def?.base;
    if (s.a === 'APH-01') return [
      { t: 'gas_out', label: 'Gas exit', min: 120, max: 170, trig: s.trig, design: d('gas_out') },
      { t: 'air_out', label: 'SA out', min: 280, max: 340, design: d('air_out') },
      { t: 'dp', label: 'Gas ΔP', min: 80, max: 160, trig: 130, design: d('dp') },
      { t: 'leakage', label: 'Leakage', min: 0, max: 15, design: d('leakage'), dec: 1 }];
    const dt = s.a === 'ECO-01' ? { v: rd('ECO-01', 'gas_in') - rd('ECO-01', 'gas_out'), unit: '°C', design: 116, min: 0, max: 160 } : { t: 'gas_dt', design: d('gas_dt'), min: 0, max: d('gas_dt') * 1.4 };
    return [
      { t: 'cf', label: 'CF', min: 60, max: 100, trig: s.trig },
      { t: 'absorption', label: 'Absorbed', min: 0, max: d('absorption') * 1.25, design: d('absorption') },
      { ...dt, label: 'Gas ΔT' },
      { t: 'sb_hours', label: 'Since blow', min: 0, max: 40, trig: s.maxH, dec: 0 }];
  };

  return <>
    <Title x={24} y={28}>Soot blowing · recommendation</Title>
    <BoilerSection adv={adv} on={on} />
    {/* live values under the drawing */}
    <Val a="FUR-01" t="fegt" x={24} y={662} w={108} label="Furnace exit gas" />
    <Val a="ATT-01" t="sh_spray" x={140} y={662} w={100} label="SH spray" />
    <Val a="BLR-01" t="eff" x={248} y={662} w={100} label="Boiler efficiency" />
    <Val a="ECO-01" t="gas_out" x={356} y={662} w={100} label="ECO gas out" />
    <Val a="APH-01" t="gas_out" x={464} y={652} w={132} big label="APH gas exit (corr.)" />

    {/* section table */}
    <Zone x={600} y={40} w={666} h={278} label="Heat-transfer sections · live" />
    {[['CLEANLINESS / GAS', cols[0]], ['ABSORPTION', cols[1]], ['GAS ΔT / ΔP', cols[2]], ['SINCE BLOW / LEAK', cols[3]]].map(([l, x]) => <text key={l} x={x} y={70} style={T(9, 650, MUT, { letterSpacing: '.04em' })}>{l}</text>)}
    <text x={TX + 558} y={70} style={T(9, 650, MUT, { letterSpacing: '.04em' })}>ADVICE</text>
    {SECT.map((s, i) => { const y = RY0 + i * RH; return <g key={s.a}>
      {i > 0 && <line x1={TX} y1={y - 4} x2={1254} y2={y - 4} style={{ stroke: 'var(--m-eq-3)', opacity: 0.6 }} />}
      <g style={{ cursor: 'pointer' }} onClick={() => m.select(s.a)}>
        <text x={TX} y={y + 12} style={{ ...T(10.5, 650), fontFamily: 'var(--mono)' }}>{s.a}</text>
        <text x={TX} y={y + 26} style={T(10, 400, MUT)}>{s.name}</text></g>
      {cells(s).map((cl, k) => <HBar key={k} a={s.a} x={cols[k]} y={y} w={96} {...cl} />)}
      <Chip x={TX + 558} y={y + 4} label={ADV_TXT[adv[s.a]]} kind={adv[s.a] === 'none' ? 'muted' : adv[s.a]} w={84} />
      <text x={TX + 558} y={y + 34} style={T(9, 400, MUT)}>{s.kind}</text>
    </g>; })}
    <g transform="translate(612 300)">
      <line x1={0} y1={-5} x2={0} y2={5} style={{ stroke: BRAND, strokeWidth: 2, strokeDasharray: '2 2' }} /><text x={6} y={4} style={T(9.5, 400, MUT)}>blow trigger</text>
      <line x1={86} y1={-5} x2={86} y2={5} style={{ stroke: BAD, strokeWidth: 1.5 }} /><text x={92} y={4} style={T(9.5, 400, MUT)}>alarm limit</text>
      <line x1={166} y1={-5} x2={166} y2={5} style={{ stroke: 'var(--m-text)', strokeWidth: 1.2, opacity: 0.6 }} /><text x={172} y={4} style={T(9.5, 400, MUT)}>design at this load</text>
      <rect x={290} y={-5} width={12} height={10} rx="2" style={{ fill: BRAND }} /><text x={308} y={4} style={T(9.5, 400, MUT)}>blow now</text>
      <rect x={370} y={-5} width={12} height={10} rx="2" style={{ fill: 'var(--bg)', stroke: WARN, strokeWidth: 1.8 }} /><text x={388} y={4} style={T(9.5, 400, MUT)}>soon</text>
      <rect x={430} y={-5} width={12} height={10} rx="2" style={{ fill: 'var(--m-eq)', stroke: 'var(--m-edge)' }} /><text x={448} y={4} style={T(9.5, 400, MUT)}>not needed</text>
    </g>

    {/* recommended sequence */}
    <Zone x={600} y={330} w={350} h={250} label="Recommended sequence" />
    {seq.map((s, i) => { const y = 362 + i * 40; const nw = adv[s.a] === 'now'; return <g key={s.a}>
      <circle cx={624} cy={y + 5} r={10} style={{ fill: nw ? BRAND : 'var(--bg)', stroke: nw ? BRAND : WARN, strokeWidth: 1.5 }} />
      <text x={624} y={y + 9} textAnchor="middle" style={T(10.5, 700, nw ? '#fff' : '#b7791f')}>{i + 1}</text>
      <text x={642} y={y + 4} style={T(11, 650)}>{s.name} <tspan style={{ ...T(10, 400, MUT), fontFamily: 'var(--mono)' }}>{s.ids}</tspan></text>
      <text x={642} y={y + 19} style={T(10, 400, MUT)}>{nw ? `${s.min} min · ${(s.n * s.steam).toFixed(1)} t steam · ${gain(s)}` : `within 4 h · ${s.a === 'RH-01' ? `${rd(s.a, 'sb_hours').toFixed(0)} h since last blow` : 'watch'}`}</text>
    </g>; })}
    {hold.length > 0 && <text x={612} y={362 + seq.length * 40 + 6} style={T(10, 400, MUT)}>{wrap(`Hold: ${hold.map(s => s.name.toLowerCase()).join(', ')} (cleanliness above trigger). Steam is not spent on clean tubes.`, 58).map((l, k) => <tspan key={k} x={612} dy={k ? 13 : 0}>{l}</tspan>)}</text>}

    {/* expected gain */}
    <Zone x={962} y={330} w={304} h={250} label="Expected gain of the sequence" />
    {[
      ['Flue gas exit temperature', `−${fgDrop.toFixed(0)} °C`, `to about ${(gasExit - fgDrop).toFixed(0)} °C within 2 h`],
      ['Net heat rate', `−${kcal.toFixed(0)} kcal/kWh`, `about ₹${nf((kcal / 24) * 2.6, 1)} L per day`],
      ['SH spray', `−${sprayDrop.toFixed(0)} t/h`, 'after the platen SH blow'],
      ['Steam for this sequence', `${seqSteam.toFixed(1)} t`, `${seqMin} min, one section at a time`],
    ].map(([k, v, sub], i) => <g key={k}>
      <text x={976} y={366 + i * 52} style={T(10, 400, MUT)}>{k}</text>
      <text x={976} y={385 + i * 52} style={{ ...T(16, 700), fontVariantNumeric: 'tabular-nums' }}>{v}</text>
      <text x={1104} y={385 + i * 52} style={T(10, 400, MUT)}>{sub}</text></g>)}

    {/* timer vs need */}
    <Zone x={600} y={592} w={666} h={116} label="Timer vs need · soot-blowing steam per day" />
    {[['Timer (every 8 h, all 28 blowers)', TIMER_T, 'var(--m-eq-3)'], ['On need (agent advice)', NEED_T, BRAND]].map(([l, v, col], i) => <g key={l}>
      <text x={612} y={626 + i * 26} style={T(10.5, 500)}>{l}</text>
      <rect x={800} y={616 + i * 26} width={300 * (v / TIMER_T)} height={13} rx="2" style={{ fill: col }} />
      <text x={806 + 300 * (v / TIMER_T)} y={627 + i * 26} style={{ ...T(10.5, 650), fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(1)} t</text></g>)}
    <text x={612} y={694} style={T(10.5, 600, BRAND)}>23 % less soot-blowing steam <tspan style={T(10, 400, MUT)}> · glossary case: blow by cleanliness, not by clock</tspan></text>

    <Btn x={1136} y={630} w={120} h={30} label={started ? 'Sequence queued' : 'Start sequence'} pri={!started} onClick={() => !started && setDlg({ title: 'Start the recommended soot-blowing sequence?', ok: 'Start',
      body: `${seq.filter(s => adv[s.a] === 'now').map(s => `${s.name} (${s.ids})`).join(', then ')}. About ${seqSteam.toFixed(1)} t of steam over ${seqMin} min. Check the interlocks first: header drain above 250 °C, drum pressure above 110 bar, all lances home.`,
      toast: 'Sequence sent to the shift in-charge for the soot-blower panel. Nothing is written to the control system.', onOk: () => setStarted(true) })} />
    <text x={1196} y={676} textAnchor="middle" style={T(9.5, 400, MUT)}>{started ? 'awaiting operator start' : 'confirmation only'}</text>
    <Dialog W={W} H={H} d={dlg} close={() => setDlg(null)} />
  </>;
}
const SootBlowing = ({ c }) => <Mimic c={c} w={1280} h={720} note="advisory, the operator starts each blower group"><SootBody /></Mimic>;

/* =====================================================================================
   3. Setpoint screen
   ===================================================================================== */
const SP_SLOTS = {
  'FUR-01|tilt': { side: 'l', slot: 0, pt: [344, 352], via: 290 },
  'FUR-01|windbox_dp': { side: 'l', slot: 1, pt: [318, 392], via: 302 },
  'MILL-B|outlet_temp': { side: 'l', slot: 2, pt: [362, 562], via: 290 },
  'BLR-01|ms_press': { side: 'r', slot: 0, pt: [612, 140], via: 990 },
  'BLR-01|o2': { side: 'r', slot: 1, pt: [544, 404], via: 990 },
  'CT-01|fans_on': { side: 'r', slot: 2, pt: [966, 470], via: 990 },
};
const MONITOR = { asset: 'BLR-01', tag: 'ms_press', name: 'Main steam pressure (sliding pressure curve)', current: 128, recommended: 128, unit: 'bar', lo: 118, hi: 136,
  gain: 'On the curve at this load; no change advised', confidence: 0.9, status: 'monitor' };
const CW = 254, CH = 170, CY = [52, 228, 404];
const parseGain = g => ({
  kcal: [...g.matchAll(/−(\d+(?:\.\d+)?) kcal\/kWh/g)].reduce((s, x) => s + +x[1], 0),
  lakh: [...g.matchAll(/₹(\d+(?:\.\d+)?) L\/yr/g)].reduce((s, x) => s + +x[1], 0),
  kw: (g.match(/(\d+) kW\b/) || [])[1] ? +(g.match(/(\d+) kW\b/))[1] : 0,
});

function SpCard({ sp, x, y, st, act }) {
  const m = useMimic(); const r = m.read(sp.asset, sp.tag);
  const live = r.v ?? sp.current;
  const nameL = wrap(sp.name, 40).slice(0, 2);
  const gainL = wrap(sp.gain, 44).slice(0, 2);
  const span = (sp.hi - sp.lo) || 1, X = v => x + 14 + (CW - 28) * Math.max(0, Math.min(1, (v - sp.lo) / span));
  const dec = Math.abs(sp.recommended) < 10 && sp.unit !== '°' && sp.unit !== 'cells' ? 1 : 0;
  const monitor = st === 'monitor';
  return <g>
    <rect x={x} y={y} width={CW} height={CH} rx="8" style={{ fill: 'var(--bg)', stroke: st === 'proposed' ? BRAND : 'var(--m-eq-3)', strokeWidth: st === 'proposed' ? 1.4 : 1 }} />
    {nameL.map((l, i) => <text key={i} x={x + 10} y={y + 16 + i * 13} style={T(10.5, 650)}>{l}</text>)}
    <Val a={sp.asset} t={sp.tag} x={x + 10} y={y + 40} w={104} label={`Now · ${sp.asset}`} dec={dec} />
    <path d={`M${x + 122} ${y + 58} H${x + 140}`} style={{ stroke: monitor ? MUT : BRAND, strokeWidth: 1.6 }} markerEnd="url(#m-arrow)" />
    <text x={x + 150} y={y + 51} style={T(9.5, 400, MUT)}>{monitor ? 'hold at' : 'recommended'}</text>
    <text x={x + 150} y={y + 71} style={{ ...T(18, 700, monitor ? 'var(--m-text)' : BRAND), fontVariantNumeric: 'tabular-nums' }}>{sp.recommended.toFixed(dec)}<tspan style={T(10.5, 400, MUT)}> {sp.unit}</tspan></text>
    {/* limits scale */}
    <line x1={x + 14} y1={y + 92} x2={x + CW - 14} y2={y + 92} style={{ stroke: 'var(--m-eq-3)', strokeWidth: 4, strokeLinecap: 'round' }} />
    <path d={`M${X(live)} ${y + 88} l-4 -7 h8 z`} style={{ fill: 'var(--m-text)' }} />
    <path d={`M${X(sp.recommended)} ${y + 96} l-4 7 h8 z`} style={{ fill: monitor ? 'var(--m-text)' : BRAND }} />
    <text x={x + 14} y={y + 114} style={T(9, 400, MUT)}>{sp.lo} {sp.unit}</text>
    <text x={x + CW / 2} y={y + 114} textAnchor="middle" style={T(9, 400, MUT)}>limits</text>
    <text x={x + CW - 14} y={y + 114} textAnchor="end" style={T(9, 400, MUT)}>{sp.hi} {sp.unit}</text>
    {gainL.map((l, i) => <text key={i} x={x + 10} y={y + 130 + i * 12} style={T(10, i === 0 ? 600 : 400, 'var(--m-text)')}>{l}</text>)}
    {/* confidence */}
    <title>{sp.reason || sp.name}</title>
    <text x={x + 10} y={y + 160} style={T(9, 400, MUT)}>Confidence</text>
    <rect x={x + 62} y={y + 153} width={50} height={7} rx="2" style={{ fill: 'var(--m-eq-3)', opacity: 0.45 }} />
    <rect x={x + 62} y={y + 153} width={50 * sp.confidence} height={7} rx="2" style={{ fill: 'var(--m-edge)' }} />
    <text x={x + 116} y={y + 160} style={T(9.5, 600)}>{Math.round(sp.confidence * 100)} %</text>
    {st === 'proposed' ? <>
      <Btn x={x + 146} y={y + 146} w={52} h={20} small label="Approve" pri onClick={() => act(sp, 'approved')} />
      <Btn x={x + 202} y={y + 146} w={44} h={20} small label="Reject" onClick={() => act(sp, 'rejected')} /></>
      : <Chip x={x + CW - 96} y={y + 147} w={88} label={{ approved: 'Approved', applied: 'Applied', rejected: 'Rejected', monitor: 'Monitored' }[st]} kind={st === 'rejected' ? 'bad' : st === 'monitor' ? 'muted' : 'good'} />}
  </g>;
}

/** Simplified PF boiler, mill, turbine train, condenser and cooling tower outline. */
function PlantOutline({ on }) {
  return <g>
    <Zone x={300} y={40} w={300} h={548} label="Boiler" />
    {/* furnace + backpass */}
    <Equip a="BLR-01" x={344} y={80} w={210} h={440} noId>
      <path d="M344 80 H544 V420 H474 V160 H444 V470 L414 512 H374 L344 470 Z" className="m-body" style={{ opacity: 0.5 }} />
      <path d="M344 80 H544 V420 H474 V160 H444 V470 L414 512 H374 L344 470 Z" className="m-edge" />
    </Equip>
    {[340, 365, 390, 415].map(y => <g key={y}><rect x={336} y={y - 5} width={14} height={10} rx="1" className="m-body" /><rect x={336} y={y - 5} width={14} height={10} rx="1" className="m-edge" />{on && <Flame x={362} y={y + 4} s={10} />}</g>)}
    {/* windbox */}
    <Equip a="FUR-01" x={318} y={326} w={14} h={100} noId><rect x={318} y={326} width={14} height={100} rx="3" className="m-body" /><rect x={318} y={326} width={14} height={100} rx="3" className="m-edge" /></Equip>
    <text x={394} y={300} textAnchor="middle" style={T(10, 650)}>Furnace</text>
    <text x={509} y={300} textAnchor="middle" style={T(10, 650)}>ECO</text>
    {[250, 268, 286, 320, 338, 356].map(y => <line key={y} x1={478} y1={y} x2={540} y2={y} style={{ stroke: 'var(--m-edge)', strokeWidth: 2, opacity: 0.6 }} />)}
    {[96, 112, 128, 144].map(x => <rect key={x} x={x + 290} y={96} width={7} height={70} className="m-glyph" />)}
    {/* O2 probe at ECO outlet */}
    <circle cx={544} cy={404} r={5} style={{ fill: 'var(--bg)', stroke: 'var(--m-edge)', strokeWidth: 1.5 }} />
    <Pipe d="M544 410 H580" kind="flue" w={6} />
    <text x={560} y={432} textAnchor="middle" style={T(9.5, 400, MUT)}>to APH</text>
    {/* mill */}
    <Equip a="MILL-B" x={360} y={540} w={60} h={46} noId>
      <path d="M366 556 L376 540 H404 L414 556 V578 H366 Z" fill="url(#m-metal)" className="m-body" /><path d="M366 556 L376 540 H404 L414 556 V578 H366 Z" className="m-edge" />
      <rect x={378} y={578} width={24} height={8} className="m-body" /><rect x={378} y={578} width={24} height={8} className="m-edge" />
    </Equip>
    <text x={440} y={566} style={T(10, 650)}>Mill B <tspan style={T(9.5, 400, MUT)}>(A–D alike)</tspan></text>
    <Pipe d="M390 540 V520 H326 V440" kind="material" w={4} speed={0.8} />
    {/* main steam to turbine */}
    <Pipe d="M520 80 V62 H612 V208 H650" kind="steam" w={6} />
    <text x={566} y={54} textAnchor="middle" style={T(9.5, 400, MUT)}>main steam</text>
    <Zone x={620} y={110} w={360} h={478} label="Turbine and cooling" />
    {/* turbine train */}
    <Equip a="TG-01" x={650} y={180} w={200} h={70} noId>
      <path d="M650 200 L700 188 V242 L650 230 Z" fill="url(#m-metal)" className="m-body" /><path d="M650 200 L700 188 V242 L650 230 Z" className="m-edge" />
      <path d="M704 196 L752 182 V248 L704 234 Z" fill="url(#m-metal)" className="m-body" /><path d="M704 196 L752 182 V248 L704 234 Z" className="m-edge" />
      <path d="M756 190 L800 172 L844 190 V240 L800 258 L756 240 Z" fill="url(#m-metal)" className="m-body" /><path d="M756 190 L800 172 L844 190 V240 L800 258 L756 240 Z" className="m-edge" />
      <line x1={640} y1={215} x2={866} y2={215} style={{ stroke: 'var(--m-edge)', strokeWidth: 1, strokeDasharray: '6 3' }} />
    </Equip>
    {['HP', 'IP', 'LP'].map((l, i) => <text key={l} x={[675, 728, 800][i]} y={270} textAnchor="middle" style={T(10, 650)}>{l}</text>)}
    <Generator x={900} y={215} r={24} on={on} />
    <text x={900} y={258} textAnchor="middle" style={T(10, 650)}>Generator</text>
    {/* condenser */}
    <Equip a="COND-01" x={762} y={290} w={76} h={56} noId>
      <rect x={762} y={290} width={76} height={56} rx="6" fill="url(#m-metal)" className="m-body" /><rect x={762} y={290} width={76} height={56} rx="6" className="m-edge" />
      {[304, 316, 328].map(y => <line key={y} x1={768} y1={y} x2={832} y2={y} style={{ stroke: 'var(--m-edge)', strokeWidth: 0.8, opacity: 0.6 }} />)}
    </Equip>
    <line x1={800} y1={258} x2={800} y2={290} style={{ stroke: 'var(--m-edge)', strokeWidth: 1.5 }} />
    <text x={800} y={362} textAnchor="middle" style={T(10, 650)}>Condenser</text>
    {/* CW loop and cooling tower */}
    <Pipe d="M838 302 H930 V438" kind="cw" w={5} />
    <Pipe d="M700 500 V318 H762" kind="cw" w={5} />
    <Equip a="CT-01" x={700} y={438} w={262} h={64} noId>
      <path d="M708 470 H954 V502 H708 Z" fill="url(#m-metal)" className="m-body" /><path d="M708 470 H954 V502 H708 Z" className="m-edge" />
      {[0, 1, 2, 3, 4, 5].map(i => <g key={i}><path d={`M${714 + i * 40} 470 V454 Q${714 + i * 40} 444 ${724 + i * 40} 444 H${742 + i * 40} Q${752 + i * 40} 444 ${752 + i * 40} 454 V470`} className="m-body" /><path d={`M${714 + i * 40} 470 V454 Q${714 + i * 40} 444 ${724 + i * 40} 444 H${742 + i * 40} Q${752 + i * 40} 444 ${752 + i * 40} 454 V470`} className="m-edge" /></g>)}
    </Equip>
    {[1, 2, 3, 4, 5, 6].map(i => <Equip key={i} a={`CTF-${i}`} x={720 + (i - 1) * 40} y={438} w={26} h={14} noId><Fan x={733 + (i - 1) * 40} y={444} r={9} on={on} /></Equip>)}
    <text x={831} y={522} textAnchor="middle" style={T(10, 650)}>Cooling tower · 6 cells</text>
    <text x={831} y={536} textAnchor="middle" style={T(9.5, 400, MUT)}>CW pumps A + B</text>
  </g>;
}

function SetpointBody() {
  const m = useMimic(); const { c } = m; const rd = (a, t) => m.read(a, t).v ?? 0;
  const [dlg, setDlg] = useState(null); const [over, setOver] = useState({});
  const W = 1280, H = 720;
  const base = (c.demo.setpoints || []).map(s => ({ ...s }));
  const list = base.some(s => s.asset === MONITOR.asset && s.tag === MONITOR.tag) ? base : [...base, { ...MONITOR, current: rd('BLR-01', 'ms_press') }];
  /* place cards: known anchors first, others into free slots */
  const used = { l: new Set(), r: new Set() }; const placed = [];
  list.forEach(sp => { const k = SP_SLOTS[`${sp.asset}|${sp.tag}`]; if (k && !used[k.side].has(k.slot)) { used[k.side].add(k.slot); placed.push({ sp, ...k }); } });
  list.forEach(sp => { if (placed.find(p => p.sp === sp)) return; const side = used.l.size <= used.r.size ? 'l' : 'r'; const slot = [0, 1, 2].find(s => !used[side].has(s)); if (slot == null) return; used[side].add(slot); placed.push({ sp, side, slot, pt: side === 'l' ? [300, CY[slot] + 60] : [980, CY[slot] + 60], via: side === 'l' ? 290 : 990 }); });
  const stOf = sp => over[sp.name] || sp.status;
  const act = (sp, to) => setDlg({ title: `${to === 'approved' ? 'Approve' : 'Reject'} this setpoint?`, ok: to === 'approved' ? 'Approve' : 'Reject',
    body: to === 'approved' ? `${sp.name}: ${sp.current} → ${sp.recommended} ${sp.unit}. Expected ${sp.gain}. A change request goes to the shift in-charge, who changes the setpoint on the DCS in steps.` : `${sp.name} stays at ${sp.current} ${sp.unit}. The agent records the reason with your name.`,
    toast: to === 'approved' ? 'Approved. A change request goes to the shift in-charge. Nothing is written to the control system.' : 'Rejected and recorded with your name.',
    onOk: () => setOver(o => ({ ...o, [sp.name]: to })) });
  /* totals */
  const sum = sts => list.filter(sp => sts.includes(stOf(sp))).map(sp => parseGain(sp.gain)).reduce((a, g) => ({ kcal: a.kcal + g.kcal, lakh: a.lakh + g.lakh, kw: a.kw + g.kw }), { kcal: 0, lakh: 0, kw: 0 });
  const all = sum(['proposed', 'approved', 'applied']), done = sum(['applied']), appr = sum(['approved']);
  const cnt = s => list.filter(sp => stOf(sp) === s).length;

  return <>
    <Title x={24} y={28}>Combustion and cycle setpoints · recommendation</Title>
    <Lbl x={470} y={28} muted size={11}>Faclon Power Plant AI · advisory, the shift in-charge applies each change on the DCS</Lbl>
    <PlantOutline on={rd('TG-01', 'load') > 20} />
    {placed.map(({ sp, side, slot, pt, via }) => {
      const x = side === 'l' ? 24 : 1002, y = CY[slot], ex = side === 'l' ? x + CW : x, ey = y + 40;
      const d = side === 'l' ? `M${ex} ${ey} H${via} V${pt[1]} H${pt[0]}` : `M${ex} ${ey} H${via} V${pt[1]} H${pt[0]}`;
      return <g key={sp.name}>
        <path d={d} style={{ fill: 'none', stroke: stOf(sp) === 'proposed' ? BRAND : 'var(--m-edge)', strokeWidth: 1.2, strokeDasharray: '4 3', opacity: 0.85 }} />
        <circle cx={pt[0]} cy={pt[1]} r={4} style={{ fill: stOf(sp) === 'proposed' ? BRAND : 'var(--m-edge)' }} />
        <SpCard sp={sp} x={x} y={y} st={stOf(sp)} act={act} />
      </g>;
    })}

    {/* total gain */}
    <Zone x={24} y={596} w={1232} h={112} label="Total expected gain" />
    {[
      ['All open and applied', all], ['Applied', done], ['Approved, to apply', appr],
    ].map(([l, g], i) => <g key={l}>
      <text x={40 + i * 250} y={632} style={T(10, 400, MUT)}>{l}</text>
      <text x={40 + i * 250} y={656} style={{ ...T(i === 0 ? 20 : 16, 700, i === 0 ? BRAND : 'var(--m-text)'), fontVariantNumeric: 'tabular-nums' }}>{g.kcal ? '−' : ''}{nf(g.kcal)} <tspan style={T(10.5, 400, MUT)}>kcal/kWh</tspan>  {g.kw ? <>  −{nf(g.kw)}<tspan style={T(10.5, 400, MUT)}> kW APC</tspan></> : null}</text>
      <text x={40 + i * 250} y={676} style={T(10.5, 600)}>₹{nf(g.lakh)} L per year</text></g>)}
    <text x={40} y={698} style={T(9.5, 400, MUT)}>{`${cnt('proposed')} proposed · ${cnt('approved')} approved · ${cnt('applied')} applied · ${cnt('rejected')} rejected. Gains are not fully additive; the agent re-checks after each change.`}</text>
    <Val a="TG-01" t="thr" x={790} y={622} w={130} label="Turbine heat rate" />
    <Val a="BLR-01" t="eff" x={928} y={622} w={120} label="Boiler efficiency" />
    <Val a="UAT-01" t="apc" x={1056} y={622} w={90} label="APC" />
    <MiniTrend a="TG-01" t="thr" x={790} y={666} w={356} h={30} />
    <Val a="STK-01" t="co" x={1154} y={622} w={90} label="Stack CO" />
    <Dialog W={W} H={H} d={dlg} close={() => setDlg(null)} />
  </>;
}
const SetpointScreen = ({ c }) => <Mimic c={c} w={1280} h={720} note="advisory, approve or reject each setpoint"><SetpointBody /></Mimic>;

export default { 'aux-scheduler': AuxScheduler, 'soot-blowing': SootBlowing, 'setpoint-screen': SetpointScreen };
