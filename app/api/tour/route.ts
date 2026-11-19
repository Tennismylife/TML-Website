import { NextRequest, NextResponse } from "next/server";
import { TOUR_COOKIE } from "@/lib/tour";
import { isTourPage, tourPath } from "@/lib/tour-path";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const tour = form.get("tour");
  if (tour !== "ATP" && tour !== "WTA") {
    return new NextResponse("Invalid tour", { status: 400 });
  }

  const returnTo = form.get("returnTo");
  const path = typeof returnTo === "string" && /^\/(?:[\w-]+\/)*[\w-]*$/.test(returnTo) && isTourPage(returnTo)
    ? returnTo
    : "/";
  const base = tourPath(path, "ATP");
  const sharedPath = base.replace(/^\/(players|h2h|tournaments)\/.*$/, "/$1");
  const location = tourPath(sharedPath === base ? path : sharedPath, tour);
  const response = new NextResponse(null, { status: 303, headers: { Location: location } });
  response.cookies.set(TOUR_COOKIE, tour, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
