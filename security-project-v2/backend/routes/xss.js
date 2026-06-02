/**
 * XSS Attack Lab Routes
 * GET/POST/DELETE for comments and reflection endpoints
 */
'use strict';
const router = require('express').Router();
const he = require('he');
const { pool } = require('../config/db');
const { logAttackToDB } = require('../middleware/attackDetector');

const XSS_PATTERNS = [/<script[\s\S]*?>/i, /javascript\s*:/i, /on\w+\s*=/i, /<iframe/i, /<object/i, /<embed/i, /<svg[\s\S]*?>/i, /<img[^>]+onerror/i];
const detectXSS = (input) => !!(input && typeof input === 'string' && XSS_PATTERNS.some(p => p.test(input)));

router.get('/comments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, author, content, endpoint_type, created_at FROM comments ORDER BY created_at DESC');
    return res.json({ comments: rows });
  } catch { return res.status(500).json({ error: 'Failed to fetch comments' }); }
});

router.post('/comment-vulnerable', async (req, res) => {
  const { author = 'Anonymous', content = '' } = req.body;
  if (!content.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
  const xssFound = detectXSS(content) || detectXSS(author);
  if (xssFound) logAttackToDB({ type: 'XSS', payload: content.substring(0, 500), endpoint: '/api/xss/comment-vulnerable', ip: req.ip || '0.0.0.0', userAgent: req.get('User-Agent'), status: 'DETECTED', severity: /<script/i.test(content) ? 'CRITICAL' : 'HIGH' });
  try {
    await pool.query('INSERT INTO comments (author, content, endpoint_type) VALUES (?,?,?)', [author, content, 'vulnerable']);
    return res.status(201).json({ vulnerable: true, xss_detected: xssFound, message: xssFound ? '⚠️ XSS payload stored! It will execute when rendered.' : 'Comment posted (vulnerable endpoint)', warning: '⚠️ Content stored without sanitization' });
  } catch { return res.status(500).json({ error: 'Failed to post comment' }); }
});

router.post('/comment-secure', async (req, res) => {
  const { author = 'Anonymous', content = '' } = req.body;
  if (!content.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
  const safeAuthor = he.encode(author.substring(0, 50));
  const safeContent = he.encode(content.substring(0, 1000));
  try {
    await pool.query('INSERT INTO comments (author, content, endpoint_type) VALUES (?,?,?)', [safeAuthor, safeContent, 'secure']);
    return res.status(201).json({ vulnerable: false, message: '✅ Comment stored safely (HTML encoded)', encoded: { author: safeAuthor, content: safeContent } });
  } catch { return res.status(500).json({ error: 'Failed to post comment' }); }
});

router.get('/reflect-vulnerable', async (req, res) => {
  const input = req.query.input || '';
  if (detectXSS(input)) logAttackToDB({ type: 'XSS', payload: input.substring(0, 500), endpoint: '/api/xss/reflect-vulnerable', ip: req.ip || '0.0.0.0', userAgent: req.get('User-Agent'), status: 'DETECTED', severity: 'MEDIUM' });
  return res.json({ vulnerable: true, reflected: input, xss_detected: detectXSS(input), warning: '⚠️ Input reflected without encoding' });
});

router.get('/reflect-secure', async (req, res) => {
  const input = req.query.input || '';
  return res.json({ vulnerable: false, reflected: he.encode(input), original: input, message: '✅ Input sanitized before reflection' });
});

router.delete('/comments', async (req, res) => {
  try {
    await pool.query('DELETE FROM comments');
    await pool.query(`INSERT INTO comments (author, content, endpoint_type) VALUES ('Alice', 'Great security platform!', 'secure'), ('Bob', 'Learned so much about SQL injection here.', 'secure'), ('Charlie', 'XSS vulnerabilities are more dangerous than I thought.', 'secure')`);
    return res.json({ message: 'Comments reset successfully', count: 3 });
  } catch { return res.status(500).json({ error: 'Failed to reset comments' }); }
});

module.exports = router;
