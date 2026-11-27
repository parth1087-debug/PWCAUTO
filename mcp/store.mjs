/**
 * Plant app database: artefacts (with versions), form submissions and setpoint decisions.
 * A JSON document store on disk (DATA_DIR, default ./data), written atomically.
 * Each demo is seeded once from the shared catalogue; later edits are never overwritten.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DEMOS } from '../web/src/shared/index.js';
import { seedAll, normaliseArtefact } from '../web/src/shared/artefacts.js';

const DIR = process.env.DATA_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const FILE = path.join(DIR, 'plant-app.json');
const id = p => `${p}-${crypto.randomBytes(5).toString('hex')}`;

let db = { version: 1, artefacts: [], submissions: [], decisions: [], seeded: [] };
let timer = null;

function load() {
  try { db = { ...db, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch { /* first start */ }
  /* seed by artefact id: new catalogue items reach existing databases; an item removed by a user is never re-added */
  db.seededIds = db.seededIds || db.artefacts.map(a => a.id);
  const seeds = seedAll(DEMOS);
  /* catalogue items nobody has edited (same top version as the seed) follow catalogue updates */
  let refreshed = 0;
  for (const x of seeds) {
    const a = db.artefacts.find(y => y.id === x.id);
    if (a && !a.archived && a.versions[0]?.v === x.versions[0].v && a.versions[0]?.by === x.versions[0].by && JSON.stringify(a.spec) !== JSON.stringify(x.spec)) { a.spec = x.spec; a.name = x.name; refreshed++; }
  }
  if (refreshed) flush();
  const fresh = seeds.filter(x => !db.seededIds.includes(x.id) && !db.artefacts.find(a => a.id === x.id));
  if (fresh.length || Object.keys(DEMOS).some(d => !db.seeded.includes(d))) {
    db.artefacts.push(...fresh); db.seededIds.push(...fresh.map(x => x.id));
    db.seeded = [...new Set([...db.seeded, ...Object.keys(DEMOS)])];
    flush();
  }
}
function flush() {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, FILE);
  } catch (e) { console.error('store: could not write', e.message); }
}
const save = () => { clearTimeout(timer); timer = setTimeout(flush, 150); };
load();

export const storeInfo = () => ({ file: FILE, artefacts: db.artefacts.length, submissions: db.submissions.length, decisions: db.decisions.length });

export function listArtefacts({ demo, type } = {}) {
  return db.artefacts.filter(a => !a.archived && (!demo || a.demo === demo) && (!type || a.type === type));
}
export const getArtefact = aid => db.artefacts.find(a => a.id === aid) || null;

export function createArtefact({ id: wantId, demo, type, name, spec, owner, by, note }) {
  const d = DEMOS[demo]; if (!d) throw new Error(`unknown demo ${demo}`);
  const n = normaliseArtefact({ type, name, spec }, d); if (!n.ok) throw new Error(n.error);
  const aid = typeof wantId === 'string' && /^a-[a-z0-9]{6,20}$/.test(wantId) && !getArtefact(wantId) ? wantId : id('a');
  const a = { id: aid, ...n.value, demo, owner: owner || 'master', shared: ['master'], created: Date.now(),
    versions: [{ v: 1, by: by || 'Copilot', when: Date.now(), note: note || 'Created' }] };
  db.artefacts.unshift(a); save();
  return a;
}

export function addVersion(aid, { name, spec, note, by }) {
  const a = getArtefact(aid); if (!a) throw new Error('artefact not found');
  if (spec || name) {
    const n = normaliseArtefact({ type: a.type === 'dash' ? 'dashboard' : a.type, name: name || a.name, spec: spec || a.spec }, DEMOS[a.demo]);
    if (!n.ok) throw new Error(n.error);
    a.name = n.value.name; a.spec = n.value.spec;
  }
  a.versions.unshift({ v: a.versions[0].v + 1, by: by || 'Copilot', when: Date.now(), note: note || 'Updated' });
  save();
  return a;
}

export function archiveArtefact(aid, by) {
  const a = getArtefact(aid); if (!a) throw new Error('artefact not found');
  a.archived = { by: by || 'user', when: Date.now() }; save();
  return { id: aid, archived: true };
}

export function submitForm(aid, { values, by }) {
  const a = getArtefact(aid); if (!a || a.type !== 'form') throw new Error('form not found');
  if (!values || typeof values !== 'object') throw new Error('values must be an object');
  const s = { id: id('sub'), artefact: aid, demo: a.demo, values, by: by || 'user', at: Date.now(), ref: `${a.demo.toUpperCase()}-${String(db.submissions.filter(x => x.artefact === aid).length + 1).padStart(4, '0')}` };
  db.submissions.unshift(s); db.submissions = db.submissions.slice(0, 5000); save();
  return s;
}
export const listSubmissions = aid => db.submissions.filter(s => s.artefact === aid);

export function decideSetpoint({ demo, asset, tag, status, by, note }) {
  if (!DEMOS[demo]) throw new Error(`unknown demo ${demo}`);
  if (!['approved', 'rejected', 'applied', 'proposed'].includes(status)) throw new Error('status must be approved, rejected, applied or proposed');
  const d = { id: id('sp'), demo, asset, tag, status, by: by || 'user', note: note || '', at: Date.now() };
  db.decisions.unshift(d); save();
  return d;
}
export function setpointsFor(demo) {
  const d = DEMOS[demo]; if (!d) throw new Error(`unknown demo ${demo}`);
  return (d.setpoints || []).map(s => { const last = db.decisions.find(x => x.demo === demo && x.asset === s.asset && x.tag === s.tag); return { ...s, status: last ? last.status : s.status || 'proposed', decided: last || null }; });
}
