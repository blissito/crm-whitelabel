# CRM CoreGrid

CRM white-label para distribuidores. Bandeja de WhatsApp + pipeline de ventas.
Stack: React Router v7 + Tailwind + Prisma/SQLite, en Fly.io.

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

## Modelo de tableros

**Hoy: 1 cuenta = 1 tablero** (`User` n:1 `Workspace`). El signup crea un tablero
aislado propio. Cada usuario tiene su llave personal (`User.apiKey`) que opera
solo su tablero.

> **PRÓXIMAMENTE: multitablero** — una cuenta administrará N tableros (membresía
> muchos-a-muchos `User`↔`Workspace` + selector de tablero + crear tablero).

## Estado

- ✅ Auth email/password + multi-tenancy (1 tablero por cuenta)
- ✅ Pipeline / kanban de ventas (drag & drop, drawer animado, stats)
- ✅ Real-time del tablero (TanStack Query, poll 4s)
- ✅ Llave por user + página "Mi cuenta" + MCP (`coregrid-crm-mcp`)
- ⏳ Multitablero por cuenta — próximamente
- ⏳ Conversaciones (bandeja WhatsApp) — pendiente
- ⏳ Contactos / Leads — pendiente
- ⏳ Ingesta WhatsApp WABA — Fase 3 (cuando se conecte el número)
