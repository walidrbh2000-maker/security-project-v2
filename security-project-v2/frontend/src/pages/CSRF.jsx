/**
 * CSRF.jsx — Page de démonstration CSRF
 * Simule un virement bancaire fictif avec et sans protection CSRF.
 */
import { useState, useEffect } from 'react';
import client from '../api/client';

export default function CSRF() {
  const [tab,         setTab]         = useState('vulnerable');
  const [amount,      setAmount]      = useState('500');
  const [to,          setTo]          = useState('attacker@evil.com');
  const [csrfToken,   setCsrfToken]   = useState('');
  const [result,      setResult]      = useState(null);
  const [balance,     setBalance]     = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [tokenLoading,setTokenLoading]= useState(false);

  const fetchBalance = async () => {
    try {
      const { data } = await client.get('/csrf/account');
      setBalance(data.balance);
    } catch { /* ignore */ }
  };

  const fetchToken = async () => {
    setTokenLoading(true);
    try {
      const { data } = await client.get('/csrf/token');
      setCsrfToken(data.csrfToken);
    } catch { /* ignore */ }
    setTokenLoading(false);
  };

  useEffect(() => {
    fetchBalance();
    fetchToken();
  }, []);

  const handleTransfer = async () => {
    setLoading(true);
    setResult(null);
    try {
      const endpoint = tab === 'vulnerable'
        ? '/csrf/transfer-vulnerable'
        : '/csrf/transfer-secure';

      const headers = tab === 'secure' ? { 'X-CSRF-Token': csrfToken } : {};
      const { data } = await client.post(endpoint, { amount, to }, { headers });
      setResult({ success: true, data });
      await fetchBalance();
      if (tab === 'secure') fetchToken();
    } catch (err) {
      setResult({ success: false, error: err.response?.data });
    }
    setLoading(false);
  };

  const isVulnerable = tab === 'vulnerable';
  const color = isVulnerable ? '#ef4444' : '#00ff88';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>🔄 CSRF Laboratory</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Cross-Site Request Forgery — simulation de virement bancaire fictif
        </p>
      </div>

      {/* Explication */}
      <div className="card text-sm" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
        <div className="font-semibold mb-2" style={{ color: '#93c5fd' }}>📚 Qu'est-ce que le CSRF ?</div>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Une attaque CSRF (Cross-Site Request Forgery) incite le navigateur d'un utilisateur authentifié à
          soumettre une requête malveillante à l'insu de la victime. Le serveur vulnérable la traite car
          le cookie de session est envoyé automatiquement. La protection par <strong style={{ color: 'var(--text-primary)' }}>double-submit cookie</strong>{' '}
          exige un token secret dans la requête que le site malveillant ne peut pas lire (Same-Origin Policy).
        </p>
      </div>

      {/* Solde */}
      <div className="card flex items-center justify-between" style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
        <div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Solde du compte (fictif)</div>
          <div className="text-2xl font-bold font-mono" style={{ color: '#f59e0b' }}>
            {balance !== null ? balance.toLocaleString() : '...'} DZD
          </div>
        </div>
        <button onClick={fetchBalance} className="btn btn-ghost text-xs">🔄 Actualiser</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        {[
          { id: 'vulnerable', label: '⚠️ Sans Protection', color: '#ef4444' },
          { id: 'secure',     label: '✅ Avec CSRF Token',  color: '#00ff88' },
          { id: 'theory',     label: '📚 Théorie',          color: '#3b82f6' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={tab === t.id
              ? { background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}60` }
              : { color: 'var(--text-muted)', border: '1px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel vulnérable / sécurisé */}
      {tab !== 'theory' && (
        <div className="rounded-xl p-5 space-y-4"
          style={{ border: `1px solid ${isVulnerable ? 'rgba(239,68,68,0.3)' : 'rgba(0,255,136,0.3)'}`, background: 'var(--bg-secondary)' }}>

          <div className="flex items-center gap-2">
            <span>{isVulnerable ? '⚠️' : '✅'}</span>
            <div>
              <div className="font-semibold text-sm" style={{ color }}>
                {isVulnerable ? 'Endpoint vulnérable — aucun token requis' : 'Endpoint sécurisé — double-submit cookie'}
              </div>
              <code className="text-xs" style={{ color: 'var(--text-muted)' }}>
                POST {isVulnerable ? '/api/csrf/transfer-vulnerable' : '/api/csrf/transfer-secure'}
              </code>
            </div>
          </div>

          {/* Formulaire de transfert */}
          <div className="space-y-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Montant (DZD)</label>
              <input value={amount} onChange={e => setAmount(e.target.value)}
                className={`input-dark ${isVulnerable ? 'input-vulnerable' : 'input-secure'}`}
                placeholder="Montant du virement" type="number" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Destinataire</label>
              <input value={to} onChange={e => setTo(e.target.value)}
                className={`input-dark ${isVulnerable ? 'input-vulnerable' : 'input-secure'}`}
                placeholder="Email ou compte du destinataire" />
            </div>

            {/* Token CSRF visible pour le mode sécurisé */}
            {tab === 'secure' && (
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>
                  X-CSRF-Token <span className="text-xs" style={{ color: '#86efac' }}>(généré automatiquement)</span>
                </label>
                <div className="flex gap-2">
                  <input value={csrfToken} readOnly
                    className="input-dark input-secure font-mono text-xs flex-1"
                    style={{ color: '#86efac' }}
                    placeholder="Cliquez sur 'Nouveau Token'..." />
                  <button onClick={fetchToken} disabled={tokenLoading} className="btn btn-success text-xs whitespace-nowrap">
                    {tokenLoading ? '⏳' : '🔑 Nouveau Token'}
                  </button>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  ✅ Ce token est envoyé dans l'en-tête X-CSRF-Token — un site malveillant ne peut pas le lire (Same-Origin Policy)
                </div>
              </div>
            )}

            <button onClick={handleTransfer} disabled={loading}
              className={`btn w-full ${isVulnerable ? 'btn-danger' : 'btn-success'}`}>
              {loading ? '⏳ Traitement...' : isVulnerable ? '⚠️ Effectuer le virement (sans protection)' : '✅ Effectuer le virement sécurisé'}
            </button>
          </div>

          {/* Résultat */}
          {result && (
            <div className="card animate-slide-in text-sm"
              style={{ border: `1px solid ${result.success ? (isVulnerable ? 'rgba(239,68,68,0.5)' : 'rgba(0,255,136,0.5)') : 'var(--border)'}` }}>
              {result.success ? (
                <div>
                  <div className="font-semibold mb-2" style={{ color: isVulnerable ? '#fca5a5' : '#86efac' }}>
                    {isVulnerable ? '🚨 Virement effectué SANS protection CSRF!' : '✅ Virement effectué avec protection CSRF'}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    Montant : <span className="text-white">{result.data.transferred} DZD</span> → <span className="text-white">{result.data.to}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    Nouveau solde : <span className="font-mono" style={{ color: '#f59e0b' }}>{result.data.newBalance} DZD</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold mb-1" style={{ color: '#86efac' }}>🛡️ Requête bloquée</div>
                  <div style={{ color: 'var(--text-muted)' }}>{result.error?.message || 'Erreur inconnue'}</div>
                </div>
              )}
            </div>
          )}

          {/* Scénario d'attaque */}
          {isVulnerable && (
            <div className="card text-xs" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
              <div className="font-semibold mb-2" style={{ color: '#fca5a5' }}>🎭 Scénario d'attaque CSRF</div>
              <pre style={{ color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{
`<!-- Page malveillante sur evil.com -->
<form action="http://seclab/api/csrf/transfer-vulnerable"
      method="POST" id="forged">
  <input type="hidden" name="amount" value="99999">
  <input type="hidden" name="to" value="attacker@evil.com">
</form>
<script>document.getElementById('forged').submit();</script>

<!-- Le navigateur envoie automatiquement les cookies de session !
     Le serveur vulnérable traite la requête sans vérification. -->`
              }</pre>
            </div>
          )}
        </div>
      )}

      {/* Théorie */}
      {tab === 'theory' && (
        <div className="space-y-4 animate-slide-in">
          <div className="card" style={{ border: '1px solid rgba(0,255,136,0.3)' }}>
            <div className="font-semibold mb-3" style={{ color: 'var(--neon-green)' }}>🛡️ Double-Submit Cookie Pattern</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <div className="card" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="font-semibold mb-2" style={{ color: '#fca5a5' }}>⚠️ Sans protection</div>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Victime connectée sur seclab.com</li>
                  <li>Elle visite evil.com</li>
                  <li>evil.com soumet un formulaire caché vers seclab.com</li>
                  <li>Le navigateur envoie les cookies automatiquement</li>
                  <li>Le serveur traite la requête</li>
                  <li>💸 Virement effectué à l'insu de la victime</li>
                </ol>
              </div>
              <div className="card" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="font-semibold mb-2" style={{ color: '#86efac' }}>✅ Avec token CSRF</div>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Serveur génère un token aléatoire unique</li>
                  <li>Token inclus dans chaque formulaire légitime</li>
                  <li>evil.com soumet sans le token (Same-Origin Policy)</li>
                  <li>Serveur vérifie le token avant traitement</li>
                  <li>Token absent ou invalide → requête rejetée</li>
                  <li>🛡️ Attaque neutralisée</li>
                </ol>
              </div>
            </div>
          </div>
          <div className="card text-xs" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
            <div className="font-semibold mb-2" style={{ color: '#93c5fd' }}>Références OWASP</div>
            <div style={{ color: 'var(--text-muted)' }}>
              OWASP A01:2021 — Broken Access Control · CWE-352 · CVE exemples : WordPress 4.7.4, phpMyAdmin
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
