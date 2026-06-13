import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/invite.$token";
import { getUserId, createUserSession } from "server/auth.server";
import { resolveInvitation, acceptInvitation } from "server/team.server";

export function meta() {
  return [{ title: "Invitación · CRM CoreGrid" }, { name: "robots", content: "noindex" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  if (await getUserId(request)) throw redirect("/app");
  const invite = await resolveInvitation(params.token);
  if (!invite) {
    throw new Response("Invitación inválida o expirada", { status: 404 });
  }
  return { workspaceName: invite.workspaceName, email: invite.email };
}

export async function action({ request, params }: Route.ActionArgs) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email || !password) return { error: "Correo y contraseña son requeridos" };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };

  try {
    const user = await acceptInvitation(params.token, { name: name || undefined, email, password });
    // La llave ya quedó cableada en el agente por el admin → directo al pipeline.
    return createUserSession(user.id, "/app/pipeline");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo aceptar la invitación" };
  }
}

export default function Invite({ loaderData, actionData }: Route.ComponentProps) {
  const { workspaceName, email } = loaderData;
  const errors = actionData as { error?: string } | undefined;
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-dark to-hole p-6">
      <div className="flex w-full max-w-sm flex-col items-center">
        <img
          src="/brand/coregrid-logo.png"
          alt="CoreGrid"
          className="mb-8 w-64 max-w-full object-contain"
        />
        <div className="w-full rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-dark">Te invitaron a {workspaceName}</h1>
            <p className="mt-1 text-sm text-gray-500">Crea tu acceso para colaborar.</p>
          </div>

          <Form method="post" className="space-y-4">
            <input type="text" name="name" placeholder="Tu nombre" autoComplete="name" className="input" />
            <input
              type="email"
              name="email"
              required
              defaultValue={email ?? ""}
              readOnly={!!email}
              placeholder="tu@correo.com"
              autoComplete="email"
              className="input"
            />
            <input
              type="password"
              name="password"
              required
              placeholder="Contraseña (mín. 6)"
              autoComplete="new-password"
              className="input"
            />
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
              {busy ? "Entrando…" : "Unirme al tablero"}
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
        <h1 className="text-2xl font-semibold text-dark">Invitación no disponible</h1>
        <p className="mt-2 text-sm text-gray-500">Este link es inválido o ya expiró.</p>
      </div>
    </main>
  );
}
