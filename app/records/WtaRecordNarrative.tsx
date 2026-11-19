import Link from "@/components/TourLink";
import { getFlagFromIOC, getPlayerHref, getTourneyHref } from "@/lib/utils";
import { Fragment, type ReactNode } from "react";
import Flag from "@/components/Flag";
import { metadataBase } from "@/lib/site";
import type { NarrativeEdition, NarrativeEvidence } from "./wta-narrative-evidence";
import narratives from "./wta-narratives.json";
import formatting from "./wta-narrative-format.json";
import { INITIAL_RECORD_PERCENTAGE_MIN_MATCHES } from "./Percentage/eligibility";

export type WtaNarrativeSpec = {
  record: string;
  sub: string | null;
  heading: string;
  sourcePath: string;
};

const editorials: Partial<Record<string, string[]>> = narratives;
export const hasWtaNarrative = (spec: WtaNarrativeSpec) => Boolean(editorials[spec.sourcePath]);

type Row = Record<string, unknown>;
type Player = { name: string; slug?: string; ioc?: string };
type Metric = { value: number | string; unit?: string };

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });


const countFields: Record<string, [string[], string]> = {
  wins: [["wins", "total_wins", "Wins"], "match wins"],
  played: [["totalPlayed", "total_played", "total_matches", "matches", "played", "Total"], "matches played"],
  titles: [["total_titles", "totalTitles", "titles", "count", "wins"], "titles"],
  entries: [["entries", "total_entries", "totalEntries", "total_participations", "total_appearances", "count", "total"], "tournament appearances"],
  round: [["count", "total_count", "total_rounds", "total_appearances", "appearances", "rounds", "entries", "wins"], "round appearances"],
  count: [["count"], "round appearances"],
  firstn: [["winsInFirstN"], "match wins"],
};

const ageFields: Record<string, [string[], string]> = {
  wins: [["wins_at_age"], "match wins"],
  played: [["played_at_age"], "matches played"],
  entries: [["participations_at_age"], "tournament appearances"],
  titles: [["titles_at_age"], "titles"],
  round: [["appearances_at_age"], "round appearances"],
  slams: [["total"], "Grand Slam appearances"],
};

function object(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function text(row: Row, ...keys: string[]): string | undefined {
  return keys.map(key => row[key]).find((value): value is string =>
    typeof value === "string" && Boolean(value.trim()));
}

function number(row: Row, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) continue;
    const parsed = Number(typeof value === "string" ? value.replace(/%$/, "") : value);
    if (Number.isFinite(parsed)) return parsed;
  }
}

function player(row: Row): Player | undefined {
  const name = text(row, "name", "player_name", "atpname", "Player", "winner_name", "player");
  const slug = text(row, "slug", "player_slug", "winner_slug");
  return name ? { name, slug, ioc: text(row, "ioc", "player_ioc", "winner_ioc") } : undefined;
}

function players(row: Row): Player[] {
  const pair = [player(object(row.player_1 ?? row.player1)), player(object(row.player_2 ?? row.player2))];
  if (pair[0] && pair[1]) return [pair[0], pair[1]];
  const single = player(row) ?? player(object(row.player));
  return single ? [single] : [];
}

function span(row: Row): Row {
  return object([row.overall_timespan, row.surface_timespan, row.level_timespan]
    .find(Array.isArray)?.[0] ?? row);
}

function metric(row: Row, { record, sub }: WtaNarrativeSpec): Metric | undefined {
  const variant = sub === "rounds" ? "round" : sub ?? "";
  if (record === "ageofnth") {
    const fields = ["age_at_win", "age_at_game", "age_at_entry", "age_at_title", "age_nth_round", "age_at_nth_slam", "age_nth_win", "age"];
    const years = number(row, ...fields);
    const value = text(row, ...fields);
    if (years === undefined && value) return { value: value.replace(/(\d+)y\s*(\d+)d/, "$1 years and $2 days") };
    return years === undefined ? undefined : { value: years, unit: "years of age" };
  }

  let fields: [string[], string] | undefined;
  if (record === "ages") fields = [["age", "age_years"], "years of age"];
  else if (record === "timespan") {
    const value = number(span(row), "days_between", "spanDays");
    return value === undefined ? undefined : { value, unit: "days" };
  } else if (record === "h2h") {
    fields = variant === "timespan"
      ? [["timespanDays"], "days"]
      : [["total_h2h", "total_matches", "matches", "total"], "meetings"];
  } else if (record === "streak") fields = variant === "round"
    ? [["maxStreak", "streak_length", "streak"], "consecutive tournament appearances"]
    : [["total_wins", "maxStreak", "wins"], "consecutive match wins"];
  else if (record === "counterseasons") fields = [["totalSeasons", "total_seasons"], "seasons"];
  else if (record === "neededto") fields = [["tournaments_played", "tournamentsPlayed", "entries", "matches_needed", "count"], "tournament appearances"];
  else if (record === "percentage" || record === "roundsonentries" || (record === "seasons" && variant === "percentage")) {
    fields = [["winPercentage", "percentage", "Percentage", "win_percentage"], "%"];
  } else if (record === "atage") fields = ageFields[variant];
  else if (record === "same" || record === "seasons") fields = countFields[variant];
  else fields = countFields[record];

  const value = fields && number(row, ...fields[0]);
  return value === undefined || !fields ? undefined : { value, unit: fields[1] };
}

function formatMetric({ value, unit }: Metric) {
  const formatted = typeof value === "number" ? unit === "%" ? value.toFixed(2) : numberFormat.format(value) : value;
  return formatted + (unit === "%" ? "%" : unit ? ` ${unit}` : "");
}

export function eligibleWtaNarrativeRows(rows: unknown[], spec: WtaNarrativeSpec) {
  return spec.record === "percentage"
    ? rows.filter(input => (number(object(input), "matchesPlayed") ?? 0) >= INITIAL_RECORD_PERCENTAGE_MIN_MATCHES)
    : rows;
}

export function wtaRecordItems(rows: unknown[], spec: WtaNarrativeSpec) {
  return eligibleWtaNarrativeRows(rows, spec).slice(0, 5).flatMap(input => {
    const row = object(input);
    const [entry] = players(row);
    const value = metric(row, spec);
    return entry?.slug ? [{
      name: value ? `${entry.name} - ${formatMetric(value)}` : entry.name,
      url: new URL(getPlayerHref(entry.slug), metadataBase).href,
    }] : [];
  });
}

type Mark = { tag: "span" | "strong" | "b" | "Link"; className?: string };

type PlayerFormat = {
  wrapper?: string;
  flag?: string;
  emoji?: boolean;
  name?: Mark;
  link?: string;
};

type Formats = {
  player: PlayerFormat;
  metric: Mark;
  season: Mark;
  event: Mark;
  score: Mark;
};

type ParagraphFormat = { className?: string } & { [K in keyof Formats]?: Formats[K][] };
type RecordFormat = { default: Partial<Formats>; paragraphs?: ParagraphFormat[] };
const recordFormats = formatting as Record<string, RecordFormat>;

function InlineMark({ format, children }: { format?: Mark; children: ReactNode }) {
  if (!format || format.tag === "Link") return <>{children}</>;
  const Tag = format.tag;
  return <Tag className={format.className}>{children}</Tag>;
}

function FormattedPlayer({ player, format }: { player: Player; format?: PlayerFormat }) {
  if (!format) return <>{player.name}</>;
  const name = format.link !== undefined && player.slug
    ? <Link href={getPlayerHref(player.slug)} className={format.link}>{player.name}</Link>
    : <InlineMark format={format.name}>{player.name}</InlineMark>;
  const flag = !player.ioc ? null
    : format.flag !== undefined
      ? <Flag ioc={player.ioc} className={format.flag || undefined} />
      : format.emoji ? getFlagFromIOC(player.ioc) : null;
  return format.wrapper
    ? <span className={format.wrapper}>{flag}{name}</span>
    : <>{flag}{flag && " "}{name}</>;
}

function Edition({ event, format }: { event: NarrativeEdition; format?: Mark }) {
  const label = [event.tournament, event.year].filter(Boolean).join(" ");
  if (format?.tag === "Link" && (event.slug || event.tournamentId)) {
    return <Link href={getTourneyHref({ id: event.tournamentId, slug: event.slug, name: event.tournament, year: event.year })} className={format.className}>{label}</Link>;
  }
  return <InlineMark format={format}>{label}</InlineMark>;
}

function paragraphFormats(record: RecordFormat | undefined, index: number) {
  const paragraph = record?.paragraphs?.[index];
  const occurrence: Partial<Record<keyof Formats, number>> = {};
  return {
    next<K extends keyof Formats>(key: K): Formats[K] | undefined {
      const i = occurrence[key] ?? 0;
      occurrence[key] = i + 1;
      const formats = paragraph?.[key] as Formats[K][] | undefined;
      return formats?.[i] ?? formats?.at(-1) ?? record?.default[key];
    },
  };
}

type Result = { row: Row; players: Player[]; metric: Metric; history?: NarrativeEvidence };

function rowEdition(row: Row, side?: "first" | "last"): NarrativeEdition | undefined {
  const tournament = side
    ? text(row, `${side}_tourney_name`, `${side}Tournament`, `${side}Tourney`)
    : text(row, "tourney_name", "tournament", "tourneyName");
  if (!tournament) return;
  const date = side ? text(row, `${side}_tourney_date`, `${side}Date`, `${side}Match`) : undefined;
  const year = side && date ? Number(date.slice(0, 4)) : number(row, "year", "Year");
  const tournamentId = side
    ? text(row, `${side}_tourney_id`, `${side}TourneyId`)
    : text(row, "tourney_id", "tourneyId");
  return { tournament, tournamentId, slug: side ? undefined : text(row, "tourney_slug"), year: year || undefined };
}


function winLoss(row: Row, spec: WtaNarrativeSpec) {
  const rivalry = spec.record === "h2h";
  const won = rivalry
    ? number(row, "wins_player1", "wins1", "player1_wins", "player_1_wins")
    : number(row, "wins", "Wins", "total_wins", "totalWins");
  const lost = rivalry
    ? number(row, "wins_player2", "wins2", "player2_wins", "player_2_wins")
    : number(row, "losses", "Losses", "total_losses");
  const played = number(row, "matchesPlayed", "total_played", "totalPlayed", "total_matches", "matches", "Total", "total");
  if (won === undefined) return;
  const defeats = lost ?? (!rivalry && played !== undefined ? played - won : undefined);
  if (defeats !== undefined && defeats >= 0) return `${numberFormat.format(won)}–${numberFormat.format(defeats)}`;
}

function ageLabel(value: Metric["value"]) {
  if (typeof value === "string") return value.replace(/(\d+)y\s*(\d+)d/, "$1 years and $2 days");
  const years = Math.floor(value);
  const days = Math.floor((value - years) * 365.25);
  return `${years} years and ${days} ${days === 1 ? "day" : "days"}`;
}

const factToken = /\{([a-z]+)(\d+)\}/g;

function renderText(paragraph: string, fact: (kind: string, rank: number) => ReactNode) {
  let incomplete = false;
  function fragments(value: string, optional: boolean): ReactNode[] {
    const parts: ReactNode[] = [];
    let end = 0;
    for (const token of value.matchAll(factToken)) {
      const item = fact(token[1], Number(token[2]) - 1);
      if (item == null) {
        if (!optional) incomplete = true;
        return [];
      }
      parts.push(value.slice(end, token.index), item);
      end = token.index + token[0].length;
    }
    parts.push(value.slice(end));
    return parts;
  }
  const body: ReactNode[] = [];
  let end = 0;
  for (const clause of paragraph.matchAll(/\[([^\[\]]+)\]/g)) {
    body.push(...fragments(paragraph.slice(end, clause.index), false), ...fragments(clause[1], true));
    end = clause.index + clause[0].length;
  }
  body.push(...fragments(paragraph.slice(end), false));
  return incomplete || !body.some(part => part !== "") ? null : body;
}

export default function WtaRecordNarrative({
  spec, rows, evidence = [],
}: { spec: WtaNarrativeSpec; rows: unknown[]; evidence?: NarrativeEvidence[] }) {
  const editorial = editorials[spec.sourcePath];
  if (!editorial) return null;
  const ranked = eligibleWtaNarrativeRows(rows, spec).slice(0, 16).map((input, index): Result | null => {
    const row = object(input);
    const names = players(row);
    const value = metric(row, spec);
    return value && names.length ? { row, players: names, metric: value, history: evidence[index] } : null;
  });
  if (!ranked[0]) return null;

  const recordFormat = recordFormats[spec.sourcePath];

  function fact(kind: string, rank: number, format: ReturnType<typeof paragraphFormats>): ReactNode {
    const item = ranked[rank];
    if (!item) return null;
    const { row, players, metric, history } = item;
    const numberMark = (value: ReactNode) => <InlineMark format={format.next("metric")}>{value}</InlineMark>;
    const editionMark = (event: NarrativeEdition) => <Edition event={event} format={format.next("event")} />;
    const matchOpponent = (event: NarrativeEdition) =>
      event.opponent && <FormattedPlayer player={{ name: event.opponent, ioc: event.opponentIoc, slug: event.opponentSlug }} format={format.next("player")} />;
    const matchScore = (event: NarrativeEdition) =>
      event.score && <InlineMark format={format.next("score")}>{event.score}</InlineMark>;

    switch (kind) {
      case "p": return <>{players.map((player, i) => (
        <Fragment key={player.slug ?? player.name}>{i > 0 && " and "}<FormattedPlayer player={player} format={format.next("player")} /></Fragment>
      ))}</>;
      case "sameplayer": {
        const leader = ranked[0]?.players[0];
        const player = players[0];
        return rank > 0 && leader && player && (leader.slug ?? leader.name) === (player.slug ?? player.name) ? "" : null;
      }
      case "samevalue": return rank > 0 && ranked[rank - 1]?.metric.value === metric.value ? "" : null;
      case "tie": return rank > 0 && ranked[0]?.metric.value === metric.value ? "" : null;
      case "v": return numberMark(spec.record === "ages" ? ageLabel(metric.value) : formatMetric({ value: metric.value, unit: metric.unit === "%" ? "%" : undefined }));
      case "wl": {
        const split = winLoss(row, spec) ?? (history?.wins !== undefined && history.losses !== undefined
          ? `${numberFormat.format(history.wins)}–${numberFormat.format(history.losses)}` : undefined);
        return split ? numberMark(split) : null;
      }
      case "events": return history?.eventCount ? numberMark(history.eventCount) : null;
      case "active": return history?.seasons?.length ? numberMark(history.seasons.length) : null;
      case "era": {
        const start = history?.seasons?.[0];
        const end = history?.seasons?.at(-1);
        return start && end && start !== end
          ? <InlineMark format={format.next("season")}>{start}–{end}</InlineMark>
          : null;
      }
      case "opendate":
      case "closedate": {
        const date = kind === "opendate" ? history?.first?.date : history?.last?.date;
        if (!date) return null;
        const label = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(date));
        return <InlineMark format={format.next("season")}>{label}</InlineMark>;
      }
      case "finish": {
        const event = history?.runEnding;
        if (!event) return null;
        return <>{editionMark(event)}{event.opponent && <>, where she lost to {matchOpponent(event)}{event.score && <> ({matchScore(event)})</>}</>}</>;
      }
      case "duration": {
        const days = number(span(row), "days_between", "spanDays");
        if (days === undefined) return null;
        const years = Math.floor(days / 365);
        const remaining = days % 365;
        return numberMark(`${years} years and ${remaining} ${remaining === 1 ? "day" : "days"}`);
      }
      case "total": {
        const matches = number(row, "matchesPlayed", "total_matches", "total_played", "totalPlayed", "Total");
        return matches === undefined ? null : numberMark(numberFormat.format(matches));
      }
      case "gap": {
        const lead = ranked[0]?.metric.value;
        return typeof lead === "number" && typeof metric.value === "number"
          ? numberMark(numberFormat.format(Math.abs(lead - metric.value))) : null;
      }
      case "y": {
        const year = number(row, "year", "Year", "season");
        return year === undefined ? null : <InlineMark format={format.next("season")}>{year}</InlineMark>;
      }
      case "titles": {
        const count = number(row, "titles", "total_titles", "totalTitles", "wins");
        return count === undefined ? null : numberMark(count);
      }
      case "entries": {
        const count = number(row, "entries", "total_entries", "totalEntries", "totalAppearances");
        return count === undefined ? null : numberMark(count);
      }
      case "e":
      case "event": {
        const event = rowEdition(row);
        if (!event) return null;
        const matchingEdition = history?.first?.tournament === event.tournament ? history.first : undefined;
        const linked = { ...event, slug: event.slug ?? matchingEdition?.slug };
        return editionMark(kind === "event" ? { ...linked, year: undefined } : linked);
      }
      case "begin":
      case "first":
      case "last":
      case "open":
      case "close":
      case "end":
      case "hundred": {
        const endpoint = kind === "first" || kind === "begin" || kind === "open" ? "first" : "last";
        const period = rowEdition(span(row), endpoint);
        const match = history?.[endpoint];
        const historicalEdition = period && match &&
          period.tournament === match.tournament && period.year === match.year
          ? { ...period, tournamentId: period.tournamentId ?? match.tournamentId, slug: period.slug ?? match.slug }
          : period;
        const event = kind === "hundred" ? history?.titleMilestone
          : kind === "open" || kind === "close" ? match ?? period : historicalEdition ?? match;
        if (!event) return null;
        const edition = editionMark(event);
        return kind === "open" || kind === "close" || kind === "hundred"
          ? <>{edition}{event.opponent && <>, against {matchOpponent(event)}{event.score && <> ({matchScore(event)})</>}</>}</>
          : edition;
      }
      case "decider":
      case "outcome": {
        const match = history?.first;
        if (!match?.opponent || !match.result || (kind === "decider" && match.result !== "beat")) return null;
        return <>{kind === "decider" ? "against" : `she ${match.result}`} {matchOpponent(match)}{match.score && <> ({matchScore(match)})</>}</>;
      }
      case "thousand": {
        const match = history?.thousandthMatch;
        return match ? <>{editionMark(match)}{match.opponent && <> against {matchOpponent(match)}</>}</> : null;
      }
      case "surfacecount":
        return history?.surfaceCount ? numberMark(history.surfaceCount) : null;
      case "finalcount":
        return history?.finalCount === undefined ? null : numberMark(history.finalCount);
      case "majorcount":
        return history?.majorCount === undefined ? null : numberMark(history.majorCount);
      case "editions": {
        const titles = history?.championships?.slice(0, 16);
        if (!titles?.length) return null;
        return <>{titles.map((event, i) => (
          <span key={`${event.tournamentId}-${event.year}`}>
            {i > 0 && (i === titles.length - 1 ? " and " : ", ")}{editionMark(event)}
          </span>
        ))}</>;
      }
      default: return null;
    }
  }

  const passages = editorial.flatMap((text, index) => {
    const format = paragraphFormats(recordFormat, index);
    const content = renderText(text, (kind, rank) => fact(kind, rank, format));
    if (!content) return [];
    return [<p key={index} className={recordFormat?.paragraphs?.[index]?.className}>
      {content.map((fragment, i) => <Fragment key={i}>{fragment}</Fragment>)}
    </p>];
  });
  return passages.length ? <>{passages}</> : null;
}
