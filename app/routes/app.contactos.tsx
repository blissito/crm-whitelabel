import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { HiXMark, HiOutlinePhone, HiOutlineEnvelope, HiPlus } from "react-icons/hi2";
import type { Route } from "./+types/app.contactos";
import { requireWorkspace } from "server/auth.server";
import { listContacts, type ContactItem } from "server/contacts.server";
import { useEscapeKey } from "~/lib/useEscapeKey";

export function meta() {
  return [{ title: "Contactos · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { workspaceId } = await requireWorkspace(request);
  const contacts = await listContacts(workspaceId);
  return { contacts };
}

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso)
  );

export default function Contactos({ loaderData }: Route.ComponentProps) {
  const { contacts } = loaderData;
  const [editing, setEditing] = useState<ContactItem | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-dark">Contactos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Leads y contactos capturados — {contacts.length} en total.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
        >
          <HiPlus className="h-4 w-4" />
          Nuevo contacto
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-outlines bg-white">
        {contacts.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">
            No hay contactos todavía.
          </p>
        ) : (
          <ul className="divide-y divide-outlines">
            {contacts.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setEditing(c)}
                  className="flex w-full items-center gap-4 px-6 py-3 text-left transition hover:bg-surface"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-dark">
                      {c.name || c.phone || "Sin nombre"}
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-gray-400">
                      {c.phone && (
                        <span className="inline-flex items-center gap-1">
                          <HiOutlinePhone className="h-3.5 w-3.5" />
                          {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="inline-flex items-center gap-1">
                          <HiOutlineEnvelope className="h-3.5 w-3.5" />
                          {c.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{fmtDate(c.capturedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AnimatePresence>
        {(creating || editing) && (
          <ContactDrawer
            contact={editing}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ContactDrawer({
  contact,
  onClose,
}: {
  contact: ContactItem | null;
  onClose: () => void;
}) {
  const fetcher = useFetcher();
  const [name, setName] = useState(contact?.name ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");

  useEscapeKey(onClose);

  // Cerrar cuando la mutación termine con éxito.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) onClose();
  }, [fetcher.state, fetcher.data, onClose]);

  const save = () => {
    fetcher.submit(
      {
        intent: contact ? "update_contact" : "create_contact",
        contactId: contact?.id ?? null,
        contact: { name: name || null, phone: phone || null, email: email || null },
      },
      { method: "post", action: "/api/v1/crm", encType: "application/json" }
    );
  };

  const saving = fetcher.state !== "idle";

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
          <h2 className="text-lg font-semibold text-dark">
            {contact ? "Editar contacto" : "Nuevo contacto"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-surface">
            <HiXMark className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-auto p-6">
          <Field label="Nombre">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Nombre del contacto" />
          </Field>
          <Field label="Teléfono">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="55…" />
          </Field>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="correo@…" />
          </Field>
          {fetcher.data?.ok === false && (
            <p className="text-sm text-danger">{fetcher.data.error ?? "No se pudo guardar"}</p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-outlines px-6 py-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-surface">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
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
