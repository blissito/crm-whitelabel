import { flushSync } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PipelineData, DealCard, DealNoteItem } from "server/crm.server";
import type { PipelineStage } from "~/lib/json";

// Real-time del tablero copiando el patrón de Formmy (TanStack Query +
// refetchInterval). Poll corto (4s) para que el tablero se vea "moverse solo"
// cuando un agente (MCP) opera el pipeline.
const PIPELINE_KEY = ["pipeline"] as const;
const POLL_MS = 4_000;

async function fetchPipeline(): Promise<PipelineData> {
  const res = await fetch("/api/v1/crm");
  if (!res.ok) throw new Error(`pipeline ${res.status}`);
  return res.json();
}

export function usePipeline(initialData: PipelineData) {
  return useQuery({
    queryKey: PIPELINE_KEY,
    queryFn: fetchPipeline,
    initialData,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
  });
}

async function postCrm(body: Record<string, unknown>) {
  const res = await fetch("/api/v1/crm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Notas de un deal (fuera del cache del tablero: flujo propio) ─────────
export async function fetchDealNotes(dealId: string): Promise<DealNoteItem[]> {
  const res = await postCrm({ intent: "list_deal_notes", dealId });
  return res.ok ? res.notes : [];
}

export async function addDealNote(
  dealId: string,
  content: string
): Promise<DealNoteItem | null> {
  const res = await postCrm({ intent: "add_deal_note", dealId, content });
  return res.ok ? res.note : null;
}

export async function deleteDealNote(dealId: string, noteId: string): Promise<boolean> {
  const res = await postCrm({ intent: "delete_deal_note", dealId, noteId });
  return !!res.ok;
}

// ─── Compartir (genera link público read-only) ───────────────────────────
export async function createShareLink(opts: {
  kind: "pipeline" | "deal";
  dealId?: string;
  expiresHours?: number;
}): Promise<string | null> {
  const res = await postCrm({ intent: "create_share_link", ...opts });
  return res.ok ? (res.url as string) : null;
}

// Mueve una card en el cache local (optimista) antes de que el poll reconcilie.
function optimisticMove(
  prev: PipelineData,
  dealId: string,
  stageId: string,
  position: number
): PipelineData {
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
}

export function usePipelineActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: PIPELINE_KEY });

  return {
    move(dealId: string, stageId: string, position: number) {
      // flushSync: aplica el movimiento optimista SÍNCRONO antes de que la
      // animación de drop de dnd corra → sin brinco al origen.
      flushSync(() => {
        qc.setQueryData<PipelineData>(PIPELINE_KEY, (prev) =>
          prev ? optimisticMove(prev, dealId, stageId, position) : prev
        );
      });
      postCrm({ intent: "move_deal", dealId, stageId, position }).then(invalidate);
    },
    save(dealId: string, input: Partial<DealCard>) {
      postCrm({ intent: "update_deal", dealId, deal: input }).then(invalidate);
    },
    remove(dealId: string) {
      postCrm({ intent: "delete_deal", dealId }).then(invalidate);
    },
    create() {
      postCrm({ intent: "create_deal", deal: { title: "Nueva oportunidad" } }).then(
        invalidate
      );
    },
    savePipeline(stages: PipelineStage[]) {
      postCrm({ intent: "save_pipeline", stages }).then(invalidate);
    },
  };
}
