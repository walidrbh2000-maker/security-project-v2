import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import SeverityBadge from '../components/common/SeverityBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ATTACK_TYPES = ['', 'SQL_INJECTION', 'XSS', 'CSRF', 'BRUTE_FORCE', 'PATH_TRAVERSAL', 'OTHER'];
const STATUSES     = ['', 'DETECTED', 'BLOCKED', 'PASSED'];
const SEVERITIES   = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function formatDate(str) {
  return new Date(str).toLocaleString('fr-FR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/**
 * Génère et télécharge un fichier CSV à partir des logs.
 */
function exportToCSV(logs) {
  const headers = ['ID', 'Type', 'Severity', 'Status', 'Endpoint', 'IP', 'Payload', 'Date'];
  const rows = logs.map(l => [
    l.id,
    l.attack_type,
    l.severity,
    l.status,
    l.endpoint,
    l.ip_address,
    `"${(l.payload || '').replace(/"/g, '""')}"`,
    new Date(l.created_at).toISOString(),
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `seclab-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AttackLogs() {
  const [logs,       setLogs]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [stats,      setStats]      = useState(null);
  const [zoomedDay,  setZoomedDay]  = useState(null);

  const [filterType,     setFilterType]     = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [allLogs,        setAllLogs]        = useState([]);

  const fetchLogs = useCallback(async (p = 1, opts = {}) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (filterType)     params.type     = filterType;
      if (filterStatus)   params.status   = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;
      if (searchQuery)    params.search   = searchQuery;
      if (opts.date)      params.search   = opts.date;

      const { data } = await client.get('/logs', { params });
      setLogs(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch (err) {
      console.error('Logs fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, filterSeverity, searchQuery]);

  const fetchAllForExport = async () => {
    try {
      const params = { page: 1, limit: 500 };
      if (filterType)     params.type     = filterType;
      if (filterStatus)   params.status   = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;
      if (searchQuery)    params.search   = searchQuery;
      const { data } = await client.get('/logs', { params });
      exportToCSV(data.data || []);
    } catch { /* ignore */ }
  };

  const fetchStats = async () => {
    try {
      const { data } = await client.get('/logs/stats');
      setStats(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchLogs(1); fetchStats(); }, [filterType, filterStatus, filterSeverity, searchQuery]);

  const handleBarClick = (data) => {
    if (!data?.activePayload?.[0]) return;
    const day = data.activePayload[0]?.payload?.date;
    if (!day) return;
    setZoomedDay(day);
    fetchLogs(1, { date: day });
  };

  const clearZoom = () => {
    setZoomedDay(null);
    fetchLogs(1);
  };

  const handleReset = async () => {
    if (!confirm('Réinitialiser les logs ?')) return;
    await client.delete('/logs');
    fetchLogs(1);
    fetchStats();
  };

  const rowBg = (sev) => {
    if (sev === 'CRITICAL') return 'rgba(26,0,0,0.5)';
    if (sev === 'HIGH')     return 'rgba(26,15,0,0.4)';
    return '';
  };

  const tooltipStyle = { backgroundColor: '#0d1526', border: '1px solid #1a2a4a', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>📋 Attack Log Viewer</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{total.toLocaleString()} événements enregistrés</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAllForExport} className="btn btn-ghost text-xs">📥 Export CSV</button>
          <button onClick={() => fetchLogs(page)} className="btn btn-ghost text-xs">🔄 Actualiser</button>
          <button onClick={handleReset} className="btn btn-danger text-xs">🗑️ Reset</button>
        </div>
      </div>

      {/* Timeline cliquable */}
      {stats?.by_day && stats.by_day.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              📈 Timeline — cliquez une barre pour zoomer
            </span>
            {zoomedDay && (
              <button onClick={clearZoom} className="btn btn-ghost text-xs py-0.5">
                ✕ Zoom : {zoomedDay}
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={stats.by_day} onClick={handleBarClick} style={{ cursor: 'pointer' }}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2a4a" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(59,130,246,0.1)' }} />
              <Bar dataKey="SQL_INJECTION" stackId="a" fill="#ef4444" name="SQLi" />
              <Bar dataKey="XSS"           stackId="a" fill="#f59e0b" name="XSS" />
              <Bar dataKey="CSRF"          stackId="a" fill="#3b82f6" name="CSRF" />
              <Bar dataKey="BRUTE_FORCE"   stackId="a" fill="#8b5cf6" name="Brute" />
              <Bar dataKey="PATH_TRAVERSAL" stackId="a" fill="#06b6d4" name="Path" />
              <Bar dataKey="OTHER"         stackId="a" fill="#64748b" name="Other" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filtres */}
      <div className="card flex flex-wrap gap-3 items-center">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>🔍 Filtres :</span>

        {/* Recherche full-text */}
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="input-dark text-xs" style={{ width: '200px', padding: '0.35rem 0.75rem' }}
          placeholder="Recherche dans les payloads..." />

        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="input-dark text-xs" style={{ width: 'auto', padding: '0.35rem 0.75rem' }}>
          {ATTACK_TYPES.map(t => <option key={t} value={t}>{t || 'Tous types'}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="input-dark text-xs" style={{ width: 'auto', padding: '0.35rem 0.75rem' }}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'Tous statuts'}</option>)}
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
          className="input-dark text-xs" style={{ width: 'auto', padding: '0.35rem 0.75rem' }}>
          {SEVERITIES.map(s => <option key={s} value={s}>{s || 'Toutes sévérités'}</option>)}
        </select>

        {(filterType || filterStatus || filterSeverity || searchQuery) && (
          <button onClick={() => { setFilterType(''); setFilterStatus(''); setFilterSeverity(''); setSearchQuery(''); clearZoom(); }}
            className="btn btn-ghost text-xs py-1">✕ Effacer</button>
        )}
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{total} résultats</span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div style={{ color: 'var(--text-muted)' }}>⏳ Chargement...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>ID</th><th>Type</th><th>Payload</th><th>Endpoint</th>
                  <th>IP</th><th>Pts</th><th>Sévérité</th><th>Statut</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                    Aucun log ne correspond aux filtres
                  </td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} style={{ background: rowBg(log.severity), cursor: 'pointer' }}
                    onClick={() => setSelected(selected?.id === log.id ? null : log)}>
                    <td><span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>#{log.id}</span></td>
                    <td><SeverityBadge value={log.attack_type} /></td>
                    <td>
                      <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', maxWidth: '180px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={log.payload}>
                        {log.payload ? log.payload.substring(0, 40) + (log.payload.length > 40 ? '…' : '') : '—'}
                      </span>
                    </td>
                    <td><code className="text-xs" style={{ color: '#93c5fd' }}>{log.endpoint}</code></td>
                    <td><span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{log.ip_address}</span></td>
                    <td><span className="font-mono text-xs font-bold" style={{ color: '#f59e0b' }}>{log.points || 0}</span></td>
                    <td><SeverityBadge value={log.severity} /></td>
                    <td><SeverityBadge value={log.status} /></td>
                    <td><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(log.created_at)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail panel */}
        {selected && (
          <div className="border-t p-4 animate-slide-in"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-tertiary)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                🔎 Événement #{selected.id}
              </div>
              <button onClick={() => setSelected(null)} className="btn btn-ghost text-xs py-1">✕</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
              {[
                { label: 'Type',     value: selected.attack_type },
                { label: 'Sévérité', value: selected.severity    },
                { label: 'Statut',   value: selected.status      },
                { label: 'IP',       value: selected.ip_address  },
                { label: 'Points',   value: `${selected.points || 0} pts` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                  {['Type','Sévérité','Statut'].includes(label)
                    ? <SeverityBadge value={value} />
                    : <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{value}</span>}
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Payload</div>
              <pre className="p-3 rounded text-xs overflow-x-auto"
                style={{ background: 'rgba(0,0,0,0.3)', color: '#fca5a5', fontFamily: 'monospace', border: '1px solid rgba(239,68,68,0.2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selected.payload || '(aucun payload)'}
              </pre>
            </div>
            <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Endpoint : <code style={{ color: '#93c5fd' }}>{selected.endpoint}</code>
              &nbsp;·&nbsp;{formatDate(selected.created_at)}
              {selected.user_agent && <>&nbsp;·&nbsp;<span title={selected.user_agent}>UA connu</span></>}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page} / {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)} className="btn btn-ghost text-xs py-1.5">← Préc.</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button key={p} onClick={() => fetchLogs(p)} className="btn text-xs py-1.5 px-3"
                  style={p === page
                    ? { background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.4)' }
                    : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {p}
                </button>
              );
            })}
            <button disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)} className="btn btn-ghost text-xs py-1.5">Suiv. →</button>
          </div>
        </div>
      )}
    </div>
  );
}
