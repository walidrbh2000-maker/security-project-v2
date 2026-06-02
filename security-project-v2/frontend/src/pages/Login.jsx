import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
const DEMO_USERS = [
  { username: 'admin',            password: 'Admin@123', role: 'admin'     },
  { username: 'alice',            password: 'Alice@2024', role: 'user'     },
  { username: 'bob',              password: 'Bob@2024',   role: 'user'     },
  { username: 'moderator',        password: 'Mod@2024',   role: 'moderator'},
  { username: 'hacker_test',      password: 'Hack3r@2024',role: 'user'     },
  { username: 'security_analyst', password: 'Sec@2024',   role: 'moderator'},
];
export default function Login() {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const { login } = useAuth(); const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { const { data } = await client.post('/auth/login-secure', { username, password });
      if (data.success) { login(data.user, data.token); navigate('/', { replace: true }); }
      else setError(data.error || 'Connexion échouée');
    } catch (err) { setError(err.response?.data?.error || 'Connexion échouée — vérifiez vos credentials'); }
    setLoading(false);
  };
  const quickLogin = (u) => { setUsername(u.username); setPassword(u.password); setError(''); };
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="fixed inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0,255,136,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🛡️</div>
          <h1 className="text-4xl font-bold neon-text mb-1">SecLab</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cybersecurity Research Platform v2</p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>⚠️ Outil Éducatif — Pas pour la production</div>
        </div>
        <div className="rounded-2xl p-8" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Connexion</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Nom d'utilisateur</label>
              <input value={username} onChange={e => { setUsername(e.target.value); setError(''); }} className="input-dark" placeholder="Entrez votre username" required /></div>
            <div><label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} className="input-dark" placeholder="Entrez votre mot de passe" required /></div>
            {error && <div className="warning-banner text-xs">❌ {error}</div>}
            <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5 text-sm font-semibold" style={{ marginTop: '1rem' }}>{loading ? '⏳ Authentification...' : '🔐 Se connecter'}</button>
          </form>
          <div className="mt-6">
            <div className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />Comptes démo<div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map(u => (
                <button key={u.username} onClick={() => quickLogin(u)} className="btn btn-ghost text-xs py-2 flex flex-col gap-0.5">
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{u.username}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{u.role} · {u.password}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>Projet de Licence — Sécurité Informatique</p>
      </div>
    </div>
  );
}
