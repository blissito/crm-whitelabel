import { db } from "~/lib/db.server";

export type ConversationItem = {
  id: string;
  name: string | null;
  customName: string | null;
  phone: string | null;
  status: string;
  manualMode: boolean;
  pauseUntil: string | null;
  messageCount: number;
  lastMessage: string | null;
  updatedAt: string;
};

export type MessageItem = {
  id: string;
  content: string;
  role: string;
  origin: string | null;
  mediaType: string | null;
  mediaMime: string | null;
  mediaFilename: string | null;
  mediaFileId: string | null;
  isReaction: boolean;
  reactionEmoji: string | null;
  createdAt: string;
};

// sessionId WABA: "whatsapp_<phone>_<workspaceId>" → extrae el teléfono.
function phoneFromSession(sessionId: string): string | null {
  const m = sessionId.match(/^whatsapp_(.+)_[^_]+$/);
  return m ? m[1] : null;
}

export async function listConversations(
  workspaceId: string,
  opts: {
    search?: string;
    status?: string;
    limit?: number;
    hasMessages?: boolean;
  } = {}
): Promise<ConversationItem[]> {
  // Limpiar pausas cuyo TTL haya expirado (coexistencia auto_echo de 30min).
  await db.conversation.updateMany({
    where: {
      workspaceId,
      manualMode: true,
      pauseUntil: { not: null, lte: new Date() },
    },
    data: { manualMode: false, pauseUntil: null, pauseReason: null },
  });

  const search = opts.search?.trim();
  const rows = await db.conversation.findMany({
    where: {
      workspaceId,
      // El inbox solo muestra chats reales; las conversaciones contenedoras de
      // deals demo (0 mensajes) se excluyen.
      ...(opts.hasMessages ? { messageCount: { gt: 0 } } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(search
        ? {
            OR: [
              { sessionId: { contains: search } },
              { name: { contains: search } },
              { customName: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: opts.limit ?? 100,
    include: {
      messages: {
        where: { deleted: false },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    customName: c.customName,
    phone: phoneFromSession(c.sessionId),
    status: c.status,
    manualMode: c.manualMode,
    pauseUntil: c.pauseUntil ? c.pauseUntil.toISOString() : null,
    messageCount: c.messageCount,
    lastMessage: c.messages[0]?.content ?? null,
    updatedAt: c.updatedAt.toISOString(),
  }));
}

export async function getConversationMessages(
  workspaceId: string,
  conversationId: string,
  opts: { limit?: number } = {}
): Promise<MessageItem[]> {
  const convo = await db.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    select: { id: true },
  });
  if (!convo) throw new Error("Conversación no encontrada");

  const rows = await db.message.findMany({
    where: { conversationId, deleted: false },
    orderBy: { createdAt: "asc" },
    take: opts.limit ?? 200,
  });
  return rows.map((m) => ({
    id: m.id,
    content: m.content,
    role: m.role,
    origin: m.origin,
    mediaType: m.mediaType,
    mediaMime: m.mediaMime,
    mediaFilename: m.mediaFilename,
    mediaFileId: m.mediaFileId,
    isReaction: !!m.isReaction,
    reactionEmoji: m.reactionEmoji,
    createdAt: m.createdAt.toISOString(),
  }));
}
