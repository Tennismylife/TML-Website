import { NextResponse } from "next/server";

const VALID_RECORDS = new Set([
  "wins",
  "played",
  "count",
  "titles",
  "entries",
  "ages",
  "timespan",
  "percentage",
  "roundsonentries",
  "same",
  "seasons",
  "atage",
  "ageofnth",
  "neededto",
  "counterseasons",
  "h2h",
  "streak",
]);

export async function GET(request: Request, context: any) {
  const params = context?.params as { record?: string } | undefined;
  const record = params?.record;
  if (!record || !VALID_RECORDS.has(record)) {
    return new NextResponse(JSON.stringify({ error: "Record not found" }), { status: 404 });
  }

  const url = new URL(request.url);
  // Build redirect to /records with existing query params
  const redirectUrl = new URL(url.origin + "/records");
  // copy query params
  url.searchParams.forEach((value, key) => redirectUrl.searchParams.append(key, value));
  // ensure record param is set/overwritten
  redirectUrl.searchParams.set("record", record);

  return NextResponse.redirect(redirectUrl);
}
