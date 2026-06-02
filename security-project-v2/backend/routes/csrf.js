/**
 * routes/csrf.js — Module de démonstration CSRF
 *
 * POST /api/csrf/transfer-vulnerable  ⚠️  Pas de token CSRF — forgeable
 * POST /api/csrf/transfer-secure      ✅  Double-submit cookie pattern
 * GET  /api/csrf/token                ✅  Génère un token CSRF pour le client
 * GET  /api/csrf/account              ✅  Solde fictif du compte
 */
'use strict';

const router = require('express').Router();
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { logAttackToDB } = require('../middleware/attackDetector');

// ─── Store en mémoire des tokens CSRF valides ─────────────────────────────────
// Clé = userId, Valeur = { token, expiresAt }
const csrfTokenStore = new Map();

// Soldes fictifs pour la démo
const accountBalances = new Map();
const getBalance = (userId) => accountBalances.get(userId) || 10000;
const setBalance = (userId, bal) => accountBalances.set(userId, bal);

/**
 * Génère et stocke un token CSRF pour un utilisateur.
 * @param {number} userId
 * @returns {string} token
 */
const generateCsrfToken = (userId) => {
  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes
  csrfTokenStore.set(String(userId), { token, expiresAt });
  return token;
};

/**
 * Valide un token CSRF soumis vs celui stocké pour l'utilisateur.
 * @param {number} userId
 * @param {string} submittedToken
 * @returns {boolean}
 */
const validateCsrfToken = (userId, submittedToken) => {
  const entry = csrfTokenStore.get(String(userId));
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    csrfTokenStore.delete(String(userId));
    return false;
  }
  // Comparaison en temps constant pour éviter les timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(entry.token, 'hex'),
    Buffer.from(submittedToken || '', 'hex').slice(0, 32)
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/csrf/token
// ✅ Retourne un token CSRF pour le formulaire sécurisé
// ─────────────────────────────────────────────────────────────────────────────
router.get('/token', requireAuth, (req, res) => {
  const token = generateCsrfToken(req.user.id);
  return res.json({
    csrfToken: token,
    expiresIn: 1800,
    note:      '✅ Include this token in X-CSRF-Token header or _csrf field',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/csrf/account
// ✅ Retourne le solde fictif de l'utilisateur
// ─────────────────────────────────────────────────────────────────────────────
router.get('/account', requireAuth, (req, res) => {
  return res.json({
    userId:   req.user.id,
    username: req.user.username,
    balance:  getBalance(req.user.id),
    currency: 'DZD',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/csrf/transfer-vulnerable
// ⚠️ VULNERABLE : aucune vérification d'origine ou de token CSRF
//
// Scénario d'attaque :
//   Un site malveillant héberge un formulaire HTML qui soumet en POST vers
//   cette URL. Le navigateur de la victime (authentifiée) envoie
//   automatiquement le cookie de session → transfert exécuté à son insu.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/transfer-vulnerable', requireAuth, async (req, res) => {
  const { amount, to } = req.body;
  const userId = req.user.id;

  // ⚠️ VULNERABLE : on accepte la requête sans vérifier son origine
  if (!amount || !to || isNaN(Number(amount))) {
    return res.status(400).json({ error: 'Invalid transfer parameters' });
  }

  const transferAmount = Math.abs(Number(amount));
  const currentBalance = getBalance(userId);

  if (transferAmount > currentBalance) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }

  setBalance(userId, currentBalance - transferAmount);

  // Logger comme attaque CSRF détectée
  await logAttackToDB({
    type:      'CSRF',
    payload:   `Transfer ${transferAmount} DZD to ${to}`,
    endpoint:  '/api/csrf/transfer-vulnerable',
    ip:        req.ip,
    userAgent: req.get('User-Agent'),
    status:    'DETECTED',
    severity:  'HIGH',
  });

  return res.json({
    vulnerable:  true,
    success:     true,
    message:     '⚠️ Transfer executed WITHOUT CSRF protection!',
    transferred: transferAmount,
    to,
    newBalance:  getBalance(userId),
    warning:     '⚠️ This transfer could have been initiated by any malicious website!',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/csrf/transfer-secure
// ✅ SECURE : double-submit cookie pattern
//   1. Le client obtient un token via GET /api/csrf/token
//   2. Il l'inclut dans l'en-tête X-CSRF-Token
//   3. Le serveur valide le token avant toute action
// ─────────────────────────────────────────────────────────────────────────────
router.post('/transfer-secure', requireAuth, async (req, res) => {
  const { amount, to } = req.body;
  const userId         = req.user.id;

  // ✅ SECURE : vérification du token CSRF
  const submittedToken = req.headers['x-csrf-token'] || req.body._csrf;

  if (!submittedToken) {
    await logAttackToDB({
      type:      'CSRF',
      payload:   'Missing CSRF token',
      endpoint:  '/api/csrf/transfer-secure',
      ip:        req.ip,
      userAgent: req.get('User-Agent'),
      status:    'BLOCKED',
      severity:  'MEDIUM',
    });
    return res.status(403).json({
      vulnerable: false,
      error:      'ERR_MISSING_CSRF_TOKEN',
      message:    '🛡️ CSRF token required. Request blocked.',
    });
  }

  const isValid = validateCsrfToken(userId, submittedToken);
  if (!isValid) {
    await logAttackToDB({
      type:      'CSRF',
      payload:   'Invalid CSRF token',
      endpoint:  '/api/csrf/transfer-secure',
      ip:        req.ip,
      userAgent: req.get('User-Agent'),
      status:    'BLOCKED',
      severity:  'HIGH',
    });
    return res.status(403).json({
      vulnerable: false,
      error:      'ERR_INVALID_CSRF_TOKEN',
      message:    '🛡️ Invalid or expired CSRF token. Request blocked.',
    });
  }

  // Token valide — exécuter le transfert
  const transferAmount = Math.abs(Number(amount) || 0);
  const currentBalance = getBalance(userId);

  if (transferAmount > currentBalance) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }

  setBalance(userId, currentBalance - transferAmount);

  // Invalider le token après usage (one-time use)
  csrfTokenStore.delete(String(userId));

  return res.json({
    vulnerable:  false,
    success:     true,
    message:     '✅ Transfer executed with CSRF protection',
    transferred: transferAmount,
    to,
    newBalance:  getBalance(userId),
  });
});

module.exports = router;
