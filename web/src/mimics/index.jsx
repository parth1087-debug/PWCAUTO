/* Mimic registry: id → drawing component. Metadata (names, levels) lives in shared/mimics.js. */
import React from 'react';
import { Card, Empty, Tag } from '../components/ui.jsx';
import { MIMICS } from '../shared/mimics.js';
import auto from './auto.jsx';
import cement from './cement.jsx';
import steel from './steel.jsx';
import pharma from './pharma.jsx';
import solar from './solar.jsx';
import wind from './wind.jsx';
import ems from './ems.jsx';
import emsUtil from './ems-utilities.jsx';
import pipes from './pipes.jsx';
import powerUnit from './power-unit.jsx';
import powerOps from './power-ops.jsx';

export const DRAWINGS = { ...auto, ...cement, ...steel, ...pharma, ...solar, ...wind, ...ems, ...emsUtil, ...pipes, ...powerUnit, ...powerOps };

/** Body of a mimic artefact: spec { view: 'mimic', mimic: '<id>' }. */
export function MimicView({ c, id }) {
  const meta = (MIMICS[c.demo.id] || []).find(m => m.id === id) || Object.values(MIMICS).flat().find(m => m.id === id);
  const Draw = DRAWINGS[id];
  if (!Draw) return <Card><Empty>The drawing “{id}” is not available yet.</Empty></Card>;
  return <div>
    {meta && <div className="mimic-head"><Tag c="line">{meta.level} · {meta.level === 'L1' ? 'area overview' : meta.level === 'L2' ? 'process unit' : 'equipment'}</Tag><span className="muted" style={{ fontSize: 12.5 }}>{meta.desc}</span></div>}
    <Draw c={c} />
  </div>;
}
