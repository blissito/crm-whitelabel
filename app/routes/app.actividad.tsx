import type { Route } from "./+types/app.actividad";
import { requireAdmin } from "server/auth.server";
import { listAuditLog } from "server/audit.server";
import { AuditFeed } from "~/components/AuditFeed";

export function meta() {
  return [{ title: "Actividad · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAdmin(request);
  const rows = await listAuditLog(user.workspaceId, 150);
  return {
    entries: rows.map((r) => ({
      id: r.id,
      actorType: r.actorType,
      actorEmail: r.actorEmail,
      via: r.via,
      action: r.action,
      targetType: r.targetType,
      targetLabel: r.targetLabel,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export default function Actividad({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold text-dark">Actividad</h1>
      <p className="mt-1 text-sm text-gray-500">
        Quién hizo qué — desde el panel y por API key (agentes).
      </p>
      <div className="mt-6">
        <AuditFeed entries={loaderData.entries} />
      </div>
    </div>
  );
}
