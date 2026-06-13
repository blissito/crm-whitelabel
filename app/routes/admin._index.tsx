import { useState } from "react";
import { useFetcher, Form, useNavigation } from "react-router";
import type { Route } from "./+types/admin._index";
import { requireSuperAdmin } from "server/auth.server";
import {
  listWorkspacesOverview,
  deleteWorkspaceById,
  provisionTablero,
} from "server/admin.server";
import { sendInviteEmail } from "server/email.server";
import { HiTrash, HiOutlineClipboard, HiCheck, HiPlus } from "react-icons/hi2";

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);
  return { workspaces: await listWorkspacesOverview() };
}

export async function action({ request }: Route.ActionArgs) {
  const admin = await requireSuperAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "delete") {
    await deleteWorkspaceById(String(form.get("id")));
    return { ok: true };
  }

  if (intent === "provision") {
    try {
      const result = await provisionTablero({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        invitedByEmail: admin.email,
      });
      const url = new URL(request.url);
      const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
      const host = request.headers.get("x-forwarded-host") || url.host;
      const base = `${proto}://${host}`;
      const inviteUrl = `${base}/invite/${result.inviteToken}`;
      const emailSent = await sendInviteEmail({
        to: String(form.get("email")).trim().toLowerCase(),
        workspaceName: result.name,
        inviteUrl,
        invitedBy: admin.name ?? admin.email,
        baseUrl: base,
      });
      return {
        provisioned: {
          name: result.name,
          apiKey: result.apiKey,
          inviteUrl,
          emailSent,
        },
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "No se pudo provisionar el tablero" };
    }
  }

  return { ok: true };
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title={label ?? "Copiar"}
      className="inline-flex items-center gap-1 rounded-md border border-outlines bg-white px-2 py-1 text-xs font-medium text-gray-500 hover:bg-surface"
    >
      {copied ? <HiCheck className="h-3.5 w-3.5 text-green-600" /> : <HiOutlineClipboard className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : label ?? "Copiar"}
    </button>
  );
}

export default function AdminTableros({ loaderData, actionData }: Route.ComponentProps) {
  const { workspaces } = loaderData;
  const data = actionData as
    | {
        provisioned?: { name: string; apiKey: string; inviteUrl: string; emailSent: boolean };
        error?: string;
      }
    | undefined;
  const fetcher = useFetcher();
  const nav = useNavigation();
  const provisioning =
    nav.state !== "idle" && nav.formData?.get("intent") === "provision";

  return (
    <div className="space-y-6">
      {/* Provisionar tablero + invitación */}
      <section className="rounded-2xl border border-outlines bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-dark">
          <HiPlus className="h-4 w-4 text-accent" />
          Provisionar tablero
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Crea un tablero nuevo con su llave de API y manda la invitación. Copia la
          llave y conéctala en el agente; el invitado sólo acepta el correo y cae a su pipeline.
        </p>
        <Form method="post" className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="intent" value="provision" />
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-gray-500">Nombre del tablero</label>
            <input name="name" required placeholder="Distribuidora Ejemplo" className="input" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium text-gray-500">Correo del dueño</label>
            <input type="email" name="email" required placeholder="dueno@empresa.com" className="input" />
          </div>
          <button
            type="submit"
            disabled={provisioning}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-60"
          >
            {provisioning ? "Creando…" : "Crear e invitar"}
          </button>
        </Form>

        {data?.error && (
          <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{data.error}</p>
        )}

        {data?.provisioned && (
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-dark">
                Tablero «{data.provisioned.name}» listo
              </span>
              <span className="text-xs text-gray-400">
                {data.provisioned.emailSent ? "✉️ Invitación enviada" : "⚠️ Email no enviado (revisa SES)"}
              </span>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">
                  Llave de API (conéctala en el agente · <code>CRM_API_KEY</code>)
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-md bg-dark px-3 py-2 text-xs text-cyan-300">
                    {data.provisioned.apiKey}
                  </code>
                  <CopyButton value={data.provisioned.apiKey} label="Copiar llave" />
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-500">Link de invitación</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-md bg-surface px-3 py-2 text-xs text-gray-600">
                    {data.provisioned.inviteUrl}
                  </code>
                  <CopyButton value={data.provisioned.inviteUrl} label="Copiar link" />
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Esta llave sólo se muestra completa una vez. Guárdala ahora.
            </p>
          </div>
        )}
      </section>

      <div>
        <h1 className="mb-4 text-xl font-semibold text-dark">
          Tableros <span className="text-gray-400">({workspaces.length})</span>
        </h1>
        <div className="overflow-x-auto rounded-2xl border border-outlines bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-outlines text-left text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Tablero</th>
                <th className="px-4 py-3 font-medium">Usuarios</th>
                <th className="px-4 py-3 font-medium">Deals</th>
                <th className="px-4 py-3 font-medium">Convs</th>
                <th className="px-4 py-3 font-medium">Llave</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outlines">
              {workspaces.map((w) => (
                <tr key={w.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-dark">{w.name}</div>
                    <div className="text-xs text-gray-400">{w.slug}</div>
                  </td>
                  <td className="px-4 py-3">{w.users}</td>
                  <td className="px-4 py-3">{w.deals}</td>
                  <td className="px-4 py-3">{w.conversations}</td>
                  <td className="px-4 py-3">
                    {w.apiKey ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-gray-400">{w.apiKey.slice(0, 14)}…</code>
                        <CopyButton value={w.apiKey} />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={w.id} />
                      <button
                        type="submit"
                        title="Borrar tablero"
                        className="rounded-md p-1.5 text-gray-300 hover:bg-danger/10 hover:text-danger"
                      >
                        <HiTrash className="h-4 w-4" />
                      </button>
                    </fetcher.Form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
