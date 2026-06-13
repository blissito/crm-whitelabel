// One-off: agrega/actualiza un miembro en un workspace existente.
// Uso: MEMBER_EMAIL=x@y.com MEMBER_ROLE=ADMIN MEMBER_PASSWORD=... \
//      fly ssh console -a crm-coregrid -C "/bin/sh -lc '... node prisma/add-member.mjs'"
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const email = (process.env.MEMBER_EMAIL || "").trim().toLowerCase();
const role = process.env.MEMBER_ROLE || "ADMIN";
const password = process.env.MEMBER_PASSWORD || "coregrid123";
const slug = process.env.MEMBER_WORKSPACE_SLUG || "coregrid";

if (!email) {
  console.error("Falta MEMBER_EMAIL");
  process.exit(1);
}
const ws = await db.workspace.findUnique({ where: { slug } });
if (!ws) {
  console.error("No existe el workspace:", slug);
  process.exit(1);
}
const passwordHash = await bcrypt.hash(password, 12);
const u = await db.user.upsert({
  where: { email },
  update: { role, workspaceId: ws.id, passwordHash },
  create: { email, name: email.split("@")[0], passwordHash, role, workspaceId: ws.id },
});
console.log(`OK: ${u.email} · rol ${u.role} · tablero ${ws.slug}`);
await db.$disconnect();
