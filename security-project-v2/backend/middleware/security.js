/**
 * security.js — Middlewares de sécurité HTTP
 *
 * Inclut :
 *   - Helmet avec CSP personnalisée
 *   - HSTS
 *   - X-Request-ID (tracing)
 *   - CORS configurable
 *   - Rate limiters (général + auth + brute-force)
 */
'use strict';

const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const crypto    = require('crypto');

// ─── Helmet : en-têtes de sécurité HTTP ──────────────────────────────────────
const helmetMiddleware = helmet({
  // Content-Security-Policy personnalisée
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'", "'unsafe-inline'"],  // unsafe-inline requis pour Vite HMR en dev
      styleSrc:       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:         ["'self'", 'data:', 'https:'],
      connectSrc:     ["'self'"],
      frameSrc:       ["'none'"],
      objectSrc:      ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  // HTTP Strict Transport Security
  hsts: {
    maxAge:            31536000,  // 1 an en secondes
    includeSubDomains: true,
    preload:           true,
  },
  // Masque la technologie serveur
  hidePoweredBy: true,
  // Empêche le sniffing MIME
  noSniff: true,
  // Empêche le clickjacking
  frameguard: { action: 'deny' },
  crossOriginEmbedderPolicy: false, // Désactivé pour les assets de démo XSS
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin:         process.env.CORS_ORIGIN || 'http://localhost',
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials:    true,
};
const corsMiddleware = cors(corsOptions);

// ─── X-Request-ID : identifiant unique par requête (tracing) ─────────────────
/**
 * Ajoute un identifiant de corrélation unique à chaque réponse.
 * Utile pour le tracing et le débogage en production.
 */
const requestIdMiddleware = (req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId   = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// ─── Rate limiters ────────────────────────────────────────────────────────────

/**
 * Limiteur général : 100 requêtes / 15 minutes par IP.
 * Appliqué à toutes les routes /api/*.
 */
const generalLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            100,
  standardHeaders: true,
  legacyHeaders:  false,
  keyGenerator:   (req) => req.ip,
  message:        {
    error:   'ERR_RATE_LIMIT',
    message: 'Too many requests from this IP, please try again later.',
  },
});

/**
 * Limiteur auth : 10 tentatives / 15 minutes par IP.
 * Appliqué uniquement aux routes POST /api/auth/*.
 */
const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            10,
  standardHeaders: true,
  legacyHeaders:  false,
  keyGenerator:   (req) => req.ip,
  message:        {
    error:   'ERR_AUTH_RATE_LIMIT',
    message: 'Too many authentication attempts, please try again later.',
  },
});

/**
 * Limiteur strict : 5 requêtes / 1 minute par IP.
 * Utilisé sur les endpoints sensibles (ex : brute force demo).
 */
const strictLimiter = rateLimit({
  windowMs:       60 * 1000,
  max:            5,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        {
    error:   'ERR_STRICT_RATE_LIMIT',
    message: 'Rate limit exceeded on sensitive endpoint.',
  },
});

module.exports = {
  helmetMiddleware,
  corsMiddleware,
  requestIdMiddleware,
  generalLimiter,
  authLimiter,
  strictLimiter,
};
