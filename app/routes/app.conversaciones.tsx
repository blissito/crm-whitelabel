import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { FaWhatsapp } from "react-icons/fa";
import { HiCheckCircle, HiPause, HiPlay, HiHandRaised } from "react-icons/hi2";
import type { Route } from "./+types/app.conversaciones";
import { requireWorkspace } from "server/auth.server";
import { db } from "~/lib/db.server";
import { listConversations, type ConversationItem } from "server/conversations.server";
import { cn } from "~/lib/cn";

export function meta() {
  return [{ title: "Conversaciones · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { workspaceId } = await requireWorkspace(request);
  const channelCount = await db.whatsAppChannel.count({
    where: { workspaceId, isActive: true },
  });
  if (channelCount === 0) {
    return { hasChannel: false as const, conversations: [] as ConversationItem[] };
  }
  const conversations = await listConversations(workspaceId);
  return { hasChannel: true as const, conversations };
}

export default function Conversaciones({ loaderData }: Route.ComponentProps) {
  if (!loaderData.hasChannel) {
    return <ConnectWhatsAppEmptyState />;
  }
  return <Inbox conversations={loaderData.conversations} />;
}

const fmtTime = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );

type MessageItem = {
  id: string;
  content: string;
  role: string;
  origin: string | null;
  mediaType: string | null;
  createdAt: string;
};

function Inbox({ conversations }: { conversations: ConversationItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    conversations[0]?.id ?? null
  );
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  if (conversations.length === 0) {
    return (
      <div className="grid h-full place-items-center p-8 text-sm text-gray-400">
        Aún no llegan conversaciones. Aparecerán aquí cuando Formmy reenvíe mensajes.
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <aside className="w-72 flex-shrink-0 overflow-y-auto border-r border-outlines bg-white">
        <ul className="divide-y divide-outlines">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-surface",
                  selectedId === c.id && "bg-surface"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-dark">
                    {c.customName || c.name || c.phone || "Sin nombre"}
                  </span>
                  <span className="text-[10px] text-gray-400">{fmtTime(c.updatedAt)}</span>
                </div>
                {c.lastMessage && (
                  <span className="truncate text-xs text-gray-400">{c.lastMessage}</span>
                )}
                <div className="mt-0.5 flex gap-1">
                  {c.manualMode && (
                    <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-[9px] font-medium text-yellow-700">
                      manual
                    </span>
                  )}
                  {c.pauseUntil && new Date(c.pauseUntil) > new Date() && (
                    <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
                      en pausa
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-surface/30">
        {selected ? (
          <Thread conversation={selected} />
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-gray-400">
            Selecciona una conversación
          </div>
        )}
      </section>
    </div>
  );
}

function Thread({ conversation }: { conversation: ConversationItem }) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fetcher = useFetcher();

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/v1/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "list_messages", conversationId: conversation.id }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setMessages(d.ok ? d.items : []);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [conversation.id]);

  const paused = conversation.pauseUntil && new Date(conversation.pauseUntil) > new Date();
  const coexist = (intent: string) =>
    fetcher.submit(
      { intent, conversationId: conversation.id },
      { method: "post", action: "/api/v1/crm", encType: "application/json" }
    );
  const busy = fetcher.state !== "idle";

  return (
    <>
      <header className="flex items-center justify-between border-b border-outlines bg-white px-6 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-dark">
            {conversation.customName || conversation.name || conversation.phone || "Conversación"}
          </p>
          {conversation.phone && (
            <p className="text-xs text-gray-400">{conversation.phone}</p>
          )}
        </div>
        <div className="flex gap-2">
          {paused || conversation.manualMode ? (
            <button
              onClick={() => coexist("resume_bot")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-outlines px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-surface disabled:opacity-50"
            >
              <HiPlay className="h-3.5 w-3.5" />
              Reanudar bot
            </button>
          ) : (
            <button
              onClick={() => coexist("pause_bot")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-outlines px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-surface disabled:opacity-50"
            >
              <HiPause className="h-3.5 w-3.5" />
              Pausar bot
            </button>
          )}
          <button
            onClick={() => coexist("takeover_conversation")}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-600 disabled:opacity-50"
          >
            <HiHandRaised className="h-3.5 w-3.5" />
            Tomar chat
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-6">
        {loading ? (
          <p className="text-center text-xs text-gray-400">Cargando mensajes…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-gray-400">Sin mensajes.</p>
        ) : (
          messages.map((m) => {
            const fromUs = m.role !== "USER";
            return (
              <div
                key={m.id}
                className={cn("flex", fromUs ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    fromUs ? "bg-accent text-white" : "bg-white text-dark border border-outlines"
                  )}
                >
                  {m.mediaType && (
                    <span className="mb-0.5 block text-[10px] opacity-70">[{m.mediaType}]</span>
                  )}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <span className={cn("mt-0.5 block text-[10px]", fromUs ? "text-white/70" : "text-gray-400")}>
                    {fmtTime(m.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function ConnectWhatsAppEmptyState() {
  const [showSteps, setShowSteps] = useState(false);
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#25D366]/10">
          <FaWhatsapp className="h-9 w-9 text-[#25D366]" />
        </div>
        <h1 className="text-2xl font-semibold text-dark">Conecta WhatsApp</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
          Vincula tu número de WhatsApp Business para recibir las conversaciones
          de tus clientes aquí y responderles desde el CRM.
        </p>

        <button
          onClick={() => setShowSteps((s) => !s)}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600"
        >
          <FaWhatsapp className="h-4 w-4" />
          Conectar WhatsApp
        </button>

        {showSteps && (
          <div className="mx-auto mt-6 max-w-sm rounded-xl border border-outlines bg-white p-5 text-left">
            <p className="mb-3 text-sm font-medium text-dark">
              Para activar tu canal necesitamos:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              {[
                "Tu cuenta de WhatsApp Business (Meta)",
                "El número telefónico verificado",
                "Aprobar el webhook de mensajes",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <HiCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-500" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-400">
              El equipo de CoreGrid te ayuda con la conexión. Disponible próximamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionStub({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-dark">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">{hint}</p>
    </div>
  );
}

export { SectionStub };
