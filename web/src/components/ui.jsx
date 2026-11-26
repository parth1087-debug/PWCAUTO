import React from 'react';
import { Sparkles, Download } from 'lucide-react';
import { useApp } from '../App.jsx';
import { downloadCSV, fmtNum } from '../lib/data.js';

export function Card({ title, sub, actions, children, flush, ask, csv, className = '', style }) {
  const { openPanel } = useApp();
  return (
    <section className={`card ${className}`} style={style}>
      {(title || actions || ask || csv) && (
        <div className="ch">
          <div className="grow"><h3>{title}</h3>{sub && <div className="sub">{sub}</div>}</div>
          <div className="acts">
            {actions}
            {csv && <button className="ibtn" title="Download CSV" onClick={() => downloadCSV(csv.name, csv.rows())}><Download /></button>}
            {ask && <button className="ibtn" title="Ask Copilot about this" onClick={() => openPanel(ask)}><Sparkles /></button>}
          </div>
        </div>
      )}
      <div className={`cb ${flush ? 'flush' : ''}`}>{children}</div>
    </section>
  );
}

export function Kpi({ k, onClick, spark }) {
  const good = k.improvePct >= 0;
  return (
    <button className="kpi" onClick={onClick}>
      <div className="l"><span className="dotc" style={{ background: k.status === 'At risk' ? 'var(--warn)' : k.status === 'On target' ? 'var(--good)' : 'var(--info)' }} /><span className="ellipsis">{k.name}</span></div>
      <div className="v">{fmtNum(k.value, k.dec)}<small>{k.unit}</small></div>
      <div className="f"><span className={good ? 'up-good' : 'up-bad'}>{good ? '▲' : '▼'} {Math.abs(k.improvePct)}%</span><span>vs baseline</span><span className="right">Target {fmtNum(k.target, k.dec)}</span></div>
      {spark}
    </button>
  );
}

export const Tag = ({ c = '', children }) => <span className={`tag ${c}`}>{children}</span>;
export const Toggle = ({ on, onChange, label }) => <button className={`tog ${on ? 'on' : ''}`} aria-label={label} aria-pressed={on} onClick={() => onChange(!on)}><i /></button>;
export function Seg({ value, options, onChange }) {
  return <div className="seg">{options.map(o => <button key={o.id} className={o.id === value ? 'on' : ''} onClick={() => onChange(o.id)}>{o.label}</button>)}</div>;
}
export function Tabs({ value, tabs, onChange }) {
  return <div className="tabs">{tabs.map(t => <button key={t.id} className={t.id === value ? 'on' : ''} onClick={() => onChange(t.id)}>{t.label}{t.n != null && <span className="n">{t.n}</span>}</button>)}</div>;
}
export function HealthBar({ v, w = 110 }) {
  return <div className="bar" style={{ width: w }}><div className="tr"><div className={`fl ${v < 50 ? 'bad' : v < 75 ? 'warn' : ''}`} style={{ width: `${v}%` }} /></div><span className="num">{v}</span></div>;
}
export const PageHead = ({ title, sub, children }) => (
  <div className="ph"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{children && <div className="acts">{children}</div>}</div>
);
export const Empty = ({ children }) => <div className="empty">{children}</div>;
export const Av = ({ u, s = 28 }) => <span className="av" style={{ background: u.color || '#555', width: s, height: s }}>{u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>;
