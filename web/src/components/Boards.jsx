import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, ChevronRight, Database, Send, Star, ClipboardList, PenLine, History } from 'lucide-react';
import { useApp } from '../App.jsx';
import { Card, Empty } from './ui.jsx';
import { fmtDateTime } from '../lib/data.js';
import { api } from '../lib/api.js';
/* Boards live in ./boards/ (one file each); forms stay here. */
export { LiveBadge } from './boards/live.jsx';
export { TwinView } from './boards/twin.jsx';
export { RealtimeView } from './boards/realtime.jsx';
export { SetpointView } from './boards/setpoints.jsx';
export { CustomBoard } from './boards/custom.jsx';
export { RcaView } from './boards/rca.jsx';

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
