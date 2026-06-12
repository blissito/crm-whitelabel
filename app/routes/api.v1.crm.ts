import type { Route } from "./+types/api.v1.crm";
import { requireWorkspaceId } from "server/auth.server";
import {
  getPipeline,
  createDeal,
  updateDeal,
  moveDeal,
  deleteDeal,
  type DealInput,
} from "server/crm.server";

export async function loader({ request }: Route.LoaderArgs) {
  const workspaceId = await requireWorkspaceId(request);
  const data = await getPipeline(workspaceId);
  return Response.json(data);
}

export async function action({ request }: Route.ActionArgs) {
  const workspaceId = await requireWorkspaceId(request);
  const body = await request.json();
  const intent = body.intent as string;

  try {
    switch (intent) {
      case "create_deal": {
        const deal = await createDeal(workspaceId, body.deal as DealInput);
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
      default:
        return Response.json({ ok: false, error: "intent inválido" }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }
}
