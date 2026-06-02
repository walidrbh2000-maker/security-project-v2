import { useEffect, useState } from 'react';
export default function StatsCard({ icon, label, value, subtitle, color = '#3b82f6' }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (!value && value !== 0) return;
    let start = 0;
    const end = parseInt(value, 10);
    if (isNaN(end)) { setDisplayed(value); return; }
    const step = Math.max(1, Math.floor(end / (800 / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplayed(end); clearInterval(timer); }
      else setDisplayed(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return (
    <div className="card flex items-start gap-4 hover:scale-[1.02] transition-transform duration-200" style={{ borderTop: `2px solid ${color}` }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `${color}18` }}>{icon}</div>
      <div className="min-w-0">
        <div className="text-3xl font-bold font-mono" style={{ color }}>{displayed.toLocaleString()}</div>
        <div className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {subtitle && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
      </div>
    </div>
  );
}
