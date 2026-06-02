# RAPPORT TECHNIQUE — SecLab v2
## Plateforme Pédagogique de Démonstration des Vulnérabilités Web

**Projet de Fin de Licence — Sécurité Informatique**
**Auteur :** [Votre Nom]
**Encadrant :** [Nom de l'encadrant]
**Année universitaire :** 2023–2024

---

## 1. DESCRIPTION DU SYSTÈME

### 1.1 Objectif

SecLab est une plateforme web pédagogique permettant de comprendre, reproduire et contrer cinq catégories de vulnérabilités web critiques répertoriées par l'OWASP. Elle s'adresse aux étudiants en sécurité informatique, développeurs et professionnels de la cybersécurité souhaitant pratiquer dans un environnement contrôlé et balisé.

### 1.2 Fonctionnalités Principales

| Fonctionnalité | Description |
|---|---|
| **Laboratoire SQLi** | Démonstration d'injection SQL avec bypass d'authentification, UNION-based et time-based |
| **Laboratoire XSS** | XSS réfléchi et stocké avec comparaison encodé/non-encodé |
| **Laboratoire CSRF** | Simulation de virement bancaire fictif avec/sans token CSRF |
| **Laboratoire Brute Force** | Attaque par dictionnaire avec account lockout (5 tentatives / 3 min) |
| **Laboratoire Path Traversal** | Lecture de fichiers arbitraires vs whitelist + jail |
| **Dashboard temps réel** | Surveillance des attaques, niveau de menace, carte géographique, leaderboard |
| **Journalisation** | Tous les événements d'attaque sont persistés avec sévérité et points |
| **Notifications** | Polling toutes les 10s — toast rouge si attaque CRITIQUE détectée |
| **Export CSV** | Export des logs filtrés en un clic |

### 1.3 Contraintes de Déploiement

> ⚠️ **AVERTISSEMENT** : Cette plateforme contient des endpoints intentionnellement vulnérables. Elle est conçue **uniquement** pour un usage pédagogique en environnement isolé. Ne jamais l'exposer sur un réseau public ou internet.

---

## 2. ARCHITECTURE DU SYSTÈME

### 2.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet / LAN                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ :80
┌──────────────────────────▼──────────────────────────────────┐
│              Conteneur Frontend (Nginx + React)              │
│  - Sert les fichiers statiques compilés (/dist)             │
│  - Proxy inverse : /api/* → backend:3001                    │
│  - Configuration : nginx.conf                               │
└──────────────────────────┬──────────────────────────────────┘
                           │ :3001 (réseau Docker interne)
┌──────────────────────────▼──────────────────────────────────┐
│              Conteneur Backend (Node.js + Express)           │
│  - API REST JSON                                            │
│  - Middlewares : Helmet, CORS, Rate Limiting, JWT           │
│  - Modules : SQLi, XSS, CSRF, Path Traversal, Brute Force  │
│  - Détection d'attaques : attackDetector.js                 │
└──────────────────────────┬──────────────────────────────────┘
                           │ :3306 (réseau Docker interne)
┌──────────────────────────▼──────────────────────────────────┐
│              Conteneur MySQL 8.0                             │
│  - Base de données : security_lab                           │
│  - Tables : users, products, comments, attack_logs, etc.    │
│  - Initialisé par : database/init.sql                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Description de Chaque Composant

#### 2.2.1 Frontend (React + Vite + Tailwind CSS)

- **Technologie** : React 18, Vite 5, Tailwind CSS 3, Recharts
- **Rôle** : Interface utilisateur SPA (Single Page Application) avec thème dark cyberpunk
- **Composants principaux** :
  - `AuthContext.jsx` : Gestion de l'état d'authentification JWT (localStorage)
  - `client.js` : Instance Axios avec intercepteur JWT et gestion des 401
  - Pages de laboratoire : `SQLInjection`, `XSSAttacks`, `CSRF`, `BruteForce`, `PathTraversal`
  - Dashboard : `ThreatLevel`, `GeoMap`, `Leaderboard`, `AttackBarChart`, `AttackPieChart`
  - `Toast.jsx` : Notifications temps réel par polling (10s)

#### 2.2.2 Backend (Node.js + Express)

- **Technologie** : Node.js 20 LTS, Express 4
- **Rôle** : API REST fournissant les endpoints vulnérables ET sécurisés
- **Middlewares de sécurité** :
  - `helmet` : 15+ en-têtes de sécurité HTTP (CSP, HSTS, X-Frame-Options…)
  - `cors` : Politique CORS configurée via variable d'environnement
  - `express-rate-limit` : Limitation de débit (100 req/15min général, 10 req/15min auth)
  - `requestIdMiddleware` : X-Request-ID unique sur chaque réponse (traçabilité)
  - `attackDetector.js` : Détection unifiée SQLi + XSS + Path Traversal
- **Routes** :
  - `/api/auth` : Login vulnérable/sécurisé, logout, refresh token, changement de mot de passe
  - `/api/sqli` : Recherche de produits vulnérable/sécurisée
  - `/api/xss` : Commentaires et réflexion vulnérables/sécurisés
  - `/api/csrf` : Transfert fictif sans/avec token CSRF
  - `/api/brute` : Login sans/avec account lockout
  - `/api/files` : Lecture de fichiers sans/avec validation
  - `/api/logs` : Journaux, statistiques, niveau de menace, leaderboard
  - `/api/admin` : Gestion des utilisateurs (admin uniquement)

#### 2.2.3 Base de Données (MySQL 8.0)

- **Tables** :
  - `users` : Comptes utilisateurs (bcrypt)
  - `products` : Produits fictifs pour les démos SQLi
  - `comments` : Commentaires pour les démos XSS
  - `attack_logs` : Journal de toutes les attaques détectées
  - `secret_data` : Données confidentielles fictives (cibles UNION attacks)
  - `sessions` : Sessions utilisateur (pour la démo)
  - `audit_trail` : Journal des actions administratives

---

## 3. FLUX DE DONNÉES PAR TYPE D'ATTAQUE

### 3.1 SQL Injection — Endpoint Vulnérable

```
Attaquant         Frontend           Backend              MySQL
    │                │                  │                   │
    │─ Payload ──────►│                  │                   │
    │  admin'--       │                  │                   │
    │                 │─ POST /login ────►│                  │
    │                 │  {username:      │                   │
    │                 │   "admin'--"}    │                   │
    │                 │                  │─ Détection SQLi   │
    │                 │                  │  (attackDetector) │
    │                 │                  │─ LOG en DB ──────►│
    │                 │                  │                   │
    │                 │                  │─ SQL brut ────────►│
    │                 │                  │  SELECT * FROM users
    │                 │                  │  WHERE username='admin'--'
    │                 │                  │  AND password='x'
    │                 │                  │◄─ rows[0] (admin) ─│
    │                 │◄─ 200 + JWT ─────│                   │
    │◄─ Authentifié ──│                  │                   │
    │   (sans mdp!)   │                  │                   │
```

### 3.2 SQL Injection — Endpoint Sécurisé

```
Attaquant         Frontend           Backend              MySQL
    │                │                  │                   │
    │─ Payload ──────►│                  │                   │
    │  admin'--       │                  │                   │
    │                 │─ POST /login ────►│                  │
    │                 │  {username:      │                   │
    │                 │   "admin'--"}    │                   │
    │                 │                  │─ Validation input  │
    │                 │                  │─ Requête paramét.─►│
    │                 │                  │  SELECT * WHERE   │
    │                 │                  │  username = ?     │
    │                 │                  │  params=['admin'--']
    │                 │                  │◄─ rows[] (vide) ──│
    │                 │                  │   (aucun user     │
    │                 │                  │    "admin'--")    │
    │                 │◄─ 401 Échec ─────│                   │
    │◄─ Refusé ───────│                  │                   │
```

### 3.3 XSS Stocké — Endpoint Vulnérable

```
Attaquant         Frontend           Backend (vuln)       MySQL     Victime
    │                │                  │                   │           │
    │─ Payload XSS──►│                  │                   │           │
    │  <script>       │                  │                   │           │
    │  alert(cookie)  │                  │                   │           │
    │  </script>      │─ POST /comment──►│                   │           │
    │                 │                  │─ Store raw ───────►│          │
    │                 │                  │  (pas d'encodage) │           │
    │                 │◄─ 201 OK ────────│                   │           │
    │                 │                  │                   │           │
    │                 │                  │                   │           │
    │                 │                  │                   │──────────►│
    │                 │                  │                   │ GET /xss  │
    │                 │                  │                   │◄──────────│
    │                 │                  │                   │           │
    │                 │                  │──── SELECT ───────►│          │
    │                 │                  │◄─ <script>... ────│           │
    │                 │◄─────────────────│                   │           │
    │                 │ dangerouslySetInnerHTML               │           │
    │                 │──────────────────────────────────────────────────►│
    │                 │          Script exécuté dans le navigateur victime│
    │◄─ Cookie volé ──────────────────────────────────────────────────────│
```

---

## 4. TABLEAU COMPARATIF VULNÉRABLE vs SÉCURISÉ

### 4.1 SQL Injection

| Critère | ⚠️ Endpoint Vulnérable | ✅ Endpoint Sécurisé |
|---|---|---|
| **Construction de la requête** | Concaténation de chaînes | Requêtes paramétrées (?) |
| **Vérification du mot de passe** | Dans la requête SQL | bcrypt.compare() séparé |
| **Exposition des données** | Toute la table users | Champs sélectionnés uniquement |
| **Données secrètes** | Accessibles via UNION | Exclues (is_secret=0) |
| **Messages d'erreur** | SQL brut exposé | Message générique |
| **OWASP** | A03:2021 Injection | Conforme OWASP |
| **CWE** | CWE-89 | N/A |

### 4.2 XSS

| Critère | ⚠️ Endpoint Vulnérable | ✅ Endpoint Sécurisé |
|---|---|---|
| **Stockage** | HTML brut (`content`) | Entités HTML encodées |
| **Rendu côté client** | `dangerouslySetInnerHTML` | Texte brut `{content}` |
| **Bibliothèque** | Aucune | `he.encode()` |
| **`<script>` dans DB** | `<script>alert(1)</script>` | `&lt;script&gt;alert(1)&lt;/script&gt;` |
| **Exécution** | Oui (dans le navigateur) | Non (affiché comme texte) |
| **OWASP** | A03:2021 Injection | Conforme OWASP |
| **CWE** | CWE-79 | N/A |

### 4.3 CSRF

| Critère | ⚠️ Endpoint Vulnérable | ✅ Endpoint Sécurisé |
|---|---|---|
| **Vérification d'origine** | Aucune | Token validé côté serveur |
| **Mécanisme** | — | Double-submit cookie pattern |
| **Token** | Non requis | Requis (X-CSRF-Token) |
| **Durée de validité** | — | 30 minutes (one-time use) |
| **Résistance au replay** | — | Token révoqué après usage |
| **OWASP** | A01:2021 Broken Access Control | Conforme OWASP |
| **CWE** | CWE-352 | N/A |

### 4.4 Brute Force

| Critère | ⚠️ Endpoint Vulnérable | ✅ Endpoint Sécurisé |
|---|---|---|
| **Limite de tentatives** | Illimitée | 5 tentatives max |
| **Verrouillage** | Non | 3 minutes après 5 échecs |
| **Compteur** | Non | Par username (Map en mémoire) |
| **Message d'erreur** | Spécifique | Générique (pas de révélation) |
| **OWASP** | A07:2021 Identification Failures | Conforme OWASP |
| **CWE** | CWE-307 | N/A |

### 4.5 Path Traversal

| Critère | ⚠️ Endpoint Vulnérable | ✅ Endpoint Sécurisé |
|---|---|---|
| **Validation du chemin** | Aucune | Whitelist stricte (Set) |
| **Jail directory** | Non | path.resolve() check |
| **Fichiers accessibles** | Tout le système de fichiers | 4 fichiers autorisés uniquement |
| **Payload `../../etc/passwd`** | Simulé comme exposé | Refusé (403) |
| **Double validation** | Non | Whitelist + résolution de chemin |
| **OWASP** | A01:2021 Broken Access Control | Conforme OWASP |
| **CWE** | CWE-22 | N/A |

---

## 5. MÉTRIQUES DE SÉCURITÉ

### 5.1 Patterns de Détection

Le middleware `attackDetector.js` implémente les patterns suivants :

| Type | Patterns | Exemples détectés |
|---|---|---|
| **SQLi** | 9 expressions régulières | `OR 1=1`, `UNION SELECT`, `SLEEP()`, `DROP TABLE`, `--` |
| **XSS** | 8 expressions régulières | `<script>`, `onerror=`, `javascript:`, `<svg onload>` |
| **Path Traversal** | 5 expressions régulières | `../`, `%2e%2e`, null byte, `/etc/passwd` |

### 5.2 Système de Points (Gamification)

| Sévérité | Points | Critères |
|---|---|---|
| **CRITICAL** | 100 pts | UNION attacks, DROP, UNION SELECT, /etc/passwd |
| **HIGH** | 50 pts | Auth bypass, XSS script, brute force avancé |
| **MEDIUM** | 20 pts | CSRF, tentatives basiques, payloads courants |
| **LOW** | 5 pts | Scanners, agents suspects, autres |

### 5.3 En-têtes de Sécurité HTTP

| En-tête | Valeur | Protection |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'` | Injection de scripts |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HTTPS forcé |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `X-Request-ID` | UUID v4 unique | Traçabilité des requêtes |
| `X-Powered-By` | Supprimé | Fingerprinting |

---

## 6. RÉFÉRENCES OWASP, CVE ET CWE

### 6.1 SQL Injection

- **OWASP** : A03:2021 — Injection
- **CWE** : CWE-89 (Improper Neutralization of Special Elements)
- **CVE exemples** :
  - CVE-2012-2326 : Drupal SQL injection
  - CVE-2021-22205 : GitLab RCE via SQL injection
- **Référence** : https://owasp.org/www-community/attacks/SQL_Injection

### 6.2 Cross-Site Scripting (XSS)

- **OWASP** : A03:2021 — Injection (sous-catégorie XSS)
- **CWE** : CWE-79 (Improper Neutralization of Input During Web Page Generation)
- **CVE exemples** :
  - CVE-2021-25281 : WordPress XSS stocké
  - CVE-2019-5418 : Rails file disclosure + XSS
- **Référence** : https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html

### 6.3 CSRF

- **OWASP** : A01:2021 — Broken Access Control
- **CWE** : CWE-352 (Cross-Site Request Forgery)
- **CVE exemples** :
  - CVE-2019-14234 : Django admin CSRF bypass
  - CVE-2017-9841 : phpUnit CSRF
- **Référence** : https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

### 6.4 Brute Force / Faible Politique de Verrouillage

- **OWASP** : A07:2021 — Identification and Authentication Failures
- **CWE** : CWE-307 (Improper Restriction of Excessive Authentication Attempts)
- **Référence** : https://owasp.org/www-community/attacks/Brute_force_attack

### 6.5 Path Traversal / LFI

- **OWASP** : A01:2021 — Broken Access Control
- **CWE** : CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)
- **CVE exemples** :
  - CVE-2021-41773 : Apache httpd Path Traversal
  - CVE-2019-18935 : Telerik UI LFI → RCE
- **Référence** : https://owasp.org/www-community/attacks/Path_Traversal

---

## 7. TECHNOLOGIES ET VERSIONS

| Composant | Technologie | Version |
|---|---|---|
| Frontend | React | 18.2.0 |
| Frontend | Vite | 5.0.8 |
| Frontend | Tailwind CSS | 3.4.0 |
| Frontend | Recharts | 2.10.1 |
| Backend | Node.js | 20 LTS |
| Backend | Express | 4.18.2 |
| Backend | mysql2 | 3.6.5 |
| Backend | bcryptjs | 2.4.3 |
| Backend | jsonwebtoken | 9.0.2 |
| Backend | helmet | 7.1.0 |
| Backend | express-rate-limit | 7.1.5 |
| Backend | he (HTML encoding) | 1.2.0 |
| Base de données | MySQL | 8.0 |
| Conteneurisation | Docker | 20.10+ |
| Proxy | Nginx | Alpine |

---

*Ce rapport est rédigé dans le cadre d'un projet de fin de licence en sécurité informatique. Toutes les vulnérabilités présentées sont intentionnelles et à des fins strictement éducatives.*
