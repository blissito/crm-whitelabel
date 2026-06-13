import {
  HiOutlineKey,
  HiOutlineRectangleStack,
  HiOutlineShare,
  HiOutlineComputerDesktop,
  HiOutlineCpuChip,
} from "react-icons/hi2";

export type AuditEntry = {
  id: string;
  actorType: string;
  actorEmail: string | null;
  via: string;
  action: string;
  targetType: string | null;
  targetLabel: string | null;
  createdAt: string | Date;
  workspaceName?: string;
};

const ACTION_LABEL: Record<string, string> = {
  "deal.created": "creó una oportunidad",
  "deal.updated": "editó una oportunidad",
  "deal.moved": "movió una oportunidad",
  "deal.deleted": "eliminó una oportunidad",
  "pipeline.updated": "editó las etapas",
  "key.regenerated": "regeneró una llave",
  "key.generated": "generó una llave",
  "share.created": "creó un link de compartir",
  "member.invited": "invitó a un colaborador",
  "workspace.updated": "actualizó el tablero",
};

function actorLabel(e: AuditEntry): string {
  if (e.actorEmail) return e.actorEmail;
  return e.via === "api_key" ? "Agente (llave del tablero)" : "Sistema";
}

function timeAgo(d: string | Date): string {
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "hace un momento";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

export function AuditFeed({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-outlines bg-white p-8 text-center text-sm text-gray-400">
        Sin actividad todavía.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-outlines overflow-hidden rounded-2xl border border-outlines bg-white">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-3 px-4 py-3">
          <ViaBadge via={e.via} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-dark">
              <span className="font-medium">{actorLabel(e)}</span>{" "}
              <span className="text-gray-500">{ACTION_LABEL[e.action] ?? e.action}</span>
              {e.targetLabel && (
                <span className="text-gray-400"> · {e.targetLabel}</span>
              )}
              {e.workspaceName && (
                <span className="text-gray-400"> · {e.workspaceName}</span>
              )}
            </p>
          </div>
          <span className="flex-shrink-0 text-xs text-gray-400">{timeAgo(e.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

function ViaBadge({ via }: { via: string }) {
  const isApi = via === "api_key";
  return (
    <span
      title={isApi ? "Vía llave (agente)" : "Desde el panel"}
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
        isApi ? "bg-brand-100 text-brand-600" : "bg-surface text-gray-500"
      }`}
    >
      {isApi ? <HiOutlineCpuChip className="h-4 w-4" /> : <HiOutlineComputerDesktop className="h-4 w-4" />}
    </span>
  );
}

// Iconos por tipo de objeto (export por si se reutiliza)
export const TARGET_ICON = {
  key: HiOutlineKey,
  pipeline: HiOutlineRectangleStack,
  share: HiOutlineShare,
};
