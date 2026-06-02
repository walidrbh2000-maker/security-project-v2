/**
 * auth.js — Middleware d'authentification JWT
 *
 * Fonctionnalités :
 *   - requireAuth       : vérifie le Bearer token + blacklist
 *   - requireRole       : contrôle d'accès basé sur le rôle
 *   - generateToken     : crée un JWT access token (24h)
 *   - generateRefresh   : crée un refresh token (7j)
 *   - blacklistToken    : invalide un token côté serveur
 *   - isBlacklisted     : vérifie si un token est invalidé
 *
 * Note : La blacklist et les refresh tokens sont stockés en mémoire (Set/Map).
 * En production, utiliser Redis pour la persistance inter-instances.
 */
'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET         = process.env.JWT_SECRET         || 'fallback-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';

// ─── Blacklist en mémoire pour les tokens révoqués (logout) ──────────────────
// Clé = jti (JWT ID), Valeur = timestamp d'expiration
const tokenBlacklist = new Set();

// ─── Store des refresh tokens actifs ─────────────────────────────────────────
// Clé = tokenHash, Valeur = { userId, username, role, expiresAt }
const refreshTokenStore = new Map();

/**
 * Ajoute un token à la blacklist (lors du logout).
 * @param {string} token - Le JWT complet (on extrait le jti)
 */
const blacklistToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded?.jti) {
      tokenBlacklist.add(decoded.jti);
    }
    // Nettoyage périodique de la blacklist (tous les 100 ajouts)
    if (tokenBlacklist.size % 100 === 0) {
      _cleanBlacklist();
    }
  } catch { /* ignore */ }
};

/**
 * Vérifie si un jti est blacklisté.
 * @param {string} jti
 * @returns {boolean}
 */
const isBlacklisted = (jti) => tokenBlacklist.has(jti);

/**
 * Supprime les tokens expirés de la blacklist.
 * @private
 */
const _cleanBlacklist = () => {
  // Pas d'info d'expiration dans notre Set simple — on vide tout si > 10000 entrées
  if (tokenBlacklist.size > 10000) {
    tokenBlacklist.clear();
    console.log('⚠️  Token blacklist cleared (size limit reached)');
  }
};

/**
 * Middleware requireAuth — protège les routes qui nécessitent un JWT valide.
 * Vérifie : présence, signature, expiration, et blacklist.
 * En-tête attendu : Authorization: Bearer <token>
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error:   'ERR_NO_TOKEN',
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Vérifier si le token a été révoqué (logout)
    if (decoded.jti && isBlacklisted(decoded.jti)) {
      return res.status(401).json({
        error:   'ERR_TOKEN_REVOKED',
        message: 'Token has been revoked. Please log in again.',
      });
    }

    req.user = decoded; // { id, username, role, jti, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error:   'ERR_TOKEN_EXPIRED',
        message: 'Token expired. Please log in again.',
      });
    }
    return res.status(401).json({
      error:   'ERR_INVALID_TOKEN',
      message: 'Invalid token.',
    });
  }
};

/**
 * Middleware requireRole — vérifie le rôle de l'utilisateur après requireAuth.
 * Usage : router.get('/admin', requireAuth, requireRole('admin'), handler)
 * @param {...string} roles - Rôles autorisés
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      error:   'ERR_FORBIDDEN',
      message: `Access denied. Required role: ${roles.join(' or ')}.`,
    });
  }
  next();
};

/**
 * Génère un access token JWT signé (durée : 24h).
 * Inclut un jti (JWT ID) unique pour la révocation.
 * @param {object} user - { id, username, role }
 * @returns {string} JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id:       user.id,
      username: user.username,
      role:     user.role,
      jti:      crypto.randomUUID(), // Identifiant unique pour la blacklist
    },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '24h' }
  );
};

/**
 * Génère un refresh token opaque (chaîne aléatoire 256 bits).
 * Stocke les métadonnées en mémoire pour rotation et validation.
 * @param {object} user - { id, username, role }
 * @returns {string} refreshToken
 */
const generateRefreshToken = (user) => {
  const token    = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours

  refreshTokenStore.set(tokenHash, {
    userId:    user.id,
    username:  user.username,
    role:      user.role,
    expiresAt,
  });

  return token;
};

/**
 * Valide un refresh token et retourne les données utilisateur associées.
 * Invalide l'ancien token après utilisation (rotation).
 * @param {string} refreshToken
 * @returns {{ user: object }|null}
 */
const consumeRefreshToken = (refreshToken) => {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const data      = refreshTokenStore.get(tokenHash);

  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    refreshTokenStore.delete(tokenHash);
    return null;
  }

  // Rotation : invalider l'ancien token immédiatement
  refreshTokenStore.delete(tokenHash);

  return { user: { id: data.userId, username: data.username, role: data.role } };
};

/**
 * Révoque tous les refresh tokens d'un utilisateur (lors du logout).
 * @param {number} userId
 */
const revokeUserRefreshTokens = (userId) => {
  for (const [hash, data] of refreshTokenStore.entries()) {
    if (data.userId === userId) {
      refreshTokenStore.delete(hash);
    }
  }
};

module.exports = {
  requireAuth,
  requireRole,
  generateToken,
  generateRefreshToken,
  consumeRefreshToken,
  revokeUserRefreshTokens,
  blacklistToken,
  isBlacklisted,
};
