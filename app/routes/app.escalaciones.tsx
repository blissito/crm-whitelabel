import { useFetcher } from "react-router";
import type { Route } from "./+types/app.escalaciones";
import { requireWorkspace } from "server/auth.server";
import { listEscalations, type EscalationItem } from "server/escalations.server";
import { cn } from "~/lib/cn";

export function meta() {
  return [{ title: "Escalaciones · CRM CoreGrid" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { workspaceId } = await requireWorkspace(request);
  const escalations = await listEscalations(workspaceId);
  return { escalations };
}

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const PRIORITY_STYLE: Record<string, string> = {
  URGENT: "bg-danger/10 text-danger",
  HIGH: "bg-yellow-100 text-yellow-700",
  NORMAL: "bg-brand-100 text-brand-600",
  LOW: "bg-surface text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendientes",
  ASSIGNED: "Asignadas",
  RESOLVED: "Resueltas",
};

export default function Escalaciones({ loaderData }: Route.ComponentProps) {
  const { escalations } = loaderData;

  const groups = (["PENDING", "ASSIGNED", "RESOLVED"] as const).map((status) => ({
    status,
    items: escalations.filter((e) => e.status === status),
  }));

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold text-dark">Escalaciones</h1>
      <p className="mt-1 text-sm text-gray-500">
        Handoff a agentes humanos — generadas por el agente desde una conversación.
      </p>

      {escalations.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-outlines bg-white px-6 py-10 text-center text-sm text-gray-400">
          No hay escalaciones todavía.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map(
            (g) =>
              g.items.length > 0 && (
                <section key={g.status}>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
                    {STATUS_LABEL[g.status]} · {g.items.length}
                  </h2>
                  <ul className="space-y-2">
                    {g.items.map((e) => (
                      <EscalationRow key={e.id} escalation={e} />
                    ))}
                  </ul>
                </section>
              )
          )}
        </div>
      )}
    </div>
  );
}

function EscalationRow({ escalation: e }: { escalation: EscalationItem }) {
  const fetcher = useFetcher();
  const busy = fetcher.state !== "idle";

  const act = (intent: string) =>
    fetcher.submit(
      { intent, id: e.id },
      { method: "post", action: "/api/v1/crm", encType: "application/json" }
    );

  return (
    <li className="rounded-xl border border-outlines bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                PRIORITY_STYLE[e.priority] ?? PRIORITY_STYLE.NORMAL
              )}
            >
              {e.priority}
            </span>
            <p className="truncate text-sm font-medium text-dark">{e.reason}</p>
          </div>
          {e.summary && <p className="mt-1 text-sm text-gray-500">{e.summary}</p>}
          <p className="mt-1 text-xs text-gray-400">
            {e.conversationName ?? "Conversación"} · {fmtDate(e.createdAt)}
            {e.assignedTo && ` · ${e.assignedTo}`}
          </p>
        </div>
        {e.status !== "RESOLVED" && (
          <div className="flex flex-shrink-0 gap-2">
            {e.status === "PENDING" && (
              <button
                onClick={() => act("assign_escalation")}
                disabled={busy}
                className="rounded-lg border border-outlines px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-surface disabled:opacity-50"
              >
                Asignarme
              </button>
            )}
            <button
              onClick={() => act("resolve_escalation")}
              disabled={busy}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-600 disabled:opacity-50"
            >
              Resolver
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
