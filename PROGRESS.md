# Estado del proyecto — CRM white-label

> Documento para retomar. Última actualización: 2026-06-13 (sesión tarde: mirror Formmy).

## Qué es
CRM **white-label** multi-tenant. El **repo es el producto genérico**; **CoreGrid es el piloto** con su marca aplicada (runtime, vía `Workspace.branding`).

- **Carpeta local:** `/Users/bliss/crm`
- **Repo:** https://github.com/blissito/crm-whitelabel (público)
- **Producción:** https://crm.coregrid.com.mx (dominio activo) · fallback https://crm-coregrid.fly.dev (Fly app `crm-coregrid`, region `dfw`)
- **MCP en npm:** `coregrid-crm-mcp` (**v0.5.0** — pipeline + notas + contactos + conversaciones/coexistencia + escalaciones)

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
- **Super-admin** = allowlist de emails en env `SUPER_ADMINS` (NO es rol de DB). Da acceso a `/admin`. Actual: `fixtergeek@gmail.com, admin@coregrid.com.mx, oscar_gonzalez@coregrid.com.mx`.
- **Rol de tablero** (OWNER/ADMIN/MEMBER) se cambia en **Equipo** (botón "Hacer admin" por miembro; no toca al OWNER ni a uno mismo). Distinto del super-admin.

## Secrets de Fly (`fly secrets list -a crm-coregrid`)
`SESSION_SECRET` · `DATABASE_URL` (env) · `CRM_API_KEY` (llave del tablero CoreGrid, la que usa ghosty) · `SUPER_ADMINS` · `SEED_ADMIN_PASSWORD` · `SES_REGION`/`SES_KEY`/`SES_SECRET` (copiados de Formmy) · `EMAIL_FROM` (`Formmy <no-reply@formmy.app>`) · `WHATSAPP_WEBHOOK_VERIFY_TOKEN` · **`PUBLIC_BASE_URL`** (`https://crm.coregrid.com.mx`) · **`CRM_INGEST_SECRET`** (Bearer que Formmy usa para postear el mirror; lo genera el CRM) · **`CRM_CONTROL_SECRET`** (`crmctl_…`; lo genera Formmy, scopeado al agentId; sirve para control Y media) · **`FORMMY_MEDIA_URL`** (`https://formmy.app/api/v1/crm/media`). `FORMMY_CONTROL_URL` tiene default en código (`https://formmy.app/api/v1/crm/control`).
Valores sensibles viven SOLO en Fly secrets + `~/crm/.env` local (gitignored).

## Arquitectura clave
- **Multi-tenant** por `workspaceId` (= un tablero/distribuidor). 1 cuenta = 1 tablero (signup crea su propio workspace aislado con deals demo). *Multitablero por cuenta: pendiente.*
- **SQLite**: enums → String (`app/lib/enums.ts`); embebidos/arrays/JSON → columnas String (`app/lib/json.ts`). Migraciones **manuales** (prisma migrate dev NO corre sin TTY → crear `prisma/migrations/<ts>_<name>/migration.sql` a mano + `migrate deploy`).
- **Llaves API**: `User.apiKey` (per-seat) y `Workspace.apiKey` (tablero). `getApiContext`/`requireApiContext` resuelven bearer (agente, `via=api_key`) o cookie (panel, `via=dashboard`). Mi cuenta muestra la llave efectiva + config MCP.
- **MCP** (`mcp/` en el repo, publicado en npm): tools get_pipeline/create_deal/update_deal/move_deal/delete_deal/create_share_link. Opera el CRM con bearer key.
- **Audit log** (`AuditLog`, estándar `recurso.verbo`): blame de acciones desde UI y API key. Pestaña **Actividad** (admin) + global en `/admin`. Helper `server/audit.server.ts`.
- **Email** (`server/email.server.ts`): SES + template branded (`brandedEmail`). Invitaciones + recuperación de contraseña.
- **Deploy**: `flyctl deploy --remote-only`. **Migrar/seedear al ARRANQUE** (Dockerfile CMD), no en release_command (la release VM no monta el volumen). **NUNCA `fly scale count >1`** (SQLite single-writer). `auto_stop=false`, siempre encendida.
  - **Imagen slim**: stage `prod-deps` poda devDeps con `npm prune --omit=dev`. `prisma` y `tsx` están en **dependencies** (no devDeps) porque el arranque corre `migrate deploy` + `db seed`; si los mueves a devDeps, el boot truena. BuildKit cachea `npm ci` (`--mount=type=cache`).
- **Meta/OG** (`app/lib/meta.ts` → `siteMeta()`): título + descripción + OG/Twitter con el logo. En RR v7 el `meta` del hijo REEMPLAZA al del padre → cada ruta pública llama a `siteMeta()`. root lo cubre para las que no tienen meta propio.

## Construido ✅
- Auth: registro · login · logout · **invitación por email** · **recuperación de contraseña** (token 1h).
- Pipeline/kanban: drag&drop (grab&pan + `flushSync` anti-brinco) · editor de etapas (add/rename/delete/reorder/color) · drawer animado · real-time (poll 4s) · share links públicos solo-lectura.
- Equipo (seats): invitación por link/email, miembros, roles. **Cambiar rol** (ADMIN↔MEMBER) por miembro. Invitaciones pendientes ocultan las muertas (correo ya registrado) y muestran correo+rol.
- Mi cuenta: llave + config MCP (comando + mcp.json) + link npm. **Links públicos**: lista y apaga (revoke) los share links activos del tablero (admin).
- **Share links**: link de tablero deja ver TODOS los leads → tarjetas clicables abren detalle read-only (cliente/tel/email/valor/tags/etapa); link de deal muestra ese detalle. URL siempre con dominio canónico (`PUBLIC_BASE_URL`).
- **Super-admin** `/admin`: tableros, usuarios, actividad global (gated por `SUPER_ADMINS`). **Provisionar tablero**: crea Workspace + apiKey + deals demo + invitación OWNER de una; muestra llave y link copiables (cableas la llave en el agente antes de que el invitado entre); el invitado acepta el correo y cae a `/app/pipeline`.
- **Audit log** con blame.
- Integraciones (pestaña): 17 marcas "próximamente" (WhatsApp, Messenger, Instagram, Meta Ads, Mercado Pago, Stripe, Conekta, Kommo, Facturama, Odoo, Shopify, HubSpot, Google Workspace, Google Calendar, Zapier, Slack, Telegram).
- Branding CoreGrid: logo (sidebar/login/favicon), navy + cyan + acento naranja. Sidebar colapsable.

## Pendientes ⏳
1. **WABA pairing (BLOQUEANTE para tráfico real):** el canal de Coregrid sigue **DISCONNECTED** del lado de Formmy (falta Embedded Signup/pairing). El CRM ya está 100% listo; en cuanto pareen, las conversaciones entran solas. Nada que hacer del lado CRM.
2. **Esperando de Formmy / verificar al primer mensaje real:** (a) confirmar que el 302 de `/api/v1/crm/media/<fileId>` va a URL firmada que NO requiere reenviar `Authorization` (mi `fetch` sigue redirect; en cross-origin no propaga header); (b) probar control real (`set_pause`/`send_manual_response`) end-to-end.
3. **Ajustes del tablero**: la pestaña se quitó (se repensará: editar marca/nombre + zona de peligro).
4. **Multitablero por cuenta**: hoy 1 cuenta = 1 tablero. Para N: membresía muchos-a-muchos User↔Workspace + selector.
5. **Seguridad**: rotar `SEED_ADMIN_PASSWORD` (coregrid123 está en repo público).
6. **MCP**: agregar `repository` al package.json; considerar más tools (listar/filtrar deals, conversaciones).
7. Métricas/dashboard de inicio (KPIs) — opcional, buen escaparate.

## Integración Formmy ↔ CRM (mirror WABA) — clave para retomar
Spec completa: **`/Users/bliss/formmy_rrv7/docs/crm-coregrid-integration.md`**. Tres planos; el CRM solo participa en A (recibir) y B (controlar).

- **Plano A — recibir transcript** (Formmy → CRM, fire-and-forget, evento por mensaje):
  - Endpoint: `POST /api/ingest/message`, Bearer `CRM_INGEST_SECRET`. Responde 2xx siempre. `app/routes/api.ingest.message.ts` → `server/ingest.server.ts`.
  - Dedupe por `externalMessageId` (`ProcessedWebhook`). Upsert `Conversation` por `sessionId`; guarda `externalConversationId` (id de Formmy, para plano B). Roles `user/assistant/operator` (`assistant_blocked` se ignora). Refleja `coexistence{paused,pauseUntil,pauseReason}`.
- **Plano B — control** (CRM → Formmy): `server/coexistence.server.ts` → `POST https://formmy.app/api/v1/crm/control` Bearer `CRM_CONTROL_SECRET`. Intents `set_pause` (30min|2h|until_tomorrow|permanent|resume) y `send_manual_response`. Payload lleva `{agentId, conversationId(external), intent, ...}`.
- **Media**: proxy server-side `app/routes/api.media.$fileId.ts` → `{FORMMY_MEDIA_URL}/<fileId>` Bearer `CRM_CONTROL_SECRET` (sigue 302). Stickers usan `media.url` (data URL) directo. Inbox renderiza imagen/sticker/audio/video/doc + reacciones.
- **Tenant key = `agentId`** (NO phoneNumberId). Se guarda en `WhatsAppChannel.formmyIntegrationId`. **Coregrid: `agentId=6a2ccce50935370b1d488e53`, `channelId=6a2ccce50935370b1d488e54`** → mapeado en prod al workspace de **oscar_gonzalez@coregrid.com.mx** (`cmqbierqd0000sel22s78i7v1`), canal `cmqbuhuc50001semkk1jxzn1a` (accessToken/webhookVerifyToken = placeholders "formmy-managed", isActive=true).
- **Editar data de prod**: `fly ssh console -C "node -e \"const{PrismaClient}=require('@prisma/client');...\""` (la imagen runtime trae node_modules+prisma+DATABASE_URL). Migraciones manuales (sin TTY): crear `prisma/migrations/<ts>_<n>/migration.sql` + `prisma db execute` + `prisma migrate resolve --applied` local; prod las aplica en boot (`migrate deploy`).
- **Validado**: self-test E2E contra prod ingest (ingest + dedupe + alta de conversación en ws de Oscar), limpiado. Endpoints vivos (GET health, 401 sin auth).

## Hecho recientemente (2026-06-13, sesión tarde)
- **Notas en leads** end-to-end (DealNote estaba huérfano): drawer + vista compartida read-only + tools MCP. Seed con notas en el lead perdido.
- **Contactos** (UI lista+drawer, upsert idempotente por `[ws,phone]`) y **Escalamiento** (UI por status, asignar/resolver; valida conversación) — server+API+MCP+UI.
- **Conversaciones**: inbox real (lista+hilo+media), coexistencia (pausar/reanudar/tomar) y **responder como operador**. Webhook Formmy + ingesta (ver sección arriba).
- UX: `ConfirmModal` (confirm al apagar links), `useEscapeKey` (ESC cierra todos los modales), botón **Compartir** en tablero y lead, logo más grande en solo lectura.
- **MCP `coregrid-crm-mcp@0.5.0`** publicado. Migraciones nuevas: `formmyIntegrationId` (WhatsAppChannel), `externalConversationId` (Conversation).

## Hecho recientemente (2026-06-12/13)
- Dominio `crm.coregrid.com.mx` **activo** (DNS propagado, cert OK).
- Provisionar tablero desde `/admin` (Workspace+llave+invitación OWNER en un paso).
- Cambiar rol de miembro en Equipo; invitaciones muertas ocultas.
- Share links: detalle de leads en vista compartida + administrar/apagar en Mi cuenta + dominio canónico.
- Meta/OG con logo en todas las rutas públicas.
- MCP `coregrid-crm-mcp@0.2.1` publicado (con `create_share_link`).
- Deploy: imagen runtime slim + cache de npm.

## Referencia: CRM original (para portar Conversaciones/Contactos)
`/Users/bliss/formmy_rrv7` — componentes `app/components/chat/{crm,common}`, contrato de shape en `app/lib/queries/conversations.ts`, webhook WABA en `app/routes/api.v1.integrations.whatsapp.webhook.tsx`.
