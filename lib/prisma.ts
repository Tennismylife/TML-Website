import { PrismaClient } from "@prisma/client";
import { getTour } from "./tour";
import type { Tour } from "./tour-path";

const globalForPrisma = global as unknown as { prisma?: PrismaClient; wtaPrisma?: PrismaClient };

const atp =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = atp;

let wta = globalForPrisma.wtaPrisma;

function getWtaClient() {
  if (!wta) {
    const url = new URL(process.env.DATABASE_URL!);
    url.searchParams.set("schema", "wta");
    wta = new PrismaClient({ datasourceUrl: url.toString() });
    if (process.env.NODE_ENV !== "production") globalForPrisma.wtaPrisma = wta;
  }
  return wta;
}

export function prismaForTour(tour: Tour) {
  return tour === "WTA" ? getWtaClient() : atp;
}

// In some test or minimal environments prisma client may not expose certain helper methods
// (e.g., when mocked). Ensure `$queryRaw` exists so tests that spy on it can attach mocks.
if (!(atp as any).$queryRaw) {
  (atp as any).$queryRaw = async () => [];
}

// Select the client when a query runs, so concurrent requests can use different schemas.
export const prisma = new Proxy(atp, {
  get(target, key) {
    const member = Reflect.get(target, key);
    if (typeof member === "function") {
      return async (...args: unknown[]) => {
        const client = await getTour() === "WTA" ? getWtaClient() : target;
        return Reflect.get(client, key).apply(client, args);
      };
    }
    if (typeof key !== "string" || key.startsWith("$") || key.startsWith("_") || !member || typeof member.findMany !== "function") {
      return member;
    }
    return new Proxy(member, {
      get(delegate, method) {
        const value = Reflect.get(delegate, method);
        if (typeof value !== "function") return value;
        return async (...args: unknown[]) => {
          const client = await getTour() === "WTA" ? getWtaClient() : target;
          const selected = Reflect.get(client, key);
          return Reflect.get(selected, method).apply(selected, args);
        };
      },
    });
  },
});
