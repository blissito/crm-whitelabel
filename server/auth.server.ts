import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { redirect } from "react-router";
import { db } from "~/lib/db.server";
import {
  getSession,
  commitSession,
  destroySession,
} from "~/sessions.server";
import { UserRole } from "~/lib/enums";
import { defaultWorkspaceData, seedDemoDeals } from "server/workspace-defaults";

const BCRYPT_ROUNDS = 12;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  workspaceId: string;
};

/** Crea un usuario con password hasheado. Lanza si el email ya existe. */
export async function register(params: {
  email: string;
  password: string;
  name?: string;
  workspaceId: string;
  role?: string;
}) {
  const email = params.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Ya existe una cuenta con ese correo");
  }
  const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);
  return db.user.create({
    data: {
      email,
      name: params.name ?? null,
      passwordHash,
      workspaceId: params.workspaceId,
      role: params.role ?? UserRole.MEMBER,
    },
  });
}

/** Registro self-serve: crea un TABLERO propio (Workspace aislado, con deals
 *  demo) y al user como OWNER con su llave personal. Cada grupo/demo ve solo su
 *  tablero. Devuelve el user. */
export async function registerNewTenant(params: {
  email: string;
  password: string;
  name?: string;
}) {
  const email = params.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("Ya existe una cuenta con ese correo");

  const baseName = params.name?.trim() || email.split("@")[0];
  const slug = `${slugify(baseName)}-${randomBytes(3).toString("hex")}`;

  const workspace = await db.workspace.create({
    data: defaultWorkspaceData({ slug, name: baseName }),
  });
  await seedDemoDeals(db, workspace.id);

  const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);
  return db.user.create({
    data: {
      email,
      name: params.name?.trim() || null,
      passwordHash,
      role: UserRole.OWNER,
      workspaceId: workspace.id,
      apiKey: generateApiKey(),
    },
  });
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "tablero"
  );
}

/** Valida credenciales. Devuelve el user o null. */
export async function verifyLogin(email: string, password: string) {
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

/** Crea la cookie de sesión y redirige. */
export async function createUserSession(userId: string, redirectTo = "/app") {
  const session = await getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await commitSession(session) },
  });
}

/** Lee el userId de la cookie (o null). */
export async function getUserId(request: Request): Promise<string | null> {
  const session = await getSession(request.headers.get("Cookie"));
  return session.get("userId") ?? null;
}

/** Carga el user de sesión (o null). */
export async function getUser(request: Request): Promise<SessionUser | null> {
  const userId = await getUserId(request);
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, workspaceId: true },
  });
  return user;
}

/** Exige sesión; redirige a /login si no hay. Devuelve el user. */
export async function getUserOrRedirect(
  request: Request,
  redirectTo = "/login"
): Promise<SessionUser> {
  const user = await getUser(request);
  if (!user) {
    const url = new URL(request.url);
    const params = new URLSearchParams({ redirectTo: url.pathname });
    throw redirect(`${redirectTo}?${params}`);
  }
  return user;
}

/** Helper de tenancy: exige sesión y devuelve { user, workspaceId }. */
export async function requireWorkspace(request: Request) {
  const user = await getUserOrRedirect(request);
  return { user, workspaceId: user.workspaceId };
}

/** Genera una llave de API (`crm_sk_<hex>`). */
export function generateApiKey(): string {
  return `crm_sk_${randomBytes(24).toString("hex")}`;
}

export type ApiContext = {
  workspaceId: string;
  userId: string | null;
  userEmail: string | null;
};

/** Resuelve el contexto desde `Authorization: Bearer <apiKey>`. La llave es
 *  PER-USER (cada seat la suya) y como el user pertenece a un tablero, queda
 *  scopeada a su Workspace. Fallback: llave a nivel workspace (org). */
export async function getApiContext(
  request: Request
): Promise<ApiContext | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  // 1) Llave de user → su tablero + atribución.
  const user = await db.user.findUnique({
    where: { apiKey: token },
    select: { id: true, email: true, workspaceId: true },
  });
  if (user) {
    return { workspaceId: user.workspaceId, userId: user.id, userEmail: user.email };
  }

  // 2) Llave de workspace (org).
  const ws = await db.workspace.findUnique({
    where: { apiKey: token },
    select: { id: true },
  });
  if (ws) return { workspaceId: ws.id, userId: null, userEmail: null };

  return null;
}

/** Contexto para endpoints API: bearer (agente/MCP, per-user o workspace) O
 *  cookie de sesión (dashboard). Lanza 401 si ninguno resuelve. */
export async function requireApiContext(request: Request): Promise<ApiContext> {
  const fromKey = await getApiContext(request);
  if (fromKey) return fromKey;
  const user = await getUser(request);
  if (user) {
    return { workspaceId: user.workspaceId, userId: user.id, userEmail: user.email };
  }
  throw new Response("No autorizado", { status: 401 });
}

/** Igual que requireApiContext pero devuelve solo el workspaceId. */
export async function requireWorkspaceId(request: Request): Promise<string> {
  const ctx = await requireApiContext(request);
  return ctx.workspaceId;
}

/** Org (Workspace) por defecto de esta instancia: la primera/única.
 *  En el modelo white-label, cada deploy = una org de distribuidor. */
export async function getDefaultWorkspaceId(): Promise<string | null> {
  const ws = await db.workspace.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return ws?.id ?? null;
}

/** ¿El user tiene rol admin (OWNER/ADMIN)? Para gating de rutas admin. */
export function isAdmin(user: { role: string }): boolean {
  return user.role === UserRole.OWNER || user.role === UserRole.ADMIN;
}

/** Exige sesión + rol admin; si no, 403. */
export async function requireAdmin(request: Request): Promise<SessionUser> {
  const user = await getUserOrRedirect(request);
  if (!isAdmin(user)) {
    throw new Response("No autorizado", { status: 403 });
  }
  return user;
}

/** Destruye la sesión y redirige a /login. */
export async function logout(request: Request) {
  const session = await getSession(request.headers.get("Cookie"));
  return redirect("/login", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}
