# QUESTIONS PROBABLES DU JURY — SecLab v2
## Préparation à la Soutenance de Licence

---

## CATÉGORIE 1 : QUESTIONS TECHNIQUES (12 questions)

---

**Q1. Qu'est-ce que l'injection SQL et pourquoi est-elle dangereuse ?**

> L'injection SQL est une attaque où un attaquant insère des instructions SQL malveillantes dans un champ d'entrée non validé, qui est ensuite interprété par la base de données. Elle est dangereuse car elle peut permettre le contournement de l'authentification (bypass), l'extraction de données confidentielles (UNION attacks), la modification ou suppression de données (UPDATE/DELETE), et dans certains cas l'exécution de commandes système (via `xp_cmdshell` sur SQL Server ou `LOAD_FILE` sur MySQL). C'est la vulnérabilité numéro 1 dans l'OWASP Top 10 depuis 2010 et reste classée A03:2021. La défense principale est l'utilisation de **requêtes paramétrées** (prepared statements), qui séparent le code SQL des données utilisateur.

---

**Q2. Expliquez la différence entre une requête SQL concaténée et une requête paramétrée.**

> Avec la **concaténation** : `SELECT * FROM users WHERE username = '` + input + `'`. Si `input = admin'--`, la requête devient `WHERE username = 'admin'--' AND password = 'x'`, et le `--` commente la condition de mot de passe — c'est le bypass. Avec les **requêtes paramétrées** : `pool.query("SELECT * WHERE username = ?", [input])`. Ici, le `?` est un marqueur de position. Le driver MySQL échappe automatiquement l'entrée et la traite comme une **donnée**, jamais comme du code SQL. Même avec `admin'--`, la requête cherchera littéralement un utilisateur nommé "admin'--", qui n'existe pas.

---

**Q3. Qu'est-ce que le XSS et quelle est la différence entre XSS réfléchi et stocké ?**

> Le **XSS (Cross-Site Scripting)** est une attaque qui injecte des scripts malveillants dans des pages web vues par d'autres utilisateurs. La différence : le **XSS réfléchi** est non persistant — le payload est dans la requête HTTP et immédiatement reflété dans la réponse (ex. : URL malveillante partagée). Il nécessite que la victime clique sur un lien spécialement conçu. Le **XSS stocké** est persistant — le payload est sauvegardé en base de données et servi à chaque visiteur de la page affectée. Il est plus dangereux car l'attaquant n'a pas besoin d'interaction directe après l'injection. Dans SecLab, j'ai implémenté les deux : `/api/xss/reflect-vulnerable` pour le réfléchi et `/api/xss/comment-vulnerable` pour le stocké.

---

**Q4. Comment fonctionne JWT et pourquoi l'avez-vous choisi pour l'authentification ?**

> JWT (JSON Web Token) est un standard ouvert (RFC 7519) qui permet de transmettre des informations de façon sécurisée entre parties sous forme de JSON signé. Il se compose de trois parties encodées en Base64URL séparées par des points : le **header** (algorithme), le **payload** (claims : id, username, role, expiration), et la **signature** (HMAC-SHA256 avec la clé secrète). J'ai choisi JWT pour plusieurs raisons : (1) il est **stateless** — le serveur ne stocke pas de sessions, ce qui facilite le passage à l'échelle, (2) il contient les informations de l'utilisateur directement dans le token, (3) il a une expiration intégrée (`exp`). Dans SecLab v2, j'ai également ajouté une **blacklist en mémoire** (Set) pour invalider les tokens lors du logout, et un système de **refresh token** avec rotation automatique.

---

**Q5. Qu'est-ce que le CSRF et comment le double-submit cookie pattern le prévient-il ?**

> Le **CSRF (Cross-Site Request Forgery)** exploite le fait que les navigateurs envoient automatiquement les cookies de session avec chaque requête vers un domaine. Un site malveillant peut donc soumettre un formulaire à votre insu vers un site où vous êtes authentifié. Le **double-submit cookie pattern** fonctionne ainsi : (1) le serveur génère un token aléatoire aléatoire cryptographiquement sûr, (2) le client doit inclure ce token dans l'en-tête `X-CSRF-Token` de chaque requête sensible, (3) le serveur compare le token soumis avec celui stocké pour l'utilisateur. Un site malveillant **ne peut pas** lire ce token car la **Same-Origin Policy** du navigateur interdit la lecture des ressources cross-origin. Dans SecLab, j'utilise `crypto.randomBytes(32)` pour générer les tokens avec comparaison en temps constant via `crypto.timingSafeEqual()`.

---

**Q6. Qu'est-ce que le Path Traversal et comment l'avez-vous mitigé ?**

> Le **Path Traversal** (ou LFI — Local File Inclusion) permet à un attaquant de remonter l'arborescence du système de fichiers en utilisant `../` pour accéder à des fichiers hors du répertoire prévu. Par exemple, `?name=../../etc/passwd` peut exposer le fichier des comptes système. Dans SecLab, j'ai implémenté deux couches de protection : (1) une **whitelist stricte** — un `Set` JavaScript ne contenant que 4 noms de fichiers autorisés (`welcome.txt`, etc.). Si le fichier demandé n'y figure pas, la requête est immédiatement rejetée avec un 403. (2) Un **jail directory** via `path.resolve(BASE_DIR, filename)` suivi d'une vérification que le chemin résolu commence bien par `BASE_DIR`. Même si un attaquant contourne la whitelist, la résolution du chemin révèle la traversal.

---

**Q7. Comment fonctionne bcrypt et pourquoi est-il préférable à MD5 ou SHA-256 pour les mots de passe ?**

> **bcrypt** est une fonction de hachage conçue spécifiquement pour les mots de passe. Ses avantages sur MD5/SHA-256 : (1) il est **intentionnellement lent** — le paramètre `saltRounds` (dans SecLab : 12) contrôle le coût de calcul, rendant les attaques par force brute prohibitivement lentes même avec du matériel dédié, (2) il intègre automatiquement un **sel aléatoire** (128 bits), ce qui rend impossible les attaques par tables arc-en-ciel (rainbow tables), (3) il est **adaptatif** — on peut augmenter le coût au fil du temps avec les progrès du matériel. MD5 et SHA-256 sont des fonctions de hachage générales, rapides par conception — un GPU peut calculer des milliards de hash MD5 par seconde, rendant les attaques par dictionnaire triviales.

---

**Q8. Expliquez le rôle de Helmet.js dans votre projet.**

> **Helmet.js** est un middleware Express qui configure automatiquement 14+ en-têtes HTTP de sécurité. Dans SecLab, j'ai personnalisé sa configuration pour inclure : (1) **Content-Security-Policy** : restreint les sources de scripts/styles/images, mitiguant le XSS côté serveur, (2) **HSTS (HTTP Strict Transport Security)** : force HTTPS pour 1 an, (3) **X-Frame-Options: DENY** : empêche le clickjacking via iframes, (4) **X-Content-Type-Options: nosniff** : empêche le sniffing MIME, (5) **hidePoweredBy** : supprime l'en-tête `X-Powered-By: Express`, réduisant le fingerprinting. J'ai désactivé le CSP strict par défaut de Helmet pour les pages de démo XSS, car ces pages doivent intentionnellement exécuter des scripts injectés à des fins éducatives.

---

**Q9. Comment avez-vous implémenté le système de détection d'attaques ?**

> Le middleware `attackDetector.js` analyse toutes les entrées utilisateur (query, body, params) à l'aide d'**expressions régulières** organisées en trois familles : SQLi (9 patterns : `UNION SELECT`, `OR 1=1`, `SLEEP()`, etc.), XSS (8 patterns : `<script>`, `onerror=`, `javascript:`, etc.), et Path Traversal (5 patterns : `../`, `%2e%2e`, null byte, etc.). Quand un pattern est détecté, le middleware : (1) attache `req.attackDetected = true` et `req.attackType` à la requête, (2) calcule la sévérité (CRITICAL/HIGH/MEDIUM/LOW) selon le payload spécifique, (3) **journalise asynchrone** dans `attack_logs` avec `logAttackToDB()` (fire-and-forget pour ne pas bloquer la requête), et (4) appelle `next()` — la requête continue vers le handler, permettant la démo de l'attaque sur l'endpoint vulnérable.

---

**Q10. Pourquoi utilisez-vous Docker pour ce projet ?**

> Docker apporte plusieurs avantages cruciaux : (1) **Reproductibilité** — le projet fonctionne de manière identique sur Windows, macOS et Linux, éliminant les problèmes de "ça marche sur ma machine", (2) **Isolation** — les conteneurs sont isolés du système hôte, ce qui est particulièrement important pour un projet avec des endpoints vulnérables intentionnels, (3) **Orchestration simple** — `docker compose up --build` démarre les 3 services (frontend, backend, MySQL) dans le bon ordre avec les bonnes dépendances grâce aux healthchecks, (4) **Configuration déclarative** — `docker-compose.yml` documente toute l'infrastructure comme du code (Infrastructure as Code), (5) **Portabilité** — facilite la présentation et l'évaluation par le jury sans installation complexe.

---

**Q11. Qu'est-ce que le rate limiting et comment l'avez-vous configuré ?**

> Le **rate limiting** limite le nombre de requêtes qu'un client peut faire dans une fenêtre de temps, protégeant contre les abus, le DDoS et le brute force. Dans SecLab, j'utilise `express-rate-limit` avec deux configurations : (1) **Limiteur général** : 100 requêtes / 15 minutes par IP, appliqué à toutes les routes `/api/`. Si dépassé, retourne HTTP 429 avec un message JSON `ERR_RATE_LIMIT`, (2) **Limiteur auth** : 10 requêtes / 15 minutes par IP, appliqué uniquement aux `POST /api/auth/*`. Cela ralentit significativement les attaques par force brute sur l'endpoint login. En complément, j'ai implémenté un **account lockout** au niveau applicatif dans `bruteForce.js` (5 tentatives / 3 minutes par username) pour une protection plus granulaire.

---

**Q12. Comment assurez-vous la sécurité des communications entre les conteneurs ?**

> Les communications inter-conteneurs passent par un **réseau Docker bridge isolé** (`seclab-net`). Seul le port 80 du frontend est exposé sur l'hôte — les ports 3001 (backend) et 3306 (MySQL) sont **accessibles uniquement depuis l'intérieur du réseau Docker**. Cela signifie qu'un attaquant externe ne peut pas contacter directement MySQL ou l'API. Au niveau applicatif, j'ai ajouté : (1) le header `X-Request-ID` unique sur chaque réponse pour la traçabilité, (2) CORS configuré pour n'accepter que l'origine autorisée (`CORS_ORIGIN`), (3) Helmet pour les en-têtes de sécurité HTTP, (4) JWT pour l'authentification stateless entre frontend et backend.

---

## CATÉGORIE 2 : QUESTIONS ACADÉMIQUES (9 questions)

---

**Q13. Quel est le lien entre votre projet et l'OWASP Top 10 ?**

> L'OWASP (Open Web Application Security Project) publie le Top 10, une liste des risques de sécurité web les plus critiques, mise à jour tous les 3-4 ans. SecLab couvre directement : **A01:2021** (Broken Access Control) avec le Path Traversal et le CSRF, **A03:2021** (Injection) avec le SQLi et le XSS, **A07:2021** (Identification and Authentication Failures) avec le Brute Force. Chaque vulnérabilité est documentée dans le code avec les références CWE, CVE et OWASP correspondantes, offrant un contexte académique complet.

---

**Q14. Quelle est la différence entre une vulnérabilité, une menace et un risque ?**

> Ce sont trois concepts distincts en sécurité informatique : **Vulnérabilité** : une faiblesse dans un système qui peut être exploitée (ex. : absence de requêtes paramétrées). **Menace** : un acteur ou événement potentiel qui pourrait exploiter une vulnérabilité (ex. : un attaquant utilisant sqlmap). **Risque** : la probabilité qu'une menace exploite une vulnérabilité, multipliée par l'impact potentiel. Un risque s'exprime comme : Risque = Probabilité × Impact. Dans SecLab, l'injection SQL sur un endpoint de production aurait un risque critique (probabilité haute car facilement automatisable, impact élevé car accès aux données).

---

**Q15. Qu'est-ce que le principe du moindre privilège et où l'appliquez-vous ?**

> Le **moindre privilège** stipule qu'un composant ne doit avoir que les permissions strictement nécessaires à son fonctionnement. Dans SecLab : (1) **Base de données** : l'utilisateur applicatif `seclab_user` n'a que les droits SELECT, INSERT, UPDATE — pas de DROP ou de CREATE, (2) **Rôles utilisateur** : trois niveaux (admin/moderator/user) avec le middleware `requireRole()`, (3) **Route admin** : `/api/admin/*` est protégée par `requireAuth + requireRole('admin')`, (4) **Conteneurs Docker** : MySQL n'expose pas son port 3306 vers l'extérieur — accessible uniquement depuis le backend.

---

**Q16. Comment fonctionnent les cookies HttpOnly et Secure et pourquoi sont-ils importants contre le XSS ?**

> **HttpOnly** : ce flag empêche JavaScript d'accéder au cookie via `document.cookie`. Même si une attaque XSS réussit à injecter un script, ce script ne peut pas voler le cookie de session. **Secure** : le cookie n'est transmis qu'en HTTPS, empêchant son interception par sniffing réseau. Dans SecLab, j'utilise JWT dans `localStorage` plutôt que des cookies (pour simplifier la démo), mais je note explicitement dans le code et le rapport que localStorage est vulnérable au XSS — en production, il faudrait utiliser des cookies `HttpOnly; Secure; SameSite=Strict`.

---

**Q17. Qu'est-ce qu'une Content Security Policy (CSP) et comment l'avez-vous configurée ?**

> La **CSP** est un en-tête HTTP qui indique au navigateur quelles sources de contenu sont autorisées. Elle constitue une couche de défense contre le XSS : même si un attaquant injecte un script, le navigateur refusera de l'exécuter s'il ne provient pas d'une source autorisée. Dans SecLab, j'ai configuré : `default-src 'self'` (seules les ressources du même domaine), `script-src 'self' 'unsafe-inline'` (unsafe-inline requis pour React en dev), `style-src 'self' 'unsafe-inline' fonts.googleapis.com`, `font-src 'self' fonts.gstatic.com`. Note : j'ai intentionnellement désactivé le CSP strict sur les pages de démo XSS car elles doivent permettre l'exécution de scripts injectés à des fins pédagogiques — c'est documenté dans le code.

---

**Q18. Expliquez ce qu'est un audit trail et pourquoi il est important.**

> Un **audit trail** (ou piste d'audit) est un enregistrement chronologique de toutes les actions effectuées dans un système, permettant de retracer qui a fait quoi, quand et depuis où. Dans SecLab, la table `audit_trail` enregistre toutes les actions significatives : connexions (LOGIN_SECURE/LOGIN_VULNERABLE), déconnexions (LOGOUT), changements de mot de passe (PASSWORD_CHANGE), et actions admin. L'importance est multiple : (1) **Forensique** : reconstituer le déroulement d'une attaque, (2) **Conformité** : exigence légale (RGPD, ISO 27001), (3) **Détection** : repérer des comportements anormaux, (4) **Responsabilité** : prouver qui a effectué une action.

---

**Q19. Quelle est la différence entre l'authentification et l'autorisation ?**

> **Authentification** : vérifier l'identité — "Qui êtes-vous ?" (login/mot de passe, JWT). **Autorisation** : vérifier les droits — "Avez-vous le droit de faire cela ?" (rôles, permissions). Dans SecLab : l'authentification est gérée par `requireAuth` (vérifie le JWT), l'autorisation par `requireRole('admin')` (vérifie que l'utilisateur authentifié a le bon rôle). Une erreur courante est de confondre les deux : un utilisateur peut être authentifié (son JWT est valide) mais non autorisé (son rôle ne lui donne pas accès à `/api/admin`). Cette confusion est à l'origine de nombreuses failles IDOR (Insecure Direct Object Reference).

---

**Q20. Qu'est-ce que HTTPS et pourquoi est-il important même pour une plateforme interne ?**

> **HTTPS** est HTTP chiffré avec TLS (Transport Layer Security). Il garantit trois propriétés : (1) **Confidentialité** : les données sont chiffrées, un sniffeur réseau ne peut pas lire les tokens JWT ou mots de passe, (2) **Intégrité** : les données ne peuvent pas être modifiées en transit (attaque man-in-the-middle), (3) **Authenticité** : le certificat prouve l'identité du serveur. Même en réseau interne, HTTPS est important car les attaques ARP spoofing sur un LAN permettent le sniffing réseau. Dans SecLab, l'en-tête HSTS est configuré pour forcer HTTPS en production. Pour la démo locale, HTTP suffit car tout passe par localhost (loopback).

---

**Q21. Comment géreriez-vous la persistance de la blacklist JWT en production multi-instances ?**

> Actuellement, la blacklist JWT est un `Set` JavaScript en mémoire — elle est perdue si le processus redémarre, et non partagée entre plusieurs instances. En production avec plusieurs instances (scalabilité horizontale), il faudrait utiliser : (1) **Redis** : stockage clé-valeur en mémoire partagée, avec TTL automatique aligné sur l'expiration du JWT. `redis.set(jti, '1', 'EX', remainingSeconds)`. C'est la solution la plus courante, (2) **Base de données** : table `revoked_tokens` avec index sur `jti` et nettoyage périodique des tokens expirés. Redis est préférable pour sa performance (sub-milliseconde) et son TTL automatique. Dans SecLab, j'ai documenté cette limitation dans le code avec un commentaire.

---

## CATÉGORIE 3 : QUESTIONS COMMERCIALES / PRATIQUES (5 questions)

---

**Q22. Comment déployeriez-vous SecLab en production pour une vraie formation ?**

> Pour un déploiement de formation réel : (1) **Infrastructure** : serveur dédié ou VPS en réseau isolé (VLAN), pas d'accès internet direct, (2) **HTTPS** : certificat Let's Encrypt ou auto-signé, configuration Nginx avec TLS 1.3, (3) **Isolation par participant** : Docker Compose avec namespacing ou Kubernetes avec namespaces séparés par équipe, (4) **Monitoring** : Prometheus + Grafana pour surveiller l'utilisation, (5) **Sauvegarde** : backup quotidien de la DB, (6) **Durée limitée** : environnement détruit après la session, (7) **Réseau** : firewall bloquant toute communication sortante depuis les conteneurs (pas d'exfiltration réelle possible). Le fichier `docker-compose.prod.yml` que j'ai créé inclut déjà les healthchecks, politiques de redémarrage et limites de ressources.

---

**Q23. Quelles sont les limites de votre système de détection d'attaques ?**

> Le système de détection par expressions régulières a plusieurs limites : (1) **Faux positifs** : un développeur cherchant le produit "OR-Bits" pourrait déclencher le pattern `\bor\b`, (2) **Faux négatifs** : les attaques obfusquées (double encodage, commentaires SQL comme `SE/**/LECT`, caractères Unicode équivalents) peuvent bypasser les regex, (3) **Pas d'apprentissage** : un WAF commercial utilise du ML/AI pour détecter des patterns nouveaux, (4) **Pas de blocage** : le middleware journalise mais ne bloque pas sur les endpoints vulnérables (intentionnel pour la démo), (5) **Performance** : sur des volumes élevés, chaque regex est testée sur chaque entrée. Pour contrer ces limites, un WAF comme ModSecurity avec les règles OWASP CRS serait plus robuste en production.

---

**Q24. Quel serait le coût d'une attaque SQLi réelle sur une entreprise ?**

> Les coûts d'une vraie attaque SQLi peuvent être considérables : (1) **Coût direct** : notification des clients (RGPD impose notification sous 72h), coûts d'audit forensique (50 000 à 500 000 € selon la taille), amendes CNIL (jusqu'à 4% du CA annuel), (2) **Coût de remédiation** : patching d'urgence, refonte de l'application, (3) **Coût réputationnel** : perte de clients, dépréciation boursière, (4) **Exemples réels** : Yahoo (2013) : 3 milliards de comptes, coût estimé 350M$. Equifax (2017) : 147M personnes, coût 700M$. En Algérie, la loi n°18-07 sur la protection des données personnelles (2018) prévoit des sanctions. C'est pourquoi la formation à la sécurité est un investissement, pas une dépense.

---

**Q25. Comment étendriez-vous SecLab avec de nouveaux types d'attaques ?**

> L'architecture est conçue pour l'extensibilité : (1) **Backend** : créer `routes/nouvelleAttaque.js` avec les endpoints vulnérables/sécurisés, l'enregistrer dans `server.js`, ajouter les patterns au middleware `attackDetector.js`, (2) **Frontend** : créer `pages/NouvelleAttaque.jsx` et `components/NouvelleAttaqueLab/`, ajouter la route dans `App.jsx` et l'entrée de navigation dans `Sidebar.jsx`, (3) **Base de données** : ajouter le nouveau type dans l'ENUM de `attack_logs.attack_type`. Les prochains modules candidats : **XXE Injection** (XML External Entity), **SSRF** (Server-Side Request Forgery), **Open Redirect**, **Command Injection**, **Insecure Deserialization**, **JWT Algorithm Confusion** (alg:none).

---

**Q26. Quels outils professionnels un pentest SQLi utiliserait-il et comment les bloquer ?**

> Les outils professionnels incluent : (1) **sqlmap** : outil automatisé qui détecte et exploite automatiquement les injections SQL (supporte 40+ techniques). Détection : son User-Agent caractéristique est détecté dans `attackDetector.js`. Blocage : le pattern `sqlmap` dans l'UA peut déclencher un blocage, (2) **Burp Suite** : proxy intercepteur permettant de modifier les requêtes à la volée et de fuzzer les paramètres, (3) **Havij** : outil graphique Windows. Contre-mesures : WAF (ModSecurity), rate limiting agressif, requêtes paramétrées, monitoring des patterns d'attaque automatisés, honeypots.

---

## CATÉGORIE 4 : QUESTIONS ÉTHIQUES ET LÉGALES (4 questions)

---

**Q27. Pourquoi avez-vous créé des endpoints intentionnellement vulnérables ? N'est-ce pas dangereux ?**

> La création d'endpoints vulnérables est justifiée dans un contexte strictement pédagogique et contrôlé pour plusieurs raisons : (1) **Apprentissage par la pratique** : comprendre une vulnérabilité en l'exploitant dans un environnement sûr est bien plus efficace que la théorie seule — c'est le principe des CTF (Capture The Flag) et des plateformes comme HackTheBox ou TryHackMe, (2) **Environnement isolé** : SecLab tourne dans des conteneurs Docker sur localhost, sans exposition internet. Toutes les données sont fictives (produits, utilisateurs, mots de passe simulés), (3) **Avertissements visibles** : chaque endpoint vulnérable est clairement marqué `// ⚠️ VULNERABLE` dans le code, avec des bannières dans l'interface, (4) **Cadre légal** : l'exploitation de systèmes informatiques sans autorisation est un délit (art. 394 du Code pénal algérien). SecLab est un environnement d'entraînement autorisé. Les mêmes principes guident l'enseignement en médecine (mannequins) ou en aviation (simulateurs).

---

**Q28. Quelles sont les implications légales du stockage de logs d'attaques ?**

> Le stockage de logs contenant des IPs et agents utilisateurs est soumis à la réglementation sur les données personnelles : (1) **RGPD** (applicable si des utilisateurs européens sont concernés) : les IPs sont des données personnelles, nécessitant une base légale (intérêt légitime de sécurité), une durée de conservation limitée, et un droit d'effacement, (2) **Loi algérienne n°18-07** sur la protection des personnes physiques dans le traitement des données à caractère personnel, (3) **Bonnes pratiques** : anonymisation des IPs après X jours, chiffrement des logs, contrôle d'accès strict aux logs. Dans SecLab (contexte éducatif avec données fictives), ces contraintes sont allégées, mais je les ai documentées pour sensibiliser.

---

**Q29. Comment distinguer un chercheur en sécurité d'un attaquant malveillant ?**

> La distinction repose essentiellement sur l'**autorisation** et l'**intention** : (1) **Autorisation explicite** : un chercheur opère avec un accord écrit du propriétaire du système (bug bounty program, contrat de pentest). Sans autorisation, même une "bonne intention" est illégale, (2) **Périmètre défini** : le pentest légitime définit clairement les systèmes in-scope et out-of-scope, (3) **Divulgation responsable** : un chercheur éthique reporte les vulnérabilités au propriétaire avant publication (disclosure coordonnée, généralement 90 jours), (4) **Impact minimal** : un pentest éthique évite de causer des dommages réels (pas de suppression de données, pas d'exfiltration de vraies données). En Algérie, la loi 04-15 sur la prévention et la lutte contre la cybercriminalité sanctionne l'accès non autorisé.

---

**Q30. Si vous étiez RSSI (Responsable de la Sécurité des Systèmes d'Information), quelles seraient vos priorités ?**

> En tant que RSSI, mes priorités seraient organisées selon le framework NIST Cybersecurity : (1) **Identifier** : inventaire des actifs critiques, cartographie des risques, classification des données, (2) **Protéger** : MFA pour tous les accès sensibles, chiffrement des données au repos et en transit, formation continue des équipes, gestion des patches, principe du moindre privilège, (3) **Détecter** : SIEM (Security Information and Event Management) pour la corrélation des logs, IDS/IPS, monitoring 24/7, (4) **Répondre** : plan de réponse aux incidents (IR Plan) testé annuellement, équipe CERT interne ou externalisée, procédures de notification CNIL/ANSSI, (5) **Récupérer** : sauvegardes testées (3-2-1 rule), plan de continuité (PCA) et de reprise (PRA), exercices de simulation. Budget recommandé : 15-20% du budget IT global selon Gartner.

---

*Ces 30 questions couvrent les axes les plus probables d'une soutenance de Licence en Sécurité Informatique. Maîtriser ces réponses permet d'aborder la soutenance avec confiance.*
