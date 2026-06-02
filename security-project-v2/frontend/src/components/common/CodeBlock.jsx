export default function CodeBlock({ code, variant = 'neutral', label }) {
  const borderColor = { vulnerable: 'rgba(239,68,68,0.4)', secure: 'rgba(0,255,136,0.4)', neutral: 'var(--border)' }[variant];
  const labelColor = { vulnerable: '#fca5a5', secure: 'var(--neon-green)', neutral: 'var(--text-muted)' }[variant];
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${borderColor}` }}>
      {label && (
        <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
          style={{ background: 'rgba(0,0,0,0.3)', borderBottom: `1px solid ${borderColor}`, color: labelColor }}>
          {variant === 'vulnerable' && <span>⚠️</span>}{variant === 'secure' && <span>✅</span>}{label}
        </div>
      )}
      <pre className="p-4 text-xs overflow-x-auto"
        style={{ background: 'var(--bg-tertiary)', color: variant === 'vulnerable' ? '#fca5a5' : variant === 'secure' ? '#86efac' : 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace", lineHeight: '1.65', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {code}
      </pre>
    </div>
  );
}
