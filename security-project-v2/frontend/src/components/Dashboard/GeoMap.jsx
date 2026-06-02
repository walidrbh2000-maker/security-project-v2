/**
 * GeoMap.jsx — Carte géographique fictive des IPs attaquantes
 * Utilise des coordonnées hardcodées pour les IPs du seed data.
 * Rendu SVG pur — pas de dépendance externe.
 */

// Mapping IP → localisation géographique approximative (démo)
const IP_LOCATIONS = {
  '192.168.1.100': { city: 'Paris',       lat: 48.85,  lon: 2.35,  country: 'FR' },
  '10.0.0.15':     { city: 'Berlin',      lat: 52.52,  lon: 13.40, country: 'DE' },
  '172.16.0.50':   { city: 'Londres',     lat: 51.50,  lon: -0.12, country: 'GB' },
  '192.168.1.200': { city: 'Madrid',      lat: 40.41,  lon: -3.70, country: 'ES' },
  '10.10.10.5':    { city: 'Amsterdam',   lat: 52.37,  lon: 4.90,  country: 'NL' },
  '192.168.1.101': { city: 'Rome',        lat: 41.90,  lon: 12.49, country: 'IT' },
  '10.0.0.20':     { city: 'Moscou',      lat: 55.75,  lon: 37.61, country: 'RU' },
  '172.16.0.60':   { city: 'Istanbul',    lat: 41.01,  lon: 28.97, country: 'TR' },
  '192.168.100.1': { city: 'Alger',       lat: 36.73,  lon: 3.08,  country: 'DZ' },
  '10.0.0.30':     { city: 'Tunis',       lat: 36.81,  lon: 10.17, country: 'TN' },
  '172.16.0.70':   { city: 'Le Caire',    lat: 30.04,  lon: 31.23, country: 'EG' },
  '192.168.1.103': { city: 'Dubaï',       lat: 25.20,  lon: 55.27, country: 'AE' },
  '10.0.0.35':     { city: 'Téhéran',     lat: 35.69,  lon: 51.42, country: 'IR' },
  '192.168.1.104': { city: 'Karachi',     lat: 24.86,  lon: 67.01, country: 'PK' },
  '10.0.0.40':     { city: 'Mumbai',      lat: 19.07,  lon: 72.87, country: 'IN' },
  '172.16.0.80':   { city: 'Shanghai',    lat: 31.23,  lon: 121.47,country: 'CN' },
  '10.0.0.50':     { city: 'Tokyo',       lat: 35.68,  lon: 139.69,country: 'JP' },
  '192.168.1.106': { city: 'Sydney',      lat: -33.86, lon: 151.20,country: 'AU' },
  '172.16.0.90':   { city: 'São Paulo',   lat: -23.54, lon: -46.63,country: 'BR' },
  '192.168.200.1': { city: 'New York',    lat: 40.71,  lon: -74.00,country: 'US' },
  '10.0.0.45':     { city: 'Los Angeles', lat: 34.05,  lon: -118.24,country:'US' },
  '192.168.1.105': { city: 'Toronto',     lat: 43.65,  lon: -79.38,country: 'CA' },
  '10.20.30.40':   { city: 'Mexico',      lat: 19.43,  lon: -99.13,country: 'MX' },
  '192.168.3.1':   { city: 'Buenos Aires',lat: -34.60, lon: -58.38,country: 'AR' },
};

// Projection équirectangulaire → SVG (viewBox 0 0 800 400)
const project = (lat, lon) => {
  const x = ((lon + 180) / 360) * 800;
  const y = ((90 - lat) / 180) * 400;
  return { x, y };
};

export default function GeoMap({ topIPs = [] }) {
  // Construire la liste des points à afficher
  const points = Object.entries(IP_LOCATIONS).map(([ip, loc]) => ({
    ip,
    ...loc,
    ...project(loc.lat, loc.lon),
    isTop: topIPs.some(t => t.ip_address === ip),
    count: topIPs.find(t => t.ip_address === ip)?.count || 1,
  }));

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          🗺️ Carte des Attaquants (fictif)
        </h3>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {points.length} sources détectées
        </span>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', background: '#0a1628' }}>
        <svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Fond ocean */}
          <rect width="800" height="400" fill="#0a1628" />

          {/* Grille de coordonnées */}
          {[-60, -30, 0, 30, 60].map(lat => {
            const { y } = project(lat, 0);
            return <line key={lat} x1="0" x2="800" y1={y} y2={y} stroke="#1a2a4a" strokeWidth="0.5" />;
          })}
          {[-120, -60, 0, 60, 120].map(lon => {
            const { x } = project(0, lon);
            return <line key={lon} x1={x} x2={x} y1="0" y2="400" stroke="#1a2a4a" strokeWidth="0.5" />;
          })}

          {/* Continents simplifiés (polygones approximatifs) */}
          {/* Europe */}
          <polygon points="370,80 420,70 440,90 430,120 400,130 370,120 355,100" fill="#162032" stroke="#1a2a4a" strokeWidth="0.5" />
          {/* Afrique */}
          <polygon points="370,130 420,125 440,160 435,220 400,250 365,220 355,170" fill="#162032" stroke="#1a2a4a" strokeWidth="0.5" />
          {/* Asie */}
          <polygon points="440,70 560,60 600,80 590,130 540,150 480,140 440,120" fill="#162032" stroke="#1a2a4a" strokeWidth="0.5" />
          {/* Amérique du Nord */}
          <polygon points="100,80 200,70 230,100 220,160 180,170 130,150 90,120" fill="#162032" stroke="#1a2a4a" strokeWidth="0.5" />
          {/* Amérique du Sud */}
          <polygon points="160,180 220,175 235,220 215,280 185,300 160,270 145,220" fill="#162032" stroke="#1a2a4a" strokeWidth="0.5" />
          {/* Australie */}
          <polygon points="600,240 670,230 690,260 675,290 630,295 600,275" fill="#162032" stroke="#1a2a4a" strokeWidth="0.5" />

          {/* Points d'attaque */}
          {points.map(p => (
            <g key={p.ip}>
              {/* Anneau de pulsation pour les top attaquants */}
              {p.isTop && (
                <circle cx={p.x} cy={p.y} r={12} fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.4">
                  <animate attributeName="r" values="8;18;8" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={p.x} cy={p.y} r={p.isTop ? 5 : 3}
                fill={p.isTop ? '#ef4444' : '#f59e0b'}
                stroke={p.isTop ? '#fca5a5' : '#fcd34d'}
                strokeWidth="1"
                style={{ cursor: 'pointer' }}>
                <title>{p.city} ({p.country}) — IP: {p.ip}</title>
              </circle>
            </g>
          ))}

          {/* Légende */}
          <g transform="translate(10,370)">
            <circle cx="8" cy="0" r="5" fill="#ef4444" stroke="#fca5a5" strokeWidth="1" />
            <text x="18" y="4" fill="#94a3b8" fontSize="10">Top attaquants</text>
            <circle cx="108" cy="0" r="3" fill="#f59e0b" stroke="#fcd34d" strokeWidth="1" />
            <text x="118" y="4" fill="#94a3b8" fontSize="10">Autres sources</text>
          </g>
        </svg>
      </div>

      {/* Top IPs */}
      {topIPs.length > 0 && (
        <div className="mt-3 space-y-1">
          {topIPs.slice(0, 3).map((t, i) => {
            const loc = IP_LOCATIONS[t.ip_address];
            return (
              <div key={t.ip_address} className="flex items-center justify-between text-xs"
                style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: i === 0 ? '#ef4444' : i === 1 ? '#f59e0b' : '#64748b' }}>
                    #{i + 1}
                  </span>
                  <code style={{ color: 'var(--text-primary)' }}>{t.ip_address}</code>
                  {loc && <span>({loc.city}, {loc.country})</span>}
                </div>
                <span style={{ color: '#fca5a5' }}>{t.count} attaques</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
