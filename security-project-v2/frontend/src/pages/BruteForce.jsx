/**
 * BruteForce.jsx — Démonstration Brute Force & Account Lockout
 */
import { useState, useEffect, useRef } from 'react';
import client from '../api/client';

const COMMON_PASSWORDS = ['password', '123456', 'admin', 'letmein', 'qwerty', 'admin123', 'pass', '12345678'];

export default function BruteForce() {
  const [tab,       setTab]       = useState('vulnerable');
  const [username,  setUsername]  = useState('alice');
  const [password,  setPassword]  = useState('');
  const [result,    setResult]    = useState(null);
  const [status,    setStatus]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [autoAttempts, setAutoAttempts] = useState(0);
  const [running,   setRunning]   = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const { data } = await client.get(`/brute/status/${username}`);
      setStatus(data);
      if (data.locked && data.remainingSeconds > 0) {
        setCountdown(data.remainingSeconds);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchStatus();
    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [username]);

  // Compte à rebours en temps réel
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(countdownRef.current);
            fetchStatus();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [countdown]);

  const handleManualLogin = async () => {
    setLoading(true);
    setResult(null);
    const endpoint = tab === 'vulnerable' ? '/brute/login-vulnerable' : '/brute/login-secure';
    try {
      const { data } = await client.post(endpoint, { username, password });
      setResult({ success: true, data });
    } catch (err) {
      setResult({ success: false, error: err.response?.data });
      if (err.response?.data?.remainingSeconds) {
        setCountdown(err.response.data.remainingSeconds);
      }
    }
    setLoading(false);
    fetchStatus();
  };

  // Simulation d'attaque automatique (essaie les mots de passe un par un)
  const startAutoAttack = () => {
    setRunning(true);
    setAutoAttempts(0);
    let idx = 0;

    timerRef.current = setInterval(async () => {
      if (idx >= COMMON_PASSWORDS.length) {
        clearInterval(timerRef.current);
        setRunning(false);
        return;
      }

      const pw = COMMON_PASSWORDS[idx++];
      setPassword(pw);
      setAutoAttempts(idx);

      try {
        const endpoint = tab === 'vulnerable' ? '/brute/login-vulnerable' : '/brute/login-secure';
        const { data } = await client.post(endpoint, { username, password: pw });
        if (data.success) {
          clearInterval(timerRef.current);
          setRunning(false);
          setResult({ success: true, data, foundPassword: pw });
        }
      } catch (err) {
        const errData = err.response?.data;
        if (errData?.locked) {
          clearInterval(timerRef.current);
          setRunning(false);
          setResult({ success: false, error: errData });
          setCountdown(errData.remainingSeconds || 180);
        }
      }
      fetchStatus();
    }, 600);
  };

  const stopAutoAttack = () => {
    clearInterval(timerRef.current);
    setRunning(false);
  };

  const handleReset = async () => {
    await client.post('/brute/reset', { username });
    setStatus(null);
    setResult(null);
    setCountdown(0);
    setAutoAttempts(0);
    fetchStatus();
  };

  const isVulnerable = tab === 'vulnerable';
  const color = isVulnerable ? '#ef4444' : '#00ff88';
  const isLocked = status?.locked || countdown > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>🔨 Brute Force Laboratory</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Attaque par dictionnaire et protection Account Lockout
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        {[
          { id: 'vulnerable', label: '⚠️ Sans Protection',    color: '#ef4444' },
          { id: 'secure',     label: '✅ Avec Lockout',        color: '#00ff88' },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null); stopAutoAttack(); setAutoAttempts(0); }}
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={tab === t.id
              ? { background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}60` }
              : { color: 'var(--text-muted)', border: '1px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panneau gauche : formulaire */}
        <div className="rounded-xl p-5 space-y-4"
          style={{ border: `1px solid ${isVulnerable ? 'rgba(239,68,68,0.3)' : 'rgba(0,255,136,0.3)'}`, background: 'var(--bg-secondary)' }}>

          <div className="text-sm font-semibold" style={{ color }}>
            {isVulnerable ? '⚠️ Tentatives illimitées' : '✅ Lockout après 5 échecs (3 min)'}
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Nom d'utilisateur cible</label>
            <select value={username} onChange={e => { setUsername(e.target.value); setResult(null); }}
              className={`input-dark ${isVulnerable ? 'input-vulnerable' : 'input-secure'}`}>
              {['alice', 'bob', 'admin', 'hacker_test', 'dev_user', 'security_analyst'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Mot de passe (manuel)</label>
            <input value={password} onChange={e => setPassword(e.target.value)}
              className={`input-dark ${isVulnerable ? 'input-vulnerable' : 'input-secure'} font-mono`}
              placeholder="Entrer un mot de passe..." />
          </div>

          <button onClick={handleManualLogin} disabled={loading || (isLocked && !isVulnerable)}
            className={`btn w-full ${isVulnerable ? 'btn-danger' : 'btn-success'}`}>
            {loading ? '⏳...' : isVulnerable ? '⚠️ Tenter la connexion' : '✅ Tenter (protégé)'}
          </button>

          <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              🤖 Attaque par dictionnaire automatique
            </div>
            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Essaie {COMMON_PASSWORDS.length} mots de passe courants : {COMMON_PASSWORDS.slice(0, 4).join(', ')}...
            </div>
            <div className="flex gap-2">
              <button onClick={running ? stopAutoAttack : startAutoAttack}
                disabled={isLocked && !isVulnerable}
                className={`btn flex-1 ${running ? 'btn-ghost' : isVulnerable ? 'btn-danger' : 'btn-success'}`}>
                {running ? '⏹ Arrêter' : '▶ Lancer l\'attaque'}
              </button>
              <button onClick={handleReset} className="btn btn-ghost text-xs">🔄 Reset</button>
            </div>
          </div>
        </div>

        {/* Panneau droit : statut en temps réel */}
        <div className="space-y-3">
          {/* Compteur de tentatives */}
          <div className="card" style={{ border: `1px solid ${isLocked ? 'rgba(239,68,68,0.5)' : 'var(--border)'}` }}>
            <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
              📊 Statut du compte : <span style={{ color: 'var(--text-primary)' }}>{username}</span>
            </div>

            {/* Barre de tentatives */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                <span>Tentatives échouées</span>
                <span style={{ color: isVulnerable ? 'var(--text-muted)' : '#fca5a5' }}>
                  {status?.attempts || 0} / {status?.maxAttempts || 5}
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, ((status?.attempts || 0) / (status?.maxAttempts || 5)) * 100)}%`,
                    background: isLocked ? '#ef4444' : (status?.attempts || 0) >= 3 ? '#f59e0b' : '#3b82f6'
                  }} />
              </div>
            </div>

            {/* Auto-attack progress */}
            {running && (
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>🤖 Attaque automatique</span>
                  <span style={{ color: '#fca5a5' }}>{autoAttempts}/{COMMON_PASSWORDS.length}</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="h-1.5 rounded-full transition-all"
                    style={{ width: `${(autoAttempts / COMMON_PASSWORDS.length) * 100}%`, background: '#ef4444' }} />
                </div>
                <div className="text-xs mt-1" style={{ color: '#fca5a5' }}>
                  <span className="pulse-dot" style={{ marginRight: 4 }} />Essai en cours : <code>{password}</code>
                </div>
              </div>
            )}

            {/* Lockout timer */}
            {isLocked && !isVulnerable && countdown > 0 && (
              <div className="card text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)' }}>
                <div className="text-2xl font-bold font-mono" style={{ color: '#ef4444' }}>
                  🔒 {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </div>
                <div className="text-xs mt-1" style={{ color: '#fca5a5' }}>
                  Compte verrouillé — déverrouillage automatique
                </div>
              </div>
            )}

            {!isVulnerable && !isLocked && (
              <div className="text-xs" style={{ color: '#86efac' }}>
                ✅ Compte déverrouillé — {5 - (status?.attempts || 0)} tentatives restantes
              </div>
            )}
            {isVulnerable && (
              <div className="text-xs" style={{ color: '#fca5a5' }}>
                ⚠️ Aucun lockout — tentatives illimitées
              </div>
            )}
          </div>

          {/* Résultat */}
          {result && (
            <div className="card animate-slide-in text-sm"
              style={{ border: `1px solid ${result.success ? '#00ff8840' : 'rgba(239,68,68,0.3)'}` }}>
              {result.success ? (
                <div>
                  <div className="font-semibold mb-1" style={{ color: isVulnerable ? '#fca5a5' : '#86efac' }}>
                    {isVulnerable ? '🚨 Authentification réussie (sans protection)' : '✅ Connexion réussie (protégé)'}
                  </div>
                  {result.foundPassword && (
                    <div style={{ color: 'var(--text-muted)' }}>
                      Mot de passe trouvé : <code style={{ color: '#fca5a5' }}>{result.foundPassword}</code>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="font-semibold mb-1" style={{ color: result.error?.locked ? '#ef4444' : 'var(--text-muted)' }}>
                    {result.error?.locked ? '🔒 Compte verrouillé' : '❌ Identifiants incorrects'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {result.error?.message}
                    {result.error?.attemptsLeft > 0 && ` — ${result.error.attemptsLeft} tentatives restantes`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dictionnaire utilisé */}
          <div className="card text-xs" style={{ border: '1px solid var(--border)' }}>
            <div className="font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>🗂️ Dictionnaire de l'attaque</div>
            <div className="flex flex-wrap gap-1">
              {COMMON_PASSWORDS.map((pw, i) => (
                <code key={pw} className="px-2 py-0.5 rounded text-xs"
                  style={{
                    background: running && autoAttempts - 1 === i ? 'rgba(239,68,68,0.3)' : 'var(--bg-tertiary)',
                    color:      running && autoAttempts - 1 === i ? '#fca5a5'             : 'var(--text-muted)',
                    border:     '1px solid var(--border)',
                  }}>
                  {pw}
                </code>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
