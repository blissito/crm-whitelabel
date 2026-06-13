import type { Route } from "./+types/api.v1.crm";
import { requireApiContext, type ApiContext } from "server/auth.server";
import {
  getPipeline,
  createDeal,
  updateDeal,
  moveDeal,
  deleteDeal,
  savePipeline,
  listDealNotes,
  addDealNote,
  deleteDealNote,
  type DealInput,
} from "server/crm.server";
import {
  listContacts,
  createContact,
  updateContact,
  type ContactInput,
} from "server/contacts.server";
import {
  listEscalations,
  createEscalation,
  assignEscalation,
  resolveEscalation,
  type EscalationInput,
} from "server/escalations.server";
import {
  listConversations,
  getConversationMessages,
} from "server/conversations.server";
import { setCoexistence, type CoexistenceAction } from "server/coexistence.server";
import { createShareLink } from "server/share.server";
import { logAction, type AuditActor } from "server/audit.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { workspaceId } = await requireApiContext(request);
  const data = await getPipeline(workspaceId);
  return Response.json(data);
}

// Actor para el audit log a partir del contexto (UI o API key).
function auditActor(ctx: ApiContext): AuditActor {
  return {
    type: ctx.via === "api_key" ? "agent" : "user",
    email: ctx.userEmail,
    id: ctx.userId,
    via: ctx.via,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = await requireApiContext(request);
  const { workspaceId, userEmail } = ctx;
  const actor = auditActor(ctx);
  const body = await request.json();
  const intent = body.intent as string;

  try {
    switch (intent) {
      case "create_deal": {
        const input = body.deal as DealInput;
        if (userEmail && input.assignedTo === undefined) input.assignedTo = userEmail;
        const deal = await createDeal(workspaceId, input);
        await logAction({
          workspaceId,
          actor,
          action: "deal.created",
          targetType: "deal",
          targetId: deal.id,
          targetLabel: input.title ?? deal.id,
        });
        return Response.json({ ok: true, dealId: deal.id });
      }
      case "update_deal": {
        await updateDeal(workspaceId, body.dealId, body.deal as DealInput);
        await logAction({
          workspaceId,
          actor,
          action: "deal.updated",
          targetType: "deal",
          targetId: body.dealId,
          targetLabel: (body.deal as DealInput)?.title ?? undefined,
          metadata: body.deal,
        });
        return Response.json({ ok: true });
      }
      case "move_deal": {
        await moveDeal(workspaceId, body.dealId, body.stageId, body.position);
        await logAction({
          workspaceId,
          actor,
          action: "deal.moved",
          targetType: "deal",
          targetId: body.dealId,
          targetLabel: `→ ${body.stageId}`,
          metadata: { stageId: body.stageId, position: body.position },
        });
        return Response.json({ ok: true });
      }
      case "delete_deal": {
        await deleteDeal(workspaceId, body.dealId);
        await logAction({
          workspaceId,
          actor,
          action: "deal.deleted",
          targetType: "deal",
          targetId: body.dealId,
        });
        return Response.json({ ok: true });
      }
      case "save_pipeline": {
        await savePipeline(workspaceId, body.stages);
        await logAction({
          workspaceId,
          actor,
          action: "pipeline.updated",
          targetType: "pipeline",
          targetLabel: `${Array.isArray(body.stages) ? body.stages.length : 0} etapas`,
        });
        return Response.json({ ok: true });
      }
      case "list_deal_notes": {
        const notes = await listDealNotes(workspaceId, body.dealId);
        return Response.json({ ok: true, notes });
      }
      case "add_deal_note": {
        const note = await addDealNote(
          workspaceId,
          body.dealId,
          body.content,
          userEmail ?? actor.email ?? "desconocido"
        );
        await logAction({
          workspaceId,
          actor,
          action: "deal.note_added",
          targetType: "deal",
          targetId: body.dealId,
        });
        return Response.json({ ok: true, note });
      }
      case "delete_deal_note": {
        await deleteDealNote(workspaceId, body.dealId, body.noteId);
        await logAction({
          workspaceId,
          actor,
          action: "deal.note_deleted",
          targetType: "deal",
          targetId: body.dealId,
        });
        return Response.json({ ok: true });
      }
      // ─── Contactos ──────────────────────────────────────────────────
      case "list_contacts": {
        const items = await listContacts(workspaceId, {
          search: body.search,
          limit: body.limit,
        });
        return Response.json({ ok: true, items });
      }
      case "create_contact": {
        const contact = await createContact(workspaceId, body.contact as ContactInput);
        await logAction({
          workspaceId,
          actor,
          action: "contact.created",
          targetType: "contact",
          targetId: contact.id,
          targetLabel: contact.name ?? contact.phone ?? contact.id,
        });
        return Response.json({ ok: true, contact });
      }
      case "update_contact": {
        const contact = await updateContact(
          workspaceId,
          body.contactId,
          body.contact as ContactInput
        );
        await logAction({
          workspaceId,
          actor,
          action: "contact.updated",
          targetType: "contact",
          targetId: contact.id,
          targetLabel: contact.name ?? contact.phone ?? contact.id,
        });
        return Response.json({ ok: true, contact });
      }

      // ─── Conversaciones (lectura) ───────────────────────────────────
      case "list_conversations": {
        const items = await listConversations(workspaceId, {
          search: body.search,
          status: body.status,
          limit: body.limit,
        });
        return Response.json({ ok: true, items });
      }
      case "list_messages": {
        const items = await getConversationMessages(
          workspaceId,
          body.conversationId,
          { limit: body.limit }
        );
        return Response.json({ ok: true, items });
      }

      // ─── Coexistencia (pausar / reanudar / tomar el chat) ───────────
      case "pause_bot":
      case "resume_bot":
      case "takeover_conversation": {
        const action: CoexistenceAction =
          intent === "pause_bot"
            ? "pause"
            : intent === "resume_bot"
              ? "resume"
              : "takeover";
        const result = await setCoexistence(
          workspaceId,
          body.conversationId,
          action,
          userEmail
        );
        await logAction({
          workspaceId,
          actor,
          action: `conversation.${action}`,
          targetType: "conversation",
          targetId: body.conversationId,
        });
        return Response.json({ ok: true, conversation: result });
      }

      // ─── Escalamiento ───────────────────────────────────────────────
      case "list_escalations": {
        const items = await listEscalations(workspaceId, { status: body.status });
        return Response.json({ ok: true, items });
      }
      case "create_escalation": {
        const escalation = await createEscalation(
          workspaceId,
          body.escalation as EscalationInput
        );
        await logAction({
          workspaceId,
          actor,
          action: "escalation.created",
          targetType: "escalation",
          targetId: escalation.id,
          targetLabel: escalation.reason,
        });
        return Response.json({ ok: true, escalation });
      }
      case "assign_escalation": {
        const assignee = body.assignedTo ?? userEmail;
        const escalation = await assignEscalation(workspaceId, body.id, assignee);
        await logAction({
          workspaceId,
          actor,
          action: "escalation.assigned",
          targetType: "escalation",
          targetId: escalation.id,
          targetLabel: assignee,
        });
        return Response.json({ ok: true, escalation });
      }
      case "resolve_escalation": {
        const escalation = await resolveEscalation(workspaceId, body.id);
        await logAction({
          workspaceId,
          actor,
          action: "escalation.resolved",
          targetType: "escalation",
          targetId: escalation.id,
        });
        return Response.json({ ok: true, escalation });
      }

      case "create_share_link": {
        // Dominio canónico para el link público (el agente pega a fly.dev, pero
        // queremos el dominio bonito). PUBLIC_BASE_URL > forwarded host > url.host.
        const url = new URL(request.url);
        const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
        const host = request.headers.get("x-forwarded-host") || url.host;
        const origin = (process.env.PUBLIC_BASE_URL || `${proto}://${host}`).replace(/\/$/, "");
        const kind = body.kind === "deal" ? "deal" : "pipeline";
        const token = await createShareLink(workspaceId, {
          kind,
          dealId: body.dealId,
          expiresHours: body.expiresHours,
        });
        await logAction({
          workspaceId,
          actor,
          action: "share.created",
          targetType: "share",
          targetLabel: kind,
        });
        return Response.json({ ok: true, url: `${origin}/s/${token}` });
      }
      default:
        return Response.json({ ok: false, error: "intent inválido" }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }
}
