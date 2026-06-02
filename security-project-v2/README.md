# 🛡️ SecLab v2 — Cybersecurity Research Platform

> **Projet de Fin de Licence — Sécurité Informatique**
>
> ⚠️ **USAGE ÉDUCATIF UNIQUEMENT** — Les endpoints vulnérables sont intentionnels.
> Ne **jamais** exposer cette application sur internet.

---

## 📋 Vue d'Ensemble

SecLab v2 est une plateforme web full-stack conçue pour enseigner, démontrer et expérimenter cinq catégories de vulnérabilités web critiques :

| Attaque | Statut | OWASP | CWE |
|---------|--------|-------|-----|
| **SQL Injection** (SQLi) | ✅ Couvert | A03:2021 | CWE-89 |
| **Cross-Site Scripting** (XSS) | ✅ Couvert | A03:2021 | CWE-79 |
| **CSRF** | ✅ Couvert | A01:2021 | CWE-352 |
| **Brute Force / Lockout** | ✅ Couvert | A07:2021 | CWE-307 |
| **Path Traversal / LFI** | ✅ Couvert | A01:2021 | CWE-22 |

Chaque attaque dispose d'un endpoint **vulnérable** (⚠️) et d'un endpoint **sécurisé** (✅) côte à côte, avec un dashboard temps réel, un système de scoring, et des notifications.

---

## 🏗️ Architecture

```
security-project-v2/
├── docker-compose.yml          # Orchestration développement
├── docker-compose.prod.yml     # Orchestration production
├── Makefile                    # Commandes de développement
├── .env                        # Variables d'environnement
│
├── database/
│   └── init.sql                # Schéma + données de seed
│
├── backend/                    # Node.js / Express API
│   ├── server.js
│   ├── .env.example
│   ├── config/db.js
│   ├── middleware/
│   │   ├── auth.js             # JWT + blacklist + refresh tokens
│   │   ├── attackDetector.js   # Détection SQLi + XSS + Path Traversal
│   │   ├── security.js         # Helmet CSP/HSTS + CORS + Rate limiting
│   │   └── logger.js
│   └── routes/
│       ├── auth.js             # Login vulnérable/sécurisé + logout + refresh
│       ├── sqli.js             # Injection SQL
│       ├── xss.js              # Cross-Site Scripting
│       ├── csrf.js             # CSRF + Double-submit cookie
│       ├── bruteForce.js       # Brute force + Account lockout
│       ├── pathTraversal.js    # Path Traversal / LFI
│       ├── logs.js             # Journaux + stats + leaderboard
│       └── admin.js            # Administration (admin only)
│
├── frontend/                   # React + Vite + Tailwind CSS
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx        # Dashboard amélioré
│       │   ├── SQLInjection.jsx
│       │   ├── XSSAttacks.jsx
│       │   ├── CSRF.jsx        # NOUVEAU
│       │   ├── BruteForce.jsx  # NOUVEAU
│       │   ├── PathTraversal.jsx # NOUVEAU
│       │   ├── AttackLogs.jsx  # Export CSV + timeline cliquable
│       │   ├── Profile.jsx     # NOUVEAU
│       │   └── Login.jsx
│       └── components/
│           ├── Dashboard/
│           │   ├── ThreatLevel.jsx  # NOUVEAU
│           │   ├── GeoMap.jsx       # NOUVEAU
│           │   └── Leaderboard.jsx  # NOUVEAU
│           └── Notifications/
│               └── Toast.jsx        # NOUVEAU (polling 10s)
│
├── RAPPORT_TECHNIQUE.md        # Rapport académique complet
├── UML_DESCRIPTION.md          # Descriptions UML pour StarUML/draw.io
└── QUESTIONS_JURY.md           # 30 questions jury + réponses détaillées
```

---

## 🚀 Démarrage Rapide

### Prérequis

- [Docker](https://www.docker.com/) ≥ 20.10
- [Docker Compose](https://docs.docker.com/compose/) ≥ 2.0

### 1. Démarrer le projet

```bash
# Avec Docker Compose directement
docker compose up --build

# Ou avec le Makefile (recommandé)
make dev
```

Le premier build télécharge les images et installe les dépendances (~3 minutes). Les suivants sont beaucoup plus rapides.

### 2. Accéder à l'application

| URL | Service |
|-----|---------|
| `http://localhost` | Frontend (React SPA) |
| `http://localhost/api/health` | Health check basique |
| `http://localhost/api/health/detailed` | Health check détaillé |

---

## 👤 Comptes de Démonstration

| Username | Password | Rôle |
|----------|----------|------|
| `admin` | `Admin@123` | admin |
| `alice` | `Alice@2024` | user |
| `bob` | `Bob@2024` | user |
| `moderator` | `Mod@2024` | moderator |
| `hacker_test` | `Hack3r@2024` | user |
| `dev_user` | `Dev@2024` | user |
| `security_analyst` | `Sec@2024` | moderator |

---

## 🔬 Laboratoires et Payloads

### 💉 SQL Injection (`/sqli`)

| Payload | Effet |
|---------|-------|
| `' OR '1'='1` | Bypass auth — condition toujours vraie |
| `admin'--` | Injection de commentaire — ignore le mot de passe |
| `' UNION SELECT 1,data_key,data_value,4,5,6,7 FROM secret_data--` | Extraction de la table secret_data |
| `1 AND SLEEP(3)--` | Blind SQLi temporel — délai de 3 secondes |
| `'; DROP TABLE users;--` | Payload destructif (driver empêche le stacking) |

### ⚡ XSS (`/xss`)

| Payload | Type | Effet |
|---------|------|-------|
| `<script>alert('XSS')</script>` | Réfléchi / Stocké | Popup alert |
| `<img src=x onerror=alert(document.cookie)>` | Stocké | Vol de cookie simulé |
| `<svg onload=alert(1)>` | Réfléchi | Handler d'événement SVG |

### 🔄 CSRF (`/csrf`)

Simulation de virement bancaire fictif : sans token (forgeable) vs avec double-submit cookie.

### 🔨 Brute Force (`/brute-force`)

Attaque par dictionnaire automatique (8 mots de passe courants) sur endpoint sans/avec lockout.

### 📁 Path Traversal (`/path-traversal`)

| Payload | Fichier ciblé |
|---------|--------------|
| `../../etc/passwd` | Comptes système Unix |
| `../../../etc/shadow` | Hashes mots de passe |
| `../config/database.php` | Credentials DB |
| `%2e%2e%2fetc%2fpasswd` | Encodé URL |

---

## 🛡️ Nouvelles Fonctionnalités v2

| Fonctionnalité | Description |
|---|---|
| **CSRF Lab** | Double-submit cookie pattern, token one-time use |
| **Brute Force Lab** | Account lockout 5 tentatives / 3 min, démo automatique |
| **Path Traversal Lab** | Whitelist + `path.resolve()` jail |
| **Logout sécurisé** | JWT blacklist en mémoire + révocation refresh tokens |
| **Refresh Token** | Rotation automatique, invalidation de l'ancien |
| **ThreatLevel** | Indicateur LOW/MEDIUM/HIGH/CRITICAL (24h) |
| **GeoMap** | Carte SVG des IPs attaquantes (coordonnées hardcodées) |
| **Leaderboard** | Classement des attaques par type (points CRITICAL=100) |
| **Export CSV** | Téléchargement des logs filtrés |
| **Timeline cliquable** | Cliquer une barre zoome sur les logs du jour |
| **Recherche full-text** | Recherche dans les payloads |
| **Notifications toast** | Polling 10s — alert rouge si CRITICAL détecté |
| **Profil utilisateur** | Changement de mot de passe avec validation |
| **X-Request-ID** | UUID unique sur chaque réponse |
| **HSTS** | `max-age=31536000; includeSubDomains` |
| **CSP personnalisée** | `default-src 'self'` avec directives détaillées |
| **Audit Trail** | Log de toutes les actions admin |
| **Health détaillé** | DB, mémoire, uptime, stats |
| **Système de points** | CRITICAL=100, HIGH=50, MEDIUM=20, LOW=5 |

---

## ⚙️ Commandes Makefile

```bash
make dev              # Démarrer en mode développement
make build            # Builder les images Docker
make stop             # Arrêter les conteneurs
make clean            # Nettoyage complet (volumes + images)
make logs             # Voir tous les logs (follow)
make logs-backend     # Logs backend uniquement
make shell-backend    # Shell Node.js interactif
make shell-db         # CLI MySQL interactif
make health           # Vérifier l'état de l'API
make health-detailed  # Health check complet
make status           # Statut des conteneurs
make deploy-prod      # Déploiement production
```

---

## 📊 Variables d'Environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `MYSQL_ROOT_PASSWORD` | `SecureRoot@2024!` | Mot de passe root MySQL |
| `MYSQL_DATABASE` | `security_lab` | Nom de la base |
| `MYSQL_USER` | `seclab_user` | Utilisateur applicatif |
| `MYSQL_PASSWORD` | `SecureDB@2024!` | Mot de passe applicatif |
| `JWT_SECRET` | *(dans .env)* | Clé de signature JWT |
| `JWT_REFRESH_SECRET` | *(dérivé)* | Clé refresh token |
| `NODE_ENV` | `development` | Environnement Node |
| `CORS_ORIGIN` | `http://localhost` | Origine CORS autorisée |

Voir `backend/.env.example` pour la documentation complète.

---

## 🛑 Arrêt

```bash
docker compose down        # Arrêter les conteneurs
docker compose down -v     # Arrêter + supprimer la DB
make clean                 # Nettoyage complet
```

---

## 📚 Documentation Académique

| Fichier | Contenu |
|---------|---------|
| `RAPPORT_TECHNIQUE.md` | Architecture, flux d'attaque, tableau comparatif, métriques, références OWASP/CVE/CWE |
| `UML_DESCRIPTION.md` | Use Case, Class Diagram, 3 Sequence Diagrams, Deployment Diagram (pour StarUML/draw.io) |
| `QUESTIONS_JURY.md` | 30 questions probables + réponses détaillées (technique, académique, commercial, éthique) |

---

## 🧰 Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, Vite 5, Tailwind CSS 3, Recharts |
| Backend | Node.js 20, Express 4, mysql2 |
| Base de données | MySQL 8.0 |
| Conteneurisation | Docker, Docker Compose, Nginx Alpine |
| Sécurité | helmet, bcryptjs, jsonwebtoken, express-rate-limit, he |

---

## 📖 Références

- [OWASP Top 10 — 2021](https://owasp.org/www-project-top-ten/)
- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)

---

*Projet de Licence — Sécurité Informatique — Tous les endpoints vulnérables sont clairement marqués et destinés uniquement à l'étude académique.*
