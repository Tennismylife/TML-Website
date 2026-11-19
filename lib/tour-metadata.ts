import type { Metadata } from "next";
import { getTour } from "./tour";
import { tourPath, tourUrl } from "./tour-path";

export async function tourMetadata<T extends object>(value: T | Promise<T>): Promise<T> {
  const metadata = await value;
  const tour = await getTour();
  if (tour === "ATP") return metadata;

  const localUrl = (href: string | URL) => {
    if (typeof href === "string" && href.startsWith("/")) return tourPath(href, tour);
    return tourUrl(href.toString(), tour);
  };
  const { alternates, openGraph } = metadata as Metadata;
  const canonical = alternates?.canonical;
  return {
    ...metadata,
    ...(typeof canonical === "string" || canonical instanceof URL
      ? { alternates: { ...alternates, canonical: localUrl(canonical) } }
      : {}),
    ...(openGraph?.url ? { openGraph: { ...openGraph, url: localUrl(openGraph.url) } } : {}),
  };
}
