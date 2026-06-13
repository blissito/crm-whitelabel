import { Form, useNavigation, redirect } from "react-router";
import type { Route } from "./+types/app.ajustes";
import { requireAdmin, logout } from "server/auth.server";
import { db } from "~/lib/db.server";
import { parseBranding, serialize } from "~/lib/json";
import { logAction } from "server/audit.server";
import { UserRole } from "~/lib/enums";

export function meta() {
  return [{ title: "Ajustes · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAdmin(request);
  const ws = await db.workspace.findUnique({
    where: { id: user.workspaceId },
    select: { name: true, slug: true, branding: true },
  });
  return {
    name: ws?.name ?? "",
    slug: ws?.slug ?? "",
    branding: parseBranding(ws?.branding) ?? {},
    isOwner: user.role === UserRole.OWNER,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "delete") {
    if (user.role !== UserRole.OWNER) throw new Response("Solo el dueño", { status: 403 });
    await db.workspace.delete({ where: { id: user.workspaceId } });
    return logout(request); // su sesión queda sin workspace
  }

  // save branding + name
  const name = String(form.get("name") ?? "").trim() || "Tablero";
  const branding = {
    name,
    logoUrl: String(form.get("logoUrl") ?? "").trim() || undefined,
    primaryColor: String(form.get("primaryColor") ?? "").trim() || undefined,
  };
  await db.workspace.update({
    where: { id: user.workspaceId },
    data: { name, branding: serialize(branding) },
  });
  await logAction({
    workspaceId: user.workspaceId,
    actor: { type: "user", email: user.email, id: user.id, via: "dashboard" },
    action: "workspace.updated",
    targetType: "workspace",
    targetLabel: name,
  });
  return redirect("/app/ajustes");
}

export default function Ajustes({ loaderData }: Route.ComponentProps) {
  const { name, slug, branding, isOwner } = loaderData;
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-dark">Ajustes del tablero</h1>
      <p className="mt-1 text-sm text-gray-500">Marca y configuración de tu tablero.</p>

      <Form method="post" className="mt-6 space-y-5 rounded-2xl border border-outlines bg-white p-6">
        <input type="hidden" name="intent" value="save" />
        <Field label="Nombre del tablero">
          <input name="name" defaultValue={name} className="input" placeholder="Mi empresa" />
        </Field>
        <Field label="Logo (URL)">
          <input
            name="logoUrl"
            defaultValue={branding.logoUrl ?? ""}
            className="input"
            placeholder="https://…/logo.png"
          />
        </Field>
        <Field label="Color primario">
          <div className="flex items-center gap-3">
            <input
              type="color"
              name="primaryColor"
              defaultValue={branding.primaryColor ?? "#1CA7E0"}
              className="h-10 w-16 cursor-pointer rounded-lg border border-outlines"
            />
            <span className="text-xs text-gray-400">Se aplica al tema del tablero</span>
          </div>
        </Field>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-400">slug: {slug}</span>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      </Form>

      {isOwner && (
        <section className="mt-6 rounded-2xl border border-danger/30 bg-danger/5 p-6">
          <h2 className="text-sm font-semibold text-danger">Zona de peligro</h2>
          <p className="mt-1 text-sm text-gray-500">
            Borrar el tablero elimina todas sus conversaciones, deals y miembros. No se
            puede deshacer.
          </p>
          <Form
            method="post"
            className="mt-3"
            onSubmit={(e) => {
              if (!confirm("¿Borrar este tablero y todos sus datos?")) e.preventDefault();
            }}
          >
            <input type="hidden" name="intent" value="delete" />
            <button
              type="submit"
              className="rounded-lg border border-danger px-4 py-2 text-sm font-semibold text-danger hover:bg-danger hover:text-white"
            >
              Borrar tablero
            </button>
          </Form>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
