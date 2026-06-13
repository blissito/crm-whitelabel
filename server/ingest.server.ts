import { db } from "~/lib/db.server";
import { MessageRole, MessageOrigin } from "~/lib/enums";

// Payload normalizado del mirror de Formmy (plano A — fire-and-forget, una vía).
// Spec: docs/crm-coregrid-integration.md.
export type MirrorMedia = {
  type?: string;
  mime?: string;
  filename?: string | null;
  fileId?: string | null;
  url?: string | null;
};

export type MirrorEvent = {
  event?: string;
  agentId?: string; // tenant key
  agentSlug?: string;
  conversationId?: string; // id estable en Formmy
  sessionId?: string; // "whatsapp_<phone>_<channelId>"
  channelId?: string;
  contact?: { phone?: string; waJid?: string; name?: string | null };
  message?: {
    id?: string;
    externalMessageId?: string | null;
    role?: "user" | "assistant" | "operator" | "assistant_blocked";
    content?: string;
    media?: MirrorMedia | null;
    location?: unknown;
    contacts?: unknown;
    reaction?: { emoji?: string; toMessageId?: string | null } | null;
    createdAt?: string;
  };
  coexistence?: {
    paused?: boolean;
    pauseUntil?: string | null;
    pauseReason?: string | null;
  };
};

export type IngestResult =
  | "ingested"
  | "duplicate"
  | "no_channel"
  | "ignored"
  | "invalid";

const DEDUP_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// role normalizado de Formmy → (MessageRole, origin) del CRM.
function mapRole(role: string | undefined): { role: string; origin: string | null } | null {
  switch (role) {
    case "user":
      return { role: MessageRole.USER, origin: null };
    case "assistant":
      return { role: MessageRole.ASSISTANT, origin: null };
    case "operator":
      return { role: MessageRole.ASSISTANT, origin: MessageOrigin.OPERATOR_DASHBOARD };
    case "assistant_blocked":
      return null; // draft bloqueado: se ignora
    default:
      return { role: MessageRole.USER, origin: null };
  }
}

/** Resuelve el canal/workspace por agentId (tenant key) o, en su defecto, channelId. */
async function resolveChannel(ev: MirrorEvent) {
  const ors = [];
  if (ev.agentId) ors.push({ formmyIntegrationId: ev.agentId });
  if (ev.channelId) ors.push({ phoneNumberId: ev.channelId });
  if (ors.length === 0) return null;
  return db.whatsAppChannel.findFirst({
    where: { OR: ors },
    select: { id: true, workspaceId: true },
  });
}

/** Ingesta idempotente de un evento del mirror. Nunca lanza: devuelve un estado
 *  para que el endpoint responda 2xx siempre (fire-and-forget). */
export async function ingestMirrorEvent(ev: MirrorEvent): Promise<IngestResult> {
  try {
    const msg = ev.message;
    if (!msg) return "invalid";

    const mapped = mapRole(msg.role);
    if (!mapped) return "ignored"; // assistant_blocked

    const dedupeKey = msg.externalMessageId || msg.id || null;
    if (dedupeKey) {
      const seen = await db.processedWebhook.findUnique({
        where: { externalId: dedupeKey },
        select: { id: true },
      });
      if (seen) return "duplicate";
    }

    const channel = await resolveChannel(ev);
    if (!channel) return "no_channel";

    const phone = ev.contact?.phone ?? null;
    const sessionId =
      ev.sessionId || (phone ? `whatsapp_${phone}_${channel.id}` : null);
    if (!sessionId) return "invalid";

    if (dedupeKey) {
      await db.processedWebhook.create({
        data: {
          externalId: dedupeKey,
          type: msg.role ?? "message",
          phoneNumberId: ev.channelId ?? "",
          expiresAt: new Date(Date.now() + DEDUP_TTL_MS),
        },
      });
    }

    const name = ev.contact?.name ?? null;
    const cx = ev.coexistence;
    const cxData = cx
      ? {
          manualMode: !!cx.paused,
          pauseUntil: cx.pauseUntil ? new Date(cx.pauseUntil) : null,
          pauseReason: cx.pauseReason ?? null,
        }
      : {};

    const convo = await db.conversation.upsert({
      where: { sessionId },
      create: {
        sessionId,
        externalConversationId: ev.conversationId ?? null,
        workspaceId: channel.workspaceId,
        channelId: channel.id,
        name,
        status: "ACTIVE",
        messageCount: 1,
        ...cxData,
      },
      update: {
        updatedAt: new Date(),
        messageCount: { increment: 1 },
        ...(ev.conversationId ? { externalConversationId: ev.conversationId } : {}),
        ...(name ? { name } : {}),
        ...cxData,
      },
      select: { id: true },
    });

    await db.message.create({
      data: {
        conversationId: convo.id,
        content: msg.content ?? "",
        role: mapped.role,
        origin: mapped.origin,
        externalMessageId: dedupeKey,
        isReaction: msg.reaction ? true : undefined,
        reactionEmoji: msg.reaction?.emoji ?? undefined,
        reactionToMsgId: msg.reaction?.toMessageId ?? undefined,
        ...(msg.media && {
          mediaType: msg.media.type ?? null,
          mediaMime: msg.media.mime ?? null,
          mediaFilename: msg.media.filename ?? null,
          mediaFileId: msg.media.fileId ?? null,
        }),
      },
    });

    return "ingested";
  } catch {
    return "invalid"; // best-effort; el endpoint responde 2xx igualmente
  }
}
