import { db } from "~/lib/db.server";
import { MessageRole, MessageOrigin } from "~/lib/enums";

// Evento de mensaje que Formmy reenvía (copia fire-and-forget, una vía).
// Parser tolerante: aceptamos varios nombres de campo por robustez.
export type FormmyMessageEvent = {
  message_id?: string;
  messageId?: string;
  jid?: string;
  sender?: string; // teléfono del cliente
  phone?: string;
  sender_name?: string;
  name?: string;
  content?: string;
  text?: string;
  is_from_me?: boolean;
  manual_mode?: boolean;
  paused_until?: string | null;
  integration_id?: string;
  phone_number_id?: string;
  phoneNumberId?: string;
  media?: {
    type?: string;
    mime_type?: string;
    mimeType?: string;
    filename?: string;
  } | null;
};

const DEDUP_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function digitsOf(s: string | undefined | null): string | null {
  if (!s) return null;
  // "formmy_<phone>@s.whatsapp.net" / "521555...@c.us" / "+52 1 555…"
  const m = s.replace(/^formmy_/, "").match(/\d{6,}/);
  return m ? m[0] : null;
}

export type IngestResult = "ingested" | "duplicate" | "no_channel" | "invalid";

/** Resuelve el workspace por el id de Formmy o el phoneNumberId WABA. */
async function resolveChannel(ev: FormmyMessageEvent) {
  const intId = ev.integration_id;
  const phoneNumberId = ev.phone_number_id ?? ev.phoneNumberId;
  if (!intId && !phoneNumberId) return null;
  return db.whatsAppChannel.findFirst({
    where: {
      OR: [
        ...(intId ? [{ formmyIntegrationId: intId }] : []),
        ...(phoneNumberId ? [{ phoneNumberId }] : []),
      ],
    },
    select: { id: true, workspaceId: true },
  });
}

/** Ingesta idempotente de un evento de mensaje de Formmy. Nunca lanza: devuelve
 *  un estado para que el webhook responda 200 siempre (fire-and-forget). */
export async function ingestFormmyMessage(
  ev: FormmyMessageEvent
): Promise<IngestResult> {
  try {
    const messageId = ev.message_id ?? ev.messageId;
    const content = ev.content ?? ev.text ?? "";
    const phone = digitsOf(ev.sender ?? ev.phone ?? ev.jid);
    if (!phone) return "invalid";

    // Dedup por id externo de mensaje.
    if (messageId) {
      const seen = await db.processedWebhook.findUnique({
        where: { externalId: messageId },
        select: { id: true },
      });
      if (seen) return "duplicate";
    }

    const channel = await resolveChannel(ev);
    if (!channel) return "no_channel";

    if (messageId) {
      await db.processedWebhook.create({
        data: {
          externalId: messageId,
          type: ev.is_from_me ? "echo" : "message",
          phoneNumberId: ev.phone_number_id ?? ev.phoneNumberId ?? "",
          expiresAt: new Date(Date.now() + DEDUP_TTL_MS),
        },
      });
    }

    const sessionId = `whatsapp_${phone}_${channel.workspaceId}`;
    const name = ev.sender_name ?? ev.name ?? null;
    const isFromMe = !!ev.is_from_me;

    const convo = await db.conversation.upsert({
      where: { sessionId },
      create: {
        sessionId,
        workspaceId: channel.workspaceId,
        channelId: channel.id,
        name,
        status: "ACTIVE",
        messageCount: 1,
        ...(isFromMe && { lastEchoAt: new Date() }),
        ...(ev.manual_mode != null && { manualMode: ev.manual_mode }),
        ...(typeof ev.paused_until === "string" && {
          pauseUntil: new Date(ev.paused_until),
        }),
      },
      update: {
        updatedAt: new Date(),
        messageCount: { increment: 1 },
        ...(name ? { name } : {}),
        ...(isFromMe && { lastEchoAt: new Date() }),
        ...(ev.manual_mode != null && { manualMode: ev.manual_mode }),
        ...(typeof ev.paused_until === "string"
          ? { pauseUntil: new Date(ev.paused_until) }
          : ev.paused_until === null
            ? { pauseUntil: null }
            : {}),
      },
      select: { id: true },
    });

    await db.message.create({
      data: {
        conversationId: convo.id,
        content,
        role: isFromMe ? MessageRole.ASSISTANT : MessageRole.USER,
        origin: isFromMe ? MessageOrigin.OPERATOR_PHONE : null,
        externalMessageId: messageId ?? null,
        ...(ev.media && {
          mediaType: ev.media.type ?? null,
          mediaMime: ev.media.mime_type ?? ev.media.mimeType ?? null,
          mediaFilename: ev.media.filename ?? null,
        }),
      },
    });

    return "ingested";
  } catch {
    return "invalid"; // best-effort; el webhook responde 200 igualmente
  }
}
