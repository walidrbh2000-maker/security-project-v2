import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import StatsCard from '../components/Dashboard/StatsCard';
import { AttackBarChart, AttackPieChart } from '../components/Dashboard/AttackChart';
import RecentLogs from '../components/Dashboard/RecentLogs';
import ThreatLevel from '../components/Dashboard/ThreatLevel';
import GeoMap from '../components/Dashboard/GeoMap';
import Leaderboard from '../components/Dashboard/Leaderboard';

export default function Home() {
  const [stats,       setStats]       = useState(null);
  const [logs,        setLogs]        = useState([]);
  const [threatLevel, setThreatLevel] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [topIPs,      setTopIPs]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [statsRes, logsRes, threatRes, lbRes] = await Promise.all([
        client.get('/logs/stats'),
        client.get('/logs', { params: { limit: 10 } }),
        client.get('/logs/threat-level'),
        client.get('/logs/leaderboard'),
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data.data || []);
      setThreatLevel(threatRes.data);
      setLeaderboard(lbRes.data.byType || []);
      setTopIPs(lbRes.data.topIPs || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-3xl mb-3">⚙️</div>
          <div style={{ color: 'var(--text-muted)' }}>Chargement du dashboard...</div>
        </div>
      </div>
    );
  }

  const criticalCount = stats?.by_severity?.CRITICAL || 0;
  const blockedCount  = stats?.by_status?.BLOCKED     || 0;
  const detectedCount = stats?.by_status?.DETECTED    || 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Banner avertissement */}
      <div className="rounded-xl p-4 flex items-center justify-between"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-semibold text-sm" style={{ color: '#fca5a5' }}>Plateforme Pédagogique de Sécurité</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Les endpoints vulnérables sont <strong style={{ color: '#fcd34d' }}>intentionnels</strong>. Ne pas déployer sur un serveur public.
            </div>
          </div>
        </div>
        <button onClick={fetchData} className="btn btn-ghost text-xs">🔄 Actualiser</button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon="🎯" label="Total Attaques"      value={stats?.total || 0}  subtitle="Toutes périodes" color="#ef4444" />
        <StatsCard icon="🚨" label="Critique"            value={criticalCount}       subtitle="Sévérité maximale" color="#dc2626" />
        <StatsCard icon="🛡️" label="Bloquées"           value={blockedCount}        subtitle="Arrêtées avec succès" color="#00ff88" />
        <StatsCard icon="👁️" label="Détectées"          value={detectedCount}       subtitle="Journalisées" color="#f59e0b" />
      </div>

      {/* Attack type breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { key: 'SQL_INJECTION',  icon: '💉', color: '#ef4444', to: '/sqli'          },
          { key: 'XSS',            icon: '⚡', color: '#f59e0b', to: '/xss'           },
          { key: 'CSRF',           icon: '🔄', color: '#3b82f6', to: '/csrf'          },
          { key: 'BRUTE_FORCE',    icon: '🔨', color: '#8b5cf6', to: '/brute-force'   },
          { key: 'PATH_TRAVERSAL', icon: '📁', color: '#06b6d4', to: '/path-traversal'},
          { key: 'OTHER',          icon: '❓', color: '#64748b', to: '/logs'          },
        ].map(({ key, icon, color, to }) => (
          <div key={key} className="card cursor-pointer hover:scale-105 transition-transform"
            style={{ borderTop: `2px solid ${color}` }}
            onClick={() => navigate(to)}>
            <div className="text-xl font-bold font-mono" style={{ color }}>
              {stats?.by_type?.[key] || 0}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {icon} {key.replace('_', ' ')}
            </div>
          </div>
        ))}
      </div>

      {/* Threat Level + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1">
          <ThreatLevel
            level={threatLevel?.level}
            score={threatLevel?.score}
            stats={threatLevel?.stats}
          />
        </div>
        <div className="lg:col-span-2">
          <AttackBarChart data={stats?.by_day || []} />
        </div>
        <div className="lg:col-span-1">
          <AttackPieChart data={stats?.by_type || {}} />
        </div>
      </div>

      {/* Geo Map + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GeoMap topIPs={topIPs} />
        <Leaderboard data={leaderboard} />
      </div>

      {/* Recent Logs */}
      <RecentLogs logs={logs} />

      {/* Navigation rapide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to: '/sqli',           icon: '💉', title: 'SQL Injection Lab',      desc: 'UNION attacks, auth bypass, blind SQLi', color: '#ef4444' },
          { to: '/xss',            icon: '⚡', title: 'XSS Attack Lab',         desc: 'Reflected & stored XSS',                color: '#f59e0b' },
          { to: '/csrf',           icon: '🔄', title: 'CSRF Lab',               desc: 'Virement fictif avec/sans protection',   color: '#3b82f6' },
          { to: '/brute-force',    icon: '🔨', title: 'Brute Force Lab',        desc: 'Account lockout après 5 tentatives',     color: '#8b5cf6' },
          { to: '/path-traversal', icon: '📁', title: 'Path Traversal Lab',     desc: '../../etc/passwd vs whitelist jail',     color: '#06b6d4' },
          { to: '/logs',           icon: '📋', title: 'Attack Log Viewer',      desc: 'Filtres, export CSV, timeline',          color: '#64748b' },
        ].map(card => (
          <button key={card.to} onClick={() => navigate(card.to)}
            className="card text-left hover:scale-[1.02] transition-all"
            style={{ borderTop: `2px solid ${card.color}`, cursor: 'pointer' }}>
            <div className="flex items-start gap-3">
              <span className="text-3xl">{card.icon}</span>
              <div>
                <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{card.title}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
