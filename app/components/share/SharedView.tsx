import { useQuery } from "@tanstack/react-query";
import { cn } from "~/lib/cn";
import type { PipelineData, DealCard, PipelineColumn } from "server/crm.server";
import type { ShareData } from "server/share.server";

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

function ReadOnlyCard({ deal }: { deal: DealCard }) {
  const title = deal.title || deal.conversationName || "Sin título";
  return (
    <div className="rounded-xl border border-outlines bg-white p-3 shadow-sm">
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

function ReadOnlyColumn({ stage }: { stage: PipelineColumn }) {
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
          <ReadOnlyCard key={d.id} deal={d} />
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

  const logoUrl = data.branding?.logoUrl;

  if (data.kind === "deal") {
    return (
      <div className="min-h-screen bg-surface">
        <SharedHeader name={data.workspaceName} logoUrl={logoUrl} />
        <div className="mx-auto max-w-md p-6">
          {data.stageName && (
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
              {data.stageName}
            </p>
          )}
          {data.deal ? (
            <ReadOnlyCard deal={data.deal} />
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
            <ReadOnlyColumn key={s.id} stage={s} />
          ))}
        </div>
      </div>
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
