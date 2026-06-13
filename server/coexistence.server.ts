import { db } from "~/lib/db.server";

export type CoexistenceAction = "pause" | "resume" | "takeover";

function phoneFromSession(sessionId: string): string | null {
  const m = sessionId.match(/^whatsapp_(.+)_[^_]+$/);
  return m ? m[1] : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST best-effort al endpoint de coexistencia de Formmy (pausar/tomar el chat).
 *  Configurable por env; si no está, solo se refleja el estado local.
 *  Contrato/URL exactos los provee Formmy — payload aislado aquí. */
async function notifyFormmy(payload: Record<string, unknown>): Promise<void> {
  const url = process.env.FORMMY_COEXISTENCE_URL;
  const secret = process.env.FORMMY_WEBHOOK_SECRET;
  if (!url || !secret) return; // sin endpoint configurado → solo estado local

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) return;
      if (res.status < 500 && res.status !== 429) return; // 4xx no reintenta
    } catch {
      // reintentar
    }
    if (attempt < 3) await sleep(1000 * 2 ** (attempt - 1));
  }
}

/** Cambia la coexistencia de una conversación: avisa a Formmy y refleja local. */
export async function setCoexistence(
  workspaceId: string,
  conversationId: string,
  action: CoexistenceAction,
  actorEmail?: string | null
) {
  const convo = await db.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    include: { channel: { select: { formmyIntegrationId: true, phoneNumberId: true } } },
  });
  if (!convo) throw new Error("Conversación no encontrada");

  const phone = phoneFromSession(convo.sessionId);
  await notifyFormmy({
    phone_number: phone,
    integration_id: convo.channel?.formmyIntegrationId ?? null,
    phone_number_id: convo.channel?.phoneNumberId ?? null,
    action,
  });

  const now = new Date();
  const data =
    action === "pause"
      ? {
          manualMode: true,
          pauseUntil: new Date(now.getTime() + convo.pauseDurationMin * 60_000),
          pauseReason: actorEmail ? `pausado por ${actorEmail}` : "pausado",
        }
      : action === "takeover"
        ? {
            manualMode: true,
            pauseUntil: null,
            assignedTo: actorEmail ?? convo.assignedTo,
            pauseReason: actorEmail ? `tomado por ${actorEmail}` : "tomado",
          }
        : { manualMode: false, pauseUntil: null, pauseReason: null }; // resume

  return db.conversation.update({
    where: { id: conversationId },
    data,
    select: { id: true, manualMode: true, pauseUntil: true },
  });
}
