import type { Route } from "./+types/app.pipeline";
import { requireWorkspace } from "server/auth.server";
import { getPipeline } from "server/crm.server";
import { PipelineBoard } from "~/components/pipeline/PipelineBoard";
import { usePipeline, usePipelineActions } from "~/lib/queries/pipeline";

export function meta() {
  return [{ title: "Pipeline · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { workspaceId } = await requireWorkspace(request);
  const data = await getPipeline(workspaceId);
  return { data };
}

export default function Pipeline({ loaderData }: Route.ComponentProps) {
  // Real-time: TanStack Query con poll de 4s (initialData del loader para SSR).
  // Cuando un agente mueve deals vía MCP, el tablero se actualiza solo.
  const { data } = usePipeline(loaderData.data);
  const actions = usePipelineActions();

  return (
    <PipelineBoard
      data={data}
      onMove={actions.move}
      onSaveDeal={actions.save}
      onDeleteDeal={actions.remove}
      onCreateDeal={actions.create}
    />
  );
}
