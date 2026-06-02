/**
 * attackDetector.js — Middleware de détection d'attaques unifiée
 *
 * Détecte et journalise :
 *   - SQL Injection (SQLi)
 *   - Cross-Site Scripting (XSS)
 *   - Path Traversal / LFI
 *   - Brute Force (via compteur d'essais par IP)
 *
 * Ce module illustre le fonctionnement d'un WAF (Web Application Firewall)
 * basique basé sur la reconnaissance de patterns.
 */
'use strict';

const { pool } = require('../config/db');

// ─── Points de sévérité pour le système de gamification ──────────────────────
const SEVERITY_POINTS = { CRITICAL: 100, HIGH: 50, MEDIUM: 20, LOW: 5 };

// ─── Patterns SQLi ────────────────────────────────────────────────────────────
const SQLI_PATTERNS = [
  /('|('')|;|--|%27|%22)/i,
  /(union(\s+all)?\s+select)/i,
  /(select.+from)/i,
  /(insert\s+into|drop\s+table|delete\s+from|truncate\s+table)/i,
  /(\bor\b.+('1'='1|1=1|\btrue\b))/i,
  /(\band\b.+('1'='1|1=1|\btrue\b))/i,
  /(waitfor\s+delay|sleep\s*\(|benchmark\s*\()/i,
  /(information_schema|sys\.tables|pg_catalog)/i,
  /(load_file|into\s+outfile|into\s+dumpfile)/i,
];

// ─── Patterns XSS ─────────────────────────────────────────────────────────────
const XSS_PATTERNS = [
  /<script[\s\S]*?>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<svg[\s\S]*?>/i,
  /data\s*:\s*text\/html/i,
  /<img[^>]+onerror/i,
];

// ─── Patterns Path Traversal ──────────────────────────────────────────────────
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.(\/|\\)/,
  /%2e%2e(%2f|%5c)/i,
  /\.\.%2f/i,
  /%252e%252e/i,
  /(etc\/passwd|etc\/shadow|win\.ini|system32)/i,
];

/**
 * Détecte le type d'attaque dans une chaîne de caractères.
 * @param {string} input - La valeur à analyser
 * @returns {{ detected: boolean, type: string|null }}
 */
const detectAttack = (input) => {
  if (!input || typeof input !== 'string') return { detected: false, type: null };
  if (SQLI_PATTERNS.some(p => p.test(input)))          return { detected: true, type: 'SQL_INJECTION' };
  if (XSS_PATTERNS.some(p => p.test(input)))           return { detected: true, type: 'XSS' };
  if (PATH_TRAVERSAL_PATTERNS.some(p => p.test(input))) return { detected: true, type: 'PATH_TRAVERSAL' };
  return { detected: false, type: null };
};

/**
 * Calcule la sévérité en fonction du payload et du type d'attaque.
 * @param {string} payload
 * @param {string} type
 * @returns {'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'}
 */
const getSeverity = (payload, type) => {
  if (type === 'SQL_INJECTION') {
    if (/(union|drop|insert|delete|secret_data|information_schema)/i.test(payload)) return 'CRITICAL';
    if (/(sleep|waitfor|benchmark)/i.test(payload)) return 'HIGH';
    return 'HIGH';
  }
  if (type === 'XSS') {
    if (/<script/i.test(payload)) return 'CRITICAL';
    return 'HIGH';
  }
  if (type === 'PATH_TRAVERSAL') {
    if (/(etc\/passwd|etc\/shadow)/i.test(payload)) return 'CRITICAL';
    return 'HIGH';
  }
  return 'MEDIUM';
};

/**
 * Sanitize un payload avant écriture en base (évite la log injection).
 * Supprime les retours chariot et limite la longueur.
 * @param {string} payload
 * @returns {string}
 */
const sanitizeForLog = (payload) => {
  if (!payload) return '';
  return payload
    .replace(/[\r\n\t]/g, ' ')   // Évite l'injection de nouvelles lignes dans les logs
    .replace(/[^\x20-\x7E\u00C0-\u024F]/g, '?') // Garde ASCII + Latin étendu
    .substring(0, 500);
};

/**
 * Persiste un événement d'attaque en base de données.
 * Les erreurs sont absorbées pour ne pas bloquer la requête.
 * @param {object} data
 */
const logAttackToDB = async (data) => {
  const points = SEVERITY_POINTS[data.severity] || 5;
  try {
    await pool.query(
      `INSERT INTO attack_logs
         (attack_type, payload, endpoint, ip_address, user_agent, status, severity, points)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        data.type,
        sanitizeForLog(data.payload),
        data.endpoint,
        data.ip,
        sanitizeForLog(data.userAgent),
        data.status,
        data.severity,
        points,
      ]
    );
  } catch (e) {
    console.error('Attack log error:', e.message);
  }
};

/**
 * Middleware Express principal — scanne toutes les entrées utilisateur.
 * Attache req.attackDetected, req.attackType, req.attackPayload si détection.
 */
const attackDetectorMiddleware = (req, res, next) => {
  const inputs = { ...req.query, ...req.body, ...req.params };

  for (const [, val] of Object.entries(inputs)) {
    if (typeof val !== 'string') continue;
    const { detected, type } = detectAttack(val);
    if (detected) {
      req.attackDetected = true;
      req.attackType     = type;
      req.attackPayload  = val;
      // sqliDetected rétrocompatible avec l'ancien sqliMiddleware
      if (type === 'SQL_INJECTION') req.sqliDetected = true;

      const severity = getSeverity(val, type);

      logAttackToDB({
        type,
        payload:   val,
        endpoint:  req.path,
        ip:        req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        status:    'DETECTED',
        severity,
      });
      break; // Loggue la première menace trouvée
    }
  }

  next();
};

// Alias rétrocompatible
const sqliMiddleware = attackDetectorMiddleware;

module.exports = {
  detectAttack,
  getSeverity,
  sanitizeForLog,
  logAttackToDB,
  attackDetectorMiddleware,
  sqliMiddleware, // rétrocompatibilité
  // Export des helpers individuels pour les tests unitaires
  detectSQLi: (input) => SQLI_PATTERNS.some(p => p.test(input || '')),
};
