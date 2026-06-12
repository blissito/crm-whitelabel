import type { PrismaClient } from "@prisma/client";

// Defaults de un tablero (Org/Workspace). Compartidos entre el seed y el
// provisioning de tableros demo, para que cada grupo nazca igual.

export const DEFAULT_PIPELINE = [
  { id: "nuevo", name: "Nuevo", color: "#1CA7E0", order: 0 },
  { id: "contactado", name: "Contactado", color: "#1689BC", order: 1 },
  { id: "cotizado", name: "Cotizado", color: "#F37021", order: 2 },
  { id: "negociacion", name: "Negociación", color: "#F2C94C", order: 3 },
  { id: "ganado", name: "Ganado", color: "#7FBE60", order: 4, isClosed: true, closedType: "won" },
  { id: "perdido", name: "Perdido", color: "#ED695F", order: 5, isClosed: true, closedType: "lost" },
];

export const DEFAULT_ESTADOS = [
  { label: "Nuevo", color: "#1CA7E0" },
  { label: "En proceso", color: "#F2C94C" },
  { label: "Resuelto", color: "#7FBE60" },
];

export const DEFAULT_TAGS = [
  { label: "VIP", color: "#F37021" },
  { label: "Soporte", color: "#1689BC" },
  { label: "Ventas", color: "#1CA7E0" },
];

export const DEFAULT_BRANDING = {
  name: "CoreGrid",
  logoUrl: "/brand/coregrid-logo.png",
  primaryColor: "#1CA7E0",
};

export function defaultWorkspaceData(overrides: {
  slug: string;
  name: string;
  apiKey?: string;
  branding?: Record<string, unknown>;
}) {
  return {
    slug: overrides.slug,
    name: overrides.name,
    pipeline: JSON.stringify(DEFAULT_PIPELINE),
    estadoPresets: JSON.stringify(DEFAULT_ESTADOS),
    tagPresets: JSON.stringify(DEFAULT_TAGS),
    branding: JSON.stringify(overrides.branding ?? { ...DEFAULT_BRANDING, name: overrides.name }),
    ...(overrides.apiKey ? { apiKey: overrides.apiKey } : {}),
  };
}

// Oportunidades demo realistas (IT/Apple) repartidas por etapas.
export async function seedDemoDeals(db: PrismaClient, workspaceId: string) {
  const existing = await db.deal.count({ where: { workspaceId } });
  if (existing > 0) return 0;

  const demo = [
    { title: "Soporte 12 MacBooks — Agencia Pixela", value: 48000, stageId: "nuevo", customerName: "Pixela Studio", customerPhone: "5512345678", tags: ["Soporte", "VIP"] },
    { title: "Implementación MDM Mosyle — Tecmilenio", value: 120000, stageId: "contactado", customerName: "Tecmilenio", customerPhone: "8181234567", tags: ["Ventas", "MDM"] },
    { title: "Migración iCloud Business — Proquifa", value: 35000, stageId: "contactado", customerName: "Proquifa", customerPhone: "5598765432", tags: ["Cloud"] },
    { title: "Renovación AppleCare — WineAdvisor", value: 22000, stageId: "cotizado", customerName: "WineAdvisor", customerPhone: "3312223344", tags: ["Ventas"] },
    { title: "Setup 30 iPads aula — Maclearn", value: 89000, stageId: "cotizado", customerName: "Maclearn", customerPhone: "5544556677", tags: ["Educación", "VIP"] },
    { title: "Auditoría seguridad endpoints — EA", value: 64000, stageId: "negociacion", customerName: "EA México", customerPhone: "5566778899", tags: ["Seguridad"] },
    { title: "Contrato soporte anual — Proquifa", value: 150000, stageId: "ganado", customerName: "Proquifa", customerPhone: "5598765432", tags: ["Soporte"] },
    { title: "Reparación lote iMac — Pixela", value: 18000, stageId: "perdido", customerName: "Pixela Studio", customerPhone: "5512345678", tags: [] },
  ];

  for (const d of demo) {
    const convo = await db.conversation.create({
      data: { workspaceId, sessionId: `demo_${cryptoRandom()}`, name: d.customerName, status: "ACTIVE" },
    });
    await db.deal.create({
      data: {
        workspaceId,
        conversationId: convo.id,
        stageId: d.stageId,
        title: d.title,
        value: d.value,
        currency: "MXN",
        source: "manual",
        customerName: d.customerName,
        customerPhone: d.customerPhone,
        tags: JSON.stringify(d.tags),
      },
    });
  }
  return demo.length;
}

function cryptoRandom() {
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}
