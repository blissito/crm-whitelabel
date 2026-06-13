import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HiXMark, HiTrash } from "react-icons/hi2";
import type { DealCard, PipelineColumn, DealNoteItem } from "server/crm.server";
import {
  fetchDealNotes,
  addDealNote,
  deleteDealNote,
} from "~/lib/queries/pipeline";
import { ShareButton } from "~/components/ShareButton";
import { useEscapeKey } from "~/lib/useEscapeKey";

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

  useEscapeKey(onClose);

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
          <div className="flex items-center gap-2">
            <ShareButton kind="deal" dealId={deal.id} className="px-2.5 py-1.5" />
            <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-surface">
              <HiXMark className="h-5 w-5" />
            </button>
          </div>
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

          <NotesSection dealId={deal.id} />
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

const fmtNoteDate = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function NotesSection({ dealId }: { dealId: string }) {
  const [notes, setNotes] = useState<DealNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchDealNotes(dealId).then((data) => {
      if (active) {
        setNotes(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [dealId]);

  const add = async () => {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    const note = await addDealNote(dealId, text);
    setSaving(false);
    if (note) {
      setNotes((prev) => [note, ...prev]);
      setDraft("");
    }
  };

  const remove = async (noteId: string) => {
    const prev = notes;
    setNotes((n) => n.filter((x) => x.id !== noteId));
    const ok = await deleteDealNote(dealId, noteId);
    if (!ok) setNotes(prev); // rollback
  };

  return (
    <div className="border-t border-outlines pt-4">
      <span className="mb-2 block text-sm font-medium text-gray-600">Notas</span>

      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") add();
          }}
          rows={2}
          className="input resize-none"
          placeholder="Agregar una nota… (⌘+Enter)"
        />
        <div className="flex justify-end">
          <button
            onClick={add}
            disabled={!draft.trim() || saving}
            className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-outlines/40 disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Agregar nota"}
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {loading ? (
          <p className="text-xs text-gray-400">Cargando notas…</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-gray-400">Sin notas todavía.</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="group rounded-lg border border-outlines bg-surface/40 p-3"
            >
              <p className="whitespace-pre-wrap text-sm text-dark">{note.content}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  {note.authorEmail} · {fmtNoteDate(note.createdAt)}
                </span>
                <button
                  onClick={() => remove(note.id)}
                  className="text-gray-300 opacity-0 transition hover:text-danger group-hover:opacity-100"
                  title="Eliminar nota"
                >
                  <HiTrash className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
