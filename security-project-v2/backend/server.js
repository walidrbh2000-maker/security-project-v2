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
// seedDatabase() — Hash les mots de passe des utilisateurs par défaut au démarrage
// ─────────────────────────────────────────────────────────────────────────────
const seedDatabase = async () => {
  try {
    const [rows] = await pool.query(
      "SELECT username FROM users WHERE password = 'SEED_ON_START'"
    );

    if (rows.length === 0) {
      console.log('ℹ️  Passwords already seeded — skipping');
      return;
    }

    console.log(`⏳ Seeding passwords for ${rows.length} user(s)...`);

    const credentials = [
      { username: 'admin',             password: 'Admin@123'    },
      { username: 'alice',             password: 'Alice@2024'   },
      { username: 'bob',               password: 'Bob@2024'     },
      { username: 'moderator',         password: 'Mod@2024'     },
      { username: 'hacker_test',       password: 'Hack3r@2024'  },
      { username: 'dev_user',          password: 'Dev@2024'     },
      { username: 'security_analyst',  password: 'Sec@2024'     },
    ];

    for (const cred of credentials) {
      const hash = await bcrypt.hash(cred.password, 12);
      await pool.query(
        "UPDATE users SET password = ? WHERE username = ? AND password = 'SEED_ON_START'",
        [hash, cred.username]
      );
    }

    console.log('✅ Database seeded with demo users');
    console.log('   admin / Admin@123  (admin)');
    console.log('   alice / Alice@2024 (user)');
    console.log('   bob   / Bob@2024   (user)');
    console.log('   moderator / Mod@2024 (moderator)');
    console.log('   hacker_test / Hack3r@2024 (user)');
    console.log('   dev_user / Dev@2024 (user)');
    console.log('   security_analyst / Sec@2024 (moderator)');
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
