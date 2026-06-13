import { db } from "~/lib/db.server";

// Plano B — control (CRM → Formmy). Spec: docs/crm-coregrid-integration.md.
// POST {FORMMY_CONTROL_URL} Bearer CRM_CONTROL_SECRET con intents set_pause /
// send_manual_response, scopeado por agentId + conversationId (de Formmy).

export type PauseMode = "30min" | "2h" | "until_tomorrow" | "permanent" | "resume";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postControl(payload: Record<string, unknown>): Promise<void> {
  const url =
    process.env.FORMMY_CONTROL_URL ?? "https://formmy.app/api/v1/crm/control";
  const secret = process.env.CRM_CONTROL_SECRET;
  if (!secret) return; // sin secret aún → solo estado local (se cablea al cerrar secrets)

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
      if (res.status < 500 && res.status !== 429) {
        throw new Error(`control ${res.status}`);
      }
    } catch (e) {
      if (attempt === 3) throw e;
    }
    if (attempt < 3) await sleep(1000 * 2 ** (attempt - 1));
  }
}

/** Carga la conversación con la identidad necesaria para el plano B. */
async function loadForControl(workspaceId: string, conversationId: string) {
  const convo = await db.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    include: { channel: { select: { formmyIntegrationId: true } } },
  });
  if (!convo) throw new Error("Conversación no encontrada");
  const agentId = convo.channel?.formmyIntegrationId ?? null;
  const externalId = convo.externalConversationId ?? null;
  return { convo, agentId, externalId };
}

/** Pausa/reanuda al agente IA (coexistencia) y refleja el estado local. */
export async function setPause(
  workspaceId: string,
  conversationId: string,
  pauseMode: PauseMode,
  actorEmail?: string | null
) {
  const { convo, agentId, externalId } = await loadForControl(workspaceId, conversationId);

  await postControl({
    agentId,
    conversationId: externalId,
    intent: "set_pause",
    pauseMode,
  });

  const now = Date.now();
  const minutes: Record<PauseMode, number | null> = {
    "30min": 30,
    "2h": 120,
    until_tomorrow: 18 * 60,
    permanent: null,
    resume: null,
  };
  const data =
    pauseMode === "resume"
      ? { manualMode: false, pauseUntil: null, pauseReason: null }
      : {
          manualMode: true,
          pauseUntil:
            minutes[pauseMode] != null
              ? new Date(now + (minutes[pauseMode] as number) * 60_000)
              : null,
          pauseReason: `manual_${pauseMode}${actorEmail ? ` · ${actorEmail}` : ""}`,
        };

  return db.conversation.update({
    where: { id: convo.id },
    data,
    select: { id: true, manualMode: true, pauseUntil: true },
  });
}

/** Responde como operador (el mensaje sale por WhatsApp vía Formmy). El eco
 *  vuelve por el plano A con role "operator" — no lo insertamos local (dedupe). */
export async function sendManualResponse(
  workspaceId: string,
  conversationId: string,
  message: string,
  actorEmail?: string | null
) {
  const text = message?.trim();
  if (!text) throw new Error("El mensaje está vacío");
  const { agentId, externalId } = await loadForControl(workspaceId, conversationId);

  await postControl({
    agentId,
    conversationId: externalId,
    intent: "send_manual_response",
    message: text,
  });

  return { ok: true, sentBy: actorEmail ?? null };
}
