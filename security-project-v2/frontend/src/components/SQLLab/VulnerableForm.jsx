import { useState } from 'react';
import client from '../../api/client';
import QueryVisualizer from './QueryVisualizer';

const PAYLOADS = [
  { label: "Always True",  value: "' OR '1'='1" },
  { label: "Login Bypass", value: "admin'--" },
  { label: "UNION Attack",  value: "' UNION SELECT 1,data_key,data_value,4,5,6,7 FROM secret_data--" },
  { label: "Time-based",   value: "' AND SLEEP(3)--" },
  { label: "Destructive",  value: "'; DROP TABLE users;--" },
];

export default function VulnerableForm() {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [q, setQ] = useState('');
  const [lr, setLr] = useState(null); const [sr, setSr] = useState(null);
  const [loading, setL] = useState(false); const [alert, setAlert] = useState(false);

  const login = async (e) => {
    e.preventDefault(); setL(true); setAlert(false);
    try {
      const { data } = await client.post('/auth/login-vulnerable', { username: u, password: p });
      setLr({ ok: true, data });
      if (data.sqli_detected || u.includes("'")) setAlert(true);
    } catch (err) { setLr({ ok: false, error: err.response?.data }); }
    setL(false);
  };

  const search = async (e) => {
    e.preventDefault(); setL(true);
    try {
      const { data } = await client.get('/sqli/search-vulnerable', { params: { q } });
      setSr(data); if (data.sqli_detected) setAlert(true);
    } catch (err) { setSr({ error: err.response?.data?.sql_error, query_used: err.response?.data?.query_used }); }
    setL(false);
  };

  const secretExposed = sr?.results?.some(r => r.category === 'Secret');

  return (
    <div className="space-y-5">
      {alert && <div className="warning-banner animate-slide-in"><span className="pulse-dot" style={{ marginRight: 4 }} /><strong>⚠️ SQLi DÉTECTÉE</strong> — Payload journalisé</div>}
      <div className="card" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="text-xs font-semibold mb-2" style={{ color: '#fca5a5' }}>🎯 Bibliothèque de payloads</div>
        <div className="flex flex-wrap gap-2">{PAYLOADS.map(pl => <button key={pl.label} onClick={() => setU(pl.value)} className="btn btn-danger text-xs py-1 px-2">{pl.label}</button>)}</div>
      </div>
      <QueryVisualizer username={u} password={p} mode="vulnerable" />
      <form onSubmit={login} className="space-y-3">
        <div><label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Username</label>
          <input value={u} onChange={e => setU(e.target.value)} className="input-dark input-vulnerable font-mono text-sm" placeholder="Payload ou username..." /></div>
        <div><label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Password</label>
          <input type="text" value={p} onChange={e => setP(e.target.value)} className="input-dark input-vulnerable" placeholder="N'importe quoi..." /></div>
        <button type="submit" disabled={loading} className="btn btn-danger w-full">{loading ? '⏳ Exécution...' : '⚠️ Login (Vulnérable)'}</button>
      </form>
      {lr?.ok && <div className="card animate-slide-in text-xs" style={{ border: '1px solid rgba(239,68,68,0.5)' }}>
        <div className="text-red-400 font-semibold mb-1">🚨 AUTHENTIFICATION CONTOURNÉE!</div>
        <div style={{ color: 'var(--text-muted)' }}>User: <span className="text-white">{lr.data.user?.username}</span></div>
        <pre className="mt-2 p-2 rounded text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontFamily: 'monospace' }}>{lr.data.query_used}</pre>
      </div>}
      {lr?.ok === false && <div className="card text-xs" style={{ color: 'var(--text-muted)' }}>❌ {lr.error?.error || 'Échec'}</div>}
      <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
        <form onSubmit={search} className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} className="input-dark input-vulnerable flex-1 font-mono text-xs" placeholder="Recherche ou UNION payload..." />
          <button type="submit" disabled={loading} className="btn btn-danger">🔍 Chercher</button>
        </form>
      </div>
      {secretExposed && <div className="warning-banner">🚨 <strong>DONNÉES SECRÈTES EXPOSÉES!</strong> — Attaque UNION réussie</div>}
      {sr?.results && <div className="overflow-x-auto rounded-lg animate-slide-in" style={{ border: '1px solid var(--border)' }}>
        <table className="table-dark"><thead><tr>{Object.keys(sr.results[0] || {}).map(k => <th key={k}>{k}</th>)}</tr></thead>
          <tbody>{sr.results.map((r, i) => <tr key={i} style={r.category === 'Secret' ? { background: 'rgba(220,38,38,0.15)' } : {}}>
            {Object.values(r).map((v, j) => <td key={j} className="font-mono text-xs" style={{ color: r.category === 'Secret' ? '#fca5a5' : 'var(--text-primary)' }}>{String(v).substring(0, 60)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>}
      {sr?.query_used && <pre className="p-2 rounded text-xs" style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', fontFamily: 'monospace' }}>{sr.query_used}</pre>}
    </div>
  );
}
