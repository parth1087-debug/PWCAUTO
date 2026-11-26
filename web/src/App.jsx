import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MessageSquare, Inbox, Folder, Zap, Layers, Settings as Cog, Plus, Search, Bell, Sparkles, Menu, Sun, Moon, LogOut, Check, ChevronDown, LayoutDashboard, Target, Wrench, IndianRupee, Eye, Gauge, Calendar, X, Database } from 'lucide-react';
import { LOGIN, DEFAULT_USERS } from './config.js';
import { usePersist, uid as newId } from './lib/store.js';
import { getDB, DEMO_LIST, RANGES, resolveRange, fmtTime, fmtDate } from './lib/data.js';
import { seedArtefacts } from './lib/artefacts.js';
import { Av } from './components/ui.jsx';
import Chat from './components/Chat.jsx';
import Palette from './components/Palette.jsx';
import CopilotPage from './pages/CopilotPage.jsx';
import Messages from './pages/Messages.jsx';
import Dashboards from './pages/Dashboards.jsx';
import Artefactory from './pages/Artefactory.jsx';
import Autopilot from './pages/Autopilot.jsx';
import Context from './pages/Context.jsx';
import SettingsPage from './pages/Settings.jsx';
import Login from './pages/Login.jsx';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export const DASHES = [
  { id: 'kpis', name: 'Plant KPIs', icon: Target }, { id: 'overview', name: 'Plant overview', icon: LayoutDashboard },
  { id: 'maintenance', name: 'Maintenance', icon: Wrench }, { id: 'cost', name: 'Cost conversion', icon: IndianRupee },
  { id: 'quality', name: 'Quality', icon: Eye }, { id: 'energy', name: 'Energy & utilities', icon: Gauge },
];
const DEFAULT_PINS = ['kpis', 'overview', 'maintenance', 'cost', 'quality', 'energy'];

function useHash() {
  const get = () => (location.hash.replace(/^#\/?/, '') || 'copilot');
  const [r, setR] = useState(get);
  useEffect(() => { const f = () => setR(get()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return [r, to => { location.hash = '/' + to; }];
}

export default function App() {
  const [auth, setAuth] = usePersist('auth', null);
  const [users, setUsers] = usePersist('users', DEFAULT_USERS);
  const [userId, setUserId] = usePersist('user', 'master');
  const [demoPick, setDemoPick] = usePersist('demo', 'auto');
  const [anchor, setAnchor] = usePersist('anchor', null);
  const [range, setRange] = usePersist('range', { id: '30d' });
  const [theme, setTheme] = usePersist('theme', 'light');
  const [pinsByUser, setPinsByUser] = usePersist('pins', {});
  const [arts, setArts] = usePersist('artefacts.v2', seedArtefacts);
  const [chats, setChats] = usePersist('chats', {});
  const [msgState, setMsgState] = usePersist('msgstate', {});
  const [extraMsgs, setExtraMsgs] = usePersist('xmsgs', []);
  const [extraLogs, setExtraLogs] = usePersist('xlogs', []);
  const [prefs, setPrefs] = usePersist('prefs', { bruceUrl: '', schedOff: {}, wfOff: {}, notif: {} });
  const [route, nav] = useHash();
  const [panel, setPanel] = useState(null);
  const [palette, setPalette] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { setNavOpen(false); setPanel(null); document.querySelector('.content')?.scrollTo(0, 0); }, [route]);
  useEffect(() => {
    const k = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p); } if (e.key === 'Escape') { setPalette(false); setPanel(null); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  const user = users.find(u => u.id === userId) || users[0];
  const allowed = user.demos.includes('*') ? DEMO_LIST.map(d => d.id) : user.demos;
  const demoId = allowed.includes(demoPick) ? demoPick : allowed[0];
  const ctx = getDB(demoId, anchor);
  const pins = pinsByUser[user.id] || DEFAULT_PINS;
  const rng = resolveRange(range, ctx.db);

  const toast = useCallback(text => { const id = newId(); setToasts(t => [...t, { id, text }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200); }, []);
  const addLog = (src, ev, obj, msg, lvl = 'INFO') => setExtraLogs(l => [{ time: Date.now(), lvl, src, actor: user.name, ev, obj, msg, trace: 'tr-' + newId(), demo: demoId }, ...l].slice(0, 300));

  const messages = useMemo(() => [...extraMsgs.filter(m => m.demo === demoId), ...ctx.messages]
    .map(m => ({ read: !(m.type === 'approval' || m.type === 'alert'), ...m, ...(msgState[m.id] || {}) })).sort((a, b) => b.time - a.time), [extraMsgs, ctx, msgState, demoId]);
  const unread = messages.filter(m => !m.read).length;

  const actions = {
    createArtefact({ type, name, spec, demo, note }) {
      const id = 'a-' + newId();
      setArts(a => [{ id, type, name, spec, demo: demo || demoId, owner: user.id, shared: [], versions: [{ v: 1, by: `Copilot for ${user.name}`, when: Date.now(), note }] }, ...a]);
      addLog('Agents', 'artefact.create', name, `${type} v1`);
      return id;
    },
    raiseWO(asset, title) {
      const id = `x-${newId()}`;
      setExtraMsgs(m => [{ id, demo: demoId, type: 'approval', sev: 'approval', from: 'Maintenance Planner', time: Date.now(), title: `Approve work order · ${asset} · ${title}`, policy: 'P-03',
        table: [['Equipment', asset], ['Job', title], ['Window', 'Next planned stop'], ['Raised by', `Copilot for ${user.name}`]], actions: ['approve', 'reject'] }, ...m]);
      addLog('Tools', 'tool.call sap_pm.create_order', asset, 'Held for approval (P-03)');
      toast('Work order drafted in SAP PM and sent for approval. See Messages.');
    },
    setMsg(id, patch) { setMsgState(s => ({ ...s, [id]: { ...(s[id] || {}), ...patch } })); },
    pin(key) { setPinsByUser(p => { const cur = p[user.id] || DEFAULT_PINS; return { ...p, [user.id]: cur.includes(key) ? cur.filter(x => x !== key) : [...cur, key] }; }); },
  };

  const app = {
    user, users, setUsers, setUserId, allowed, demoId, setDemo: setDemoPick, ctx, anchor, setAnchor, range, setRange, rng, theme, setTheme,
    pins, arts, setArts, chats, setChats, messages, unread, extraLogs, addLog, prefs, setPrefs, route, nav, toast, actions,
    openPanel: c => setPanel(c), closePanel: () => setPanel(null), panel,
  };

  if (!auth) return <AppCtx.Provider value={app}><Login onLogin={(u, p) => (u === LOGIN.username && p === LOGIN.password ? (setAuth({ at: Date.now() }), true) : false)} /></AppCtx.Provider>;

  const [section, sub, sub2] = route.split('/');
  let page;
  if (section === 'messages') page = <Messages id={sub} />;
  else if (section === 'd') page = <Dashboards id={sub} artId={sub2} />;
  else if (section === 'artefactory') page = <Artefactory id={sub} />;
  else if (section === 'autopilot') page = <Autopilot />;
  else if (section === 'context') page = <Context tab={sub || 'uns'} param={sub2} />;
  else if (section === 'settings') page = <SettingsPage tab={sub || 'users'} />;
  else page = <CopilotPage id={sub} />;

  return (
    <AppCtx.Provider value={app}>
      <div className={`app ${navOpen ? 'nav-open' : ''}`}>
        <Sidebar section={section} sub={sub} sub2={sub2} signOut={() => setAuth(null)} />
        <div className="main" onClick={() => navOpen && setNavOpen(false)}>
          <TopBar section={section} openNav={e => { e.stopPropagation(); setNavOpen(true); }} openPalette={() => setPalette(true)} />
          <main className="content">{page}</main>
        </div>
      </div>
      {panel && (
        <aside className="panel" role="dialog" aria-label="Copilot">
          <div className="panel-h"><Sparkles size={16} color="var(--brand)" /><b>Copilot</b><span className="muted" style={{ fontSize: 12 }}>on Bruce</span><button className="ibtn right" onClick={() => setPanel(null)} aria-label="Close"><X /></button></div>
          <div className="ctx"><Layers size={13} />Asking about: <b className="ellipsis" style={{ color: 'var(--text)' }}>{panel.title}</b></div>
          <div style={{ flex: 1, minHeight: 0 }}><Chat key={panel.title} context={panel} compact /></div>
        </aside>
      )}
      {palette && <Palette close={() => setPalette(false)} />}
      <div className="toasts">{toasts.map(t => <div key={t.id} className="toast">{t.text}</div>)}</div>
    </AppCtx.Provider>
  );
}

function Sidebar({ section, sub, sub2, signOut }) {
  const { user, users, setUserId, unread, pins, arts, nav, actions, theme, setTheme, ctx } = useApp();
  const [menu, setMenu] = useState(false);
  const [pinMenu, setPinMenu] = useState(false);
  const item = (to, Icon, label, on, extra) => <a href={'#/' + to} className={`nav-i ${on ? 'on' : ''}`}><Icon />{label}{extra}</a>;
  const customs = arts.filter(a => a.type === 'dash');
  const pinItems = pins.map(k => {
    if (k.startsWith('custom/')) { const a = customs.find(x => x.id === k.slice(7)); return a && { to: `d/${k}`, label: a.name, icon: LayoutDashboard, on: section === 'd' && sub === 'custom' && sub2 === a.id, custom: true }; }
    const d = DASHES.find(x => x.id === k); return d && { to: `d/${k}`, label: d.name, icon: d.icon, on: section === 'd' && sub === k };
  }).filter(Boolean);
  return (
    <aside className="side">
      <div className="logo"><span className="wm">pwc</span><small><b>Connected Plant</b><br />Intelligence</small></div>
      <div style={{ position: 'relative' }}>
        <button className="user-btn" onClick={() => setMenu(m => !m)} aria-haspopup="menu"><Av u={user} /><div className="grow"><div className="u-n ellipsis">{user.name}</div><div className="u-r ellipsis">{user.role}</div></div><ChevronDown size={15} color="var(--muted)" /></button>
        {menu && <div className="menu" style={{ left: 10, right: 10, top: 54 }} onMouseLeave={() => setMenu(false)}>
          <div className="pal-g" style={{ padding: '4px 10px' }}>Switch user</div>
          {users.map(u => <button key={u.id} className={`mi ${u.id === user.id ? 'on' : ''}`} onClick={() => { setUserId(u.id); setMenu(false); nav('copilot'); }}><Av u={u} s={22} /><span className="grow"><span className="ellipsis" style={{ display: 'block' }}>{u.name}</span><small className="muted">{u.master ? 'All demos' : DEMO_LIST.find(d => d.id === u.demos[0])?.company}</small></span>{u.id === user.id && <Check size={15} />}</button>)}
          <div className="sep" />
          <button className="mi" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
          <button className="mi" onClick={signOut}><LogOut size={15} />Sign out</button>
        </div>}
      </div>
      <nav className="nav">
        {item('copilot', MessageSquare, 'Copilot', section === 'copilot')}
        {item('messages', Inbox, 'Messages', section === 'messages', unread ? <span className="cnt">{unread}</span> : null)}
        <div className="nav-l">Shortcuts<button className="nav-add" onClick={() => setPinMenu(m => !m)} title="Add or remove shortcuts" aria-label="Edit shortcuts"><Plus size={14} /></button></div>
        <div style={{ position: 'relative' }}>
          {pinMenu && <div className="menu" style={{ left: 0, right: 0, top: -4 }} onMouseLeave={() => setPinMenu(false)}>
            <div className="pal-g" style={{ padding: '4px 10px' }}>Dashboards</div>
            {DASHES.map(d => <button key={d.id} className="mi" onClick={() => actions.pin(d.id)}><d.icon size={15} /><span className="grow">{d.name}</span>{pins.includes(d.id) && <Check size={15} />}</button>)}
            {customs.length > 0 && <div className="pal-g" style={{ padding: '8px 10px 4px' }}>From Artefactory</div>}
            {customs.map(a => <button key={a.id} className="mi" onClick={() => actions.pin('custom/' + a.id)}><LayoutDashboard size={15} /><span className="grow ellipsis">{a.name}</span>{pins.includes('custom/' + a.id) && <Check size={15} />}</button>)}
          </div>}
          {pinItems.map(p => <a key={p.to} href={'#/' + p.to} className={`nav-i ${p.on ? 'on' : ''}`}><p.icon /><span className="ellipsis">{p.label}</span>{p.custom && <span className="dot" />}</a>)}
        </div>
        <div style={{ height: 10 }} />
        {item('artefactory', Folder, 'Artefactory', section === 'artefactory')}
        {item('autopilot', Zap, 'Autopilot', section === 'autopilot')}
        {item('context/uns', Layers, 'Context', section === 'context')}
        {item('settings/users', Cog, 'Settings', section === 'settings')}
      </nav>
      <div className="side-foot"><div className="row"><span className="live" /> <span className="ellipsis"><b>{ctx.demo.company}</b></span></div><div className="row" style={{ marginTop: 2 }}><Database size={12} /> plantdb/{ctx.demo.id} · AI by Faclon Labs</div></div>
    </aside>
  );
}

function TopBar({ section, openNav, openPalette }) {
  const { user, allowed, demoId, setDemo, ctx, range, setRange, rng, unread, nav, openPanel, route, anchor } = useApp();
  const [dm, setDm] = useState(false); const [custom, setCustom] = useState(false);
  const showRange = section === 'd';
  return (
    <header className="top">
      <button className="ibtn menu-btn" onClick={openNav} aria-label="Menu"><Menu /></button>
      <button className="search" onClick={openPalette}><Search size={15} /><span className="hide-sm">Search assets, KPIs, artefacts, messages</span><span className="kbd">⌘K</span></button>
      {user.master ? (
        <div style={{ position: 'relative' }}>
          <button className="sel" onClick={() => setDm(v => !v)}><Database /><span className="hide-sm">{ctx.demo.company}</span><ChevronDown /></button>
          {dm && <div className="menu" style={{ top: 40, left: 0 }} onMouseLeave={() => setDm(false)}>
            <div className="pal-g" style={{ padding: '4px 10px' }}>Demo database</div>
            {DEMO_LIST.filter(d => allowed.includes(d.id)).map(d => <button key={d.id} className={`mi ${d.id === demoId ? 'on' : ''}`} onClick={() => { setDemo(d.id); setDm(false); }}><span className="grow"><b style={{ fontWeight: 600 }}>{d.company}</b><small className="muted" style={{ display: 'block' }}>{d.industry}</small></span>{d.id === demoId && <Check size={15} />}</button>)}
          </div>}
        </div>
      ) : <span className="sel hide-sm"><Database />{ctx.demo.company} · {ctx.demo.site}</span>}
      <div className="grow" />
      {showRange && <div className="row hide-sm" style={{ position: 'relative' }}>
        <div className="seg">{RANGES.map(r => <button key={r.id} className={range.id === r.id ? 'on' : ''} onClick={() => setRange({ id: r.id })}>{r.label}</button>)}
          <button className={range.id === 'custom' ? 'on' : ''} onClick={() => setCustom(v => !v)}><Calendar size={13} /></button></div>
        {custom && <div className="menu" style={{ top: 40, right: 0, padding: 12, minWidth: 280 }}>
          <div className="pal-g" style={{ padding: '0 0 6px' }}>Custom range</div>
          <CustomRange db={ctx.db} range={range} onApply={r => { setRange(r); setCustom(false); }} />
        </div>}
      </div>}
      <span className="muted hide-sm" style={{ fontSize: 12, whiteSpace: 'nowrap' }} title="Data is generated and anchored to the demo clock">{anchor ? <>Demo clock · {fmtDate(ctx.db.anchor)}</> : <><span className="live" /> Live · {fmtTime(ctx.db.now)} IST</>}</span>
      <a className="ibtn" href="#/messages" aria-label="Messages"><Bell />{unread > 0 && <span className="badge">{unread}</span>}</a>
      {section !== 'copilot' && <button className="btn pri" onClick={() => openPanel({ kind: 'page', title: pageTitle(route, ctx), summary: [] })}><Sparkles />Ask</button>}
    </header>
  );
}
function CustomRange({ db, range, onApply }) {
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const [f, setF] = useState(range.from || iso(db.anchor - 14 * 864e5)); const [t, setT] = useState(range.to || iso(db.anchor));
  return <div className="row" style={{ flexWrap: 'wrap' }}>
    <input className="inp" type="date" value={f} min={iso(db.tsDay(0))} max={iso(db.anchor)} onChange={e => setF(e.target.value)} style={{ width: 130 }} />
    <input className="inp" type="date" value={t} min={iso(db.tsDay(0))} max={iso(db.anchor)} onChange={e => setT(e.target.value)} style={{ width: 130 }} />
    <button className="btn pri sm" onClick={() => onApply({ id: 'custom', from: f, to: t })}>Apply</button></div>;
}
export function pageTitle(route, ctx) {
  const [s, a] = route.split('/');
  if (s === 'd') return (DASHES.find(d => d.id === a)?.name || 'Dashboard') + ` · ${ctx.demo.company}`;
  return ({ messages: 'Messages', artefactory: 'Artefactory', autopilot: 'Autopilot', context: 'Context', settings: 'Settings' }[s] || 'Plant') + ` · ${ctx.demo.company}`;
}
