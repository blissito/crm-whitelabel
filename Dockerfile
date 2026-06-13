# syntax=docker/dockerfile:1
# ─── Build stage ─────────────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

# openssl: requerido por Prisma engine
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# prisma/ debe existir antes de npm ci: el postinstall corre `prisma generate`.
COPY package.json package-lock.json ./
COPY prisma ./prisma
# Cache de npm entre builds (acelera cuando cambia el lock). El layer de npm ci
# se reusa intacto cuando package*.json no cambian.
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build

# ─── Prod deps ───────────────────────────────────────────────────────────
# Poda devDeps (vite/typescript/react-router-dev/tailwind…) dejando solo lo de
# runtime: deps + prisma (migrate deploy) + tsx (db seed). Imagen mucho más
# chica → push/pull/boot más rápidos.
FROM build AS prod-deps
RUN npm prune --omit=dev

# ─── Runtime stage ───────────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
# Migrar + seedear (idempotente) en el arranque, donde el volumen /data SÍ
# está montado. Luego levantar el server.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm run start"]
