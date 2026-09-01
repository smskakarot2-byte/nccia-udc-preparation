import { PrismaClient } from "@prisma/client";

/**
 * Standard Next.js-safe Prisma singleton — avoids exhausting database
 * connections from hot-reloaded module instances in development.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
