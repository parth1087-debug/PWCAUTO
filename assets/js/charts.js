/* Lightweight SVG charts. Colours come from CSS variables, so theme switching needs no redraw. */
const Charts = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const fmt = (v, d = 1) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-IN') : (+v).toFixed(d).replace(/\.0+$/, ''));

  function niceScale(min, max, ticks = 4) {
    if (min === max) { max = min + 1; }
    const span = max - min;
    const step0 = span / ticks;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(6));
    const dec = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return { lo, hi, ticks: out, dec };
  }

  function mount(el, h) {
    el.innerHTML = '';
    el.classList.add('chart');
    const w = Math.max(el.clientWidth || 600, 200);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('height', h);
    el.appendChild(svg);
    const tip = document.createElement('div');
    tip.className = 'tip';
    el.appendChild(tip);
    return { svg, w, tip };
  }
  const add = (svg, html) => svg.insertAdjacentHTML('beforeend', html);

  /* ---------- Line / area chart ---------- */
  function line(el, o) {
    const h = o.height || 220;
    const { svg, w, tip } = mount(el, h);
    const pad = { l: o.padL || 40, r: o.padR || 12, t: 12, b: 24 };
    const all = o.series.flatMap(s => s.data).concat((o.thresholds || []).map(t => t.value));
    let mn = o.yMin != null ? o.yMin : Math.min(...all);
    let mx = o.yMax != null ? o.yMax : Math.max(...all);
    if (o.yMin == null) mn = mn - (mx - mn) * 0.08;
    const sc = niceScale(mn, mx, o.ticks || 4);
    const n = o.labels.length;
    const x = i => pad.l + (i * (w - pad.l - pad.r)) / Math.max(n - 1, 1);
    const y = v => pad.t + (1 - (v - sc.lo) / (sc.hi - sc.lo)) * (h - pad.t - pad.b);

    (o.bands || []).forEach(b => {
      const y1 = y(Math.min(b.to, sc.hi)), y2 = y(Math.max(b.from, sc.lo));
      add(svg, `<rect x="${pad.l}" y="${y1}" width="${w - pad.l - pad.r}" height="${Math.max(0, y2 - y1)}" style="fill:${b.color};opacity:${b.opacity || 0.08}"/>`);
      if (b.label) add(svg, `<text x="${pad.l + 4}" y="${y1 + 11}" text-anchor="start" style="fill:${b.color};opacity:.9">${b.label}</text>`);
    });
    (o.xBands || []).forEach(b => {
      add(svg, `<rect x="${x(b.from)}" y="${pad.t}" width="${x(b.to) - x(b.from)}" height="${h - pad.t - pad.b}" style="fill:${b.color};opacity:${b.opacity || 0.07}"/>`);
      if (b.label) add(svg, `<text x="${(x(b.from) + x(b.to)) / 2}" y="${pad.t + 10}" text-anchor="middle" style="fill:${b.color}">${b.label}</text>`);
    });
    sc.ticks.forEach(t => {
      add(svg, `<line class="gridline" x1="${pad.l}" x2="${w - pad.r}" y1="${y(t)}" y2="${y(t)}"/>`);
      add(svg, `<text x="${pad.l - 6}" y="${y(t) + 3}" text-anchor="end">${Math.abs(t) >= 1000 ? fmt(t) : t.toFixed(sc.dec)}</text>`);
    });
    const every = Math.ceil(n / (o.xTicks || Math.max(2, Math.floor((w - pad.l) / 70))));
    o.labels.forEach((l, i) => { if (i % every === 0 || i === n - 1 && n < 14) add(svg, `<text x="${x(i)}" y="${h - 6}" text-anchor="middle">${l}</text>`); });

    (o.thresholds || []).forEach(t => {
      add(svg, `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(t.value)}" y2="${y(t.value)}" style="stroke:${t.color || 'var(--bad)'};stroke-dasharray:4 3;stroke-width:1.2"/>`);
      add(svg, `<text x="${pad.l + 4}" y="${y(t.value) - 4}" style="fill:${t.color || 'var(--bad)'}">${t.label}</text>`);
    });

    o.series.forEach((s, si) => {
      const pts = s.data.map((v, i) => [x(i), y(v)]);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      if (s.area || (o.area && si === 0)) {
        add(svg, `<path d="${d} L${pts[pts.length - 1][0]} ${y(sc.lo)} L${pts[0][0]} ${y(sc.lo)} Z" style="fill:${s.color};opacity:.10"/>`);
      }
      add(svg, `<path d="${d}" style="fill:none;stroke:${s.color};stroke-width:${s.width || 1.8};${s.dash ? 'stroke-dasharray:' + s.dash : ''}" stroke-linejoin="round"/>`);
      (s.marks || []).forEach(i => add(svg, `<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="3.5" style="fill:var(--surface);stroke:var(--bad);stroke-width:2"/>`));
    });

    (o.annotations || []).forEach(a => {
      add(svg, `<line x1="${x(a.i)}" x2="${x(a.i)}" y1="${pad.t}" y2="${h - pad.b}" style="stroke:var(--primary);stroke-width:1;stroke-dasharray:2 2"/>`);
      add(svg, `<text x="${x(a.i) + 4}" y="${pad.t + 10}" style="fill:var(--primary)">${a.label}</text>`);
    });

    const guide = document.createElementNS(NS, 'line');
    guide.setAttribute('y1', pad.t); guide.setAttribute('y2', h - pad.b);
    guide.setAttribute('style', 'stroke:var(--border-strong);stroke-width:1;display:none');
    svg.appendChild(guide);
    svg.addEventListener('mousemove', e => {
      const r = svg.getBoundingClientRect();
      const px = (e.clientX - r.left) * (w / r.width);
      const i = Math.max(0, Math.min(n - 1, Math.round(((px - pad.l) / (w - pad.l - pad.r)) * (n - 1))));
      guide.setAttribute('x1', x(i)); guide.setAttribute('x2', x(i)); guide.style.display = '';
      tip.innerHTML = `<b>${o.labels[i]}</b>` + o.series.map(s => `<div class="row"><span class="sw" style="background:${s.color}"></span>${s.name}: <b>${fmt(s.data[i], o.dec ?? 1)}${o.unit || ''}</b></div>`).join('');
      tip.style.display = 'block';
      tip.style.left = (x(i) / w) * r.width + 'px';
      tip.style.top = Math.min(...o.series.map(s => y(s.data[i]))) / h * r.height + 'px';
    });
    svg.addEventListener('mouseleave', () => { guide.style.display = 'none'; tip.style.display = 'none'; });
  }

  /* ---------- Vertical bars (grouped or stacked) ---------- */
  function bars(el, o) {
    const h = o.height || 220;
    const { svg, w, tip } = mount(el, h);
    const pad = { l: o.padL || 40, r: 10, t: 12, b: 24 };
    const n = o.labels.length;
    const totals = o.labels.map((_, i) => o.stacked ? o.series.reduce((a, s) => a + s.data[i], 0) : Math.max(...o.series.map(s => s.data[i])));
    const sc = niceScale(o.yMin ?? 0, Math.max(...totals, ...(o.thresholds || []).map(t => t.value)), 4);
    const y = v => pad.t + (1 - (v - sc.lo) / (sc.hi - sc.lo)) * (h - pad.t - pad.b);
    const bw = (w - pad.l - pad.r) / n;
    sc.ticks.forEach(t => {
      add(svg, `<line class="gridline" x1="${pad.l}" x2="${w - pad.r}" y1="${y(t)}" y2="${y(t)}"/>`);
      add(svg, `<text x="${pad.l - 6}" y="${y(t) + 3}" text-anchor="end">${Math.abs(t) >= 1000 ? fmt(t) : t.toFixed(sc.dec)}</text>`);
    });
    o.labels.forEach((l, i) => {
      const cx = pad.l + bw * i + bw / 2;
      add(svg, `<text x="${cx}" y="${h - 6}" text-anchor="middle">${l}</text>`);
      const inner = bw * (o.barWidth || 0.62);
      let acc = 0;
      o.series.forEach((s, si) => {
        const v = s.data[i];
        let bx, by, bh, bwid;
        if (o.stacked) { bwid = inner; bx = cx - inner / 2; by = y(acc + v); bh = y(acc) - y(acc + v); acc += v; }
        else { bwid = inner / o.series.length; bx = cx - inner / 2 + si * bwid; by = y(v); bh = y(sc.lo) - y(v); }
        const col = (s.colorFn && s.colorFn(v, i)) || s.color;
        add(svg, `<rect data-i="${i}" x="${bx + (o.stacked ? 0 : 1)}" y="${by}" width="${Math.max(1, bwid - (o.stacked ? 0 : 2))}" height="${Math.max(0, bh)}" rx="1.5" style="fill:${col}"/>`);
      });
      if (o.valueLabels) add(svg, `<text x="${cx}" y="${y(totals[i]) - 4}" text-anchor="middle" style="fill:var(--text-2)">${fmt(totals[i], o.dec ?? 1)}</text>`);
    });
    (o.thresholds || []).forEach(t => {
      add(svg, `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(t.value)}" y2="${y(t.value)}" style="stroke:${t.color || 'var(--bad)'};stroke-dasharray:4 3;stroke-width:1.2"/>`);
      add(svg, `<text x="${w - pad.r}" y="${y(t.value) - 4}" text-anchor="end" style="fill:${t.color || 'var(--bad)'}">${t.label}</text>`);
    });
    svg.addEventListener('mousemove', e => {
      const r = svg.getBoundingClientRect();
      const px = (e.clientX - r.left) * (w / r.width);
      const i = Math.floor((px - pad.l) / bw);
      if (i < 0 || i >= n) { tip.style.display = 'none'; return; }
      tip.innerHTML = `<b>${o.labels[i]}</b>` + o.series.map(s => `<div class="row"><span class="sw" style="background:${s.color}"></span>${s.name}: <b>${fmt(s.data[i], o.dec ?? 1)}${o.unit || ''}</b></div>`).join('');
      tip.style.display = 'block';
      tip.style.left = ((pad.l + bw * i + bw / 2) / w) * r.width + 'px';
      tip.style.top = (y(totals[i]) / h) * r.height + 'px';
    });
    svg.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  }

  /* ---------- Horizontal bars ---------- */
  function hbars(el, o) {
    const rowH = o.rowH || 26;
    const h = o.items.length * rowH + 8;
    const { svg, w } = mount(el, h);
    const lw = o.labelW || 150, vw = 70;
    const mx = o.max || Math.max(...o.items.map(i => i.value));
    o.items.forEach((it, i) => {
      const yy = i * rowH + 4;
      const bw = ((w - lw - vw) * it.value) / mx;
      add(svg, `<text x="0" y="${yy + rowH / 2 + 1}" style="fill:var(--text-2);font-size:11px">${it.label}</text>`);
      add(svg, `<rect x="${lw}" y="${yy + 5}" width="${w - lw - vw}" height="${rowH - 12}" rx="2" style="fill:var(--surface-3)"/>`);
      add(svg, `<rect x="${lw}" y="${yy + 5}" width="${Math.max(2, bw)}" height="${rowH - 12}" rx="2" style="fill:${it.color || o.color || 'var(--c1)'}"/>`);
      add(svg, `<text x="${w}" y="${yy + rowH / 2 + 1}" text-anchor="end" style="fill:var(--text);font-size:11px">${it.display ?? fmt(it.value)}</text>`);
    });
  }

  /* ---------- Waterfall (cost bridge) ---------- */
  function waterfall(el, o) {
    const h = o.height || 230;
    const { svg, w } = mount(el, h);
    const pad = { l: 40, r: 10, t: 16, b: 34 };
    let run = o.start;
    const steps = [{ label: o.startLabel, from: 0, to: o.start, kind: 'total' }];
    o.steps.forEach(s => { steps.push({ label: s.label, from: run, to: run + s.value, kind: s.value >= 0 ? 'up' : 'down', v: s.value }); run += s.value; });
    steps.push({ label: o.endLabel, from: 0, to: run, kind: 'total' });
    const vals = steps.flatMap(s => [s.from, s.to]);
    const sc = niceScale(o.yMin ?? Math.min(...vals) * 0.9, Math.max(...vals) * 1.02, 4);
    const y = v => pad.t + (1 - (v - sc.lo) / (sc.hi - sc.lo)) * (h - pad.t - pad.b);
    const bw = (w - pad.l - pad.r) / steps.length;
    sc.ticks.forEach(t => {
      add(svg, `<line class="gridline" x1="${pad.l}" x2="${w - pad.r}" y1="${y(t)}" y2="${y(t)}"/>`);
      add(svg, `<text x="${pad.l - 6}" y="${y(t) + 3}" text-anchor="end">${Math.abs(t) >= 1000 ? fmt(t) : t.toFixed(sc.dec)}</text>`);
    });
    steps.forEach((s, i) => {
      const x0 = pad.l + i * bw + bw * 0.18, ww = bw * 0.64;
      const lo = Math.max(Math.min(s.from, s.to), sc.lo), hi = Math.max(s.from, s.to);
      const col = s.kind === 'total' ? 'var(--c2)' : s.kind === 'up' ? (o.upBad ? 'var(--bad)' : 'var(--good)') : (o.upBad ? 'var(--good)' : 'var(--bad)');
      add(svg, `<rect x="${x0}" y="${y(hi)}" width="${ww}" height="${Math.max(1, y(lo) - y(hi))}" rx="1.5" style="fill:${col}"/>`);
      const lab = s.kind === 'total' ? fmt(s.to, 1) : (s.v > 0 ? '+' : '') + fmt(s.v, 1);
      add(svg, `<text x="${x0 + ww / 2}" y="${y(hi) - 4}" text-anchor="middle" style="fill:var(--text-2)">${lab}</text>`);
      const words = s.label.split(' ');
      add(svg, `<text x="${x0 + ww / 2}" y="${h - 20}" text-anchor="middle">${words[0]}</text>`);
      if (words[1]) add(svg, `<text x="${x0 + ww / 2}" y="${h - 8}" text-anchor="middle">${words.slice(1).join(' ')}</text>`);
      if (i < steps.length - 1) add(svg, `<line x1="${x0 + ww}" x2="${x0 + bw}" y1="${y(s.to)}" y2="${y(s.to)}" style="stroke:var(--border-strong);stroke-dasharray:2 2"/>`);
    });
  }

  /* ---------- Donut ---------- */
  function donut(el, o) {
    const size = o.size || 170;
    el.innerHTML = '';
    el.classList.add('chart');
    const total = o.items.reduce((a, b) => a + b.value, 0);
    const r = size / 2 - 10, c = size / 2, sw = o.stroke || 22;
    let a0 = -Math.PI / 2;
    let paths = '';
    o.items.forEach(it => {
      const a1 = a0 + (it.value / total) * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      paths += `<path d="M${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}" style="fill:none;stroke:${it.color};stroke-width:${sw}"/>`;
      a0 = a1;
    });
    const legend = o.items.map(it => `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:12px"><span style="width:10px;height:10px;border-radius:2px;background:${it.color}"></span><span style="color:var(--text-2)">${it.label}</span><span class="num" style="margin-left:auto">${it.display ?? fmt(it.value)}</span><span class="num muted" style="width:40px;text-align:right">${Math.round((it.value / total) * 100)}%</span></div>`).join('');
    el.innerHTML = `<div style="display:flex;gap:20px;align-items:center">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex:none;width:${size}px;height:${size}px">${paths}
        <text x="${c}" y="${c - 2}" text-anchor="middle" style="font-size:20px;fill:var(--text);font-weight:300">${o.center}</text>
        <text x="${c}" y="${c + 15}" text-anchor="middle" style="font-size:10px;fill:var(--muted)">${o.centerSub || ''}</text></svg>
      <div style="flex:1;min-width:0">${legend}</div></div>`;
  }

  /* ---------- Heatmap ---------- */
  function heatmap(el, o) {
    const rows = o.rows.length, cols = o.cols.length;
    const cellH = o.cellH || 22;
    const h = rows * cellH + 22;
    const { svg, w, tip } = mount(el, h);
    const lw = o.labelW || 40;
    const cw = (w - lw) / cols;
    const flat = o.values.flat();
    const mn = Math.min(...flat), mx = Math.max(...flat);
    o.values.forEach((row, ri) => {
      add(svg, `<text x="0" y="${ri * cellH + cellH / 2 + 4}">${o.rows[ri]}</text>`);
      row.forEach((v, ci) => {
        const t = (v - mn) / (mx - mn || 1);
        add(svg, `<rect data-r="${ri}" data-c="${ci}" x="${lw + ci * cw + 1}" y="${ri * cellH + 1}" width="${cw - 2}" height="${cellH - 2}" rx="2" style="fill:var(--c1);opacity:${(0.08 + t * 0.92).toFixed(2)}"/>`);
      });
    });
    o.cols.forEach((c, ci) => { if (ci % (o.colEvery || 3) === 0) add(svg, `<text x="${lw + ci * cw + cw / 2}" y="${h - 6}" text-anchor="middle">${c}</text>`); });
    svg.addEventListener('mousemove', e => {
      const t = e.target;
      if (t.dataset && t.dataset.r != null) {
        const r = svg.getBoundingClientRect();
        const ri = +t.dataset.r, ci = +t.dataset.c;
        tip.innerHTML = `<b>${o.rows[ri]} ${o.cols[ci]}</b><div>${fmt(o.values[ri][ci], 0)} ${o.unit || ''}</div>`;
        tip.style.display = 'block';
        tip.style.left = ((lw + ci * cw + cw / 2) / w) * r.width + 'px';
        tip.style.top = ((ri * cellH) / h) * r.height + 'px';
      } else tip.style.display = 'none';
    });
    svg.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
  }

  /* ---------- Sparkline ---------- */
  function spark(data, color = 'var(--c1)', w = 120, h = 22) {
    const mn = Math.min(...data), mx = Math.max(...data);
    const pts = data.map((v, i) => `${(i * w) / (data.length - 1)},${h - 2 - ((v - mn) / (mx - mn || 1)) * (h - 4)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block"><polyline points="${pts}" style="fill:none;stroke:${color};stroke-width:1.5" vector-effect="non-scaling-stroke"/></svg>`;
  }

  /* ---------- Health ring ---------- */
  function ring(pct, size = 64) {
    const r = size / 2 - 5, c = 2 * Math.PI * r;
    const col = pct >= 75 ? 'var(--good)' : pct >= 50 ? 'var(--warn)' : 'var(--bad)';
    return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" style="fill:none;stroke:var(--surface-3);stroke-width:6"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" style="fill:none;stroke:${col};stroke-width:6;stroke-linecap:round" stroke-dasharray="${(c * pct) / 100} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle" style="font-size:15px;fill:var(--text);font-family:var(--font)">${pct}</text></svg>`;
  }

  return { line, bars, hbars, waterfall, donut, heatmap, spark, ring, fmt };
})();
