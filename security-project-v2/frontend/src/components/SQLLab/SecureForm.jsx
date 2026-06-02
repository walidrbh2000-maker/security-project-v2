import { useState } from 'react';
import client from '../../api/client';
import QueryVisualizer from './QueryVisualizer';

export default function SecureForm() {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [q, setQ] = useState('');
  const [lr, setLr] = useState(null); const [sr, setSr] = useState(null); const [loading, setL] = useState(false);

  const login = async (e) => {
    e.preventDefault(); setL(true);
    try { const { data } = await client.post('/auth/login-secure', { username: u, password: p }); setLr({ ok: true, data }); }
    catch (err) { setLr({ ok: false, error: err.response?.data }); }
    setL(false);
  };

  const search = async (e) => {
    e.preventDefault(); setL(true);
    try { const { data } = await client.get('/sqli/search-secure', { params: { q } }); setSr(data); }
    catch { setSr({ error: 'Recherche échouée' }); }
    setL(false);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.3)', color: '#86efac' }}>
        ✅ Requêtes paramétrées + bcrypt — les payloads d'injection sont inoffensifs
      </div>
      <QueryVisualizer username={u} password={p} mode="secure" />
      <form onSubmit={login} className="space-y-3">
        <div><label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Username</label>
          <input value={u} onChange={e => setU(e.target.value)} className="input-dark input-secure" placeholder="Essayez n'importe quel payload..." /></div>
        <div><label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Password</label>
          <input type="password" value={p} onChange={e => setP(e.target.value)} className="input-dark input-secure" placeholder="Vrai mot de passe requis" /></div>
        <button type="submit" disabled={loading} className="btn btn-success w-full">{loading ? '⏳...' : '✅ Login (Sécurisé)'}</button>
      </form>
      {lr && <div className="card animate-slide-in text-xs" style={{ border: `1px solid ${lr.ok ? 'rgba(0,255,136,0.4)' : 'var(--border)'}` }}>
        {lr.ok
          ? <div style={{ color: '#86efac' }}>✅ Authentifié — credentials réels vérifiés: <strong>{lr.data.user?.username}</strong> ({lr.data.user?.role})</div>
          : <div style={{ color: 'var(--text-muted)' }}>❌ {lr.error?.error || 'Identifiants incorrects'} — l'injection n'a aucun effet</div>}
      </div>}
      <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
        <form onSubmit={search} className="flex gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} className="input-dark input-secure flex-1" placeholder="Recherche sécurisée..." />
          <button type="submit" disabled={loading} className="btn btn-success">🔍 Chercher</button>
        </form>
      </div>
      {sr?.results && <div className="overflow-x-auto rounded-lg animate-slide-in" style={{ border: '1px solid var(--border)' }}>
        <table className="table-dark"><thead><tr><th>Nom</th><th>Catégorie</th><th>Prix</th><th>Stock</th></tr></thead>
          <tbody>{sr.results.length === 0
            ? <tr><td colSpan={4} className="text-center py-4" style={{ color: 'var(--text-muted)' }}>Aucun résultat</td></tr>
            : sr.results.map(r => <tr key={r.id}><td>{r.name}</td><td style={{ color: 'var(--text-muted)' }}>{r.category}</td><td style={{ color: 'var(--neon-green)' }}>${r.price}</td><td>{r.stock}</td></tr>)}</tbody>
        </table>
        <div className="px-3 py-2 text-xs" style={{ background: 'rgba(0,255,136,0.05)', color: '#86efac' }}>✅ Produits secrets exclus (is_secret=1)</div>
      </div>}
    </div>
  );
}
