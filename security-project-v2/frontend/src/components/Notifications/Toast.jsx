/**
 * Toast.jsx — Notifications temps réel (polling toutes les 10s)
 * Affiche un toast rouge si une nouvelle attaque CRITICAL est détectée.
 */
import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';

export default function ToastNotifications() {
  const [toasts, setToasts] = useState([]);
  const lastCheckRef = useRef(new Date().toISOString());

  const addToast = (attack) => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-4), { id, attack }]); // max 5 toasts
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    const poll = async () => {
      try {
        const { data } = await client.get('/logs/recent', {
          params: { since: lastCheckRef.current }
        });
        lastCheckRef.current = new Date().toISOString();

        const criticals = (data.attacks || []).filter(a => a.severity === 'CRITICAL');
        criticals.forEach(a => addToast(a));
      } catch { /* ignore */ }
    };

    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '360px' }}>
      {toasts.map(({ id, attack }) => (
        <div key={id} className="animate-slide-in"
          style={{
            background:   'rgba(220,38,38,0.95)',
            border:       '1px solid rgba(239,68,68,0.8)',
            borderRadius: '0.75rem',
            padding:      '0.75rem 1rem',
            backdropFilter: 'blur(12px)',
            boxShadow:    '0 4px 24px rgba(220,38,38,0.4)',
          }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <span className="text-xl">🚨</span>
              <div>
                <div className="text-sm font-bold text-white">
                  Attaque CRITIQUE détectée !
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  <span className="font-semibold">{attack.attack_type?.replace('_',' ')}</span>
                  {' '}sur <code style={{ color: '#fde047' }}>{attack.endpoint}</code>
                </div>
                {attack.payload && (
                  <div className="text-xs mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {attack.payload.substring(0, 50)}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => dismiss(id)}
              style={{ color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
