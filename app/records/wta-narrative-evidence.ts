import type { Prisma } from "@prisma/client";
import { prismaForTour } from "@/lib/prisma";
import type { WtaNarrativeSpec } from "./WtaRecordNarrative";

type Row = Record<string, unknown>;
const select = {
  id: true, event_id: true, tourney_id: true, tourney_name: true, tourney_date: true,
  tourney_level: true, surface: true, year: true, round: true, match_num: true,
  winner_id: true, loser_id: true, winner_name: true, loser_name: true, winner_ioc: true, loser_ioc: true, score: true,
} satisfies Prisma.MatchSelect;
type Match = Prisma.MatchGetPayload<{ select: typeof select }>;
const prisma = () => prismaForTour("WTA");

export type NarrativeEdition = {
  tournament: string;
  tournamentId?: string;
  slug?: string;
  year?: number;
  date?: string;
  round?: string;
  opponent?: string;
  opponentId?: string;
  opponentIoc?: string;
  opponentSlug?: string;
  score?: string;
  result?: "beat" | "lost to";
};

export type NarrativeEvidence = {
  first?: NarrativeEdition;
  last?: NarrativeEdition;
  championships?: NarrativeEdition[];
  titleMilestone?: NarrativeEdition;
  thousandthMatch?: NarrativeEdition;
  runEnding?: NarrativeEdition;
  surfaceCount?: number;
  finalCount?: number;
  majorCount?: number;
  seasons?: number[];
  eventCount?: number;
  wins?: number;
  losses?: number;
};

function fields(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function id(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function values(value: unknown) {
  return value instanceof Set || Array.isArray(value) ? Array.from(value).filter((x): x is string => typeof x === "string") : [];
}

function ids(row: Row) {
  const pair = [id(fields(row.player_1 ?? row.player1).id), id(fields(row.player_2 ?? row.player2).id)];
  if (pair[0] && pair[1]) return [pair[0], pair[1]];
  const one = id(row.player_id ?? row.id ?? row.PlayerId ?? row.playerId ?? fields(row.player).id);
  return one ? [one] : [];
}

function edition(match: Match, player: string): NarrativeEdition | undefined {
  if (!match.tourney_name) return;
  const win = match.winner_id === player;
  return {
    tournament: match.tourney_name,
    tournamentId: match.tourney_id ?? undefined,
    year: match.year ?? match.tourney_date?.getUTCFullYear(),
    date: match.tourney_date?.toISOString().slice(0, 10),
    round: match.round ?? undefined,
    opponent: (win ? match.loser_name : match.winner_name) ?? undefined,
    opponentId: (win ? match.loser_id : match.winner_id) ?? undefined,
    opponentIoc: (win ? match.loser_ioc : match.winner_ioc) ?? undefined,
    score: match.score ?? undefined,
    result: win ? "beat" : "lost to",
  };
}

function numericTournamentId(value?: string) {
  const number = value?.match(/^(?:[0-9]{4}-)?([0-9]+)$/)?.[1];
  return number ? Number(number) : undefined;
}

function appearanceEndpoint(period: Row, side: "first" | "last", matches: Match[], player: string): NarrativeEdition | undefined {
  const name = id(period[`${side}_tourney_name`]);
  const tournamentId = id(period[`${side}_tourney_id`]);
  const day = id(period[`${side}_tourney_date`])?.slice(0, 10);
  if (!name || !day) return undefined;
  const matched = matches.filter(m =>
    m.tourney_date?.toISOString().slice(0, 10) === day
    && (tournamentId ? m.tourney_id === tournamentId : m.tourney_name === name));
  const match = side === "first" ? matched[0] : matched.at(-1);
  return match ? edition(match, player) : { tournament: name, tournamentId, year: Number(day.slice(0, 4)) };
}

export async function getWtaNarrativeEvidence(
  spec: WtaNarrativeSpec,
  inputs: unknown[],
  props: Record<string, unknown>,
): Promise<NarrativeEvidence[]> {
  const rows = inputs.slice(0, 8).map(fields);
  const participants = rows.map(ids);
  const playerIds = [...new Set(participants.flat())];
  if (!playerIds.length) return [];
  if (!["ages", "count", "entries", "h2h", "percentage", "played", "roundsonentries", "same", "seasons", "streak", "timespan", "titles", "wins"].includes(spec.record)) return [];

  const surfaces = values(props.selectedSurfaces);
  const levels = values(props.selectedLevels);
  const round = typeof props.selectedRounds === "string" ? props.selectedRounds : "";
  const bestOf = typeof props.selectedBestOf === "number" ? props.selectedBestOf : null;
  const ageChampion = spec.record === "ages" && spec.sourcePath.endsWith("title-winners");
  const titles = spec.record === "titles" || spec.sub === "titles" || ageChampion;
  const wins = titles || spec.record === "wins" || spec.sub === "wins";
  const ageEvents = spec.record === "ages" ? rows.flatMap(row => id(row.event_id) ?? []) : [];
  if (spec.record === "ages" && !ageEvents.length) return [];
  const matches = await prisma().match.findMany({
    where: {
      status: true,
      tourney_date: { not: null },
      OR: [{ winner_id: { in: playerIds } }, { loser_id: { in: playerIds } }],
      ...(ageEvents.length && { event_id: { in: ageEvents } }),
      ...(surfaces.length && { surface: { in: surfaces } }),
      ...(levels.length && { tourney_level: { in: levels } }),
      ...(titles ? { round: "F", team_event: false } : round && round !== "All" ? { round } : {}),
      ...(bestOf ? { best_of: bestOf } : {}),
      ...(spec.record === "timespan" && spec.sub === "entries" && { team_event: false }),
    },
    select,
    orderBy: [{ tourney_date: "asc" }, { match_num: "asc" }, { id: "asc" }],
  });

  const byPlayer = new Map<string, Match[]>();
  const tracked = new Set(playerIds);
  for (const match of matches) {
    for (const id of [match.winner_id, match.loser_id]) {
      if (!id || !tracked.has(id)) continue;
      if (!byPlayer.has(id)) byPlayer.set(id, []);
      byPlayer.get(id)?.push(match);
    }
  }

  const details: NarrativeEvidence[] = rows.map((row, index) => {
    const [player, rival] = participants[index];
    const tournament = spec.record === "same" ? id(row.tourney_id) : undefined;
    const event = spec.record === "ages" ? id(row.event_id) : undefined;
    const season = spec.record === "seasons" ? Number(row.year ?? row.Year) : null;
    const matchIds = Array.isArray(row.match_ids) ? new Set(row.match_ids.map(String)) : null;
    const events = Array.isArray(row.event_ids) ? new Set(row.event_ids.map(String)) : null;
    const scoped = (byPlayer.get(player) ?? []).filter(match =>
      (!rival || match.winner_id === rival || match.loser_id === rival)
      && (!tournament || match.tourney_id === tournament)
      && (!event || match.event_id === event)
      && (!season || match.year === season));
    const selected = scoped.filter(match =>
      (!wins || match.winner_id === player)
      && (!matchIds || matchIds.has(String(match.id)))
      && (!events || events.has(String(match.event_id))));
    if (spec.record === "streak" && !matchIds && !events) return {};
    const ordered = matchIds
      ? Array.from(matchIds, matchId => selected.find(match => String(match.id) === matchId)).filter((match): match is Match => Boolean(match))
      : selected;
    const first = ordered[0];
    const last = ordered.at(-1);
    const championships = titles || (spec.record === "streak" && spec.sub !== "round")
      ? Array.from(new Map(ordered.filter(match => match.round === "F" && match.winner_id === player)
        .map(match => [match.event_id ?? match.id, match])).values())
      : undefined;
    const thousandthMatch = spec.record === "played" && ordered[999] ? edition(ordered[999], player) : undefined;
    const headToHead = spec.record === "h2h" && rival ? scoped : undefined;
    const next = spec.record === "streak" && spec.sub !== "round" && last
      ? scoped[scoped.findIndex(match => match.id === last.id) + 1]
      : undefined;
    const appearanceSpan = spec.record === "timespan" && spec.sub === "entries"
      ? fields([row.overall_timespan, row.surface_timespan, row.level_timespan].find(Array.isArray)?.[0])
      : null;
    return {
      first: appearanceSpan ? appearanceEndpoint(appearanceSpan, "first", selected, player) : first ? edition(first, player) : undefined,
      last: appearanceSpan ? appearanceEndpoint(appearanceSpan, "last", selected, player) : last && last.id !== first?.id ? edition(last, player) : undefined,
      championships: championships?.flatMap(match => edition(match, player) ?? []),
      titleMilestone: championships?.[99] ? edition(championships[99], player) : undefined,
      thousandthMatch,
      surfaceCount: headToHead ? new Set(headToHead.flatMap(match => match.surface ?? [])).size : undefined,
      finalCount: headToHead?.filter(match => match.round === "F").length,
      majorCount: headToHead?.filter(match => match.tourney_level === "G").length,
      runEnding: next?.loser_id === player ? edition(next, player) : undefined,
      seasons: [...new Set(selected.flatMap(match => match.year ?? []))],
      eventCount: new Set(selected.flatMap(match => match.event_id ?? [])).size,
      wins: scoped.filter(match => match.winner_id === player).length,
      losses: scoped.filter(match => match.loser_id === player).length,
    };
  });

  const editions = details.flatMap(item =>
    [item.first, item.last, item.titleMilestone, item.thousandthMatch, item.runEnding, ...(item.championships ?? [])]
      .filter((event): event is NarrativeEdition => Boolean(event)));
  const opponents = [...new Set(editions.flatMap(event => event.opponentId ?? []))];
  const tournamentIds = [...new Set(editions.flatMap(event => numericTournamentId(event.tournamentId) ?? []))];
  const [playerLinks, tournamentLinks] = await Promise.all([
    opponents.length ? prisma().player.findMany({ where: { id: { in: opponents } }, select: { id: true, slug: true } }) : [],
    tournamentIds.length ? prisma().tournament.findMany({ where: { id: { in: tournamentIds } }, select: { id: true, slug: true } }) : [],
  ]);
  const playerSlugs = new Map<string, string | null>(playerLinks.map(player => [player.id, player.slug] as const));
  const tournamentSlugs = new Map<number, string>(tournamentLinks.map(tournament => [tournament.id, tournament.slug] as const));
  for (const event of editions) {
    if (event.opponentId) event.opponentSlug = playerSlugs.get(event.opponentId) ?? undefined;
    const tournamentId = numericTournamentId(event.tournamentId);
    if (tournamentId !== undefined) event.slug = tournamentSlugs.get(tournamentId);
  }
  return details;
}
