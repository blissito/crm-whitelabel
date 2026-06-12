# ─── Build stage ─────────────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

# openssl: requerido por Prisma engine
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# prisma/ debe existir antes de npm ci: el postinstall corre `prisma generate`.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

# ─── Runtime stage ───────────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# node_modules incluye devDeps (tsx) para que `prisma db seed` corra en release.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
# Migrar + seedear (idempotente) en el arranque, donde el volumen /data SÍ
# está montado. Luego levantar el server.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm run start"]
