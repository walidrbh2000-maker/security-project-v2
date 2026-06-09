import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

// ─── Calcul de la robustesse du mot de passe ──────────────────────────────────
const getPasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8)                        score++;
  if (pwd.length >= 12)                       score++;
  if (/[A-Z]/.test(pwd))                      score++;
  if (/[a-z]/.test(pwd))                      score++;
  if (/\d/.test(pwd))                         score++;
  if (/[^A-Za-z0-9]/.test(pwd))              score++;

  if (score <= 2) return { score, label: 'Faible',    color: '#ef4444' };
  if (score <= 4) return { score, label: 'Moyen',     color: '#f59e0b' };
  if (score <= 5) return { score, label: 'Fort',      color: '#10b981' };
  return           { score, label: 'Très fort',  color: '#00ff88' };
};

export default function Register() {
  const [form, setForm] = useState({
    username:        '',
    email:           '',
    password:        '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const { login }  = useAuth();
  const navigate   = useNavigate();

  const strength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const validate = () => {
    if (form.username.length < 3 || form.username.length > 30) {
      return 'Le nom d\'utilisateur doit contenir entre 3 et 30 caractères';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
      return 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores';
    }
    if (form.password.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      return 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
    }
    if (form.password !== form.confirmPassword) {
      return 'Les mots de passe ne correspondent pas';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return 'Adresse email invalide';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const payload = {
        username: form.username,
        password: form.password,
        ...(form.email ? { email: form.email } : {}),
      };
      const { data } = await client.post('/auth/register', payload);
      if (data.success) {
        login(data.user, data.token);
        navigate('/', { replace: true });
      } else {
        setError(data.error || 'Inscription échouée');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Inscription échouée';
      setError(msg);
    }
    setLoading(false);
  };

  // Indicateur visuel de robustesse (6 segments)
  const strengthBars = Array.from({ length: 6 }, (_, i) => (
    <div
      key={i}
      style={{
        flex: 1,
        height: '4px',
        borderRadius: '2px',
        background: i < strength.score ? strength.color : 'var(--border)',
        transition: 'background 0.2s',
      }}
    />
  ));

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Grille décorative */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,136,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md relative">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🛡️</div>
          <h1 className="text-4xl font-bold neon-text mb-1">SecLab</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Cybersecurity Research Platform v2
          </p>
          <div
            className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5',
            }}
          >
            ⚠️ Outil Éducatif — Pas pour la production
          </div>
        </div>

        {/* Formulaire */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Créer un compte
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom d'utilisateur */}
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Nom d'utilisateur <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                value={form.username}
                onChange={setField('username')}
                className="input-dark"
                placeholder="ex: john_doe"
                autoComplete="username"
                maxLength={30}
                required
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                3–30 caractères, lettres, chiffres et underscore uniquement
              </p>
            </div>

            {/* Email (optionnel) */}
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Email{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={setField('email')}
                className="input-dark"
                placeholder="votre@email.com"
                autoComplete="email"
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Mot de passe <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={setField('password')}
                className="input-dark"
                placeholder="Min. 8 caractères"
                autoComplete="new-password"
                required
              />
              {/* Indicateur de robustesse */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">{strengthBars}</div>
                  <p className="text-xs" style={{ color: strength.color }}>
                    Robustesse : {strength.label}
                  </p>
                </div>
              )}
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Au moins 8 caractères, une majuscule, une minuscule et un chiffre
              </p>
            </div>

            {/* Confirmation du mot de passe */}
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Confirmer le mot de passe <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={setField('confirmPassword')}
                className="input-dark"
                placeholder="Répétez votre mot de passe"
                autoComplete="new-password"
                required
              />
              {/* Correspondance en temps réel */}
              {form.confirmPassword && (
                <p
                  className="text-xs mt-1"
                  style={{
                    color: form.password === form.confirmPassword ? '#10b981' : '#ef4444',
                  }}
                >
                  {form.password === form.confirmPassword
                    ? '✓ Les mots de passe correspondent'
                    : '✗ Les mots de passe ne correspondent pas'}
                </p>
              )}
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="warning-banner text-xs">❌ {error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 text-sm font-semibold"
              style={{ marginTop: '1rem' }}
            >
              {loading ? '⏳ Création du compte...' : '🚀 Créer mon compte'}
            </button>
          </form>

          {/* Lien connexion */}
          <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
            Déjà un compte ?{' '}
            <Link
              to="/login"
              className="font-semibold hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Se connecter
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Projet de Licence — Sécurité Informatique
        </p>
      </div>
    </div>
  );
}
