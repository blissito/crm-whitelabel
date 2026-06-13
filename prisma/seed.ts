import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Pipeline por defecto (mismas etapas comerciales que el CRM base).
const DEFAULT_PIPELINE = [
  { id: "nuevo", name: "Nuevo", color: "#227BC3", order: 0 },
  { id: "contactado", name: "Contactado", color: "#0986C0", order: 1 },
  { id: "cotizado", name: "Cotizado", color: "#E44993", order: 2 },
  { id: "negociacion", name: "Negociación", color: "#F2C94C", order: 3 },
  {
    id: "ganado",
    name: "Ganado",
    color: "#7FBE60",
    order: 4,
    isClosed: true,
    closedType: "won",
  },
  {
    id: "perdido",
    name: "Perdido",
    color: "#ED695F",
    order: 5,
    isClosed: true,
    closedType: "lost",
  },
];

const DEFAULT_ESTADOS = [
  { label: "Nuevo", color: "#227BC3" },
  { label: "En proceso", color: "#F2C94C" },
  { label: "Resuelto", color: "#7FBE60" },
];

const DEFAULT_TAGS = [
  { label: "VIP", color: "#E44993" },
  { label: "Soporte", color: "#0986C0" },
  { label: "Ventas", color: "#227BC3" },
];

const BRANDING = {
  name: "CoreGrid",
  logoUrl: "/brand/coregrid-logo.png",
  primaryColor: "#1CA7E0", // cyan-azul CoreGrid
};

async function main() {
  // API key para acceso de agentes (MCP). Estable vía env CRM_API_KEY;
  // solo se setea si está definida (no se borra si ya existe).
  const apiKey = process.env.CRM_API_KEY || undefined;

  const workspace = await db.workspace.upsert({
    where: { slug: "coregrid" },
    update: {
      pipeline: JSON.stringify(DEFAULT_PIPELINE),
      estadoPresets: JSON.stringify(DEFAULT_ESTADOS),
      tagPresets: JSON.stringify(DEFAULT_TAGS),
      branding: JSON.stringify(BRANDING),
      ...(apiKey ? { apiKey } : {}),
    },
    create: {
      slug: "coregrid",
      name: "CoreGrid",
      pipeline: JSON.stringify(DEFAULT_PIPELINE),
      estadoPresets: JSON.stringify(DEFAULT_ESTADOS),
      tagPresets: JSON.stringify(DEFAULT_TAGS),
      branding: JSON.stringify(BRANDING),
      ...(apiKey ? { apiKey } : {}),
    },
  });
  if (apiKey) console.log(`   API key configurada para MCP`);

  const email = process.env.SEED_ADMIN_EMAIL || "admin@coregrid.com.mx";
  // Password del admin desde env (Fly secret en prod). Sin env: default local.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(adminPassword || "dev-local-change-me", 12);
  await db.user.upsert({
    where: { email },
    // Si hay env, rota el password en cada deploy (no se hardcodea en el repo).
    update: adminPassword ? { passwordHash } : {},
    create: {
      email,
      name: "Admin",
      passwordHash,
      role: "OWNER",
      workspaceId: workspace.id,
    },
  });

  await seedDemoDeals(workspace.id);

  console.log("✅ Seed completo");
  console.log(`   Workspace: ${workspace.name} (${workspace.id})`);
  console.log(`   Admin: ${email}`);
}

// Oportunidades de ejemplo realistas para CoreGrid (soporte IT/Apple),
// repartidas por las etapas para que el kanban se vea poblado en el demo.
async function seedDemoDeals(workspaceId: string) {
  const existing = await db.deal.count({ where: { workspaceId } });
  if (existing > 0) return; // no duplicar en re-seed

  const demo: Array<{
    title: string;
    value: number;
    stageId: string;
    customerName: string;
    customerPhone: string;
    tags: string[];
  }> = [
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
      data: {
        workspaceId,
        sessionId: `demo_${Math.random().toString(36).slice(2)}`,
        name: d.customerName,
        status: "ACTIVE",
      },
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
  console.log(`   ${demo.length} oportunidades demo creadas`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
