import { PrismaClient } from "@prisma/client";

// Singleton de Prisma. En dev, cachear en globalThis evita múltiples
// instancias por el hot-reload de Vite.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
