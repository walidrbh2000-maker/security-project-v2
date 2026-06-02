import { useState } from 'react';
import ReflectedXSS from '../components/XSSLab/ReflectedXSS';
import StoredXSS from '../components/XSSLab/StoredXSS';
import CodeBlock from '../components/common/CodeBlock';
const TABS = [
  { id: 'reflected-vuln',   label: '⚠️ Réfléchi',       color: '#ef4444' },
  { id: 'reflected-secure', label: '✅ Réfléchi Fix',    color: '#00ff88' },
  { id: 'stored-vuln',      label: '⚠️ Stocké',          color: '#f59e0b' },
  { id: 'stored-secure',    label: '✅ Stocké Fix',      color: '#00ff88' },
  { id: 'theory',           label: '📚 Théorie',          color: '#3b82f6' },
];
export default function XSSAttacks() {
  const [tab, setTab] = useState('reflected-vuln');
  const currentColor = TABS.find(t => t.id === tab)?.color || '#3b82f6';
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>⚡ XSS Attack Laboratory</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Démonstrations XSS réfléchi et stocké avec leurs mitigations.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d' }}>⚡ XSS DEMO ACTIVE</div>
      </div>
      <div className="warning-banner text-xs" style={{ background: 'rgba(239,68,68,0.08)' }}>
        <strong>⚠️ Note navigateur :</strong> Les navigateurs modernes peuvent bloquer certains payloads. Utilisez <code style={{ color: '#fcd34d' }}>alert()</code> ou <code style={{ color: '#fcd34d' }}>console.log()</code> pour les démos.
      </div>
      <div className="flex flex-wrap gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 min-w-fit py-2 px-3 text-xs font-medium rounded-lg transition-all"
            style={tab === t.id ? { background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}60` } : { color: 'var(--text-muted)', border: '1px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl p-5 animate-slide-in" style={{ border: `1px solid ${tab.includes('secure') ? 'rgba(0,255,136,0.3)' : tab === 'theory' ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}`, background: 'var(--bg-secondary)' }}>
        {tab !== 'theory' && (
          <div className="flex items-center gap-2 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-lg">{tab.includes('secure') ? '✅' : '⚠️'}</span>
            <div>
              <div className="font-semibold text-sm" style={{ color: currentColor }}>
                {tab === 'reflected-vuln'   && 'XSS Réfléchi — Endpoint Vulnérable'}
                {tab === 'reflected-secure' && 'XSS Réfléchi — Endpoint Sécurisé'}
                {tab === 'stored-vuln'      && 'XSS Stocké — Endpoint Vulnérable'}
                {tab === 'stored-secure'    && 'XSS Stocké — Endpoint Sécurisé'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {tab === 'reflected-vuln'   && 'GET /api/xss/reflect-vulnerable — input réfléchi sans encodage'}
                {tab === 'reflected-secure' && 'GET /api/xss/reflect-secure — encodage avec he.encode()'}
                {tab === 'stored-vuln'      && 'POST /api/xss/comment-vulnerable — HTML brut stocké et rendu'}
                {tab === 'stored-secure'    && 'POST /api/xss/comment-secure — entités HTML encodées avant stockage'}
              </div>
            </div>
          </div>
        )}
        {tab === 'reflected-vuln'   && <ReflectedXSS mode="vulnerable" />}
        {tab === 'reflected-secure' && <ReflectedXSS mode="secure" />}
        {tab === 'stored-vuln'      && <StoredXSS    mode="vulnerable" />}
        {tab === 'stored-secure'    && <StoredXSS    mode="secure" />}
        {tab === 'theory' && (
          <div className="space-y-5">
            <div className="card" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
              <h3 className="font-semibold mb-3" style={{ color: '#93c5fd' }}>📖 Qu'est-ce que le XSS ?</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Les attaques XSS injectent des scripts malveillants dans des pages web vues par d'autres utilisateurs.
                Le navigateur de la victime exécute le script car il fait confiance au site.
                Classé <strong style={{ color: 'var(--text-primary)' }}>OWASP A03:2021</strong>. CWE-79. CVE exemples : CVE-2021-25281 (WordPress), CVE-2019-5418.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CodeBlock variant="vulnerable" label="⚠️ Vulnérable — innerHTML / dangerouslySetInnerHTML" code={`// React — VULNÉRABLE : exécute les scripts!
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// Vanilla JS — VULNÉRABLE
element.innerHTML = userInput;

// Express — VULNÉRABLE (réflexion)
res.send(\`<p>Résultat: \${query}</p>\`);`} />
              <CodeBlock variant="secure" label="✅ Sécurisé — Encodage & textContent" code={`// React — SÉCURISÉ (par défaut!)
// React auto-échappe les noeuds texte
<div>{userInput}</div>

// Vanilla JS — SÉCURISÉ
element.textContent = userInput;

// Express + he — SÉCURISÉ
const he = require('he');
res.json({ result: he.encode(userInput) });`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
