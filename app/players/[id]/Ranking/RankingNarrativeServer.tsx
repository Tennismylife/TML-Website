// Server Component — rendered at request time so Google indexes the prose.
import React from "react";
import { prisma } from "@/lib/prisma";

/* ─────────────────────────────────────────────────────────────
   Helpers (pure — no hooks needed)
───────────────────────────────────────────────────────────── */
function ageAt(birthdate: string, eventDate: string): string | null {
  try {
    const b = new Date(birthdate);
    const e = new Date(eventDate);
    if (isNaN(b.getTime()) || isNaN(e.getTime()) || e < b) return null;
    const bYear = new Date(e.getFullYear(), b.getMonth(), b.getDate());
    let years = e.getFullYear() - b.getFullYear();
    if (e < bYear) years--;
    const bYearActual = new Date(b.getFullYear() + years, b.getMonth(), b.getDate());
    const remDays = Math.floor((e.getTime() - bYearActual.getTime()) / 86_400_000);
    return remDays === 0 ? `${years}` : `${years}y ${remDays}d`;
  } catch { return null; }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return iso; }
}

function fmtMonthYear(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  } catch { return iso; }
}

// Semantic color wrappers (CSS classes defined in globals.css)
const R = (v: React.ReactNode) => <span className="narrative-rank">{v}</span>;
const T = (v: React.ReactNode) => <span className="narrative-tier">{v}</span>;
const D = (v: React.ReactNode) => <span className="narrative-date">{v}</span>;
const P = (v: React.ReactNode) => <span className="narrative-points">{v}</span>;
const A = (v: React.ReactNode) => <span className="narrative-age">{v}</span>;
const W = (v: React.ReactNode) => <span className="narrative-weeks">{v}</span>;

interface Entry { date: string; rank: number; points: number }
type Group = "debut" | "rise" | "peak" | "weeks" | "drop" | "recent" | "last";
const GROUP_ORDER: Group[] = ["debut", "rise", "peak", "weeks", "drop", "recent", "last"];

function buildParagraphs(
  data: Entry[],
  birthdate: string | null | undefined,
  playerName: string,
): React.ReactNode[][] {
  const sorted = [...data]
    .filter((e) => !isNaN(new Date(e.date).getTime()) && e.rank > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!sorted.length) return [];

  const name = playerName || "The player";
  const age = (iso: string) => (birthdate ? ageAt(birthdate, iso) : null);

  const facts: { group: Group; text: React.ReactNode }[] = [];

  /* ── 1. DEBUT ──────────────────────────────────────────── */
  const debut = sorted[0];
  const debutAge = age(debut.date);
  const debutThreshold =
    debut.rank <= 10  ? "Top 10"  :
    debut.rank <= 20  ? "Top 20"  :
    debut.rank <= 50  ? "Top 50"  :
    debut.rank <= 100 ? "Top 100" : null;

  facts.push({
    group: "debut",
    text: (
      <>
        {name} entered the ATP rankings on {D(fmtDate(debut.date))}, debuting at{" "}
        {R(`#${debut.rank}`)}
        {debut.points > 0 && <> with {P(debut.points.toLocaleString())} ATP points</>}
        {debutAge && <>, aged {A(debutAge)}</>}
        {debutThreshold && <> — already inside the {T(debutThreshold)}</>}.
      </>
    ),
  });

  /* ── 2. MILESTONES ────────────────────────────────────── */
  const THRESHOLDS = [100, 50, 20, 10, 5, 3, 1] as const;
  const reached: { threshold: number; entry: Entry; label: string }[] = [];
  for (const t of THRESHOLDS) {
    const first = sorted.find((e) => e.rank <= t);
    if (!first) continue;
    if (first.date === debut.date && debut.rank <= t) continue;
    reached.push({ threshold: t, entry: first, label: t === 1 ? "#1 in the world" : `Top ${t}` });
  }

  if (reached.length === 1) {
    const { entry, label } = reached[0];
    const a = age(entry.date);
    facts.push({
      group: "rise",
      text: (
        <>
          He first reached the {T(label)} on {D(fmtDate(entry.date))}{a ? <> (aged {A(a)})</> : null},{" "}
          ranked {R(`#${entry.rank}`)}{entry.points > 0 && <> with {P(entry.points.toLocaleString())} pts</>}.
        </>
      ),
    });
  } else if (reached.length > 1) {
    const parts = reached.map(({ entry, label }, i) => {
      const a = age(entry.date);
      return (
        <React.Fragment key={i}>
          {T(label)}{" "}
          on {D(fmtDate(entry.date))}{a ? <> (aged {A(a)})</> : null}
        </React.Fragment>
      );
    });
    facts.push({
      group: "rise",
      text: (
        <>
          He progressed through the rankings, successively breaking into{" "}
          {parts.map((p, i) => (
            <React.Fragment key={i}>
              {i > 0 && i < parts.length - 1 ? ", " : ""}
              {i === parts.length - 1 && i > 0 ? ", and " : ""}
              {p}
            </React.Fragment>
          ))}.
        </>
      ),
    });
  }

  /* ── 3. CAREER BEST ───────────────────────────────────── */
  let bestEntry = sorted[0];
  for (const e of sorted) if (e.rank < bestEntry.rank) bestEntry = e;

  const bestAge = age(bestEntry.date);
  const coveredByMilestone = reached.some((r) => r.entry.date === bestEntry.date);
  if (!coveredByMilestone) {
    facts.push({
      group: "peak",
      text: (
        <>
          His career-high ranking was {R(`#${bestEntry.rank}`)}, reached on{" "}
          {D(fmtDate(bestEntry.date))}
          {bestAge && <> at the age of {A(bestAge)}</>}
          {bestEntry.points > 0 && <>, with {P(bestEntry.points.toLocaleString())} ATP points</>}.
        </>
      ),
    });
  }

  /* ── 4. CAREER HIGH POINTS ─────────────────────────────── */
  let bestPtsEntry = sorted[0];
  for (const e of sorted) if (e.points > bestPtsEntry.points) bestPtsEntry = e;

  if (bestPtsEntry.date !== bestEntry.date && bestPtsEntry.points > 0) {
    const ptAge = age(bestPtsEntry.date);
    facts.push({
      group: "peak",
      text: (
        <>
          His personal record of {P(bestPtsEntry.points.toLocaleString() + " ATP points")} came on{" "}
          {D(fmtDate(bestPtsEntry.date))}{ptAge && <> (aged {A(ptAge)})</>},{" "}
          when he held a ranking of {R(`#${bestPtsEntry.rank}`)}.
        </>
      ),
    });
  }

  /* ── 5. WEEKS AT THRESHOLDS ───────────────────────────── */
  const weeksAt = (t: number) => sorted.filter((e) => e.rank <= t).length;
  const w1   = weeksAt(1);
  const w3   = weeksAt(3);
  const w5   = weeksAt(5);
  const w10  = weeksAt(10);
  const w50  = weeksAt(50);
  const w100 = weeksAt(100);
  const totalWeeks = sorted.length;

  const weekParts: React.ReactNode[] = [];
  if (w1   > 0 && bestEntry.rank <= 1)   weekParts.push(<React.Fragment key="w1">{W(String(w1))} week{w1   !== 1 ? "s" : ""} at {T("#1")}</React.Fragment>);
  if (w3   > 0 && bestEntry.rank <= 3)   weekParts.push(<React.Fragment key="w3">{W(String(w3))} week{w3   !== 1 ? "s" : ""} inside the {T("Top 3")}</React.Fragment>);
  if (w5   > 0 && bestEntry.rank <= 5)   weekParts.push(<React.Fragment key="w5">{W(String(w5))} week{w5   !== 1 ? "s" : ""} inside the {T("Top 5")}</React.Fragment>);
  if (w10  > 0 && bestEntry.rank <= 10)  weekParts.push(<React.Fragment key="w10">{W(String(w10))} week{w10  !== 1 ? "s" : ""} inside the {T("Top 10")}</React.Fragment>);
  if (w50  > 0 && bestEntry.rank <= 50)  weekParts.push(<React.Fragment key="w50">{W(String(w50))} week{w50  !== 1 ? "s" : ""} inside the {T("Top 50")}</React.Fragment>);
  if (w100 > 0 && bestEntry.rank <= 100) weekParts.push(<React.Fragment key="w100">{W(String(w100))} week{w100 !== 1 ? "s" : ""} inside the {T("Top 100")}</React.Fragment>);

  if (weekParts.length > 0) {
    facts.push({
      group: "weeks",
      text: (
        <>
          Over a career spanning {W(String(totalWeeks))} ranked weeks, he accumulated{" "}
          {weekParts.map((wp, i) => (
            <React.Fragment key={i}>
              {i > 0 && i < weekParts.length - 1 ? ", " : ""}
              {i === weekParts.length - 1 && i > 0 ? ", and " : ""}
              {wp}
            </React.Fragment>
          ))}.
        </>
      ),
    });
  } else {
    facts.push({
      group: "weeks",
      text: <>He accumulated a total of {W(String(totalWeeks))} weeks in the ATP rankings.</>,
    });
  }

  /* ── 6. BEST END-OF-YEAR RANKING ──────────────────────── */
  const eoyMap = new Map<number, { date: string; rank: number; points: number }>();
  for (const e of sorted) {
    const y = new Date(e.date).getFullYear();
    const prev = eoyMap.get(y);
    if (!prev || e.date > prev.date) eoyMap.set(y, { date: e.date, rank: e.rank, points: e.points });
  }
  type EoyEntry = { date: string; rank: number; points: number; year: number };
  let bestEoy: EoyEntry | null = null;
  eoyMap.forEach((e, year) => {
    if (!bestEoy || e.rank < bestEoy.rank) bestEoy = { ...e, year };
  });
  if (bestEoy !== null) {
    const b = bestEoy as EoyEntry;
    const eoyAge = age(b.date);
    facts.push({
      group: "weeks",
      text: (
        <>
          His best end-of-year ranking was {R(`#${b.rank}`)}, recorded at the close of{" "}
          {D(String(b.year))}{eoyAge && <> when he was {A(eoyAge)} old</>}.
        </>
      ),
    });
  }

  /* ── 7. LONGEST CONSECUTIVE RUN ───────────────────────── */
  const streakThreshold =
    bestEntry.rank <= 1  ? 1  :
    bestEntry.rank <= 3  ? 3  :
    bestEntry.rank <= 5  ? 5  :
    bestEntry.rank <= 10 ? 10 :
    bestEntry.rank <= 20 ? 20 :
    bestEntry.rank <= 50 ? 50 : 100;
  const streakLabel = streakThreshold === 1 ? "#1" : `Top ${streakThreshold}`;

  let maxRun = 0, maxRunStart = "", maxRunEnd = "";
  let curRun = 0, curStart = "";
  for (const e of sorted) {
    if (e.rank <= streakThreshold) {
      if (curRun === 0) curStart = e.date;
      curRun++;
      if (curRun > maxRun) { maxRun = curRun; maxRunStart = curStart; maxRunEnd = e.date; }
    } else { curRun = 0; }
  }
  if (maxRun >= 4) {
    facts.push({
      group: "weeks",
      text: (
        <>
          His longest uninterrupted spell in the {T(streakLabel)} lasted{" "}
          {W(`${maxRun} consecutive weeks`)}, from {D(fmtMonthYear(maxRunStart))} to{" "}
          {D(fmtMonthYear(maxRunEnd))}.
        </>
      ),
    });
  }

  /* ── 8. BIGGEST DROP ──────────────────────────────────── */
  let bigDrop = 0, bigDropIdx = -1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i].rank - sorted[i - 1].rank;
    if (diff > bigDrop) { bigDrop = diff; bigDropIdx = i; }
  }
  if (bigDrop >= 15 && bigDropIdx >= 0) {
    const dropEntry = sorted[bigDropIdx];
    const prevEntry = sorted[bigDropIdx - 1];
    facts.push({
      group: "drop",
      text: (
        <>
          The sharpest recorded drop in a single week was{" "}
          {W(`${bigDrop} places`)}, falling from {R(`#${prevEntry.rank}`)} to{" "}
          {R(`#${dropEntry.rank}`)} on {D(fmtDate(dropEntry.date))}.
        </>
      ),
    });
  }

  /* ── 9. BIGGEST RISE ──────────────────────────────────── */
  let bigRise = 0, bigRiseIdx = -1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = sorted[i - 1].rank - sorted[i].rank;
    if (diff > bigRise) { bigRise = diff; bigRiseIdx = i; }
  }
  if (bigRise >= 15 && bigRiseIdx >= 0) {
    const riseEntry = sorted[bigRiseIdx];
    const prevEntry = sorted[bigRiseIdx - 1];
    facts.push({
      group: "drop",
      text: (
        <>
          Conversely, his biggest single-week climb was{" "}
          {W(`${bigRise} places`)}, rising from {R(`#${prevEntry.rank}`)} to{" "}
          {R(`#${riseEntry.rank}`)} on {D(fmtDate(riseEntry.date))}.
        </>
      ),
    });
  }

  /* ── 10. RECENT FORM (CURRENT YEAR) ────────────────────── */
  const currentYear = new Date().getFullYear();
  const currentYearEntries = sorted.filter((e) => new Date(e.date).getFullYear() === currentYear);
  if (currentYearEntries.length >= 1) {
    const firstOfYear = currentYearEntries[0];
    const lastOfYear = currentYearEntries[currentYearEntries.length - 1];
    let bestOfYear = currentYearEntries[0];
    for (const e of currentYearEntries) if (e.rank < bestOfYear.rank) bestOfYear = e;
    const trend = lastOfYear.rank < firstOfYear.rank ? "improving" : lastOfYear.rank > firstOfYear.rank ? "declining" : "stable";
    const trendText = trend === "improving" ? "an improving" : trend === "declining" ? "a declining" : "a stable";
    facts.push({
      group: "recent",
      text: (
        <>
          <strong>Recent form {currentYear}:</strong>{" "}
          {currentYearEntries.length === 1
            ? <>{name} has one recorded entry so far in {currentYear}, at {R(`#${firstOfYear.rank}`)}
                {firstOfYear.points > 0 && <> with {P(firstOfYear.points.toLocaleString())} pts</>}.</>
            : <>{name} has shown {trendText} trend — entering the year at{" "}
                {R(`#${firstOfYear.rank}`)} and reaching a season-best of{" "}
                {R(`#${bestOfYear.rank}`)}.
                {lastOfYear.date !== firstOfYear.date && (
                  <> The most recent entry ({D(fmtDate(lastOfYear.date))}) places him at{" "}
                    {R(`#${lastOfYear.rank}`)}
                    {lastOfYear.points > 0 && <> with {P(lastOfYear.points.toLocaleString())} pts</>}.</>
                )}</>
          }
        </>
      ),
    });
  }

  /* ── 11. LAST ENTRY ──────────────────────────────────────── */
  const last = sorted[sorted.length - 1];
  if (last.date !== debut.date) {
    const lastAge = age(last.date);
    const isRetired = last.rank > bestEntry.rank * 3 && bestEntry.rank <= 200;
    facts.push({
      group: "last",
      text: (
        <>
          {isRetired
            ? <>The last recorded entry in his ranking history was on {D(fmtDate(last.date))}
                {lastAge && <>, aged {A(lastAge)},</>}{" "}
                at {R(`#${last.rank}`)}</>
            : <>As of {D(fmtDate(last.date))}{lastAge && <>, aged {A(lastAge)},</>}{" "}
                he holds a ranking of {R(`#${last.rank}`)}</>
          }
          {last.points > 0 && <> with {P(last.points.toLocaleString())} ATP points</>}.
        </>
      ),
    });
  }

  // bucket into paragraphs by group
  const buckets = new Map<Group, React.ReactNode[]>();
  for (const g of GROUP_ORDER) buckets.set(g, []);
  for (const f of facts) buckets.get(f.group)!.push(f.text);
  return GROUP_ORDER.map((g) => buckets.get(g)!).filter((p) => p.length > 0);
}

/* ─────────────────────────────────────────────────────────────
   Server Component
───────────────────────────────────────────────────────────── */
interface Props {
  playerId: string;
  birthdate?: string | null;
  playerName?: string;
  className?: string;
}

export default async function RankingNarrativeServer({
  playerId,
  birthdate,
  playerName = "The player",
  className = "",
}: Props) {
  let paragraphs: React.ReactNode[][] = [];
  let data: Entry[] = [];

  try {
    const rows = await prisma.ranking.findMany({
      where: { playerId },
      include: { rankingDate: true },
      orderBy: { rankingDate: { date: "asc" } },
    });

    data = rows
      .filter((r) => r.rankingDate?.date)
      .map((r) => ({
        date: r.rankingDate!.date!.toISOString(),
        rank: r.rank,
        points: r.points,
      }));

    paragraphs = buildParagraphs(data, birthdate, playerName);
  } catch {
    return null;
  }

  if (!paragraphs.length) return null;

  // Build JSON-LD ItemList with last 10 ranking entries (most recent first)
  const last10 = [...data]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const rankingListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `ATP Ranking History – ${playerName}`,
    "description": `Last 10 ATP ranking entries for ${playerName}`,
    "itemListElement": last10.map((e, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": `ATP Rank #${e.rank} – ${new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`,
      "description": `Rank: ${e.rank}, Points: ${e.points.toLocaleString()}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(rankingListLd) }}
      />
      <div className={`${className} w-full`}>
        <h2 className="text-base font-semibold text-gray-300 uppercase tracking-wider mb-3 text-center">
          Ranking History
        </h2>
        <div className="bg-gray-800 border border-gray-600 border-l-4 border-l-yellow-500 rounded-lg px-5 py-4 space-y-3 text-sm text-gray-200 leading-relaxed shadow-lg">
          {paragraphs.map((group, pi) => (
            <p key={pi}>
              {group.map((sentence, fi) => (
                <React.Fragment key={fi}>
                  {fi > 0 && " "}
                  {sentence}
                </React.Fragment>
              ))}
            </p>
          ))}
        </div>
      </div>
    </>
  );
}
