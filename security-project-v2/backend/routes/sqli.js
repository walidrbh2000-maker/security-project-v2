/**
 * SQL Injection Lab Routes
 * GET /api/sqli/search-vulnerable  ⚠️  String concat — UNION attacks possible
 * GET /api/sqli/search-secure      ✅  Parameterized + secret rows excluded
 * GET /api/sqli/product-vulnerable ⚠️  Integer injection
 * GET /api/sqli/product-secure     ✅  Parameterized
 */
'use strict';
const router = require('express').Router();
const { pool } = require('../config/db');
const { sqliMiddleware } = require('../middleware/attackDetector');

router.get('/search-vulnerable', sqliMiddleware, async (req, res) => {
  const q = req.query.q || '';
  const sql = `SELECT id, name, category, price, description, stock FROM products WHERE name LIKE '%${q}%'`;
  try {
    const [rows] = await pool.query(sql);
    return res.json({ vulnerable: true, query_used: sql, results: rows, sqli_detected: req.sqliDetected || false, warning: '⚠️ Intentionally vulnerable to SQL injection' });
  } catch (err) {
    return res.status(500).json({ vulnerable: true, error: 'Database error', sql_error: err.message, query_used: sql });
  }
});

router.get('/search-secure', sqliMiddleware, async (req, res) => {
  const q = req.query.q || '';
  try {
    const [rows] = await pool.query(
      'SELECT id, name, category, price, description, stock FROM products WHERE name LIKE ? AND is_secret = 0',
      [`%${q}%`]
    );
    return res.json({ vulnerable: false, results: rows, sqli_detected: req.sqliDetected || false, message: '✅ Parameterized query executed safely' });
  } catch (err) {
    return res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/product-vulnerable', sqliMiddleware, async (req, res) => {
  const id = req.query.id || '1';
  const sql = `SELECT * FROM products WHERE id = ${id}`;
  try {
    const [rows] = await pool.query(sql);
    return res.json({ vulnerable: true, query_used: sql, results: rows, sqli_detected: req.sqliDetected || false });
  } catch (err) {
    return res.status(500).json({ vulnerable: true, error: 'Database error', sql_error: err.message, query_used: sql });
  }
});

router.get('/product-secure', async (req, res) => {
  const id = parseInt(req.query.id, 10);
  if (isNaN(id) || id < 1) return res.status(400).json({ error: 'Invalid product ID' });
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ? AND is_secret = 0', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    return res.json({ vulnerable: false, results: rows, message: '✅ Secure parameterized query' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;
