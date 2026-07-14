# -----------------------------------------------------------------------------
# Image de l'intégration.
#
# Contraintes du bac à sable Gladys (« the sandbox is the defense ») :
#   - rootfs monté en LECTURE SEULE → n'écrivez jamais hors de /data
#   - un seul volume inscriptible : /data
#   - exécution en utilisateur non-root
#   - image multi-arch (linux/amd64 + linux/arm64), voir le workflow CI
# -----------------------------------------------------------------------------

FROM node:20-alpine

# dumb-init : gère correctement les signaux (SIGTERM) pour un arrêt propre.
RUN apk add --no-cache dumb-init

WORKDIR /app

# On installe d'abord les dépendances de PROD (meilleur cache de build).
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Puis le code de l'intégration.
COPY index.js ./
COPY src ./src
COPY gladys-assistant-integration.json ./

# Le seul emplacement inscriptible autorisé au runtime.
ENV NODE_ENV=production
VOLUME ["/data"]

# On tourne en utilisateur non privilégié (déjà présent dans l'image node).
USER node

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
