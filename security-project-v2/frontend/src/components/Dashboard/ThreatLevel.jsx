/**
 * ThreatLevel.jsx — Indicateur de niveau de menace (dernières 24h)
 */
export default function ThreatLevel({ level = 'LOW', score = 0, stats = {} }) {
  const config = {
    CRITICAL: { color: '#dc2626', bg: 'rgba(220,38,38,0.15)', border: 'rgba(220,38,38,0.5)', label: 'CRITIQUE', icon: '🔴', bars: 4 },
    HIGH:     { color: '#ea580c', bg: 'rgba(234,88,12,0.12)',  border: 'rgba(234,88,12,0.4)',  label: 'ÉLEVÉ',   icon: '🟠', bars: 3 },
    MEDIUM:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', label: 'MOYEN',   icon: '🟡', bars: 2 },
    LOW:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)', label: 'FAIBLE',  icon: '🔵', bars: 1 },
  };
  const c = config[level] || config.LOW;

  return (
    <div className="card" style={{ border: `1px solid ${c.border}`, background: c.bg }}>
      <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
        🌡️ Niveau de Menace — 24h
      </div>

      {/* Indicateur principal */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex gap-0.5 items-end">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-3 rounded-sm transition-all"
              style={{
                height:     `${i * 10 + 10}px`,
                background: i <= c.bars ? c.color : 'var(--bg-tertiary)',
              }} />
          ))}
        </div>
        <div>
          <div className="text-2xl font-bold" style={{ color: c.color }}>
            {c.icon} {c.label}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Score de menace : {score}
          </div>
        </div>
      </div>

      {/* Décompte par sévérité */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'CRITIQUE', val: stats.critical || 0, color: '#dc2626' },
          { label: 'ÉLEVÉ',    val: stats.high     || 0, color: '#ea580c' },
          { label: 'MOYEN',    val: stats.medium   || 0, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2"
            style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
            <div className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.val}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
