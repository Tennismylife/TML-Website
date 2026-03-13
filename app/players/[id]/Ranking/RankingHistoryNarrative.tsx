"use client";

import React, { useMemo } from "react";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
interface Entry {
  date: string | null;
  rank: number;
  points: number;
}

interface Props {
  data: Entry[];
  birthdate?: string | null;
  playerName?: string;
  className?: string;
}

interface NarrativeFact {
  text: React.ReactNode;
  group: "debut" | "rise" | "peak" | "weeks" | "drop" | "last";
}

/* ─────────────────────────────────────────────────────────────
   Helpers
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

/* ─────────────────────────────────────────────────────────────
   Narrative builder
───────────────────────────────────────────────────────────── */
const GROUP_ORDER: NarrativeFact["group"][] = ["debut", "rise", "peak", "weeks", "drop", "last"];

function buildNarrative(
  data: Entry[],
  birthdate?: string | null,
  playerName?: string,
): NarrativeFact[] {
  const sorted = [...data]
    .filter((e) => e.date && !isNaN(new Date(e.date).getTime()) && e.rank > 0)
    .sort((a, b) => a.date!.localeCompare(b.date!));

  if (!sorted.length) return [];

  const name = playerName || "The player";
  const age = (iso: string) => (birthdate ? ageAt(birthdate, iso) : null);

  // Semantic color wrappers by data type (CSS classes defined in globals.css to beat the global !important rule)
  const R = (v: React.ReactNode) => (   // ranking number  (#5, #50)
    <span className="narrative-rank">{v}</span>
  );
  const T = (v: React.ReactNode) => (   // tier / threshold label  (Top 10, #1 in the world)
    <span className="narrative-tier">{v}</span>
  );
  const D = (v: React.ReactNode) => (   // date / month-year
    <span className="narrative-date">{v}</span>
  );
  const P = (v: React.ReactNode) => (   // ATP points
    <span className="narrative-points">{v}</span>
  );
  const A = (v: React.ReactNode) => (   // age
    <span className="narrative-age">{v}</span>
  );
  const W = (v: React.ReactNode) => (   // week / position count
    <span className="narrative-weeks">{v}</span>
  );

  const facts: NarrativeFact[] = [];

  /* ── 1. DEBUT ──────────────────────────────────────────── */
  const debut = sorted[0];
  const debutAge = age(debut.date!);
  const debutThreshold =
    debut.rank <= 10  ? "Top 10"  :
    debut.rank <= 20  ? "Top 20"  :
    debut.rank <= 50  ? "Top 50"  :
    debut.rank <= 100 ? "Top 100" : null;

  facts.push({
    group: "debut",
    text: (
      <>
        {name} entered the ATP rankings on {D(fmtDate(debut.date!))}, debuting at{" "}
        {R(`#${debut.rank}`)}
        {debut.points > 0 && <> with {P(debut.points.toLocaleString())} ATP points</>}
        {debutAge && <>, aged {A(debutAge)}</>}
        {debutThreshold && <> — already inside the {T(debutThreshold)}</>}.
      </>
    ),
  });

  /* ── 2. MILESTONES ────────────────────────────────────── */
  const THRESHOLDS = [100, 50, 20, 10, 5, 3, 1] as const;

  interface MStone { threshold: number; entry: Entry & { date: string }; label: string }
  const reached: MStone[] = [];
  for (const t of THRESHOLDS) {
    const first = sorted.find((e) => e.rank <= t);
    if (!first) continue;
    // already noted in the debut sentence
    if (first.date === debut.date && debut.rank <= t) continue;
    reached.push({ threshold: t, entry: first as Entry & { date: string }, label: t === 1 ? "#1 in the world" : `Top ${t}` });
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

  const bestAge = age(bestEntry.date!);
  // only emit if not already described as a milestone above
  const coveredByMilestone = reached.some((r) => r.entry.date === bestEntry.date);
  if (!coveredByMilestone) {
    facts.push({
      group: "peak",
      text: (
        <>
          His career-high ranking was {R(`#${bestEntry.rank}`)}, reached on{" "}
          {D(fmtDate(bestEntry.date!))}
          {bestAge && <> at the age of {A(bestAge)}</>}
          {bestEntry.points > 0 && <>, with {P(bestEntry.points.toLocaleString())} ATP points</>}.
        </>
      ),
    });
  }

  /* ── 4. CAREER HIGH POINTS (if different date) ─────────── */
  let bestPtsEntry = sorted[0];
  for (const e of sorted) if (e.points > bestPtsEntry.points) bestPtsEntry = e;

  if (bestPtsEntry.date !== bestEntry.date && bestPtsEntry.points > 0) {
    const ptAge = age(bestPtsEntry.date!);
    facts.push({
      group: "peak",
      text: (
        <>
          His personal record of {P(bestPtsEntry.points.toLocaleString() + " ATP points")} came on{" "}
          {D(fmtDate(bestPtsEntry.date!))}{ptAge && <> (aged {A(ptAge)})</>},{" "}
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
  if (w1   > 0 && bestEntry.rank <= 1)   weekParts.push(<>{W(String(w1))} week{w1   !== 1 ? "s" : ""} at {T("#1")}</>);
  if (w3   > 0 && bestEntry.rank <= 3)   weekParts.push(<>{W(String(w3))} week{w3   !== 1 ? "s" : ""} inside the {T("Top 3")}</>);
  if (w5   > 0 && bestEntry.rank <= 5)   weekParts.push(<>{W(String(w5))} week{w5   !== 1 ? "s" : ""} inside the {T("Top 5")}</>);
  if (w10  > 0 && bestEntry.rank <= 10)  weekParts.push(<>{W(String(w10))} week{w10  !== 1 ? "s" : ""} inside the {T("Top 10")}</>);
  if (w50  > 0 && bestEntry.rank <= 50)  weekParts.push(<>{W(String(w50))} week{w50  !== 1 ? "s" : ""} inside the {T("Top 50")}</>);
  if (w100 > 0 && bestEntry.rank <= 100) weekParts.push(<>{W(String(w100))} week{w100 !== 1 ? "s" : ""} inside the {T("Top 100")}</>);

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
    const y = new Date(e.date!).getFullYear();
    const prev = eoyMap.get(y);
    if (!prev || e.date! > prev.date) eoyMap.set(y, { date: e.date!, rank: e.rank, points: e.points });
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
      if (curRun === 0) curStart = e.date!;
      curRun++;
      if (curRun > maxRun) { maxRun = curRun; maxRunStart = curStart; maxRunEnd = e.date!; }
    } else {
      curRun = 0;
    }
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
          {R(`#${dropEntry.rank}`)} on {D(fmtDate(dropEntry.date!))}.
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
          {R(`#${riseEntry.rank}`)} on {D(fmtDate(riseEntry.date!))}.
        </>
      ),
    });
  }

  /* ── 10. LAST ENTRY ───────────────────────────────────── */
  const last = sorted[sorted.length - 1];
  if (last.date !== debut.date) {
    const lastAge = age(last.date!);
    const isRetired =
      last.rank > bestEntry.rank * 3 && bestEntry.rank <= 200;
    facts.push({
      group: "last",
      text: (
        <>
          {isRetired
            ? <>The last recorded entry in his ranking history was on {D(fmtDate(last.date!))}
                {lastAge && <>, aged {A(lastAge)},</>}{" "}
                at {R(`#${last.rank}`)}</>
            : <>As of {D(fmtDate(last.date!))}{lastAge && <>, aged {A(lastAge)},</>}{" "}
                he holds a ranking of {R(`#${last.rank}`)}</>
          }
          {last.points > 0 && <> with {P(last.points.toLocaleString())} ATP points</>}.
        </>
      ),
    });
  }

  return facts;
}

/* ─────────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────────── */
export default function RankingHistoryNarrative({
  data,
  birthdate,
  playerName,
  className = "",
}: Props) {
  const facts = useMemo(
    () => buildNarrative(data, birthdate, playerName),
    [data, birthdate, playerName],
  );

  if (!facts.length) return null;

  // bucket facts into paragraphs by group order
  const buckets = new Map<NarrativeFact["group"], NarrativeFact[]>();
  for (const g of GROUP_ORDER) buckets.set(g, []);
  for (const f of facts) buckets.get(f.group)!.push(f);
  const paragraphs = GROUP_ORDER.map((g) => buckets.get(g)!).filter((p) => p.length > 0);

  return (
    <div className={`${className} w-full`}>
      <h2 className="text-base font-semibold text-gray-300 uppercase tracking-wider mb-3 text-center">
        Ranking History
      </h2>
      <div className="bg-gray-800 border border-gray-600 border-l-4 border-l-yellow-500 rounded-lg px-5 py-4 space-y-3 text-sm text-gray-200 leading-relaxed shadow-lg">
        {paragraphs.map((group, pi) => (
          <p key={pi}>
            {group.map((fact, fi) => (
              <React.Fragment key={fi}>
                {fi > 0 && " "}
                {fact.text}
              </React.Fragment>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
