import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/reset.$token";
import { getUser, resolvePasswordReset, resetPassword, createUserSession } from "server/auth.server";
import { siteMeta } from "~/lib/meta";

export function meta() {
  return siteMeta({ title: "Nueva contraseña · CoreGrid CRM", noindex: true });
}

export async function loader({ request, params }: Route.LoaderArgs) {
  if (await getUser(request)) throw redirect("/app");
  const email = await resolvePasswordReset(params.token);
  if (!email) throw new Response("Enlace inválido o expirado", { status: 404 });
  return { email };
}

export async function action({ request, params }: Route.ActionArgs) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };
  if (password !== confirm) return { error: "Las contraseñas no coinciden" };

  const userId = await resetPassword(params.token, password);
  if (!userId) return { error: "El enlace expiró. Solicita uno nuevo." };
  return createUserSession(userId, "/app");
}

export default function ResetPassword({ loaderData, actionData }: Route.ComponentProps) {
  const { email } = loaderData;
  const data = actionData as { error?: string } | undefined;
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-dark to-hole p-6">
      <div className="flex w-full max-w-sm flex-col items-center">
        <img src="/brand/coregrid-logo.png" alt="CoreGrid" className="mb-8 w-64 max-w-full object-contain" />
        <div className="w-full rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-dark">Nueva contraseña</h1>
            <p className="mt-1 text-sm text-gray-500">{email}</p>
          </div>
          <Form method="post" className="space-y-4">
            <input
              type="password"
              name="password"
              required
              autoComplete="new-password"
              className="input"
              placeholder="Nueva contraseña (mín. 6)"
            />
            <input
              type="password"
              name="confirm"
              required
              autoComplete="new-password"
              className="input"
              placeholder="Confirmar contraseña"
            />
            {data?.error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{data.error}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-60"
            >
              {busy ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </Form>
        </div>
      </div>
    </main>
  );
}

export function ErrorBoundary() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-dark">Enlace no disponible</h1>
        <p className="mt-2 text-sm text-gray-500">Este enlace es inválido o ya expiró.</p>
      </div>
    </main>
  );
}
