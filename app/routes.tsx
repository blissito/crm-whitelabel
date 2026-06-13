import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("recuperar", "routes/recuperar.tsx"),
  route("reset/:token", "routes/reset.$token.tsx"),
  route("logout", "routes/logout.tsx"),

  // Público (solo-lectura por token)
  route("s/:token", "routes/s.$token.tsx"),
  route("invite/:token", "routes/invite.$token.tsx"),

  // API
  route("api/v1/crm", "routes/api.v1.crm.ts"),
  route("api/v1/share/:token", "routes/api.v1.share.$token.ts"),
  route(
    "api/v1/share/:token/notes/:dealId",
    "routes/api.v1.share.$token.notes.$dealId.ts"
  ),
  route("api/v1/webhook/formmy", "routes/api.v1.webhook.formmy.ts"),

  layout("routes/app.tsx", [
    route("app", "routes/app._index.tsx"),
    route("app/conversaciones", "routes/app.conversaciones.tsx"),
    route("app/contactos", "routes/app.contactos.tsx"),
    route("app/pipeline", "routes/app.pipeline.tsx"),
    route("app/escalaciones", "routes/app.escalaciones.tsx"),
    route("app/integraciones", "routes/app.integraciones.tsx"),
    route("app/equipo", "routes/app.equipo.tsx"),
    route("app/actividad", "routes/app.actividad.tsx"),
    route("app/cuenta", "routes/app.cuenta.tsx"),
  ]),

  // Panel de plataforma (super-admin, cross-tenant)
  layout("routes/admin.tsx", [
    route("admin", "routes/admin._index.tsx"),
    route("admin/usuarios", "routes/admin.usuarios.tsx"),
    route("admin/actividad", "routes/admin.actividad.tsx"),
  ]),
] satisfies RouteConfig;
