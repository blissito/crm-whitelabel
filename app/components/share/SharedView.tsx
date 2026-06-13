import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HiXMark, HiOutlineEnvelope, HiOutlinePhone } from "react-icons/hi2";
import { cn } from "~/lib/cn";
import type {
  PipelineData,
  DealCard,
  PipelineColumn,
  DealNoteItem,
} from "server/crm.server";
import type { ShareData } from "server/share.server";

const fmtNoteDate = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const fmtCurrency = (value: number | null, currency = "MXN") =>
  value == null
    ? null
    : new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);

const TAG_COLORS = [
  "bg-brand-100 text-brand-600",
  "bg-accent/15 text-accent-600",
  "bg-green-100 text-green-700",
  "bg-yellow-100 text-yellow-700",
  "bg-cyan/15 text-cyan",
];

function ReadOnlyCard({ deal, onOpen }: { deal: DealCard; onOpen?: () => void }) {
  const title = deal.title || deal.conversationName || "Sin título";
  return (
    <div
      onClick={onOpen}
      className={cn(
        "rounded-xl border border-outlines bg-white p-3 shadow-sm",
        onOpen && "cursor-pointer transition hover:border-brand-300 hover:shadow-md"
      )}
    >
      <p className="truncate text-sm font-medium text-dark">{title}</p>
      {deal.customerName && (
        <p className="mt-0.5 truncate text-xs text-gray-400">{deal.customerName}</p>
      )}
      {deal.value != null && (
        <p className="mt-2 text-sm font-semibold text-brand-600">
          {fmtCurrency(deal.value, deal.currency)}
        </p>
      )}
      {deal.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {deal.tags.slice(0, 3).map((tag, i) => (
            <span
              key={tag}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                TAG_COLORS[i % TAG_COLORS.length]
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ReadOnlyNotes({ token, dealId }: { token: string; dealId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["share-notes", token, dealId],
    queryFn: async (): Promise<DealNoteItem[]> => {
      const res = await fetch(`/api/v1/share/${token}/notes/${dealId}`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.notes ?? [];
    },
    refetchInterval: 4_000,
    refetchIntervalInBackground: false,
  });

  const notes = data ?? [];
  if (isLoading || notes.length === 0) return null; // sin ruido si no hay notas

  return (
    <div className="border-t border-outlines pt-4">
      <span className="mb-2 block text-sm font-medium text-gray-600">Notas</span>
      <div className="space-y-2">
        {notes.map((note) => (
          <div
            key={note.id}
            className="rounded-lg border border-outlines bg-surface/40 p-3"
          >
            <p className="whitespace-pre-wrap text-sm text-dark">{note.content}</p>
            <span className="mt-1.5 block text-[11px] text-gray-400">
              {note.authorEmail} · {fmtNoteDate(note.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DealDetail({
  deal,
  stageName,
  token,
}: {
  deal: DealCard;
  stageName?: string | null;
  token: string;
}) {
  const title = deal.title || deal.conversationName || "Sin título";
  return (
    <div className="space-y-4">
      <div>
        {stageName && (
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{stageName}</p>
        )}
        <h2 className="mt-1 text-lg font-semibold text-dark">{title}</h2>
        {deal.value != null && (
          <p className="mt-1 text-xl font-semibold text-brand-600">
            {fmtCurrency(deal.value, deal.currency)}
          </p>
        )}
      </div>

      {(deal.customerName || deal.customerEmail || deal.customerPhone) && (
        <div className="rounded-xl border border-outlines bg-surface/50 p-3">
          {deal.customerName && (
            <p className="text-sm font-medium text-dark">{deal.customerName}</p>
          )}
          {deal.customerPhone && (
            <a href={`tel:${deal.customerPhone}`} className="mt-1.5 flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600">
              <HiOutlinePhone className="h-4 w-4 text-gray-400" />
              {deal.customerPhone}
            </a>
          )}
          {deal.customerEmail && (
            <a href={`mailto:${deal.customerEmail}`} className="mt-1.5 flex items-center gap-2 text-sm text-gray-600 hover:text-brand-600">
              <HiOutlineEnvelope className="h-4 w-4 text-gray-400" />
              {deal.customerEmail}
            </a>
          )}
        </div>
      )}

      {deal.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {deal.tags.map((tag, i) => (
            <span
              key={tag}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                TAG_COLORS[i % TAG_COLORS.length]
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {deal.source && (
        <p className="text-xs text-gray-400">Origen: {deal.source}</p>
      )}

      <ReadOnlyNotes token={token} dealId={deal.id} />
    </div>
  );
}

function DetailModal({
  deal,
  stageName,
  token,
  onClose,
}: {
  deal: DealCard;
  stageName?: string | null;
  token: string;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-dark/40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-surface hover:text-dark"
          aria-label="Cerrar"
        >
          <HiXMark className="h-5 w-5" />
        </button>
        <DealDetail deal={deal} stageName={stageName} token={token} />
      </div>
    </div>
  );
}

function ReadOnlyColumn({
  stage,
  onOpenDeal,
}: {
  stage: PipelineColumn;
  onOpenDeal: (deal: DealCard) => void;
}) {
  return (
    <div className="flex w-60 flex-shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-sm font-semibold text-dark">{stage.name}</h3>
          <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-gray-400">
            {stage.deals.length}
          </span>
        </div>
        {stage.totalValue > 0 && (
          <span className="text-xs font-medium text-gray-400">
            {fmtCurrency(stage.totalValue)}
          </span>
        )}
      </div>
      <div className="flex min-h-[120px] flex-1 flex-col gap-2 rounded-2xl border border-dashed border-outlines bg-surface/50 p-2">
        {stage.deals.map((d) => (
          <ReadOnlyCard key={d.id} deal={d} onOpen={() => onOpenDeal(d)} />
        ))}
        {stage.deals.length === 0 && (
          <div className="py-6 text-center text-xs text-gray-300">—</div>
        )}
      </div>
    </div>
  );
}

function SharedHeader({ name, logoUrl }: { name: string; logoUrl?: string }) {
  return (
    <header className="flex items-center gap-3 border-b border-white/10 bg-dark px-6 py-4">
      {logoUrl && <img src={logoUrl} alt={name} className="h-8 w-auto object-contain" />}
      <span className="text-sm font-medium text-white/80">{name}</span>
      <span className="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/60">
        Solo lectura
      </span>
    </header>
  );
}

export function SharedView({ token, initial }: { token: string; initial: ShareData }) {
  // Real-time: poll del endpoint público del token.
  const { data } = useQuery({
    queryKey: ["share", token],
    queryFn: async (): Promise<ShareData> => {
      const res = await fetch(`/api/v1/share/${token}`);
      if (!res.ok) throw new Error("share fetch failed");
      return res.json();
    },
    initialData: initial,
    refetchInterval: 4_000,
    refetchIntervalInBackground: false,
  });

  // Deal abierto en el modal de detalle (solo aplica al share de tablero).
  const [open, setOpen] = useState<{ deal: DealCard; stageName: string | null } | null>(null);

  const logoUrl = data.branding?.logoUrl;

  if (data.kind === "deal") {
    return (
      <div className="min-h-screen bg-surface">
        <SharedHeader name={data.workspaceName} logoUrl={logoUrl} />
        <div className="mx-auto max-w-md p-6">
          {data.deal ? (
            <div className="rounded-2xl border border-outlines bg-white p-6 shadow-sm">
              <DealDetail deal={data.deal} stageName={data.stageName} token={token} />
            </div>
          ) : (
            <p className="rounded-xl border border-outlines bg-white p-6 text-center text-sm text-gray-400">
              Esta oportunidad ya no existe.
            </p>
          )}
        </div>
      </div>
    );
  }

  const pipeline: PipelineData = data.pipeline;
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SharedHeader name={data.workspaceName} logoUrl={logoUrl} />
      <div className="flex items-center gap-6 border-b border-outlines bg-white px-6 py-4">
        <Stat label="Oportunidades" value={String(pipeline.stats.totalDeals)} />
        <Stat label="Valor total" value={fmtCurrency(pipeline.stats.totalValue) ?? "—"} />
        <Stat label="Conversión" value={`${Math.round(pipeline.stats.conversionRate * 100)}%`} />
      </div>
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex min-w-min gap-4">
          {pipeline.stages.map((s) => (
            <ReadOnlyColumn
              key={s.id}
              stage={s}
              onOpenDeal={(deal) => setOpen({ deal, stageName: s.name })}
            />
          ))}
        </div>
      </div>
      {open && (
        <DetailModal
          deal={open.deal}
          stageName={open.stageName}
          token={token}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-dark">{value}</p>
    </div>
  );
}
