# ============================================================
# Makefile — SecLab v2 — Commandes de développement
# ============================================================
# Usage : make <commande>
# Exemple : make dev | make build | make logs | make shell-backend

.PHONY: dev build stop clean logs shell-backend shell-frontend shell-db \
        status health reset-db ps

# ─── Couleurs pour le terminal ───────────────────────────────────────────────
CYAN  = \033[36m
GREEN = \033[32m
RED   = \033[31m
RESET = \033[0m
BOLD  = \033[1m

# ─── Configuration ───────────────────────────────────────────────────────────
COMPOSE      = docker compose
COMPOSE_PROD = docker compose -f docker-compose.prod.yml
PROJECT_NAME = seclab

##@ Développement

dev: ## Démarrer en mode développement (avec rebuild)
	@echo "$(CYAN)$(BOLD)🚀 Démarrage de SecLab en mode développement...$(RESET)"
	$(COMPOSE) up --build

dev-bg: ## Démarrer en arrière-plan
	@echo "$(CYAN)$(BOLD)🚀 Démarrage en background...$(RESET)"
	$(COMPOSE) up --build -d
	@echo "$(GREEN)✅ SecLab démarré — http://localhost$(RESET)"

start: ## Démarrer sans rebuild (rapide)
	@echo "$(CYAN)🔄 Démarrage rapide...$(RESET)"
	$(COMPOSE) up -d
	@echo "$(GREEN)✅ http://localhost$(RESET)"

##@ Build

build: ## Builder toutes les images Docker
	@echo "$(CYAN)$(BOLD)🔨 Build de toutes les images...$(RESET)"
	$(COMPOSE) build --no-cache

build-prod: ## Builder pour la production
	@echo "$(CYAN)$(BOLD)🏗️  Build production...$(RESET)"
	$(COMPOSE_PROD) build --no-cache

deploy-prod: ## Déployer en production
	@echo "$(CYAN)$(BOLD)🚀 Déploiement production...$(RESET)"
	$(COMPOSE_PROD) up -d
	@echo "$(GREEN)✅ Production démarrée$(RESET)"

##@ Arrêt et Nettoyage

stop: ## Arrêter tous les conteneurs
	@echo "$(RED)⏹  Arrêt des conteneurs...$(RESET)"
	$(COMPOSE) down

stop-prod: ## Arrêter la production
	$(COMPOSE_PROD) down

clean: ## Arrêter et supprimer volumes + images
	@echo "$(RED)🗑️  Nettoyage complet (volumes + images)...$(RESET)"
	$(COMPOSE) down -v --rmi local
	@echo "$(GREEN)✅ Nettoyage terminé$(RESET)"

clean-all: ## Nettoyage complet Docker (ATTENTION : affecte tout Docker)
	@echo "$(RED)⚠️  Nettoyage complet Docker...$(RESET)"
	docker system prune -af --volumes
	@echo "$(GREEN)✅ Docker nettoyé$(RESET)"

##@ Logs et Monitoring

logs: ## Voir les logs de tous les services (follow)
	$(COMPOSE) logs -f

logs-backend: ## Logs du backend uniquement
	$(COMPOSE) logs -f backend

logs-frontend: ## Logs du frontend uniquement
	$(COMPOSE) logs -f frontend

logs-db: ## Logs MySQL uniquement
	$(COMPOSE) logs -f mysql

status: ## Statut des conteneurs
	@echo "$(CYAN)$(BOLD)📊 Statut des conteneurs SecLab :$(RESET)"
	$(COMPOSE) ps

ps: status ## Alias pour status

health: ## Vérifier la santé de l'API
	@echo "$(CYAN)🏥 Health check...$(RESET)"
	@curl -s http://localhost/api/health | python3 -m json.tool 2>/dev/null || \
	 curl -s http://localhost/api/health || \
	 echo "$(RED)❌ API non accessible$(RESET)"

health-detailed: ## Health check détaillé (DB, mémoire, stats)
	@echo "$(CYAN)🏥 Health check détaillé...$(RESET)"
	@curl -s http://localhost/api/health/detailed | python3 -m json.tool 2>/dev/null || \
	 curl -s http://localhost/api/health/detailed

##@ Shell (Accès aux conteneurs)

shell-backend: ## Ouvrir un shell dans le backend
	@echo "$(CYAN)🐚 Shell backend (Node.js)...$(RESET)"
	$(COMPOSE) exec backend sh

shell-frontend: ## Ouvrir un shell dans le frontend (nginx)
	@echo "$(CYAN)🐚 Shell frontend (nginx)...$(RESET)"
	$(COMPOSE) exec frontend sh

shell-db: ## Ouvrir MySQL CLI
	@echo "$(CYAN)🐚 MySQL CLI...$(RESET)"
	$(COMPOSE) exec mysql mysql -u $${MYSQL_USER:-seclab_user} -p$${MYSQL_PASSWORD:-SecureDB@2024!} security_lab

##@ Base de données

reset-db: ## Réinitialiser la base de données (supprime les données!)
	@echo "$(RED)⚠️  Réinitialisation de la base de données...$(RESET)"
	@read -p "Êtes-vous sûr ? (oui/non) : " confirm && [ "$$confirm" = "oui" ] || exit 1
	$(COMPOSE) down -v
	$(COMPOSE) up -d mysql
	@echo "$(GREEN)✅ Base de données réinitialisée$(RESET)"

backup-db: ## Sauvegarder la base de données
	@echo "$(CYAN)💾 Sauvegarde de la base de données...$(RESET)"
	$(COMPOSE) exec mysql mysqldump -u root -p$${MYSQL_ROOT_PASSWORD} security_lab > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Sauvegarde créée$(RESET)"

##@ Aide

help: ## Afficher cette aide
	@echo ""
	@echo "$(BOLD)$(CYAN)🛡️  SecLab v2 — Commandes disponibles$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BOLD)%s$(RESET)\n", substr($$0, 5) }' $(MAKEFILE_LIST)
	@echo ""

.DEFAULT_GOAL := help
