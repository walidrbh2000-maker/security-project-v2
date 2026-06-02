/**
 * routes/pathTraversal.js — Module Path Traversal / LFI
 *
 * GET /api/files/read-vulnerable?name=  ⚠️  Lecture directe sans validation
 * GET /api/files/read-secure?name=      ✅  Whitelist + path.resolve() check
 * GET /api/files/list                   ✅  Liste des fichiers autorisés
 *
 * AVERTISSEMENT ÉDUCATIF :
 * Le endpoint vulnérable est limité au dossier /app/demo-files en Docker,
 * il ne peut PAS réellement lire /etc/passwd sur le système hôte.
 * Il simule la RÉPONSE qu'un serveur vulnérable retournerait.
 */
'use strict';

const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');
const { logAttackToDB } = require('../middleware/attackDetector');

// ─── Répertoire de base des fichiers autorisés ────────────────────────────────
const SAFE_BASE_DIR = path.resolve('/app/demo-files');

// ─── Fichiers autorisés (whitelist stricte) ───────────────────────────────────
const ALLOWED_FILES = new Set([
  'welcome.txt',
  'readme.md',
  'config-example.txt',
  'changelog.txt',
]);

// ─── Réponses simulées pour les fichiers système (démo éducative) ─────────────
const SIMULATED_RESPONSES = {
  '../../etc/passwd':              '# ⚠️ SIMULATION — Fichier /etc/passwd\nroot:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\nmysql:x:999:999::/nonexistent:/bin/false\nseclab:x:1000:1000:SecLab User,,,:/home/seclab:/bin/bash',
  '../../../etc/passwd':           '# ⚠️ SIMULATION — root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin',
  '../../../../etc/shadow':        '# ⚠️ SIMULATION — /etc/shadow\nroot:$6$rounds=4096$XXXXXX$HASHED_PASSWORD:19000:0:99999:7:::',
  '../config/database.php':        '# ⚠️ SIMULATION — config/database.php\n<?php\n$db_host = "localhost";\n$db_user = "seclab_user";\n$db_pass = "SecureDB@2024!";\n$db_name = "security_lab";',
  'C:\\Windows\\win.ini':          '; ⚠️ SIMULATION — Windows win.ini\n[fonts]\n[extensions]\n[mci extensions]\n[files]',
  '%2e%2e%2fetc%2fpasswd':         '# ⚠️ SIMULATION — URL encoded traversal detected',
};

/**
 * Détecte les tentatives de path traversal dans un nom de fichier.
 * @param {string} filename
 * @returns {boolean}
 */
const isTraversalAttempt = (filename) => {
  const patterns = [
    /\.\.(\/|\\|%2f|%5c)/i,
    /%2e%2e/i,
    /%252e/i,
    /\0/,   // null byte injection
    /(etc\/passwd|etc\/shadow|win\.ini|system32)/i,
  ];
  return patterns.some(p => p.test(filename));
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/list — Liste des fichiers de démo disponibles
// ─────────────────────────────────────────────────────────────────────────────
router.get('/list', (req, res) => {
  return res.json({
    allowedFiles: [...ALLOWED_FILES],
    message:      'Ces fichiers peuvent être lus via les deux endpoints.',
    hint:         'Essayez ../../etc/passwd sur l\'endpoint vulnérable',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/read-vulnerable?name=
// ⚠️ VULNERABLE : aucune validation du chemin — traversal possible
//
// Payloads d'attaque :
//   ?name=../../etc/passwd
//   ?name=../../../etc/shadow
//   ?name=../config/database.php
//   ?name=%2e%2e%2fetc%2fpasswd  (URL encoded)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/read-vulnerable', async (req, res) => {
  const filename = req.query.name || '';

  if (!filename) {
    return res.status(400).json({ error: 'name parameter required' });
  }

  // Détecter et journaliser si c'est une traversal
  const isTraversal = isTraversalAttempt(filename);

  if (isTraversal) {
    await logAttackToDB({
      type:      'PATH_TRAVERSAL',
      payload:   filename,
      endpoint:  '/api/files/read-vulnerable',
      ip:        req.ip,
      userAgent: req.get('User-Agent'),
      status:    'DETECTED',
      severity:  /(passwd|shadow)/i.test(filename) ? 'CRITICAL' : 'HIGH',
    });

    // Retourner la réponse simulée si disponible
    const simulated = SIMULATED_RESPONSES[filename] ||
      SIMULATED_RESPONSES[decodeURIComponent(filename)] ||
      `# ⚠️ SIMULATION Path Traversal\n# Fichier demandé : ${filename}\n# Sur un serveur réel vulnérable, ce fichier serait exposé.\nroot:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33::/var/www:/usr/sbin/nologin`;

    return res.json({
      vulnerable:           true,
      traversal_detected:   true,
      filename_requested:   filename,
      content:              simulated,
      warning:              '⚠️ Path traversal simulé — sur un vrai serveur vulnérable, des fichiers système seraient exposés!',
      attack_explanation:   'Le serveur ne valide pas le chemin — un attaquant peut remonter l\'arborescence avec ../../',
    });
  }

  // ⚠️ VULNERABLE : pas de validation — accès direct au système de fichiers
  // Dans ce conteneur Docker, le fichier sera simplement introuvable si hors sandbox
  const filePath = path.join(SAFE_BASE_DIR, filename);

  try {
    const content = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, 'utf-8')
      : `[Fichier '${filename}' non trouvé dans ${SAFE_BASE_DIR}]`;

    return res.json({
      vulnerable:         true,
      traversal_detected: false,
      filename:           filename,
      path_used:          filePath,
      content,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Read error', detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/files/read-secure?name=
// ✅ SECURE : whitelist + path.resolve() check (prison du répertoire)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/read-secure', async (req, res) => {
  const filename = req.query.name || '';

  // ✅ Étape 1 : vérifier si le fichier est dans la whitelist
  if (!ALLOWED_FILES.has(filename)) {
    if (isTraversalAttempt(filename)) {
      await logAttackToDB({
        type:      'PATH_TRAVERSAL',
        payload:   filename,
        endpoint:  '/api/files/read-secure',
        ip:        req.ip,
        userAgent: req.get('User-Agent'),
        status:    'BLOCKED',
        severity:  'HIGH',
      });
    }
    return res.status(403).json({
      vulnerable: false,
      error:      'ERR_FILE_NOT_ALLOWED',
      message:    `🛡️ File '${filename}' is not in the whitelist. Request blocked.`,
      allowed:    [...ALLOWED_FILES],
    });
  }

  // ✅ Étape 2 : path.resolve() pour canonicaliser + vérifier la prison
  const requestedPath = path.resolve(SAFE_BASE_DIR, filename);

  if (!requestedPath.startsWith(SAFE_BASE_DIR)) {
    // Ceci ne devrait jamais arriver grâce à la whitelist, mais c'est une 2ème couche de défense
    return res.status(403).json({
      vulnerable: false,
      error:      'ERR_PATH_ESCAPE',
      message:    '🛡️ Directory traversal detected by path resolution. Request blocked.',
    });
  }

  // ✅ Étape 3 : lecture sécurisée du fichier
  try {
    const content = fs.existsSync(requestedPath)
      ? fs.readFileSync(requestedPath, 'utf-8')
      : `Contenu simulé pour le fichier : ${filename}\nCe fichier est dans la whitelist — accès autorisé.\nAucune donnée sensible ici.`;

    return res.json({
      vulnerable:     false,
      filename,
      resolved_path:  requestedPath,
      content,
      security_note:  '✅ File access validated by whitelist + path.resolve() jail',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read file' });
  }
});

module.exports = router;
