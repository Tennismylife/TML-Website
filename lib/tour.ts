import { cookies } from "next/headers";

export const TOUR_COOKIE = "tml-tour";

export async function getTour(): Promise<"ATP" | "WTA"> {
  try {
    return (await cookies()).get(TOUR_COOKIE)?.value === "WTA" ? "WTA" : "ATP";
  } catch (error) {
    if (error instanceof Error && error.message.includes("outside a request scope")) return "ATP";
    throw error;
  }
}

export async function fetchForTour(url: RequestInfo | URL, init?: RequestInit) {
  if (await getTour() === "ATP") return fetch(url, init);
  const internalBase = process.env.NEXT_PRIVATE_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
  const original = new URL(url instanceof Request ? url.url : url.toString(), internalBase);
  const target = new URL(internalBase);
  target.pathname = original.pathname;
  target.search = original.search;
  const headers = new Headers(init?.headers ?? (url instanceof Request ? url.headers : undefined));
  headers.set("cookie", `${TOUR_COOKIE}=WTA`);
  return fetch(target, { ...init, next: undefined, cache: "no-store", headers });
}
