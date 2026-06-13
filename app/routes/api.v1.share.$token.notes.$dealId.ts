import type { Route } from "./+types/api.v1.share.$token.notes.$dealId";
import { resolveShareNotes } from "server/share.server";

// Notas read-only de un deal expuesto por un share link. El token ES la
// autorización; no requiere sesión. 404 si el token no cubre ese deal.
export async function loader({ params }: Route.LoaderArgs) {
  const notes = await resolveShareNotes(params.token, params.dealId);
  if (notes === null) {
    return Response.json({ error: "No disponible" }, { status: 404 });
  }
  return Response.json({ notes });
}
