import type { Route } from "./+types/api.v1.share.$token";
import { resolveShareData } from "server/share.server";

// Datos read-only de un share link (para el poll real-time de la vista pública).
// El token ES la autorización; no requiere sesión.
export async function loader({ params }: Route.LoaderArgs) {
  const data = await resolveShareData(params.token);
  if (!data) {
    return Response.json({ error: "Link inválido o expirado" }, { status: 404 });
  }
  return Response.json(data);
}
