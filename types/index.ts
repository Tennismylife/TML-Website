// Allinea i tipi al tuo schema Prisma senza doverli mantenere manualmente.
import type {
  Match as PrismaMatch,
  Player as PrismaPlayer,
  Tournament as PrismaTournament,
} from "@prisma/client";

export type Match = PrismaMatch;
export type Player = PrismaPlayer;
export type Tournament = PrismaTournament;

export type SortKey = keyof Match | null;
export type SortDirection = "asc" | "desc";
