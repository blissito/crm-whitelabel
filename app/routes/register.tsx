import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/register";
import {
  getUserId,
  register,
  createUserSession,
  getDefaultWorkspaceId,
} from "server/auth.server";
import { UserRole } from "~/lib/enums";

export function meta() {
  return [{ title: "Crear cuenta · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  if (await getUserId(request)) throw redirect("/app");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return { error: "Correo y contraseña son requeridos" };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" };
  }

  const workspaceId = await getDefaultWorkspaceId();
  if (!workspaceId) {
    return { error: "No hay organización configurada. Contacta al administrador." };
  }

  try {
    // Por defecto entra como cliente (MEMBER). Admin se asigna manualmente.
    const user = await register({
      email,
      password,
      name: name || undefined,
      workspaceId,
      role: UserRole.MEMBER,
    });
    return createUserSession(user.id, "/app");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear la cuenta" };
  }
}

export default function Register({ actionData }: Route.ComponentProps) {
  const errors = actionData as { error?: string } | undefined;
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-dark to-hole p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img
            src="/brand/coregrid-logo.png"
            alt="CoreGrid"
            className="h-16 w-auto object-contain"
          />
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-dark">Crear cuenta</h1>
            <p className="mt-1 text-sm text-gray-500">Empieza a usar tu CRM</p>
          </div>

          <Form method="post" className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Nombre
              </label>
              <input type="text" name="name" autoComplete="name" className="input" placeholder="Tu nombre" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Correo
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="input"
                placeholder="tu@correo.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="new-password"
                className="input"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {errors?.error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {errors.error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {busy ? "Creando…" : "Crear cuenta"}
            </button>
          </Form>

          <p className="mt-5 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-semibold text-brand-500 hover:text-brand-600">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
