import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { cn } from "~/lib/cn";
import type { PipelineColumn, DealCard, PipelineData } from "server/crm.server";
import { DealDrawer } from "./DealDrawer";

const fmtCurrency = (value: number | null, currency = "MXN") =>
  value == null
    ? null
    : new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);

const TAG_COLORS = [
  "bg-brand-100 text-brand-600",
  "bg-pink-100 text-pink-700",
  "bg-green-100 text-green-700",
  "bg-yellow-100 text-yellow-700",
  "bg-blue-100 text-blue-700",
];

function Card({ deal, onClick }: { deal: DealCard; onClick: () => void }) {
  const title = deal.title || deal.conversationName || "Sin título";
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-outlines bg-white p-3 text-left shadow-sm transition hover:border-brand-300 hover:shadow"
    >
      <p className="truncate text-sm font-medium text-dark">{title}</p>
      {deal.customerName && (
        <p className="mt-0.5 truncate text-xs text-gray-400">{deal.customerName}</p>
      )}
      {deal.value != null && (
        <p className="mt-2 text-sm font-semibold text-brand-600">
          {fmtCurrency(deal.value, deal.currency)}
        </p>
      )}
      {deal.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {deal.tags.slice(0, 3).map((tag, i) => (
            <span
              key={tag}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                TAG_COLORS[i % TAG_COLORS.length]
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function Column({
  stage,
  onCardClick,
}: {
  stage: PipelineColumn;
  onCardClick: (d: DealCard) => void;
}) {
  return (
    <div className="flex w-72 flex-shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-sm font-semibold text-dark">{stage.name}</h3>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-gray-400">
            {stage.deals.length}
          </span>
        </div>
        {stage.totalValue > 0 && (
          <span className="text-xs font-medium text-gray-400">
            {fmtCurrency(stage.totalValue)}
          </span>
        )}
      </div>

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex min-h-[120px] flex-1 flex-col gap-2 rounded-2xl border border-dashed p-2 transition",
              snapshot.isDraggingOver
                ? "border-brand-300 bg-brand-100/40"
                : "border-outlines bg-surface/50"
            )}
          >
            {stage.deals.map((deal, index) => (
              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                {(p, snap) => (
                  <div
                    ref={p.innerRef}
                    {...p.draggableProps}
                    {...p.dragHandleProps}
                    className={cn(snap.isDragging && "opacity-90")}
                  >
                    <Card deal={deal} onClick={() => onCardClick(deal)} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export function PipelineBoard({
  data,
  onMove,
  onSaveDeal,
  onDeleteDeal,
  onCreateDeal,
}: {
  data: PipelineData;
  onMove: (dealId: string, stageId: string, position: number) => void;
  onSaveDeal: (dealId: string, input: Partial<DealCard>) => void;
  onDeleteDeal: (dealId: string) => void;
  onCreateDeal: () => void;
}) {
  const [selected, setSelected] = useState<DealCard | null>(null);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;
    onMove(draggableId, destination.droppableId, destination.index);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Stats bar */}
      <div className="flex items-center justify-between border-b border-outlines bg-white px-6 py-4">
        <div className="flex gap-6">
          <Stat label="Oportunidades" value={String(data.stats.totalDeals)} />
          <Stat label="Abiertas" value={String(data.stats.openDeals)} />
          <Stat
            label="Valor total"
            value={fmtCurrency(data.stats.totalValue) ?? "—"}
          />
          <Stat
            label="Conversión"
            value={`${Math.round(data.stats.conversionRate * 100)}%`}
          />
        </div>
        <button
          onClick={onCreateDeal}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          + Nueva oportunidad
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4">
            {data.stages.map((stage) => (
              <Column key={stage.id} stage={stage} onCardClick={setSelected} />
            ))}
          </div>
        </DragDropContext>
      </div>

      {selected && (
        <DealDrawer
          deal={selected}
          stages={data.stages}
          onClose={() => setSelected(null)}
          onSave={(input) => {
            onSaveDeal(selected.id, input);
            setSelected(null);
          }}
          onDelete={() => {
            onDeleteDeal(selected.id);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-dark">{value}</p>
    </div>
  );
}
