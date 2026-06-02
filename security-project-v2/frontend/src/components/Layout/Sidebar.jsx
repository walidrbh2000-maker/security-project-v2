import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';

const NAV_SECTIONS = [
  {
    label: 'Dashboard',
    items: [
      { to: '/',      icon: '📊', label: 'Dashboard'  },
      { to: '/logs',  icon: '📋', label: 'Attack Logs' },
    ],
  },
  {
    label: 'Laboratoires',
    items: [
      { to: '/sqli',            icon: '💉', label: 'SQL Injection'   },
      { to: '/xss',             icon: '⚡', label: 'XSS Attacks'     },
      { to: '/csrf',            icon: '🔄', label: 'CSRF'            },
      { to: '/brute-force',     icon: '🔨', label: 'Brute Force'     },
      { to: '/path-traversal',  icon: '📁', label: 'Path Traversal'  },
    ],
  },
  {
    label: 'Compte',
    items: [
      { to: '/profile', icon: '👤', label: 'Mon Profil' },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  const handleLogout = async () => {
    try { await client.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  return (
    <aside className="flex flex-col w-60 shrink-0 h-screen overflow-y-auto"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-2xl">🛡️</span>
        <div>
          <span className="text-xl font-bold neon-text">SecLab</span>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>v2.0 · Security Research</div>
        </div>
      </div>

      {/* Navigation par sections */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}>
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map(({ to, icon, label }) => (
                <NavLink key={to} to={to} end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                     ${isActive ? 'text-white border-l-2' : 'hover:bg-[#162032]'}`
                  }
                  style={({ isActive }) => isActive
                    ? { color: 'var(--neon-green)', background: 'rgba(0,255,136,0.06)', borderLeftColor: 'var(--neon-green)' }
                    : { color: 'var(--text-muted)', borderLeft: '2px solid transparent' }
                  }>
                  <span className="text-base">{icon}</span>
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* Avertissement éducatif */}
        <div className="mx-1 p-3 rounded-lg text-xs"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd' }}>
          <div className="font-semibold mb-1">⚠️ Outil Éducatif</div>
          <div style={{ color: 'var(--text-muted)' }}>
            Endpoints vulnérables intentionnels. Ne pas exposer sur internet.
          </div>
        </div>
      </nav>

      {/* Utilisateur */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'rgba(0,255,136,0.15)', color: 'var(--neon-green)' }}>
            {user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.username || 'Inconnu'}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {user?.role || 'user'}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full btn btn-ghost text-xs py-1.5">
          🚪 Déconnexion
        </button>
      </div>
    </aside>
  );
}
