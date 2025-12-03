// import type { TournamentCategory } from "@prisma/client";

export type Tournament = {
  id: number;
  name: string;
  slug: string;
  category: TournamentCategory;
  city?: string;
  country?: string;
  ioc?: string;
  surfaces?: string[];
  indoor?: boolean;
  website?: string;
};

export type TournamentDTO = Tournament;

export type TournamentGroups = {
  grandSlams: TournamentDTO[];
  masters1000: TournamentDTO[];
  finals: TournamentDTO[];
  olympics: TournamentDTO[];
  others: TournamentDTO[];
};

export enum TournamentCategory {
  GRAND_SLAM = "GRAND_SLAM",
  MASTERS_1000 = "MASTERS_1000",
  FINALS = "FINALS",
  OLYMPICS = "OLYMPICS",
  OTHER = "OTHER",
}