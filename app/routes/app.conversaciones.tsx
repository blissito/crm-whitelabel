import type { Route } from "./+types/app.conversaciones";
import { requireWorkspace } from "server/auth.server";

export function meta() {
  return [{ title: "Conversaciones · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireWorkspace(request);
  return null;
}

export default function Conversaciones() {
  return (
    <SectionStub
      title="Conversaciones"
      hint="Bandeja de WhatsApp (lista / tablero / tabla) — Fase 2"
    />
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
