import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { getUser, verifyLogin, createUserSession } from "server/auth.server";
import { siteMeta } from "~/lib/meta";

export function meta() {
  return siteMeta({ title: "Iniciar sesión · CoreGrid CRM" });
}

export async function loader({ request }: Route.LoaderArgs) {
  // Verifica que el user EXISTA (no solo la cookie): una cookie con un userId
  // de un user borrado causaba loop de redirección /login↔/app.
  if (await getUser(request)) throw redirect("/app");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const redirectTo = String(form.get("redirectTo") ?? "/app");

  if (!email || !password) {
    return { error: "Correo y contraseña son requeridos" };
  }
  const user = await verifyLogin(email, password);
  if (!user) {
    return { error: "Credenciales inválidas" };
  }
  return createUserSession(user.id, redirectTo || "/app");
}

export default function Login({ actionData }: Route.ComponentProps) {
  const errors = actionData as { error?: string } | undefined;
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-dark to-hole p-6">
      <div className="flex w-full max-w-sm flex-col items-center">
        {/* Logo blanco sobre navy — grande como en la marca */}
        <img
          src="/brand/coregrid-logo.png"
          alt="CoreGrid"
          className="mb-8 w-72 max-w-full object-contain"
        />
        <div className="w-full rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-dark">Bienvenido</h1>
            <p className="mt-1 text-sm text-gray-500">Ingresa a tu CRM</p>
          </div>

          <Form method="post" className="space-y-4">
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
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
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
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-60"
            >
              {busy ? "Ingresando…" : "Iniciar sesión"}
            </button>
          </Form>

          <p className="mt-3 text-center text-sm">
            <Link to="/recuperar" className="text-gray-400 hover:text-gray-600">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>

          <p className="mt-5 text-center text-sm text-gray-500">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="font-semibold text-brand-500 hover:text-brand-600">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
