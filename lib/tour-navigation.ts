"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLinkTour } from "@/components/TourLink";
import { isWtaPath, tourPath } from "./tour-path";

export function useBasePathname() {
  const pathname = usePathname();
  return pathname && tourPath(pathname, "ATP");
}

export function useTourRouter() {
  const router = useRouter();
  const tour = useLinkTour();
  return useMemo(() => tour === "ATP" ? router : ({
    ...router,
    push: (href, options) => router.push(tourPath(href, tour), options),
    replace: (href, options) => router.replace(tourPath(href, tour), options),
    prefetch: (href, options) => router.prefetch(tourPath(href, tour), options),
  } satisfies typeof router), [router, tour]);
}

export function currentTourPath(href: string): string;
export function currentTourPath(href?: string | URL | null): string | URL | null | undefined;
export function currentTourPath(href?: string | URL | null) {
  if (href == null || !isWtaPath(window.location.pathname)) return href;
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return href;
  return tourPath(url.pathname + url.search + url.hash, "WTA");
}
