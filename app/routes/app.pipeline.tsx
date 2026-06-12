import { useState, useEffect, useCallback } from "react";
import { useRevalidator } from "react-router";
import type { Route } from "./+types/app.pipeline";
import { requireWorkspace } from "server/auth.server";
import { getPipeline, type PipelineData, type DealCard } from "server/crm.server";
import { PipelineBoard } from "~/components/pipeline/PipelineBoard";

export function meta() {
  return [{ title: "Pipeline · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { workspaceId } = await requireWorkspace(request);
  const data = await getPipeline(workspaceId);
  return { data };
}

async function postCrm(body: Record<string, unknown>) {
  const res = await fetch("/api/v1/crm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function Pipeline({ loaderData }: Route.ComponentProps) {
  const revalidator = useRevalidator();
  // Estado local para mutaciones optimistas; se re-sincroniza con el loader.
  const [data, setData] = useState<PipelineData>(loaderData.data);
  useEffect(() => setData(loaderData.data), [loaderData.data]);

  const refresh = useCallback(() => revalidator.revalidate(), [revalidator]);

  const onMove = useCallback(
    (dealId: string, stageId: string, position: number) => {
      // Optimista: mover la card en el estado local de inmediato.
      setData((prev) => {
        const stages = prev.stages.map((s) => ({ ...s, deals: [...s.deals] }));
        let moved: DealCard | undefined;
        for (const s of stages) {
          const idx = s.deals.findIndex((d) => d.id === dealId);
          if (idx !== -1) {
            moved = s.deals.splice(idx, 1)[0];
            break;
          }
        }
        if (!moved) return prev;
        const target = stages.find((s) => s.id === stageId);
        if (target) {
          moved.stageId = stageId;
          target.deals.splice(position, 0, moved);
          target.totalValue = target.deals.reduce((sum, d) => sum + (d.value ?? 0), 0);
        }
        return { ...prev, stages };
      });
      postCrm({ intent: "move_deal", dealId, stageId, position }).then(refresh);
    },
    [refresh]
  );

  const onSaveDeal = useCallback(
    (dealId: string, input: Partial<DealCard>) => {
      postCrm({ intent: "update_deal", dealId, deal: input }).then(refresh);
    },
    [refresh]
  );

  const onDeleteDeal = useCallback(
    (dealId: string) => {
      postCrm({ intent: "delete_deal", dealId }).then(refresh);
    },
    [refresh]
  );

  const onCreateDeal = useCallback(() => {
    postCrm({
      intent: "create_deal",
      deal: { title: "Nueva oportunidad" },
    }).then(refresh);
  }, [refresh]);

  return (
    <PipelineBoard
      data={data}
      onMove={onMove}
      onSaveDeal={onSaveDeal}
      onDeleteDeal={onDeleteDeal}
      onCreateDeal={onCreateDeal}
    />
  );
}
