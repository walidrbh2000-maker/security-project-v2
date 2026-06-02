/**
 * Leaderboard.jsx — Classement des attaques par type (cette semaine)
 */
const TYPE_ICONS = {
  SQL_INJECTION: '💉',
  XSS:           '⚡',
  CSRF:          '🔄',
  BRUTE_FORCE:   '🔨',
  PATH_TRAVERSAL:'📁',
  OTHER:         '❓',
};
const TYPE_COLORS = {
  SQL_INJECTION: '#ef4444',
  XSS:           '#f59e0b',
  CSRF:          '#3b82f6',
  BRUTE_FORCE:   '#8b5cf6',
  PATH_TRAVERSAL:'#06b6d4',
  OTHER:         '#64748b',
};

export default function Leaderboard({ data = [] }) {
  const max = data.length > 0 ? Math.max(...data.map(d => d.totalPoints || 0)) : 1;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          🏆 Classement — 7 derniers jours
        </h3>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>par points de menace</span>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)' }}>Aucune donnée</div>
      ) : (
        <div className="space-y-3">
          {data.map((item, i) => {
            const type  = item.attack_type;
            const color = TYPE_COLORS[type] || '#64748b';
            const icon  = TYPE_ICONS[type]  || '❓';
            const pct   = max > 0 ? ((item.totalPoints || 0) / max) * 100 : 0;

            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold" style={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--text-muted)', minWidth: '1rem' }}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                    </span>
                    <span>{icon}</span>
                    <span style={{ color: color }}>{type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{item.count} attaques</span>
                    <span className="font-mono font-bold" style={{ color }}>{item.totalPoints} pts</span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
