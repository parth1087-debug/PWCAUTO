import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Search } from 'lucide-react';
import { useApp } from '../App.jsx';
import { PageHead, Tabs, Tag, Card, Empty, HealthBar, Seg } from '../components/ui.jsx';
import { Trend } from '../components/charts.jsx';
import { POLICIES, ENTERPRISE_CONNECTORS, fmtNum, fmtTime } from '../lib/data.js';
import { DEPLOYED, UNS_BASE, PLANTDB_URL } from '../shared/index.js';
import { assetSources, sourceSummary } from '../shared/sources.js';
import { ONTOLOGY, REL_LABEL, relationsOf, trace } from '../shared/ontology/index.js';

const TABS = [{ id: 'uns', label: 'UNS ontology' }, { id: 'sources', label: 'Data sources' }, { id: 'skills', label: 'Skills' }, { id: 'docs', label: 'Docs' }, { id: 'connectors', label: 'Connectors' }, { id: 'policies', label: 'Policies' }];

export default function Context({ tab, param }) {
  const { ctx, nav } = useApp();
  return (
    <div className="page">
      <PageHead title="Context" sub={`What the ${ctx.demo.agents.length} agents of ${ctx.demo.company} know and can use. Read only, managed by Faclon.`}><Tag c="line">Read only</Tag></PageHead>
      <Tabs value={tab} onChange={t => nav('context/' + t)} tabs={TABS} />
      {tab === 'uns' && <Uns param={param} />}
      {tab === 'sources' && <Sources sel={param} />}
      {tab === 'skills' && <Skills />}
      {tab === 'docs' && <Docs />}
      {tab === 'connectors' && <Connectors />}
      {tab === 'policies' && <Policies sel={param} />}
    </div>
  );
}

function Uns({ param }) {
  const { ctx, nav, toast } = useApp();
  const tree = useMemo(() => ctx.db.unsTree(), [ctx]);
  const path = param ? decodeURIComponent(param) : ctx.db.unsPath(ctx.db.assetById[ctx.demo.maintenance.spotlight]);
  const [open, setOpen] = useState(() => new Set(path.split('/').map((_, i, a) => a.slice(0, i + 1).join('/'))));
  const node = ctx.db.resolve(path) || tree;
  const go = p => nav('context/uns/' + encodeURIComponent(p));
  const Node = ({ n, p }) => {
    const isOpen = open.has(p); const kids = n.children || [];
    return <div>
      <button className={`tn ${p === path ? 'on' : ''}`} onClick={() => { go(p); setOpen(s => { const x = new Set(s); x.has(p) && p === path ? x.delete(p) : x.add(p); return x; }); }}>
        {kids.length ? (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span style={{ width: 13 }} />}
        <span className="ellipsis">{n.level === 'Work unit' ? <b className="mono" style={{ fontSize: 11.5 }}>{n.asset} </b> : null}{n.label}</span><span className="lv">{n.level}</span></button>
      {kids.length > 0 && isOpen && <div className="tk">{kids.map(k => <Node key={k.name} n={k} p={`${p}/${k.name}`} />)}</div>}
    </div>;
  };
  const isTag = !!node.tag, isAsset = node.level === 'Work unit';
  const h = isTag ? ctx.db.history(node.asset, node.tag, ctx.db.anchor - 7 * 864e5, ctx.db.anchor) : null;
  const health = isAsset || isTag ? ctx.db.health(node.asset) : null;
  return (
    <>
      <div className="row" style={{ gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>{['Enterprise', 'Site', 'Area', 'Work center', 'Work unit', 'Tag'].map((l, i) => <Tag key={l} c={node.level === l ? 'brand' : 'line'}>L{i} · {l}</Tag>)}<span className="muted right" style={{ fontSize: 12 }}>ISA-95 · {ctx.db.stats().tags} tags{DEPLOYED[ctx.demo.id] && <> · UNS <a href={UNS_BASE + DEPLOYED[ctx.demo.id].uns.workspace} target="_blank" rel="noreferrer" className="mono">{DEPLOYED[ctx.demo.id].uns.workspace}</a></>}</span></div>
      <div className="ld">
        <Card title="Namespace" sub={tree.name} flush><div className="tree" style={{ padding: '4px 6px 10px', maxHeight: 560, overflow: 'auto' }}><Node n={tree} p={tree.name} /></div></Card>
        <Card title={node.label} sub={node.level}>
          <div className="row" style={{ marginBottom: 12 }}><code className="mono ellipsis" style={{ background: 'var(--bg-3)', padding: '4px 8px', borderRadius: 6 }}>{path}</code><button className="ibtn" title="Copy path" onClick={() => { navigator.clipboard?.writeText(path); toast('UNS path copied'); }}><Copy /></button></div>
          {isTag && <><div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}><div className="kpi"><div className="l">Latest</div><div className="v">{fmtNum(ctx.db.latest(node.asset, node.tag))}<small>{node.unit}</small></div><div className="f">{fmtTime(ctx.db.anchor)} IST</div></div>
            <div className="kpi"><div className="l">Limits</div><div className="v" style={{ fontSize: 18 }}>{ctx.db.tagDef(node.asset, node.tag).lo ?? '—'} – {ctx.db.tagDef(node.asset, node.tag).hi ?? '—'}</div><div className="f">{node.unit}</div></div>
            <div className="kpi"><div className="l">Asset health</div><div className="v">{health.health}</div><div className="f">{health.state}</div></div></div>
            <Trend data={h.points} series={[{ key: 'v', name: node.label, type: 'area' }]} unit={node.unit} days={7} height={200} /></>}
          {isAsset && <><dl className="kv" style={{ marginBottom: 12 }}><dt>Class</dt><dd>{health.cls}</dd><dt>Criticality</dt><dd>{health.crit}</dd><dt>Health</dt><dd><HealthBar v={health.health} /></dd><dt>Life left</dt><dd>{health.rulDays} days</dd><dt>Finding</dt><dd>{health.finding || '—'}</dd></dl>
            <table className="t"><thead><tr><th>Tag</th><th className="r">Latest</th><th>Unit</th></tr></thead><tbody>{node.children.map(t => <tr key={t.name} className="click" onClick={() => go(`${path}/${t.name}`)}><td><span className="mono">{t.name}</span> <span className="muted">· {t.label}</span></td><td className="r num">{fmtNum(ctx.db.latest(t.asset, t.tag))}</td><td className="muted">{t.unit}</td></tr>)}</tbody></table></>}
          {!isTag && !isAsset && <table className="t"><tbody>{(node.children || []).map(k => <tr key={k.name} className="click" onClick={() => go(`${path}/${k.name}`)}><td className="b">{k.label}</td><td className="muted">{k.level}</td><td className="mono muted">{k.name}</td></tr>)}</tbody></table>}
          {isAsset && <Relations a={node.asset} go={go} />}
          {(isAsset || isTag) && <Binding a={node.asset} tag={isTag ? node.tag : null} />}
          <div className="muted" style={{ fontSize: 11.5, marginTop: 12 }}>MCP: <span className="mono">plantdb.{isTag ? 'get_tag_history' : 'uns_browse'}({'{'} demo: "{ctx.demo.id}", path: "{path}" {'}'})</span></div>
        </Card>
      </div>
    </>
  );
}

function Skills() {
  const { ctx } = useApp();
  const [sel, setSel] = useState(ctx.demo.skills[0]?.id);
  const s = ctx.demo.skills.find(x => x.id === sel) || ctx.demo.skills[0];
  const users = id => ctx.demo.agents.filter(a => a.skills.includes(id)).map(a => a.name);
  return <div className="ld">
    <Card title="Skills" sub={`${ctx.demo.skills.length} used by the configured agents`} flush>
      {ctx.demo.skills.map(x => <button key={x.id} className={`li ${x.id === s.id ? 'on' : ''}`} onClick={() => setSel(x.id)}><span className="grow"><span className="t1" style={{ display: 'block' }}>{x.name}</span><span className="t2">{x.pack} · v{x.ver}</span></span></button>)}
    </Card>
    <Card title={s.name} sub={`${s.pack} · v${s.ver} · id ${s.id}`}>
      <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>{s.steps.map(x => <li key={x}>{x}</li>)}</ol>
      <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>Used by: {users(s.id).join(', ') || '—'}</div>
    </Card>
  </div>;
}

function Docs() {
  const { ctx } = useApp();
  const [q, setQ] = useState(''); const [sel, setSel] = useState(ctx.demo.docs[0].id);
  const list = ctx.demo.docs.filter(d => !q || (d.name + d.obj + d.type + d.pass.map(p => p[0]).join(' ')).toLowerCase().includes(q.toLowerCase()));
  const d = ctx.demo.docs.find(x => x.id === sel) || list[0];
  return <div className="ld">
    <Card title="Indexed documents" sub={`${ctx.demo.docs.length} linked to UNS assets`} flush>
      <div style={{ padding: '0 14px 8px' }}><label className="search" style={{ width: '100%', background: 'var(--bg)' }}><Search size={14} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search manuals, SOPs, RCAs" style={{ border: 0, outline: 0, background: 'transparent', width: '100%' }} /></label></div>
      {list.map(x => <button key={x.id} className={`li ${x.id === d?.id ? 'on' : ''}`} onClick={() => setSel(x.id)}><span className="grow"><span className="t1" style={{ display: 'block' }}>{x.name}</span><span className="t2">{x.type} · {x.obj} · cited {x.cited}×</span></span></button>)}
      {!list.length && <Empty>No documents match.</Empty>}
    </Card>
    {d && <Card title={d.name} sub={`${d.type} · ${d.pages} pages · linked to ${d.obj}`}>
      <div className="muted" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Most cited passages</div>
      {d.pass.map(p => <blockquote key={p[0]} style={{ margin: '0 0 10px', padding: '10px 12px', borderLeft: '3px solid var(--brand)', background: 'var(--bg-2)', borderRadius: '0 6px 6px 0' }}>“{p[0]}”<div className="muted" style={{ fontSize: 11.5 }}>{p[1]}</div></blockquote>)}
    </Card>}
  </div>;
}

function Connectors() {
  const { ctx } = useApp();
  const used = new Set(ctx.demo.agents.flatMap(a => a.tools.map(t => t.split('.')[0])));
  const list = ENTERPRISE_CONNECTORS.filter(c => c.id === 'plantdb' || c.id === 'ot' || used.has(c.id) || (c.id === 'msg' && used.has('msg')));
  const snippet = `{\n  "mcpServers": {\n    "plantdb": {\n      "type": "http",\n      "url": "${PLANTDB_URL}"\n    }\n  }\n}`;
  return <>
    <Card title="Connectors used by the agents" sub="Bruce MCP gateway and I/O Connect" flush>
      <table className="t"><thead><tr><th>Connector</th><th>Type</th><th>System</th><th className="r">Tools</th><th>Access</th><th>Policy</th></tr></thead><tbody>
        {list.map(c => <tr key={c.id}><td className="b">{c.name}</td><td className="muted">{c.kind}</td><td className="muted">{c.system}</td><td className="r num">{c.tools}</td><td><Tag c={c.access === 'Read only' ? '' : c.access === 'Write disabled' ? 'bad' : 'brand'}>{c.access}</Tag></td><td className="mono muted">{c.note}</td></tr>)}
      </tbody></table>
    </Card>
    <div className="grid g2 mt">
      <Card title="plantdb MCP · this demo's database" sub={`one connector, database plantdb/${ctx.demo.id}`}><pre className="code">{snippet}</pre><div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Live on Forge: <a className="mono" href={PLANTDB_URL.replace('/mcp', '/')} target="_blank" rel="noreferrer">{PLANTDB_URL}</a> · pass <span className="mono">demo: "{ctx.demo.id}"</span> on every call</div></Card>
      <Card title="Tools agents can call" sub="from the agent configurations"><div className="chips">{[...new Set(ctx.demo.agents.flatMap(a => a.tools))].map(t => <span key={t} className="tag line mono" style={{ fontSize: 11 }}>{t}</span>)}</div></Card>
    </div>
  </>;
}

function Policies({ sel }) {
  const { ctx, nav } = useApp();
  const [cat, setCat] = useState('All');
  const cats = ['All', ...new Set(POLICIES.map(p => p.cat))];
  const list = POLICIES.filter(p => cat === 'All' || p.cat === cat);
  const p = POLICIES.find(x => x.id === sel) || list[0];
  const cls = { Block: 'bad', Approval: 'brand', 'Draft only': 'warn', 'Role-based': 'info', 'Local only': 'info', Enforced: 'good', Alert: 'warn' };
  const agents = ctx.demo.agents.filter(a => a.policies.includes(p.id)).map(a => a.name);
  return <>
    <div style={{ marginBottom: 12, overflowX: 'auto' }}><Seg value={cat} onChange={setCat} options={cats.map(c => ({ id: c, label: c }))} /></div>
    <div className="ld">
      <Card title="Policy set" sub={`${list.length} shown`} flush>
        {list.map(x => <a key={x.id} href={'#/context/policies/' + x.id} className={`li ${x.id === p.id ? 'on' : ''}`}><span className="mono muted" style={{ width: 38 }}>{x.id}</span><span className="grow"><span className="t1" style={{ display: 'block' }}>{x.name}</span><span className="t2">{x.cat} · {x.scope}</span></span><Tag c={cls[x.mode]}>{x.mode}</Tag></a>)}
      </Card>
      <Card title={`${p.id} · ${p.name}`} sub={p.cat} actions={<Tag c={cls[p.mode]}>{p.mode}</Tag>}>
        <p style={{ marginTop: 0 }}>{p.stmt}</p>
        <dl className="kv" style={{ marginBottom: 12 }}><dt>Applies to</dt><dd>{p.scope}</dd><dt>Approver</dt><dd>{p.approver}</dd><dt>Enforced by</dt><dd>{p.by}</dd><dt>Agents bound</dt><dd>{agents.join(', ') || 'All, by platform rule'}</dd></dl>
        <pre className="code">{p.code}</pre>
      </Card>
    </div>
  </>;
}

/** Where an asset's (or one tag's) data comes from. */
function Binding({ a, tag }) {
  const { ctx, nav } = useApp();
  const src = assetSources(ctx.db, a); if (!src) return null;
  const rows = tag ? src.tags.filter(t => t.tag === tag) : src.tags;
  return <div style={{ marginTop: 16 }}>
    <div className="row" style={{ marginBottom: 6 }}><b style={{ fontSize: 12.5 }}>Data sources</b><span className="muted" style={{ fontSize: 12 }}>· mapped to this node</span><button className="btn sm ghost right" onClick={() => nav('context/sources/' + a)}>Lineage</button></div>
    <div className="scroll-x"><table className="t"><thead><tr><th>Tag</th><th>Source system</th><th>Protocol · address</th><th>Historian</th></tr></thead><tbody>
      {rows.map(t => <tr key={t.tag}><td className="mono">{t.tag}</td><td>{t.system}<div className="muted" style={{ fontSize: 11 }}>{t.system_kind}</div></td><td><span className="muted" style={{ fontSize: 11 }}>{t.via}</span><div className="mono" style={{ fontSize: 11 }}>{t.address}</div></td><td className="mono muted" style={{ fontSize: 11 }}>{t.historian} · {t.sampling}</td></tr>)}
    </tbody></table></div>
    {!tag && <table className="t" style={{ marginTop: 8 }}><tbody>{src.records.map(r => <tr key={r.object}><td className="muted">{r.system}</td><td>{r.object}</td><td className="mono">{r.id}</td></tr>)}</tbody></table>}
  </div>;
}

/** Plant-wide data-source map: source systems → connectivity → historian → UNS → agents and apps. */
function Sources({ sel }) {
  const { ctx, nav } = useApp();
  const sum = useMemo(() => sourceSummary(ctx.db), [ctx]);
  const ot = sum.filter(x => x.tags > 0); const biz = sum.filter(x => !x.tags);
  const asset = ctx.db.assetById[sel] || ctx.db.assetById[ctx.demo.maintenance.spotlight] || ctx.db.assets[0];
  const src = assetSources(ctx.db, asset.id);
  const totalTags = ot.reduce((n, x) => n + x.tags, 0);
  const col = (title, items) => <div className="lin-col"><div className="lin-h">{title}</div>{items}</div>;
  return <>
    <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
      <div className="kpi"><div className="l">Source systems</div><div className="v">{sum.length}</div><div className="f">{ot.length} live OT · {biz.length} business and context</div></div>
      <div className="kpi"><div className="l">Tags mapped</div><div className="v">{totalTags}</div><div className="f">every tag bound to a UNS path</div></div>
      <div className="kpi"><div className="l">Assets mapped</div><div className="v">{ctx.db.assets.length}</div><div className="f">with ERP, CMMS and MES records</div></div>
      <div className="kpi"><div className="l">Sites</div><div className="v">{ctx.db.sites.length}</div><div className="f">{ctx.db.sites.map(x => x.name).join(' · ')}</div></div>
    </div>
    <Card title="Lineage" sub="How plant data reaches the namespace, the agents and the Artefactory">
      <div className="lin">
        {col('Source systems', ot.map(x => <div key={x.key} className="lin-n"><b>{x.name}</b><span>{x.kind} · {x.tags} tags</span></div>))}
        {col('Connectivity', [...new Set(ot.map(x => x.via.split('·')[0].trim()))].map(v => <div key={v} className="lin-n"><b>{v}</b><span>{ot.filter(x => x.via.startsWith(v)).map(x => x.via.split('·')[1]?.trim()).filter(Boolean).filter((y, i, a) => a.indexOf(y) === i).join(', ')}</span></div>))}
        {col('Store', [<div key="h" className="lin-n"><b>{sum.find(x => x.key === 'historian')?.name || 'Historian'}</b><span>History for every tag</span></div>, <div key="u" className="lin-n brand"><b>UNS · ISA-95</b><span>{ctx.demo.company}/{ctx.db.sites.length > 1 ? 'sites' : ctx.demo.siteSlug}/…</span></div>])}
        {col('Context', biz.filter(x => x.key !== 'historian').map(x => <div key={x.key} className="lin-n"><b>{x.name}</b><span>{x.kind} · {x.role}</span></div>))}
        {col('Consumers', [<div key="a" className="lin-n"><b>{ctx.demo.agents.length} Bruce agents</b><span>plantdb MCP · UNS Graph</span></div>, <div key="b" className="lin-n"><b>Artefactory</b><span>dashboards, twins, forms</span></div>, <div key="c" className="lin-n"><b>Copilot</b><span>answers with evidence</span></div>])}
      </div>
    </Card>
    <div className="grid g2 mt">
      <Card title="Source systems" sub="What each system feeds" flush>
        <div className="scroll-x"><table className="t"><thead><tr><th>System</th><th>Kind</th><th>Via</th><th className="r">Tags</th><th className="r">Assets</th></tr></thead><tbody>
          {sum.map(x => <tr key={x.key}><td className="b">{x.name}</td><td className="muted">{x.kind}</td><td className="muted" style={{ fontSize: 12 }}>{x.via}</td><td className="r num">{x.tags || '—'}</td><td className="r num">{x.assets || (x.tags ? '' : x.role)}</td></tr>)}
        </tbody></table></div>
      </Card>
      <Card title={`${asset.id} · ${asset.name}`} sub={src.uns} actions={<select className="inp" style={{ height: 30, width: 180 }} value={asset.id} onChange={e => nav('context/sources/' + e.target.value)}>{ctx.db.assets.map(a => <option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}</select>} flush>
        <div className="scroll-x"><table className="t"><thead><tr><th>Tag</th><th>Source</th><th>Address</th><th>UNS path</th></tr></thead><tbody>
          {src.tags.map(t => <tr key={t.tag}><td><b style={{ fontWeight: 600 }}>{t.name}</b><div className="muted" style={{ fontSize: 11 }}>{t.unit} · {t.sampling}</div></td><td>{t.system}</td><td className="mono" style={{ fontSize: 11 }}>{t.address}</td><td className="mono muted" style={{ fontSize: 10.5 }}>{t.uns}</td></tr>)}
          {src.records.map(r => <tr key={r.object}><td className="muted">{r.object}</td><td>{r.system}</td><td className="mono" style={{ fontSize: 11 }}>{r.id}</td><td className="muted" style={{ fontSize: 11 }}>asset record</td></tr>)}
        </tbody></table></div>
      </Card>
    </div>
  </>;
}

/** Ontology relations of one asset: what it gets from, what it gives to, and confirmed causes. */
function Relations({ a, go }) {
  const { ctx } = useApp();
  if (!ONTOLOGY[ctx.demo.id]) return null;
  const r = relationsOf(ctx.demo.id, a); if (!r.up.length && !r.down.length) return null;
  const up = trace(ctx.demo.id, a, 'up'), down = trace(ctx.demo.id, a, 'down');
  const name = id => ctx.db.assetById[id]?.name || id;
  const open = id => go(ctx.db.unsPath(ctx.db.assetById[id]));
  const st = id => { const h = ctx.db.health(id); return h.state === 'Alarm' ? 'bad' : h.state === 'Watch' ? 'warn' : 'good'; };
  const Chip = ({ id }) => <button className="rel-chip" onClick={() => open(id)} title={name(id)}><span className={`dot-s ${st(id)}`} /><b className="mono">{id}</b></button>;
  const Row = ({ x, dir }) => <tr className="click" onClick={() => open(x.asset)}><td style={{ width: 22 }}><span className={`dot-s ${st(x.asset)}`} /></td><td><b className="mono" style={{ fontSize: 12 }}>{x.asset}</b> <span className="muted">{name(x.asset)}</span></td>
    <td><Tag c={x.rel === 'causes' ? 'bad' : 'line'}>{dir === 'up' ? (x.rel === 'causes' ? 'affects this' : `${REL_LABEL[x.rel]} this`) : REL_LABEL[x.rel]}</Tag></td><td className="muted" style={{ fontSize: 12 }}>{x.note}</td></tr>;
  return <div style={{ marginTop: 16 }}>
    <div className="row" style={{ marginBottom: 6 }}><b style={{ fontSize: 12.5 }}>Relationships</b><span className="muted" style={{ fontSize: 12 }}>· ontology on top of the ISA-95 tree</span></div>
    <div className="rel-flow">
      <div><div className="lin-h">Upstream · {up.length}</div><div className="chips">{up.slice(0, 10).map(x => <Chip key={x.asset} id={x.asset} />)}{!up.length && <span className="muted">source</span>}</div></div>
      <div className="rel-me"><span className={`dot-s ${st(a)}`} /><b className="mono">{a}</b></div>
      <div><div className="lin-h">Downstream · {down.length}</div><div className="chips">{down.slice(0, 12).map(x => <Chip key={x.asset} id={x.asset} />)}{!down.length && <span className="muted">end use</span>}</div></div>
    </div>
    <div className="scroll-x"><table className="t"><tbody>
      {r.up.map(x => <Row key={'u' + x.asset + x.rel} x={x} dir="up" />)}
      {r.down.map(x => <Row key={'d' + x.asset + x.rel} x={x} dir="down" />)}
    </tbody></table></div>
  </div>;
}
