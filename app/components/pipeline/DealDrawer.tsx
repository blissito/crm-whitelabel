import { useState } from "react";
import { motion } from "framer-motion";
import { HiXMark, HiTrash } from "react-icons/hi2";
import type { DealCard, PipelineColumn } from "server/crm.server";

export function DealDrawer({
  deal,
  stages,
  onClose,
  onSave,
  onDelete,
}: {
  deal: DealCard;
  stages: PipelineColumn[];
  onClose: () => void;
  onSave: (input: Partial<DealCard>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(deal.title ?? "");
  const [value, setValue] = useState(deal.value != null ? String(deal.value) : "");
  const [stageId, setStageId] = useState(deal.stageId);
  const [customerName, setCustomerName] = useState(deal.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(deal.customerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(deal.customerEmail ?? "");
  const [tagsText, setTagsText] = useState(deal.tags.join(", "));

  const save = () =>
    onSave({
      title: title || null,
      value: value ? Number(value) : null,
      stageId,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.aside
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <header className="flex items-center justify-between border-b border-outlines px-6 py-4">
          <h2 className="text-lg font-semibold text-dark">Oportunidad</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-surface">
            <HiXMark className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-auto p-6">
          <Field label="Título">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="Ej. Soporte 10 Macs"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (MXN)">
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="input"
                placeholder="0"
              />
            </Field>
            <Field label="Etapa">
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="input"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Cliente">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input"
              placeholder="Nombre del cliente"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono">
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="input"
                placeholder="55…"
              />
            </Field>
            <Field label="Email">
              <input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="input"
                placeholder="correo@…"
              />
            </Field>
          </div>

          <Field label="Etiquetas (separadas por coma)">
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="input"
              placeholder="VIP, Mayorista"
            />
          </Field>
        </div>

        <footer className="flex items-center justify-between border-t border-outlines px-6 py-4">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10"
          >
            <HiTrash className="h-4 w-4" />
            Eliminar
          </button>
          <div className="flex gap-2">
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
          </div>
        </footer>
      </motion.aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
