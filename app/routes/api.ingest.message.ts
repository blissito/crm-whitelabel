import { timingSafeEqual } from "crypto";
import type { Route } from "./+types/api.ingest.message";
import { ingestMirrorEvent, type MirrorEvent } from "server/ingest.server";

// Plano A — mirror de Formmy: copia fire-and-forget del transcript, evento por
// mensaje. Auth: Bearer del INGEST_SECRET que el CRM genera. Responde 2xx siempre
// (salvo 401) y rápido — Formmy NO reintenta. Spec: docs/crm-coregrid-integration.md.

function authorized(request: Request): boolean {
  const secret = process.env.CRM_INGEST_SECRET ?? process.env.FORMMY_WEBHOOK_SECRET;
  if (!secret) return false;
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function action({ request }: Route.ActionArgs) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: true, ignored: "json inválido" });
  }

  const events: MirrorEvent[] = Array.isArray(body)
    ? (body as MirrorEvent[])
    : [body as MirrorEvent];

  const results = [];
  for (const ev of events) results.push(await ingestMirrorEvent(ev));

  return Response.json({ ok: true, results });
}

// GET de cortesía (health).
export async function loader() {
  return Response.json({ ok: true, service: "crm-ingest" });
}
