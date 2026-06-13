// One-off: borra la cuenta admin demo de producción.
// Uso: fly ssh console -a crm-coregrid -C "node prisma/delete-admin.mjs"
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const email = process.env.SEED_ADMIN_EMAIL || "admin@coregrid.com.mx";
const r = await db.user.deleteMany({ where: { email } });
console.log(`Borrados ${r.count} usuario(s) con email ${email}`);
await db.$disconnect();
