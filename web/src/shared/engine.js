/* ==========================================================================
   Demo data engine.
   Values are generated from a fixed seed, so they never change between runs.
   Timestamps are anchored to "now" (or a fixed demo date), so the data always
   looks current. The same engine feeds the web app and the MCP server.
   ========================================================================== */

export const DAYS = 183;                 // about 6 months
export const HOURS = DAYS * 24;
export const GO_LIVE_DAYS_AGO = 91;      // baseline = first 3 months, then go-live
const H = 3600e3, D = 24 * H;

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const round = (v, d) => { const p = Math.pow(10, d); return Math.round(v * p) / p; };
const decFor = v => (Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 100 ? 1 : Math.abs(v) >= 10 ? 1 : Math.abs(v) >= 1 ? 2 : 3);

/* ---------- database for one demo ---------- */
export function createDB(demo, opts = {}) {
  const anchorMs = Math.floor((opts.anchor ? new Date(opts.anchor).getTime() : Date.now()) / H) * H;
  const cache = new Map();
  const assets = [];
  /* sites: one by default; multi-plant demos give each area a site { slug, name, location } */
  const siteOf = a => a.site || { slug: demo.siteSlug, name: demo.site, location: demo.location };
  const sites = [];
  demo.areas.forEach(a => { const st = siteOf(a); if (!sites.find(x => x.slug === st.slug)) sites.push(st); });
  demo.areas.forEach(a => a.lines.forEach(l => l.assets.forEach(x => assets.push({ id: x[0], name: x[1], cls: x[2], crit: x[3], area: a, line: l, site: siteOf(a) }))));
  const assetById = Object.fromEntries(assets.map(a => [a.id, a]));
  const eventsByAsset = {};
  (demo.events || []).forEach(e => { (eventsByAsset[e.asset] = eventsByAsset[e.asset] || []).push(e); });

  const tsHour = i => anchorMs - (HOURS - 1 - i) * H;
  const tsDay = i => anchorMs - (DAYS - 1 - i) * D;
  const goLiveMs = anchorMs - GO_LIVE_DAYS_AGO * D;

  function tagDef(assetId, tagKey) {
    const a = assetById[assetId]; if (!a) return null;
    const t = (demo.classes[a.cls].tags || []).find(x => x[0] === tagKey);
    return t ? { key: t[0], name: t[1], unit: t[2], base: t[3], noise: t[4], cycle: t[5] || 0, lo: t[6], hi: t[7], src: t[8] || demo.classes[a.cls].src || 'plc' } : null;
  }

  /** hourly series, HOURS points, ending at the anchor hour */
  function series(assetId, tagKey) {
    const k = assetId + '|' + tagKey;
    if (cache.has(k)) return cache.get(k);
    const t = tagDef(assetId, tagKey); if (!t) return null;
    const r = rng(hash(demo.id + k));
    const out = new Float64Array(HOURS);
    let ar = 0;
    for (let i = 0; i < HOURS; i++) {
      const hourOfDay = new Date(tsHour(i)).getHours();
      const dow = new Date(tsHour(i)).getDay();
      ar = ar * 0.8 + (r() - 0.5) * t.noise;
      let v = t.base + ar;
      if (t.cycle) v += t.cycle * Math.sin(((hourOfDay - 6) / 24) * 2 * Math.PI) + (dow === 0 && !demo.continuous ? -Math.abs(t.cycle) * 1.5 : 0);
      if (demo.continuous && t.base >= 0 && v < 0) v = 0;   // 24x7 assets: no weekly stop; power and irradiance never go below zero
      out[i] = v;
    }
    (eventsByAsset[assetId] || []).filter(e => e.tag === tagKey).forEach(e => {
      const start = HOURS - e.startHoursAgo, end = HOURS - (e.endHoursAgo || 0);
      for (let i = Math.max(0, start); i < HOURS; i++) {
        const inWin = i < end;
        const f = Math.min(1, (i - start) / Math.max(1, (e.rampHours || (end - start))));
        if (e.kind === 'ramp' && inWin) out[i] += (e.to - t.base) * Math.pow(f, e.curve || 1.4);
        if (e.kind === 'ramp' && !inWin && e.hold) out[i] += (e.to - t.base);
        if (e.kind === 'step' && inWin) out[i] += (e.to - t.base);
      }
    });
    const d = decFor(t.base);
    for (let i = 0; i < HOURS; i++) out[i] = round(out[i], d);
    cache.set(k, out);
    return out;
  }

  function window(from, to) {
    const f = Math.max(0, Math.ceil((HOURS - 1) - (anchorMs - from) / H));
    const e = Math.min(HOURS - 1, Math.floor((HOURS - 1) - (anchorMs - to) / H));
    return [f, e];
  }

  /** time series between from and to, aggregated: 'hour' | 'day' | 'auto' */
  function history(assetId, tagKey, from = anchorMs - 7 * D, to = anchorMs, agg = 'auto') {
    const s = series(assetId, tagKey); if (!s) return null;
    const [f, e] = window(from, to);
    const span = (e - f) / 24;
    const mode = agg === 'auto' ? (span <= 3 ? 'hour' : span <= 21 ? '4h' : 'day') : agg;
    const step = mode === 'hour' ? 1 : mode === '4h' ? 4 : 24;
    const pts = [];
    for (let i = f; i <= e; i += step) {
      let sum = 0, n = 0, mn = Infinity, mx = -Infinity;
      for (let j = i; j < Math.min(i + step, e + 1); j++) { sum += s[j]; n++; mn = Math.min(mn, s[j]); mx = Math.max(mx, s[j]); }
      const t = tagDef(assetId, tagKey);
      pts.push({ t: tsHour(i), v: round(sum / n, decFor(t.base)), min: mn, max: mx });
    }
    return { asset: assetId, tag: tagKey, unit: tagDef(assetId, tagKey).unit, agg: mode, points: pts };
  }
  const latest = (assetId, tagKey) => { const s = series(assetId, tagKey); return s ? s[HOURS - 1] : null; };
  /** live reading for a UI tick (every 10 s): the latest value plus small seeded movement, stored data unchanged */
  function live(assetId, tagKey, tick = 0) {
    const v = latest(assetId, tagKey); const t = tagDef(assetId, tagKey); if (v == null || !t) return null;
    const r = rng(hash(demo.id + assetId + tagKey + ':' + tick));
    return round(v + (r() - 0.5) * t.noise * 0.6, decFor(t.base));
  }

  /* ---------- KPIs: daily, baseline before go-live, improvement after ---------- */
  function kpiDaily(id) {
    const k = demo.kpis.find(x => x.id === id); if (!k) return null;
    const key = 'kpi|' + id; if (cache.has(key)) return cache.get(key);
    const r = rng(hash(demo.id + key));
    const span = Math.abs(k.cur - k.base) || Math.abs(k.base) * 0.05;
    const out = [];
    const nb = DAYS - GO_LIVE_DAYS_AGO;
    for (let i = 0; i < DAYS; i++) {
      let v;
      if (i < nb) v = k.base + (r() - 0.5) * span * 0.45;
      else { const f = 1 - Math.pow(1 - (i - nb + 1) / GO_LIVE_DAYS_AGO, 1.7); v = k.base + (k.cur - k.base) * f + (r() - 0.5) * span * 0.3; }
      out.push({ t: tsDay(i), v: round(v, k.dec + 1) });
    }
    out[DAYS - 1].v = k.cur;
    cache.set(key, out);
    return out;
  }
  function kpiSummary(id, from, to) {
    const k = demo.kpis.find(x => x.id === id);
    const d = kpiDaily(id);
    const inR = d.filter(p => (!from || p.t >= from) && (!to || p.t <= to));
    const avg = inR.length ? inR.reduce((a, p) => a + p.v, 0) / inR.length : k.cur;
    const improve = k.better === 'up' ? avg - k.base : k.base - avg;
    const prog = Math.max(0, Math.min(1, (avg - k.base) / ((k.target - k.base) || 1)));
    return { ...k, value: round(avg, k.dec), improvePct: round((improve / Math.abs(k.base)) * 100, 1), progress: round(prog, 2),
      status: prog >= 0.999 ? 'On target' : prog >= 0.45 ? 'On track' : 'At risk' };
  }

  /* ---------- production, plan vs actual (daily) ---------- */
  function production(from = anchorMs - 30 * D, to = anchorMs) {
    const r = rng(hash(demo.id + 'prod'));
    const plan = demo.production.planPerDay;
    const all = [];
    for (let i = 0; i < DAYS; i++) {
      const t = tsDay(i); const dow = new Date(t).getDay();
      const p = dow === 0 && !demo.continuous ? Math.round(plan * 0.35) : plan;
      const eff = i < DAYS - GO_LIVE_DAYS_AGO ? 0.9 : 0.9 + 0.06 * Math.min(1, (i - (DAYS - GO_LIVE_DAYS_AGO)) / 60);
      all.push({ t, plan: p, actual: Math.round(p * (eff + (r() - 0.5) * 0.08)) });
    }
    return all.filter(x => x.t >= from - D && x.t <= to);
  }

  /* ---------- asset health ---------- */
  function health(assetId) {
    const a = assetById[assetId]; if (!a) return null;
    const ev = (eventsByAsset[assetId] || []).find(e => e.health != null);
    const r = rng(hash(demo.id + 'health' + assetId));
    const h = ev ? ev.health : Math.round(76 + r() * 20);
    return { id: a.id, name: a.name, cls: demo.classes[a.cls].label, crit: a.crit, site: a.site.name, area: a.area.name, line: a.line.name, health: h,
      state: h < 50 ? 'Alarm' : h < 75 ? 'Watch' : 'Normal', rulDays: ev ? ev.rulDays : Math.round(90 + r() * 120), finding: ev ? ev.finding : null,
      uns: unsPath(a) };
  }
  const healthAll = () => assets.map(a => health(a.id)).sort((x, y) => x.health - y.health);

  /* ---------- UNS (ISA-95 namespace) ---------- */
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  function unsPath(a, tag) {
    return [demo.companySlug, a.site.slug, a.area.id, a.line.id, a.id.toLowerCase()].join('/') + (tag ? '/' + tag : '');
  }
  function unsTree() {
    return { name: demo.companySlug, level: 'Enterprise', label: demo.company, children: sites.map(st => ({ name: st.slug, level: 'Site', label: st.name,
      children: demo.areas.filter(a => siteOf(a).slug === st.slug).map(a => ({ name: a.id, level: 'Area', label: a.name, children: a.lines.map(l => ({ name: l.id, level: 'Work center', label: l.name,
        children: l.assets.map(x => ({ name: x[0].toLowerCase(), level: 'Work unit', label: x[1], asset: x[0],
          children: (demo.classes[x[2]].tags || []).map(t => ({ name: t[0], level: 'Tag', label: t[1], unit: t[2], asset: x[0], tag: t[0] })) })) })) })) })) };
  }
  function resolve(path) {
    const parts = path.replace(/^\/+|\/+$/g, '').split('/');
    let node = unsTree(); if (parts[0] !== node.name) return null;
    for (const p of parts.slice(1)) { node = (node.children || []).find(c => c.name === p); if (!node) return null; }
    return node;
  }

  /* ---------- relative-time content (messages, logs) ---------- */
  const nowMs = opts.anchor ? anchorMs + 14.5 * 60e3 : Date.now();
  const at = minutesAgo => nowMs - minutesAgo * 60e3;

  return {
    demo, anchor: anchorMs, now: nowMs, goLive: goLiveMs, baselineFrom: tsDay(0), baselineTo: goLiveMs - D,
    assets, assetById, sites, tagDef, series, history, latest, live, kpiDaily, kpiSummary, production, health, healthAll,
    unsPath, unsTree, resolve, slug, at, tsDay, tsHour,
    stats: () => ({ assets: assets.length, tags: assets.reduce((n, a) => n + demo.classes[a.cls].tags.length, 0), hours: HOURS, days: DAYS,
      points: assets.reduce((n, a) => n + demo.classes[a.cls].tags.length, 0) * HOURS }),
  };
}
