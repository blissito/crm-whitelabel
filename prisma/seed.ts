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
  primaryColor: "#227BC3",
};

async function main() {
  const workspace = await db.workspace.upsert({
    where: { slug: "coregrid" },
    update: {
      pipeline: JSON.stringify(DEFAULT_PIPELINE),
      estadoPresets: JSON.stringify(DEFAULT_ESTADOS),
      tagPresets: JSON.stringify(DEFAULT_TAGS),
      branding: JSON.stringify(BRANDING),
    },
    create: {
      slug: "coregrid",
      name: "CoreGrid",
      pipeline: JSON.stringify(DEFAULT_PIPELINE),
      estadoPresets: JSON.stringify(DEFAULT_ESTADOS),
      tagPresets: JSON.stringify(DEFAULT_TAGS),
      branding: JSON.stringify(BRANDING),
    },
  });

  const email = "admin@coregrid.com.mx";
  const passwordHash = await bcrypt.hash("coregrid123", 12);
  await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin CoreGrid",
      passwordHash,
      role: "OWNER",
      workspaceId: workspace.id,
    },
  });

  console.log("✅ Seed completo");
  console.log(`   Workspace: ${workspace.name} (${workspace.id})`);
  console.log(`   Login: ${email} / coregrid123`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
