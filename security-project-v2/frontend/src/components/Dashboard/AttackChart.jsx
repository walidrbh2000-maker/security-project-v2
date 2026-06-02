import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
const COLORS = { SQL_INJECTION: '#ef4444', XSS: '#f59e0b', CSRF: '#3b82f6', BRUTE_FORCE: '#8b5cf6', PATH_TRAVERSAL: '#06b6d4', OTHER: '#64748b' };
const ts = { backgroundColor: '#0d1526', border: '1px solid #1a2a4a', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' };
export function AttackBarChart({ data = [] }) {
  const fmt = data.map(d => ({ ...d, date: new Date(d.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }) }));
  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>📈 Attaques — 7 derniers jours</h3>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Cumulé par type</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={fmt} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2a4a" />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
          <Tooltip contentStyle={ts} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
          {Object.entries(COLORS).map(([key, color]) => (
            <Bar key={key} dataKey={key} stackId="a" fill={color} name={key.replace(/_/g, ' ')} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function AttackPieChart({ data = {} }) {
  const pieData = Object.entries(data).filter(([,v]) => v > 0).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value, key: name }));
  const RADIAN = Math.PI / 180;
  const label = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    return <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>{`${(percent * 100).toFixed(0)}%`}</text>;
  };
  return (
    <div className="card h-full">
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>🥧 Distribution</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} dataKey="value" labelLine={false} label={label}>
            {pieData.map(e => <Cell key={e.key} fill={COLORS[e.key] || '#64748b'} stroke="none" />)}
          </Pie>
          <Tooltip contentStyle={ts} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
