import { useState } from "react";
import { useFetcher, Form } from "react-router";
import {
  HiKey,
  HiClipboard,
  HiCheck,
  HiArrowPath,
  HiArrowTopRightOnSquare,
  HiOutlineLink,
  HiTrash,
} from "react-icons/hi2";
import { SiNpm } from "react-icons/si";
import type { Route } from "./+types/app.cuenta";
import { requireWorkspace, generateApiKey, isAdmin } from "server/auth.server";
import { logAction } from "server/audit.server";
import { listShareLinks, revokeShareLink } from "server/share.server";
import { db } from "~/lib/db.server";
import { cn } from "~/lib/cn";

export function meta() {
  return [{ title: "Mi cuenta · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireWorkspace(request);
  const admin = isAdmin(user);
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { apiKey: true, email: true, name: true },
  });
  // La llave del tablero (default que usan los agentes) solo a OWNER/ADMIN.
  const ws = admin
    ? await db.workspace.findUnique({
        where: { id: user.workspaceId },
        select: { apiKey: true },
      })
    : null;
  // Links públicos del tablero (admin) — para administrarlos/apagarlos.
  const shareLinks = admin ? await listShareLinks(user.workspaceId) : [];
  // Host actual (habrá varios dominios). Honra forwarded headers (Fly → https).
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || url.host;
  const publicBase = (process.env.PUBLIC_BASE_URL || `${proto}://${host}`).replace(/\/$/, "");
  return {
    email: dbUser?.email ?? user.email,
    name: dbUser?.name ?? null,
    apiKey: dbUser?.apiKey ?? null,
    workspaceApiKey: ws?.apiKey ?? null,
    apiUrl: `${proto}://${host}`,
    admin,
    shareLinks,
    publicBase,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireWorkspace(request);
  const form = await request.formData();
  const intent = String(form.get("intent") || "regen");

  if (intent === "revoke_share") {
    if (!isAdmin(user)) throw new Response("No autorizado", { status: 403 });
    await revokeShareLink(user.workspaceId, String(form.get("id")));
    await logAction({
      workspaceId: user.workspaceId,
      actor: { type: "user", email: user.email, id: user.id, via: "dashboard" },
      action: "share.revoked",
      targetType: "share",
      targetLabel: String(form.get("id")),
    });
    return { ok: true };
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { apiKey: true },
  });
  const apiKey = generateApiKey();
  // Regenera la llave que se muestra: la personal si existe; si no y es
  // admin, la del tablero (la que ya usan los agentes).
  const scope = dbUser?.apiKey || !isAdmin(user) ? "personal" : "tablero";
  if (scope === "personal") {
    await db.user.update({ where: { id: user.id }, data: { apiKey } });
  } else {
    await db.workspace.update({ where: { id: user.workspaceId }, data: { apiKey } });
  }
  await logAction({
    workspaceId: user.workspaceId,
    actor: { type: "user", email: user.email, id: user.id, via: "dashboard" },
    action: "key.regenerated",
    targetType: "key",
    targetLabel: scope === "personal" ? "llave personal" : "llave del tablero",
  });
  return { ok: true };
}

export default function Cuenta({ loaderData }: Route.ComponentProps) {
  const { email, name, apiKey, workspaceApiKey, apiUrl, admin, shareLinks, publicBase } =
    loaderData;
  // Fetcher scopeado: el spinner gira SOLO durante esta acción, no en cada
  // navegación global.
  const fetcher = useFetcher();
  const busy = fetcher.state !== "idle";

  const effectiveKey = apiKey ?? workspaceApiKey;
  const keyForCfg = effectiveKey ?? "TU_LLAVE";
  // Comando directo (Claude Code / agentes CLI) — lo más simple de pegar.
  const mcpCommand = `claude mcp add coregrid-crm -e CRM_API_KEY=${keyForCfg} -e CRM_API_URL=${apiUrl} -- npx -y coregrid-crm-mcp`;
  // Config manual (clientes de escritorio) — usa el host actual (varios dominios).
  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        "coregrid-crm": {
          command: "npx",
          args: ["-y", "coregrid-crm-mcp"],
          env: { CRM_API_KEY: keyForCfg, CRM_API_URL: apiUrl },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-dark">Mi cuenta</h1>
      <p className="mt-1 text-sm text-gray-500">
        {name ? `${name} · ` : ""}
        {email}
      </p>

      {/* Una sola llave (efectiva: personal o la del tablero en uso) */}
      <section className="mt-8 rounded-2xl border border-outlines bg-white p-6">
        <div className="flex items-center gap-2">
          <HiKey className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-dark">Tu llave de API</h2>
          {effectiveKey === workspaceApiKey && workspaceApiKey && (
            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              EN USO
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Conéctala a tu agente para que opere tu tablero.
        </p>

        {effectiveKey ? (
          <CopyRow value={effectiveKey} className="mt-4" />
        ) : (
          <p className="mt-4 rounded-lg bg-surface px-4 py-3 text-sm text-gray-500">
            Aún no tienes llave. Genera una para conectar tu agente.
          </p>
        )}

        <fetcher.Form method="post" className="mt-4">
          <input type="hidden" name="intent" value="regen" />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-outlines px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-surface disabled:opacity-60"
          >
            <HiArrowPath className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {effectiveKey ? "Regenerar llave" : "Generar llave"}
          </button>
          <span className="ml-3 text-xs text-gray-400">
            {effectiveKey
              ? "Regenerar invalida la llave actual; vuelve a pegarla en tu agente."
              : "Genera una llave nueva para tu agente."}
          </span>
        </fetcher.Form>
      </section>

      <section className="mt-6 rounded-2xl border border-outlines bg-white p-6">
        <h2 className="text-lg font-semibold text-dark">Conecta tu agente</h2>
        <p className="mt-1 text-sm text-gray-500">
          Pega esto en el chat de tu agente (Ghosty) para conectar el CRM.
        </p>
        <CopyBlock value={mcpCommand} className="mt-4" />

        {/* Config manual (mcp.json) en segundo plano */}
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            ¿Config manual? (mcp.json)
          </summary>
          <CopyBlock value={mcpConfig} className="mt-2" />
        </details>

        {/* Cuadrito descriptivo del paquete + link a npm */}
        <a
          href="https://www.npmjs.com/package/coregrid-crm-mcp"
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-start gap-3 rounded-xl border border-outlines bg-surface/60 p-4 transition hover:border-brand-300"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#CB3837]/10">
            <SiNpm className="h-6 w-6 text-[#CB3837]" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-mono text-sm font-semibold text-dark">
              coregrid-crm-mcp
              <HiArrowTopRightOnSquare className="h-3.5 w-3.5 text-gray-400" />
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Servidor MCP con tools del pipeline (ver/crear/mover/compartir
              oportunidades). Tu agente lo opera con tu llave. Publicado en npm.
            </span>
            <code className="mt-2 inline-block rounded bg-dark px-2 py-1 font-mono text-[11px] text-white/90">
              npx -y coregrid-crm-mcp
            </code>
          </span>
        </a>
      </section>

      {/* Links públicos (solo lectura) — administrar / apagar */}
      {admin && (
        <section className="mt-6 rounded-2xl border border-outlines bg-white p-6">
          <div className="flex items-center gap-2">
            <HiOutlineLink className="h-5 w-5 text-brand-500" />
            <h2 className="text-lg font-semibold text-dark">Links públicos</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Links de solo lectura que tú o tu agente generaron. Apágalos cuando ya
            no quieras que sigan abiertos.
          </p>

          {shareLinks.length === 0 ? (
            <p className="mt-4 rounded-lg bg-surface px-4 py-3 text-sm text-gray-500">
              No hay links activos.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {shareLinks.map((l) => {
                const url = `${publicBase}/s/${l.token}`;
                const label =
                  l.kind === "deal" ? `Oportunidad · ${l.dealTitle ?? ""}` : "Tablero completo";
                return (
                  <li
                    key={l.id}
                    className="flex items-center gap-3 rounded-xl border border-outlines p-3"
                  >
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        l.kind === "deal"
                          ? "bg-accent/15 text-accent-600"
                          : "bg-brand-100 text-brand-600"
                      )}
                    >
                      {l.kind === "deal" ? "Lead" : "Tablero"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-dark">{label}</p>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate block text-xs text-gray-400 hover:text-brand-500"
                      >
                        {url}
                      </a>
                    </div>
                    {l.expiresAt && (
                      <span className="hidden text-xs text-gray-400 sm:inline">
                        vence {new Date(l.expiresAt).toLocaleDateString("es-MX")}
                      </span>
                    )}
                    <Form method="post">
                      <input type="hidden" name="intent" value="revoke_share" />
                      <input type="hidden" name="id" value={l.id} />
                      <button
                        type="submit"
                        title="Apagar link"
                        className="rounded-lg p-2 text-gray-400 transition hover:bg-danger/10 hover:text-danger"
                      >
                        <HiTrash className="h-4 w-4" />
                      </button>
                    </Form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return { copied, copy };
}

function CopyRow({ value, className = "" }: { value: string; className?: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <code className="flex-1 truncate rounded-lg bg-dark px-3 py-2.5 font-mono text-xs text-white">
        {value}
      </code>
      <button
        onClick={() => copy(value)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-outlines px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-surface"
      >
        {copied ? <HiCheck className="h-4 w-4 text-success" /> : <HiClipboard className="h-4 w-4" />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function CopyBlock({ value, className = "" }: { value: string; className?: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className={`overflow-hidden rounded-lg bg-dark ${className}`}>
      {/* Barra superior fija: el botón no se encima del texto al scrollear. */}
      <div className="flex justify-end border-b border-white/10 px-2 py-1.5">
        <button
          onClick={() => copy(value)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white"
        >
          {copied ? <HiCheck className="h-3.5 w-3.5 text-success" /> : <HiClipboard className="h-3.5 w-3.5" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs text-white/90">
        {value}
      </pre>
    </div>
  );
}
