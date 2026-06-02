/**
 * Profile.jsx — Page de profil utilisateur
 * Modification du mot de passe + sessions actives (simulé)
 */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Profile() {
  const { user } = useAuth();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [loading,     setLoading]     = useState(false);
  const [msg,         setMsg]         = useState(null);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      setMsg({ success: false, text: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const { data } = await client.put('/auth/change-password', {
        currentPassword: currentPwd,
        newPassword:     newPwd,
      });
      setMsg({ success: true, text: data.message });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      setMsg({ success: false, text: err.response?.data?.message || 'Erreur lors du changement.' });
    }
    setLoading(false);
  };

  const roleColor = { admin: '#ef4444', moderator: '#8b5cf6', user: '#3b82f6' }[user?.role] || '#64748b';

  // Sessions simulées
  const simulatedSessions = [
    { id: 1, ip: '192.168.1.1',  device: 'Chrome 121 / Windows',  active: true,  lastSeen: 'Maintenant'     },
    { id: 2, ip: '10.0.0.5',    device: 'Firefox 122 / macOS',   active: false, lastSeen: 'Il y a 2 heures' },
    { id: 3, ip: '172.16.0.1',  device: 'Safari / iPhone',       active: false, lastSeen: 'Hier'            },
  ];

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>👤 Mon Profil</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Paramètres du compte et sécurité</p>
      </div>

      {/* Infos utilisateur */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
          style={{ background: `${roleColor}20`, color: roleColor, border: `2px solid ${roleColor}40` }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{user?.username}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge" style={{ background: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}>
              {user?.role}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email || 'Pas d\'email'}</span>
          </div>
        </div>
      </div>

      {/* Changer le mot de passe */}
      <div className="card" style={{ border: '1px solid rgba(0,255,136,0.2)' }}>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--neon-green)' }}>🔐 Changer le mot de passe</h3>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Mot de passe actuel</label>
            <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
              className="input-dark input-secure" placeholder="••••••••" required />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Nouveau mot de passe</label>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
              className="input-dark input-secure" placeholder="Min. 8 car. — Majuscule + chiffre requis" required />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Confirmer le nouveau mot de passe</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              className={`input-dark ${newPwd && confirmPwd && newPwd !== confirmPwd ? 'input-vulnerable' : 'input-secure'}`}
              placeholder="Répéter le nouveau mot de passe" required />
          </div>

          {/* Indicateur de force */}
          {newPwd && (
            <div>
              <div className="flex gap-1 mb-1">
                {[
                  newPwd.length >= 8,
                  /[A-Z]/.test(newPwd),
                  /[0-9]/.test(newPwd),
                  /[^a-zA-Z0-9]/.test(newPwd),
                ].map((ok, i) => (
                  <div key={i} className="flex-1 h-1.5 rounded-full"
                    style={{ background: ok ? '#00ff88' : 'var(--bg-tertiary)' }} />
                ))}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {[newPwd.length >= 8, /[A-Z]/.test(newPwd), /[0-9]/.test(newPwd), /[^a-zA-Z0-9]/.test(newPwd)].filter(Boolean).length < 2
                  ? '🔴 Mot de passe faible'
                  : [newPwd.length >= 8, /[A-Z]/.test(newPwd), /[0-9]/.test(newPwd), /[^a-zA-Z0-9]/.test(newPwd)].filter(Boolean).length < 4
                  ? '🟡 Mot de passe moyen'
                  : '🟢 Mot de passe fort'}
              </div>
            </div>
          )}

          {msg && (
            <div className="rounded-lg p-3 text-xs"
              style={{ background: msg.success ? 'rgba(0,255,136,0.08)' : 'rgba(239,68,68,0.08)',
                       border: `1px solid ${msg.success ? 'rgba(0,255,136,0.4)' : 'rgba(239,68,68,0.4)'}`,
                       color:  msg.success ? '#86efac' : '#fca5a5' }}>
              {msg.success ? '✅' : '❌'} {msg.text}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-success">
            {loading ? '⏳ Changement...' : '✅ Changer le mot de passe'}
          </button>
        </form>
      </div>

      {/* Sessions actives (simulées) */}
      <div className="card">
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          💻 Sessions actives
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(simulé)</span>
        </h3>
        <div className="space-y-2">
          {simulatedSessions.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: 'var(--bg-tertiary)', border: `1px solid ${s.active ? 'rgba(0,255,136,0.3)' : 'var(--border)'}` }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: s.active ? '#00ff88' : '#64748b' }} />
                <div>
                  <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{s.device}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>IP : {s.ip} · {s.lastSeen}</div>
                </div>
              </div>
              {s.active
                ? <span className="text-xs" style={{ color: '#86efac' }}>Session actuelle</span>
                : <button className="btn btn-ghost text-xs py-1 px-2">Révoquer</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
