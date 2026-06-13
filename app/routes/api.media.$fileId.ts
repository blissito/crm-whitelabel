import type { Route } from "./+types/api.media.$fileId";
import { requireWorkspace } from "server/auth.server";
import { db } from "~/lib/db.server";

// Proxy de media: resuelve el binario de un adjunto por su fileId (ancla durable
// en EasyBits) contra el endpoint de media de Formmy, manteniendo el secret en el
// servidor. Sólo operadores autenticados y sólo media de su propio workspace.
// El endpoint exacto de Formmy se cablea por env (FORMMY_MEDIA_URL) al cerrar secrets.
export async function loader({ request, params }: Route.LoaderArgs) {
  const { workspaceId } = await requireWorkspace(request);
  const fileId = params.fileId;

  // Tenant isolation: el fileId debe pertenecer a un mensaje de este workspace.
  const msg = await db.message.findFirst({
    where: { mediaFileId: fileId, conversation: { workspaceId } },
    select: { mediaMime: true, mediaFilename: true },
  });
  if (!msg) return new Response("No encontrado", { status: 404 });

  const base = process.env.FORMMY_MEDIA_URL;
  const secret = process.env.CRM_CONTROL_SECRET ?? process.env.CRM_INGEST_SECRET;
  if (!base || !secret) {
    return new Response("Media no disponible (sin endpoint configurado)", {
      status: 503,
    });
  }

  // Convención: {FORMMY_MEDIA_URL}/<fileId> (ajustable cuando se cierre el contrato).
  const url = `${base.replace(/\/$/, "")}/${encodeURIComponent(fileId)}`;
  const upstream = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!upstream.ok || !upstream.body) {
    return new Response("Media no disponible", { status: 502 });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") || msg.mediaMime || "application/octet-stream"
  );
  headers.set("Cache-Control", "private, max-age=3600");
  if (msg.mediaFilename) {
    headers.set("Content-Disposition", `inline; filename="${msg.mediaFilename}"`);
  }
  return new Response(upstream.body, { status: 200, headers });
}
