import type { Route } from "./+types/api.v1.crm";
import { requireApiContext } from "server/auth.server";
import {
  getPipeline,
  createDeal,
  updateDeal,
  moveDeal,
  deleteDeal,
  savePipeline,
  type DealInput,
} from "server/crm.server";
import { createShareLink } from "server/share.server";

export async function loader({ request }: Route.LoaderArgs) {
  const { workspaceId } = await requireApiContext(request);
  const data = await getPipeline(workspaceId);
  return Response.json(data);
}

export async function action({ request }: Route.ActionArgs) {
  const { workspaceId, userEmail } = await requireApiContext(request);
  const body = await request.json();
  const intent = body.intent as string;

  try {
    switch (intent) {
      case "create_deal": {
        const input = body.deal as DealInput;
        // Atribuir al dueño de la llave si no se indicó vendedor.
        if (userEmail && input.assignedTo === undefined) input.assignedTo = userEmail;
        const deal = await createDeal(workspaceId, input);
        return Response.json({ ok: true, dealId: deal.id });
      }
      case "update_deal": {
        await updateDeal(workspaceId, body.dealId, body.deal as DealInput);
        return Response.json({ ok: true });
      }
      case "move_deal": {
        await moveDeal(workspaceId, body.dealId, body.stageId, body.position);
        return Response.json({ ok: true });
      }
      case "delete_deal": {
        await deleteDeal(workspaceId, body.dealId);
        return Response.json({ ok: true });
      }
      case "save_pipeline": {
        await savePipeline(workspaceId, body.stages);
        return Response.json({ ok: true });
      }
      case "create_share_link": {
        // Honra X-Forwarded-Proto (Fly termina TLS → request interno es http).
        const url = new URL(request.url);
        const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
        const origin = `${proto}://${url.host}`;
        const token = await createShareLink(workspaceId, {
          kind: body.kind === "deal" ? "deal" : "pipeline",
          dealId: body.dealId,
          expiresHours: body.expiresHours,
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
