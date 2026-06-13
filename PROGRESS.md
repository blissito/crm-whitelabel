# Estado del proyecto — CRM white-label

> Documento para retomar. Última actualización: 2026-06-13.

## Qué es
CRM **white-label** multi-tenant. El **repo es el producto genérico**; **CoreGrid es el piloto** con su marca aplicada (runtime, vía `Workspace.branding`).

- **Carpeta local:** `/Users/bliss/crm`
- **Repo:** https://github.com/blissito/crm-whitelabel (público)
- **Producción:** https://crm-coregrid.fly.dev (Fly app `crm-coregrid`, region `dfw`)
- **MCP en npm:** `coregrid-crm-mcp` (v0.2.x)

## Stack
React Router v7 (framework, `app/routes.tsx` config-based) · Tailwind v3 · Prisma + **SQLite** (volumen Fly `/data/crm.db`) · auth email/password propio (bcryptjs + cookie) · TanStack Query (real-time) · @hello-pangea/dnd · AWS SES (email).

## Correr local
```bash
npm install
npm run db:migrate   # aplica migraciones SQLite (dev.db)
npm run db:seed      # workspace CoreGrid + admin + deals demo
npm run dev          # localhost:3000
```

## Accesos (dev/prod)
- **Admin tablero:** `admin@coregrid.com.mx` / `coregrid123` (rol ADMIN) — ⚠️ password en repo público "mientras"; rotar con secret `SEED_ADMIN_PASSWORD`.
- **Owner/super-admin:** `fixtergeek@gmail.com` / `coregrid123` (rol ADMIN en CoreGrid + super-admin de plataforma).
- **Super-admin** = allowlist de emails en env `SUPER_ADMINS` (NO es rol de DB). Da acceso a `/admin`.

## Secrets de Fly (`fly secrets list -a crm-coregrid`)
`SESSION_SECRET` · `DATABASE_URL` (env) · `CRM_API_KEY` (llave del tablero CoreGrid, la que usa ghosty) · `SUPER_ADMINS` · `SEED_ADMIN_PASSWORD` · `SES_REGION`/`SES_KEY`/`SES_SECRET` (copiados de Formmy) · `EMAIL_FROM` (`Formmy <no-reply@formmy.app>`) · `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
Valores sensibles viven SOLO en Fly secrets + `~/crm/.env` local (gitignored).

## Arquitectura clave
- **Multi-tenant** por `workspaceId` (= un tablero/distribuidor). 1 cuenta = 1 tablero (signup crea su propio workspace aislado con deals demo). *Multitablero por cuenta: pendiente.*
- **SQLite**: enums → String (`app/lib/enums.ts`); embebidos/arrays/JSON → columnas String (`app/lib/json.ts`). Migraciones **manuales** (prisma migrate dev NO corre sin TTY → crear `prisma/migrations/<ts>_<name>/migration.sql` a mano + `migrate deploy`).
- **Llaves API**: `User.apiKey` (per-seat) y `Workspace.apiKey` (tablero). `getApiContext`/`requireApiContext` resuelven bearer (agente, `via=api_key`) o cookie (panel, `via=dashboard`). Mi cuenta muestra la llave efectiva + config MCP.
- **MCP** (`mcp/` en el repo, publicado en npm): tools get_pipeline/create_deal/update_deal/move_deal/delete_deal/create_share_link. Opera el CRM con bearer key.
- **Audit log** (`AuditLog`, estándar `recurso.verbo`): blame de acciones desde UI y API key. Pestaña **Actividad** (admin) + global en `/admin`. Helper `server/audit.server.ts`.
- **Email** (`server/email.server.ts`): SES + template branded (`brandedEmail`). Invitaciones + recuperación de contraseña.
- **Deploy**: `flyctl deploy --remote-only`. **Migrar/seedear al ARRANQUE** (Dockerfile CMD), no en release_command (la release VM no monta el volumen). **NUNCA `fly scale count >1`** (SQLite single-writer). `auto_stop=false`, siempre encendida.

## Construido ✅
- Auth: registro · login · logout · **invitación por email** · **recuperación de contraseña** (token 1h).
- Pipeline/kanban: drag&drop (grab&pan + `flushSync` anti-brinco) · editor de etapas (add/rename/delete/reorder/color) · drawer animado · real-time (poll 4s) · share links públicos solo-lectura.
- Equipo (seats): invitación por link/email, miembros, roles.
- Mi cuenta: llave + config MCP (comando + mcp.json) + link npm.
- **Super-admin** `/admin`: tableros, usuarios, actividad global (gated por `SUPER_ADMINS`).
- **Audit log** con blame.
- Integraciones (pestaña): 17 marcas "próximamente" (WhatsApp, Messenger, Instagram, Meta Ads, Mercado Pago, Stripe, Conekta, Kommo, Facturama, Odoo, Shopify, HubSpot, Google Workspace, Google Calendar, Zapier, Slack, Telegram).
- Branding CoreGrid: logo (sidebar/login/favicon), navy + cyan + acento naranja. Sidebar colapsable.

## Pendientes ⏳
1. **Dominio `crm.coregrid.com.mx`**: cert de Fly creado; esperando que CoreGrid agregue DNS (CNAME `crm`→`crm-coregrid.fly.dev`). Al propagar: `fly certs check crm.coregrid.com.mx`. (OJO es `.com.mx`).
2. **Conversaciones** (bandeja) y **Contactos**/Leads: hoy placeholders. (Conversaciones tiene empty state con CTA "Conectar WhatsApp").
3. **Ingesta WhatsApp WABA**: webhook + crear Conversation/Message/Contact. Modelos ya en schema (`WhatsAppChannel`, `ProcessedWebhook`). Falta número/credenciales WABA.
4. **Ajustes del tablero**: la pestaña se quitó (se repensará: editar marca/nombre + zona de peligro).
5. **Multitablero por cuenta**: hoy 1 cuenta = 1 tablero. Para N: membresía muchos-a-muchos User↔Workspace + selector.
6. **Seguridad**: rotar `SEED_ADMIN_PASSWORD` (coregrid123 está en repo público).
7. **MCP**: agregar `repository` al package.json; considerar más tools (listar/filtrar deals, conversaciones).
8. Métricas/dashboard de inicio (KPIs) — opcional, buen escaparate.

## Referencia: CRM original (para portar Conversaciones/Contactos)
`/Users/bliss/formmy_rrv7` — componentes `app/components/chat/{crm,common}`, contrato de shape en `app/lib/queries/conversations.ts`, webhook WABA en `app/routes/api.v1.integrations.whatsapp.webhook.tsx`.
