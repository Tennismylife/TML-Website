import { recordTourPath } from "./record-tour-path";

export type Tour = "ATP" | "WTA";

const wtaPrefix = /^\/wta(?:\/|$)/;
const publicPage = /^\/(?!\/|(?:api|og)(?:\/|$)|_)[^?#]*$/;

function withoutWta(pathname: string) {
  const base = wtaPrefix.test(pathname) ? pathname.slice(4) : pathname;
  return base.replace(/\/wta$/, "") || "/";
}

export function isTourPage(pathname: string) {
  const base = withoutWta(pathname);
  return publicPage.test(pathname) && publicPage.test(base) && !/\.[^/]+\/?$/.test(base);
}

export function isWtaPath(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  return isTourPage(path) && path !== withoutWta(path);
}

export function isPlayerProfilePath(pathname: string) {
  return /^\/players\/(?!wta(?:\/|$))[^/]+(?:\/|$)/.test(pathname);
}

export function tourPath(href: string, tour: Tour) {
  const separator = href.search(/[?#]/);
  const pathname = (separator === -1 ? href : href.slice(0, separator)).replace(/\/$/, "") || "/";
  if (!isTourPage(pathname)) return href;
  if (/^\/(?:wta\/)?records(?:\/|$)/.test(pathname)) return recordTourPath(href, tour);

  const base = withoutWta(pathname);
  const sectionPath = base === "/statistics/aces" ? "/statistics" : base;
  const target = tour === "WTA" && !isPlayerProfilePath(base)
    ? sectionPath === "/" ? "/wta" : `/wta${sectionPath}`
    : base;
  if (target === pathname) return href;
  return target + (separator === -1 ? "" : href.slice(separator));
}

export function tourUrl(href: string, tour: Tour) {
  const url = new URL(href);
  url.pathname = tourPath(url.pathname, tour);
  return url.toString();
}
