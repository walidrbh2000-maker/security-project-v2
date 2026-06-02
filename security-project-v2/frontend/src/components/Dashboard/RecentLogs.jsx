import SeverityBadge from '../common/SeverityBadge';
function timeAgo(d) {
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}j`;
}
export default function RecentLogs({ logs = [] }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>🚨 Attaques Récentes</h3>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>10 dernières entrées</span>
      </div>
      <div className="overflow-x-auto">
        <table className="table-dark">
          <thead><tr><th>Type</th><th>Payload</th><th>Sévérité</th><th>Statut</th><th>IP</th><th>Temps</th></tr></thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>Aucun log</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} style={log.severity === 'CRITICAL' ? { background: 'rgba(26,0,0,0.6)' } : log.severity === 'HIGH' ? { background: 'rgba(26,15,0,0.5)' } : {}}>
                <td><SeverityBadge value={log.attack_type} /></td>
                <td><span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }} title={log.payload}>{log.payload ? log.payload.substring(0, 40) + (log.payload.length > 40 ? '…' : '') : '-'}</span></td>
                <td><SeverityBadge value={log.severity} /></td>
                <td><SeverityBadge value={log.status} /></td>
                <td><span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{log.ip_address}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{timeAgo(log.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
