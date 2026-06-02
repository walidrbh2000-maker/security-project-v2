import { useState } from 'react';
import client from '../../api/client';
const PAYLOADS = [
  { label: "Script Alert", value: "<script>alert('XSS!')</script>" },
  { label: "Image Event",  value: "<img src=x onerror=alert('XSS via img')>" },
  { label: "SVG Payload",  value: "<svg onload=alert('SVG XSS')>" },
  { label: "Cookie Steal", value: "<script>alert(document.cookie)</script>" },
];
export default function ReflectedXSS({ mode }) {
  const [input, setInput] = useState(''); const [result, setResult] = useState(null); const [loading, setL] = useState(false);
  const v = mode === 'vulnerable';
  const submit = async (e) => { e.preventDefault(); if (!input.trim()) return; setL(true);
    try { const { data } = await client.get(v ? '/xss/reflect-vulnerable' : '/xss/reflect-secure', { params: { input } }); setResult(data); }
    catch { setResult({ error: 'Erreur' }); } setL(false); };
  return (
    <div className="space-y-5">
      <div className="card text-sm" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
        <div className="font-semibold mb-2" style={{ color: '#93c5fd' }}>📚 XSS Réfléchi</div>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>Le payload est dans la requête HTTP et immédiatement réfléchi dans la réponse sans encodage. Nécessite d'inciter la victime à cliquer sur un lien malveillant.</p>
      </div>
      <div className="flex flex-wrap gap-2">{PAYLOADS.map(pl => <button key={pl.label} onClick={() => setInput(pl.value)} className={`btn text-xs py-1 px-2 ${v ? 'btn-danger' : 'btn-ghost'}`}>{pl.label}</button>)}</div>
      <form onSubmit={submit} className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} className={`input-dark flex-1 font-mono text-xs ${v ? 'input-vulnerable' : 'input-secure'}`} placeholder={v ? "Payload HTML/script..." : "Sera encodé avant réflexion..."} />
        <button type="submit" disabled={loading} className={`btn whitespace-nowrap ${v ? 'btn-danger' : 'btn-success'}`}>{loading ? '⏳' : v ? '⚠️ Réfléchir' : '✅ Réfléchir'}</button>
      </form>
      {result && !result.error && (
        <div className="rounded-lg overflow-hidden animate-slide-in" style={{ border: `1px solid ${v ? 'rgba(239,68,68,0.5)' : 'rgba(0,255,136,0.4)'}` }}>
          <div className="px-3 py-2 text-xs font-semibold" style={{ background: 'rgba(0,0,0,0.3)', color: v ? '#fca5a5' : 'var(--neon-green)', borderBottom: '1px solid var(--border)' }}>
            {v ? '⚠️ Sortie brute (HTML rendu) :' : '✅ Sortie encodée (texte brut) :'}
          </div>
          <div className="p-4" style={{ background: 'var(--bg-tertiary)', minHeight: '60px' }}>
            {v ? <div dangerouslySetInnerHTML={{ __html: result.reflected }} style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }} />
               : <span style={{ color: '#86efac', fontFamily: 'monospace', fontSize: '0.8rem' }}>{result.reflected}</span>}
          </div>
          {!v && result.original && (
            <div className="px-3 py-2 text-xs" style={{ background: 'rgba(0,255,136,0.05)', color: 'var(--text-muted)', borderTop: '1px solid rgba(0,255,136,0.1)' }}>
              Original: <code style={{ color: '#fca5a5' }}>{result.original}</code><br/>Encodé: <code style={{ color: '#86efac' }}>{result.reflected}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
