import Link from "next/link";

type UIMatch = {
  id?: number | string;
  date?: string | Date | null;      // alias di tourney_date
  tourney_date?: string | Date | null;
  round?: string | null;
  surface?: string | null;
  score?: string | null;

  // winner → player1
  player1Id?: string | number | null;
  player1Name?: string | null;
  player1Ioc?: string | null;

  // loser → player2
  player2Id?: string | number | null;
  player2Name?: string | null;
  player2Ioc?: string | null;
};

function toDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}
function fmtDate(d: Date | null | undefined) {
  if (!d) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function iocToIso2(ioc?: string | null) {
  const m: Record<string, string> = {
    USA: "US", GBR: "GB", ENG: "GB", SCO: "GB", WAL: "GB",
    FRA: "FR", ITA: "IT", ESP: "ES", POR: "PT", GER: "DE",
    SUI: "CH", SRB: "RS", CRO: "HR", BIH: "BA", MNE: "ME",
    CZE: "CZ", SVK: "SK", POL: "PL", NED: "NL", BEL: "BE",
    AUT: "AT", SWE: "SE", NOR: "NO", DEN: "DK", FIN: "FI",
    ROU: "RO", BUL: "BG", GRE: "GR", TUR: "TR", CYP: "CY",
    RUS: "RU", UKR: "UA", BLR: "BY",
    AUS: "AU", NZL: "NZ", CAN: "CA", MEX: "MX", ARG: "AR",
    BRA: "BR", CHI: "CL", COL: "CO", PER: "PE",
    RSA: "ZA", JPN: "JP", CHN: "CN", KOR: "KR", HKG: "HK", TPE: "TW",
    IND: "IN", UAE: "AE", QAT: "QA", KSA: "SA", MON: "MC", MAR: "MA", TUN: "TN", EGY: "EG",
  };
  const iso2 = ioc ? m[ioc.toUpperCase()] : undefined;
  return iso2 || null;
}
function flagEmoji(iso2?: string | null) {
  if (!iso2) return null;
  const up = iso2.toUpperCase();
  if (!/^[A-Z]{2}$/.test(up)) return null;
  const cps = Array.from(up).map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...cps);
}

export default function MatchesTable({ matches }: { matches: UIMatch[] }) {
  return (
    <table className="min-w-max w-full border-collapse">
      <thead>
        <tr className="bg-gray-100 text-sm">
          <th className="border px-3 py-2 text-left">Date</th>
          <th className="border px-3 py-2 text-left">Round</th>
          <th className="border px-3 py-2 text-left">Surface</th>
          <th className="border px-3 py-2 text-left">Winner</th>
          <th className="border px-3 py-2 text-left">Loser</th>
          <th className="border px-3 py-2 text-left">Score</th>
        </tr>
      </thead>
      <tbody>
        {matches.map((m, idx) => {
          const d = toDate(m.date ?? m.tourney_date);
          const wIso2 = iocToIso2(m.player1Ioc);
          const lIso2 = iocToIso2(m.player2Ioc);
          return (
            <tr key={(m.id as any) ?? idx} className="hover:bg-gray-50">
              <td className="border px-3 py-2 whitespace-nowrap">{fmtDate(d) || "n/d"}</td>
              <td className="border px-3 py-2">{m.round ?? "n/d"}</td>
              <td className="border px-3 py-2">{m.surface ?? "n/d"}</td>
              <td className="border px-3 py-2">
                {m.player1Id ? (
                  <Link href={`/players/${encodeURIComponent(String(m.player1Id))}`} className="inline-flex items-center gap-2 text-blue-700 hover:underline">
                    <span className="text-base">{flagEmoji(wIso2) || ""}</span>
                    <span>{m.player1Name ?? "Player"}</span>
                  </Link>
                ) : (
                  <span className="text-gray-600">n/d</span>
                )}
              </td>
              <td className="border px-3 py-2">
                {m.player2Id ? (
                  <Link href={`/players/${encodeURIComponent(String(m.player2Id))}`} className="inline-flex items-center gap-2 text-blue-700 hover:underline">
                    <span className="text-base">{flagEmoji(lIso2) || ""}</span>
                    <span>{m.player2Name ?? "Player"}</span>
                  </Link>
                ) : (
                  <span className="text-gray-600">n/d</span>
                )}
              </td>
              <td className="border px-3 py-2">{m.score ?? "n/d"}</td>
            </tr>
          );
        })}
        {matches.length === 0 && (
          <tr>
            <td className="border px-3 py-4 text-center text-gray-600" colSpan={6}>
              Nessuna partita trovata.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}