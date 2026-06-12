import type { Route } from "./+types/app.escalaciones";
import { requireWorkspace } from "server/auth.server";
import { SectionStub } from "./app.conversaciones";

export function meta() {
  return [{ title: "Escalaciones · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireWorkspace(request);
  return null;
}

export default function Escalaciones() {
  return <SectionStub title="Escalaciones" hint="Handoff a agentes humanos — Fase 2" />;
}
