/**
 * routes/auth.js — Routes d'authentification
 *
 * POST /api/auth/login-vulnerable  ⚠️  SQLi demo — concaténation de chaîne
 * POST /api/auth/login-secure      ✅  Requête paramétrée + bcrypt
 * POST /api/auth/register          ✅  Inscription avec validation
 * GET  /api/auth/me                ✅  Profil de l'utilisateur courant (JWT requis)
 * POST /api/auth/logout            ✅  Blackliste le JWT côté serveur
 * POST /api/auth/refresh           ✅  Rotation du refresh token
 * PUT  /api/auth/change-password   ✅  Modification du mot de passe
 */
'use strict';

const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const { pool }       = require('../config/db');
const {
  generateToken,
  generateRefreshToken,
  consumeRefreshToken,
  requireAuth,
  blacklistToken,
  revokeUserRefreshTokens,
} = require('../middleware/auth');
const { sqliMiddleware, logAttackToDB } = require('../middleware/attackDetector');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login-vulnerable
// ⚠️ VULNERABLE : concaténation directe — injection SQL possible
// Payloads démo : admin'-- | ' OR '1'='1 | ' UNION SELECT ...
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login-vulnerable', sqliMiddleware, async (req, res) => {
  const { username = '', password = '' } = req.body;

  // ⚠️ VULNERABLE : l'entrée utilisateur est interpolée dans la chaîne SQL
  const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  try {
    const [rows] = await pool.query(sql);

    if (rows.length > 0) {
      const user  = rows[0];
      const token = generateToken(user);

      await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

      // Journaliser l'audit
      await pool.query(
        'INSERT INTO audit_trail (user_id, action, target, ip) VALUES (?,?,?,?)',
        [user.id, 'LOGIN_VULNERABLE', 'auth', req.ip]
      ).catch(() => {});

      return res.json({
        success:    true,
        vulnerable: true,
        message:    '⚠️ Logged in via VULNERABLE endpoint',
        query_used: sql,
        user:       { id: user.id, username: user.username, email: user.email, role: user.role },
        token,
        warning:    'This endpoint uses raw SQL — intentionally insecure!',
      });
    }

    return res.status(401).json({
      success:    false,
      vulnerable: true,
      query_used: sql,
      error:      'Invalid username or password',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Database error', detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login-secure
// ✅ SECURE : requête paramétrée + bcrypt + refresh token
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
      return res.status(400).json({
        error:   'ERR_INVALID_INPUT',
        message: errors.array()[0].msg,
        field:   errors.array()[0].path,
      });
    }

    const { username, password } = req.body;

    try {
      // ✅ SECURE : requête paramétrée
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (rows.length === 0) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const user  = rows[0];
      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const token        = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
      await pool.query(
        'INSERT INTO audit_trail (user_id, action, target, ip) VALUES (?,?,?,?)',
        [user.id, 'LOGIN_SECURE', 'auth', req.ip]
      ).catch(() => {});

      return res.json({
        success:      true,
        vulnerable:   false,
        message:      '✅ Logged in via SECURE endpoint',
        user:         { id: user.id, username: user.username, email: user.email, role: user.role },
        token,
        refreshToken,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Authentication failed' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ✅ Blackliste le JWT access token + révoque les refresh tokens
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token      = authHeader?.split(' ')[1];

  if (token) {
    blacklistToken(token);
  }

  revokeUserRefreshTokens(req.user.id);

  await pool.query(
    'INSERT INTO audit_trail (user_id, action, target, ip) VALUES (?,?,?,?)',
    [req.user.id, 'LOGOUT', 'auth', req.ip]
  ).catch(() => {});

  return res.json({ success: true, message: '✅ Logged out — token invalidated' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ✅ Rotation automatique du refresh token (invalide l'ancien)
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('refreshToken is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ERR_INVALID_INPUT', message: errors.array()[0].msg });
    }

    const { refreshToken } = req.body;
    const result = consumeRefreshToken(refreshToken);

    if (!result) {
      return res.status(401).json({
        error:   'ERR_INVALID_REFRESH',
        message: 'Invalid or expired refresh token',
      });
    }

    // Génère un nouveau pair de tokens
    const newAccessToken  = generateToken(result.user);
    const newRefreshToken = generateRefreshToken(result.user);

    return res.json({
      success:      true,
      token:        newAccessToken,
      refreshToken: newRefreshToken,
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ✅ Inscription avec validation complète
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3–30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username: letters, numbers and underscores only'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase and a digit'),
    body('email')
      .optional()
      .isEmail().normalizeEmail()
      .withMessage('Invalid email address'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error:   'ERR_INVALID_INPUT',
        message: errors.array()[0].msg,
        field:   errors.array()[0].path,
      });
    }

    const { username, password, email } = req.body;

    try {
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );
      if (existing.length > 0) {
        return res.status(409).json({
          error:   'ERR_USERNAME_TAKEN',
          message: 'Username already taken',
          field:   'username',
        });
      }

      const hashed = await bcrypt.hash(password, 12);
      const [result] = await pool.query(
        'INSERT INTO users (username, password, email, role) VALUES (?,?,?,?)',
        [username, hashed, email || null, 'user']
      );

      const newUser     = { id: result.insertId, username, role: 'user' };
      const token       = generateToken(newUser);
      const refreshToken = generateRefreshToken(newUser);

      return res.status(201).json({
        success:      true,
        message:      'Account created successfully',
        user:         newUser,
        token,
        refreshToken,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me — Profil de l'utilisateur courant
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/auth/change-password
// ✅ Modification du mot de passe avec vérification de l'ancien
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/change-password',
  requireAuth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase and a digit'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ERR_INVALID_INPUT', message: errors.array()[0].msg });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
      if (!rows.length) return res.status(404).json({ error: 'User not found' });

      const valid = await bcrypt.compare(currentPassword, rows[0].password);
      if (!valid) {
        return res.status(401).json({ error: 'ERR_WRONG_PASSWORD', message: 'Current password is incorrect' });
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

      await pool.query(
        'INSERT INTO audit_trail (user_id, action, target, ip) VALUES (?,?,?,?)',
        [req.user.id, 'PASSWORD_CHANGE', 'auth', req.ip]
      ).catch(() => {});

      return res.json({ success: true, message: '✅ Password changed successfully' });
    } catch {
      return res.status(500).json({ error: 'Password change failed' });
    }
  }
);

module.exports = router;
