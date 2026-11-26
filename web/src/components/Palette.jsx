import React, { useMemo, useState, useEffect } from 'react';
import { Search, Sparkles, LayoutDashboard, Box, Target, Folder, Inbox, BookOpen, Shield, Layers, Settings, Tag } from 'lucide-react';
import { useApp, DASHES } from '../App.jsx';
import { POLICIES } from '../lib/data.js';

/** Global search: pages, dashboards, UNS assets and tags, KPIs, artefacts, messages, docs and policies. Enter on the first row asks Copilot. */
export default function Palette({ close }) {
  const { ctx, arts, messages, nav, openPanel } = useApp();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const m = x => !s || x.toLowerCase().includes(s);
    const out = [];
    if (s) out.push({ g: 'Ask', icon: Sparkles, label: `Ask Copilot: “${q}”`, go: () => { close(); nav('copilot'); setTimeout(() => window.dispatchEvent(new CustomEvent('copilot-ask', { detail: q })), 50); } });
    DASHES.filter(d => m(d.name)).forEach(d => out.push({ g: 'Dashboards', icon: LayoutDashboard, label: d.name, go: () => nav('d/' + d.id) }));
    [['Copilot', 'copilot'], ['Messages', 'messages'], ['Artefactory', 'artefactory'], ['Autopilot', 'autopilot'], ['Context · UNS', 'context/uns'], ['Context · Skills', 'context/skills'], ['Context · Docs', 'context/docs'], ['Context · Connectors', 'context/connectors'], ['Context · Policies', 'context/policies'], ['Settings · Users', 'settings/users'], ['Settings · Agents', 'settings/agents'], ['Settings · Data', 'settings/data'], ['Settings · Logs', 'settings/logs']]
      .filter(p => m(p[0])).forEach(p => out.push({ g: 'Pages', icon: p[1].startsWith('settings') ? Settings : Layers, label: p[0], go: () => nav(p[1]) }));
    if (s) {
      ctx.db.assets.filter(a => m(a.id + ' ' + a.name)).slice(0, 6).forEach(a => out.push({ g: 'Assets', icon: Box, label: `${a.id} · ${a.name}`, hint: a.line.name, go: () => nav(`context/uns/${encodeURIComponent(ctx.db.unsPath(a))}`) }));
      ctx.db.assets.forEach(a => ctx.demo.classes[a.cls].tags.forEach(t => { if (s.length > 2 && m(`${a.id} ${t[1]}`)) out.push({ g: 'Tags', icon: Tag, label: `${a.id} · ${t[1]}`, hint: t[2], go: () => nav(`context/uns/${encodeURIComponent(ctx.db.unsPath(a, t[0]))}`) }); }));
      ctx.demo.kpis.filter(k => m(k.name)).forEach(k => out.push({ g: 'KPIs', icon: Target, label: k.name, hint: k.unit, go: () => nav('d/kpis/' + k.id) }));
      arts.filter(a => m(a.name)).slice(0, 6).forEach(a => out.push({ g: 'Artefacts', icon: Folder, label: a.name, hint: a.demo, go: () => nav('artefactory/' + a.id) }));
      messages.filter(x => m(x.title)).slice(0, 5).forEach(x => out.push({ g: 'Messages', icon: Inbox, label: x.title, go: () => nav('messages/' + x.id) }));
      ctx.demo.docs.filter(d => m(d.name + d.obj)).forEach(d => out.push({ g: 'Docs', icon: BookOpen, label: d.name, go: () => nav('context/docs') }));
      POLICIES.filter(p => m(p.id + ' ' + p.name)).forEach(p => out.push({ g: 'Policies', icon: Shield, label: `${p.id} · ${p.name}`, go: () => nav('context/policies/' + p.id) }));
    }
    return out.slice(0, 40);
  }, [q, ctx, arts, messages]);
  useEffect(() => setI(0), [q]);
  const go = it => { it.go(); close(); };
  let lastG = '';
  return (
    <div className="scrim" onClick={close}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="Search">
        <div className="pal-in"><Search size={17} color="var(--muted)" /><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search or ask anything…"
          onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(v => Math.min(items.length - 1, v + 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setI(v => Math.max(0, v - 1)); } if (e.key === 'Enter' && items[i]) go(items[i]); }} /><span className="kbd">Esc</span></div>
        <div className="pal-list">{items.map((it, k) => { const head = it.g !== lastG; lastG = it.g; return (
          <React.Fragment key={k}>{head && <div className="pal-g">{it.g}</div>}
            <button className={`pal-i ${k === i ? 'on' : ''}`} onMouseEnter={() => setI(k)} onClick={() => go(it)}><it.icon /><span className="ellipsis">{it.label}</span>{it.hint && <small>{it.hint}</small>}</button></React.Fragment>); })}
          {!items.length && <div className="empty">No matches</div>}</div>
      </div>
    </div>
  );
}
