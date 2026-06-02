import { useState, useEffect } from 'react';
export default function QueryVisualizer({ username, password, mode }) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      if (mode === 'vulnerable') setQuery(`SELECT * FROM users\nWHERE username = '${username}'\n  AND password = '${password}'`);
      else setQuery(`SELECT * FROM users\nWHERE username = ?\n\nParams: ['${username}', '${password ? '••••' : ''}']`);
    }, 300);
    return () => clearTimeout(t);
  }, [username, password, mode]);
  const v = mode === 'vulnerable';
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${v ? 'rgba(239,68,68,0.5)' : 'rgba(0,255,136,0.5)'}` }}>
      <div className="px-3 py-2 text-xs font-semibold" style={{ background: 'rgba(0,0,0,0.3)', color: v ? '#fca5a5' : 'var(--neon-green)', borderBottom: `1px solid ${v ? 'rgba(239,68,68,0.3)' : 'rgba(0,255,136,0.3)'}` }}>
        {v ? '⚠️ REQUÊTE VULNÉRABLE' : '✅ REQUÊTE PARAMÉTRÉE'} — Aperçu live
      </div>
      <pre className="px-4 py-3 text-xs" style={{ background: 'var(--bg-tertiary)', color: v ? '#fca5a5' : '#86efac', fontFamily: "'JetBrains Mono',monospace", margin: 0 }}>{query}</pre>
      <div className="px-3 py-2 text-xs" style={{ background: v ? 'rgba(239,68,68,0.06)' : 'rgba(0,255,136,0.06)', color: 'var(--text-muted)' }}>
        {v ? '⚠️ Input interpolé dans SQL — injection possible' : '✅ Input en paramètre — driver l\'échappe automatiquement'}
      </div>
    </div>
  );
}
