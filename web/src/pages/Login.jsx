import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState('');
  return (
    <div className="login">
      <form onSubmit={e => { e.preventDefault(); if (!onLogin(u.trim(), p)) setErr('Wrong username or password.'); }}>
        <div className="logo" style={{ padding: 0 }}><span className="wm">pwc</span><small><b>Connected Plant</b><br />Intelligence</small></div>
        <h1>Sign in</h1>
        <div className="muted" style={{ fontSize: 13 }}>One login for every demo. Switch users after you sign in.</div>
        <label htmlFor="u">Username</label><input id="u" className="inp" value={u} onChange={e => setU(e.target.value)} autoComplete="username" autoFocus />
        <label htmlFor="p">Password</label><input id="p" className="inp" type="password" value={p} onChange={e => setP(e.target.value)} autoComplete="current-password" />
        {err && <div className="err" role="alert">{err}</div>}
        <button className="btn pri" style={{ width: '100%', justifyContent: 'center', height: 38, marginTop: 18 }}>Sign in</button>
        <div className="muted" style={{ fontSize: 11.5, marginTop: 16 }}>AI agents powered by Faclon Labs</div>
      </form>
    </div>
  );
}
