import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MessageSquare, Inbox, Folder, Zap, Layers, Settings as Cog, Plus, Search, Bell, Sparkles, Menu, Sun, Moon, LogOut, Check, ChevronDown, LayoutDashboard, Target, Wrench, IndianRupee, Eye, Gauge, Calendar, X, Database, Box, Activity, SlidersHorizontal, ClipboardList, FileSpreadsheet, Presentation, FileText, Palette as PaletteIc } from 'lucide-react';
import { LOGIN, DEFAULT_USERS } from './config.js';
import { usePersist, uid as newId } from './lib/store.js';
import { getDB, DEMO_LIST, RANGES, resolveRange, fmtTime, fmtDate } from './lib/data.js';
import { seedAll } from './shared/artefacts.js';
import { DEMOS } from './shared/index.js';
import { api } from './lib/api.js';
import { THEMES } from './lib/themes.js';
import { Av } from './components/ui.jsx';
import Chat from './components/Chat.jsx';
import Palette from './components/Palette.jsx';
import CopilotPage from './pages/CopilotPage.jsx';
import Messages from './pages/Messages.jsx';
import Artefactory, { StandaloneView } from './pages/Artefactory.jsx';
import Autopilot from './pages/Autopilot.jsx';
import Context from './pages/Context.jsx';
import SettingsPage from './pages/Settings.jsx';
import Login from './pages/Login.jsx';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

/** Icon for an artefact (by dashboard view or type). */
const VIEW_ICON = { kpis: Target, overview: LayoutDashboard, maintenance: Wrench, cost: IndianRupee, quality: Eye, energy: Gauge, twin: Box, realtime: Activity, setpoints: SlidersHorizontal, custom: LayoutDashboard };
const TYPE_ICON = { xlsx: FileSpreadsheet, pptx: Presentation, docx: FileText, form: ClipboardList };
export const artIcon = a => (a.type === 'dash' ? VIEW_ICON[a.spec?.view] || LayoutDashboard : TYPE_ICON[a.type] || FileText);
const BUILT_IN = ['kpis', 'overview', 'maintenance', 'cost', 'quality', 'energy'];
const newArtId = () => 'a-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

function useHash() {
  const get = () => (location.hash.replace(/^#\/?/, '') || 'copilot');
  const [r, setR] = useState(get);
  useEffect(() => { const f = () => setR(get()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return [r, to => { location.hash = '/' + to; }];
}

export default function App() {
  const [auth, setAuth] = usePersist('auth', null);
  const [storedUsers, setUsers] = usePersist('users', DEFAULT_USERS);
  const users = useMemo(() => [...storedUsers, ...DEFAULT_USERS.filter(d => !storedUsers.find(u => u.id === d.id))], [storedUsers]); // new demo users appear for existing browsers
  const [userId, setUserId] = usePersist('user', 'master');
  const [demoPick, setDemoPick] = usePersist('demo', 'auto');
  const [anchor, setAnchor] = usePersist('anchor', null);
  const [range, setRange] = usePersist('range', { id: '30d' });
  const [theme, setTheme] = usePersist('theme', 'light');
  const [pinsByUser, setPinsByUser] = usePersist('pins', {});
  const [arts, setArts] = usePersist('artefacts.v3', () => seedAll(DEMOS));
  const [dbState, setDbState] = useState('local');
  const [tick, setTick] = useState(0);
  const [tickAt, setTickAt] = useState(Date.now());
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
  /* Live tick: every 10 s the UI draws new live values and reloads the artefact database. */
  const refresh = useCallback(() => api.listArtefacts().then(list => {
    if (!Array.isArray(list)) return;
    setArts(cur => [...cur.filter(a => a.local && !list.find(x => x.id === a.id)), ...list]); setDbState('server');
  }).catch(() => setDbState('local')), [setArts]);
  useEffect(() => {
    refresh();
    const i = setInterval(() => { setTick(t => t + 1); setTickAt(Date.now()); if (document.visibilityState === 'visible') refresh(); }, 10000);
    return () => clearInterval(i);
  }, [refresh]);
  useEffect(() => { setNavOpen(false); setPanel(null); document.querySelector('.content')?.scrollTo(0, 0); }, [route]);
  useEffect(() => {
    const k = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p); } if (e.key === 'Escape') { setPalette(false); setPanel(null); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  const user = users.find(u => u.id === userId) || users[0];
  const allowed = user.demos.includes('*') ? DEMO_LIST.map(d => d.id) : user.demos;
  const demoId = allowed.includes(demoPick) ? demoPick : allowed[0];
  const ctx = getDB(demoId, anchor);
  const pinKey = `${user.id}:${demoId}`;
  const defaultPins = arts.filter(a => a.demo === demoId && a.spec?.shortcut).sort((a, b) => a.spec.shortcut - b.spec.shortcut).map(a => a.id);
  const pins = (pinsByUser[pinKey] || defaultPins).filter(id => arts.find(a => a.id === id));
  const rng = resolveRange(range, ctx.db);

  const toast = useCallback(text => { const id = newId(); setToasts(t => [...t, { id, text }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200); }, []);
  const addLog = (src, ev, obj, msg, lvl = 'INFO') => setExtraLogs(l => [{ time: Date.now(), lvl, src, actor: user.name, ev, obj, msg, trace: 'tr-' + newId(), demo: demoId }, ...l].slice(0, 300));

  const messages = useMemo(() => [...extraMsgs.filter(m => m.demo === demoId), ...ctx.messages]
    .map(m => ({ read: !(m.type === 'approval' || m.type === 'alert'), ...m, ...(msgState[m.id] || {}) })).sort((a, b) => b.time - a.time), [extraMsgs, ctx, msgState, demoId]);
  const unread = messages.filter(m => !m.read).length;

  const actions = {
    createArtefact({ type, name, spec, demo, note }) {
      const id = newArtId(); const by = `Copilot for ${user.name}`;
      const a = { id, type, name, spec, demo: demo || demoId, owner: user.id, shared: ['master'], local: true, created: Date.now(), versions: [{ v: 1, by, when: Date.now(), note: note || 'Created' }] };
      setArts(list => [a, ...list]);
      api.createArtefact({ id, demo: a.demo, type: type === 'dash' ? 'dashboard' : type, name, spec, owner: user.id, by, note })
        .then(saved => setArts(list => list.map(x => (x.id === id ? saved : x)))).catch(() => { /* offline: stays local */ });
      addLog('Agents', 'artefact.create', name, `${type} v1`);
      return id;
    },
    addArtefact(a) { setArts(list => [a, ...list.filter(x => x.id !== a.id)]); },
    addVersion(a, { note, spec, name }) {
      const v = { v: a.versions[0].v + 1, by: user.name, when: Date.now(), note };
      setArts(list => list.map(x => (x.id === a.id ? { ...x, ...(spec ? { spec } : {}), ...(name ? { name } : {}), versions: [v, ...x.versions] } : x)));
      api.addVersion(a.id, { note, spec, name, by: user.name }).then(saved => setArts(list => list.map(x => (x.id === a.id ? saved : x)))).catch(() => {});
    },
    raiseWO(asset, title) {
      const id = `x-${newId()}`;
      setExtraMsgs(m => [{ id, demo: demoId, type: 'approval', sev: 'approval', from: 'Maintenance Planner', time: Date.now(), title: `Approve work order · ${asset} · ${title}`, policy: 'P-03',
        table: [['Equipment', asset], ['Job', title], ['Window', 'Next planned stop'], ['Raised by', `Copilot for ${user.name}`]], actions: ['approve', 'reject'] }, ...m]);
      addLog('Tools', 'tool.call sap_pm.create_order', asset, 'Held for approval (P-03)');
      toast('Work order drafted in SAP PM and sent for approval. See Messages.');
    },
    setMsg(id, patch) { setMsgState(s => ({ ...s, [id]: { ...(s[id] || {}), ...patch } })); },
    pin(id) { setPinsByUser(p => { const cur = p[pinKey] || defaultPins; return { ...p, [pinKey]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] }; }); },
    resetPins() { setPinsByUser(p => { const n = { ...p }; delete n[pinKey]; return n; }); },
  };

  const app = {
    user, users, setUsers, setUserId, allowed, demoId, setDemo: setDemoPick, ctx, anchor, setAnchor, range, setRange, rng, theme, setTheme,
    pins, arts, setArts, tick, tickAt, dbState, refresh, chats, setChats, messages, unread, extraLogs, addLog, prefs, setPrefs, route, nav, toast, actions,
    openPanel: c => setPanel(c), closePanel: () => setPanel(null), panel,
  };

  if (!auth) return <AppCtx.Provider value={app}><Login onLogin={(u, p) => (u === LOGIN.username && p === LOGIN.password ? (setAuth({ at: Date.now() }), true) : false)} /></AppCtx.Provider>;

  const [section, sub, sub2] = route.split('/');
  if (section === 'd') { /* old dashboard links → the artefact that holds that board */
    const to = sub === 'custom' ? `artefactory/${sub2}` : `artefactory/${demoId}-${sub || 'overview'}${sub2 ? '/' + sub2 : ''}`;
    setTimeout(() => location.replace(`#/${to}`), 0); return null;
  }
  if (section === 'view') return (
    <AppCtx.Provider value={app}>
      <StandaloneView id={sub} />
      {panel && <aside className="panel" role="dialog" aria-label="Copilot"><div className="panel-h"><Sparkles size={16} color="var(--brand)" /><b>Copilot</b><button className="ibtn right" onClick={() => setPanel(null)} aria-label="Close"><X /></button></div><div style={{ flex: 1, minHeight: 0 }}><Chat key={panel.title} context={panel} compact /></div></aside>}
      <div className="toasts">{toasts.map(t => <div key={t.id} className="toast">{t.text}</div>)}</div>
    </AppCtx.Provider>
  );
  let page;
  if (section === 'messages') page = <Messages id={sub} />;
  else if (section === 'artefactory') page = <Artefactory id={sub} sel={sub2} />;
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
  const { user, users, setUserId, unread, pins, arts, nav, actions, theme, setTheme, ctx, dbState } = useApp();
  const [menu, setMenu] = useState(false);
  const [pinMenu, setPinMenu] = useState(false);
  const item = (to, Icon, label, on, extra) => <a href={'#/' + to} className={`nav-i ${on ? 'on' : ''}`}><Icon />{label}{extra}</a>;
  const { demoId } = ctx.demo ? { demoId: ctx.demo.id } : {};
  const mine = arts.filter(a => a.demo === demoId);
  const pinItems = pins.map(id => { const a = arts.find(x => x.id === id); return a && { to: `artefactory/${a.id}`, label: a.name, icon: artIcon(a), on: section === 'artefactory' && sub === a.id, custom: !a.spec?.shortcut }; }).filter(Boolean);
  const groups = [['Dashboards', mine.filter(a => a.type === 'dash')], ['Forms', mine.filter(a => a.type === 'form')], ['Sheets, decks and documents', mine.filter(a => ['xlsx', 'pptx', 'docx'].includes(a.type))]];
  return (
    <aside className="side">
      <div className="logo"><span className="wm">FACLON<i>LABS</i></span><small><b>Connected Plant</b><br />Intelligence</small></div>
      <div style={{ position: 'relative' }}>
        <button className="user-btn" onClick={() => setMenu(m => !m)} aria-haspopup="menu"><Av u={user} /><div className="grow"><div className="u-n ellipsis">{user.name}</div><div className="u-r ellipsis">{user.role}</div></div><ChevronDown size={15} color="var(--muted)" /></button>
        {menu && <div className="menu" style={{ left: 10, right: 10, top: 54 }} onMouseLeave={() => setMenu(false)}>
          <div className="pal-g" style={{ padding: '4px 10px' }}>Switch user</div>
          {users.map(u => <button key={u.id} className={`mi ${u.id === user.id ? 'on' : ''}`} onClick={() => { setUserId(u.id); setMenu(false); nav('copilot'); }}><Av u={u} s={22} /><span className="grow"><span className="ellipsis" style={{ display: 'block' }}>{u.name}</span><small className="muted">{u.master ? 'All demos' : DEMO_LIST.find(d => d.id === u.demos[0])?.company}</small></span>{u.id === user.id && <Check size={15} />}</button>)}
          <div className="sep" />
          <div className="pal-g" style={{ padding: '4px 10px' }}>Theme</div>
          <div className="theme-row">{THEMES.map(t => <button key={t.id} className={`sw ${theme === t.id ? 'on' : ''}`} title={t.name} aria-label={`${t.name} theme`} onClick={() => setTheme(t.id)} style={{ background: `linear-gradient(135deg, ${t.bg} 50%, ${t.brand} 50%)` }} />)}</div>
          <div className="sep" />
          <button className="mi" onClick={signOut}><LogOut size={15} />Sign out</button>
        </div>}
      </div>
      <nav className="nav">
        {item('copilot', MessageSquare, 'Copilot', section === 'copilot')}
        {item('messages', Inbox, 'Messages', section === 'messages', unread ? <span className="cnt">{unread}</span> : null)}
        <div className="nav-l">Shortcuts · Artefactory<button className="nav-add" onClick={() => setPinMenu(m => !m)} title="Add or remove shortcuts" aria-label="Edit shortcuts"><Plus size={14} /></button></div>
        <div style={{ position: 'relative' }}>
          {pinMenu && <div className="menu" style={{ left: 0, right: 0, top: -4 }} onMouseLeave={() => setPinMenu(false)}>
            <div style={{ maxHeight: 360, overflow: 'auto' }}>
            {groups.filter(g => g[1].length).map(([g, list]) => <React.Fragment key={g}><div className="pal-g" style={{ padding: '6px 10px 4px' }}>{g}</div>
              {list.map(a => { const I = artIcon(a); return <button key={a.id} className="mi" onClick={() => actions.pin(a.id)}><I size={15} /><span className="grow ellipsis">{a.name}</span>{pins.includes(a.id) && <Check size={15} />}</button>; })}</React.Fragment>)}
            </div>
            <div className="sep" /><button className="mi" onClick={() => { actions.resetPins(); setPinMenu(false); }}><span className="grow muted">Reset to default shortcuts</span></button>
          </div>}
          {pinItems.map(p => <a key={p.to} href={'#/' + p.to} className={`nav-i ${p.on ? 'on' : ''}`}><p.icon /><span className="ellipsis">{p.label}</span>{p.custom && <span className="dot" />}</a>)}
        </div>
        <div style={{ height: 10 }} />
        {item('artefactory', Folder, 'Artefactory', section === 'artefactory')}
        {item('autopilot', Zap, 'Autopilot', section === 'autopilot')}
        {item('context/uns', Layers, 'Context', section === 'context')}
        {item('settings/users', Cog, 'Settings', section === 'settings')}
      </nav>
      <div className="side-foot"><div className="row"><span className="live" /> <span className="ellipsis"><b>{ctx.demo.company}</b></span></div><div className="row" style={{ marginTop: 2 }}><Database size={12} /> plantdb/{ctx.demo.id} · {dbState === 'server' ? 'database live' : 'offline copy'}</div></div>
    </aside>
  );
}

function TopBar({ section, openNav, openPalette }) {
  const { user, allowed, demoId, setDemo, ctx, range, setRange, rng, unread, nav, openPanel, route, anchor, arts } = useApp();
  const [dm, setDm] = useState(false); const [custom, setCustom] = useState(false);
  const [, artId] = route.split('/');
  const art = section === 'artefactory' && arts.find(a => a.id === artId);
  const showRange = !!art && art.type === 'dash' && (BUILT_IN.includes(art.spec?.view) || art.spec?.view === 'custom' || !art.spec?.view);
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
  if (s === 'artefactory' && a) return `Artefact ${a} · ${ctx.demo.company}`;
  return ({ messages: 'Messages', artefactory: 'Artefactory', autopilot: 'Autopilot', context: 'Context', settings: 'Settings' }[s] || 'Plant') + ` · ${ctx.demo.company}`;
}
