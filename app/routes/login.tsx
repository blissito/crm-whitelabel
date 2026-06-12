import { Form, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { getUserId, verifyLogin, createUserSession } from "server/auth.server";

export function meta() {
  return [{ title: "Iniciar sesión · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  // Si ya hay sesión, al dashboard.
  if (await getUserId(request)) throw redirect("/app");
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
    <main className="grid min-h-screen place-items-center bg-surface p-6">
      <div className="w-full max-w-sm rounded-2xl border border-outlines bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/brand/coregrid-logo.png"
            alt="CoreGrid"
            className="mb-4 h-12 w-auto object-contain"
          />
          <h1 className="text-xl font-semibold text-dark">Bienvenido</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ingresa a tu CRM
          </p>
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
              className="w-full rounded-lg border border-outlines px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
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
              className="w-full rounded-lg border border-outlines px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
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
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {busy ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </Form>
      </div>
    </main>
  );
}
