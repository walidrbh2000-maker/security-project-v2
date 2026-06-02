import { useState } from 'react';
import VulnerableForm from '../components/SQLLab/VulnerableForm';
import SecureForm from '../components/SQLLab/SecureForm';
import CodeBlock from '../components/common/CodeBlock';
const TABS = [
  { id: 'vulnerable', label: '⚠️ Vulnérable', color: '#ef4444' },
  { id: 'secure',     label: '✅ Sécurisé',   color: '#00ff88' },
  { id: 'theory',     label: '📚 Théorie',     color: '#3b82f6' },
];
export default function SQLInjection() {
  const [tab, setTab] = useState('vulnerable');
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>💉 SQL Injection Laboratory</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Endpoints vulnérable et sécurisé côte à côte — chaque payload est journalisé.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          <span className="pulse-dot" /> DÉTECTION LIVE
        </div>
      </div>
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
            style={tab === t.id ? { background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}60` } : { color: 'var(--text-muted)', border: '1px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'vulnerable' && (
        <div className="panel-vulnerable p-5 animate-slide-in">
          <div className="flex items-center gap-2 mb-4">
            <div><div className="font-semibold" style={{ color: '#fca5a5' }}>Endpoint Vulnérable</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}><code style={{ color: '#f87171' }}>POST /api/auth/login-vulnerable</code> — concaténation directe</div></div>
          </div>
          <VulnerableForm />
        </div>
      )}
      {tab === 'secure' && (
        <div className="panel-secure p-5 animate-slide-in">
          <div className="flex items-center gap-2 mb-4">
            <div><div className="font-semibold" style={{ color: 'var(--neon-green)' }}>Endpoint Sécurisé</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}><code style={{ color: '#86efac' }}>POST /api/auth/login-secure</code> — requête paramétrée + bcrypt</div></div>
          </div>
          <SecureForm />
        </div>
      )}
      {tab === 'theory' && (
        <div className="space-y-5 animate-slide-in">
          <div className="card" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
            <h3 className="font-semibold mb-3" style={{ color: '#93c5fd' }}>📖 Qu'est-ce que l'injection SQL ?</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              L'injection SQL (SQLi) est une technique d'injection de code où l'attaquant insère des instructions SQL malveillantes dans un champ d'entrée qui est ensuite exécuté par la base de données.
              C'est l'une des vulnérabilités les plus critiques du <strong style={{ color: 'var(--text-primary)' }}>Top 10 OWASP (A03:2021 Injection)</strong>.
              Référence CVE : CVE-2012-2326 (Drupal), CVE-2019-19781, CWE-89.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CodeBlock variant="vulnerable" label="⚠️ Vulnérable — Concaténation" code={`// Node.js — NE JAMAIS FAIRE
const sql = "SELECT * FROM users " +
  "WHERE username='" + username + "'" +
  " AND password='" + password + "'";

// Si username = admin'--
// La requête devient :
// SELECT * FROM users
// WHERE username='admin'--'
// AND password='n'importe quoi'
// Le -- commente la vérification du mdp !`} />
            <CodeBlock variant="secure" label="✅ Sécurisé — Requête Paramétrée" code={`// Node.js + mysql2 — TOUJOURS FAIRE ÇA
const [rows] = await pool.query(
  "SELECT * FROM users " +
  "WHERE username = ? " +
  "AND password_hash = ?",
  [username, password]
);
// admin'-- devient la chaîne littérale
// "admin'--" — le driver l'échappe,
// la logique SQL n'est JAMAIS altérée.`} />
          </div>
          <div className="card" style={{ border: '1px solid rgba(0,255,136,0.3)' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'var(--neon-green)' }}>🛡️ Checklist de Prévention</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {['Utiliser des requêtes paramétrées / prepared statements','Utiliser un ORM (Sequelize, TypeORM, Prisma)','Valider et whitelister toutes les entrées utilisateur','Appliquer le principe du moindre privilège sur les comptes DB','Ne jamais exposer les messages d\'erreur SQL aux clients','Activer les règles WAF pour les patterns d\'injection SQL','Audits de sécurité et tests de pénétration réguliers','Utiliser des procédures stockées (avec précaution)'].map(t => (
                <div key={t} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--neon-green)', flexShrink: 0 }}>✅</span>{t}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
