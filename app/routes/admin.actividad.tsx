import type { Route } from "./+types/admin.actividad";
import { requireSuperAdmin } from "server/auth.server";
import { listRecentAuditLog } from "server/audit.server";
import { AuditFeed } from "~/components/AuditFeed";

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);
  const rows = await listRecentAuditLog(200);
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
      workspaceName: r.workspace?.name,
    })),
  };
}

export default function AdminActividad({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-dark">Actividad global</h1>
      <AuditFeed entries={loaderData.entries} />
    </div>
  );
}
