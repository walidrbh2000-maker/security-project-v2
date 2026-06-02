export function SeverityBadge({ value }) {
  const map = { CRITICAL:'badge badge-critical', HIGH:'badge badge-high', MEDIUM:'badge badge-medium', LOW:'badge badge-low', DETECTED:'badge badge-detected', BLOCKED:'badge badge-blocked', PASSED:'badge badge-passed', SQL_INJECTION:'badge badge-sqli', XSS:'badge badge-xss', CSRF:'badge badge-csrf', BRUTE_FORCE:'badge badge-brute', PATH_TRAVERSAL:'badge badge-path', OTHER:'badge badge-other' };
  const icons = { CRITICAL:'🔴', HIGH:'🟠', MEDIUM:'🟡', LOW:'🔵', DETECTED:'👁', BLOCKED:'🛡', PASSED:'✅', SQL_INJECTION:'💉', XSS:'⚡', CSRF:'🔄', BRUTE_FORCE:'🔨', PATH_TRAVERSAL:'📁', OTHER:'❓' };
  return <span className={map[value] || 'badge badge-other'}>{icons[value]} {(value||'').replace(/_/g,' ')}</span>;
}
export default SeverityBadge;
