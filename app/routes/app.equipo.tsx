import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { HiClipboard, HiCheck, HiTrash, HiUserPlus } from "react-icons/hi2";
import type { Route } from "./+types/app.equipo";
import { requireWorkspace, requireAdmin, isAdmin } from "server/auth.server";
import {
  listMembers,
  listPendingInvites,
  createInvitation,
  revokeInvitation,
} from "server/team.server";

export function meta() {
  return [{ title: "Equipo · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireWorkspace(request);
  const [members, invites] = await Promise.all([
    listMembers(user.workspaceId),
    listPendingInvites(user.workspaceId),
  ]);
  const origin = new URL(request.url).origin;
  return {
    me: { id: user.id, role: user.role },
    admin: isAdmin(user),
    members,
    invites: invites.map((i) => ({
      id: i.id,
      role: i.role,
      email: i.email,
      url: `${origin}/invite/${i.token}`,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent"));
  if (intent === "invite") {
    await createInvitation(user.workspaceId, {
      role: "MEMBER",
      email: String(form.get("email") || "") || undefined,
      invitedByEmail: user.email,
    });
  } else if (intent === "revoke") {
    await revokeInvitation(user.workspaceId, String(form.get("id")));
  }
  return { ok: true };
}

export default function Equipo({ loaderData }: Route.ComponentProps) {
  const { me, admin, members, invites } = loaderData;
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-dark">Equipo</h1>
      <p className="mt-1 text-sm text-gray-500">
        Colaboradores con acceso a este tablero.
      </p>

      {/* Invitar */}
      {admin && (
        <section className="mt-6 rounded-2xl border border-outlines bg-white p-6">
          <div className="flex items-center gap-2">
            <HiUserPlus className="h-5 w-5 text-brand-500" />
            <h2 className="text-lg font-semibold text-dark">Invitar colaborador</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Genera un link de invitación y compártelo. Entra como colaborador
            (MEMBER) con su propia llave.
          </p>
          <Form method="post" className="mt-4 flex gap-2">
            <input type="hidden" name="intent" value="invite" />
            <input
              type="email"
              name="email"
              placeholder="correo (opcional)"
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-60"
            >
              Generar link
            </button>
          </Form>
        </section>
      )}

      {/* Invitaciones pendientes */}
      {invites.length > 0 && (
        <section className="mt-6 rounded-2xl border border-outlines bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">
            Invitaciones pendientes
          </h2>
          <ul className="space-y-2">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-2">
                <CopyField value={inv.url} />
                {admin && (
                  <Form method="post">
                    <input type="hidden" name="intent" value="revoke" />
                    <input type="hidden" name="id" value={inv.id} />
                    <button
                      type="submit"
                      title="Revocar"
                      className="rounded-lg p-2 text-gray-400 hover:bg-surface hover:text-danger"
                    >
                      <HiTrash className="h-4 w-4" />
                    </button>
                  </Form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Miembros */}
      <section className="mt-6 rounded-2xl border border-outlines bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">
          Miembros ({members.length})
        </h2>
        <ul className="divide-y divide-outlines">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-dark">
                  {m.name ?? m.email}
                  {m.id === me.id && <span className="ml-2 text-xs text-gray-400">(tú)</span>}
                </p>
                <p className="text-xs text-gray-400">{m.email}</p>
              </div>
              <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-gray-500">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex flex-1 items-center gap-2">
      <code className="flex-1 truncate rounded-lg bg-surface px-3 py-2 font-mono text-xs text-gray-600">
        {value}
      </code>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-outlines px-3 py-2 text-sm font-medium text-gray-600 hover:bg-surface"
      >
        {copied ? <HiCheck className="h-4 w-4 text-success" /> : <HiClipboard className="h-4 w-4" />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
