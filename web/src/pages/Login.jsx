import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Activity, Bot, Gauge, LockKeyhole } from 'lucide-react';

export default function Login({ onLogin }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('');
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false);
  const submit = e => {
    e.preventDefault(); setErr(''); setBusy(true);
    setTimeout(() => { if (!onLogin(u.trim(), p)) { setErr('That username and password do not match. Check them and try again.'); setBusy(false); } }, 350);
  };
  return (
    <div className="auth">
      <section className="auth-l" aria-hidden="false">
        <div className="logo" style={{ padding: 0 }}><span className="wm">pwc</span><small style={{ borderColor: 'rgba(255,255,255,.15)', color: '#aab2c0' }}><b style={{ color: '#fff' }}>Connected Plant</b><br />Intelligence</small></div>
        <h1>Every machine, KPI and decision, <span>in one intelligent plant.</span></h1>
        <p className="lead">Asset health, cost conversion, AI vision quality and energy, connected through one plant model and run by AI agents your teams can trust.</p>
        <div className="auth-feats">
          <div><b><Activity size={14} style={{ verticalAlign: -2, marginRight: 6, color: '#ff8540' }} />Live plant model</b>ISA-95 namespace across every line, asset and tag.</div>
          <div><b><Bot size={14} style={{ verticalAlign: -2, marginRight: 6, color: '#ff8540' }} />Agents on Bruce</b>Copilot answers with evidence, drafts actions for approval.</div>
          <div><b><Gauge size={14} style={{ verticalAlign: -2, marginRight: 6, color: '#ff8540' }} />Value against baseline</b>Every KPI tracked from go-live, in ₹ per year.</div>
          <div><b><ShieldCheck size={14} style={{ verticalAlign: -2, marginRight: 6, color: '#ff8540' }} />Governed by policy</b>No writes to control systems. Full audit trail.</div>
        </div>
        <div className="auth-foot"><span>© PwC. All rights reserved.</span><span>AI agents powered by Faclon Labs</span><span>Demo environment · sample data</span></div>
      </section>
      <section className="auth-r">
        <form onSubmit={submit} className="auth-card" noValidate>
          <h2>Sign in</h2>
          <div className="muted" style={{ fontSize: 13.5 }}>One login for every demo. Switch users after you sign in.</div>
          <label htmlFor="u">Username</label>
          <input id="u" className="inp" value={u} onChange={e => setU(e.target.value)} autoComplete="username" autoFocus required aria-invalid={!!err} />
          <label htmlFor="p">Password</label>
          <div style={{ position: 'relative' }}>
            <input id="p" className="inp" type={show ? 'text' : 'password'} value={p} onChange={e => setP(e.target.value)} autoComplete="current-password" required aria-invalid={!!err} style={{ paddingRight: 40 }} />
            <button type="button" className="ibtn" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 4, top: 4, width: 34, height: 34 }}>{show ? <EyeOff /> : <Eye />}</button>
          </div>
          {err && <div className="err" role="alert">{err}</div>}
          <button className="btn pri" disabled={busy || !u || !p} style={{ width: '100%', justifyContent: 'center', marginTop: 22 }}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <div className="row muted" style={{ fontSize: 12, marginTop: 18, gap: 6 }}><LockKeyhole size={13} />Secure session · data stays in your tenant</div>
        </form>
      </section>
    </div>
  );
}
