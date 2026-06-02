FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p /app/demo-files && \
    echo "Bienvenue sur SecLab v2 — Plateforme pédagogique de sécurité informatique" > /app/demo-files/welcome.txt && \
    echo "# SecLab Demo Files\nCes fichiers sont accessibles via l'endpoint path traversal." > /app/demo-files/readme.md && \
    echo "# Exemple de configuration\ndb_host=localhost\ndb_port=3306" > /app/demo-files/config-example.txt && \
    echo "# Changelog\nv2.0.0 - Ajout CSRF, Path Traversal, Brute Force\nv1.0.0 - SQLi, XSS" > /app/demo-files/changelog.txt
EXPOSE 3001
CMD ["node", "server.js"]
