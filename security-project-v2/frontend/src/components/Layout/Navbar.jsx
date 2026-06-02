import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import client from '../../api/client';

const PAGE_TITLES = {
  '/':               { title: 'Dashboard',       icon: '📊', subtitle: 'Surveillance des attaques en temps réel' },
  '/sqli':           { title: 'SQL Injection',   icon: '💉', subtitle: 'Bypass auth & extraction de données' },
  '/xss':            { title: 'XSS Attacks',     icon: '⚡', subtitle: 'Cross-site scripting demonstrations' },
  '/logs':           { title: 'Attack Logs',     icon: '📋', subtitle: 'Journaux & analytics des attaques' },
  '/csrf':           { title: 'CSRF',            icon: '🔄', subtitle: 'Cross-Site Request Forgery — virement fictif' },
  '/brute-force':    { title: 'Brute Force',     icon: '🔨', subtitle: 'Account lockout après 5 tentatives' },
  '/path-traversal': { title: 'Path Traversal',  icon: '📁', subtitle: 'LFI — lecture de fichiers arbitraires' },
  '/profile':        { title: 'Mon Profil',      icon: '👤', subtitle: 'Paramètres du compte et sécurité' },
};

export default function Navbar() {
  const { pathname } = useLocation();
  const info = PAGE_TITLES[pathname] || PAGE_TITLES['/'];
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-3 shrink-0"
      style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3">
        <span className="text-xl">{info.icon}</span>
        <div>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{info.title}</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{info.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          <span className="pulse-dot" /> LIVE
        </div>
        <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {time.toLocaleTimeString('fr-FR')}
        </div>
        <ApiStatus />
      </div>
    </header>
  );
}

function ApiStatus() {
  const [status, setStatus] = useState('checking');
  useEffect(() => {
    const check = async () => {
      try { await client.get('/health'); setStatus('online'); }
      catch { setStatus('offline'); }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
      <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-400' : status === 'offline' ? 'bg-red-400' : 'bg-yellow-400'}`} />
      API {status}
    </div>
  );
}
