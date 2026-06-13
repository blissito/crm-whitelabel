import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/recuperar";
import { getUser, createPasswordReset } from "server/auth.server";
import { sendPasswordResetEmail } from "server/email.server";

export function meta() {
  return [{ title: "Recuperar contraseña · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  if (await getUser(request)) throw redirect("/app");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { error: "Ingresa tu correo" };

  const reset = await createPasswordReset(email);
  if (reset) {
    const url = new URL(request.url);
    const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
    const host = request.headers.get("x-forwarded-host") || url.host;
    const base = `${proto}://${host}`;
    await sendPasswordResetEmail({
      to: email,
      resetUrl: `${base}/reset/${reset.token}`,
      baseUrl: base,
    });
  }
  // No revelamos si el correo existe.
  return { sent: true };
}

export default function Recuperar({ actionData }: Route.ComponentProps) {
  const data = actionData as { error?: string; sent?: boolean } | undefined;
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-b from-dark to-hole p-6">
      <div className="flex w-full max-w-sm flex-col items-center">
        <img src="/brand/coregrid-logo.png" alt="CoreGrid" className="mb-8 w-64 max-w-full object-contain" />
        <div className="w-full rounded-2xl bg-white p-8 shadow-xl">
          {data?.sent ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold text-dark">Revisa tu correo</h1>
              <p className="mt-2 text-sm text-gray-500">
                Si existe una cuenta con ese correo, te enviamos un enlace para
                crear una nueva contraseña. Vence en 1 hora.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-block text-sm font-semibold text-brand-500 hover:text-brand-600"
              >
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-xl font-semibold text-dark">Recuperar contraseña</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Te enviaremos un enlace a tu correo.
                </p>
              </div>
              <Form method="post" className="space-y-4">
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className="input"
                  placeholder="tu@correo.com"
                />
                {data?.error && (
                  <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                    {data.error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-60"
                >
                  {busy ? "Enviando…" : "Enviar enlace"}
                </button>
              </Form>
              <p className="mt-5 text-center text-sm text-gray-500">
                <Link to="/login" className="font-semibold text-brand-500 hover:text-brand-600">
                  Volver a iniciar sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
