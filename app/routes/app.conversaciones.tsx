import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { HiCheckCircle } from "react-icons/hi2";
import type { Route } from "./+types/app.conversaciones";
import { requireWorkspace } from "server/auth.server";
import { db } from "~/lib/db.server";

export function meta() {
  return [{ title: "Conversaciones · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { workspaceId } = await requireWorkspace(request);
  const [channelCount, conversationCount] = await Promise.all([
    db.whatsAppChannel.count({ where: { workspaceId, isActive: true } }),
    db.conversation.count({ where: { workspaceId } }),
  ]);
  return { hasChannel: channelCount > 0, conversationCount };
}

export default function Conversaciones({ loaderData }: Route.ComponentProps) {
  // Sin canal conectado → empty state con CTA para conectar WhatsApp.
  if (!loaderData.hasChannel) {
    return <ConnectWhatsAppEmptyState />;
  }
  // (Con canal: la bandeja real se construye en la siguiente fase.)
  return (
    <SectionStub
      title="Conversaciones"
      hint={`Bandeja conectada · ${loaderData.conversationCount} conversaciones`}
    />
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
