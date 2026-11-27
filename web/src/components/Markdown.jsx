import React from 'react';
import { Trend, Bars } from './charts.jsx';

/** A Bruce ```chart block: {type, title, x:{key,type}, series:[{key,label}], unit, data}. */
function AgentChart({ src }) {
  let c;
  try { c = JSON.parse(src); } catch { return <pre className="code">{src}</pre>; }
  const data = Array.isArray(c.data) ? c.data : [];
  const xKey = c.x?.key || 't';
  const series = (c.series || []).map((x, i) => ({ key: x.key, name: x.label || x.key, ...(i === 0 && c.type !== 'bar' ? { type: 'area' } : {}) }));
  if (!data.length || !series.length) return null;
  const isTime = c.x?.type === 'time' || /^\d{4}-\d\d-\d\d/.test(String(data[0][xKey] ?? ''));
  return <div className="box"><div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{c.title}</div>
    {isTime && c.type !== 'bar'
      ? <Trend data={data.map(d => ({ ...d, t: new Date(d[xKey]).getTime() }))} series={series} unit={c.unit} days={Math.max(1, Math.round((new Date(data.at(-1)[xKey]) - new Date(data[0][xKey])) / 864e5))} height={180} />
      : <Bars data={data.map(d => ({ ...d, name: String(d[xKey]) }))} series={series} horizontal={data.length > 6} height={Math.max(160, data.length * 28)} />}
  </div>;
}

/* Minimal, safe Markdown for agent answers: paragraphs, lists, tables, quotes, code, **bold**, *italic*, `code`. */
function inline(s, key = 0) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<b key={`${key}-${i++}`}>{t.slice(2, -2)}</b>);
    else if (t.startsWith('`')) out.push(<code key={`${key}-${i++}`} className="mono" style={{ background: 'var(--bg-3)', padding: '1px 4px', borderRadius: 4, fontSize: '0.92em' }}>{t.slice(1, -1)}</code>);
    else out.push(<i key={`${key}-${i++}`}>{t.slice(1, -1)}</i>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

export default function Markdown({ text }) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith('```')) {
      const lang = l.slice(3).trim().toLowerCase();
      const body = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++]);
      const closed = i < lines.length; i++;
      if (lang === 'artefact' || lang === 'artifact') continue;
      if (lang === 'chart') { if (closed) blocks.push(<AgentChart key={blocks.length} src={body.join('\n')} />); continue; }
      blocks.push(<pre key={blocks.length} className="code">{body.join('\n')}</pre>); continue;
    }
    if (/^#{1,4}\s/.test(l)) { blocks.push(<p key={blocks.length} style={{ fontWeight: 600, margin: '10px 0 4px' }}>{inline(l.replace(/^#+\s/, ''))}</p>); i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = cells(l); i += 2; const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      blocks.push(<div key={blocks.length} className="box scroll-x" style={{ padding: 0 }}><table className="t"><thead><tr>{head.map((h, j) => <th key={j}>{inline(h)}</th>)}</tr></thead><tbody>{rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (/^\s*>/.test(l)) {
      const q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push(<blockquote key={blocks.length} style={{ margin: '6px 0', padding: '8px 12px', borderLeft: '3px solid var(--brand)', background: 'var(--bg-2)', borderRadius: '0 6px 6px 0' }}>{inline(q.join(' '))}</blockquote>);
      continue;
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
      const ordered = /^\s*\d+[.)]/.test(l); const items = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ''));
      const L = ordered ? 'ol' : 'ul';
      blocks.push(<L key={blocks.length}>{items.map((x, j) => <li key={j}>{inline(x, j)}</li>)}</L>);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|\s*>|\s*([-*•]|\d+[.)])\s+|\s*\|.*\|\s*$)/.test(lines[i])) para.push(lines[i++]);
    if (!para.length) { para.push(lines[i++]); }
    blocks.push(<p key={blocks.length}>{inline(para.join(' '))}</p>);
  }
  return <>{blocks}</>;
}
