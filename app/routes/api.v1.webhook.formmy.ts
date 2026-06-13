import { timingSafeEqual } from "crypto";
import type { Route } from "./+types/api.v1.webhook.formmy";
import {
  ingestFormmyMessage,
  type FormmyMessageEvent,
} from "server/ingest.server";

// Webhook entrante de Formmy: copia fire-and-forget de la conversación cruda,
// evento por mensaje. Auth: Bearer compartido. Responde 200 siempre (salvo 401)
// para que Formmy no reintente.

function authorized(request: Request): boolean {
  const secret = process.env.FORMMY_WEBHOOK_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
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

  // Acepta un evento o un lote.
  const events: FormmyMessageEvent[] = Array.isArray(body)
    ? (body as FormmyMessageEvent[])
    : Array.isArray((body as { messages?: unknown }).messages)
      ? ((body as { messages: FormmyMessageEvent[] }).messages)
      : [body as FormmyMessageEvent];

  const results = [];
  for (const ev of events) {
    results.push(await ingestFormmyMessage(ev));
  }

  return Response.json({ ok: true, results });
}

// GET de cortesía para verificación/health.
export async function loader() {
  return Response.json({ ok: true, service: "formmy-webhook" });
}
