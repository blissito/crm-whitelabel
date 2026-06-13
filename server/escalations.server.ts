import { db } from "~/lib/db.server";
import { parseJson, serialize } from "~/lib/json";
import { EscalationStatus, EscalationPriority } from "~/lib/enums";

export type EscalationItem = {
  id: string;
  conversationId: string;
  conversationName: string | null;
  reason: string;
  summary: string | null;
  status: string;
  priority: string;
  channel: string;
  assignedTo: string | null;
  contactInfo: Record<string, unknown> | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type EscalationInput = {
  conversationId: string;
  reason: string;
  summary?: string | null;
  priority?: string;
  channel?: string;
  assignedTo?: string | null;
  contactInfo?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

type EscalationRow = {
  id: string;
  conversationId: string;
  reason: string;
  summary: string | null;
  status: string;
  priority: string;
  channel: string;
  assignedTo: string | null;
  contactInfo: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  conversation?: { name: string | null; customName: string | null } | null;
};

function toEscalationItem(e: EscalationRow): EscalationItem {
  return {
    id: e.id,
    conversationId: e.conversationId,
    conversationName: e.conversation?.customName ?? e.conversation?.name ?? null,
    reason: e.reason,
    summary: e.summary,
    status: e.status,
    priority: e.priority,
    channel: e.channel,
    assignedTo: e.assignedTo,
    contactInfo: e.contactInfo
      ? parseJson<Record<string, unknown>>(e.contactInfo, {})
      : null,
    createdAt: e.createdAt.toISOString(),
    resolvedAt: e.resolvedAt ? e.resolvedAt.toISOString() : null,
  };
}

// Orden por prioridad (URGENT primero) y luego por fecha.
const PRIORITY_RANK: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

export async function listEscalations(
  workspaceId: string,
  opts: { status?: string } = {}
): Promise<EscalationItem[]> {
  const rows = await db.escalationRequest.findMany({
    where: { workspaceId, ...(opts.status ? { status: opts.status } : {}) },
    orderBy: { createdAt: "desc" },
    include: { conversation: { select: { name: true, customName: true } } },
  });
  const items = rows.map(toEscalationItem);
  return items.sort(
    (a, b) =>
      (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
      (a.createdAt < b.createdAt ? 1 : -1)
  );
}

export async function createEscalation(
  workspaceId: string,
  input: EscalationInput
): Promise<EscalationItem> {
  const reason = input.reason?.trim();
  if (!reason) throw new Error("El motivo (reason) es obligatorio");

  // La conversación debe existir y pertenecer al workspace.
  const convo = await db.conversation.findFirst({
    where: { id: input.conversationId, workspaceId },
    select: { id: true },
  });
  if (!convo) throw new Error("Conversación no encontrada en este workspace");

  const priority = input.priority ?? EscalationPriority.NORMAL;
  if (!Object.values(EscalationPriority).includes(priority as never)) {
    throw new Error(`Prioridad inválida: ${priority}`);
  }

  const row = await db.escalationRequest.create({
    data: {
      workspaceId,
      conversationId: input.conversationId,
      reason,
      summary: input.summary ?? null,
      status: EscalationStatus.PENDING,
      priority,
      channel: input.channel ?? "whatsapp",
      assignedTo: input.assignedTo ?? null,
      ...(input.contactInfo != null && {
        contactInfo: serialize(input.contactInfo),
      }),
      ...(input.metadata != null && { metadata: serialize(input.metadata) }),
    },
    include: { conversation: { select: { name: true, customName: true } } },
  });
  return toEscalationItem(row);
}

async function assertEscalationInWorkspace(workspaceId: string, id: string) {
  const e = await db.escalationRequest.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  });
  if (!e) throw new Error("Escalamiento no encontrado");
}

export async function assignEscalation(
  workspaceId: string,
  id: string,
  assignedTo: string
): Promise<EscalationItem> {
  await assertEscalationInWorkspace(workspaceId, id);
  const row = await db.escalationRequest.update({
    where: { id },
    data: { assignedTo, status: EscalationStatus.ASSIGNED },
    include: { conversation: { select: { name: true, customName: true } } },
  });
  return toEscalationItem(row);
}

export async function resolveEscalation(
  workspaceId: string,
  id: string
): Promise<EscalationItem> {
  await assertEscalationInWorkspace(workspaceId, id);
  const row = await db.escalationRequest.update({
    where: { id },
    data: { status: EscalationStatus.RESOLVED, resolvedAt: new Date() },
    include: { conversation: { select: { name: true, customName: true } } },
  });
  return toEscalationItem(row);
}
