const recordsPath = /^\/(?:wta\/)?records(?:[/?#]|$)/;
const recordQualifier = /^(most|fewest|least|best|highest|lowest|longest|shortest|youngest|oldest)-/;
const tourMarker = /^(?:(most|fewest|least|best|highest|lowest|longest|shortest|youngest|oldest)-)?wta-(?!(?:1000|250|500|finals)(?:-|$))/;

// These records benefit from an explicit name instead of reusing ATP wording.
const wtaRecordSlugs = new Map(Object.entries({
  "played": "wta-matches-played",
  "titles": "wta-tournament-titles",
  "entries": "wta-tournament-appearances",
  "percentage": "wta-match-winning-percentage",
  "most-career-wins": "most-wta-match-wins",
  "most-grand-slam-wins": "most-wta-grand-slam-match-wins",
  "most-masters-1000-wins": "most-wta-1000-match-wins",
  "most-wins-in-atp-finals": "most-wta-finals-match-wins",
  "most-atp-250-wins": "most-wta-250-match-wins",
  "most-atp-500-wins": "most-wta-500-match-wins",
  "most-davis-cup-wins": "most-wta-match-wins-in-billie-jean-king-cup",
  "most-wins-on-hard-court": "most-wta-match-wins-on-hard-court",
  "most-wins-on-clay-court": "most-wta-match-wins-on-clay-court",
  "most-wins-on-grass-court": "most-wta-match-wins-on-grass-court",
  "most-wins-on-carpet-court": "most-wta-match-wins-on-carpet-court",
  "most-matches-played": "most-wta-matches-played",
  "most-finals-reached": "most-wta-tournament-finals-reached",
  "most-finals-at-single-tournament": "most-wta-finals-reached-at-one-tournament",
  "most-finals-in-a-single-season": "most-wta-tournament-finals-in-a-single-season",
  "most-atp-titles": "most-wta-tournament-titles",
  "most-grand-slam-titles": "most-wta-grand-slam-titles",
  "most-appearances": "most-wta-tournament-appearances",
  "best-winning-percentage": "highest-wta-match-winning-percentage",
  "longest-winning-streak": "longest-wta-match-winning-streak",
  "most-played-h2h": "most-played-wta-head-to-head-rivalries",
}));

const sourceSlugs = new Map([...wtaRecordSlugs].map(([source, target]) => [target, source]));
const legacySlugs = new Map(Object.entries({
  "most-played-head-to-head": "most-played-h2h",
  "most-tournament-appearances": "most-appearances",
  "most-wta-finals-reached": "most-finals-reached",
  "most-wta-finals-at-single-tournament": "most-finals-at-single-tournament",
  "most-wta-finals-in-a-single-season": "most-finals-in-a-single-season",
}));

function wtaSlug(source: string) {
  const explicit = wtaRecordSlugs.get(source);
  if (explicit) return explicit;

  const description = source
    .replace(/\bwins\b/g, "match-wins")
    .replace(/\batp\b/g, "wta")
    .replace(/\bmasters-1000\b/g, "wta-1000")
    .replace(/\bdavis-cup\b/g, "billie-jean-king-cup");
  if (/\bwta\b/.test(description)) return description;
  return recordQualifier.test(description)
    ? description.replace(recordQualifier, "$1-wta-")
    : `wta-${description}`;
}

function sourceSlug(wta: string) {
  const withoutLegacyFormat = wta.replace(/\bsingles-?/g, "");
  const explicit = sourceSlugs.get(withoutLegacyFormat) ?? legacySlugs.get(withoutLegacyFormat);
  if (explicit) return explicit;
  const description = withoutLegacyFormat.replace(tourMarker, (_, qualifier?: string) => qualifier ? `${qualifier}-` : "");
  return description
    .replace(/\bmatch-wins\b/g, "wins")
    .replace(/\bwta-1000\b/g, "masters-1000")
    .replace(/\bwta\b/g, "atp")
    .replace(/\bbillie-jean-king-cup\b/g, "davis-cup");
}

export function recordTourPath(path: string, tour: "ATP" | "WTA") {
  if (!recordsPath.test(path)) return path;

  const suffixStart = path.search(/[?#]/);
  const pathname = (suffixStart === -1 ? path : path.slice(0, suffixStart)).replace(/\/$/, "");
  const suffix = suffixStart === -1 ? "" : path.slice(suffixStart);
  const hasPrefix = pathname.startsWith("/wta/");
  const hasSuffix = pathname.endsWith("/wta");
  const isWtaPath = hasPrefix || hasSuffix;
  if (tour === "ATP" && !isWtaPath) return path;

  const base = hasPrefix ? pathname.slice(4) : pathname;
  const segments = (hasSuffix ? base.slice(0, -4) : base).split("/");
  const last = segments.length - 1;
  // The hub has no individual record slug. Nested records keep their section.
  if (last > 1) {
    const source = isWtaPath ? sourceSlug(segments[last]) : segments[last];
    segments[last] = tour === "WTA" ? wtaSlug(source) : source;
  }
  return (tour === "WTA" ? "/wta" : "") + segments.join("/") + suffix;
}

export function recordTourUrl(url: string, tour: "ATP" | "WTA") {
  const absolute = new URL(url);
  absolute.pathname = recordTourPath(absolute.pathname, tour);
  return absolute.toString();
}
