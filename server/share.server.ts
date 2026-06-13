import { randomBytes } from "crypto";
import { db } from "~/lib/db.server";
import {
  getPipeline,
  listDealNotes,
  type PipelineData,
  type DealCard,
  type DealNoteItem,
} from "server/crm.server";
import { parseBranding, type Branding } from "~/lib/json";

export type ShareData =
  | {
      kind: "pipeline";
      workspaceName: string;
      branding: Branding | null;
      pipeline: PipelineData;
    }
  | {
      kind: "deal";
      workspaceName: string;
      branding: Branding | null;
      deal: DealCard | null;
      stageName: string | null;
    };

/** Crea un share link (token) para el tablero o un deal. Devuelve el token. */
export async function createShareLink(
  workspaceId: string,
  opts: { kind: "pipeline" | "deal"; dealId?: string; expiresHours?: number }
): Promise<string> {
  if (opts.kind === "deal" && opts.dealId) {
    const deal = await db.deal.findFirst({
      where: { id: opts.dealId, workspaceId },
      select: { id: true },
    });
    if (!deal) throw new Error("Deal no encontrado en este tablero");
  }
  const token = `share_${randomBytes(16).toString("hex")}`;
  const expiresAt = opts.expiresHours
    ? new Date(Date.now() + opts.expiresHours * 3_600_000)
    : null;
  await db.shareLink.create({
    data: {
      token,
      workspaceId,
      kind: opts.kind,
      dealId: opts.kind === "deal" ? opts.dealId ?? null : null,
      expiresAt,
    },
  });
  return token;
}

/** Lista los share links activos (no expirados) de un tablero, con el título
 *  del deal si aplica. Para administrarlos/apagarlos desde el UI. */
export async function listShareLinks(workspaceId: string) {
  const links = await db.shareLink.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
  const now = Date.now();
  const live = links.filter((l) => !l.expiresAt || l.expiresAt.getTime() > now);
  const dealIds = live.map((l) => l.dealId).filter((id): id is string => !!id);
  const deals = dealIds.length
    ? await db.deal.findMany({
        where: { id: { in: dealIds } },
        select: { id: true, title: true },
      })
    : [];
  const titleById = new Map(deals.map((d) => [d.id, d.title]));
  return live.map((l) => ({
    id: l.id,
    token: l.token,
    kind: l.kind,
    dealTitle: l.dealId ? titleById.get(l.dealId) ?? "(eliminado)" : null,
    expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
    createdAt: l.createdAt.toISOString(),
  }));
}

/** Apaga (borra) un share link. Scopeado al workspace. */
export async function revokeShareLink(workspaceId: string, id: string) {
  await db.shareLink.deleteMany({ where: { id, workspaceId } });
}

/** Notas read-only de un deal expuesto por un token. null si el token es
 *  inválido/expirado o el deal no corresponde al alcance del token. */
export async function resolveShareNotes(
  token: string,
  dealId: string
): Promise<DealNoteItem[] | null> {
  const link = await db.shareLink.findUnique({ where: { token } });
  if (!link) return null;
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return null;
  // Un token de deal específico solo expone las notas de ese deal.
  if (link.kind === "deal" && link.dealId && link.dealId !== dealId) return null;
  try {
    return await listDealNotes(link.workspaceId, dealId);
  } catch {
    return null; // deal fuera del workspace del token
  }
}

/** Resuelve los datos read-only de un token. null si inválido/expirado. */
export async function resolveShareData(token: string): Promise<ShareData | null> {
  const link = await db.shareLink.findUnique({ where: { token } });
  if (!link) return null;
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return null;

  const ws = await db.workspace.findUnique({
    where: { id: link.workspaceId },
    select: { name: true, branding: true },
  });
  const branding = parseBranding(ws?.branding);
  const workspaceName = ws?.name ?? "Tablero";
  const pipeline = await getPipeline(link.workspaceId);

  if (link.kind === "deal" && link.dealId) {
    let deal: DealCard | null = null;
    let stageName: string | null = null;
    for (const s of pipeline.stages) {
      const d = s.deals.find((x) => x.id === link.dealId);
      if (d) {
        deal = d;
        stageName = s.name;
        break;
      }
    }
    return { kind: "deal", workspaceName, branding, deal, stageName };
  }
  return { kind: "pipeline", workspaceName, branding, pipeline };
}
