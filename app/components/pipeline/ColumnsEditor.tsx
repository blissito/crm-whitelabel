import { useState } from "react";
import { motion } from "framer-motion";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { HiXMark, HiTrash, HiPlus, HiBars3 } from "react-icons/hi2";
import type { PipelineStage } from "~/lib/json";

const PALETTE = [
  "#1CA7E0", "#1689BC", "#F37021", "#F2C94C", "#7FBE60",
  "#ED695F", "#19C3D6", "#9B6DD6", "#E44993", "#0B1B2E",
];

function randomId() {
  return `stage_${(globalThis.crypto?.randomUUID?.() ?? String(Math.random())).slice(0, 8).replace(/-/g, "")}`;
}

export function ColumnsEditor({
  stages: initial,
  onClose,
  onSave,
}: {
  stages: PipelineStage[];
  onClose: () => void;
  onSave: (stages: PipelineStage[]) => void;
}) {
  const [stages, setStages] = useState<PipelineStage[]>(
    initial.map((s) => ({ ...s }))
  );

  const update = (i: number, patch: Partial<PipelineStage>) =>
    setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const remove = (i: number) =>
    setStages((prev) => prev.filter((_, idx) => idx !== i));

  const add = () =>
    setStages((prev) => [
      ...prev,
      { id: randomId(), name: "Nueva etapa", color: PALETTE[prev.length % PALETTE.length], order: prev.length },
    ]);

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    setStages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(r.source.index, 1);
      next.splice(r.destination!.index, 0, moved);
      return next;
    });
  };

  const save = () => onSave(stages.map((s, i) => ({ ...s, order: i })));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-outlines px-6 py-4">
          <h2 className="text-lg font-semibold text-dark">Editar etapas</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-surface">
            <HiXMark className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="stages">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {stages.map((stage, i) => (
                    <Draggable key={stage.id} draggableId={stage.id} index={i}>
                      {(p) => (
                        <div
                          ref={p.innerRef}
                          {...p.draggableProps}
                          className="flex items-center gap-2 rounded-lg border border-outlines bg-white p-2"
                        >
                          <span {...p.dragHandleProps} className="cursor-grab text-gray-300 hover:text-gray-500">
                            <HiBars3 className="h-5 w-5" />
                          </span>
                          <ColorDot
                            color={stage.color}
                            onChange={(color) => update(i, { color })}
                          />
                          <input
                            value={stage.name}
                            onChange={(e) => update(i, { name: e.target.value })}
                            className="flex-1 rounded-md border border-transparent px-2 py-1 text-sm font-medium text-dark hover:border-outlines focus:border-brand-500 focus:outline-none"
                          />
                          {stage.isClosed && (
                            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-gray-400">
                              {stage.closedType === "won" ? "ganado" : "perdido"}
                            </span>
                          )}
                          <button
                            onClick={() => remove(i)}
                            disabled={stages.length <= 1}
                            className="rounded-md p-1.5 text-gray-300 hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                          >
                            <HiTrash className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <button
            onClick={add}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-outlines py-2.5 text-sm font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600"
          >
            <HiPlus className="h-4 w-4" />
            Agregar etapa
          </button>
        </div>

        <footer className="flex justify-end gap-2 border-t border-outlines px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600"
          >
            Guardar
          </button>
        </footer>
      </motion.div>
    </div>
  );
}

function ColorDot({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-5 w-5 rounded-full ring-2 ring-white"
        style={{ backgroundColor: color }}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-7 z-20 grid grid-cols-5 gap-1.5 rounded-lg border border-outlines bg-white p-2 shadow-lg">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className="h-5 w-5 rounded-full"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
