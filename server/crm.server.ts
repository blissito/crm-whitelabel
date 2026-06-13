import { db } from "~/lib/db.server";
import {
  parsePipeline,
  parseStringArray,
  serialize,
  type PipelineStage,
} from "~/lib/json";

/** Reemplaza las etapas del pipeline (add/rename/delete/reorder). Normaliza el
 *  orden y reasigna deals huérfanos (de etapas borradas) a la primera etapa. */
export async function savePipeline(
  workspaceId: string,
  stages: PipelineStage[]
): Promise<void> {
  const normalized = stages
    .filter((s) => s && s.id && s.name)
    .map((s, i) => ({
      id: s.id,
      name: s.name,
      color: s.color || "#1CA7E0",
      order: i,
      ...(s.isClosed ? { isClosed: true, closedType: s.closedType } : {}),
    }));
  if (normalized.length === 0) throw new Error("El pipeline necesita al menos una etapa");

  await db.workspace.update({
    where: { id: workspaceId },
    data: { pipeline: serialize(normalized) },
  });

  // Deals en etapas que ya no existen → a la primera etapa.
  const ids = normalized.map((s) => s.id);
  const firstId = normalized[0].id;
  const orphans = await db.deal.findMany({
    where: { workspaceId, stageId: { notIn: ids } },
    select: { id: true },
  });
  if (orphans.length > 0) {
    await db.deal.updateMany({
      where: { id: { in: orphans.map((o) => o.id) } },
      data: { stageId: firstId },
    });
  }
}

// ─── Shapes que consume la UI (planos, ya hidratados) ────────────────────
export type DealCard = {
  id: string;
  stageId: string;
  position: number | null;
  title: string | null;
  value: number | null;
  currency: string;
  source: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  assignedTo: string | null;
  tags: string[];
  conversationId: string;
  conversationName: string | null;
  createdAt: string;
};

export type PipelineColumn = PipelineStage & {
  deals: DealCard[];
  totalValue: number;
};

export type PipelineStats = {
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalValue: number;
  wonValue: number;
  conversionRate: number;
};

export type PipelineData = {
  stages: PipelineColumn[];
  stats: PipelineStats;
};

// ─── Transformador: doc Prisma → DealCard plano ──────────────────────────
type DealRow = {
  id: string;
  stageId: string;
  position: number | null;
  title: string | null;
  value: number | null;
  currency: string;
  source: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  assignedTo: string | null;
  tags: string;
  conversationId: string;
  createdAt: Date;
  conversation?: { name: string | null; customName: string | null } | null;
};

function toDealCard(d: DealRow): DealCard {
  return {
    id: d.id,
    stageId: d.stageId,
    position: d.position,
    title: d.title,
    value: d.value,
    currency: d.currency,
    source: d.source,
    customerName: d.customerName,
    customerEmail: d.customerEmail,
    customerPhone: d.customerPhone,
    assignedTo: d.assignedTo,
    tags: parseStringArray(d.tags),
    conversationId: d.conversationId,
    conversationName:
      d.conversation?.customName ?? d.conversation?.name ?? d.customerName ?? null,
    createdAt: d.createdAt.toISOString(),
  };
}

// ─── Queries ─────────────────────────────────────────────────────────────
export async function getPipeline(workspaceId: string): Promise<PipelineData> {
  const ws = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { pipeline: true },
  });
  const stages = parsePipeline(ws?.pipeline).sort((a, b) => a.order - b.order);

  const deals = await db.deal.findMany({
    where: { workspaceId },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    include: { conversation: { select: { name: true, customName: true } } },
  });
  const cards = deals.map(toDealCard);

  const columns: PipelineColumn[] = stages.map((stage) => {
    const stageDeals = cards.filter((d) => d.stageId === stage.id);
    return {
      ...stage,
      deals: stageDeals,
      totalValue: stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0),
    };
  });

  const isWon = (s?: PipelineStage) => s?.isClosed && s.closedType === "won";
  const isLost = (s?: PipelineStage) => s?.isClosed && s.closedType === "lost";
  const stageById = (id: string) => stages.find((s) => s.id === id);

  const wonDeals = cards.filter((d) => isWon(stageById(d.stageId)));
  const lostDeals = cards.filter((d) => isLost(stageById(d.stageId)));
  const closedCount = wonDeals.length + lostDeals.length;

  const stats: PipelineStats = {
    totalDeals: cards.length,
    openDeals: cards.length - closedCount,
    wonDeals: wonDeals.length,
    lostDeals: lostDeals.length,
    totalValue: cards.reduce((s, d) => s + (d.value ?? 0), 0),
    wonValue: wonDeals.reduce((s, d) => s + (d.value ?? 0), 0),
    conversionRate: closedCount > 0 ? wonDeals.length / closedCount : 0,
  };

  return { stages: columns, stats };
}

// ─── Mutaciones ──────────────────────────────────────────────────────────
export type DealInput = {
  title?: string | null;
  value?: number | null;
  currency?: string;
  stageId?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  assignedTo?: string | null;
  tags?: string[];
  conversationId?: string;
};

export async function createDeal(workspaceId: string, input: DealInput) {
  // Para crear un deal sin conversación real (demo/manual), creamos una
  // conversación contenedora mínima si no se pasó conversationId.
  let conversationId = input.conversationId;
  if (!conversationId) {
    const convo = await db.conversation.create({
      data: {
        workspaceId,
        sessionId: `manual_${crypto.randomUUID()}`,
        name: input.customerName ?? "Oportunidad manual",
        status: "ACTIVE",
      },
    });
    conversationId = convo.id;
  }

  const firstStage = await firstStageId(workspaceId);
  return db.deal.create({
    data: {
      workspaceId,
      conversationId,
      stageId: input.stageId ?? firstStage,
      title: input.title ?? null,
      value: input.value ?? null,
      currency: input.currency ?? "MXN",
      source: "manual",
      customerName: input.customerName ?? null,
      customerEmail: input.customerEmail ?? null,
      customerPhone: input.customerPhone ?? null,
      assignedTo: input.assignedTo ?? null,
      tags: serialize(input.tags ?? []),
    },
  });
}

export async function updateDeal(
  workspaceId: string,
  dealId: string,
  input: DealInput
) {
  // Verificar ownership por workspace.
  const deal = await db.deal.findFirst({
    where: { id: dealId, workspaceId },
    select: { id: true },
  });
  if (!deal) throw new Error("Deal no encontrado");

  return db.deal.update({
    where: { id: dealId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.stageId !== undefined && { stageId: input.stageId }),
      ...(input.customerName !== undefined && { customerName: input.customerName }),
      ...(input.customerEmail !== undefined && { customerEmail: input.customerEmail }),
      ...(input.customerPhone !== undefined && { customerPhone: input.customerPhone }),
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
      ...(input.tags !== undefined && { tags: serialize(input.tags) }),
    },
  });
}

export async function moveDeal(
  workspaceId: string,
  dealId: string,
  stageId: string,
  position?: number
) {
  const deal = await db.deal.findFirst({
    where: { id: dealId, workspaceId },
    select: { id: true },
  });
  if (!deal) throw new Error("Deal no encontrado");
  return db.deal.update({
    where: { id: dealId },
    data: { stageId, ...(position !== undefined && { position }) },
  });
}

export async function deleteDeal(workspaceId: string, dealId: string) {
  const deal = await db.deal.findFirst({
    where: { id: dealId, workspaceId },
    select: { id: true },
  });
  if (!deal) throw new Error("Deal no encontrado");
  await db.dealNote.deleteMany({ where: { dealId } });
  return db.deal.delete({ where: { id: dealId } });
}

// ─── Notas de un deal ────────────────────────────────────────────────────
export type DealNoteItem = {
  id: string;
  content: string;
  authorEmail: string;
  createdAt: string;
};

/** Verifica que el deal pertenezca al workspace (ownership) y devuelve su id. */
async function assertDealInWorkspace(workspaceId: string, dealId: string) {
  const deal = await db.deal.findFirst({
    where: { id: dealId, workspaceId },
    select: { id: true },
  });
  if (!deal) throw new Error("Deal no encontrado");
}

export async function listDealNotes(
  workspaceId: string,
  dealId: string
): Promise<DealNoteItem[]> {
  await assertDealInWorkspace(workspaceId, dealId);
  const notes = await db.dealNote.findMany({
    where: { dealId },
    orderBy: { createdAt: "desc" },
  });
  return notes.map((n) => ({
    id: n.id,
    content: n.content,
    authorEmail: n.authorEmail,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function addDealNote(
  workspaceId: string,
  dealId: string,
  content: string,
  authorEmail: string
): Promise<DealNoteItem> {
  await assertDealInWorkspace(workspaceId, dealId);
  const text = content.trim();
  if (!text) throw new Error("La nota está vacía");
  const note = await db.dealNote.create({
    data: { dealId, content: text, authorEmail },
  });
  return {
    id: note.id,
    content: note.content,
    authorEmail: note.authorEmail,
    createdAt: note.createdAt.toISOString(),
  };
}

export async function deleteDealNote(
  workspaceId: string,
  dealId: string,
  noteId: string
): Promise<void> {
  await assertDealInWorkspace(workspaceId, dealId);
  await db.dealNote.deleteMany({ where: { id: noteId, dealId } });
}

async function firstStageId(workspaceId: string): Promise<string> {
  const ws = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { pipeline: true },
  });
  const stages = parsePipeline(ws?.pipeline).sort((a, b) => a.order - b.order);
  return stages[0]?.id ?? "nuevo";
}
