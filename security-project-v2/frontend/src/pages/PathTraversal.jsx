/**
 * PathTraversal.jsx — Démonstration Path Traversal / LFI
 */
import { useState } from 'react';
import client from '../api/client';

const ATTACK_PAYLOADS = [
  { label: '/etc/passwd',   value: '../../etc/passwd',         tip: 'Fichier système Unix — comptes utilisateurs' },
  { label: '/etc/shadow',   value: '../../../etc/shadow',      tip: 'Hashes des mots de passe (root requis)' },
  { label: 'DB Config',     value: '../config/database.php',   tip: 'Credentials de la base de données' },
  { label: 'URL Encoded',   value: '%2e%2e%2fetc%2fpasswd',    tip: 'Contournement par encodage URL' },
  { label: 'win.ini',       value: 'C:\\Windows\\win.ini',     tip: 'Fichier de configuration Windows' },
  { label: 'Double Dot',    value: '....//....//etc/passwd',   tip: 'Bypass de filtres naïfs' },
];

const SAFE_FILES = ['welcome.txt', 'readme.md', 'config-example.txt', 'changelog.txt'];

export default function PathTraversal() {
  const [tab,       setTab]       = useState('vulnerable');
  const [filename,  setFilename]  = useState('');
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);

  const handleRead = async () => {
    if (!filename.trim()) return;
    setLoading(true);
    setResult(null);
    const endpoint = tab === 'vulnerable' ? '/files/read-vulnerable' : '/files/read-secure';
    try {
      const { data } = await client.get(endpoint, { params: { name: filename } });
      setResult({ success: true, data });
    } catch (err) {
      setResult({ success: false, error: err.response?.data });
    }
    setLoading(false);
  };

  const isVulnerable = tab === 'vulnerable';
  const color = isVulnerable ? '#ef4444' : '#00ff88';

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>📁 Path Traversal / LFI Laboratory</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Local File Inclusion — lecture de fichiers arbitraires sur le serveur
        </p>
      </div>

      <div className="card text-sm" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
        <div className="font-semibold mb-2" style={{ color: '#93c5fd' }}>📚 Qu'est-ce que le Path Traversal ?</div>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Une attaque Path Traversal exploite une validation insuffisante des noms de fichiers pour accéder à des
          fichiers en dehors du répertoire prévu. En utilisant <code style={{ color: '#fca5a5' }}>../</code> (remonter dans l'arborescence),
          un attaquant peut lire des fichiers système sensibles comme <code style={{ color: '#fca5a5' }}>/etc/passwd</code>.
          Classé <strong style={{ color: 'var(--text-primary)' }}>OWASP A01:2021</strong>.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        {[
          { id: 'vulnerable', label: '⚠️ Sans Validation',  color: '#ef4444' },
          { id: 'secure',     label: '✅ Whitelist + Jail', color: '#00ff88' },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResult(null); }}
            className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={tab === t.id
              ? { background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}60` }
              : { color: 'var(--text-muted)', border: '1px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl p-5 space-y-4"
        style={{ border: `1px solid ${isVulnerable ? 'rgba(239,68,68,0.3)' : 'rgba(0,255,136,0.3)'}`, background: 'var(--bg-secondary)' }}>

        <div>
          <div className="font-semibold text-sm" style={{ color }}>
            {isVulnerable ? '⚠️ GET /api/files/read-vulnerable?name=' : '✅ GET /api/files/read-secure?name='}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {isVulnerable
              ? 'Le serveur lit le fichier sans valider le chemin — traversal possible'
              : 'Whitelist stricte + path.resolve() pour confiner dans /app/demo-files'}
          </div>
        </div>

        {/* Payloads d'attaque */}
        {isVulnerable && (
          <div>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>🎯 Payloads d'attaque :</div>
            <div className="flex flex-wrap gap-2">
              {ATTACK_PAYLOADS.map(p => (
                <button key={p.label} title={p.tip}
                  onClick={() => setFilename(p.value)}
                  className="btn btn-danger text-xs py-1 px-2">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fichiers autorisés */}
        {!isVulnerable && (
          <div>
            <div className="text-xs font-semibold mb-2" style={{ color: '#86efac' }}>✅ Fichiers dans la whitelist :</div>
            <div className="flex flex-wrap gap-2">
              {SAFE_FILES.map(f => (
                <button key={f} onClick={() => setFilename(f)}
                  className="btn btn-success text-xs py-1 px-2">{f}</button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <input value={filename} onChange={e => setFilename(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRead()}
            className={`input-dark ${isVulnerable ? 'input-vulnerable' : 'input-secure'} flex-1 font-mono text-xs`}
            placeholder={isVulnerable ? "../../etc/passwd ou nom de fichier..." : "welcome.txt (whitelist seulement)"} />
          <button onClick={handleRead} disabled={loading}
            className={`btn whitespace-nowrap ${isVulnerable ? 'btn-danger' : 'btn-success'}`}>
            {loading ? '⏳' : isVulnerable ? '⚠️ Lire' : '✅ Lire'}
          </button>
        </div>

        {/* Résultat */}
        {result && (
          <div className="animate-slide-in">
            {result.success && result.data.traversal_detected && (
              <div className="warning-banner mb-2">
                🚨 <strong>PATH TRAVERSAL DÉTECTÉ</strong> — Contenu simulé d'un fichier système !
              </div>
            )}
            {result.success && !result.data.traversal_detected && !result.data.vulnerable && (
              <div className="rounded-lg p-2 text-xs mb-2"
                style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.3)', color: '#86efac' }}>
                ✅ Accès autorisé — fichier dans la whitelist
              </div>
            )}

            {result.success ? (
              <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${result.data.traversal_detected ? 'rgba(239,68,68,0.5)' : 'rgba(0,255,136,0.5)'}` }}>
                <div className="px-3 py-2 text-xs font-semibold flex items-center justify-between"
                  style={{ background: 'rgba(0,0,0,0.3)', color: result.data.traversal_detected ? '#fca5a5' : '#86efac',
                           borderBottom: '1px solid var(--border)' }}>
                  <span>📄 {result.data.filename_requested || result.data.filename}</span>
                  {result.data.resolved_path && (
                    <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
                      {result.data.resolved_path}
                    </span>
                  )}
                </div>
                <pre className="p-4 text-xs overflow-x-auto font-mono"
                  style={{ background: 'var(--bg-tertiary)', color: result.data.traversal_detected ? '#fca5a5' : '#86efac',
                           maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                  {result.data.content}
                </pre>
              </div>
            ) : (
              <div className="card text-sm" style={{ border: '1px solid rgba(0,255,136,0.4)' }}>
                <div className="font-semibold" style={{ color: '#86efac' }}>🛡️ Accès refusé</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {result.error?.message}
                  {result.error?.allowed && (
                    <div className="mt-1">Fichiers autorisés : {result.error.allowed.join(', ')}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comparaison code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
        <div className="card" style={{ border: '1px solid rgba(239,68,68,0.4)' }}>
          <div className="font-semibold mb-2" style={{ color: '#fca5a5' }}>⚠️ Code vulnérable</div>
          <pre style={{ color: '#fca5a5', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '0.5rem', whiteSpace: 'pre-wrap' }}>
{`// ⚠️ VULNERABLE
const filename = req.query.name;
// Pas de validation !
const filePath = path.join(baseDir, filename);
const content = fs.readFileSync(filePath);
// ?name=../../etc/passwd → EXPOSÉ !`}
          </pre>
        </div>
        <div className="card" style={{ border: '1px solid rgba(0,255,136,0.4)' }}>
          <div className="font-semibold mb-2" style={{ color: '#86efac' }}>✅ Code sécurisé</div>
          <pre style={{ color: '#86efac', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '0.5rem', whiteSpace: 'pre-wrap' }}>
{`// ✅ SECURE
const ALLOWED = new Set(['file.txt']);
if (!ALLOWED.has(filename)) return 403;

// Jail check avec path.resolve()
const resolved = path.resolve(BASE, filename);
if (!resolved.startsWith(BASE)) return 403;
// Traversal impossible même si whitelist bypass`}
          </pre>
        </div>
      </div>
    </div>
  );
}
