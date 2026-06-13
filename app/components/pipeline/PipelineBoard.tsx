import { useRef, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvided,
  type DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import { AnimatePresence } from "framer-motion";

// Grab & pan: arrastrar el fondo del tablero para desplazarlo horizontalmente.
// No interfiere con el drag&drop de las cards: si el mousedown cae sobre el
// handle de una card (atributo data-rfd-*), deja que dnd lo maneje.
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const st = useRef({ down: false, startX: 0, scrollLeft: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-rfd-drag-handle-draggable-id]")) return; // es una card
    st.current = { down: true, startX: e.pageX, scrollLeft: el.scrollLeft };
    el.classList.add("cursor-grabbing");
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!st.current.down || !ref.current) return;
    ref.current.scrollLeft = st.current.scrollLeft - (e.pageX - st.current.startX);
  };
  const stop = () => {
    st.current.down = false;
    ref.current?.classList.remove("cursor-grabbing");
  };
  return { ref, onMouseDown, onMouseMove, onMouseUp: stop, onMouseLeave: stop };
}
import { cn } from "~/lib/cn";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";
import type { PipelineColumn, DealCard, PipelineData } from "server/crm.server";
import type { PipelineStage } from "~/lib/json";
import { DealDrawer } from "./DealDrawer";
import { ColumnsEditor } from "./ColumnsEditor";

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
  "bg-accent/15 text-accent-600",
  "bg-green-100 text-green-700",
  "bg-yellow-100 text-yellow-700",
  "bg-cyan/15 text-cyan",
];

// La card ES el elemento draggable: innerRef + draggableProps + dragHandleProps
// + onClick en el MISMO div (como Formmy). NUNCA un <button> (captura el
// pointer y rompe el drag). Transiciona solo box-shadow/border, NO transform
// (lo maneja dnd).
function Card({
  deal,
  onClick,
  provided,
  snapshot,
}: {
  deal: DealCard;
  onClick: () => void;
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
}) {
  const title = deal.title || deal.conversationName || "Sin título";
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl border border-outlines bg-white p-3 shadow-sm",
        "transition-[box-shadow,border-color] hover:border-brand-300 hover:shadow",
        snapshot.isDragging && "shadow-lg ring-2 ring-brand-500"
      )}
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
    </div>
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
    <div className="flex w-60 flex-shrink-0 flex-col">
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
              "flex min-h-[120px] flex-1 flex-col gap-2 rounded-2xl border border-dashed p-2",
              "transition-[background-color,border-color]",
              snapshot.isDraggingOver
                ? "border-brand-300 bg-brand-100/40"
                : "border-outlines bg-surface/50"
            )}
          >
            {stage.deals.map((deal, index) => (
              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                {(p, snap) => (
                  <Card
                    deal={deal}
                    onClick={() => onCardClick(deal)}
                    provided={p}
                    snapshot={snap}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {stage.deals.length === 0 && !snapshot.isDraggingOver && (
              <div className="rounded-lg border border-dashed border-outlines py-6 text-center text-xs text-gray-400">
                Arrastra aquí
              </div>
            )}
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
  onSavePipeline,
}: {
  data: PipelineData;
  onMove: (dealId: string, stageId: string, position: number) => void;
  onSaveDeal: (dealId: string, input: Partial<DealCard>) => void;
  onDeleteDeal: (dealId: string) => void;
  onCreateDeal: () => void;
  onSavePipeline: (stages: PipelineStage[]) => void;
}) {
  const [selected, setSelected] = useState<DealCard | null>(null);
  const [editColumns, setEditColumns] = useState(false);
  const pan = useDragScroll();

  // Etapas sin los deals (para el editor).
  const stageDefs: PipelineStage[] = data.stages.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    order: s.order,
    ...(s.isClosed ? { isClosed: true, closedType: s.closedType } : {}),
  }));

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
    <div className="flex h-full min-w-0 flex-col">
      {/* Stats bar */}
      <div className="flex items-center justify-between border-b border-outlines bg-white px-6 py-4">
        <div className="flex gap-6">
          <Stat label="Oportunidades" value={String(data.stats.totalDeals)} />
          <Stat label="Abiertas" value={String(data.stats.openDeals)} />
          <Stat label="Valor total" value={fmtCurrency(data.stats.totalValue) ?? "—"} />
          <Stat
            label="Conversión"
            value={`${Math.round(data.stats.conversionRate * 100)}%`}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditColumns(true)}
            title="Editar etapas"
            className="inline-flex items-center gap-1.5 rounded-lg border border-outlines px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-surface"
          >
            <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
            Etapas
          </button>
          <button
            onClick={onCreateDeal}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
          >
            + Nueva oportunidad
          </button>
        </div>
      </div>

      {/* Board: grab & pan horizontal (arrastrar el fondo), barra oculta */}
      <div
        ref={pan.ref}
        onMouseDown={pan.onMouseDown}
        onMouseMove={pan.onMouseMove}
        onMouseUp={pan.onMouseUp}
        onMouseLeave={pan.onMouseLeave}
        className="no-scrollbar min-w-0 flex-1 cursor-grab select-none overflow-x-auto overflow-y-hidden p-6"
      >
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex h-full min-w-min gap-4">
            {data.stages.map((stage) => (
              <Column key={stage.id} stage={stage} onCardClick={setSelected} />
            ))}
          </div>
        </DragDropContext>
      </div>

      {editColumns && (
        <ColumnsEditor
          stages={stageDefs}
          onClose={() => setEditColumns(false)}
          onSave={(stages) => {
            onSavePipeline(stages);
            setEditColumns(false);
          }}
        />
      )}

      <AnimatePresence>
        {selected && (
          <DealDrawer
            key={selected.id}
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
      </AnimatePresence>
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
