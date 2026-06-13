import { useState } from "react";
import { Form, useNavigation } from "react-router";
import {
  HiKey,
  HiClipboard,
  HiCheck,
  HiArrowPath,
  HiArrowTopRightOnSquare,
} from "react-icons/hi2";
import { SiNpm } from "react-icons/si";
import type { Route } from "./+types/app.cuenta";
import { requireWorkspace, generateApiKey, isAdmin } from "server/auth.server";
import { db } from "~/lib/db.server";

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
  const origin = new URL(request.url).origin;
  return {
    email: dbUser?.email ?? user.email,
    name: dbUser?.name ?? null,
    apiKey: dbUser?.apiKey ?? null,
    workspaceApiKey: ws?.apiKey ?? null,
    apiUrl: origin,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireWorkspace(request);
  const apiKey = generateApiKey();
  await db.user.update({ where: { id: user.id }, data: { apiKey } });
  return { ok: true };
}

export default function Cuenta({ loaderData }: Route.ComponentProps) {
  const { email, name, apiKey, workspaceApiKey, apiUrl } = loaderData;
  const nav = useNavigation();
  const busy = nav.state !== "idle";

  const effectiveKey = apiKey ?? workspaceApiKey;
  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        "coregrid-crm": {
          command: "npx",
          args: ["-y", "coregrid-crm-mcp"],
          env: {
            CRM_API_KEY: effectiveKey ?? "TU_LLAVE",
            ...(apiUrl !== "https://crm-coregrid.fly.dev" ? { CRM_API_URL: apiUrl } : {}),
          },
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

      {/* Llave del tablero (default que ya usan los agentes) — OWNER/ADMIN */}
      {workspaceApiKey && (
        <section className="mt-8 rounded-2xl border border-brand-300 bg-brand-100/30 p-6">
          <div className="flex items-center gap-2">
            <HiKey className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-dark">Llave del tablero</h2>
            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              EN USO
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Llave a nivel tablero, la que ya está conectada a tu agente. Compártela
            solo con tu equipo.
          </p>
          <CopyRow value={workspaceApiKey} className="mt-4" />
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-outlines bg-white p-6">
        <div className="flex items-center gap-2">
          <HiKey className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-dark">Tu llave personal</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Conéctala a tu agente para que opere tu tablero. La llave es personal y
          ve solo tu tablero.
        </p>

        {apiKey ? (
          <CopyRow value={apiKey} className="mt-4" />
        ) : (
          <p className="mt-4 rounded-lg bg-surface px-4 py-3 text-sm text-gray-500">
            Aún no tienes llave. Genera una para conectar tu agente.
          </p>
        )}

        <Form method="post" className="mt-4">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:opacity-60"
          >
            <HiArrowPath className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {apiKey ? "Regenerar llave" : "Generar llave"}
          </button>
          {apiKey && (
            <span className="ml-3 text-xs text-gray-400">
              Regenerar invalida la llave anterior.
            </span>
          )}
        </Form>
      </section>

      <section className="mt-6 rounded-2xl border border-outlines bg-white p-6">
        <h2 className="text-lg font-semibold text-dark">Conecta tu agente (MCP)</h2>
        <p className="mt-1 text-sm text-gray-500">
          {apiKey
            ? "Pega esto en la config MCP de tu agente."
            : "Genera tu llave arriba y úsala en la config MCP de tu agente."}
        </p>
        <CopyBlock value={mcpConfig} className="mt-4" />

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
    <div className={`relative ${className}`}>
      <button
        onClick={() => copy(value)}
        className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20"
      >
        {copied ? <HiCheck className="h-3.5 w-3.5" /> : <HiClipboard className="h-3.5 w-3.5" />}
        {copied ? "Copiado" : "Copiar"}
      </button>
      <pre className="overflow-x-auto rounded-lg bg-dark p-4 font-mono text-xs text-white/90">
        {value}
      </pre>
    </div>
  );
}
