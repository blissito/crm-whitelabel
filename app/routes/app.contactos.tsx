import type { Route } from "./+types/app.contactos";
import { requireWorkspace } from "server/auth.server";
import { SectionStub } from "./app.conversaciones";

export function meta() {
  return [{ title: "Contactos · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireWorkspace(request);
  return null;
}

export default function Contactos() {
  return <SectionStub title="Contactos" hint="Leads y contactos capturados — Fase 2" />;
}
