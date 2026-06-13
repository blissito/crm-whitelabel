import { db } from "~/lib/db.server";

export type AuditActor = {
  type: "user" | "agent" | "system";
  email?: string | null;
  id?: string | null;
  via: "dashboard" | "api_key";
};

export type LogInput = {
  workspaceId: string;
  actor: AuditActor;
  action: string; // namespaced: "deal.moved", "key.regenerated", …
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  metadata?: unknown;
};

/** Registra una acción para blame (best-effort; nunca rompe la acción). */
export async function logAction(input: LogInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        actorType: input.actor.type,
        actorEmail: input.actor.email ?? null,
        actorId: input.actor.id ?? null,
        via: input.actor.via,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        targetLabel: input.targetLabel ?? null,
        metadata: input.metadata === undefined ? null : JSON.stringify(input.metadata),
      },
    });
  } catch {
    // best-effort
  }
}

export function listAuditLog(workspaceId: string, limit = 100) {
  return db.auditLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function listRecentAuditLog(limit = 150) {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { workspace: { select: { name: true } } },
  });
}
