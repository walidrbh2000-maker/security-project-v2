/**
 * routes/admin.js — Routes d'administration (rôle admin requis)
 *
 * GET /api/admin/users       Liste des utilisateurs avec stats de connexion
 * GET /api/admin/audit       Journal des actions administratives
 * GET /api/admin/stats       Statistiques globales de la plateforme
 */
'use strict';

const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { pool } = require('../config/db');

// Toutes les routes admin nécessitent auth + rôle admin
router.use(requireAuth, requireRole('admin'));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// Retourne la liste des utilisateurs avec statistiques de connexion
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.email,
        u.role,
        u.created_at,
        u.last_login,
        (SELECT COUNT(*) FROM audit_trail WHERE user_id = u.id AND action LIKE 'LOGIN%') AS login_count,
        (SELECT COUNT(*) FROM audit_trail WHERE user_id = u.id) AS total_actions
      FROM users u
      ORDER BY u.created_at DESC
    `);

    return res.json({
      users,
      total:      users.length,
      fetchedAt:  new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/audit
// Audit trail des actions admin
// ─────────────────────────────────────────────────────────────────────────────
router.get('/audit', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM audit_trail');

    const [rows] = await pool.query(`
      SELECT
        at.id,
        at.action,
        at.target,
        at.ip,
        at.created_at,
        u.username
      FROM audit_trail at
      LEFT JOIN users u ON u.id = at.user_id
      ORDER BY at.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    return res.json({
      data:       rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stats
// Statistiques globales de la plateforme
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [[{ totalUsers }]]   = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
    const [[{ totalAttacks }]] = await pool.query('SELECT COUNT(*) AS totalAttacks FROM attack_logs');
    const [[{ totalPoints }]]  = await pool.query('SELECT COALESCE(SUM(points),0) AS totalPoints FROM attack_logs');
    const [[{ criticalCount }]] = await pool.query(
      "SELECT COUNT(*) AS criticalCount FROM attack_logs WHERE severity = 'CRITICAL'"
    );

    const [topAttackers] = await pool.query(`
      SELECT ip_address, COUNT(*) AS count, MAX(severity) AS maxSeverity
      FROM attack_logs
      GROUP BY ip_address
      ORDER BY count DESC
      LIMIT 5
    `);

    return res.json({
      totalUsers,
      totalAttacks,
      totalPoints,
      criticalCount,
      topAttackers,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

module.exports = router;
