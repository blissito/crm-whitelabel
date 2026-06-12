# CRM CoreGrid

CRM white-label para distribuidores. Bandeja de WhatsApp + pipeline de ventas.
Stack: React Router v7 + Tailwind + Prisma/SQLite, en Fly.io.

**Producción:** https://crm-coregrid.fly.dev
**Login demo:** `admin@coregrid.com.mx` / `coregrid123`

## Desarrollo

```bash
npm install
npm run db:migrate   # crea/aplica migraciones SQLite (dev.db)
npm run db:seed      # workspace CoreGrid + user + oportunidades demo
npm run dev          # http://localhost:3000
```

## Arquitectura

- **Multi-tenant** por `workspaceId` (un distribuidor = un Workspace con N usuarios).
- **SQLite** como `String`-enums + columnas JSON (helpers en `app/lib/json.ts`,
  constantes en `app/lib/enums.ts`).
- **Auth** propio email/password (bcrypt + cookie), ver `server/auth.server.ts`.
- **Branding** runtime desde `Workspace.branding` (logo, color) → habilita N
  distribuidores sin tocar código.

## Deploy (Fly.io)

```bash
fly deploy --app crm-coregrid --remote-only
```

⚠️ **CRÍTICO: SQLite es single-writer. NUNCA `fly scale count >1`.**
Dos máquinas = dos bases divergentes → corrupción. El `fly.toml` fija
`min_machines_running = 1`, `auto_stop_machines = false`, `strategy = immediate`.

La base vive en el volumen `crm_data` montado en `/data`. Las migraciones y el
seed corren al **arranque de la máquina** (Dockerfile `CMD`), no en
`release_command` — la release VM efímera no monta el volumen.

**Backups:** snapshots automáticos del volumen (retención 5 días).

## Estado

- ✅ Auth email/password + multi-tenancy
- ✅ Pipeline / kanban de ventas (drag & drop, drawer editable, stats)
- ⏳ Conversaciones (bandeja WhatsApp) — Fase 2 pendiente
- ⏳ Contactos / Leads — Fase 2 pendiente
- ⏳ Ingesta WhatsApp WABA — Fase 3 (cuando se conecte el número)
