import type { Route } from "./+types/app.pipeline";
import { requireWorkspace } from "server/auth.server";
import { SectionStub } from "./app.conversaciones";

export function meta() {
  return [{ title: "Pipeline · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireWorkspace(request);
  return null;
}

export default function Pipeline() {
  return <SectionStub title="Pipeline" hint="Kanban de oportunidades de venta — Fase 2" />;
}
