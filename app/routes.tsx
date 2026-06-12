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
  route("logout", "routes/logout.tsx"),

  // API
  route("api/v1/crm", "routes/api.v1.crm.ts"),

  layout("routes/app.tsx", [
    route("app", "routes/app._index.tsx"),
    route("app/conversaciones", "routes/app.conversaciones.tsx"),
    route("app/contactos", "routes/app.contactos.tsx"),
    route("app/pipeline", "routes/app.pipeline.tsx"),
    route("app/escalaciones", "routes/app.escalaciones.tsx"),
  ]),
] satisfies RouteConfig;
