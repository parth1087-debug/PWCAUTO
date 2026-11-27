/* Client for the plant app database on the server (artefacts, forms, setpoints, data sources).
   When the server is not reachable (offline single-file build), callers fall back to local state. */
import { LIVE_BASE } from './live.js';

async function req(path, opts = {}) {
  const r = await fetch(LIVE_BASE + path, { cache: 'no-store', ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  let body = null; try { body = await r.json(); } catch { /* empty */ }
  if (!r.ok) throw Object.assign(new Error(body?.error || `Server answered ${r.status}`), { status: r.status });
  return body;
}
const post = (path, v) => req(path, { method: 'POST', body: JSON.stringify(v) });

export const api = {
  listArtefacts: () => req('/api/artefacts'),
  createArtefact: a => post('/api/artefacts', a),
  addVersion: (id, v) => post(`/api/artefacts/${id}/versions`, v),
  archive: (id, by) => post(`/api/artefacts/${id}/archive`, { by }),
  submit: (id, values, by) => post(`/api/artefacts/${id}/submissions`, { values, by }),
  submissions: id => req(`/api/artefacts/${id}/submissions`),
  setpoints: demo => req(`/api/setpoints?demo=${encodeURIComponent(demo)}`),
  decide: v => post('/api/setpoints', v),
};
