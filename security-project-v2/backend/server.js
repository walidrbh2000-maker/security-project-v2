/**
 * server.js — Point d'entrée de l'API SecLab v2
 * Câble tous les middlewares, routes et tâches de démarrage.
 */
'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');

const { connectWithRetry, pool } = require('./config/db');
const logger  = require('./middleware/logger');
const {
  helmetMiddleware,
  corsMiddleware,
  requestIdMiddleware,
  generalLimiter,
  authLimiter,
} = require('./middleware/security');

const authRoutes          = require('./routes/auth');
const sqliRoutes          = require('./routes/sqli');
const xssRoutes           = require('./routes/xss');
const logsRoutes          = require('./routes/logs');
const csrfRoutes          = require('./routes/csrf');
const pathTraversalRoutes = require('./routes/pathTraversal');
const bruteForceRoutes    = require('./routes/bruteForce');
const adminRoutes         = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middlewares fondamentaux ──────────────────────────────────────────────────
app.set('trust proxy', 1);          // Fait confiance au reverse proxy nginx
app.use(requestIdMiddleware);       // X-Request-ID sur chaque réponse
app.use(helmetMiddleware);          // En-têtes de sécurité (CSP, HSTS, etc.)
app.use(corsMiddleware);            // CORS configurable via CORS_ORIGIN
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(logger);
app.use(generalLimiter);

// ─── Endpoint de santé simple ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:    'OK',
    timestamp: new Date().toISOString(),
    uptime:    Math.floor(process.uptime()),
    service:   'SecLab API v2.0',
    node:      process.version,
  });
});

// ─── Endpoint de santé détaillé ───────────────────────────────────────────────
app.get('/api/health/detailed', async (req, res) => {
  const startTime = Date.now();
  let dbStatus = 'OK';

  try {
    await pool.query('SELECT 1');
  } catch {
    dbStatus = 'ERROR';
  }

  const memoryUsage = process.memoryUsage();
  let totalUsers   = 0;
  let totalAttacks = 0;

  try {
    const [[u]] = await pool.query('SELECT COUNT(*) AS n FROM users');
    const [[a]] = await pool.query('SELECT COUNT(*) AS n FROM attack_logs');
    totalUsers   = u.n;
    totalAttacks = a.n;
  } catch { /* ignore */ }

  return res.json({
    status:    dbStatus === 'OK' ? 'OK' : 'DEGRADED',
    db:        dbStatus,
    uptime:    Math.floor(process.uptime()),
    version:   '2.0.0',
    node:      process.version,
    memory: {
      rss:       Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapUsed:  Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
    },
    stats: {
      totalUsers,
      totalAttacks,
    },
    responseTime: (Date.now() - startTime) + 'ms',
    timestamp:    new Date().toISOString(),
  });
});

// ─── Routes ────────────────────────────────────────────────────────────────────
// Auth : limiteur strict sur POST
app.use('/api/auth', (req, res, next) => {
  if (req.method === 'POST') return authLimiter(req, res, next);
  next();
});
app.use('/api/auth',  authRoutes);
app.use('/api/sqli',  sqliRoutes);
app.use('/api/xss',   xssRoutes);
app.use('/api/logs',  logsRoutes);
app.use('/api/csrf',  csrfRoutes);
app.use('/api/files', pathTraversalRoutes);
app.use('/api/brute', bruteForceRoutes);
app.use('/api/admin', adminRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error:   'ERR_NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    error:   'ERR_INTERNAL',
    message: 'Internal server error',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// seedDatabase() — Hash le mot de passe de l'admin au premier démarrage.
// Le marqueur 'SEED_ON_START' est placé par init.sql ; il est remplacé
// une seule fois par le hash bcrypt réel.
// ─────────────────────────────────────────────────────────────────────────────
const seedDatabase = async () => {
  try {
    const [[admin]] = await pool.query(
      "SELECT id FROM users WHERE username = 'admin' AND password = 'SEED_ON_START'"
    );

    if (!admin) {
      console.log('ℹ️  Admin password already seeded — skipping');
      return;
    }

    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await pool.query(
      "UPDATE users SET password = ? WHERE username = 'admin' AND password = 'SEED_ON_START'",
      [hash]
    );

    console.log('✅ Admin account seeded successfully');
    console.log(`   username : admin`);
    console.log(`   password : ${ADMIN_PASSWORD}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log('   ⚠️  Using default password — set ADMIN_PASSWORD env var in production');
    }
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  }
};

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectWithRetry();
    await seedDatabase();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 SecLab API v2 running on port ${PORT}`);
      console.log(`   ENV:    ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
      console.log(`   Detail: http://localhost:${PORT}/api/health/detailed\n`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
};

start();
