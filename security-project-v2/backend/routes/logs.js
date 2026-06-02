/**
 * routes/logs.js — Routes des journaux d'attaques et statistiques
 *
 * GET    /api/logs           Logs paginés avec filtres
 * GET    /api/logs/stats     Statistiques agrégées (dashboard)
 * GET    /api/logs/leaderboard  Top attaques par type cette semaine
 * GET    /api/logs/threat-level Niveau de menace des dernières 24h
 * GET    /api/logs/recent    Dernières attaques (pour notifications)
 * DELETE /api/logs           Reset et re-seed des logs
 */
'use strict';

const router = require('express').Router();
const { pool } = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/logs
// Params : page, limit, type, status, severity, search
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset   = (page - 1) * limit;
    const type     = req.query.type     || '';
    const status   = req.query.status   || '';
    const severity = req.query.severity || '';
    const search   = req.query.search   || '';

    const conditions = [];
    const params     = [];

    if (type)     { conditions.push('attack_type = ?');       params.push(type);              }
    if (status)   { conditions.push('status = ?');            params.push(status);            }
    if (severity) { conditions.push('severity = ?');          params.push(severity);          }
    if (search)   { conditions.push('payload LIKE ?');        params.push(`%${search}%`);     }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM attack_logs ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT id, attack_type, payload, endpoint, ip_address, user_agent,
              status, severity, points, created_at
       FROM attack_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      data:       rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/logs/recent?since=<iso_date>
// Dernières attaques depuis une date (pour le polling des notifications)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/recent', async (req, res) => {
  try {
    const since = req.query.since
      ? new Date(req.query.since)
      : new Date(Date.now() - 10000); // 10 secondes par défaut

    const [rows] = await pool.query(
      `SELECT id, attack_type, severity, payload, endpoint, created_at
       FROM attack_logs
       WHERE created_at > ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [since]
    );

    return res.json({ attacks: rows, since: since.toISOString() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch recent attacks' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/logs/threat-level
// Calcule le niveau de menace global des dernières 24 heures
// ─────────────────────────────────────────────────────────────────────────────
router.get('/threat-level', async (req, res) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT
        COUNT(*)                                              AS total,
        SUM(severity = 'CRITICAL')                           AS critical,
        SUM(severity = 'HIGH')                               AS high,
        SUM(severity = 'MEDIUM')                             AS medium,
        COALESCE(SUM(points), 0)                             AS totalPoints
      FROM attack_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);

    // Calcul du niveau de menace basé sur les points et la sévérité
    let level = 'LOW';
    let score = 0;

    score += (stats.critical || 0) * 100;
    score += (stats.high     || 0) * 50;
    score += (stats.medium   || 0) * 20;

    if (score >= 500)      level = 'CRITICAL';
    else if (score >= 200) level = 'HIGH';
    else if (score >= 50)  level = 'MEDIUM';

    return res.json({
      level,
      score,
      stats: {
        total:    stats.total    || 0,
        critical: stats.critical || 0,
        high:     stats.high     || 0,
        medium:   stats.medium   || 0,
      },
      period: '24h',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute threat level' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/logs/leaderboard
// Top attaques par type cette semaine (gamification)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const [byType] = await pool.query(`
      SELECT
        attack_type,
        COUNT(*)                AS count,
        COALESCE(SUM(points),0) AS totalPoints,
        MAX(severity)           AS maxSeverity
      FROM attack_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY attack_type
      ORDER BY totalPoints DESC
    `);

    const [topIPs] = await pool.query(`
      SELECT
        ip_address,
        COUNT(*)                AS count,
        COALESCE(SUM(points),0) AS totalPoints
      FROM attack_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY ip_address
      ORDER BY totalPoints DESC
      LIMIT 5
    `);

    return res.json({
      byType,
      topIPs,
      period: '7d',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/logs/stats — Statistiques agrégées pour le dashboard
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM attack_logs');

    const [byTypeRows] = await pool.query(
      `SELECT attack_type AS type, COUNT(*) AS count FROM attack_logs GROUP BY attack_type`
    );
    const by_type = { SQL_INJECTION: 0, XSS: 0, CSRF: 0, BRUTE_FORCE: 0, PATH_TRAVERSAL: 0, OTHER: 0 };
    byTypeRows.forEach(r => { by_type[r.type] = Number(r.count); });

    const [byStatusRows] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM attack_logs GROUP BY status`
    );
    const by_status = { DETECTED: 0, BLOCKED: 0, PASSED: 0 };
    byStatusRows.forEach(r => { by_status[r.status] = Number(r.count); });

    const [bySeverityRows] = await pool.query(
      `SELECT severity, COUNT(*) AS count FROM attack_logs GROUP BY severity`
    );
    const by_severity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    bySeverityRows.forEach(r => { by_severity[r.severity] = Number(r.count); });

    const [byDayRows] = await pool.query(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
         SUM(attack_type = 'SQL_INJECTION')  AS SQL_INJECTION,
         SUM(attack_type = 'XSS')            AS XSS,
         SUM(attack_type = 'CSRF')           AS CSRF,
         SUM(attack_type = 'BRUTE_FORCE')    AS BRUTE_FORCE,
         SUM(attack_type = 'PATH_TRAVERSAL') AS PATH_TRAVERSAL,
         SUM(attack_type = 'OTHER')          AS OTHER
       FROM attack_logs
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    return res.json({ total, by_type, by_status, by_severity, by_day: byDayRows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/logs — Reset attack_logs et re-seed
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE attack_logs');

    await pool.query(
      `INSERT INTO attack_logs (attack_type, payload, endpoint, ip_address, status, severity, points) VALUES
       ('SQL_INJECTION', "' OR '1'='1",                '/api/auth/login-vulnerable',  '192.168.1.1',  'DETECTED', 'CRITICAL', 100),
       ('SQL_INJECTION', "admin'--",                   '/api/auth/login-vulnerable',  '10.0.0.5',     'BLOCKED',  'HIGH',     50),
       ('XSS',           '<script>alert(1)</script>',  '/api/xss/comment-vulnerable', '172.16.0.1',   'DETECTED', 'HIGH',     50),
       ('XSS',           '<img src=x onerror=alert()>','/api/xss/reflect-vulnerable', '192.168.2.1',  'PASSED',   'MEDIUM',   20),
       ('BRUTE_FORCE',   '10 failed login attempts',   '/api/brute/login-secure',     '10.10.0.1',    'BLOCKED',  'HIGH',     50),
       ('SQL_INJECTION', "' UNION SELECT * FROM secret_data--",'/api/sqli/search-vulnerable','192.168.3.1','DETECTED','CRITICAL',100),
       ('CSRF',          'Invalid CSRF token',         '/api/csrf/transfer-vulnerable','10.20.30.40',  'BLOCKED',  'MEDIUM',   20),
       ('XSS',           '<svg onload=alert(1)>',      '/api/xss/comment-vulnerable', '192.168.4.1',  'DETECTED', 'HIGH',     50),
       ('PATH_TRAVERSAL','../../etc/passwd',            '/api/files/read-vulnerable',  '192.168.5.1',  'DETECTED', 'CRITICAL', 100),
       ('OTHER',         'Suspicious scanner UA',      '/api/logs',                   '192.168.6.1',  'DETECTED', 'LOW',      5)`
    );

    return res.json({ message: 'Attack logs reset with 10 sample entries', count: 10 });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset logs' });
  }
});

module.exports = router;
