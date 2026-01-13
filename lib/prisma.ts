import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// In some test or minimal environments prisma client may not expose certain helper methods
// (e.g., when mocked). Ensure `$queryRaw` exists so tests that spy on it can attach mocks.
if (!(prisma as any).$queryRaw) {
  (prisma as any).$queryRaw = async () => [];
}
