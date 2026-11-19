import { recordTourPath } from "@/lib/record-tour-path";
import { metadataBase } from "@/lib/site";
import { resolveRecordHref } from "@/app/records/record-links";
import { urlEntry, xmlFooterUrlset, xmlHeaderUrlset } from "@/src/sitemaps/xml";
import type { RecordFilters } from "@/lib/seo/records-policy";

const featuredRecords: { slug: string[]; filters?: RecordFilters }[] = [
  { slug: ["wins"] },
  { slug: ["wins"], filters: { level: ["G"] } },
  { slug: ["wins"], filters: { level: ["M"] } },
  { slug: ["wins"], filters: { level: ["F"] } },
  { slug: ["wins"], filters: { surface: ["Clay"] } },
  { slug: ["played"] },
  { slug: ["titles"] },
  { slug: ["titles"], filters: { level: ["G"] } },
  { slug: ["entries"] },
  { slug: ["percentage"] },
  { slug: ["streak", "wins"] },
  { slug: ["h2h", "count"] },
];

export function GET() {
  const paths = new Set([
    "/records",
    ...featuredRecords.map(({ slug, filters }) => resolveRecordHref(slug, filters)),
  ]);

  const entries = [...paths].filter(path => !path.includes("?")).map(path => urlEntry({
    loc: new URL(recordTourPath(path, "WTA"), metadataBase).href,
  }));

  return new Response(xmlHeaderUrlset() + entries.join("") + xmlFooterUrlset(), {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
