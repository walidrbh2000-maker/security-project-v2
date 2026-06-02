/**
 * routes/bruteForce.js — Module Brute Force / Account Lockout
 *
 * POST /api/brute/login-vulnerable  ⚠️  Pas de protection — tentatives illimitées
 * POST /api/brute/login-secure      ✅  Lockout après 5 tentatives (3 minutes)
 * GET  /api/brute/status/:username  ✅  Statut de verrouillage d'un compte
 * POST /api/brute/reset             ✅  Reset le compteur (helper de démo)
 */
'use strict';

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { pool }          = require('../config/db');
const { logAttackToDB } = require('../middleware/attackDetector');

// ─── Store en mémoire des tentatives de connexion ─────────────────────────────
// Clé = username, Valeur = { attempts, lastAttempt, lockedUntil }
const loginAttempts = new Map();

const MAX_ATTEMPTS   = 5;
const LOCKOUT_PERIOD = 3 * 60 * 1000; // 3 minutes

/**
 * Récupère ou initialise les données de tentatives pour un utilisateur.
 * @param {string} username
 * @returns {{ attempts: number, lastAttempt: number, lockedUntil: number|null }}
 */
const getAttemptData = (username) => {
  const key   = username.toLowerCase();
  const entry = loginAttempts.get(key);
  if (!entry) {
    const fresh = { attempts: 0, lastAttempt: null, lockedUntil: null };
    loginAttempts.set(key, fresh);
    return fresh;
  }
  return entry;
};

/**
 * Incrémente le compteur de tentatives et verrouille si dépassement.
 * @param {string} username
 * @returns {{ attempts: number, lockedUntil: number|null }}
 */
const recordFailedAttempt = (username) => {
  const key  = username.toLowerCase();
  const data = getAttemptData(username);

  data.attempts++;
  data.lastAttempt = Date.now();

  if (data.attempts >= MAX_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCKOUT_PERIOD;
  }

  loginAttempts.set(key, data);
  return data;
};

/**
 * Remet à zéro les tentatives après un succès.
 * @param {string} username
 */
const resetAttempts = (username) => {
  loginAttempts.delete(username.toLowerCase());
};

/**
 * Vérifie si un compte est actuellement verrouillé.
 * @param {string} username
 * @returns {{ locked: boolean, remainingSeconds: number }}
 */
const isLocked = (username) => {
  const data = getAttemptData(username);
  if (!data.lockedUntil) return { locked: false, remainingSeconds: 0 };

  const remaining = data.lockedUntil - Date.now();
  if (remaining <= 0) {
    // Déverrouillage automatique
    data.lockedUntil = null;
    data.attempts    = 0;
    loginAttempts.set(username.toLowerCase(), data);
    return { locked: false, remainingSeconds: 0 };
  }

  return { locked: true, remainingSeconds: Math.ceil(remaining / 1000) };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/brute/status/:username
// Retourne le statut de verrouillage (pour la démo frontend)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status/:username', (req, res) => {
  const username   = req.params.username;
  const lockStatus = isLocked(username);
  const data       = getAttemptData(username);

  return res.json({
    username,
    attempts:         data.attempts,
    maxAttempts:      MAX_ATTEMPTS,
    locked:           lockStatus.locked,
    remainingSeconds: lockStatus.remainingSeconds,
    lockedUntil:      data.lockedUntil,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/brute/reset
// Helper de démo : remet à zéro le compteur de tentatives
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reset', [body('username').trim().notEmpty()], (req, res) => {
  const { username } = req.body;
  resetAttempts(username || '');
  loginAttempts.clear(); // Reset global pour la démo
  return res.json({ success: true, message: 'Attempt counters reset' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/brute/login-vulnerable
// ⚠️ VULNERABLE : aucun compte de tentatives, aucun lockout
//
// Un attaquant peut effectuer des milliers de tentatives sans restriction.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/login-vulnerable',
  [
    body('username').trim().notEmpty(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const { username, password } = req.body;

    // ⚠️ VULNERABLE : pas de vérification du nombre de tentatives
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password))) {
        // ⚠️ Aucun mécanisme de lockout ici
        await logAttackToDB({
          type:      'BRUTE_FORCE',
          payload:   `Failed login for ${username}`,
          endpoint:  '/api/brute/login-vulnerable',
          ip:        req.ip,
          userAgent: req.get('User-Agent'),
          status:    'DETECTED',
          severity:  'MEDIUM',
        });

        return res.status(401).json({
          vulnerable: true,
          success:    false,
          error:      'Invalid credentials',
          warning:    '⚠️ No lockout protection — unlimited attempts allowed!',
        });
      }

      return res.json({
        vulnerable: true,
        success:    true,
        message:    '⚠️ Login successful (no brute force protection)',
        user:       { id: rows[0].id, username: rows[0].username, role: rows[0].role },
      });
    } catch (err) {
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/brute/login-secure
// ✅ SECURE : lockout après MAX_ATTEMPTS tentatives échouées
//
// Protection :
//   - Compteur par username en mémoire
//   - Verrouillage de 3 minutes après 5 échecs
//   - Message générique (pas de révélation du statut du compte)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/login-secure',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ERR_INVALID_INPUT', message: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    // ✅ Vérifier le lockout AVANT toute requête DB
    const lockStatus = isLocked(username);
    if (lockStatus.locked) {
      await logAttackToDB({
        type:      'BRUTE_FORCE',
        payload:   `Locked account access attempt: ${username}`,
        endpoint:  '/api/brute/login-secure',
        ip:        req.ip,
        userAgent: req.get('User-Agent'),
        status:    'BLOCKED',
        severity:  'HIGH',
      });

      return res.status(429).json({
        vulnerable:       false,
        success:          false,
        error:            'ERR_ACCOUNT_LOCKED',
        message:          '🔒 Account temporarily locked due to multiple failed attempts',
        remainingSeconds: lockStatus.remainingSeconds,
        lockoutMinutes:   LOCKOUT_PERIOD / 60000,
      });
    }

    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      const attemptData = getAttemptData(username);

      if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password))) {
        const updated = recordFailedAttempt(username);

        const isNowLocked = updated.attempts >= MAX_ATTEMPTS;

        if (isNowLocked) {
          await logAttackToDB({
            type:      'BRUTE_FORCE',
            payload:   `Account locked after ${MAX_ATTEMPTS} attempts: ${username}`,
            endpoint:  '/api/brute/login-secure',
            ip:        req.ip,
            userAgent: req.get('User-Agent'),
            status:    'BLOCKED',
            severity:  'HIGH',
          });
        }

        return res.status(401).json({
          vulnerable:      false,
          success:         false,
          error:           'ERR_INVALID_CREDENTIALS',
          message:         'Invalid credentials',
          attemptsLeft:    isNowLocked ? 0 : MAX_ATTEMPTS - updated.attempts,
          locked:          isNowLocked,
          remainingSeconds: isNowLocked ? LOCKOUT_PERIOD / 1000 : 0,
        });
      }

      // Succès — réinitialiser le compteur
      resetAttempts(username);

      return res.json({
        vulnerable: false,
        success:    true,
        message:    '✅ Login successful (with brute force protection)',
        user:       { id: rows[0].id, username: rows[0].username, role: rows[0].role },
      });
    } catch (err) {
      return res.status(500).json({ error: 'Login failed' });
    }
  }
);

module.exports = router;
